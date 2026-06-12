import { useRef, useCallback, useState, useEffect } from 'react';

import { useI18n } from '@/hooks/useI18n';

import { htmlToMarkdown, markdownToHtml, isEditorEmpty, serializeBlockBody } from './visualEditor/markdownParse';

import {

  getActiveBlock,

  tryInlineTransform,

  splitBlockAtCursor,

  mergeBlockWithPrevious,

  getCursorOffsetInBlock,

  insertAtSelection,

  insertTextAtSelection,

  toggleInlineFormat,

  cursorHasFormat,

  ensureEditorContent,

  restoreSavedRange,

} from './visualEditor/domUtils';

import { useEditorHistory } from './visualEditor/useEditorHistory';

import { glyphUrl } from '@/utils/preloadAppImages';

import { BlockingModal } from './BlockingModal';
import { InputsFloatingPanel } from './InputsFloatingPanel';
import { openExternal } from '@/utils/openExternal';



const EMPTY_BLOCK = '<div class="ve-block" data-tag="p" contenteditable="true"><br></div>';



interface MarkdownEditorProps {

  value: string;

  onChange: (value: string) => void;

  placeholder?: string;

}



function preventToolbarFocus(e: React.MouseEvent) {

  e.preventDefault();

}



export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const { t } = useI18n();
  const editorRef = useRef<HTMLDivElement>(null);

  const savedRange = useRef<Range | null>(null);

  const [jPrefix, setJPrefix] = useState(false);
  const [dlPrefix, setDlPrefix] = useState(false);

  const [activeTag, setActiveTag] = useState<string>('p');
  const [fmtBold, setFmtBold] = useState(false);
  const [fmtItalic, setFmtItalic] = useState(false);
  const [fmtCode, setFmtCode] = useState(false);
  const [flowchartSoonOpen, setFlowchartSoonOpen] = useState(false);

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

      return;

    }

    if (value !== lastEmitted.current) {

      lastEmitted.current = value;

      history.reset(value);

      renderFromMarkdown(value);

    }

  }, [value, renderFromMarkdown]);



  const applyMd = useCallback((md: string, recordHistory = false) => {

    history.withoutRecording(() => {

      renderFromMarkdown(md);

      lastEmitted.current = md;

      skipSync.current = true;

      onChange(md);

      if (recordHistory) history.pushImmediate(md);

    });

  }, [history, onChange, renderFromMarkdown]);



  const emitChange = useCallback((immediate = false) => {

    const el = editorRef.current;

    if (!el) return;

    el.classList.toggle('is-empty', isEditorEmpty(el));

    const md = htmlToMarkdown(el);

    lastEmitted.current = md;

    skipSync.current = true;

    onChange(md);

    if (immediate) history.pushImmediate(md);

    else history.pushDebounced(md);

  }, [history, onChange]);



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



  const handleEditorClick = (e: React.MouseEvent) => {

    const target = e.target as HTMLElement;

    const root = editorRef.current;

    if (!root) return;



    const block = target.closest<HTMLElement>('.ve-block');

    if (block) {

      setActiveTag(block.dataset.tag ?? 'p');

      requestAnimationFrame(saveSelection);

      return;

    }



    const blocks = root.querySelectorAll<HTMLElement>('.ve-block');

    const last = blocks[blocks.length - 1];

    if (last) focusBlockEnd(last);

  };



  const insertGlyph = (file: string, label: string) => {

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

      insertAtSelection(img, savedRange.current, root);

      insertTextAtSelection('\u00a0', savedRange.current, root);

      setJPrefix(false);
      setDlPrefix(false);

    });

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

      if (k === 'b') { e.preventDefault(); applyInlineFormat('strong'); return; }

      if (k === 'i') { e.preventDefault(); applyInlineFormat('em'); return; }

      if (k === 'e') { e.preventDefault(); applyInlineFormat('code'); return; }

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

      const offset = getCursorOffsetInBlock(block);
      if (offset === null || offset > 0) return;

      const prev = block.previousElementSibling as HTMLElement | null;
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
      return;
    }

  };



  const handlePaste = (e: React.ClipboardEvent) => {

    e.preventDefault();

    const text = e.clipboardData.getData('text/plain');

    if (!text) return;

    snapshotNow();

    insertTextAtSelection(text, savedRange.current, editorRef.current);

    saveSelection();

    emitChange(true);

  };



  const tagBtn = (tag: 'h1' | 'h2' | 'h3' | 'li', label: string, title: string) => (

    <button

      type="button"

      onMouseDown={preventToolbarFocus}

      onClick={() => setBlockType(tag)}

      className={`ribbon-btn${activeTag === tag ? ' is-on' : ''}`}

      title={title}

      tabIndex={-1}

    >

      {label}

    </button>

  );



  const handleUndo = () => {
    const prev = history.undo();
    if (prev !== null) applyMd(prev);
  };

  const handleRedo = () => {
    const next = history.redo();
    if (next !== null) applyMd(next);
  };

  const ribbonBtn = (label: string, title: string, onClick: () => void, active?: boolean, disabled?: boolean) => (
    <button
      type="button"
      onMouseDown={preventToolbarFocus}
      onClick={onClick}
      disabled={disabled}
      className={`ribbon-btn${active ? ' is-on' : ''}`}
      title={title}
      tabIndex={-1}
    >
      {label}
    </button>
  );

  return (
    <div className="editor-ide editor-ide--with-float">
      <div className="editor-ribbon" onMouseDown={preventToolbarFocus}>
        <div className="ribbon-strip">
          <div className="ribbon-zone">
            <span className="ribbon-zone__label">{t('markdown.edit')}</span>
            <div className="ribbon-zone__row">
              {ribbonBtn('↶', t('markdown.undo'), handleUndo, false, !history.canUndo)}
              {ribbonBtn('↷', t('markdown.redo'), handleRedo, false, !history.canRedo)}
            </div>
          </div>

          <div className="ribbon-zone">
            <span className="ribbon-zone__label">{t('markdown.style')}</span>
            <div className="ribbon-zone__row">
              <button type="button" onMouseDown={preventToolbarFocus} onClick={() => applyInlineFormat('strong')} className={`ribbon-btn${fmtBold ? ' is-on' : ''}`} title={t('markdown.bold')} tabIndex={-1}>B</button>
              <button type="button" onMouseDown={preventToolbarFocus} onClick={() => applyInlineFormat('em')} className={`ribbon-btn ribbon-btn--italic${fmtItalic ? ' is-on' : ''}`} title={t('markdown.italic')} tabIndex={-1}>
                <span className="italic-i">I</span>
              </button>
              <button type="button" onMouseDown={preventToolbarFocus} onClick={() => applyInlineFormat('code')} className={`ribbon-btn ribbon-btn--mono${fmtCode ? ' is-on' : ''}`} title={t('markdown.code')} tabIndex={-1}>{"{}"}</button>
              {ribbonBtn('S', t('markdown.strike'), applyStrikethrough)}
            </div>
          </div>

          <div className="ribbon-zone">
            <span className="ribbon-zone__label">{t('markdown.block')}</span>
            <div className="ribbon-zone__row ribbon-zone__row--wrap">
              {tagBtn('li', '•', t('markdown.list'))}
              {tagBtn('h1', 'H1', t('markdown.heading1'))}
              {tagBtn('h2', 'H2', t('markdown.heading2'))}
              {tagBtn('h3', 'H3', t('markdown.heading3'))}
              {ribbonBtn('❝', t('markdown.quote'), insertBlockquote)}
              {ribbonBtn('—', t('markdown.hr'), insertHorizontalRule)}
              {ribbonBtn('🔗', t('markdown.link'), insertLink)}
              {ribbonBtn('⎇', t('markdown.flowchart'), () => setFlowchartSoonOpen(true))}
            </div>
          </div>
        </div>
      </div>

      <div className="editor-body">
        <InputsFloatingPanel
          jPrefix={jPrefix}
          dlPrefix={dlPrefix}
          onToggleJPrefix={() => {
            setJPrefix((v) => !v);
            setDlPrefix(false);
          }}
          onToggleDlPrefix={() => {
            setDlPrefix((v) => !v);
            setJPrefix(false);
          }}
          onInsertGlyph={insertGlyph}
        />

        <div
          ref={editorRef}
          className="editor-canvas visual-editor"
          onClick={handleEditorClick}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onPaste={handlePaste}
          data-placeholder={placeholder ?? t('markdown.placeholder')}
        />
      </div>

      <BlockingModal open={flowchartSoonOpen} onClose={() => setFlowchartSoonOpen(false)} title={t('markdown.flowchart')}>
        <p className="text-sm text-text-muted">{t('home.teamModalBody')}</p>
        <button type="button" onClick={() => openExternal('https://ko-fi.com/PixelR')} className="xko-btn xko-btn--pink mt-4 w-full">
          ☕ {t('home.teamModalKofi')}
        </button>
      </BlockingModal>
    </div>
  );

}


