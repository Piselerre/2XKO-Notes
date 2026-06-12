import { useState } from 'react';

import type { SectionTab } from '@2xko/core';

import { useI18n } from '@/hooks/useI18n';

import { BlockingModal } from './BlockingModal';

interface EditableTabBarProps {
  tabs: SectionTab[];
  active: string;
  onChange: (id: string) => void;
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
}

export function EditableTabBar({
  tabs,
  active,
  onChange,
  onAdd,
  onRemove,
  onRename,
}: EditableTabBarProps) {
  const { t, locale } = useI18n();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [pendingRemove, setPendingRemove] = useState<SectionTab | null>(null);

  function handleAdd() {
    if (newLabel.trim()) {
      onAdd(newLabel.trim());
      setNewLabel('');
      setAdding(false);
    }
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
      <div className="combat-tabs">
        {tabs.map((tab) => (
          <div key={tab.id} className="combat-tab-wrap flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => onChange(tab.id)}
              onDoubleClick={() => {
                const label = prompt(t('editor.rename'), tab.label);
                if (label?.trim()) onRename(tab.id, label.trim());
              }}
              className={`combat-tab${active === tab.id ? ' is-active' : ''}`}
            >
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
        {t('editor.renameHint')}
      </p>

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
