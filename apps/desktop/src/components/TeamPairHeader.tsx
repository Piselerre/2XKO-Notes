import type { Character } from '@2xko/core';

import { getCharacterBoxFallback, getCharacterBoxSrc } from '@/data/manifest';

import { CachedImage } from './CachedImage';

interface TeamPairHeaderProps {
  char1: Character;
  char2: Character;
}

export function TeamPairHeader({ char1, char2 }: TeamPairHeaderProps) {
  return (
    <div className="team-pair-header" aria-label={`${char1.name} + ${char2.name}`}>
      <div className="team-pair-header__frame">
        <CachedImage
          src={getCharacterBoxSrc(char1.slug)}
          fallbackSrc={getCharacterBoxFallback(char1.slug)}
          alt={char1.name}
          className="team-pair-header__portrait"
          eager
        />
      </div>
      <div className="team-pair-header__frame">
        <CachedImage
          src={getCharacterBoxSrc(char2.slug)}
          fallbackSrc={getCharacterBoxFallback(char2.slug)}
          alt={char2.name}
          className="team-pair-header__portrait"
          eager
        />
      </div>
    </div>
  );
}
