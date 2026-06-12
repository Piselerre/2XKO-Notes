import { useAppStore } from '@2xko/core';

import { useI18n } from '@/hooks/useI18n';

export function NotesViewToolbar() {
  const { t } = useI18n();
  const viewMode = useAppStore((s) => s.notesViewMode);
  const setNotesViewMode = useAppStore((s) => s.setNotesViewMode);
  const isPreview = viewMode === 'preview';

  return (
    <div className="note-panel__toolbar">
      <button
        type="button"
        className={`xko-btn note-panel__mode-btn ${isPreview ? 'note-panel__mode-btn--edit' : 'note-panel__mode-btn--view'}`}
        onClick={() => setNotesViewMode(isPreview ? 'edit' : 'preview')}
      >
        {isPreview ? t('editor.editNotes') : t('editor.viewShort')}
      </button>
    </div>
  );
}
