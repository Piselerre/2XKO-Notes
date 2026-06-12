import { Routes, Route, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { Layout } from '@/components/Layout';
import { PageStrip } from '@/components/PageStrip';
import { CharacterCard } from '@/components/CharacterCard';
import { NoteDetailPanel } from '@/components/NoteDetailPanel';
import { CharacterBoxHeader } from '@/components/CharacterBoxHeader';
import { characters, getCharacter, getCharacterPortraitFallback, getCharacterPortraitSrc } from '@/data/manifest';
import { preloadImages } from '@/utils/imageCache';
import { useAppStore } from '@2xko/core';
import { useI18n } from '@/hooks/useI18n';

function MatchupList() {
  const [search, setSearch] = useState('');
  const { t } = useI18n();
  const filtered = characters.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    void preloadImages(characters.map((c) => getCharacterPortraitSrc(c.slug)).filter(Boolean));
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        void preloadImages(characters.map((c) => getCharacterPortraitFallback(c.slug)).filter(Boolean));
      });
    }
  }, []);

  return (
    <Layout title={t('matchups.title')} backTo="/" backLabel={t('nav.menu')}>
      <div className="content-panel content-panel--roster">
        <PageStrip label={t('matchups.selectOpponent')} />
        <div className="roster-section roster-section--picker">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('matchups.search')}
            className="xko-input content-panel__search"
          />
          <div className="fighter-grid fighter-grid--picker">
            {filtered.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                to={`/matchups/${char.id}`}
                label={`${t('matchups.vs')} ${char.name}`}
              />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function MatchupDetail() {
  const { opponentId } = useParams<{ opponentId: string }>();
  const opponent = opponentId ? getCharacter(opponentId) : undefined;
  const matchupTabs = useAppStore((s) => s.matchupTabs);
  const matchups = useAppStore((s) => s.matchups);
  const getOrCreateMatchup = useAppStore((s) => s.getOrCreateMatchup);
  const updateMatchupSection = useAppStore((s) => s.updateMatchupSection);
  const addMatchupTab = useAppStore((s) => s.addMatchupTab);
  const removeMatchupTab = useAppStore((s) => s.removeMatchupTab);
  const renameMatchupTab = useAppStore((s) => s.renameMatchupTab);
  const [activeTab, setActiveTab] = useState(matchupTabs[0]?.id ?? 'general');
  const [ready, setReady] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (opponentId) {
      getOrCreateMatchup(opponentId);
      setReady(true);
    }
  }, [opponentId, getOrCreateMatchup]);

  if (!opponent) {
    return (
      <Layout title={t('matchups.title')} backTo="/matchups">
        <p className="text-text-muted">{t('common.notFound')}</p>
      </Layout>
    );
  }

  const matchup = matchups.find((m) => m.opponentId === opponentId);

  if (!ready || !matchup) {
    return (
      <Layout headerContent={<CharacterBoxHeader character={opponent} />} backTo="/matchups">
        <p className="text-text-muted">{t('common.loading')}</p>
      </Layout>
    );
  }

  return (
    <Layout headerContent={<CharacterBoxHeader character={opponent} />} backTo="/matchups" backLabel={t('matchups.back')}>
      <NoteDetailPanel
        tabs={matchupTabs}
        sections={matchup.sections}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddTab={addMatchupTab}
        onRemoveTab={removeMatchupTab}
        onRenameTab={renameMatchupTab}
        onUpdateSection={(sid, data) => updateMatchupSection(matchup.id, sid, data)}
      />
    </Layout>
  );
}

export function MatchupsScreen() {
  return (
    <Routes>
      <Route index element={<MatchupList />} />
      <Route path=":opponentId" element={<MatchupDetail />} />
    </Routes>
  );
}
