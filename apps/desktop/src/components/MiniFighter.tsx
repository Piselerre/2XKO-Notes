import type { Character } from '@2xko/core';

import { getCharacterPortraitFallback, getCharacterPortraitSrc } from '@/data/manifest';

import { CachedImage } from './CachedImage';

interface MiniFighterProps {
  character: Character;
  size?: 'sm' | 'lg' | 'xl' | 'roster';
}

export function MiniFighter({ character, size = 'sm' }: MiniFighterProps) {
  const imageSrc = getCharacterPortraitSrc(character.slug);
  const fallback = getCharacterPortraitFallback(character.slug);

  return (
    <div
      className={[
        'mini-fighter',
        size === 'lg' ? 'mini-fighter--lg' : '',
        size === 'xl' ? 'mini-fighter--xl' : '',
        size === 'roster' ? 'mini-fighter--roster' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={character.name}
    >
      <div className="fighter-slot__frame">
        <div className="mini-fighter__hit">
          <div className="mini-fighter__card">
            <div className="mini-fighter__media">
              {imageSrc ? (
                <CachedImage
                  src={imageSrc}
                  fallbackSrc={fallback}
                  alt=""
                  className={`mini-fighter__img mini-fighter__img--${character.slug}`}
                />
              ) : (
                <span className="mini-fighter__fallback">{character.name.slice(0, 2)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
