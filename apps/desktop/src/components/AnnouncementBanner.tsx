import { useAppStore } from '@2xko/core';

export function AnnouncementBanner() {
  const announcements = useAppStore((s) => s.announcements);
  const dismissed = useAppStore((s) => s.dismissedAnnouncements);
  const dismiss = useAppStore((s) => s.dismissAnnouncement);

  const visible = announcements
    .filter((a) => !dismissed.includes(a.id))
    .sort((a, b) => a.priority - b.priority)[0];

  if (!visible) return null;

  const typeColors = {
    info: 'border-accent/40 bg-accent/10',
    warning: 'border-yellow-500/40 bg-yellow-500/10',
    success: 'border-green-500/40 bg-green-500/10',
  };

  return (
    <div
      className={`mt-6 flex items-start justify-between gap-4 rounded-xl border p-4 ${typeColors[visible.type]}`}
    >
      <div>
        <p className="font-semibold text-text-primary">{visible.title}</p>
        <p className="mt-1 text-sm text-text-muted">{visible.body}</p>
        {visible.link && (
          <a
            href={visible.link}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm text-accent hover:underline"
          >
            Más info →
          </a>
        )}
      </div>
      {visible.dismissible && (
        <button
          onClick={() => dismiss(visible.id)}
          className="shrink-0 rounded p-1 text-text-muted hover:bg-bg-elevated hover:text-text-primary"
          aria-label="Cerrar anuncio"
        >
          ✕
        </button>
      )}
    </div>
  );
}
