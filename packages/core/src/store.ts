import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppData,
  ComboSheet,
  Matchup,
  Player,
  SaveStatus,
  TeamNote,
  SavedTeam,
  Announcement,
  ChecklistItem,
  Locale,
  NotesViewMode,
  NotesLayoutMode,
  SectionTab,
} from './types';
import {
  createDefaultAppData,
  createDefaultSyncMeta,
  createMatchup,
  createComboSheet,
  createTeamNote,
  createSavedTeam,
  savedTeamKey,
  migrateTeamNote,
  migrateComboSheet,
  migrateMatchup,
  createEmptySection,
  generateId,
  cloneTabs,
  MATCHUP_PLAYER_ID,
  DEFAULT_MATCHUP_TABS,
  DEFAULT_COMBO_TABS,
  DEFAULT_TEAM_TABS,
} from './defaults';

interface AppStore extends AppData {
  saveStatus: SaveStatus;
  announcements: Announcement[];

  setSaveStatus: (status: SaveStatus) => void;
  touchRevision: () => void;

  getOrCreateMatchup: (opponentId: string) => Matchup;
  updateMatchupSection: (
    matchupId: string,
    sectionId: string,
    data: Partial<{ markdown: string; checklist: ChecklistItem[] }>
  ) => void;

  getOrCreateComboSheet: (characterId: string) => ComboSheet;
  updateComboSection: (
    sheetId: string,
    sectionId: string,
    data: Partial<{ markdown: string; checklist: ChecklistItem[] }>
  ) => void;

  addMatchupTab: (matchupId: string, label: string) => void;
  removeMatchupTab: (matchupId: string, id: string) => void;
  renameMatchupTab: (matchupId: string, id: string, label: string) => void;
  reorderMatchupTabs: (matchupId: string, fromIndex: number, toIndex: number) => void;
  addComboTab: (sheetId: string, label: string) => void;
  removeComboTab: (sheetId: string, id: string) => void;
  renameComboTab: (sheetId: string, id: string, label: string) => void;
  reorderComboTabs: (sheetId: string, fromIndex: number, toIndex: number) => void;

  addPlayer: () => Player;
  updatePlayer: (id: string, data: Partial<Player>) => void;
  deletePlayer: (id: string) => void;

  addTeamNote: (char1Id: string, char2Id: string) => TeamNote;
  updateTeamSection: (
    teamId: string,
    sectionId: string,
    data: Partial<{ markdown: string; checklist: ChecklistItem[] }>
  ) => void;
  deleteTeamNote: (id: string) => void;
  addTeamTab: (teamNoteId: string, label: string) => void;
  removeTeamTab: (teamNoteId: string, id: string) => void;
  renameTeamTab: (teamNoteId: string, id: string, label: string) => void;
  reorderTeamTabs: (teamNoteId: string, fromIndex: number, toIndex: number) => void;

  addSavedTeam: (char1Id: string, char2Id: string) => SavedTeam | null;
  updateSavedTeam: (teamId: string, char1Id: string, char2Id: string) => SavedTeam | null;
  removeSavedTeam: (id: string) => void;
  setActiveSavedTeam: (id: string | null) => void;

  addComboInstance: (characterId: string, label: string) => ComboSheet;
  renameComboInstance: (sheetId: string, label: string) => void;
  removeComboInstance: (sheetId: string) => void;
  setActiveComboSheet: (characterId: string, sheetId: string) => void;

  addMatchupInstance: (opponentId: string, label: string) => Matchup;
  renameMatchupInstance: (matchupId: string, label: string) => void;
  removeMatchupInstance: (matchupId: string) => void;
  setActiveMatchup: (opponentId: string, matchupId: string) => void;

  addTeamNoteInstance: (char1Id: string, char2Id: string, label: string) => TeamNote;
  renameTeamNoteInstance: (teamNoteId: string, label: string) => void;
  removeTeamNoteInstance: (teamNoteId: string) => void;
  setActiveTeamNote: (pairKey: string, teamNoteId: string) => void;

