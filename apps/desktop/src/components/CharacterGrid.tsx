import type { Character } from '@2xko/core';
import { CharacterCard } from './CharacterCard';

interface CharacterGridProps {
  characters: Character[];
  linkPrefix: string;
  excludeId?: string;
  vsLabel?: boolean;
}

export function CharacterGrid({
  characters,
  linkPrefix,
  excludeId,
  vsLabel = false,
}: CharacterGridProps) {
  const filtered = excludeId
    ? characters.filter((c) => c.id !== excludeId)
    : characters;

  return (
    <div className="fighter-grid">
      {filtered.map((char) => (
        <CharacterCard
          key={char.id}
          character={char}
          to={`${linkPrefix}/${char.id}`}
          label={vsLabel ? `VS ${char.name.toUpperCase()}` : undefined}
        />
      ))}
    </div>
  );
}
