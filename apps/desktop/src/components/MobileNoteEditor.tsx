import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppStore } from '@2xko/core';
import type { NoteSection, SectionTab } from '@2xko/core';

import { useI18n } from '@/hooks/useI18n';
import { withMobilePreview } from '@/utils/mobilePreview';

import { BlockingModal } from './BlockingModal';
import { ChecklistEditor } from './ChecklistEditor';
import { MarkdownEditorMobile } from './MarkdownEditorMobile';
import { NotesFullPreview } from './NotesFullPreview';
import type { InstanceItem } from './InstanceBar';

function isMainLabel(label: string): boolean {
  return label.trim().toLowerCase() === 'main';
}

function isChecklistTab(tab: SectionTab): boolean {
  return tab.id === 'checklist' || tab.label.toLowerCase() === 'checklist';
}

export interface MobileNoteShellProps {
  backTo: string;
  backLabel: string;
  subtitle?: string;
  tabs: SectionTab[];
  sections: Record<string, NoteSection>;
  activeTab: string;
  onTabChange: (id: string) => void;
  onAddTab: (label: string) => void;
  onRemoveTab: (id: string) => void;
  onRenameTab?: (id: string, label: string) => void;
  onUpdateSection: (sectionId: string, data: Partial<{ markdown: string; checklist: NoteSection['checklist'] }>) => void;
  instances: InstanceItem[];
  activeInstanceId: string;
  onInstanceSelect: (id: string) => void;
  onInstanceAdd: (label: string) => void;
  onInstanceRemove: (id: string) => void;
}

