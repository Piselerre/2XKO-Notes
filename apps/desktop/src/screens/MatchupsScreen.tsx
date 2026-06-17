import { Routes, Route, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { Layout } from '@/components/Layout';
import { PageStrip } from '@/components/PageStrip';
import { CharacterCard } from '@/components/CharacterCard';
import { NoteDetailPanel } from '@/components/NoteDetailPanel';
import { InstanceBar } from '@/components/InstanceBar';
import { MatchupOpponentHeader } from '@/components/MatchupOpponentHeader';
import { getCharacter, getCharacterPortraitFallback, getCharacterPortraitSrc } from '@/data/manifest';
import { useCharacterRoster } from '@/hooks/useCharacterRoster';
import { useIsMobile } from '@/hooks/useIsMobile';
import { preloadImages } from '@/utils/imageCache';
import { useAppStore } from '@2xko/core';
import { useI18n } from '@/hooks/useI18n';

function MatchupList() {
  const [search, setSearch] = useState('');
  const { t } = useI18n();
  const characters = useCharacterRoster();
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
                label={`${t('matchups.vs')} ${char.name.toUpperCase()}`}
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
  const matchups = useAppStore((s) => s.matchups);
  const activeMatchupIds = useAppStore((s) => s.activeMatchupIds);
  const getOrCreateMatchup = useAppStore((s) => s.getOrCreateMatchup);
  const updateMatchupSection = useAppStore((s) => s.updateMatchupSection);
  const addMatchupTab = useAppStore((s) => s.addMatchupTab);
  const removeMatchupTab = useAppStore((s) => s.removeMatchupTab);
  const renameMatchupTab = useAppStore((s) => s.renameMatchupTab);
  const reorderMatchupTabs = useAppStore((s) => s.reorderMatchupTabs);
  const addMatchupInstance = useAppStore((s) => s.addMatchupInstance);
  const renameMatchupInstance = useAppStore((s) => s.renameMatchupInstance);
  const removeMatchupInstance = useAppStore((s) => s.removeMatchupInstance);
  const setActiveMatchup = useAppStore((s) => s.setActiveMatchup);
  const [activeTab, setActiveTab] = useState('general');
  const [ready, setReady] = useState(false);
  const { t } = useI18n();
  const mobile = useIsMobile();

  useEffect(() => {
    if (opponentId) {
      getOrCreateMatchup(opponentId);
      setReady(true);
    }
  }, [opponentId, getOrCreateMatchup]);

  const instances = opponentId ? matchups.filter((m) => m.opponentId === opponentId) : [];
  const activeMatchupId = opponentId ? activeMatchupIds[opponentId] : undefined;
  const matchup = instances.find((m) => m.id === activeMatchupId) ?? instances[0];

  useEffect(() => {
    if (!matchup) return;
    if (!matchup.tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(matchup.tabs[0]?.id ?? 'general');
    }
  }, [matchup?.id, matchup?.tabs, activeTab]);

  if (!opponent) {
    return (
      <Layout title={t('matchups.title')} backTo="/matchups">
        <p className="text-text-muted">{t('common.notFound')}</p>
      </Layout>
    );
  }

  if (!ready || !matchup) {
    if (mobile) {
      return <p className="mobile-note__loading">{t('common.loading')}</p>;
    }
    return (
      <Layout headerContent={<MatchupOpponentHeader character={opponent} />} backTo="/matchups">
        <p className="text-text-muted">{t('common.loading')}</p>
      </Layout>
    );
  }

  const instanceProps = {
    instances: instances.map((i) => ({ id: i.id, label: i.label })),
    activeId: matchup.id,
    onSelect: (id: string) => opponentId && setActiveMatchup(opponentId, id),
    onAdd: (label: string) => opponentId && addMatchupInstance(opponentId, label),
    onRemove: removeMatchupInstance,
  };

  const panel = (
    <NoteDetailPanel
      tabs={matchup.tabs}
      sections={matchup.sections}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onAddTab={(label) => addMatchupTab(matchup.id, label)}
      onRemoveTab={(id) => removeMatchupTab(matchup.id, id)}
      onRenameTab={(id, label) => renameMatchupTab(matchup.id, id, label)}
      onReorderTabs={(from, to) => reorderMatchupTabs(matchup.id, from, to)}
      onUpdateSection={(sid, data) => updateMatchupSection(matchup.id, sid, data)}
      instanceProps={instanceProps}
      mobileShell={mobile ? { backTo: '/matchups', backLabel: t('matchups.back'), subtitle: opponent.name } : undefined}
      instanceBar={
        mobile ? undefined : (
          <InstanceBar
            instances={instanceProps.instances}
            activeId={instanceProps.activeId}
            onSelect={instanceProps.onSelect}
            onAdd={instanceProps.onAdd}
            onRename={renameMatchupInstance}
            onRemove={instanceProps.onRemove}
          />
        )
      }
      showLayoutToggle={!mobile}
    />
  );

  if (mobile) return panel;

  return (
    <Layout headerContent={<MatchupOpponentHeader character={opponent} />} backTo="/matchups" backLabel={t('matchups.back')}>
      {panel}
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
