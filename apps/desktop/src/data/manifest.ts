import charactersData from '../../../../assets/manifest/characters.json';

import categoriesData from '../../../../assets/manifest/categories.json';

import type { Character } from '@2xko/core';

const bundledCharacters = charactersData.characters as Character[];
let roster: Character[] = [...bundledCharacters];
const rosterListeners = new Set<() => void>();

function notifyRoster() {
  rosterListeners.forEach((l) => l());
}

export function getCharacters(): Character[] {
  return roster;
}

export function subscribeCharacters(listener: () => void): () => void {
  rosterListeners.add(listener);
  return () => rosterListeners.delete(listener);
}

/** Merge remote roster entries without duplicates; returns true if roster changed. */
export function mergeCharacterLists(remote: Character[]): boolean {
  const byId = new Map(roster.map((c) => [c.id, c]));
  let changed = false;
  for (const char of remote) {
    const prev = byId.get(char.id);
    if (!prev || JSON.stringify(prev) !== JSON.stringify(char)) {
      byId.set(char.id, char);
      changed = true;
    }
  }
  if (!changed) return false;
  roster = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  notifyRoster();
  return true;
}

export function applyRemoteRoster(remote: Character[]): void {
  mergeCharacterLists(remote);
}

/** @deprecated Use getCharacters() — kept for gradual migration */
export const characters: Character[] = roster;

export const matchupSections = categoriesData.matchupSections;
export const comboCategories = categoriesData.comboCategories;
export const teamSections = categoriesData.teamSections;

const CHAMP_SELECT: Record<string, string> = {
  ahri: 'Ahri Champion Select 2XKO.png',
  akali: 'Akali Champion Select 2XKO.png',
  blitzcrank: 'Blitzcrank Champion Select 2XKO.png',
  braum: 'Braum Champion Select 2XKO.png',
  caitlyn: 'Caitlyn Key Visual_Champion Select 2XKO.png',
  darius: 'Darius Champion Select 2XKO.png',
  ekko: 'Ekko Champion Select 2XKO.png',
  illaoi: 'Illaoi Champion Select 2XKO.png',
  jinx: 'Jinx Champion Select 2XKO.png',
  senna: 'Senna-Champ-Select-2XKO.png',
  teemo: 'Teemo Champion Select 2XKO.png',
  thresh: 'Thresh-Champ-Select-2XKO.png',
  vi: 'Vi Champion Select 2XKO.png',
  warwick: 'Warwick Champion Select 2XKO.png',
  yasuo: 'Yasuo Chmpion Select 2XKO.png',
};

export type CharacterImageSize = 'thumb' | 'full' | 'recut';

function characterBySlug(slug: string): Character | undefined {
  return roster.find((c) => c.slug === slug);
}

export function getCharacterRecut(slug: string): string {
  const name = characterBySlug(slug)?.name;
  return name ? `/img/character/recut/${name}.png` : '';
}

export function getChampionSelectImage(slug: string): string {
  const file = CHAMP_SELECT[slug];
  return file ? `/img/character/${encodeURIComponent(file)}` : '';
}

export function getCharacterImage(slug: string, size: CharacterImageSize = 'thumb'): string {
  if (size === 'thumb') {
    return `/img/character/thumbs/${slug}.webp`;
  }
  if (size === 'recut') {
    return getCharacterRecut(slug);
  }
  return getChampionSelectImage(slug);
}

export function getCharacterImageFallback(slug: string): string {
  return getChampionSelectImage(slug);
}

export function getCharacterBoxSrc(slug: string): string {
  const name = characterBySlug(slug)?.name;
  if (name) return `/img/character/box/${encodeURIComponent(name)}.png`;
  return `/img/character/box/${slug}.png`;
}

export function getCharacterBoxFallback(slug: string): string {
  return getCharacterImage(slug, 'thumb');
}

export function getCharacterPortraitSrc(slug: string): string {
  return getCharacterImage(slug, 'thumb');
}

export function getCharacterPortraitFallback(slug: string): string {
  return getCharacterImageFallback(slug);
}

export function getCharacter(id: string): Character | undefined {
  return roster.find((c) => c.id === id);
}
