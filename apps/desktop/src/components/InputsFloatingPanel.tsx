import { useI18n } from '@/hooks/useI18n';

import { glyphUrl } from '@/utils/preloadAppImages';

import { CachedImage } from './CachedImage';

export type InputModifier = 'air' | 'hold' | null;

type GlyphBtn = {
  file: string;
  label: string;
  text?: string;
  titleKey?: 'jumpPrefix' | 'delayPrefix';
  modifiers?: boolean;
};

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

const ROW_ATTACKS: GlyphBtn[] = [
  { file: 'Glyph-L.svg', label: 'L', modifiers: true },
  { file: 'Glyph-M.svg', label: 'M', modifiers: true },
  { file: 'Glyph-H.svg', label: 'H', modifiers: true },
  { file: '', label: 'j.', text: 'j.', titleKey: 'jumpPrefix' },
  { file: '', label: 'dl.', text: 'dl.', titleKey: 'delayPrefix' },
];

const ROW_SPECIALS: GlyphBtn[] = [
  { file: 'Glyph-S1.svg', label: 'S1', modifiers: true },
  { file: 'Glyph-S2.svg', label: 'S2', modifiers: true },
  { file: 'Glyph-T.svg', label: 'T', modifiers: true },
  { file: 'Glyph-plus.svg', label: '+' },
  { file: 'Glyph-chain.svg', label: '>' },
];

interface InputsFloatingPanelProps {
  jPrefix: boolean;
  dlPrefix: boolean;
  airMode: boolean;
  holdMode: boolean;
  onToggleJPrefix: () => void;
  onToggleDlPrefix: () => void;
  onToggleAirMode: () => void;
  onToggleHoldMode: () => void;
  onInsertGlyph: (file: string, label: string, modifier?: InputModifier) => void;
  variant?: 'toolbar' | 'sheet' | 'mobile';
}

function preventToolbarFocus(e: React.MouseEvent) {
  e.preventDefault();
}

export function InputsFloatingPanel({
  jPrefix,
  dlPrefix,
  airMode,
  holdMode,
  onToggleJPrefix,
  onToggleDlPrefix,
  onToggleAirMode,
  onToggleHoldMode,
  onInsertGlyph,
  variant = 'toolbar',
}: InputsFloatingPanelProps) {
  const { t } = useI18n();
  const activeModifier: InputModifier = airMode ? 'air' : holdMode ? 'hold' : null;

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

    const modifier = btn.modifiers ? activeModifier : null;

    return (
      <button
        key={key}
        type="button"
        onMouseDown={preventToolbarFocus}
        onClick={() => onInsertGlyph(btn.file, btn.label, modifier ?? undefined)}
        className={`inputs-float__btn inputs-float__btn--glyph${btn.file === 'Glyph-Dash.svg' ? ' inputs-float__btn--dash' : ''}`}
        title={btn.label}
        tabIndex={-1}
      >
        {btn.file ? (
          <CachedImage src={glyphUrl(btn.file)} alt={btn.label} className="inputs-float__glyph" eager />
        ) : (
          <span>{btn.label}</span>
        )}
      </button>
    );
  }

  function renderModifierBtns() {
    return (
      <div className="inputs-float__mods-inline">
        <button
          type="button"
          className={`inputs-float__mod-btn${airMode ? ' is-on' : ''}`}
          onMouseDown={preventToolbarFocus}
          onClick={onToggleAirMode}
          tabIndex={-1}
        >
          AIR
        </button>
        <button
          type="button"
          className={`inputs-float__mod-btn${holdMode ? ' is-on' : ''}`}
          onMouseDown={preventToolbarFocus}
          onClick={onToggleHoldMode}
          tabIndex={-1}
        >
          HOLD
        </button>
      </div>
    );
  }

  function renderAttackRow() {
    const nodes: React.ReactNode[] = [];
    for (const btn of ROW_ATTACKS) {
      nodes.push(renderBtn(btn, `atk-${btn.file || btn.text}`));
      if (btn.label === 'H') {
        nodes.push(renderModifierBtns());
      }
    }
    return nodes;
  }

  return (
    <div
      className={`inputs-float inputs-float--${variant}`}
      onMouseDown={preventToolbarFocus}
      aria-label={t('markdown.inputs')}
    >
      <div className="inputs-float__layout">
        <div className="inputs-float__dpad">
          {DPAD_GRID.map((btn, index) => renderBtn(btn, `dpad-${index}`))}
        </div>
        <div className="inputs-float__actions-col">
          <div className="inputs-float__row">{renderAttackRow()}</div>
          <div className="inputs-float__row">
            {ROW_SPECIALS.map((btn) => renderBtn(btn, `sp-${btn.file}`))}
          </div>
        </div>
      </div>
    </div>
  );
}
