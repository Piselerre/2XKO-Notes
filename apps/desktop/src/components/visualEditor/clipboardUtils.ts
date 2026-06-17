import { normalizeMarkdownSpacing, serializeBlock } from './markdownParse';

function absoluteAssetUrl(src: string): string {
  if (!src || src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}${src.startsWith('/') ? src : `/${src}`}`;
}

/** Plain text for Notepad / Discord — images become [label]. */
export function markdownToPlainText(md: string): string {
  return md
    .replace(/!\[([^\]|]*)(?:\|(air|hold))?\]\([^)]+\)/gi, (_m, alt: string, mod?: string) => {
      const label = alt?.trim() || 'img';
      return mod ? `[${label}|${mod}]` : `[${label}]`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function fragmentToMarkdown(fragment: DocumentFragment | HTMLElement): string {
  const root = fragment instanceof HTMLElement ? fragment : document.createElement('div');
  if (!(fragment instanceof HTMLElement)) root.appendChild(fragment.cloneNode(true));

  const blocks = root.querySelectorAll<HTMLElement>('.ve-block');
  if (blocks.length > 0) {
    return Array.from(blocks)
      .map((block) => serializeBlock(block))
      .filter(Boolean)
      .join('\n');
  }

  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? '');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.tagName === 'BR') {
      parts.push('\n');
      return;
    }
    if (el.tagName === 'IMG') {
      const img = el as HTMLImageElement;
      parts.push(`![${img.alt || 'img'}](${img.getAttribute('src') ?? ''})`);
      return;
    }
    if (el.tagName === 'P' || el.tagName === 'DIV') {
      el.childNodes.forEach(walk);
      parts.push('\n');
      return;
    }
    el.childNodes.forEach(walk);
  };
  root.childNodes.forEach(walk);
  return normalizeMarkdownSpacing(parts.join(''));
}

export function selectionToMarkdown(_root: HTMLElement, range: Range): string {
  const fragment = range.cloneContents();
  const wrap = document.createElement('div');
  wrap.appendChild(fragment);

  const blocks = wrap.querySelectorAll<HTMLElement>('.ve-block');
  if (blocks.length > 0) {
    return Array.from(blocks)
      .map((block) => serializeBlock(block))
      .filter(Boolean)
      .join('\n');
  }

  if (!wrap.textContent?.trim() && !wrap.querySelector('img')) {
    return '';
  }

  return fragmentToMarkdown(wrap);
}

function buildClipboardHtmlSync(sourceRoot: HTMLElement): string {
  const clone = sourceRoot.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    const src = img.getAttribute('src') ?? '';
    if (src.startsWith('/')) {
      img.setAttribute('src', absoluteAssetUrl(src));
    }
    img.style.height = '22px';
    img.style.width = 'auto';
    img.style.verticalAlign = 'middle';
    img.style.display = 'inline-block';
  });
  return `<div>${clone.innerHTML}</div>`;
}

export function writeEditorSelectionToClipboardEvent(
  e: React.ClipboardEvent,
  markdown: string,
  html: string,
  plainText: string,
): void {
  e.clipboardData.setData('text/plain', plainText);
  e.clipboardData.setData('text/html', html);
  e.clipboardData.setData('text/markdown', markdown);
}

export function normalizePastedMarkdown(text: string): string {
  if (!text) return '';
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      : '';
  let out = text.replace(/\r\n/g, '\n');
  if (origin) {
    out = out.replace(new RegExp(`!\\[([^\\]]*)\\]\\(${origin}(/img/[^)]+)\\)`, 'g'), '![$1]($2)');
  }
  return normalizeMarkdownSpacing(out);
}

export function htmlClipboardToMarkdown(html: string): string {
  if (!html.trim()) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  const blocks = body.querySelectorAll<HTMLElement>('.ve-block');
  if (blocks.length > 0) {
    return Array.from(blocks)
      .map((block) => serializeBlock(block))
      .filter(Boolean)
      .join('\n');
  }
  return fragmentToMarkdown(body);
}

export function prepareCopyPayloadSync(
  root: HTMLElement,
  range: Range,
): { markdown: string; html: string; plainText: string } | null {
  const markdown = selectionToMarkdown(root, range);
  if (!markdown) return null;

  const wrap = document.createElement('div');
  wrap.appendChild(range.cloneContents());
  const html = buildClipboardHtmlSync(wrap);
  const plainText = markdownToPlainText(markdown);
  return { markdown, html, plainText };
}
