import { buildInputChipHtml } from '@/utils/glyphModifier';
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
  if (el.classList.contains('ve-input-chip')) {
    const img = el.querySelector('img');
    const mod = el.dataset.mod;
    const alt = img?.getAttribute('alt') ?? '';
    const src = img?.getAttribute('src') ?? '';
    return (mod ? `![${alt}|${mod}](${src})` : `![${alt}](${src})`).length;
  }
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

  if (target <= 0) {
    const range = document.createRange();
    range.selectNodeContents(block);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }

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

    if (['STRONG', 'EM', 'CODE', 'IMG'].includes(el.tagName) || el.classList.contains('ve-input-chip')) {
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
    regex: /!\[([^\]|]*)(?:\|(air|hold))?\]\(([^)]+)\)$/i,
    html: (m) => {
      const alt = m[1];
      const mod = m[2]?.toLowerCase();
      const src = m[3];
      if (mod) {
        return buildInputChipHtml(alt, src, mod as 'air' | 'hold');
      }
      return `<img src="${src}" alt="${alt}" class="ve-glyph" draggable="false" contenteditable="false" />`;
    },
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
    const afterImage = /(?:<\/span>|<img[^>]*\/?>)\s*$/i.test(prefixHtml);
    block.innerHTML = `${prefixHtml}${rendered}${afterImage ? '' : '&nbsp;'}${afterHtml}` || '<br>';

    const newOffset = prefix.length + pattern.mdLen(match) + 1;
    setMarkdownOffset(block, newOffset);
    return true;
  }
  return false;
}

export function isBlockEmpty(block: HTMLElement): boolean {
  if (block.childNodes.length === 1 && block.firstChild?.nodeName === 'BR') return true;
  const body = serializeBlockBody(block);
  return !body.trim();
}

export function getCursorOffsetInBlock(block: HTMLElement): number | null {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!block.contains(range.commonAncestorContainer)) return null;
  const offset = getMarkdownOffset(block, range.endContainer, range.endOffset);
  if (isBlockEmpty(block) && offset > 0) return 0;
  return offset;
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

function isAtomicInlineNode(node: Node | null): node is HTMLElement {
  return isInlineImageNode(node);
}

export function isInlineImageNode(node: Node | null): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false;
  if (node.classList.contains('ve-input-chip')) return true;
  return node.tagName === 'IMG' && node.classList.contains('ve-glyph');
}

function isSpacerText(text: string): boolean {
  return text === '\u00a0' || text === ' ' || text === '';
}

/** Remove spaces between consecutive inline images; keep at most one before following text. */
export function normalizeInlineSpacingInBlock(block: HTMLElement): void {
  let node = block.firstChild;
  while (node) {
    const next = node.nextSibling;
    if (
      node.nodeType === Node.TEXT_NODE
      && isSpacerText(node.textContent ?? '')
      && isInlineImageNode(node.previousSibling)
      && isInlineImageNode(next)
    ) {
      node.remove();
      node = next;
      continue;
    }
    node = next;
  }
}

export function insertInlineImageAtSelection(
  node: Node,
  saved: Range | null | undefined,
  root: HTMLElement,
): void {
  insertAtSelection(node, saved, root);
  if (isInlineImageNode(node.previousSibling)) {
    const spacer = node.previousSibling?.nextSibling;
    if (spacer?.nodeType === Node.TEXT_NODE && isSpacerText(spacer.textContent ?? '')) {
      spacer.remove();
    }
  }
  const block = getActiveBlock(root);
  if (block) normalizeInlineSpacingInBlock(block);
}

export function shouldSkipLeadingSpaceBeforeText(key: string): boolean {
  return key === 'j' || key === 'd';
}

function previousMeaningfulSibling(node: Node | null): Node | null {
  let current = node;
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      const text = current.textContent ?? '';
      if (text.length > 0 && text !== '\u00a0' && text.trim() !== '') return current;
      current = current.previousSibling;
      continue;
    }
    if (current.nodeType === Node.ELEMENT_NODE) {
      if ((current as HTMLElement).tagName === 'BR') {
        current = current.previousSibling;
        continue;
      }
      return current;
    }
    current = current.previousSibling;
  }
  return null;
}

export function nodeBeforeCursor(block: HTMLElement): Node | null {
  const sel = window.getSelection();
  if (!sel?.rangeCount || !sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!block.contains(range.startContainer)) return null;

  const { startContainer, startOffset } = range;
  if (startContainer.nodeType === Node.TEXT_NODE) {
    if (startOffset > 0) return null;
    return previousMeaningfulSibling(startContainer);
  }
  if (startContainer instanceof HTMLElement) {
    if (startOffset > 0) {
      return previousMeaningfulSibling(startContainer.childNodes[startOffset - 1] ?? null);
    }
    if (startContainer === block) return previousMeaningfulSibling(block.lastChild);
    return previousMeaningfulSibling(startContainer);
  }
  return null;
}

export function deleteAtomicInlineBeforeCursor(block: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel?.rangeCount || !sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!block.contains(range.startContainer)) return false;

  const { startContainer, startOffset } = range;
  if (startContainer.nodeType === Node.TEXT_NODE && startOffset > 0) {
    const text = startContainer.textContent ?? '';
    if (text === '\u00a0' && startOffset >= 1) {
      const prev = startContainer.previousSibling;
      if (isAtomicInlineNode(prev)) {
        prev.remove();
        (startContainer as ChildNode).remove();
        return true;
      }
    }
    return false;
  }

  const target = nodeBeforeCursor(block);
  if (!isAtomicInlineNode(target)) return false;
  target.remove();
  const next = target.nextSibling;
  if (next?.nodeType === Node.TEXT_NODE && next.textContent === '\u00a0') {
    next.remove();
  }
  return true;
}
