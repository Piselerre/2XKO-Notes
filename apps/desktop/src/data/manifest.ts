import charactersData from '../../../../assets/manifest/characters.json';

import categoriesData from '../../../../assets/manifest/categories.json';

import type { Character } from '@2xko/core';



export const characters: Character[] = charactersData.characters;

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

  vi: 'Vi Champion Select 2XKO.png',

  warwick: 'Warwick Champion Select 2XKO.png',

  yasuo: 'Yasuo Chmpion Select 2XKO.png',

};



export type CharacterImageSize = 'thumb' | 'full' | 'recut';



function characterBySlug(slug: string): Character | undefined {

  return characters.find((c) => c.slug === slug);

}



/** PNG recortado por el usuario (img/character/recut/{Name}.png). */

export function getCharacterRecut(slug: string): string {

  const name = characterBySlug(slug)?.name;

  return name ? `/img/character/recut/${name}.png` : '';

}



export function getChampionSelectImage(slug: string): string {
  const file = CHAMP_SELECT[slug];
  return file ? `/img/character/${encodeURIComponent(file)}` : '';
}

/** WebP thumb (3:4). Primary source for roster cards. */
export function getCharacterImage(slug: string, size: CharacterImageSize = 'thumb'): string {
  if (size === 'thumb') {
    return `/img/character/thumbs/${slug}.webp`;
  }
  if (size === 'recut') {
    return getCharacterRecut(slug);
  }
  return getChampionSelectImage(slug);
}

/** Champion Select PNG when thumb is missing — never user recuts. */
export function getCharacterImageFallback(slug: string): string {
  return getChampionSelectImage(slug);
}

/** Roster / solo fighter image (640×480 box crop in img/character/box/). */
export function getCharacterBoxSrc(slug: string): string {
  const name = characterBySlug(slug)?.name;
  if (name) return `/img/character/box/${encodeURIComponent(name)}.png`;
  return `/img/character/box/${slug}.png`;
}

export function getCharacterBoxFallback(slug: string): string {
  return getCharacterImage(slug, 'thumb');
}

/** Roster portrait: thumb with Champion Select fallback. */
export function getCharacterPortraitSrc(slug: string): string {
  return getCharacterImage(slug, 'thumb');
}

export function getCharacterPortraitFallback(slug: string): string {
  return getCharacterImageFallback(slug);
}



export function getCharacter(id: string): Character | undefined {

  return characters.find((c) => c.id === id);

}


