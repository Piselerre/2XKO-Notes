export interface Character {
  id: string;
  slug: string;
  name: string;
  archetype: string;
  image: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface SectionTab {
  id: string;
  label: string;
}

export interface NoteSection {
  id: string;
  markdown: string;
  checklist: ChecklistItem[];
  updatedAt: string;
}

export interface Matchup {
  id: string;
  characterId: string;
  opponentId: string;
  sections: Record<string, NoteSection>;
  updatedAt: string;
  revision: number;
}

export interface ComboSheet {
  id: string;
  characterId: string;
  sections: Record<string, NoteSection>;
  updatedAt: string;
}

export interface ComboEntry {
  id: string;
  characterId: string;
  category: string;
  title: string;
  markdown: string;
  checklist: ChecklistItem[];
  videoPaths: string[];
  imagePaths: string[];
  updatedAt: string;
}

export interface Player {
  id: string;
  name: string;
  mainTeam: string;
  tendencies: string;
  habits: string;
  setNotes: string;
  checklist: ChecklistItem[];
  updatedAt: string;
}

export interface FrameMove {
  id: string;
  characterId: string;
  moveName: string;
  input: string;
  startup: number | null;
  active: number | null;
  recovery: number | null;
  onBlock: number | null;
  onHit: number | null;
  notes: string;
  imported: boolean;
}

export interface TeamNote {
  id: string;
  char1Id: string;
  char2Id: string;
  sections: Record<string, NoteSection>;
  updatedAt: string;
}

export type Locale = 'en' | 'es';

export type NotesArea = 'combos' | 'matchups' | 'teams';
export type NotesViewMode = 'edit' | 'preview';

export interface SavedTeam {
  id: string;
  char1Id: string;
  char2Id: string;
  createdAt: string;
}

export interface SyncMeta {
  deviceId: string;
  revision: number;
  lastModified: string;
  googleConnected: boolean;
  googleEmail: string | null;
  lastSyncAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
}

export interface Announcement {
  id: string;
  enabled: boolean;
  priority: number;
  type: 'info' | 'warning' | 'success';
  title: string;
  body: string;
  dismissible: boolean;
  showOnce: boolean;
  expiresAt: string | null;
  link: string | null;
}

export interface AppData {
  matchupTabs: SectionTab[];
  comboTabs: SectionTab[];
  matchups: Matchup[];
  comboSheets: ComboSheet[];
  combos: ComboEntry[];
  players: Player[];
  frameData: FrameMove[];
  teamTabs: SectionTab[];
  teamNotes: TeamNote[];
  savedTeams: SavedTeam[];
  activeSavedTeamId: string | null;
  locale: Locale;
  syncMeta: SyncMeta;
  dismissedAnnouncements: string[];
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