  setLocale: (locale: Locale) => void;
  notesViewMode: NotesViewMode;
  notesLayoutMode: NotesLayoutMode;
  uiScale: number;
  setNotesViewMode: (mode: NotesViewMode) => void;
  setNotesLayoutMode: (mode: NotesLayoutMode) => void;
  setUiScale: (scale: number) => void;

  setGoogleConnected: (connected: boolean, email?: string | null) => void;
  setDriveIds: (folderId: string | null, fileId: string | null) => void;
  setLastSyncAt: (iso: string | null) => void;
  setSyncStatus: (status: AppData['syncMeta']['syncStatus']) => void;
  dismissAnnouncement: (id: string) => void;
  setAnnouncements: (announcements: Announcement[]) => void;

  exportData: () => AppData;
  importData: (data: Partial<AppData>) => void;
}

const debouncedSave = (() => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (setStatus: (s: SaveStatus) => void) => {
    setStatus('saving');
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => setStatus('saved'), 300);
  };
})();

function reorderTabsList(tabs: SectionTab[], fromIndex: number, toIndex: number): SectionTab[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= tabs.length || toIndex >= tabs.length) {
    return tabs;
  }
  const next = [...tabs];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function templateTabsForCombo(sheets: ComboSheet[], characterId: string, activeId?: string): SectionTab[] {
  const active = activeId ? sheets.find((s) => s.id === activeId) : undefined;
  const sibling = active ?? sheets.find((s) => s.characterId === characterId);
  return cloneTabs(sibling?.tabs ?? DEFAULT_COMBO_TABS);
}

function templateTabsForMatchup(matchups: Matchup[], opponentId: string, activeId?: string): SectionTab[] {
  const active = activeId ? matchups.find((m) => m.id === activeId) : undefined;
  const sibling = active ?? matchups.find((m) => m.opponentId === opponentId);
  return cloneTabs(sibling?.tabs ?? DEFAULT_MATCHUP_TABS);
}

