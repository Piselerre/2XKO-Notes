import { Routes, Route, useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { InstanceBar } from '@/components/InstanceBar';
import { Layout } from '@/components/Layout';
import { CharacterGrid } from '@/components/CharacterGrid';
import { NoteDetailPanel } from '@/components/NoteDetailPanel';
import { TeamPairHeader } from '@/components/TeamPairHeader';
import { CharacterCard } from '@/components/CharacterCard';
import { getCharacter } from '@/data/manifest';
import { useCharacterRoster } from '@/hooks/useCharacterRoster';
import { useIsMobile } from '@/hooks/useIsMobile';
import { withMobilePreview } from '@/utils/mobilePreview';
import { savedTeamKey, useAppStore } from '@2xko/core';
import { useI18n } from '@/hooks/useI18n';

function TeamSelectFirst() {
  const { t } = useI18n();
  const characters = useCharacterRoster();

  return (
    <Layout title={t('teamNotes.title')} backTo="/" backLabel={`← ${t('common.home')}`}>
      <p className="mb-6 text-text-muted">{t('teamNotes.pickFirst')}</p>
      <CharacterGrid characters={characters} linkPrefix="/team-notes/new" />
    </Layout>
  );
}

function TeamSelectSecond() {
  const { char1Id } = useParams<{ char1Id: string }>();
  const char1 = getCharacter(char1Id!);
  const { t } = useI18n();
  const characters = useCharacterRoster();

  if (!char1) return null;

  return (
    <Layout
      title={`${char1.name.toUpperCase()} + ?`}
      backTo="/combos"
      backLabel={`← ${t('combos.title')}`}
    >
      <p className="mb-6 text-text-muted">{t('teamNotes.pickSecond')}</p>
      <CharacterGrid
        characters={characters}
        linkPrefix={`/team-notes/${char1Id}`}
        excludeId={char1Id}
      />
    </Layout>
  );
}

function TeamDetail() {
  const { char1Id, char2Id } = useParams<{ char1Id: string; char2Id: string }>();
  const char1 = getCharacter(char1Id!);
  const char2 = getCharacter(char2Id!);
  const addTeamNote = useAppStore((s) => s.addTeamNote);
  const updateTeamSection = useAppStore((s) => s.updateTeamSection);
  const addTeamTab = useAppStore((s) => s.addTeamTab);
  const removeTeamTab = useAppStore((s) => s.removeTeamTab);
  const renameTeamTab = useAppStore((s) => s.renameTeamTab);
  const reorderTeamTabs = useAppStore((s) => s.reorderTeamTabs);
  const teamNotes = useAppStore((s) => s.teamNotes);
  const activeTeamNoteIds = useAppStore((s) => s.activeTeamNoteIds);
  const addTeamNoteInstance = useAppStore((s) => s.addTeamNoteInstance);
  const renameTeamNoteInstance = useAppStore((s) => s.renameTeamNoteInstance);
  const removeTeamNoteInstance = useAppStore((s) => s.removeTeamNoteInstance);
  const setActiveTeamNote = useAppStore((s) => s.setActiveTeamNote);
  const [activeTab, setActiveTab] = useState('synergies');
  const { t } = useI18n();
  const mobile = useIsMobile();

  useEffect(() => {
    if (char1Id && char2Id) {
      addTeamNote(char1Id, char2Id);
    }
  }, [char1Id, char2Id, addTeamNote]);

  const pairKey = char1Id && char2Id ? savedTeamKey(char1Id, char2Id) : '';
  const instances = pairKey
    ? teamNotes.filter((n) => savedTeamKey(n.char1Id, n.char2Id) === pairKey)
    : [];
  const activeNoteId = pairKey ? activeTeamNoteIds[pairKey] : undefined;
  const team = instances.find((n) => n.id === activeNoteId) ?? instances[0];

  useEffect(() => {
    if (!team) return;
    if (!team.tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(team.tabs[0]?.id ?? 'synergies');
    }
  }, [team?.id, team?.tabs, activeTab]);

  if (!char1 || !char2) return null;
  if (!team) return null;

  const instanceProps = {
    instances: instances.map((i) => ({ id: i.id, label: i.label })),
    activeId: team.id,
    onSelect: (id: string) => setActiveTeamNote(pairKey, id),
    onAdd: (label: string) => addTeamNoteInstance(char1Id!, char2Id!, label),
    onRemove: removeTeamNoteInstance,
  };

  const subtitle = `${char1.name} + ${char2.name}`;

  const panel = (
    <NoteDetailPanel
      tabs={team.tabs}
      sections={team.sections}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onAddTab={(label) => addTeamTab(team.id, label)}
      onRemoveTab={(id) => removeTeamTab(team.id, id)}
      onRenameTab={(id, label) => renameTeamTab(team.id, id, label)}
      onReorderTabs={(from, to) => reorderTeamTabs(team.id, from, to)}
      onUpdateSection={(sid, data) => updateTeamSection(team.id, sid, data)}
      instanceProps={instanceProps}
      mobileShell={mobile ? { backTo: '/team-notes', backLabel: t('teamNotes.back'), subtitle } : undefined}
      instanceBar={
        mobile ? undefined : (
          <InstanceBar
            instances={instanceProps.instances}
            activeId={instanceProps.activeId}
            onSelect={instanceProps.onSelect}
            onAdd={instanceProps.onAdd}
            onRename={renameTeamNoteInstance}
            onRemove={instanceProps.onRemove}
          />
        )
      }
      showLayoutToggle={!mobile}
    />
  );

  if (mobile) return panel;

  return (
    <Layout
      headerContent={<TeamPairHeader char1={char1} char2={char2} />}
      backTo="/combos"
      backLabel={`← ${t('combos.title')}`}
    >
      {panel}
    </Layout>
  );
}

function TeamList() {
  const teamNotes = useAppStore((s) => s.teamNotes);
  const deleteTeamNote = useAppStore((s) => s.deleteTeamNote);
  const { t } = useI18n();

  return (
    <Layout title={t('teamNotes.title')} backTo="/" backLabel={`← ${t('common.home')}`}>
      <div className="mb-6 flex justify-between">
        <p className="text-text-muted">{t('teamNotes.saved')}</p>
        <Link
          to={withMobilePreview('/team-notes/new')}
          className="rounded-lg bg-accent/20 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/30"
        >
          + {t('teamNotes.newTeam')}
        </Link>
      </div>
      <div className="saved-teams__grid fighter-grid">
        {teamNotes.map((team) => {
          const c1 = getCharacter(team.char1Id);
          const c2 = getCharacter(team.char2Id);
          if (!c1 || !c2) return null;
          return (
            <div key={team.id} className="saved-team-card group">
              <Link
                to={withMobilePreview(`/team-notes/${team.char1Id}/${team.char2Id}`)}
                className="saved-team-card__main"
              >
                <div className="saved-team-card__pair">
                  <div className="saved-team-card__fighters">
                    <CharacterCard character={c1} hideName displayOnly />
                    <CharacterCard character={c2} hideName displayOnly />
                  </div>
                  <p className="saved-team-card__names">
                    {c1.name} & {c2.name}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => deleteTeamNote(team.id)}
                className="saved-team-card__remove"
                aria-label={t('teams.deleteTitle')}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      {teamNotes.length === 0 && (
        <p className="mt-8 text-center text-text-muted">{t('teamNotes.empty')}</p>
      )}
    </Layout>
  );
}

export function TeamNotesScreen() {
  return (
    <Routes>
      <Route index element={<TeamList />} />
      <Route path="new" element={<TeamSelectFirst />} />
      <Route path="new/:char1Id" element={<TeamSelectSecond />} />
      <Route path=":char1Id/:char2Id" element={<TeamDetail />} />
    </Routes>
  );
}
