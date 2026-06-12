import { useSyncExternalStore } from 'react';

import type { Character } from '@2xko/core';

import { getCharacters, subscribeCharacters } from '@/data/manifest';

export function useCharacterRoster(): Character[] {
  return useSyncExternalStore(subscribeCharacters, getCharacters, getCharacters);
}
