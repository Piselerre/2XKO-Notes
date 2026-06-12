import { useEffect, useRef, useState } from 'react';

import { APP_VERSION } from '@/constants/version';
import { useI18n } from '@/hooks/useI18n';
import { consumeJustUpdatedVersion } from '@/utils/updatePreferences';

import { BlockingModal } from './BlockingModal';
import { openExternal } from '@/utils/openExternal';

const KOFI_KEY = '2xko-kofi-dismissed';
const KOFI_DELAY_MS = 500;

export function StartupModals() {
  const { t } = useI18n();
  const kofiTimer = useRef<number | null>(null);

  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
  const [updatedVersion, setUpdatedVersion] = useState('');
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
    scheduleKofi();
  }, []);

  function closeKofi() {
    sessionStorage.setItem(KOFI_KEY, '1');
    setShowKofi(false);
  }

  function handleUpdateSuccessClose() {
    setShowUpdateSuccess(false);
    scheduleKofi(KOFI_DELAY_MS);
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
