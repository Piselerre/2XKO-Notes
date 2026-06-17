import { useState } from 'react';

import type { SectionTab } from '@2xko/core';

import { useI18n } from '@/hooks/useI18n';
import { useIsMobile } from '@/hooks/useIsMobile';

import { BlockingModal } from './BlockingModal';

interface EditableTabBarProps {
  tabs: SectionTab[];
  active: string;
  onChange: (id: string) => void;
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export function EditableTabBar({
  tabs,
  active,
  onChange,
  onAdd,
  onRemove,
  onRename,
  onReorder,
}: EditableTabBarProps) {
  const { t, locale } = useI18n();
  const mobile = useIsMobile();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [renaming, setRenaming] = useState<SectionTab | null>(null);
  const [renameLabel, setRenameLabel] = useState('');
  const [pendingRemove, setPendingRemove] = useState<SectionTab | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  function handleAdd() {
    if (newLabel.trim()) {
      onAdd(newLabel.trim());
      setNewLabel('');
      setAdding(false);
    }
  }

  function handleRename() {
    if (!renaming || !renameLabel.trim()) return;
    onRename(renaming.id, renameLabel.trim());
    setRenaming(null);
    setRenameLabel('');
  }

  function confirmRemove() {
    if (!pendingRemove) return;
    onRemove(pendingRemove.id);
    if (active === pendingRemove.id) {
      const remaining = tabs.filter((tab) => tab.id !== pendingRemove.id);
      if (remaining[0]) onChange(remaining[0].id);
    }
    setPendingRemove(null);
  }

  return (
    <div className="space-y-3">
      <div className={`combat-tabs-wrap combat-tabs-wrap--scroll${mobile ? ' combat-tabs-wrap--scroll-hint' : ''}`}>
        <div className="combat-tabs">
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            className={`combat-tab-wrap flex shrink-0 items-center${dropIndex === index ? ' combat-tab-wrap--drop' : ''}`}
            draggable={!!onReorder && tabs.length > 1}
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => {
              setDragIndex(null);
              setDropIndex(null);
            }}
            onDragOver={(e) => {
              if (!onReorder || dragIndex === null) return;
              e.preventDefault();
              setDropIndex(index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (!onReorder || dragIndex === null || dragIndex === index) return;
              onReorder(dragIndex, index);
              setDragIndex(null);
              setDropIndex(null);
            }}
          >
            <button
              type="button"
              onClick={() => onChange(tab.id)}
              onDoubleClick={() => {
                setRenaming(tab);
                setRenameLabel(tab.label);
              }}
              className={`combat-tab${active === tab.id ? ' is-active' : ''}`}
            >
              {onReorder && tabs.length > 1 && (
                <span className="combat-tab__drag" aria-hidden>
                  ⋮⋮
                </span>
              )}
              {tab.label}
            </button>
            {tabs.length > 1 && (
              <button
                type="button"
                onClick={() => setPendingRemove(tab)}
                className="combat-tab__close"
                title={t('editor.remove')}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setAdding(true)} className="combat-tab" title={t('editor.addSection')}>
          +
        </button>
        </div>
      </div>

      {adding && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={t('editor.sectionName')}
            className="xko-input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <button type="button" onClick={handleAdd} className="xko-btn xko-btn--lime">
            {t('editor.add')}
          </button>
          <button type="button" onClick={() => setAdding(false)} className="xko-btn xko-btn--ghost">
            {t('common.cancel')}
          </button>
        </div>
      )}

      <p className="font-display text-[10px] tracking-widest text-text-muted uppercase">
        {onReorder && tabs.length > 1
          ? t('editor.reorderHint')
          : mobile
            ? t('editor.scrollTabsHint')
            : t('editor.renameHint')}
      </p>

      <BlockingModal open={!!renaming} onClose={() => setRenaming(null)} title={t('editor.rename')}>
        <input
          value={renameLabel}
          onChange={(e) => setRenameLabel(e.target.value)}
          className="xko-input w-full"
          placeholder={t('editor.sectionName')}
          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          autoFocus
        />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => setRenaming(null)} className="xko-btn xko-btn--ghost flex-1">
            {t('common.cancel')}
          </button>
          <button type="button" onClick={handleRename} className="xko-btn xko-btn--lime flex-1">
            {t('common.save')}
          </button>
        </div>
      </BlockingModal>

      <BlockingModal open={!!pendingRemove} onClose={() => setPendingRemove(null)} title={t('editor.deleteSection')}>
        <p className="text-sm text-text-muted">
          {locale === 'es' ? (
            <>
              {t('editor.deleteSectionBody')}{' '}
              <strong className="text-accent">{pendingRemove?.label}</strong>{' '}
              {t('editor.deleteSectionSuffix')}
            </>
          ) : (
            <>
              <strong className="text-accent">{pendingRemove?.label}</strong>{' '}
              {t('editor.deleteSectionBody')}
            </>
          )}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => setPendingRemove(null)} className="xko-btn xko-btn--lime flex-1">
            {t('common.cancel')}
          </button>
          <button type="button" onClick={confirmRemove} className="xko-btn xko-btn--pink flex-1">
            {t('common.delete')}
          </button>
        </div>
      </BlockingModal>
    </div>
  );
}
