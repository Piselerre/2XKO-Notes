import type { Character } from '@2xko/core';

import { getCharacterBoxFallback, getCharacterBoxSrc } from '@/data/manifest';

import { CachedImage } from './CachedImage';

interface CharacterBoxHeaderProps {
  character: Character;
}

export function CharacterBoxHeader({ character }: CharacterBoxHeaderProps) {
  return (
    <div className="team-pair-header" aria-label={character.name}>
      <div className="team-pair-header__frame">
        <CachedImage
          src={getCharacterBoxSrc(character.slug)}
          fallbackSrc={getCharacterBoxFallback(character.slug)}
          alt={character.name}
          className="team-pair-header__portrait"
          eager
        />
      </div>
    </div>
  );
}
