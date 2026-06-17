export type GlyphModifier = 'air' | 'hold';

export function modifierLabel(mod: GlyphModifier): string {
  return mod === 'air' ? '(AIR)' : '(HOLD)';
}

export function buildInputChipHtml(alt: string, src: string, mod: GlyphModifier): string {
  return (
    `<span class="ve-input-chip" contenteditable="false" data-mod="${mod}">` +
    `<img src="${src}" alt="${alt}" class="ve-glyph" draggable="false" contenteditable="false" />` +
    `<span class="ve-input-chip__label">${modifierLabel(mod)}</span></span>`
  );
}
