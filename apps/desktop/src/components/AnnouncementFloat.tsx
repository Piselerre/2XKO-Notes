import { useAppStore } from '@2xko/core';

import { useI18n } from '@/hooks/useI18n';
import { openExternal } from '@/utils/openExternal';

export function AnnouncementFloat() {
  const { t } = useI18n();
  const announcements = useAppStore((s) => s.announcements);
  const dismissed = useAppStore((s) => s.dismissedAnnouncements);
  const dismiss = useAppStore((s) => s.dismissAnnouncement);

  const visible = announcements
    .filter((a) => !dismissed.includes(a.id))
    .sort((a, b) => a.priority - b.priority)[0];

  if (!visible) return null;

  return (
    <aside
      className={`announcement-float announcement-float--${visible.type}`}
      role="status"
      aria-live="polite"
    >
      <div className="announcement-float__head">
        <p className="announcement-float__title">{visible.title}</p>
        {visible.dismissible && (
          <button
            type="button"
            className="announcement-float__close"
            onClick={() => dismiss(visible.id)}
            aria-label={t('common.cancel')}
          >
            ✕
          </button>
        )}
      </div>
      <p className="announcement-float__body">{visible.body}</p>
      {visible.link && (
        <button
          type="button"
          className="announcement-float__link"
          onClick={() => openExternal(visible.link!)}
        >
          {t('startup.learnMore')}
        </button>
      )}
    </aside>
  );
}
