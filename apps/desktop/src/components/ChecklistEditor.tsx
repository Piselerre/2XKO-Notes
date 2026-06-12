import { generateId } from '@2xko/core';
import type { ChecklistItem } from '@2xko/core';
import { useI18n } from '@/hooks/useI18n';

interface ChecklistEditorProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

export function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  const { t } = useI18n();

  const toggle = (id: string) => {
    onChange(items.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
  };

  const updateText = (id: string, text: string) => {
    onChange(items.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const addItem = () => {
    onChange([...items, { id: generateId(), text: '', checked: false }]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="xko-panel flex flex-col gap-2">
      <p className="font-display text-[10px] tracking-widest text-accent-secondary uppercase">
        {t('editor.checklist')}
      </p>
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <input type="checkbox" checked={item.checked} onChange={() => toggle(item.id)} className="h-4 w-4 accent-[#c8f135]" />
          <input
            type="text"
            value={item.text}
            onChange={(e) => updateText(item.id, e.target.value)}
            placeholder={t('editor.itemPlaceholder')}
            className="xko-input flex-1"
          />
          <button type="button" onClick={() => removeItem(item.id)} className="text-xs text-text-muted hover:text-accent-secondary">
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={addItem} className="xko-btn xko-btn--ghost mt-1 self-start text-xs">
        + {t('editor.addItem')}
      </button>
    </div>
  );
}
