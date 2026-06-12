import { useEffect, useState } from 'react';

import { useAppStore } from '@2xko/core';

import { useI18n } from '@/hooks/useI18n';

import { BlockingModal } from './BlockingModal';

import { openExternal } from '@/utils/openExternal';

const KOFI_KEY = '2xko-kofi-dismissed';

export function StartupModals() {
  const { t } = useI18n();
  const announcements = useAppStore((s) => s.announcements);
  const dismissed = useAppStore((s) => s.dismissedAnnouncements);
  const dismissAnnouncement = useAppStore((s) => s.dismissAnnouncement);
  const [showKofi, setShowKofi] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  const activeAnnouncement = announcements
    .filter((a) => !dismissed.includes(a.id))
    .sort((a, b) => a.priority - b.priority)[0];

  useEffect(() => {
    if (!sessionStorage.getItem(KOFI_KEY)) setShowKofi(true);
  }, []);

  useEffect(() => {
    if (!showKofi && activeAnnouncement) setShowAnnouncement(true);
  }, [showKofi, activeAnnouncement]);

  const closeKofi = () => {
    sessionStorage.setItem(KOFI_KEY, '1');
    setShowKofi(false);
  };

  const closeAnnouncement = () => {
    if (activeAnnouncement) dismissAnnouncement(activeAnnouncement.id);
    setShowAnnouncement(false);
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

      <BlockingModal
        open={showAnnouncement && !!activeAnnouncement}
        onClose={closeAnnouncement}
        title={activeAnnouncement?.title ?? t('startup.notice')}
      >
        <p className="text-sm text-text-muted">{activeAnnouncement?.body}</p>
        {activeAnnouncement?.link && (
          <a
            href={activeAnnouncement.link}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm text-accent hover:underline"
          >
            {t('startup.learnMore')}
          </a>
        )}
      </BlockingModal>
    </>
  );
}
