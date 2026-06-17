import { useState } from 'react';

import { Layout } from '@/components/Layout';
import { BlockingModal } from '@/components/BlockingModal';
import { useI18n } from '@/hooks/useI18n';
import { openExternal } from '@/utils/openExternal';

const WIKI_URL = 'https://wiki.play2xko.com/en-us/';

export function FrameDataScreen() {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(true);

  const openWiki = () => {
    void openExternal(WIKI_URL);
    setShowModal(false);
  };

  return (
    <Layout title={t('frameData.title')} backTo="/" backLabel={`← ${t('common.home')}`}>
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-bg-card p-8 text-center">
        <p className="text-4xl">📊</p>
        <h2 className="mt-4 text-xl font-bold">{t('frameData.external')}</h2>
        <p className="mt-3 text-sm text-text-muted">{t('frameData.body')}</p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="mt-6 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-bg-primary hover:bg-accent-dim"
        >
          {t('frameData.openWiki')}
        </button>
      </div>

      <BlockingModal open={showModal} onClose={() => setShowModal(false)} title={t('frameData.leaveTitle')}>
        <p className="text-sm text-text-muted">{t('frameData.leaveBody')}</p>
        <p className="mt-2 break-all text-sm text-accent">{WIKI_URL}</p>
        <button
          type="button"
          onClick={openWiki}
          className="mt-4 w-full rounded-xl border border-accent py-2 text-sm font-semibold text-accent hover:bg-accent/10"
        >
          {t('frameData.openNow')}
        </button>
      </BlockingModal>
    </Layout>
  );
}
