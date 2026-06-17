import { useRef, useCallback, useState, useEffect } from 'react';

import { useI18n } from '@/hooks/useI18n';
import { useIsMobile } from '@/hooks/useIsMobile';
import { glyphUrl } from '@/utils/preloadAppImages';

import { htmlToMarkdown, markdownToHtml, isEditorEmpty, serializeBlockBody } from './markdownParse';
import {
  getActiveBlock,
  tryInlineTransform,
  splitBlockAtCursor,
  mergeBlockWithPrevious,
  getCursorOffsetInBlock,
  insertAtSelection,
  insertTextAtSelection,
  insertInlineImageAtSelection,
  toggleInlineFormat,
  cursorHasFormat,
  ensureEditorContent,
  restoreSavedRange,
  deleteAtomicInlineBeforeCursor,
  isBlockEmpty,
  placeCursorInBlock,
  nodeBeforeCursor,
  isInlineImageNode,
  shouldSkipLeadingSpaceBeforeText,
  normalizeInlineSpacingInBlock,
} from './domUtils';
import { useEditorHistory } from './useEditorHistory';
import type { InputModifier } from '../InputsFloatingPanel';
import {
  htmlClipboardToMarkdown,
  normalizePastedMarkdown,
  prepareCopyPayloadSync,
  writeEditorSelectionToClipboardEvent,
} from './clipboardUtils';

export const EMPTY_BLOCK = '<div class="ve-block" data-tag="p"><br></div>';

