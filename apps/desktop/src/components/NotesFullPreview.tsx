import ReactMarkdown from 'react-markdown';

import type { NoteSection, SectionTab } from '@2xko/core';

import { useI18n } from '@/hooks/useI18n';

interface NotesFullPreviewProps {
  tabs: SectionTab[];
  sections: Record<string, NoteSection>;
}

function isChecklistTab(tab: SectionTab): boolean {
  return tab.id === 'checklist' || tab.label.toLowerCase() === 'checklist';
}

export function NotesFullPreview({ tabs, sections }: NotesFullPreviewProps) {
  const { t } = useI18n();

  return (
    <div className="notes-preview">
      {tabs.map((tab) => {
        const section = sections[tab.id] ?? { id: tab.id, markdown: '', checklist: [], updatedAt: '' };
        const checklist = isChecklistTab(tab);

        return (
          <section key={tab.id} className="notes-preview__section">
            <h3 className="notes-preview__title">{tab.label}</h3>
            {checklist ? (
              section.checklist.length > 0 ? (
                <ul className="notes-preview__checklist">
                  {section.checklist.map((item) => (
                    <li
                      key={item.id}
                      className={item.checked ? 'notes-preview__check-item is-checked' : 'notes-preview__check-item'}
                    >
                      <span className="notes-preview__check-mark" aria-hidden>
                        {item.checked ? '✓' : '○'}
                      </span>
                      <span>{item.text || '—'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="notes-preview__empty">{t('editor.previewEmpty')}</p>
              )
            ) : section.markdown.trim() ? (
              <div className="notes-preview__body">
                <ReactMarkdown
                  components={{
                    img: ({ src, alt }) => (
                      <img src={src ?? ''} alt={alt ?? ''} className="notes-preview__glyph" loading="lazy" />
                    ),
                  }}
                >
                  {section.markdown}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="notes-preview__empty">{t('editor.previewEmpty')}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
