import { BlockingModal } from '@/components/BlockingModal';
import { useI18n } from '@/hooks/useI18n';
import { useUpdateManager } from '@/hooks/useUpdateManager';

function ProgressBar({ percent, indeterminate }: { percent: number; indeterminate?: boolean }) {
  return (
    <div
      className={`update-modal__bar${indeterminate ? ' update-modal__bar--indeterminate' : ''}`}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span
        className="update-modal__bar-fill"
        style={indeterminate ? undefined : { width: `${Math.max(percent, 2)}%` }}
      />
    </div>
  );
}

export function BinaryUpdateNotice() {
  const { t } = useI18n();
  const { phase, progress, version, updateKind, startInstall, dismissReady } = useUpdateManager();

  const open =
    updateKind === 'binary' &&
    (phase === 'downloading' || phase === 'ready' || phase === 'installing');

  if (!open) return null;

  const title = t('updates.binaryTitle').replace('{version}', version);
  const indeterminate = phase === 'downloading' && progress < 5;

  return (
    <BlockingModal
      open={open}
      onClose={phase === 'ready' ? dismissReady : () => {}}
      title={title}
      hideClose={phase !== 'ready'}
      modalClassName="xko-modal--update"
    >
      {phase === 'downloading' && (
        <>
          <p className="update-modal__percent" aria-live="polite">
            {indeterminate ? '…' : `${progress}%`}
          </p>
          <ProgressBar percent={progress} indeterminate={indeterminate} />
          <p className="mt-3 text-sm text-text-muted">
            {t('updates.binaryDownloading').replace('{percent}', String(progress))}
          </p>
          <p className="mt-2 text-xs text-text-muted">{t('updates.binaryBackgroundHint')}</p>
        </>
      )}

      {phase === 'ready' && (
        <>
          <ProgressBar percent={100} />
          <p className="mt-4 text-sm text-text-muted">{t('updates.binaryReady')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="xko-btn xko-btn--lime" onClick={() => void startInstall()}>
              {t('updates.restart')}
            </button>
            <button type="button" className="xko-btn xko-btn--ghost" onClick={dismissReady}>
              {t('updates.binaryLater')}
            </button>
          </div>
        </>
      )}

      {phase === 'installing' && (
        <>
          <ProgressBar percent={100} indeterminate />
          <p className="mt-3 text-sm text-text-muted">{t('updates.installing')}</p>
        </>
      )}
    </BlockingModal>
  );
}