interface UseMarkdownEditorCoreParams {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function preventToolbarFocus(e: React.MouseEvent) {
  e.preventDefault();
}

export function useMarkdownEditorCore({ value, onChange, placeholder }: UseMarkdownEditorCoreParams) {
  const { t } = useI18n();
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [jPrefix, setJPrefix] = useState(false);
  const [dlPrefix, setDlPrefix] = useState(false);
  const [airMode, setAirMode] = useState(false);
  const [holdMode, setHoldMode] = useState(false);
  const [activeTag, setActiveTag] = useState<string>('p');
  const [fmtBold, setFmtBold] = useState(false);
  const [fmtItalic, setFmtItalic] = useState(false);
  const [fmtCode, setFmtCode] = useState(false);
  const [flowchartSoonOpen, setFlowchartSoonOpen] = useState(false);
  const [inputsOpen, setInputsOpen] = useState(false);
  const mobile = useIsMobile();

  const lastEmitted = useRef(value);
  const skipSync = useRef(false);
  const history = useEditorHistory(value);

  const syncFormatState = useCallback(() => {
    const block = getActiveBlock(editorRef.current);
    if (!block) {
      setFmtBold(false);
      setFmtItalic(false);
      setFmtCode(false);
      return;
    }
    setFmtBold(cursorHasFormat(block, 'strong'));
    setFmtItalic(cursorHasFormat(block, 'em'));
    setFmtCode(cursorHasFormat(block, 'code'));
  }, []);

  const saveSelection = useCallback(() => {
    const root = editorRef.current;
    const sel = window.getSelection();
    if (!root || !sel?.rangeCount) return;

    const range = sel.getRangeAt(0);
    if (root.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
      syncFormatState();
    }
  }, [syncFormatState]);

  useEffect(() => {
    const onSelectionChange = () => saveSelection();
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [saveSelection]);

  const renderFromMarkdown = useCallback((md: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = markdownToHtml(md);
    ensureEditorContent(el, EMPTY_BLOCK);
    el.classList.toggle('is-empty', isEditorEmpty(el));
  }, []);

  useEffect(() => {
    renderFromMarkdown(value);
    lastEmitted.current = value;
    history.reset(value);
  }, []);

  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      if (value === lastEmitted.current) return;
    }

    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      history.reset(value);
      renderFromMarkdown(value);
      savedRange.current = null;
    }
  }, [value, renderFromMarkdown, history]);

  const applyMd = useCallback(
    (md: string, recordHistory = false) => {
      history.withoutRecording(() => {
        renderFromMarkdown(md);
        lastEmitted.current = md;
        skipSync.current = true;
        onChange(md);
        if (recordHistory) history.pushImmediate(md);
      });
    },
    [history, onChange, renderFromMarkdown],
  );

  const emitChange = useCallback(
    (immediate = false) => {
      const el = editorRef.current;
      if (!el) return;

      el.classList.toggle('is-empty', isEditorEmpty(el));
      const md = htmlToMarkdown(el);
      lastEmitted.current = md;
      skipSync.current = true;
      onChange(md);

      if (immediate) history.pushImmediate(md);
      else history.pushDebounced(md);
    },
    [history, onChange],
  );

  const snapshotNow = () => {
    const el = editorRef.current;
    if (el) history.pushImmediate(htmlToMarkdown(el));
  };

  const withEditorSelection = (fn: () => void, recordAfter = true) => {
    const root = editorRef.current;
    if (!root) return;

    if (!restoreSavedRange(savedRange.current, root)) {
      const block = getActiveBlock(root) ?? root.querySelector<HTMLElement>('.ve-block');
      if (block) {
        block.focus();
        const range = document.createRange();
        range.selectNodeContents(block);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        savedRange.current = range.cloneRange();
      }
    }

    snapshotNow();
    fn();
    saveSelection();
    if (recordAfter) emitChange(true);
  };

  const handleInput = () => {
    const block = getActiveBlock(editorRef.current);
    if (block) setActiveTag(block.dataset.tag ?? 'p');
    saveSelection();
    emitChange(false);
  };

  const focusBlockEnd = (block: HTMLElement) => {
    block.focus();
    const range = document.createRange();
    range.selectNodeContents(block);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    savedRange.current = range.cloneRange();
  };

  const focusBlockFromPoint = (root: HTMLElement, clientX: number, clientY: number) => {
    const doc = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    };

    if (doc.caretRangeFromPoint) {
      const range = doc.caretRangeFromPoint(clientX, clientY);
      if (range && root.contains(range.startContainer)) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        savedRange.current = range.cloneRange();
        const block = range.startContainer instanceof Element
          ? range.startContainer.closest<HTMLElement>('.ve-block')
          : range.startContainer.parentElement?.closest<HTMLElement>('.ve-block');
        if (block) setActiveTag(block.dataset.tag ?? 'p');
        return;
      }
    }

    if (doc.caretPositionFromPoint) {
      const pos = doc.caretPositionFromPoint(clientX, clientY);
      if (pos && root.contains(pos.offsetNode)) {
        const range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        savedRange.current = range.cloneRange();
        const block = pos.offsetNode instanceof Element
          ? pos.offsetNode.closest<HTMLElement>('.ve-block')
          : pos.offsetNode.parentElement?.closest<HTMLElement>('.ve-block');
        if (block) setActiveTag(block.dataset.tag ?? 'p');
        return;
      }
    }

    const blocks = Array.from(root.querySelectorAll<HTMLElement>('.ve-block'));
    if (blocks.length === 0) return;

    let target = blocks[0];
    for (const block of blocks) {
      const rect = block.getBoundingClientRect();
      if (clientY >= rect.top + rect.height * 0.5) target = block;
    }

    const rect = target.getBoundingClientRect();
    const atStart = clientY < rect.top + rect.height * 0.5;
    placeCursorInBlock(target, atStart ? 0 : 99999);
    const sel = window.getSelection();
    if (sel?.rangeCount) savedRange.current = sel.getRangeAt(0).cloneRange();
    setActiveTag(target.dataset.tag ?? 'p');
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const root = editorRef.current;
    if (!root) return;

    root.classList.remove('is-empty');
    const block = target.closest<HTMLElement>('.ve-block');
    if (block) {
      setActiveTag(block.dataset.tag ?? 'p');
      requestAnimationFrame(saveSelection);
      return;
    }

    focusBlockFromPoint(root, e.clientX, e.clientY);
  };

  const handleEditorFocus = () => {
    editorRef.current?.classList.remove('is-empty');
  };

  const insertCharacterIcon = (name: string, src: string) => {
    const root = editorRef.current;
    if (!root) return;

    withEditorSelection(() => {
      let block = getActiveBlock(root);
      if (!block) {
        ensureEditorContent(root, EMPTY_BLOCK);
        block = root.querySelector<HTMLElement>('.ve-block')!;
        focusBlockEnd(block);
      }

      const img = document.createElement('img');
      img.src = src;
      img.alt = name;
      img.className = 've-glyph ve-glyph--character';
      img.draggable = false;
      img.contentEditable = 'false';

      insertInlineImageAtSelection(img, savedRange.current, root);
    });
  };

  const insertGlyph = (file: string, label: string, modifier?: InputModifier) => {
    const root = editorRef.current;
    if (!root) return;

    withEditorSelection(() => {
      let block = getActiveBlock(root);
      if (!block) {
        ensureEditorContent(root, EMPTY_BLOCK);
        block = root.querySelector<HTMLElement>('.ve-block')!;
        focusBlockEnd(block);
      }

      if (jPrefix) insertTextAtSelection('j.', savedRange.current, root);
      if (dlPrefix) insertTextAtSelection('dl.', savedRange.current, root);

      const img = document.createElement('img');
      img.src = glyphUrl(file);
      img.alt = label;
      img.className = 've-glyph';
      img.draggable = false;
      img.contentEditable = 'false';

      let node: Node = img;
      if (modifier) {
        const wrap = document.createElement('span');
        wrap.className = 've-input-chip';
        wrap.contentEditable = 'false';
        wrap.dataset.mod = modifier;
        const tag = document.createElement('span');
        tag.className = 've-input-chip__label';
        tag.textContent = modifier === 'air' ? '(AIR)' : '(HOLD)';
        wrap.appendChild(img);
        wrap.appendChild(tag);
        node = wrap;
      }

      insertInlineImageAtSelection(node, savedRange.current, root);

      setJPrefix(false);
      setDlPrefix(false);
      if (modifier) {
        setAirMode(false);
        setHoldMode(false);
      }
    });
  };

  const inputsPanelProps = {
    jPrefix,
    dlPrefix,
    airMode,
    holdMode,
    onToggleJPrefix: () => {
      setJPrefix((v) => !v);
      setDlPrefix(false);
    },
    onToggleDlPrefix: () => {
      setDlPrefix((v) => !v);
      setJPrefix(false);
    },
    onToggleAirMode: () => {
      setAirMode((v) => {
        if (!v) setHoldMode(false);
        return !v;
      });
    },
    onToggleHoldMode: () => {
      setHoldMode((v) => {
        if (!v) setAirMode(false);
        return !v;
      });
    },
    onInsertGlyph: insertGlyph,
    insertCharacterIcon,
  };

  const setBlockType = (tag: 'h1' | 'h2' | 'h3' | 'li') => {
    withEditorSelection(() => {
      const block = getActiveBlock(editorRef.current);
      if (!block) return;
      block.dataset.tag = tag;
      setActiveTag(tag);
    });
  };

  const insertBlockquote = () => {
    withEditorSelection(() => {
      const block = getActiveBlock(editorRef.current);
      if (!block || block.querySelector('.ve-quote')) return;
      const body = serializeBlockBody(block);
      const span = document.createElement('span');
      span.className = 've-quote';
      if (body.trim()) {
        span.textContent = body;
      } else {
        span.innerHTML = '<br>';
      }
      block.innerHTML = '';
      block.appendChild(span);
      focusBlockEnd(block);
    });
  };

  const insertHorizontalRule = () => {
    withEditorSelection(() => {
      const root = editorRef.current;
      if (!root) return;

      let block = getActiveBlock(root);
      if (!block) {
        ensureEditorContent(root, EMPTY_BLOCK);
        block = root.querySelector<HTMLElement>('.ve-block')!;
      }

      const hrBlock = document.createElement('div');
      hrBlock.className = 've-block';
      hrBlock.dataset.tag = 'p';
      hrBlock.contentEditable = 'true';
      hrBlock.innerHTML = '<hr class="ve-hr" contenteditable="false" />';

      const nextBlock = document.createElement('div');
      nextBlock.className = 've-block';
      nextBlock.dataset.tag = 'p';
      nextBlock.contentEditable = 'true';
      nextBlock.innerHTML = '<br>';

      block.after(hrBlock);
      hrBlock.after(nextBlock);
      focusBlockEnd(nextBlock);
    });
  };

  const applyStrikethrough = () => {
    withEditorSelection(() => {
      const block = getActiveBlock(editorRef.current);
      if (!block) return;
      const sel = window.getSelection();
      if (!sel?.rangeCount || sel.isCollapsed) return;
      const text = sel.toString();
      if (!text) return;
      const el = document.createElement('del');
      el.textContent = text;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(el);
      range.setStartAfter(el);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      savedRange.current = range.cloneRange();
    });
  };

  const insertLink = () => {
    const url = window.prompt(t('markdown.linkUrl'));
    if (!url?.trim()) return;
    withEditorSelection(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() || t('markdown.linkText');
      insertTextAtSelection(`[${text}](${url.trim()})`, savedRange.current, editorRef.current);
    });
  };

  const applyInlineFormat = (tag: 'strong' | 'em' | 'code') => {
    withEditorSelection(() => {
      const root = editorRef.current;
      if (!root) return;
      let block = getActiveBlock(root);
      if (!block) {
        ensureEditorContent(root, EMPTY_BLOCK);
        block = root.querySelector<HTMLElement>('.ve-block')!;
      }
      const applied = toggleInlineFormat(tag, block);
      if (!applied) {
        const markers = tag === 'strong' ? '**' : tag === 'em' ? '*' : '``';
        insertTextAtSelection(markers, savedRange.current, root);
      }
      syncFormatState();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const root = editorRef.current;
    if (!root) return;

    if (
      e.key.length === 1
      && !e.ctrlKey
      && !e.metaKey
      && !e.altKey
      && e.key !== ' '
      && e.key !== 'Enter'
      && e.key !== 'Tab'
      && e.key !== 'Backspace'
      && e.key !== 'Delete'
    ) {
      const block = getActiveBlock(root);
      if (block && isInlineImageNode(nodeBeforeCursor(block)) && !shouldSkipLeadingSpaceBeforeText(e.key)) {
        e.preventDefault();
        snapshotNow();
        insertTextAtSelection(` ${e.key}`, savedRange.current, root);
        saveSelection();
        emitChange(true);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        const prev = history.undo();
        if (prev !== null) applyMd(prev);
        return;
      }

      if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault();
        const next = history.redo();
        if (next !== null) applyMd(next);
        return;
      }

      if (k === 'b') {
        e.preventDefault();
        applyInlineFormat('strong');
        return;
      }

      if (k === 'i') {
        e.preventDefault();
        applyInlineFormat('em');
        return;
      }

      if (k === 'e') {
        e.preventDefault();
        applyInlineFormat('code');
        return;
      }
    }

    if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      snapshotNow();
      const block = getActiveBlock(root);
      if (!block) return;
      const transformed = tryInlineTransform(block);
      if (!transformed) insertTextAtSelection(' ', savedRange.current, root);
      saveSelection();
      emitChange(true);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      snapshotNow();
      insertTextAtSelection('\t', savedRange.current, root);
      saveSelection();
      emitChange(true);
      return;
    }

    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      snapshotNow();
      insertAtSelection(document.createElement('br'), savedRange.current, root);
      saveSelection();
      emitChange(true);
      return;
    }

    if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey) {
      const block = getActiveBlock(root);
      if (!block) return;

      if (deleteAtomicInlineBeforeCursor(block)) {
        e.preventDefault();
        snapshotNow();
        saveSelection();
        emitChange(true);
        return;
      }

      const offset = getCursorOffsetInBlock(block);
      const prev = block.previousElementSibling as HTMLElement | null;

      if (isBlockEmpty(block) && prev?.classList.contains('ve-block')) {
        e.preventDefault();
        snapshotNow();
        mergeBlockWithPrevious(block);
        setActiveTag(prev.dataset.tag ?? 'p');
        saveSelection();
        emitChange(true);
        return;
      }

      if (offset === null || offset > 0) return;

      if (!prev?.classList.contains('ve-block')) return;

      e.preventDefault();
      snapshotNow();
      mergeBlockWithPrevious(block);
      setActiveTag(prev.dataset.tag ?? 'p');
      saveSelection();
      emitChange(true);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      snapshotNow();
      saveSelection();

      let block = getActiveBlock(root);
      if (!block) {
        ensureEditorContent(root, EMPTY_BLOCK);
        block = root.querySelector<HTMLElement>('.ve-block');
      }
      if (!block) return;

      const newBlock = splitBlockAtCursor(block);
      if (newBlock) {
        setActiveTag('p');
        saveSelection();
        emitChange(true);
      }
    }
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    const root = editorRef.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    let range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;

    if (range.collapsed) {
      const block = getActiveBlock(root);
      if (block) {
        range = document.createRange();
        range.selectNodeContents(block);
      } else {
        range = document.createRange();
        range.selectNodeContents(root);
      }
    }

    e.preventDefault();
    const payload = prepareCopyPayloadSync(root, range);
    if (!payload) return;
    writeEditorSelectionToClipboardEvent(e, payload.markdown, payload.html, payload.plainText);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const root = editorRef.current;
    if (!root) return;

    if (!restoreSavedRange(savedRange.current, root)) {
      const block = getActiveBlock(root) ?? root.querySelector<HTMLElement>('.ve-block');
      if (block) focusBlockEnd(block);
    }

    const html = e.clipboardData.getData('text/html');
    const markdownClip = e.clipboardData.getData('text/markdown');
    const plain = e.clipboardData.getData('text/plain');
    let text = '';
    if (markdownClip.trim()) {
      text = markdownClip;
    } else if (html.trim()) {
      text = htmlClipboardToMarkdown(html);
    }
    if (!text.trim()) {
      text = plain;
    }
    text = normalizePastedMarkdown(text);
    if (!text) return;
    snapshotNow();
    insertTextAtSelection(text, savedRange.current, root);
    const block = getActiveBlock(root);
    if (block) normalizeInlineSpacingInBlock(block);
    saveSelection();
    emitChange(true);
  };

  const handleUndo = () => {
    const prev = history.undo();
    if (prev !== null) applyMd(prev);
  };

  const handleRedo = () => {
    const next = history.redo();
    if (next !== null) applyMd(next);
  };

  return {
    value,
    placeholder,
    t,
    mobile,
    editorRef,
    history,
    activeTag,
    fmtBold,
    fmtItalic,
    fmtCode,
    flowchartSoonOpen,
    inputsOpen,
    setInputsOpen,
    setFlowchartSoonOpen,
    saveSelection,
    handleInput,
    handleEditorClick,
    handleEditorFocus,
    handleKeyDown,
    handleCopy,
    handlePaste,
    setBlockType,
    applyInlineFormat,
    applyStrikethrough,
    insertBlockquote,
    insertHorizontalRule,
    insertLink,
    inputsPanelProps,
    insertCharacterIcon,
    handleUndo,
    handleRedo,
  };
}
