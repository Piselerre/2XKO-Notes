import { Link } from 'react-router-dom';

import type { Character } from '@2xko/core';

import { withMobilePreview } from '@/utils/mobilePreview';

import { FighterPortrait } from './FighterPortrait';

interface CharacterCardProps {
  character: Character;
  to?: string;
  onSelect?: () => void;
  selected?: boolean;
  inTeam?: boolean;
  hideName?: boolean;
  label?: string;
  displayOnly?: boolean;
}

export function CharacterCard({
  character,
  to,
  onSelect,
  selected = false,
  inTeam = false,
  hideName = false,
  label,
  displayOnly = false,
}: CharacterCardProps) {
  const className = [
    'fighter-slot',
    onSelect ? 'fighter-slot--pickable' : '',
    selected ? 'fighter-slot--selected' : '',
    inTeam ? 'fighter-slot--in-team' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const portrait = <FighterPortrait character={character} label={label} />;

  if (displayOnly) {
    return (
      <div className={className}>
        <div className="fighter-slot__frame">
          <div className="fighter-slot__hit fighter-slot__hit--static" aria-hidden>
            {portrait}
          </div>
        </div>
      </div>
    );
  }

  if (onSelect) {
    return (
      <div className={className}>
        <div className="fighter-slot__frame">
          <button type="button" onClick={onSelect} className="fighter-slot__hit" aria-label={character.name}>
            {portrait}
          </button>
        </div>
      </div>
    );
  }

  const linkTo = to ? withMobilePreview(to) : '#';

  return (
    <div className={className}>
      <div className="fighter-slot__frame">
        <Link to={linkTo} className="fighter-slot__hit" aria-label={character.name}>
          {portrait}
        </Link>
      </div>
      {!label && !hideName && (
        <div className="fighter-slot__name-wrap">
          <Link to={linkTo} className="fighter-slot__name">
            {character.name}
          </Link>
        </div>
      )}
    </div>
  );
}
