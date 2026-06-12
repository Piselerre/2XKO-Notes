import { useI18n } from '@/hooks/useI18n';

import { glyphUrl } from '@/utils/preloadAppImages';

import { CachedImage } from './CachedImage';

type GlyphBtn = { file: string; label: string; text?: string; titleKey?: 'jumpPrefix' | 'delayPrefix' };

/** Numpad layout: 7↖ 8↑ 9↗ / 4← 5Dash 6→ / 1↙ 2↓ 3↘ */
const DPAD_GRID: GlyphBtn[] = [
  { file: 'Glyph-up_back.svg', label: '↖' },
  { file: 'Glyph-up.svg', label: '↑' },
  { file: 'Glyph-up_forward.svg', label: '↗' },
  { file: 'Glyph-back.svg', label: '←' },
  { file: 'Glyph-Dash.svg', label: 'Dash' },
  { file: 'Glyph-forward.svg', label: '→' },
  { file: 'Glyph-down_back.svg', label: '↙' },
  { file: 'Glyph-down.svg', label: '↓' },
  { file: 'Glyph-down_forward.svg', label: '↘' },
];

const ROW_BUTTONS: GlyphBtn[][] = [
  [
    { file: 'Glyph-L.svg', label: 'L' },
    { file: 'Glyph-M.svg', label: 'M' },
    { file: 'Glyph-H.svg', label: 'H' },
    { file: 'Glyph-parry.svg', label: 'P' },
    { file: '', label: 'j.', text: 'j.', titleKey: 'jumpPrefix' },
    { file: '', label: 'dl.', text: 'dl.', titleKey: 'delayPrefix' },
  ],
  [
    { file: 'Glyph-S1.svg', label: 'S1' },
    { file: 'Glyph-S2.svg', label: 'S2' },
    { file: 'Glyph-T.svg', label: 'T' },
    { file: 'Glyph-plus.svg', label: '+' },
  ],
];

interface InputsFloatingPanelProps {
  jPrefix: boolean;
  dlPrefix: boolean;
  onToggleJPrefix: () => void;
  onToggleDlPrefix: () => void;
  onInsertGlyph: (file: string, label: string) => void;
}

function preventToolbarFocus(e: React.MouseEvent) {
  e.preventDefault();
}

export function InputsFloatingPanel({
  jPrefix,
  dlPrefix,
  onToggleJPrefix,
  onToggleDlPrefix,
  onInsertGlyph,
}: InputsFloatingPanelProps) {
  const { t } = useI18n();

  function renderTextBtn(btn: GlyphBtn, key: string, active: boolean, onClick: () => void) {
    return (
      <button
        key={key}
        type="button"
        onMouseDown={preventToolbarFocus}
        onClick={onClick}
        className={`inputs-float__btn inputs-float__btn--text${active ? ' is-on' : ''}`}
        title={btn.titleKey ? t(`markdown.${btn.titleKey}`) : btn.label}
        tabIndex={-1}
      >
        {btn.text}
      </button>
    );
  }

  function renderBtn(btn: GlyphBtn, key: string) {
    if (btn.text === 'j.') {
      return renderTextBtn(btn, key, jPrefix, onToggleJPrefix);
    }
    if (btn.text === 'dl.') {
      return renderTextBtn(btn, key, dlPrefix, onToggleDlPrefix);
    }

    return (
      <button
        key={key}
        type="button"
        onMouseDown={preventToolbarFocus}
        onClick={() => onInsertGlyph(btn.file, btn.label)}
        className="inputs-float__btn inputs-float__btn--glyph"
        title={btn.label}
        tabIndex={-1}
      >
        <CachedImage src={glyphUrl(btn.file)} alt={btn.label} className="inputs-float__glyph" eager />
      </button>
    );
  }

  return (
    <div className="inputs-float" onMouseDown={preventToolbarFocus} aria-label={t('markdown.inputs')}>
      <span className="inputs-float__title">{t('markdown.inputs')}</span>
      <div className="inputs-float__rows">
        <div className="inputs-float__dpad">
          {DPAD_GRID.map((btn, index) => renderBtn(btn, `dpad-${index}`))}
        </div>
        <div className="inputs-float__divider" aria-hidden />
        {ROW_BUTTONS.map((row, rowIndex) => (
          <div key={`btn-${rowIndex}`} className="inputs-float__row inputs-float__row--center">
            {row.map((btn) => renderBtn(btn, `btn-${rowIndex}-${btn.file || btn.text}`))}
          </div>
        ))}
      </div>
    </div>
  );
}
