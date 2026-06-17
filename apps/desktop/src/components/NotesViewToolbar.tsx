import type { ReactNode } from 'react';



import { useAppStore } from '@2xko/core';



import { useI18n } from '@/hooks/useI18n';



interface NotesViewToolbarProps {

  instanceBar?: ReactNode;

  showLayoutToggle?: boolean;

}



export function NotesViewToolbar({ instanceBar, showLayoutToggle = false }: NotesViewToolbarProps) {

  const { t } = useI18n();

  const viewMode = useAppStore((s) => s.notesViewMode);

  const layoutMode = useAppStore((s) => s.notesLayoutMode);

  const setNotesViewMode = useAppStore((s) => s.setNotesViewMode);

  const setNotesLayoutMode = useAppStore((s) => s.setNotesLayoutMode);

  const isPreview = viewMode === 'preview';



  return (

    <div className="note-panel__toolbar">

      <div className="note-panel__toolbar-left">{instanceBar}</div>

      <div className="note-panel__toolbar-right">

        {showLayoutToggle && !isPreview && (

          <div className="layout-toggle" role="group" aria-label={t('editor.layoutMode')}>

            <button

              type="button"

              className={`layout-toggle__btn layout-toggle__btn--tabs${layoutMode === 'tabs' ? ' is-active' : ''}`}

              onClick={() => setNotesLayoutMode('tabs')}

            >

              {t('editor.layoutTabs')}

            </button>

            <button

              type="button"

              className={`layout-toggle__btn layout-toggle__btn--stacked${layoutMode === 'stacked' ? ' is-active' : ''}`}

              onClick={() => setNotesLayoutMode('stacked')}

            >

              {t('editor.layoutStacked')}

            </button>

          </div>

        )}

        <button

          type="button"

          className={`xko-btn note-panel__mode-btn ${isPreview ? 'note-panel__mode-btn--edit' : 'note-panel__mode-btn--view'}`}

          onClick={() => setNotesViewMode(isPreview ? 'edit' : 'preview')}

        >

          {isPreview ? t('editor.editNotes') : t('editor.viewShort')}

        </button>

      </div>

    </div>

  );

}


