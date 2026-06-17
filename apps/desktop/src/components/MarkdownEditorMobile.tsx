import { useMarkdownEditorCore, preventToolbarFocus } from './visualEditor/useMarkdownEditorCore';
import { InputsFloatingPanel } from './InputsFloatingPanel';
import { InputCharacterRow } from './InputCharacterRow';
import { MobileEditorToolbar } from './MobileEditorToolbar';

interface MarkdownEditorMobileProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Phone-native editor: text tools + characters + inputs + canvas. */
export function MarkdownEditorMobile({ value, onChange, placeholder }: MarkdownEditorMobileProps) {
  const {
    t,
    editorRef,
    history,
    activeTag,
    fmtBold,
    fmtItalic,
    fmtCode,
    handleInput,
    handleEditorClick,
    handleEditorFocus,
    handleKeyDown,
    handleCopy,
    handlePaste,
    inputsPanelProps,
    insertCharacterIcon,
    setBlockType,
    applyInlineFormat,
    applyStrikethrough,
    insertBlockquote,
    insertHorizontalRule,
    insertLink,
    handleUndo,
    handleRedo,
  } = useMarkdownEditorCore({ value, onChange, placeholder });

  return (
    <div className="mobile-md-editor">
      <div className="mobile-md-editor__tools" onMouseDown={preventToolbarFocus}>
        <MobileEditorToolbar
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          activeTag={activeTag}
          fmtBold={fmtBold}
          fmtItalic={fmtItalic}
          fmtCode={fmtCode}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onBold={() => applyInlineFormat('strong')}
          onItalic={() => applyInlineFormat('em')}
          onCode={() => applyInlineFormat('code')}
          onStrike={applyStrikethrough}
          onBlockType={setBlockType}
          onQuote={insertBlockquote}
          onHr={insertHorizontalRule}
          onLink={insertLink}
        />
        <InputCharacterRow variant="mobile" onInsert={insertCharacterIcon} />
        <div className="mobile-md-editor__inputs">
          <InputsFloatingPanel variant="mobile" {...inputsPanelProps} />
        </div>
      </div>
      <div
        ref={editorRef}
        className="mobile-md-editor__canvas visual-editor"
        contentEditable
        suppressContentEditableWarning
        onClick={handleEditorClick}
        onFocus={handleEditorFocus}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCopy={handleCopy}
        onPaste={handlePaste}
        data-placeholder={placeholder ?? t('markdown.placeholder')}
        spellCheck
      />
    </div>
  );
}
