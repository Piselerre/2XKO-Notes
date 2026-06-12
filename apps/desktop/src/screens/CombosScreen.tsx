import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { Layout } from '@/components/Layout';
import { PageStrip } from '@/components/PageStrip';
import { CharacterCard } from '@/components/CharacterCard';
import { NoteDetailPanel } from '@/components/NoteDetailPanel';
import { SavedTeamsBar } from '@/components/SavedTeamsBar';
import { CharacterBoxHeader } from '@/components/CharacterBoxHeader';
import { TeamCreatorModal } from '@/components/TeamCreatorModal';
import { characters, getCharacter, getCharacterPortraitFallback, getCharacterPortraitSrc } from '@/data/manifest';
import { preloadImages } from '@/utils/imageCache';
import { useAppStore } from '@2xko/core';
import { useI18n } from '@/hooks/useI18n';

function ComboList() {
  const [search, setSearch] = useState('');
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const savedTeams = useAppStore((s) => s.savedTeams);
  const activeSavedTeamId = useAppStore((s) => s.activeSavedTeamId);
  const navigate = useNavigate();
  const addSavedTeam = useAppStore((s) => s.addSavedTeam);
  const addTeamNote = useAppStore((s) => s.addTeamNote);
  const removeSavedTeam = useAppStore((s) => s.removeSavedTeam);
  const setActiveSavedTeam = useAppStore((s) => s.setActiveSavedTeam);
  const { t } = useI18n();

  const activeTeam = savedTeams.find((team) => team.id === activeSavedTeamId);
  const teamCharIds = activeTeam ? [activeTeam.char1Id, activeTeam.char2Id] : [];
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
    <Layout title={t('combos.title')} backTo="/" backLabel={t('nav.menu')}>
      <div className="content-panel content-panel--roster">
        <PageStrip label={t('teams.myTeams')} />
        <div className="roster-section">
          <SavedTeamsBar
            teams={savedTeams}
            activeTeamId={activeSavedTeamId}
            onCreate={() => setTeamModalOpen(true)}
            onOpenTeam={(team) => {
              setActiveSavedTeam(team.id);
              addTeamNote(team.char1Id, team.char2Id);
              navigate(`/team-notes/${team.char1Id}/${team.char2Id}`);
            }}
            onRemove={removeSavedTeam}
          />
        </div>

        <PageStrip label={t('combos.selectFighter')} />
        <div className="roster-section roster-section--picker">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('combos.search')}
            className="xko-input content-panel__search"
          />
          <div className="fighter-grid fighter-grid--picker">
            {filtered.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                to={`/combos/${char.id}`}
                inTeam={teamCharIds.includes(char.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <TeamCreatorModal
        open={teamModalOpen}
        characters={characters}
        onClose={() => setTeamModalOpen(false)}
        onSave={(char1Id, char2Id) => {
          addSavedTeam(char1Id, char2Id);
          addTeamNote(char1Id, char2Id);
        }}
      />
    </Layout>
  );
}

function ComboDetail() {
  const { characterId } = useParams<{ characterId: string }>();
  const character = characterId ? getCharacter(characterId) : undefined;
  const comboTabs = useAppStore((s) => s.comboTabs);
  const comboSheets = useAppStore((s) => s.comboSheets);
  const getOrCreateComboSheet = useAppStore((s) => s.getOrCreateComboSheet);
  const updateComboSection = useAppStore((s) => s.updateComboSection);
  const addComboTab = useAppStore((s) => s.addComboTab);
  const removeComboTab = useAppStore((s) => s.removeComboTab);
  const renameComboTab = useAppStore((s) => s.renameComboTab);
  const [activeTab, setActiveTab] = useState(comboTabs[0]?.id ?? 'midscreen');
  const [ready, setReady] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (characterId) {
      getOrCreateComboSheet(characterId);
      setReady(true);
    }
  }, [characterId, getOrCreateComboSheet]);

  if (!character) {
    return (
      <Layout title={t('combos.title')} backTo="/combos">
        <p className="text-text-muted">{t('common.notFound')}</p>
      </Layout>
    );
  }

  const sheet = comboSheets.find((c) => c.characterId === characterId);

  if (!ready || !sheet) {
    return (
      <Layout headerContent={<CharacterBoxHeader character={character} />} backTo="/combos">
        <p className="text-text-muted">{t('common.loading')}</p>
      </Layout>
    );
  }

  return (
    <Layout headerContent={<CharacterBoxHeader character={character} />} backTo="/combos" backLabel={t('combos.back')}>
      <NoteDetailPanel
        tabs={comboTabs}
        sections={sheet.sections}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddTab={addComboTab}
        onRemoveTab={removeComboTab}
        onRenameTab={renameComboTab}
        onUpdateSection={(sid, data) => updateComboSection(sheet.id, sid, data)}
      />
    </Layout>
  );
}

export function CombosScreen() {
  return (
    <Routes>
      <Route index element={<ComboList />} />
      <Route path=":characterId" element={<ComboDetail />} />
    </Routes>
  );
}
