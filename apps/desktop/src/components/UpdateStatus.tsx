import { useI18n } from '@/hooks/useI18n';
import { useUpdateManager } from '@/hooks/useUpdateManager';

export function UpdateStatus() {
  const { t } = useI18n();
  const { phase, progress, version, startInstall, dismissReady } = useUpdateManager();

  if (phase === 'idle' || phase === 'checking') return null;

  if (phase === 'content-applied') {
    return (
      <div className="update-pill update-pill--content" role="status">
        {t('updates.contentApplied')}
      </div>
    );
  }

  if (phase === 'downloading') {
    return (
      <div className="update-pill update-pill--busy update-pill--with-bar" role="status">
        <span className="update-pill__dot" aria-hidden />
        <span className="update-pill__text">
          {t('updates.downloading').replace('{percent}', String(progress))}
        </span>
        <span className="update-pill__bar" aria-hidden>
          <span className="update-pill__bar-fill" style={{ width: `${Math.max(progress, 4)}%` }} />
        </span>
      </div>
    );
  }

  if (phase === 'ready') {
    return (
      <div className="update-pill update-pill--ready" role="status">
        <span>{t('updates.ready').replace('{version}', version)}</span>
        <button type="button" className="update-pill__action" onClick={() => void startInstall()}>
          {t('updates.restart')}
        </button>
        <button type="button" className="update-pill__dismiss" onClick={dismissReady} aria-label={t('common.cancel')}>
          ✕
        </button>
      </div>
    );
  }

  if (phase === 'installing') {
    return (
      <div className="update-pill update-pill--busy" role="status">
        <span className="update-pill__dot" aria-hidden />
        {t('updates.installing')}
      </div>
    );
  }

  return null;
}
