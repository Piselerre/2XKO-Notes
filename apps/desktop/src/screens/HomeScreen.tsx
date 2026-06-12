import { useState } from 'react';

import { SectionCard } from '@/components/SectionCard';
import { BlockingModal } from '@/components/BlockingModal';
import { AppHeader } from '@/components/AppHeader';
import { useI18n } from '@/hooks/useI18n';
import { openExternal } from '@/utils/openExternal';

const WIKI_URL = 'https://wiki.play2xko.com/en-us/';

export function HomeScreen() {
  const { t } = useI18n();
  const [frameModal, setFrameModal] = useState(false);

  return (
    <div className="home-root">
      <AppHeader />

      <nav className="home-grid" aria-label={t('nav.menu')}>
        <SectionCard num="01" accent="lime" to="/combos" title={t('home.combos')} desc={t('home.combosDesc')} bgSlug="vi" />
        <SectionCard num="02" accent="pink" to="/matchups" title={t('home.matchups')} desc={t('home.matchupsDesc')} bgSlug="yasuo" />
        <SectionCard num="03" accent="cyan" to="/players" title={t('home.players')} desc={t('home.playersDesc')} bgSlug="ekko" />
        <SectionCard num="04" accent="lime" title={t('home.frameData')} desc={t('home.frameDataDesc')} bgSlug="braum" onClick={() => setFrameModal(true)} />
      </nav>

      <BlockingModal open={frameModal} onClose={() => setFrameModal(false)} title={t('home.frameData')}>
        <p className="text-sm text-text-muted">{t('home.frameModalBody')}</p>
        <button type="button" onClick={() => { openExternal(WIKI_URL); setFrameModal(false); }} className="xko-btn xko-btn--outline mt-4 w-full">
          {t('home.frameModalOpen')}
        </button>
      </BlockingModal>
    </div>
  );
}
