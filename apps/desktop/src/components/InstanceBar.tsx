import { useState } from 'react';

import { useI18n } from '@/hooks/useI18n';

import { BlockingModal } from './BlockingModal';

export interface InstanceItem {
  id: string;
  label: string;
}

interface InstanceBarProps {
  instances: InstanceItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: (label: string) => void;
  onRename: (id: string, label: string) => void;
  onRemove: (id: string) => void;
}

function isMainLabel(label: string): boolean {
  return label.trim().toLowerCase() === 'main';
}

export function InstanceBar({
  instances,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onRemove,
}: InstanceBarProps) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [renaming, setRenaming] = useState<InstanceItem | null>(null);
  const [renameLabel, setRenameLabel] = useState('');
  const [pendingRemove, setPendingRemove] = useState<InstanceItem | null>(null);

  function displayLabel(label: string): string {
    return isMainLabel(label) ? t('instances.mainLabel') : label;
  }

  function submitAdd() {
    if (!newLabel.trim()) return;
    onAdd(newLabel.trim());
    setNewLabel('');
    setAdding(false);
  }

  function submitRename() {
    if (!renaming || !renameLabel.trim()) return;
    onRename(renaming.id, renameLabel.trim());
    setRenaming(null);
    setRenameLabel('');
  }

  return (
    <>
      <div className="instance-bar-wrap">
        <div className="instance-bar" role="tablist" aria-label={t('instances.label')}>
          {instances.map((item) => {
            const main = isMainLabel(item.label);
            const active = item.id === activeId;
            return (
              <div key={item.id} className="instance-bar__item">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`instance-bar__tab${active ? ' is-active' : ''}${main ? ' instance-bar__tab--main' : ''}`}
                  onClick={() => onSelect(item.id)}
                  onDoubleClick={() => {
                    setRenaming(item);
                    setRenameLabel(item.label);
                  }}
                >
                  {displayLabel(item.label)}
                </button>
                {instances.length > 1 && (
                  <button
                    type="button"
                    className="instance-bar__close"
                    onClick={() => setPendingRemove(item)}
                    title={t('instances.remove')}
                    aria-label={t('instances.remove')}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          <button type="button" className="instance-bar__add" onClick={() => setAdding(true)} title={t('instances.add')}>
            +
          </button>
        </div>
      </div>

      {adding && (
        <div className="instance-bar__form flex flex-col gap-2 sm:flex-row">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={t('instances.namePlaceholder')}
            className="xko-input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
            autoFocus
          />
          <button type="button" onClick={submitAdd} className="xko-btn xko-btn--lime">
            {t('editor.add')}
          </button>
          <button type="button" onClick={() => setAdding(false)} className="xko-btn xko-btn--ghost">
            {t('common.cancel')}
          </button>
        </div>
      )}

      <BlockingModal open={!!renaming} onClose={() => setRenaming(null)} title={t('instances.rename')}>
        <input
          value={renameLabel}
          onChange={(e) => setRenameLabel(e.target.value)}
          className="xko-input w-full"
          onKeyDown={(e) => e.key === 'Enter' && submitRename()}
          autoFocus
        />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => setRenaming(null)} className="xko-btn xko-btn--ghost flex-1">
            {t('common.cancel')}
          </button>
          <button type="button" onClick={submitRename} className="xko-btn xko-btn--lime flex-1">
            {t('common.save')}
          </button>
        </div>
      </BlockingModal>

      <BlockingModal open={!!pendingRemove} onClose={() => setPendingRemove(null)} title={t('instances.remove')}>
        <p className="text-sm text-text-muted">
          {t('instances.removeBody')} <strong className="text-accent">{pendingRemove ? displayLabel(pendingRemove.label) : ''}</strong>?
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => setPendingRemove(null)} className="xko-btn xko-btn--lime flex-1">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (pendingRemove) onRemove(pendingRemove.id);
              setPendingRemove(null);
            }}
            className="xko-btn xko-btn--pink flex-1"
          >
            {t('common.delete')}
          </button>
        </div>
      </BlockingModal>
    </>
  );
}
