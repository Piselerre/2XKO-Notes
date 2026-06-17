import type { ReactNode } from 'react';

import { useAppStore } from '@2xko/core';
import type { NoteSection, SectionTab } from '@2xko/core';

import { useIsMobile } from '@/hooks/useIsMobile';

import { EditableTabBar } from './EditableTabBar';
import { MarkdownEditor } from './MarkdownEditor';
import { ChecklistEditor } from './ChecklistEditor';
import { NotesFullPreview } from './NotesFullPreview';
import { NotesViewToolbar } from './NotesViewToolbar';
import { MobileNoteEditor } from './MobileNoteEditor';
import type { InstanceItem } from './InstanceBar';

interface NoteDetailPanelProps {
  tabs: SectionTab[];
  sections: Record<string, NoteSection>;
  activeTab: string;
  onTabChange: (id: string) => void;
  onAddTab: (label: string) => void;
  onRemoveTab: (id: string) => void;
  onRenameTab: (id: string, label: string) => void;
  onReorderTabs?: (fromIndex: number, toIndex: number) => void;
  onUpdateSection: (sectionId: string, data: Partial<{ markdown: string; checklist: NoteSection['checklist'] }>) => void;
  instanceBar?: ReactNode;
  instanceProps?: {
    instances: InstanceItem[];
    activeId: string;
    onSelect: (id: string) => void;
    onAdd: (label: string) => void;
    onRemove: (id: string) => void;
  };
  mobileShell?: {
    backTo: string;
    backLabel: string;
    subtitle?: string;
  };
  showLayoutToggle?: boolean;
}

function isChecklistTab(tab: SectionTab): boolean {
  return tab.id === 'checklist' || tab.label.toLowerCase() === 'checklist';
}

export function NoteDetailPanel({
  tabs,
  sections,
  activeTab,
  onTabChange,
  onAddTab,
  onRemoveTab,
  onRenameTab,
  onReorderTabs,
  onUpdateSection,
  instanceBar,
  instanceProps,
  mobileShell,
  showLayoutToggle = false,
}: NoteDetailPanelProps) {
  const mobile = useIsMobile();
  const viewMode = useAppStore((s) => s.notesViewMode);
  const layoutMode = useAppStore((s) => s.notesLayoutMode);
  const isPreview = viewMode === 'preview';
  const stacked = !isPreview && layoutMode === 'stacked';

  if (mobile && mobileShell && instanceProps) {
    return (
      <MobileNoteEditor
        backTo={mobileShell.backTo}
        backLabel={mobileShell.backLabel}
        subtitle={mobileShell.subtitle}
        tabs={tabs}
        sections={sections}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onAddTab={onAddTab}
        onRemoveTab={onRemoveTab}
        onUpdateSection={onUpdateSection}
        instances={instanceProps.instances}
        activeInstanceId={instanceProps.activeId}
        onInstanceSelect={instanceProps.onSelect}
        onInstanceAdd={instanceProps.onAdd}
        onInstanceRemove={instanceProps.onRemove}
      />
    );
  }

  const section = sections[activeTab] ?? { id: activeTab, markdown: '', checklist: [], updatedAt: '' };
  const isChecklist = isChecklistTab(tabs.find((tab) => tab.id === activeTab) ?? { id: activeTab, label: '' });

  return (
    <div className="note-panel">
      <NotesViewToolbar instanceBar={instanceBar} showLayoutToggle={showLayoutToggle} />

      {isPreview ? (
        <NotesFullPreview tabs={tabs} sections={sections} />
      ) : stacked ? (
        <>
          <EditableTabBar
            tabs={tabs}
            active={activeTab}
            onChange={onTabChange}
            onAdd={onAddTab}
            onRemove={onRemoveTab}
            onRename={onRenameTab}
            onReorder={onReorderTabs}
          />
          <div className="note-panel__stacked space-y-5 mt-4">
            {tabs.map((tab) => {
              const sec = sections[tab.id] ?? { id: tab.id, markdown: '', checklist: [], updatedAt: '' };
              const checklist = isChecklistTab(tab);
              return (
                <section key={tab.id} className="note-panel__stacked-section">
                  <h3 className="note-panel__stacked-title">{tab.label}</h3>
                  {checklist ? (
                    <ChecklistEditor
                      items={sec.checklist}
                      onChange={(checklistItems) => onUpdateSection(tab.id, { checklist: checklistItems })}
                    />
                  ) : (
                    <MarkdownEditor
                      key={tab.id}
                      value={sec.markdown}
                      onChange={(markdown) => onUpdateSection(tab.id, { markdown })}
                    />
                  )}
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <EditableTabBar
            tabs={tabs}
            active={activeTab}
            onChange={onTabChange}
            onAdd={onAddTab}
            onRemove={onRemoveTab}
            onRename={onRenameTab}
            onReorder={onReorderTabs}
          />
          <div className="mt-6">
            {isChecklist ? (
              <ChecklistEditor
                items={section.checklist}
                onChange={(checklist) => onUpdateSection(activeTab, { checklist })}
              />
            ) : (
              <MarkdownEditor
                key={activeTab}
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
