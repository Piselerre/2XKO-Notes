import { parseInlineToHtml, serializeBlockBody } from './markdownParse';

export function getActiveBlock(root: HTMLElement | null): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel?.anchorNode || !root) return null;
  let node: Node | null = sel.anchorNode;
  while (node && node !== root) {
    if ((node as HTMLElement).classList?.contains('ve-block')) {
      return node as HTMLElement;
    }
    node = node.parentNode;
  }
  return root.querySelector<HTMLElement>('.ve-block');
}

function nodeToMdLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').length;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return 0;
  const el = node as HTMLElement;
  if (el.tagName === 'STRONG') return `**${el.textContent ?? ''}**`.length;
  if (el.tagName === 'EM') return `*${el.textContent ?? ''}*`.length;
  if (el.tagName === 'CODE') return `\`${el.textContent ?? ''}\``.length;
  if (el.tagName === 'IMG') {
    const img = el as HTMLImageElement;
    return `![${img.alt}](${img.getAttribute('src') ?? ''})`.length;
  }
  if (el.tagName === 'BR') return 1;
  let len = 0;
  el.childNodes.forEach((child) => { len += nodeToMdLength(child); });
  return len;
}

export function getMarkdownOffset(block: HTMLElement, endContainer: Node, endOffset: number): number {
  const range = document.createRange();
  range.selectNodeContents(block);
  range.setEnd(endContainer, endOffset);
  const frag = range.cloneContents();
  let len = 0;
  frag.childNodes.forEach((n) => { len += nodeToMdLength(n); });
  return len;
}

