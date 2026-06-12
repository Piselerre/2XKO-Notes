import { useState } from 'react';

import type { SavedTeam } from '@2xko/core';

import { getCharacter } from '@/data/manifest';
import { useI18n } from '@/hooks/useI18n';

import { BlockingModal } from './BlockingModal';
import { CharacterCard } from './CharacterCard';

interface SavedTeamsBarProps {
  teams: SavedTeam[];
  activeTeamId: string | null;
  onCreate: () => void;
  onOpenTeam: (team: SavedTeam) => void;
  onRemove: (id: string) => void;
}

export function SavedTeamsBar({
  teams,
  activeTeamId,
  onCreate,
  onOpenTeam,
  onRemove,
}: SavedTeamsBarProps) {
  const { t, locale } = useI18n();
  const [pendingDelete, setPendingDelete] = useState<SavedTeam | null>(null);

  const deleteC1 = pendingDelete ? getCharacter(pendingDelete.char1Id) : undefined;
  const deleteC2 = pendingDelete ? getCharacter(pendingDelete.char2Id) : undefined;

  function confirmDelete() {
    if (!pendingDelete) return;
    onRemove(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <>
      <section className="saved-teams" aria-label={t('teams.myTeams')}>
        <div className="saved-teams__grid fighter-grid">
          {teams.map((team) => {
            const c1 = getCharacter(team.char1Id);
            const c2 = getCharacter(team.char2Id);
            if (!c1 || !c2) return null;
            const active = team.id === activeTeamId;

            return (
              <div
                key={team.id}
                className={`saved-team-card ${active ? 'saved-team-card--active' : ''}`}
              >
                <button
                  type="button"
                  className="saved-team-card__main"
                  onClick={() => onOpenTeam(team)}
                  aria-label={`${c1.name} + ${c2.name}`}
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
                </button>
                <button
                  type="button"
                  className="saved-team-card__remove"
                  onClick={() => setPendingDelete(team)}
                  title={t('teams.deleteTitle')}
                  aria-label={t('teams.deleteTitle')}
                >
                  ✕
                </button>
              </div>
            );
          })}

          <button type="button" className="saved-team-create" onClick={onCreate}>
            <span className="saved-team-create__icon" aria-hidden>+</span>
            <span className="saved-team-create__label">{t('teams.create')}</span>
          </button>
        </div>

        {teams.length === 0 && (
          <p className="saved-teams__empty">{t('teams.empty')}</p>
        )}
      </section>

      <BlockingModal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title={t('teams.deleteTitle')}
      >
        <p className="text-sm text-text-muted">
          {locale === 'es' ? (
            <>
              {t('teams.deleteBody')}{' '}
              <strong className="text-accent">
                {deleteC1?.name} & {deleteC2?.name}
              </strong>{' '}
              {t('teams.deleteSuffix')}
            </>
          ) : (
            <>
              {t('teams.deleteBody')}{' '}
              <strong className="text-accent">
                {deleteC1?.name} & {deleteC2?.name}
              </strong>{' '}
              {t('teams.deleteSuffix')}
            </>
          )}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setPendingDelete(null)}
            className="xko-btn xko-btn--lime flex-1"
          >
            {t('teams.cancel')}
          </button>
          <button type="button" onClick={confirmDelete} className="xko-btn xko-btn--pink flex-1">
            {t('teams.delete')}
          </button>
        </div>
      </BlockingModal>
    </>
  );
}
