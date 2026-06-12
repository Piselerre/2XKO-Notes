import { useEffect, useState } from 'react';

import { APP_VERSION } from '@/constants/version';
import { useI18n } from '@/hooks/useI18n';
import { checkForUpdates } from '@/services/remote';
import { openExternal } from '@/utils/openExternal';
import {
  areUpdatesIgnored,
  dismissUpdateVersion,
  shouldPromptForUpdate,
} from '@/utils/updatePreferences';

import { BlockingModal } from './BlockingModal';

const CANCEL_DELAY_SEC = 4;

interface UpdatePromptModalProps {
  ready: boolean;
}

export function UpdatePromptModal({ ready }: UpdatePromptModalProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState('');
  const [releaseUrl, setReleaseUrl] = useState('');
  const [cancelIn, setCancelIn] = useState(CANCEL_DELAY_SEC);

  useEffect(() => {
    if (!ready || areUpdatesIgnored()) return;

    async function check() {
      const result = await checkForUpdates(APP_VERSION);
      if (result.status !== 'available') return;
      if (!shouldPromptForUpdate(result.version)) return;
      setRemoteVersion(result.version);
      setReleaseUrl(result.url);
      setOpen(true);
      setCancelIn(CANCEL_DELAY_SEC);
    }

    void check();
  }, [ready]);

  useEffect(() => {
    if (!open || cancelIn <= 0) return;
    const id = window.setInterval(() => {
      setCancelIn((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, cancelIn]);

  function handleUpdate() {
    if (releaseUrl) openExternal(releaseUrl);
    dismissUpdateVersion(remoteVersion);
    setOpen(false);
  }

  function handleDismiss() {
    if (cancelIn > 0) return;
    dismissUpdateVersion(remoteVersion);
    setOpen(false);
  }

  return (
    <BlockingModal
      open={open}
      onClose={cancelIn > 0 ? () => {} : handleDismiss}
      title={t('startup.updateTitle')}
      modalClassName="xko-modal--update"
      hideClose={cancelIn > 0}
    >
      <p className="text-sm leading-relaxed text-text-muted">
        {t('startup.updateBody').replace('{version}', remoteVersion)}
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={handleDismiss}
          disabled={cancelIn > 0}
          className="xko-btn xko-btn--ghost"
        >
          {cancelIn > 0
            ? t('startup.updateCancelWait').replace('{seconds}', String(cancelIn))
            : t('startup.updateLater')}
        </button>
        <button type="button" onClick={handleUpdate} className="xko-btn xko-btn--lime">
          {t('startup.updateNow')}
        </button>
      </div>
    </BlockingModal>
  );
}