export function setMarkdownOffset(block: HTMLElement, target: number): void {
  const sel = window.getSelection();
  if (!sel) return;

  let remaining = target;

  const place = (node: Node, offset: number) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const descend = (node: Node): boolean => {
    if (remaining <= 0) return true;

    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent ?? '').length;
      if (remaining <= len) {
        place(node, remaining);
        return true;
      }
      remaining -= len;
      return false;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const el = node as HTMLElement;

    if (el.tagName === 'BR') {
      if (remaining <= 1) {
        place(el.parentNode ?? block, Array.from((el.parentNode ?? block).childNodes).indexOf(el));
        return true;
      }
      remaining -= 1;
      return false;
    }

    if (['STRONG', 'EM', 'CODE', 'IMG'].includes(el.tagName)) {
      const mdLen = nodeToMdLength(el);
      if (remaining <= mdLen) {
        const text = el.firstChild;
        if (text?.nodeType === Node.TEXT_NODE && remaining < (text.textContent ?? '').length) {
          place(text, remaining);
        } else {
          place(el.parentNode ?? block, Array.from((el.parentNode ?? block).childNodes).indexOf(el) + 1);
        }
        return true;
      }
      remaining -= mdLen;
      return false;
    }

    for (const child of Array.from(node.childNodes)) {
      if (descend(child)) return true;
    }
    return false;
  };

  if (!descend(block)) {
    const range = document.createRange();
    range.selectNodeContents(block);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export function restoreSavedRange(saved: Range | null, root: HTMLElement): boolean {
  if (!saved || !root.contains(saved.commonAncestorContainer)) return false;
  const sel = window.getSelection();
  if (!sel) return false;
  sel.removeAllRanges();
  sel.addRange(saved);
  return true;
}

export function insertAtSelection(node: Node, saved?: Range | null, root?: HTMLElement | null): void {
  const sel = window.getSelection();
  if (!sel) return;

  if (saved && root && restoreSavedRange(saved, root)) {
    // selection restored
  } else if (!sel.rangeCount) {
    return;
  }

  const range = sel.getRangeAt(0);
  if (root && !root.contains(range.commonAncestorContainer)) return;

  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function insertTextAtSelection(text: string, saved?: Range | null, root?: HTMLElement | null): void {
  insertAtSelection(document.createTextNode(text), saved, root);
}

type InlinePattern = {
  regex: RegExp;
  html: (match: RegExpMatchArray) => string;
  mdLen: (match: RegExpMatchArray) => number;
};

const INLINE_PATTERNS: InlinePattern[] = [
  {
    regex: /!\[([^\]]*)\]\(([^)]+)\)$/,
    html: (m) => `<img src="${m[2]}" alt="${m[1]}" class="ve-glyph" draggable="false" contenteditable="false" />`,
    mdLen: (m) => m[0].length,
  },
  {
    regex: /\*\*([^*]+)\*\*$/,
    html: (m) => `<strong>${escapeHtml(m[1])}</strong>`,
    mdLen: (m) => m[0].length,
  },
  {
    regex: /(?<!\*)\*([^*]+)\*$/,
    html: (m) => `<em>${escapeHtml(m[1])}</em>`,
    mdLen: (m) => m[0].length,
  },
  {
    regex: /`([^`]+)`$/,
    html: (m) => `<code class="ve-code">${escapeHtml(m[1])}</code>`,
    mdLen: (m) => m[0].length,
  },
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function tryInlineTransform(block: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return false;

  const range = sel.getRangeAt(0);
  const offset = getMarkdownOffset(block, range.endContainer, range.endOffset);
  const body = serializeBlockBody(block);
  const before = body.slice(0, offset);

  for (const pattern of INLINE_PATTERNS) {
    const match = before.match(pattern.regex);
    if (!match) continue;

    const prefix = before.slice(0, match.index ?? 0);
    const after = body.slice(offset);
    const rendered = pattern.html(match);
    const prefixHtml = prefix ? parseInlineToHtml(prefix) : '';
    const afterHtml = after ? parseInlineToHtml(after) : '';
    block.innerHTML = `${prefixHtml}${rendered}&nbsp;${afterHtml}` || '<br>';

    const newOffset = prefix.length + pattern.mdLen(match) + 1;
    setMarkdownOffset(block, newOffset);
    return true;
  }
  return false;
}

export function isBlockEmpty(block: HTMLElement): boolean {
  const body = serializeBlockBody(block).replace(/\n/g, '');
  return !body.trim();
}

export function getCursorOffsetInBlock(block: HTMLElement): number | null {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!block.contains(range.commonAncestorContainer)) return null;
  return getMarkdownOffset(block, range.endContainer, range.endOffset);
}

export function placeCursorInBlock(block: HTMLElement, offset: number): void {
  block.focus();
  if (isBlockEmpty(block)) {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(block);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }
  setMarkdownOffset(block, Math.max(0, offset));
}

export function mergeBlockWithPrevious(block: HTMLElement): HTMLElement | null {
  const prev = block.previousElementSibling as HTMLElement | null;
  if (!prev?.classList.contains('ve-block')) return null;

  const prevBody = serializeBlockBody(prev);
  const currBody = serializeBlockBody(block);
  const joinPoint = prevBody.length;
  const merged = `${prevBody}${currBody}`;

  prev.innerHTML = merged ? parseInlineToHtml(merged) : '<br>';
  block.remove();
  placeCursorInBlock(prev, joinPoint);
  return prev;
}

export function splitBlockAtCursor(block: HTMLElement): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return null;

  const range = sel.getRangeAt(0);
  if (!block.contains(range.commonAncestorContainer)) return null;

  const offset = getMarkdownOffset(block, range.endContainer, range.endOffset);
  const body = serializeBlockBody(block);
  const before = body.slice(0, offset);
  const after = body.slice(offset);

  block.innerHTML = before ? parseInlineToHtml(before) : '<br>';

  const newBlock = document.createElement('div');
  newBlock.className = 've-block';
  newBlock.dataset.tag = 'p';
  newBlock.contentEditable = 'true';
  newBlock.innerHTML = after ? parseInlineToHtml(after) : '<br>';
  block.after(newBlock);

  placeCursorInBlock(newBlock, 0);
  return newBlock;
}

function findInlineWrap(node: Node | null, block: HTMLElement, tag: 'strong' | 'em' | 'code'): HTMLElement | null {
  let n: Node | null = node;
  while (n && n !== block) {
    if (n instanceof HTMLElement) {
      if (n.tagName.toLowerCase() === tag) return n;
      if (tag === 'code' && n.tagName.toLowerCase() === 'code' && n.classList.contains('ve-code')) return n;
    }
    n = n.parentNode;
  }
  return null;
}

export function unwrapNode(el: HTMLElement): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
  if (parent instanceof HTMLElement) parent.normalize();
}

export function cursorHasFormat(block: HTMLElement, tag: 'strong' | 'em' | 'code'): boolean {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return false;
  return !!findInlineWrap(sel.anchorNode, block, tag);
}

export function toggleInlineFormat(tag: 'strong' | 'em' | 'code', block: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return false;

  const startWrap = findInlineWrap(sel.anchorNode, block, tag);
  const endWrap = findInlineWrap(sel.focusNode, block, tag);

  if (startWrap && (!sel.isCollapsed ? startWrap === endWrap : true)) {
    unwrapNode(startWrap);
    return true;
  }

  if (sel.isCollapsed) return false;

  const text = sel.toString();
  if (!text) return false;

  const el = document.createElement(tag);
  if (tag === 'code') el.className = 've-code';
  el.textContent = text;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(el);
  range.setStartAfter(el);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  return true;
}

export function wrapSelection(tag: 'strong' | 'em' | 'code', block: HTMLElement): void {
  if (!block) return;
  toggleInlineFormat(tag, block);
}

export function ensureEditorContent(root: HTMLElement, emptyHtml: string): void {
  if (!root.querySelector('.ve-block')) {
    root.innerHTML = emptyHtml;
  }
}
