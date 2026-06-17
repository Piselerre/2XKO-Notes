import { buildInputChipHtml } from '@/utils/glyphModifier';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function parseInlineToHtml(text: string): string {
  if (!text) return '';
  let html = escapeHtml(text);

  html = html.replace(
    /!\[([^\]|]*)(?:\|(air|hold))?\]\(([^)]+)\)/gi,
    (_match, alt: string, mod: string | undefined, src: string) => {
      if (mod) {
        return buildInputChipHtml(alt, src, mod.toLowerCase() as 'air' | 'hold');
      }
      return `<img src="${src}" alt="${alt}" class="ve-glyph" draggable="false" contenteditable="false" />`;
    },
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  html = html.replace(/(?<!\*)\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code class="ve-code">$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="ve-link">$1</a>');

  return html;
}

export type BlockTag = 'p' | 'h1' | 'h2' | 'h3' | 'li' | 'empty';

export function parseLine(line: string): { tag: BlockTag; html: string; md: string } {
  if (line.startsWith('### ')) {
    return { tag: 'h3', html: parseInlineToHtml(line.slice(4)), md: line };
  }
  if (line.startsWith('## ')) {
    return { tag: 'h2', html: parseInlineToHtml(line.slice(3)), md: line };
  }
  if (line.startsWith('# ')) {
    return { tag: 'h1', html: parseInlineToHtml(line.slice(2)), md: line };
  }
  if (line.startsWith('- ')) {
    return { tag: 'li', html: parseInlineToHtml(line.slice(2)), md: line };
  }
  if (line.startsWith('> ')) {
    return { tag: 'p', html: `<span class="ve-quote">${parseInlineToHtml(line.slice(2))}</span>`, md: line };
  }
  if (/^---+$/.test(line.trim())) {
    return { tag: 'p', html: '<hr class="ve-hr" contenteditable="false" />', md: line };
  }
  if (!line.trim()) {
    return { tag: 'empty', html: '<br>', md: '' };
  }
  return { tag: 'p', html: parseInlineToHtml(line), md: line };
}

export function normalizeMarkdownSpacing(body: string): string {
  let s = body.replace(/\u00a0/g, ' ');
  s = s.replace(/(\!\[[^\]]*\]\([^)]+\))\s+(?=\!\[)/g, '$1');
  s = s.replace(/(\!\[[^\]]*\]\([^)]+\))\s+(?=j\.)/g, '$1');
  s = s.replace(/(\!\[[^\]]*\]\([^)]+\))\s+(?=dl\.)/g, '$1');
  s = s.replace(/(\!\[[^\]]*\]\([^)]+\))(?=[^\s!\[])/g, (match, _g1, offset, full) => {
    const rest = full.slice(offset + match.length);
    if (rest.startsWith('j.') || rest.startsWith('dl.')) return match;
    return `${match} `;
  });
  return s.replace(/  +/g, ' ').trimEnd();
}

function walkNodeToMd(node: Node, parts: string[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    parts.push(node.textContent ?? '');
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  if (el.tagName === 'STRONG') {
    parts.push(`**${el.textContent ?? ''}**`);
    return;
  }
  if (el.tagName === 'EM') {
    parts.push(`*${el.textContent ?? ''}*`);
    return;
  }
  if (el.tagName === 'CODE') {
    parts.push(`\`${el.textContent ?? ''}\``);
    return;
  }
  if (el.tagName === 'DEL') {
    parts.push(`~~${el.textContent ?? ''}~~`);
    return;
  }
  if (el.tagName === 'A') {
    const a = el as HTMLAnchorElement;
    parts.push(`[${a.textContent ?? ''}](${a.getAttribute('href') ?? ''})`);
    return;
  }
  if (el.classList.contains('ve-input-chip')) {
    const img = el.querySelector('img');
    const mod = el.dataset.mod;
    const alt = img?.getAttribute('alt') ?? '';
    const src = img?.getAttribute('src') ?? '';
    parts.push(mod ? `![${alt}|${mod}](${src})` : `![${alt}](${src})`);
    return;
  }
  if (el.classList.contains('ve-input-mod')) {
    const img = el.querySelector('img');
    if (img) {
      const tag = el.querySelector('.ve-input-mod__tag');
      const tagText = (tag?.textContent ?? '').toLowerCase();
      const mod = tagText.includes('air') ? 'air' : tagText.includes('hold') ? 'hold' : undefined;
      const alt = img.getAttribute('alt') ?? '';
      const src = img.getAttribute('src') ?? '';
      parts.push(mod ? `![${alt}|${mod}](${src})` : `![${alt}](${src})`);
      return;
    }
  }
  if (el.tagName === 'IMG') {
    const img = el as HTMLImageElement;
    parts.push(`![${img.alt}](${img.getAttribute('src') ?? ''})`);
    return;
  }
  if (el.tagName === 'BR') {
    const parent = el.parentElement;
    const isOnlyChild = parent?.childNodes.length === 1;
    if (isOnlyChild) return;
    parts.push('\n');
    return;
  }
  el.childNodes.forEach((child) => walkNodeToMd(child, parts));
}

export function serializeBlockBody(el: HTMLElement): string {
  if (el.childNodes.length === 1 && el.firstChild?.nodeName === 'BR') {
    return '';
  }
  const parts: string[] = [];
  el.childNodes.forEach((child) => walkNodeToMd(child, parts));
  return normalizeMarkdownSpacing(parts.join(''));
}

export function serializeBlock(el: HTMLElement): string {
  const tag = (el.dataset.tag as BlockTag) || 'p';
  const quote = el.querySelector<HTMLElement>('.ve-quote');
  if (quote) {
    const body = serializeBlockBody(quote);
    return body ? `> ${body}` : '';
  }
  if (el.querySelector('hr.ve-hr')) return '---';

  const body = serializeBlockBody(el);

  switch (tag) {
    case 'h1': return body ? `# ${body}` : '';
    case 'h2': return body ? `## ${body}` : '';
    case 'h3': return body ? `### ${body}` : '';
    case 'li': return body ? `- ${body}` : '';
    case 'empty': return '';
    default: return body;
  }
}

const EMPTY_BLOCK = '<div class="ve-block" data-tag="p"><br></div>';

export function markdownToHtml(md: string): string {
  const trimmed = md.trim();
  if (!trimmed) return EMPTY_BLOCK;

  return md.split('\n').map((line) => {
    const { tag, html } = parseLine(line);
    const safeTag = tag === 'empty' ? 'p' : tag;
    return `<div class="ve-block" data-tag="${safeTag}">${html}</div>`;
  }).join('');
}

export function htmlToMarkdown(container: HTMLElement): string {
  const blocks = container.querySelectorAll<HTMLElement>('.ve-block');
  if (blocks.length === 0) return '';
  return Array.from(blocks)
    .map((b) => serializeBlock(b))
    .join('\n');
}

export function isEditorEmpty(container: HTMLElement): boolean {
  const blocks = container.querySelectorAll<HTMLElement>('.ve-block');
  if (blocks.length === 0) return true;
  if (blocks.length > 1) return false;
  const body = serializeBlockBody(blocks[0]);
  return !body.trim();
}
