import type { NoteSection, SectionTab } from '@2xko/core';

import { useI18n } from '@/hooks/useI18n';

import { MarkdownPreviewContent } from './MarkdownPreviewContent';

interface NotesFullPreviewProps {
  tabs: SectionTab[];
  sections: Record<string, NoteSection>;
}

function isChecklistTab(tab: SectionTab): boolean {
  return tab.id === 'checklist' || tab.label.toLowerCase() === 'checklist';
}

function sectionHasContent(tab: SectionTab, section: NoteSection): boolean {
  if (isChecklistTab(tab)) return section.checklist.some((item) => item.text.trim().length > 0);
  return section.markdown.trim().length > 0;
}

export function NotesFullPreview({ tabs, sections }: NotesFullPreviewProps) {
  const { t } = useI18n();
  const visibleTabs = tabs.filter((tab) => {
    const section = sections[tab.id] ?? { id: tab.id, markdown: '', checklist: [], updatedAt: '' };
    return sectionHasContent(tab, section);
  });

  if (visibleTabs.length === 0) {
    return <p className="notes-preview__empty-all">{t('editor.previewEmptyAll')}</p>;
  }

  return (
    <div className="notes-preview">
      {visibleTabs.map((tab) => {
        const section = sections[tab.id] ?? { id: tab.id, markdown: '', checklist: [], updatedAt: '' };
        const checklist = isChecklistTab(tab);

        return (
          <section key={tab.id} className="notes-preview__section">
            <h3 className="notes-preview__title">{tab.label}</h3>
            {checklist ? (
              <ul className="notes-preview__checklist">
                {section.checklist
                  .filter((item) => item.text.trim())
                  .map((item) => (
                    <li
                      key={item.id}
                      className={item.checked ? 'notes-preview__check-item is-checked' : 'notes-preview__check-item'}
                    >
                      <span className="notes-preview__check-mark" aria-hidden>
                        {item.checked ? '✓' : '○'}
                      </span>
                      <span>{item.text}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <MarkdownPreviewContent markdown={section.markdown} />
            )}
          </section>
        );
      })}
    </div>
  );
}
