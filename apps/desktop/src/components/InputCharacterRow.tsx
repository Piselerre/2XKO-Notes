import { getInputCharacterIcons } from '@/data/manifest';

import { CachedImage } from './CachedImage';

function preventToolbarFocus(e: React.MouseEvent) {
  e.preventDefault();
}

interface InputCharacterRowProps {
  onInsert: (name: string, src: string) => void;
  variant?: 'toolbar' | 'sheet' | 'mobile';
}

const ICONS = getInputCharacterIcons();

export function InputCharacterRow({ onInsert, variant = 'toolbar' }: InputCharacterRowProps) {
  return (
    <div
      className={`input-char-row input-char-row--${variant}`}
      onMouseDown={preventToolbarFocus}
      role="toolbar"
      aria-label="Character icons"
    >
      {ICONS.map((char) => (
        <button
          key={char.slug}
          type="button"
          className="inputs-float__btn inputs-float__btn--glyph inputs-float__btn--character"
          title={char.name}
          aria-label={char.name}
          tabIndex={-1}
          onMouseDown={preventToolbarFocus}
          onClick={() => onInsert(char.name, char.src)}
        >
          <CachedImage
            src={char.src}
            alt=""
            className="inputs-float__glyph inputs-float__glyph--character"
            eager
          />
        </button>
      ))}
    </div>
  );
}
