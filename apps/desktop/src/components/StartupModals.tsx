import { useEffect, useRef, useState } from 'react';

import { APP_VERSION } from '@/constants/version';
import { useI18n } from '@/hooks/useI18n';
import { checkForAppUpdate, installAppUpdate } from '@/services/appUpdater';
import {
  areUpdatesIgnored,
  consumeJustUpdatedVersion,
  dismissUpdateVersion,
  shouldPromptForUpdate,
} from '@/utils/updatePreferences';

import { BlockingModal } from './BlockingModal';
import { openExternal } from '@/utils/openExternal';

const KOFI_KEY = '2xko-kofi-dismissed';
const KOFI_DELAY_MS = 500;
const CANCEL_DELAY_SEC = 4;

export function StartupModals() {
  const { t } = useI18n();
  const kofiTimer = useRef<number | null>(null);

  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
  const [updatedVersion, setUpdatedVersion] = useState('');

  const [showUpdate, setShowUpdate] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState('');
  const [cancelIn, setCancelIn] = useState(CANCEL_DELAY_SEC);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState(false);

  const [showKofi, setShowKofi] = useState(false);

  useEffect(() => {
    return () => {
      if (kofiTimer.current) window.clearTimeout(kofiTimer.current);
    };
  }, []);

  function scheduleKofi(delayMs = 0) {
    if (sessionStorage.getItem(KOFI_KEY)) return;
    if (kofiTimer.current) window.clearTimeout(kofiTimer.current);
    kofiTimer.current = window.setTimeout(() => {
      setShowKofi(true);
    }, delayMs);
  }

  useEffect(() => {
    const justUpdated = consumeJustUpdatedVersion(APP_VERSION);
    if (justUpdated) {
      setUpdatedVersion(justUpdated);
      setShowUpdateSuccess(true);
      return;
    }

    if (areUpdatesIgnored()) {
      scheduleKofi();
      return;
    }

    async function runStartupCheck() {
      const offer = await checkForAppUpdate();
      if (!offer || !shouldPromptForUpdate(offer.version)) {
        scheduleKofi();
        return;
      }
      setRemoteVersion(offer.version);
      setShowUpdate(true);
      setCancelIn(CANCEL_DELAY_SEC);
    }

    void runStartupCheck();
  }, []);

  useEffect(() => {
    if (!showUpdate || cancelIn <= 0 || installing) return;
    const id = window.setInterval(() => {
      setCancelIn((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [showUpdate, cancelIn, installing]);

  function closeKofi() {
    sessionStorage.setItem(KOFI_KEY, '1');
    setShowKofi(false);
  }

  function handleUpdateDismiss() {
    if (cancelIn > 0 || installing) return;
    dismissUpdateVersion(remoteVersion);
    setShowUpdate(false);
    scheduleKofi(KOFI_DELAY_MS);
  }

  async function handleUpdateNow() {
    if (installing) return;
    setInstalling(true);
    setInstallError(false);

    const offer = await checkForAppUpdate();
    if (!offer) {
      setInstalling(false);
      setInstallError(true);
      return;
    }

    const result = await installAppUpdate(offer);
    if (result === 'installed') return;

    setInstalling(false);
    if (result === 'opened') {
      setShowUpdate(false);
      return;
    }
    setInstallError(true);
  }

  function handleUpdateSuccessClose() {
    setShowUpdateSuccess(false);
    scheduleKofi();
  }

  return (
    <>
      <BlockingModal
        open={showUpdateSuccess}
        onClose={handleUpdateSuccessClose}
        title={t('startup.updateSuccessTitle')}
        modalClassName="xko-modal--update"
      >
        <p className="text-sm leading-relaxed text-text-muted">
          {t('startup.updateSuccessBody').replace('{version}', updatedVersion)}
        </p>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={handleUpdateSuccessClose} className="xko-btn xko-btn--lime">
            {t('startup.updateSuccessOk')}
          </button>
        </div>
      </BlockingModal>

      <BlockingModal
        open={showUpdate}
        onClose={installing ? () => {} : cancelIn > 0 ? () => {} : handleUpdateDismiss}
        title={t('startup.updateTitle')}
        modalClassName="xko-modal--update"
        hideClose={cancelIn > 0 || installing}
      >
        <p className="text-sm leading-relaxed text-text-muted">
          {t('startup.updateBody').replace('{version}', remoteVersion)}
        </p>
        {installing && (
          <p className="mt-3 text-sm text-accent">{t('startup.updateInstalling')}</p>
        )}
        {installError && (
          <p className="mt-3 text-sm text-accent-secondary">{t('startup.updateInstallError')}</p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleUpdateDismiss}
            disabled={cancelIn > 0 || installing}
            className="xko-btn xko-btn--ghost"
          >
            {cancelIn > 0
              ? t('startup.updateCancelWait').replace('{seconds}', String(cancelIn))
              : t('startup.updateLater')}
          </button>
          <button
            type="button"
            onClick={() => void handleUpdateNow()}
            disabled={installing}
            className="xko-btn xko-btn--lime"
          >
            {installing ? t('startup.updateInstalling') : t('startup.updateNow')}
          </button>
        </div>
      </BlockingModal>

      <BlockingModal open={showKofi} onClose={closeKofi} title={t('startup.kofiTitle')}>
        <p className="text-sm leading-relaxed text-text-muted">
          {t('startup.kofiBody')}
        </p>
        <button
          type="button"
          onClick={() => openExternal('https://ko-fi.com/PixelR')}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5e5b] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
        >
          ☕ {t('startup.kofiCta')}
        </button>
        <p className="mt-3 text-center text-xs text-text-muted">
          {t('startup.kofiBy')}{' '}
          <button type="button" onClick={() => openExternal('https://twitter.com/PixelR_')} className="text-accent hover:underline">
            @PixelR_
          </button>
        </p>
      </BlockingModal>
    </>
  );
}
