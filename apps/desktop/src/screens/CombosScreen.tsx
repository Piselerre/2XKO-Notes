import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { Layout } from '@/components/Layout';
import { PageStrip } from '@/components/PageStrip';
import { CharacterCard } from '@/components/CharacterCard';
import { NoteDetailPanel } from '@/components/NoteDetailPanel';
import { SavedTeamsBar } from '@/components/SavedTeamsBar';
import { CharacterBoxHeader } from '@/components/CharacterBoxHeader';
import { InstanceBar } from '@/components/InstanceBar';
import { TeamCreatorModal } from '@/components/TeamCreatorModal';
import { getCharacter, getCharacterPortraitFallback, getCharacterPortraitSrc } from '@/data/manifest';
import { useCharacterRoster } from '@/hooks/useCharacterRoster';
import { useIsMobile } from '@/hooks/useIsMobile';
import { withMobilePreview } from '@/utils/mobilePreview';
import { preloadImages } from '@/utils/imageCache';
import { useAppStore } from '@2xko/core';
import { useI18n } from '@/hooks/useI18n';

function ComboList() {
  const [search, setSearch] = useState('');
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<{ id: string; char1Id: string; char2Id: string } | null>(null);
  const characters = useCharacterRoster();
  const savedTeams = useAppStore((s) => s.savedTeams);
  const activeSavedTeamId = useAppStore((s) => s.activeSavedTeamId);
  const navigate = useNavigate();
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
              navigate(withMobilePreview(`/team-notes/${team.char1Id}/${team.char2Id}`));
            }}
            onEdit={(team) => {
              setEditingTeam({ id: team.id, char1Id: team.char1Id, char2Id: team.char2Id });
              setTeamModalOpen(true);
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
        title={editingTeam ? t('teams.editTitle') : undefined}
        editTeamId={editingTeam?.id ?? null}
        editChar1Id={editingTeam?.char1Id ?? null}
        editChar2Id={editingTeam?.char2Id ?? null}
        onClose={() => {
          setTeamModalOpen(false);
          setEditingTeam(null);
        }}
        onSaved={() => setEditingTeam(null)}
      />
    </Layout>
  );
}

function ComboDetail() {
  const { characterId } = useParams<{ characterId: string }>();
  const character = characterId ? getCharacter(characterId) : undefined;
  const comboSheets = useAppStore((s) => s.comboSheets);
  const activeComboSheetIds = useAppStore((s) => s.activeComboSheetIds);
  const getOrCreateComboSheet = useAppStore((s) => s.getOrCreateComboSheet);
  const updateComboSection = useAppStore((s) => s.updateComboSection);
  const addComboTab = useAppStore((s) => s.addComboTab);
  const removeComboTab = useAppStore((s) => s.removeComboTab);
  const renameComboTab = useAppStore((s) => s.renameComboTab);
  const reorderComboTabs = useAppStore((s) => s.reorderComboTabs);
  const addComboInstance = useAppStore((s) => s.addComboInstance);
  const renameComboInstance = useAppStore((s) => s.renameComboInstance);
  const removeComboInstance = useAppStore((s) => s.removeComboInstance);
  const setActiveComboSheet = useAppStore((s) => s.setActiveComboSheet);
  const [activeTab, setActiveTab] = useState('midscreen');
  const [ready, setReady] = useState(false);
  const { t } = useI18n();
  const mobile = useIsMobile();

  useEffect(() => {
    if (characterId) {
      getOrCreateComboSheet(characterId);
      setReady(true);
    }
  }, [characterId, getOrCreateComboSheet]);

  const instances = characterId
    ? comboSheets.filter((c) => c.characterId === characterId)
    : [];
  const activeSheetId = characterId ? activeComboSheetIds[characterId] : undefined;
  const sheet = instances.find((c) => c.id === activeSheetId) ?? instances[0];

  useEffect(() => {
    if (!sheet) return;
    if (!sheet.tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(sheet.tabs[0]?.id ?? 'midscreen');
    }
  }, [sheet?.id, sheet?.tabs, activeTab]);

  if (!character) {
    return (
      <Layout title={t('combos.title')} backTo="/combos">
        <p className="text-text-muted">{t('common.notFound')}</p>
      </Layout>
    );
  }

  if (!ready || !sheet) {
    if (mobile) {
      return <p className="mobile-note__loading">{t('common.loading')}</p>;
    }
    return (
      <Layout headerContent={<CharacterBoxHeader character={character} />} backTo="/combos">
        <p className="text-text-muted">{t('common.loading')}</p>
      </Layout>
    );
  }

  const instanceProps = {
    instances: instances.map((i) => ({ id: i.id, label: i.label })),
    activeId: sheet.id,
    onSelect: (id: string) => characterId && setActiveComboSheet(characterId, id),
    onAdd: (label: string) => characterId && addComboInstance(characterId, label),
    onRemove: removeComboInstance,
  };

  const panel = (
    <NoteDetailPanel
      tabs={sheet.tabs}
      sections={sheet.sections}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onAddTab={(label) => addComboTab(sheet.id, label)}
      onRemoveTab={(id) => removeComboTab(sheet.id, id)}
      onRenameTab={(id, label) => renameComboTab(sheet.id, id, label)}
      onReorderTabs={(from, to) => reorderComboTabs(sheet.id, from, to)}
      onUpdateSection={(sid, data) => updateComboSection(sheet.id, sid, data)}
      instanceProps={instanceProps}
      mobileShell={mobile ? { backTo: '/combos', backLabel: t('combos.back'), subtitle: character.name } : undefined}
      instanceBar={
        mobile ? undefined : (
          <InstanceBar
            instances={instanceProps.instances}
            activeId={instanceProps.activeId}
            onSelect={instanceProps.onSelect}
            onAdd={instanceProps.onAdd}
            onRename={renameComboInstance}
            onRemove={instanceProps.onRemove}
          />
        )
      }
      showLayoutToggle={!mobile}
    />
  );

  if (mobile) return panel;

  return (
    <Layout headerContent={<CharacterBoxHeader character={character} />} backTo="/combos" backLabel={t('combos.back')}>
      {panel}
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
