import { useAppStore } from '@2xko/core';
import type { NoteSection, SectionTab } from '@2xko/core';

import { EditableTabBar } from './EditableTabBar';
import { MarkdownEditor } from './MarkdownEditor';
import { ChecklistEditor } from './ChecklistEditor';
import { NotesFullPreview } from './NotesFullPreview';
import { NotesViewToolbar } from './NotesViewToolbar';

interface NoteDetailPanelProps {
  tabs: SectionTab[];
  sections: Record<string, NoteSection>;
  activeTab: string;
  onTabChange: (id: string) => void;
  onAddTab: (label: string) => void;
  onRemoveTab: (id: string) => void;
  onRenameTab: (id: string, label: string) => void;
  onUpdateSection: (sectionId: string, data: Partial<{ markdown: string; checklist: NoteSection['checklist'] }>) => void;
}

export function NoteDetailPanel({
  tabs,
  sections,
  activeTab,
  onTabChange,
  onAddTab,
  onRemoveTab,
  onRenameTab,
  onUpdateSection,
}: NoteDetailPanelProps) {
  const viewMode = useAppStore((s) => s.notesViewMode);
  const isPreview = viewMode === 'preview';

  const section = sections[activeTab] ?? { id: activeTab, markdown: '', checklist: [], updatedAt: '' };
  const isChecklist =
    activeTab === 'checklist' || tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase() === 'checklist';

  return (
    <div className="note-panel">
      <NotesViewToolbar />

      {isPreview ? (
        <NotesFullPreview tabs={tabs} sections={sections} />
      ) : (
        <>
          <EditableTabBar
            tabs={tabs}
            active={activeTab}
            onChange={onTabChange}
            onAdd={onAddTab}
            onRemove={onRemoveTab}
            onRename={onRenameTab}
          />
          <div className="mt-6">
            {isChecklist ? (
              <ChecklistEditor
                items={section.checklist}
                onChange={(checklist) => onUpdateSection(activeTab, { checklist })}
              />
            ) : (
              <MarkdownEditor
                value={section.markdown}
                onChange={(markdown) => onUpdateSection(activeTab, { markdown })}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
