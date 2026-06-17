import { useMarkdownEditorCore, preventToolbarFocus } from './visualEditor/useMarkdownEditorCore';

import { BlockingModal } from './BlockingModal';
import { InputsFloatingPanel } from './InputsFloatingPanel';
import { InputCharacterRow } from './InputCharacterRow';
import { openExternal } from '@/utils/openExternal';



interface MarkdownEditorProps {

  value: string;

  onChange: (value: string) => void;

  placeholder?: string;

}



export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const {
    t,
    mobile,
    editorRef,
    history,
    activeTag,
    fmtBold,
    fmtItalic,
    fmtCode,
    flowchartSoonOpen,
    inputsOpen,
    setInputsOpen,
    setFlowchartSoonOpen,
    saveSelection,
    handleInput,
    handleEditorClick,
    handleEditorFocus,
    handleKeyDown,
    handleCopy,
    handlePaste,
    setBlockType,
    applyInlineFormat,
    applyStrikethrough,
    insertBlockquote,
    insertHorizontalRule,
    insertLink,
    inputsPanelProps,
    insertCharacterIcon,
    handleUndo,
    handleRedo,
  } = useMarkdownEditorCore({ value, onChange, placeholder });



  const tagBtn = (tag: 'h1' | 'h2' | 'h3' | 'li', label: string, title: string) => (

    <button

      type="button"

      onMouseDown={preventToolbarFocus}

      onClick={() => setBlockType(tag)}

      className={`ribbon-btn${activeTag === tag ? ' is-on' : ''}`}

      title={title}

      tabIndex={-1}

    >

      {label}

    </button>

  );



  const ribbonBtn = (label: string, title: string, onClick: () => void, active?: boolean, disabled?: boolean) => (
    <button
      type="button"
      onMouseDown={preventToolbarFocus}
      onClick={onClick}
      disabled={disabled}
      className={`ribbon-btn${active ? ' is-on' : ''}`}
      title={title}
      tabIndex={-1}
    >
      {label}
    </button>
  );

  return (
    <div className={`editor-ide${mobile ? ' editor-ide--mobile' : ' editor-ide--desktop'}`}>
      <div className="editor-ribbon" onMouseDown={preventToolbarFocus}>
        {mobile && (
          <div className="editor-mobile-bar">
            <button
              type="button"
              className="editor-mobile-bar__btn"
              onMouseDown={preventToolbarFocus}
              onClick={() => setInputsOpen((v) => !v)}
            >
              {t('markdown.inputs')}
            </button>
            <button type="button" className="editor-mobile-bar__btn" onMouseDown={preventToolbarFocus} onClick={handleUndo} disabled={!history.canUndo}>
              ↶
            </button>
            <button type="button" className="editor-mobile-bar__btn" onMouseDown={preventToolbarFocus} onClick={handleRedo} disabled={!history.canRedo}>
              ↷
            </button>
          </div>
        )}
        {mobile ? (
          <div className="ribbon-strip ribbon-strip--mobile">
            <div className="ribbon-zone ribbon-zone--style">
              <div className="ribbon-zone__row ribbon-zone__row--wrap">
                <button type="button" onMouseDown={preventToolbarFocus} onClick={() => applyInlineFormat('strong')} className={`ribbon-btn${fmtBold ? ' is-on' : ''}`} title={t('markdown.bold')} tabIndex={-1}>B</button>
                <button type="button" onMouseDown={preventToolbarFocus} onClick={() => applyInlineFormat('em')} className={`ribbon-btn ribbon-btn--italic${fmtItalic ? ' is-on' : ''}`} title={t('markdown.italic')} tabIndex={-1}>
                  <span className="italic-i">I</span>
                </button>
                <button type="button" onMouseDown={preventToolbarFocus} onClick={() => applyInlineFormat('code')} className={`ribbon-btn ribbon-btn--mono${fmtCode ? ' is-on' : ''}`} title={t('markdown.code')} tabIndex={-1}>{"{}"}</button>
                {ribbonBtn('S', t('markdown.strike'), applyStrikethrough)}
              </div>
            </div>

            <div className="ribbon-zone ribbon-zone--block">
              <div className="ribbon-zone__row ribbon-zone__row--wrap">
                {tagBtn('li', '•', t('markdown.list'))}
                {tagBtn('h1', 'H1', t('markdown.heading1'))}
                {tagBtn('h2', 'H2', t('markdown.heading2'))}
                {tagBtn('h3', 'H3', t('markdown.heading3'))}
                {ribbonBtn('❝', t('markdown.quote'), insertBlockquote)}
                {ribbonBtn('—', t('markdown.hr'), insertHorizontalRule)}
                {ribbonBtn('🔗', t('markdown.link'), insertLink)}
                {ribbonBtn('⎇', t('markdown.flowchart'), () => setFlowchartSoonOpen(true))}
              </div>
            </div>

            {inputsOpen && (
              <div className="inputs-inline-panel">
                <InputsFloatingPanel
                  variant="sheet"
                  {...inputsPanelProps}
                />
                <InputCharacterRow variant="sheet" onInsert={insertCharacterIcon} />
              </div>
            )}
          </div>
        ) : (
        <>
        <div className="editor-ribbon__scroll">
          <div className="editor-toolbar">
            <div className="editor-toolbar__left-stack">
              <div className="editor-toolbar__text-row">
                <div className="editor-toolbar__group">
                  {ribbonBtn('↶', t('markdown.undo'), handleUndo, false, !history.canUndo)}
                  {ribbonBtn('↷', t('markdown.redo'), handleRedo, false, !history.canRedo)}
                </div>

                <div className="editor-toolbar__sep" aria-hidden="true" />

                <div className="editor-toolbar__group">
                  <button type="button" onMouseDown={preventToolbarFocus} onClick={() => applyInlineFormat('strong')} className={`ribbon-btn${fmtBold ? ' is-on' : ''}`} title={t('markdown.bold')} tabIndex={-1}>B</button>
                  <button type="button" onMouseDown={preventToolbarFocus} onClick={() => applyInlineFormat('em')} className={`ribbon-btn ribbon-btn--italic${fmtItalic ? ' is-on' : ''}`} title={t('markdown.italic')} tabIndex={-1}>
                    <span className="italic-i">I</span>
                  </button>
                  <button type="button" onMouseDown={preventToolbarFocus} onClick={() => applyInlineFormat('code')} className={`ribbon-btn ribbon-btn--mono${fmtCode ? ' is-on' : ''}`} title={t('markdown.code')} tabIndex={-1}>{"{}"}</button>
                  {ribbonBtn('S', t('markdown.strike'), applyStrikethrough)}
                </div>

                <div className="editor-toolbar__sep" aria-hidden="true" />

                <div className="editor-toolbar__group editor-toolbar__group--blocks">
                  {tagBtn('li', '•', t('markdown.list'))}
                  {tagBtn('h1', 'H1', t('markdown.heading1'))}
                  {tagBtn('h2', 'H2', t('markdown.heading2'))}
                  {tagBtn('h3', 'H3', t('markdown.heading3'))}
                  {ribbonBtn('❝', t('markdown.quote'), insertBlockquote)}
                  {ribbonBtn('—', t('markdown.hr'), insertHorizontalRule)}
                  {ribbonBtn('🔗', t('markdown.link'), insertLink)}
                  {ribbonBtn('⎇', t('markdown.flowchart'), () => setFlowchartSoonOpen(true))}
                </div>
              </div>
              <InputCharacterRow variant="toolbar" onInsert={insertCharacterIcon} />
            </div>

            <div className="editor-toolbar__sep editor-toolbar__sep--inputs" aria-hidden="true" />

            <div className="editor-toolbar__group editor-toolbar__group--inputs">
              <InputsFloatingPanel variant="toolbar" {...inputsPanelProps} />
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      <div className="editor-body">
        <div
          ref={editorRef}
          className="editor-canvas visual-editor"
          contentEditable
          suppressContentEditableWarning
          onClick={handleEditorClick}
          onFocus={handleEditorFocus}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onCopy={handleCopy}
          onPaste={handlePaste}
          data-placeholder={placeholder ?? t('markdown.placeholder')}
        />
      </div>

      <BlockingModal open={flowchartSoonOpen} onClose={() => setFlowchartSoonOpen(false)} title={t('markdown.flowchart')}>
        <p className="text-sm text-text-muted">{t('home.teamModalBody')}</p>
        <button type="button" onClick={() => openExternal('https://ko-fi.com/PixelR')} className="xko-btn xko-btn--pink mt-4 w-full">
          ☕ {t('home.teamModalKofi')}
        </button>
      </BlockingModal>
    </div>
  );

}