function templateTabsForTeam(notes: TeamNote[], pairKey: string, activeId?: string): SectionTab[] {
  const active = activeId ? notes.find((n) => n.id === activeId) : undefined;
  const sibling =
    active ??
    notes.find((n) => savedTeamKey(n.char1Id, n.char2Id) === pairKey);
  return cloneTabs(sibling?.tabs ?? DEFAULT_TEAM_TABS);
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...createDefaultAppData(),
      saveStatus: 'saved',
      announcements: [],
      notesViewMode: 'edit',
      notesLayoutMode: 'tabs',
      uiScale: 100,

      setSaveStatus: (status) => set({ saveStatus: status }),
      setNotesViewMode: (mode) => set({ notesViewMode: mode }),
      setNotesLayoutMode: (mode) => set({ notesLayoutMode: mode }),
      setUiScale: (scale) => set({ uiScale: scale }),
      touchRevision: () =>
        set((s) => ({
          syncMeta: {
            ...s.syncMeta,
            revision: s.syncMeta.revision + 1,
            lastModified: new Date().toISOString(),
          },
        })),

      getOrCreateMatchup: (opponentId) => {
        const activeId = get().activeMatchupIds[opponentId];
        const active = activeId ? get().matchups.find((m) => m.id === activeId) : undefined;
        if (active) return active;
        const existing = get().matchups.find((m) => m.opponentId === opponentId);
        if (existing) return existing;
        const matchup = createMatchup(MATCHUP_PLAYER_ID, opponentId, DEFAULT_MATCHUP_TABS);
        set((s) => ({
          matchups: [...s.matchups, matchup],
          activeMatchupIds: { ...s.activeMatchupIds, [opponentId]: matchup.id },
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
        return matchup;
      },

      updateMatchupSection: (matchupId, sectionId, data) => {
        set((s) => ({
          matchups: s.matchups.map((m) => {
            if (m.id !== matchupId) return m;
            const sec = m.sections[sectionId] ?? createEmptySection(sectionId);
            return {
              ...m,
              sections: {
                ...m.sections,
                [sectionId]: { ...sec, ...data, updatedAt: new Date().toISOString() },
              },
              updatedAt: new Date().toISOString(),
              revision: m.revision + 1,
            };
          }),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      getOrCreateComboSheet: (characterId) => {
        const activeId = get().activeComboSheetIds[characterId];
        const active = activeId ? get().comboSheets.find((c) => c.id === activeId) : undefined;
        if (active) return active;
        const existing = get().comboSheets.find((c) => c.characterId === characterId);
        if (existing) return existing;
        const sheet = createComboSheet(characterId, DEFAULT_COMBO_TABS);
        set((s) => ({
          comboSheets: [...s.comboSheets, sheet],
          activeComboSheetIds: { ...s.activeComboSheetIds, [characterId]: sheet.id },
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
        return sheet;
      },

      updateComboSection: (sheetId, sectionId, data) => {
        set((s) => ({
          comboSheets: s.comboSheets.map((c) => {
            if (c.id !== sheetId) return c;
            const sec = c.sections[sectionId] ?? createEmptySection(sectionId);
            return {
              ...c,
              sections: {
                ...c.sections,
                [sectionId]: { ...sec, ...data, updatedAt: new Date().toISOString() },
              },
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      addMatchupTab: (matchupId, label) => {
        const id = generateId();
        set((s) => ({
          matchups: s.matchups.map((m) =>
            m.id === matchupId
              ? {
                  ...m,
                  tabs: [...m.tabs, { id, label }],
                  sections: { ...m.sections, [id]: createEmptySection(id) },
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      removeMatchupTab: (matchupId, id) => {
        set((s) => ({
          matchups: s.matchups.map((m) => {
            if (m.id !== matchupId) return m;
            const { [id]: _, ...rest } = m.sections;
            return {
              ...m,
              tabs: m.tabs.filter((t) => t.id !== id),
              sections: rest,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      renameMatchupTab: (matchupId, id, label) => {
        set((s) => ({
          matchups: s.matchups.map((m) =>
            m.id === matchupId
              ? { ...m, tabs: m.tabs.map((t) => (t.id === id ? { ...t, label } : t)) }
              : m
          ),
        }));
        debouncedSave(get().setSaveStatus);
      },

      reorderMatchupTabs: (matchupId, fromIndex, toIndex) => {
        set((s) => ({
          matchups: s.matchups.map((m) =>
            m.id === matchupId ? { ...m, tabs: reorderTabsList(m.tabs, fromIndex, toIndex) } : m
          ),
        }));
        debouncedSave(get().setSaveStatus);
      },

      addComboTab: (sheetId, label) => {
        const id = generateId();
        set((s) => ({
          comboSheets: s.comboSheets.map((c) =>
            c.id === sheetId
              ? {
                  ...c,
                  tabs: [...c.tabs, { id, label }],
                  sections: { ...c.sections, [id]: createEmptySection(id) },
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      removeComboTab: (sheetId, id) => {
        set((s) => ({
          comboSheets: s.comboSheets.map((c) => {
            if (c.id !== sheetId) return c;
            const { [id]: _, ...rest } = c.sections;
            return {
              ...c,
              tabs: c.tabs.filter((t) => t.id !== id),
              sections: rest,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      renameComboTab: (sheetId, id, label) => {
        set((s) => ({
          comboSheets: s.comboSheets.map((c) =>
            c.id === sheetId
              ? { ...c, tabs: c.tabs.map((t) => (t.id === id ? { ...t, label } : t)) }
              : c
          ),
        }));
        debouncedSave(get().setSaveStatus);
      },

      reorderComboTabs: (sheetId, fromIndex, toIndex) => {
        set((s) => ({
          comboSheets: s.comboSheets.map((c) =>
            c.id === sheetId ? { ...c, tabs: reorderTabsList(c.tabs, fromIndex, toIndex) } : c
          ),
        }));
        debouncedSave(get().setSaveStatus);
      },

      addPlayer: () => {
        const player: Player = {
          id: generateId(),
          name: 'Nuevo jugador',
          mainTeam: '',
          tendencies: '',
          habits: '',
          setNotes: '',
          checklist: [],
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ players: [...s.players, player] }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
        return player;
      },

      updatePlayer: (id, data) => {
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          ),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      deletePlayer: (id) => {
        set((s) => ({ players: s.players.filter((p) => p.id !== id) }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      addTeamNote: (char1Id, char2Id) => {
        const key = savedTeamKey(char1Id, char2Id);
        const activeId = get().activeTeamNoteIds[key];
        const active = activeId ? get().teamNotes.find((t) => t.id === activeId) : undefined;
        if (active) return active;
        const existing = get().teamNotes.find(
          (t) => savedTeamKey(t.char1Id, t.char2Id) === key
        );
        if (existing) return existing;
        const team = createTeamNote(char1Id, char2Id, templateTabsForTeam(get().teamNotes, key));
        set((s) => ({
          teamNotes: [...s.teamNotes, team],
          activeTeamNoteIds: { ...s.activeTeamNoteIds, [key]: team.id },
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
        return team;
      },

      updateTeamSection: (teamId, sectionId, data) => {
        set((s) => ({
          teamNotes: s.teamNotes.map((t) => {
            if (t.id !== teamId) return t;
            const sec = t.sections[sectionId] ?? createEmptySection(sectionId);
            return {
              ...t,
              sections: {
                ...t.sections,
                [sectionId]: { ...sec, ...data, updatedAt: new Date().toISOString() },
              },
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      addTeamTab: (teamNoteId, label) => {
        const id = generateId();
        set((s) => ({
          teamNotes: s.teamNotes.map((t) =>
            t.id === teamNoteId
              ? {
                  ...t,
                  tabs: [...t.tabs, { id, label }],
                  sections: { ...t.sections, [id]: createEmptySection(id) },
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      removeTeamTab: (teamNoteId, id) => {
        set((s) => ({
          teamNotes: s.teamNotes.map((t) => {
            if (t.id !== teamNoteId) return t;
            const { [id]: _, ...rest } = t.sections;
            return {
              ...t,
              tabs: t.tabs.filter((tab) => tab.id !== id),
              sections: rest,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      renameTeamTab: (teamNoteId, id, label) => {
        set((s) => ({
          teamNotes: s.teamNotes.map((t) =>
            t.id === teamNoteId
              ? { ...t, tabs: t.tabs.map((tab) => (tab.id === id ? { ...tab, label } : tab)) }
              : t
          ),
        }));
        debouncedSave(get().setSaveStatus);
      },

      reorderTeamTabs: (teamNoteId, fromIndex, toIndex) => {
        set((s) => ({
          teamNotes: s.teamNotes.map((t) =>
            t.id === teamNoteId ? { ...t, tabs: reorderTabsList(t.tabs, fromIndex, toIndex) } : t
          ),
        }));
        debouncedSave(get().setSaveStatus);
      },

      deleteTeamNote: (id) => {
        set((s) => ({ teamNotes: s.teamNotes.filter((t) => t.id !== id) }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      addSavedTeam: (char1Id, char2Id) => {
        if (char1Id === char2Id) return null;
        const key = savedTeamKey(char1Id, char2Id);
        const existing = get().savedTeams.find(
          (t) => savedTeamKey(t.char1Id, t.char2Id) === key
        );
        if (existing) {
          get().addTeamNote(char1Id, char2Id);
          set({ activeSavedTeamId: existing.id });
          return existing;
        }
        const team = createSavedTeam(char1Id, char2Id);
        set((s) => ({
          savedTeams: [...s.savedTeams, team],
          activeSavedTeamId: team.id,
        }));
        get().addTeamNote(char1Id, char2Id);
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
        return team;
      },

      removeSavedTeam: (id) => {
        set((s) => ({
          savedTeams: s.savedTeams.filter((t) => t.id !== id),
          activeSavedTeamId: s.activeSavedTeamId === id ? null : s.activeSavedTeamId,
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      setActiveSavedTeam: (id) => {
        set({ activeSavedTeamId: id });
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      updateSavedTeam: (teamId, char1Id, char2Id) => {
        if (char1Id === char2Id) return null;
        const oldTeam = get().savedTeams.find((t) => t.id === teamId);
        if (!oldTeam) return null;
        const oldKey = savedTeamKey(oldTeam.char1Id, oldTeam.char2Id);
        const newKey = savedTeamKey(char1Id, char2Id);
        const clash = get().savedTeams.find(
          (t) => t.id !== teamId && savedTeamKey(t.char1Id, t.char2Id) === newKey
        );
        if (clash) return null;
        const updated = get().savedTeams.map((t) =>
          t.id === teamId ? { ...t, char1Id, char2Id } : t
        );
        set((s) => {
          const activeTeamNoteIds = { ...s.activeTeamNoteIds };
          if (oldKey !== newKey) {
            if (activeTeamNoteIds[oldKey]) {
              activeTeamNoteIds[newKey] = activeTeamNoteIds[oldKey];
              delete activeTeamNoteIds[oldKey];
            }
          }
          return {
            savedTeams: updated,
            teamNotes: s.teamNotes.map((note) =>
              savedTeamKey(note.char1Id, note.char2Id) === oldKey
                ? { ...note, char1Id, char2Id }
                : note
            ),
            activeTeamNoteIds,
          };
        });
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
        return updated.find((t) => t.id === teamId) ?? null;
      },

      addComboInstance: (characterId, label) => {
        const sheet = createComboSheet(
          characterId,
          templateTabsForCombo(get().comboSheets, characterId),
          label.trim() || 'Main'
        );
        set((s) => ({
          comboSheets: [...s.comboSheets, sheet],
          activeComboSheetIds: { ...s.activeComboSheetIds, [characterId]: sheet.id },
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
        return sheet;
      },

      renameComboInstance: (sheetId, label) => {
        set((s) => ({
          comboSheets: s.comboSheets.map((c) =>
            c.id === sheetId ? { ...c, label: label.trim() || c.label } : c
          ),
        }));
        debouncedSave(get().setSaveStatus);
      },

      removeComboInstance: (sheetId) => {
        const sheet = get().comboSheets.find((c) => c.id === sheetId);
        if (!sheet) return;
        const siblings = get().comboSheets.filter((c) => c.characterId === sheet.characterId);
        if (siblings.length <= 1) return;
        const next = siblings.find((c) => c.id !== sheetId);
        set((s) => ({
          comboSheets: s.comboSheets.filter((c) => c.id !== sheetId),
          activeComboSheetIds: {
            ...s.activeComboSheetIds,
            [sheet.characterId]:
              s.activeComboSheetIds[sheet.characterId] === sheetId && next
                ? next.id
                : s.activeComboSheetIds[sheet.characterId],
          },
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      setActiveComboSheet: (characterId, sheetId) => {
        set((s) => ({
          activeComboSheetIds: { ...s.activeComboSheetIds, [characterId]: sheetId },
        }));
        debouncedSave(get().setSaveStatus);
      },

      addMatchupInstance: (opponentId, label) => {
        const matchup = createMatchup(
          MATCHUP_PLAYER_ID,
          opponentId,
          templateTabsForMatchup(get().matchups, opponentId),
          label.trim() || 'Main'
        );
        set((s) => ({
          matchups: [...s.matchups, matchup],
          activeMatchupIds: { ...s.activeMatchupIds, [opponentId]: matchup.id },
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
        return matchup;
      },

      renameMatchupInstance: (matchupId, label) => {
        set((s) => ({
          matchups: s.matchups.map((m) =>
            m.id === matchupId ? { ...m, label: label.trim() || m.label } : m
          ),
        }));
        debouncedSave(get().setSaveStatus);
      },

      removeMatchupInstance: (matchupId) => {
        const matchup = get().matchups.find((m) => m.id === matchupId);
        if (!matchup) return;
        const siblings = get().matchups.filter((m) => m.opponentId === matchup.opponentId);
        if (siblings.length <= 1) return;
        const next = siblings.find((m) => m.id !== matchupId);
        set((s) => ({
          matchups: s.matchups.filter((m) => m.id !== matchupId),
          activeMatchupIds: {
            ...s.activeMatchupIds,
            [matchup.opponentId]:
              s.activeMatchupIds[matchup.opponentId] === matchupId && next
                ? next.id
                : s.activeMatchupIds[matchup.opponentId],
          },
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      setActiveMatchup: (opponentId, matchupId) => {
        set((s) => ({
          activeMatchupIds: { ...s.activeMatchupIds, [opponentId]: matchupId },
        }));
        debouncedSave(get().setSaveStatus);
      },

      addTeamNoteInstance: (char1Id, char2Id, label) => {
        const key = savedTeamKey(char1Id, char2Id);
        const team = createTeamNote(
          char1Id,
          char2Id,
          templateTabsForTeam(get().teamNotes, key),
          label.trim() || 'Main'
        );
        set((s) => ({
          teamNotes: [...s.teamNotes, team],
          activeTeamNoteIds: { ...s.activeTeamNoteIds, [key]: team.id },
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
        return team;
      },

      renameTeamNoteInstance: (teamNoteId, label) => {
        set((s) => ({
          teamNotes: s.teamNotes.map((t) =>
            t.id === teamNoteId ? { ...t, label: label.trim() || t.label } : t
          ),
        }));
        debouncedSave(get().setSaveStatus);
      },

      removeTeamNoteInstance: (teamNoteId) => {
        const note = get().teamNotes.find((t) => t.id === teamNoteId);
        if (!note) return;
        const key = savedTeamKey(note.char1Id, note.char2Id);
        const siblings = get().teamNotes.filter(
          (t) => savedTeamKey(t.char1Id, t.char2Id) === key
        );
        if (siblings.length <= 1) return;
        const next = siblings.find((t) => t.id !== teamNoteId);
        set((s) => ({
          teamNotes: s.teamNotes.filter((t) => t.id !== teamNoteId),
          activeTeamNoteIds: {
            ...s.activeTeamNoteIds,
            [key]:
              s.activeTeamNoteIds[key] === teamNoteId && next
                ? next.id
                : s.activeTeamNoteIds[key],
          },
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      setActiveTeamNote: (pairKey, teamNoteId) => {
        set((s) => ({
          activeTeamNoteIds: { ...s.activeTeamNoteIds, [pairKey]: teamNoteId },
        }));
        debouncedSave(get().setSaveStatus);
      },

      setLocale: (locale) => {
        set({ locale });
        document.documentElement.lang = locale;
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      setGoogleConnected: (connected, email = null) =>
        set((s) => ({
          syncMeta: {
            ...s.syncMeta,
            googleConnected: connected,
            googleEmail: email ?? null,
            ...(connected
              ? {}
              : { driveFolderId: null, driveFileId: null, lastSyncAt: null, syncStatus: 'idle' as const }),
          },
        })),

      setDriveIds: (folderId, fileId) =>
        set((s) => ({
          syncMeta: { ...s.syncMeta, driveFolderId: folderId, driveFileId: fileId },
        })),

      setLastSyncAt: (iso) =>
        set((s) => ({ syncMeta: { ...s.syncMeta, lastSyncAt: iso } })),

      setSyncStatus: (status) =>
        set((s) => ({ syncMeta: { ...s.syncMeta, syncStatus: status } })),

      dismissAnnouncement: (id) =>
        set((s) => ({ dismissedAnnouncements: [...s.dismissedAnnouncements, id] })),

      setAnnouncements: (announcements) => set({ announcements }),

      exportData: () => {
        const state = get();
        const {
          matchupTabs, comboTabs, teamTabs, matchups, comboSheets, combos, players,
          frameData, teamNotes, savedTeams, activeSavedTeamId,
          activeComboSheetIds, activeMatchupIds, activeTeamNoteIds,
          locale, syncMeta, dismissedAnnouncements,
        } = state;
        return {
          matchupTabs, comboTabs, teamTabs, matchups, comboSheets, combos, players,
          frameData, teamNotes, savedTeams, activeSavedTeamId,
          activeComboSheetIds, activeMatchupIds, activeTeamNoteIds,
          locale, syncMeta, dismissedAnnouncements,
        };
      },

      importData: (data) => {
        const globalMatchupTabs = data.matchupTabs ?? DEFAULT_MATCHUP_TABS;
        const globalComboTabs = data.comboTabs ?? DEFAULT_COMBO_TABS;
        const globalTeamTabs = data.teamTabs ?? DEFAULT_TEAM_TABS;
        const teamNotes = (data.teamNotes ?? []).map((n) =>
          migrateTeamNote(n as TeamNote, globalTeamTabs)
        );
        const comboSheets = (data.comboSheets ?? []).map((s) =>
          migrateComboSheet(s as ComboSheet, globalComboTabs)
        );
        const matchups = (data.matchups ?? []).map((m) =>
          migrateMatchup(m as Matchup, globalMatchupTabs)
        );
        set({
          matchupTabs: globalMatchupTabs,
          comboTabs: globalComboTabs,
          teamTabs: globalTeamTabs,
          matchups,
          comboSheets,
          combos: data.combos ?? [],
          players: data.players ?? [],
          frameData: data.frameData ?? [],
          teamNotes,
          savedTeams: data.savedTeams ?? [],
          activeSavedTeamId: data.activeSavedTeamId ?? null,
          activeComboSheetIds: data.activeComboSheetIds ?? {},
          activeMatchupIds: data.activeMatchupIds ?? {},
          activeTeamNoteIds: data.activeTeamNoteIds ?? {},
          locale: data.locale ?? 'en',
          syncMeta: { ...createDefaultSyncMeta(), ...(data.syncMeta ?? {}) },
          dismissedAnnouncements: data.dismissedAnnouncements ?? [],
        });
        document.documentElement.lang = data.locale ?? 'en';
      },
    }),
    {
      name: '2xko-notes-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        matchupTabs: state.matchupTabs,
        comboTabs: state.comboTabs,
        teamTabs: state.teamTabs,
        matchups: state.matchups,
        comboSheets: state.comboSheets,
        combos: state.combos,
        players: state.players,
        frameData: state.frameData,
        teamNotes: state.teamNotes,
        savedTeams: state.savedTeams,
        activeSavedTeamId: state.activeSavedTeamId,
        activeComboSheetIds: state.activeComboSheetIds,
        activeMatchupIds: state.activeMatchupIds,
        activeTeamNoteIds: state.activeTeamNoteIds,
        locale: state.locale,
        syncMeta: state.syncMeta,
        dismissedAnnouncements: state.dismissedAnnouncements,
        notesViewMode: state.notesViewMode,
        notesLayoutMode: state.notesLayoutMode,
        uiScale: state.uiScale,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppData> & {
          notesViewMode?: NotesViewMode | Record<string, NotesViewMode>;
          notesLayoutMode?: NotesLayoutMode;
          uiScale?: number;
        };
        const globalMatchupTabs = p?.matchupTabs ?? DEFAULT_MATCHUP_TABS;
        const globalComboTabs = p?.comboTabs ?? DEFAULT_COMBO_TABS;
        const globalTeamTabs = p?.teamTabs ?? DEFAULT_TEAM_TABS;
        const teamNotes = (p?.teamNotes ?? []).map((n) => migrateTeamNote(n, globalTeamTabs));
        const comboSheets = (p?.comboSheets ?? []).map((s) => migrateComboSheet(s, globalComboTabs));
        const matchups = (p?.matchups ?? []).map((m) => migrateMatchup(m, globalMatchupTabs));
        return {
          ...current,
          ...p,
          matchupTabs: p?.matchupTabs ?? DEFAULT_MATCHUP_TABS,
          comboTabs: p?.comboTabs ?? DEFAULT_COMBO_TABS,
          teamTabs: p?.teamTabs ?? DEFAULT_TEAM_TABS,
          comboSheets,
          matchups,
          teamNotes,
          savedTeams: p?.savedTeams ?? [],
          activeSavedTeamId: p?.activeSavedTeamId ?? null,
          activeComboSheetIds: p?.activeComboSheetIds ?? {},
          activeMatchupIds: p?.activeMatchupIds ?? {},
          activeTeamNoteIds: p?.activeTeamNoteIds ?? {},
          locale: p?.locale ?? 'en',
          notesViewMode:
            p?.notesViewMode === 'preview' || p?.notesViewMode === 'edit'
              ? p.notesViewMode
              : current.notesViewMode,
          notesLayoutMode:
            p?.notesLayoutMode === 'tabs' || p?.notesLayoutMode === 'stacked'
              ? p.notesLayoutMode
              : current.notesLayoutMode,
          uiScale: typeof p?.uiScale === 'number' ? p.uiScale : current.uiScale,
        };
      },
    }
  )
);
