import { preventToolbarFocus } from './visualEditor/useMarkdownEditorCore';
import { useI18n } from '@/hooks/useI18n';

interface MobileEditorToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  activeTag: string;
  fmtBold: boolean;
  fmtItalic: boolean;
  fmtCode: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onBold: () => void;
  onItalic: () => void;
  onCode: () => void;
  onStrike: () => void;
  onBlockType: (tag: 'h1' | 'h2' | 'h3' | 'li') => void;
  onQuote: () => void;
  onHr: () => void;
  onLink: () => void;
}

function Btn({
  label,
  title,
  onClick,
  active,
  disabled,
  mono,
  italic,
}: {
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  mono?: boolean;
  italic?: boolean;
}) {
  return (
    <button
      type="button"
      className={[
        'mobile-md-toolbar__btn',
        active ? 'is-on' : '',
        mono ? 'mobile-md-toolbar__btn--mono' : '',
        italic ? 'mobile-md-toolbar__btn--italic' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={title}
      tabIndex={-1}
      disabled={disabled}
      onMouseDown={preventToolbarFocus}
      onClick={onClick}
    >
      {italic ? <span className="italic-i">{label}</span> : label}
    </button>
  );
}

export function MobileEditorToolbar({
  canUndo,
  canRedo,
  activeTag,
  fmtBold,
  fmtItalic,
  fmtCode,
  onUndo,
  onRedo,
  onBold,
  onItalic,
  onCode,
  onStrike,
  onBlockType,
  onQuote,
  onHr,
  onLink,
}: MobileEditorToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="mobile-md-toolbar" onMouseDown={preventToolbarFocus} role="toolbar" aria-label={t('markdown.style')}>
      <div className="mobile-md-toolbar__scroll">
        <div className="mobile-md-toolbar__group">
          <Btn label="↶" title={t('markdown.undo')} onClick={onUndo} disabled={!canUndo} />
          <Btn label="↷" title={t('markdown.redo')} onClick={onRedo} disabled={!canRedo} />
        </div>
        <span className="mobile-md-toolbar__sep" aria-hidden />
        <div className="mobile-md-toolbar__group">
          <Btn label="B" title={t('markdown.bold')} onClick={onBold} active={fmtBold} />
          <Btn label="I" title={t('markdown.italic')} onClick={onItalic} active={fmtItalic} italic />
          <Btn label="{}" title={t('markdown.code')} onClick={onCode} active={fmtCode} mono />
          <Btn label="S" title={t('markdown.strike')} onClick={onStrike} />
        </div>
        <span className="mobile-md-toolbar__sep" aria-hidden />
        <div className="mobile-md-toolbar__group">
          <Btn label="•" title={t('markdown.list')} onClick={() => onBlockType('li')} active={activeTag === 'li'} />
          <Btn label="H1" title={t('markdown.heading1')} onClick={() => onBlockType('h1')} active={activeTag === 'h1'} />
          <Btn label="H2" title={t('markdown.heading2')} onClick={() => onBlockType('h2')} active={activeTag === 'h2'} />
          <Btn label="H3" title={t('markdown.heading3')} onClick={() => onBlockType('h3')} active={activeTag === 'h3'} />
          <Btn label="❝" title={t('markdown.quote')} onClick={onQuote} />
          <Btn label="—" title={t('markdown.hr')} onClick={onHr} />
          <Btn label="🔗" title={t('markdown.link')} onClick={onLink} />
        </div>
      </div>
    </div>
  );
}
