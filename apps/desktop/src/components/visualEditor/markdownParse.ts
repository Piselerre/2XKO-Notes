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
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="ve-glyph" draggable="false" contenteditable="false" />',
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
  if (el.tagName === 'IMG') {
    const img = el as HTMLImageElement;
    parts.push(`![${img.alt}](${img.getAttribute('src') ?? ''})`);
    return;
  }
  if (el.tagName === 'BR') {
    parts.push('\n');
    return;
  }
  el.childNodes.forEach((child) => walkNodeToMd(child, parts));
}

export function serializeBlockBody(el: HTMLElement): string {
  const parts: string[] = [];
  el.childNodes.forEach((child) => walkNodeToMd(child, parts));
  return parts.join('').replace(/\u00a0/g, ' ');
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

const EMPTY_BLOCK = '<div class="ve-block" data-tag="p" contenteditable="true"><br></div>';

export function markdownToHtml(md: string): string {
  const trimmed = md.trim();
  if (!trimmed) return EMPTY_BLOCK;

  return md.split('\n').map((line) => {
    const { tag, html } = parseLine(line);
    const safeTag = tag === 'empty' ? 'p' : tag;
    return `<div class="ve-block" data-tag="${safeTag}" contenteditable="true">${html}</div>`;
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
