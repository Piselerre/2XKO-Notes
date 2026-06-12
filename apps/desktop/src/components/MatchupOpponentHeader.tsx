import type { Character } from '@2xko/core';

import { useI18n } from '@/hooks/useI18n';
import { CharacterBoxHeader } from './CharacterBoxHeader';

interface MatchupOpponentHeaderProps {
  character: Character;
}

export function MatchupOpponentHeader({ character }: MatchupOpponentHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="matchup-opponent-header">
      <span className="matchup-opponent-header__vs">{t('matchups.vs')}</span>
      <span className="matchup-opponent-header__name">{character.name}</span>
      <CharacterBoxHeader character={character} />
    </div>
  );
}
