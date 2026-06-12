import type {
  AppData,
  Matchup,
  ComboSheet,
  NoteSection,
  SectionTab,
  SyncMeta,
  TeamNote,
  SavedTeam,
} from './types';

export const DEFAULT_TEAM_TABS: SectionTab[] = [
  { id: 'synergies', label: 'Synergies' },
  { id: 'assists', label: 'Assists' },
  { id: 'team_routes', label: 'Team Routes' },
  { id: 'burst_safe', label: 'Burst Safe Routes' },
  { id: 'gameplan', label: 'Gameplan' },
];

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getDeviceId(): string {
  const key = '2xko-device-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export const MATCHUP_PLAYER_ID = 'player';

export const DEFAULT_MATCHUP_TABS: SectionTab[] = [
  { id: 'general', label: 'General' },
  { id: 'round_start', label: 'Round Start' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'punishes', label: 'Punishes' },
  { id: 'assists', label: 'Assists' },
  { id: 'notes', label: 'Notes' },
  { id: 'checklist', label: 'Checklist' },
];

export const DEFAULT_COMBO_TABS: SectionTab[] = [
  { id: 'round_start', label: 'Round Start' },
  { id: 'midscreen', label: 'Midscreen' },
  { id: 'corner', label: 'Corner' },
  { id: 'corner_carry', label: 'Corner Carry' },
  { id: 'oki', label: 'Oki' },
  { id: 'assists', label: 'Assists' },
  { id: 'fury', label: 'Fury' },
  { id: '1_bar', label: '1 Bar' },
  { id: '2_bar', label: '2 Bar' },
  { id: '3_bar', label: '3 Bar' },
  { id: 'tod', label: 'TOD' },
];

export function createEmptySection(id: string): NoteSection {
  return { id, markdown: '', checklist: [], updatedAt: new Date().toISOString() };
}

export function createSectionsFromTabs(tabs: SectionTab[]): Record<string, NoteSection> {
  return Object.fromEntries(tabs.map((t) => [t.id, createEmptySection(t.id)]));
}

export function createMatchup(characterId: string, opponentId: string, tabs: SectionTab[]): Matchup {
  return {
    id: generateId(),
    characterId,
    opponentId,
    sections: createSectionsFromTabs(tabs),
    updatedAt: new Date().toISOString(),
    revision: 1,
  };
}

export function createComboSheet(characterId: string, tabs: SectionTab[]): ComboSheet {
  return {
    id: generateId(),
    characterId,
    sections: createSectionsFromTabs(tabs),
    updatedAt: new Date().toISOString(),
  };
}

export function createSavedTeam(char1Id: string, char2Id: string): SavedTeam {
  return { id: generateId(), char1Id, char2Id, createdAt: new Date().toISOString() };
}

export function savedTeamKey(char1Id: string, char2Id: string): string {
  return [char1Id, char2Id].sort().join(':');
}

export function createTeamNote(char1Id: string, char2Id: string, tabs: SectionTab[]): TeamNote {
  return {
    id: generateId(),
    char1Id,
    char2Id,
    sections: createSectionsFromTabs(tabs),
    updatedAt: new Date().toISOString(),
  };
}

export function migrateTeamNote(note: TeamNote): TeamNote {
  const sections: Record<string, NoteSection> = {};
  for (const [id, sec] of Object.entries(note.sections ?? {})) {
    if (sec && 'checklist' in sec) {
      sections[id] = sec as NoteSection;
    } else {
      const legacy = sec as { markdown?: string; updatedAt?: string };
      sections[id] = {
        id,
        markdown: legacy.markdown ?? '',
        checklist: [],
        updatedAt: legacy.updatedAt ?? new Date().toISOString(),
      };
    }
  }
  return { ...note, sections };
}

export function createDefaultSyncMeta(): SyncMeta {
  return {
    deviceId: getDeviceId(),
    revision: 0,
    lastModified: new Date().toISOString(),
    googleConnected: false,
    googleEmail: null,
    lastSyncAt: null,
    syncStatus: 'idle',
  };
}

export function createDefaultAppData(): AppData {
  return {
    matchupTabs: DEFAULT_MATCHUP_TABS,
    comboTabs: DEFAULT_COMBO_TABS,
    matchups: [],
    comboSheets: [],
    combos: [],
    players: [],
    frameData: [],
    teamTabs: DEFAULT_TEAM_TABS,
    teamNotes: [],
    savedTeams: [],
    activeSavedTeamId: null,
    locale: 'en',
    syncMeta: createDefaultSyncMeta(),
    dismissedAnnouncements: [],
  };
}
