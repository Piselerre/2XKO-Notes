import type { Character } from '@2xko/core';

import { getCharacterPortraitFallback, getCharacterPortraitSrc } from '@/data/manifest';

import { CachedImage } from './CachedImage';

interface FighterPortraitProps {
  character: Character;
  label?: string;
}

export function FighterPortrait({ character, label }: FighterPortraitProps) {
  const imageSrc = getCharacterPortraitSrc(character.slug);
  const fallback = getCharacterPortraitFallback(character.slug);

  return (
    <div className="fighter-slot__card">
      <div className="fighter-slot__media">
        {imageSrc ? (
          <CachedImage
            src={imageSrc}
            fallbackSrc={fallback}
            alt={character.name}
            className={`fighter-slot__img fighter-slot__img--${character.slug}`}
          />
        ) : (
          <div className="fighter-slot__fallback">
            {character.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      {label && <span className="fighter-slot__vs">{label}</span>}
    </div>
  );
}
