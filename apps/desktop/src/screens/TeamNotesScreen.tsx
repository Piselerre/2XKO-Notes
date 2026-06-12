import { Routes, Route, useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { Layout } from '@/components/Layout';
import { CharacterGrid } from '@/components/CharacterGrid';
import { NoteDetailPanel } from '@/components/NoteDetailPanel';
import { TeamPairHeader } from '@/components/TeamPairHeader';
import { CharacterCard } from '@/components/CharacterCard';
import { characters, getCharacter } from '@/data/manifest';
import { useAppStore } from '@2xko/core';
import { useI18n } from '@/hooks/useI18n';

function TeamSelectFirst() {
  const { t } = useI18n();

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
  const teamTabs = useAppStore((s) => s.teamTabs);
  const addTeamTab = useAppStore((s) => s.addTeamTab);
  const removeTeamTab = useAppStore((s) => s.removeTeamTab);
  const renameTeamTab = useAppStore((s) => s.renameTeamTab);
  const teamNotes = useAppStore((s) => s.teamNotes);
  const [activeTab, setActiveTab] = useState(teamTabs[0]?.id ?? 'synergies');
  const [teamId, setTeamId] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (char1Id && char2Id) {
      const note = addTeamNote(char1Id, char2Id);
      setTeamId(note.id);
    }
  }, [char1Id, char2Id, addTeamNote]);

  if (!char1 || !char2) return null;

  const team = teamNotes.find((n) => n.id === teamId);
  if (!team) return null;

  return (
    <Layout
      headerContent={<TeamPairHeader char1={char1} char2={char2} />}
      backTo="/combos"
      backLabel={`← ${t('combos.title')}`}
    >
      <NoteDetailPanel
        tabs={teamTabs}
        sections={team.sections}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddTab={addTeamTab}
        onRemoveTab={removeTeamTab}
        onRenameTab={renameTeamTab}
        onUpdateSection={(sid, data) => updateTeamSection(team.id, sid, data)}
      />
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
          to="/team-notes/new"
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
                to={`/team-notes/${team.char1Id}/${team.char2Id}`}
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