export function MobileNoteEditor({
  backTo,
  backLabel,
  subtitle,
  tabs,
  sections,
  activeTab,
  onTabChange,
  onAddTab,
  onRemoveTab,
  onUpdateSection,
  instances,
  activeInstanceId,
  onInstanceSelect,
  onInstanceAdd,
  onInstanceRemove,
}: MobileNoteShellProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const viewMode = useAppStore((s) => s.notesViewMode);
  const setNotesViewMode = useAppStore((s) => s.setNotesViewMode);
  const isPreview = viewMode === 'preview';

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [instanceOpen, setInstanceOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newInstance, setNewInstance] = useState('');
  const [pendingRemoveCategory, setPendingRemoveCategory] = useState<SectionTab | null>(null);
  const [pendingRemoveInstance, setPendingRemoveInstance] = useState<InstanceItem | null>(null);

  const activeCategory = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const activeInstance = instances.find((i) => i.id === activeInstanceId) ?? instances[0];
  const section = sections[activeTab] ?? { id: activeTab, markdown: '', checklist: [], updatedAt: '' };
  const checklist = isChecklistTab(activeCategory ?? { id: activeTab, label: '' });

  const instanceLabel = useMemo(() => {
    if (!activeInstance) return t('instances.label');
    return isMainLabel(activeInstance.label) ? t('instances.mainLabel') : activeInstance.label;
  }, [activeInstance, t]);

  function submitNewCategory() {
    const label = newCategory.trim();
    if (!label) return;
    onAddTab(label);
    setNewCategory('');
    setCategoryOpen(false);
  }

  function submitNewInstance() {
    const label = newInstance.trim();
    if (!label) return;
    onInstanceAdd(label);
    setNewInstance('');
    setInstanceOpen(false);
  }

  function goBack() {
    const idx = (window.history.state?.idx ?? 0) as number;
    if (idx > 0) {
      navigate(-1);
      return;
    }
    navigate(withMobilePreview(backTo));
  }

  return (
    <div className="mobile-note">
      <header className="mobile-note__top">
        <button type="button" onClick={goBack} className="mobile-note__top-btn" aria-label={backLabel}>
          ◂
        </button>
        <button type="button" className="mobile-note__top-btn mobile-note__top-btn--instance" onClick={() => setInstanceOpen(true)}>
          <span className="mobile-note__top-btn-label">{t('mobileEditor.instance')}</span>
          <span className="mobile-note__top-btn-value">{instanceLabel}</span>
        </button>
        <button
          type="button"
          className={`mobile-note__top-btn${isPreview ? ' is-on' : ''}`}
          onClick={() => setNotesViewMode(isPreview ? 'edit' : 'preview')}
        >
          {isPreview ? t('editor.editNotes') : t('editor.viewShort')}
        </button>
        <button type="button" className="mobile-note__top-btn mobile-note__top-btn--menu" onClick={() => setOptionsOpen((v) => !v)} aria-label={t('mobileEditor.options')}>
          ⋮
        </button>
      </header>

      {optionsOpen && (
        <>
          <button type="button" className="mobile-note__backdrop" onClick={() => setOptionsOpen(false)} aria-label={t('common.cancel')} />
          <div className="mobile-note__options-menu">
            {instances.length > 1 && (
              <button
                type="button"
                className="mobile-note__options-item mobile-note__options-item--danger"
                onClick={() => {
                  setOptionsOpen(false);
                  if (activeInstance) setPendingRemoveInstance(activeInstance);
                }}
              >
                {t('mobileEditor.deleteInstance')}
              </button>
            )}
            {tabs.length > 1 && activeCategory && (
              <button
                type="button"
                className="mobile-note__options-item mobile-note__options-item--danger"
                onClick={() => {
                  setOptionsOpen(false);
                  setPendingRemoveCategory(activeCategory);
                }}
              >
                {t('mobileEditor.deleteCategory')}
              </button>
            )}
          </div>
        </>
      )}

      <div className="mobile-note__category-row">
        <button type="button" className="mobile-note__category-btn" onClick={() => setCategoryOpen(true)}>
          <span className="mobile-note__category-label">{t('mobileEditor.category')}</span>
          <span className="mobile-note__category-value">{activeCategory?.label ?? '—'}</span>
          <span className="mobile-note__category-chevron" aria-hidden>▾</span>
        </button>
        {subtitle && <p className="mobile-note__subtitle">{subtitle}</p>}
      </div>

      <div className="mobile-note__body">
        {isPreview ? (
          <NotesFullPreview tabs={tabs} sections={sections} />
        ) : checklist ? (
          <ChecklistEditor
            items={section.checklist}
            onChange={(checklistItems) => onUpdateSection(activeTab, { checklist: checklistItems })}
          />
        ) : (
          <MarkdownEditorMobile
            key={activeTab}
            value={section.markdown}
            onChange={(markdown) => onUpdateSection(activeTab, { markdown })}
          />
        )}
      </div>

      <BlockingModal open={categoryOpen} onClose={() => setCategoryOpen(false)} title={t('mobileEditor.pickCategory')} modalClassName="xko-modal--mobile-sheet">
        <div className="mobile-note__picker-list">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`mobile-note__picker-item${tab.id === activeTab ? ' is-active' : ''}`}
              onClick={() => {
                onTabChange(tab.id);
                setCategoryOpen(false);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mobile-note__picker-create">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder={t('mobileEditor.newCategoryPlaceholder')}
            className="xko-input w-full"
            onKeyDown={(e) => e.key === 'Enter' && submitNewCategory()}
          />
          <button type="button" className="xko-btn xko-btn--lime w-full mt-3" onClick={submitNewCategory}>
            {t('mobileEditor.createCategory')}
          </button>
        </div>
      </BlockingModal>

      <BlockingModal open={instanceOpen} onClose={() => setInstanceOpen(false)} title={t('mobileEditor.pickInstance')} modalClassName="xko-modal--mobile-sheet">
        <div className="mobile-note__picker-list">
          {instances.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`mobile-note__picker-item${item.id === activeInstanceId ? ' is-active' : ''}`}
              onClick={() => {
                onInstanceSelect(item.id);
                setInstanceOpen(false);
              }}
            >
              {isMainLabel(item.label) ? t('instances.mainLabel') : item.label}
            </button>
          ))}
        </div>
        <div className="mobile-note__picker-create">
          <input
            value={newInstance}
            onChange={(e) => setNewInstance(e.target.value)}
            placeholder={t('instances.namePlaceholder')}
            className="xko-input w-full"
            onKeyDown={(e) => e.key === 'Enter' && submitNewInstance()}
          />
          <button type="button" className="xko-btn xko-btn--lime w-full mt-3" onClick={submitNewInstance}>
            {t('instances.add')}
          </button>
        </div>
      </BlockingModal>

      <BlockingModal
        open={!!pendingRemoveCategory}
        onClose={() => setPendingRemoveCategory(null)}
        title={t('mobileEditor.deleteCategory')}
        modalClassName="xko-modal--mobile-sheet xko-modal--mobile-danger"
      >
        <p className="mobile-confirm__text">
          {t('mobileEditor.deleteCategoryBody')}{' '}
          <strong className="mobile-confirm__highlight">{pendingRemoveCategory?.label}</strong>?
        </p>
        <div className="mobile-confirm__actions">
          <button
            type="button"
            className="xko-btn xko-btn--pink mobile-confirm__btn"
            onClick={() => {
              if (pendingRemoveCategory) {
                onRemoveTab(pendingRemoveCategory.id);
                const next = tabs.find((tab) => tab.id !== pendingRemoveCategory.id);
                if (next) onTabChange(next.id);
              }
              setPendingRemoveCategory(null);
            }}
          >
            {t('common.delete')}
          </button>
          <button type="button" className="xko-btn xko-btn--ghost mobile-confirm__btn" onClick={() => setPendingRemoveCategory(null)}>
            {t('common.cancel')}
          </button>
        </div>
      </BlockingModal>

      <BlockingModal
        open={!!pendingRemoveInstance}
        onClose={() => setPendingRemoveInstance(null)}
        title={t('mobileEditor.deleteInstance')}
        modalClassName="xko-modal--mobile-sheet xko-modal--mobile-danger"
      >
        <p className="mobile-confirm__text">
          {t('instances.removeBody')}{' '}
          <strong className="mobile-confirm__highlight">
            {pendingRemoveInstance ? (isMainLabel(pendingRemoveInstance.label) ? t('instances.mainLabel') : pendingRemoveInstance.label) : ''}
          </strong>
          ?
        </p>
        <div className="mobile-confirm__actions">
          <button
            type="button"
            className="xko-btn xko-btn--pink mobile-confirm__btn"
            onClick={() => {
              if (pendingRemoveInstance) onInstanceRemove(pendingRemoveInstance.id);
              setPendingRemoveInstance(null);
            }}
          >
            {t('common.delete')}
          </button>
          <button type="button" className="xko-btn xko-btn--ghost mobile-confirm__btn" onClick={() => setPendingRemoveInstance(null)}>
            {t('common.cancel')}
          </button>
        </div>
      </BlockingModal>
    </div>
  );
}
