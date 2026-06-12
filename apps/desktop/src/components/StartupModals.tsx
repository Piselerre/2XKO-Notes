import { useEffect, useState } from 'react';

import { useI18n } from '@/hooks/useI18n';

import { BlockingModal } from './BlockingModal';
import { UpdatePromptModal } from './UpdatePromptModal';

import { openExternal } from '@/utils/openExternal';

const KOFI_KEY = '2xko-kofi-dismissed';

export function StartupModals() {
  const { t } = useI18n();
  const [showKofi, setShowKofi] = useState(false);

  const startupReady = !showKofi;

  useEffect(() => {
    if (!sessionStorage.getItem(KOFI_KEY)) setShowKofi(true);
  }, []);

  const closeKofi = () => {
    sessionStorage.setItem(KOFI_KEY, '1');
    setShowKofi(false);
  };

  return (
    <>
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

      <UpdatePromptModal ready={startupReady} />
    </>
  );
}
