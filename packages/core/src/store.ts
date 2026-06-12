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
  createEmptySection,
  generateId,
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

  addMatchupTab: (label: string) => void;
  removeMatchupTab: (id: string) => void;
  renameMatchupTab: (id: string, label: string) => void;
  addComboTab: (label: string) => void;
  removeComboTab: (id: string) => void;
  renameComboTab: (id: string, label: string) => void;

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
  addTeamTab: (label: string) => void;
  removeTeamTab: (id: string) => void;
  renameTeamTab: (id: string, label: string) => void;

  addSavedTeam: (char1Id: string, char2Id: string) => SavedTeam | null;
  removeSavedTeam: (id: string) => void;
  setActiveSavedTeam: (id: string | null) => void;
  setLocale: (locale: Locale) => void;
  notesViewMode: NotesViewMode;
  setNotesViewMode: (mode: NotesViewMode) => void;

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

function addSectionToAll<T extends { sections: Record<string, unknown> }>(
  items: T[],
  sectionId: string
): T[] {
  return items.map((item) => ({
    ...item,
    sections: {
      ...item.sections,
      [sectionId]: item.sections[sectionId] ?? createEmptySection(sectionId),
    },
  }));
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...createDefaultAppData(),
      saveStatus: 'saved',
      announcements: [],
      notesViewMode: 'edit',

      setSaveStatus: (status) => set({ saveStatus: status }),
      setNotesViewMode: (mode) => set({ notesViewMode: mode }),
      touchRevision: () =>
        set((s) => ({
          syncMeta: {
            ...s.syncMeta,
            revision: s.syncMeta.revision + 1,
            lastModified: new Date().toISOString(),
          },
        })),

      getOrCreateMatchup: (opponentId) => {
        const existing = get().matchups.find((m) => m.opponentId === opponentId);
        if (existing) return existing;
        const matchup = createMatchup(MATCHUP_PLAYER_ID, opponentId, get().matchupTabs);
        set((s) => ({ matchups: [...s.matchups, matchup] }));
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
        const existing = get().comboSheets.find((c) => c.characterId === characterId);
        if (existing) return existing;
        const sheet = createComboSheet(characterId, get().comboTabs);
        set((s) => ({ comboSheets: [...s.comboSheets, sheet] }));
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

      addMatchupTab: (label) => {
        const id = generateId();
        set((s) => ({
          matchupTabs: [...s.matchupTabs, { id, label }],
          matchups: addSectionToAll(s.matchups, id),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      removeMatchupTab: (id) => {
        set((s) => ({
          matchupTabs: s.matchupTabs.filter((t) => t.id !== id),
          matchups: s.matchups.map((m) => {
            const { [id]: _, ...rest } = m.sections;
            return { ...m, sections: rest };
          }),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      renameMatchupTab: (id, label) => {
        set((s) => ({
          matchupTabs: s.matchupTabs.map((t) => (t.id === id ? { ...t, label } : t)),
        }));
        debouncedSave(get().setSaveStatus);
      },

      addComboTab: (label) => {
        const id = generateId();
        set((s) => ({
          comboTabs: [...s.comboTabs, { id, label }],
          comboSheets: addSectionToAll(s.comboSheets, id),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      removeComboTab: (id) => {
        set((s) => ({
          comboTabs: s.comboTabs.filter((t) => t.id !== id),
          comboSheets: s.comboSheets.map((c) => {
            const { [id]: _, ...rest } = c.sections;
            return { ...c, sections: rest };
          }),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      renameComboTab: (id, label) => {
        set((s) => ({
          comboTabs: s.comboTabs.map((t) => (t.id === id ? { ...t, label } : t)),
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
        const existing = get().teamNotes.find(
          (t) => [t.char1Id, t.char2Id].sort().join() === [char1Id, char2Id].sort().join()
        );
        if (existing) return existing;
        const team = createTeamNote(char1Id, char2Id, get().teamTabs);
        set((s) => ({ teamNotes: [...s.teamNotes, team] }));
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

      addTeamTab: (label) => {
        const id = generateId();
        set((s) => ({
          teamTabs: [...s.teamTabs, { id, label }],
          teamNotes: addSectionToAll(s.teamNotes, id),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      removeTeamTab: (id) => {
        set((s) => ({
          teamTabs: s.teamTabs.filter((t) => t.id !== id),
          teamNotes: s.teamNotes.map((t) => {
            const { [id]: _, ...rest } = t.sections;
            return { ...t, sections: rest };
          }),
        }));
        get().touchRevision();
        debouncedSave(get().setSaveStatus);
      },

      renameTeamTab: (id, label) => {
        set((s) => ({
          teamTabs: s.teamTabs.map((t) => (t.id === id ? { ...t, label } : t)),
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
          frameData, teamNotes, savedTeams, activeSavedTeamId, locale, syncMeta, dismissedAnnouncements,
        } = state;
        return {
          matchupTabs, comboTabs, teamTabs, matchups, comboSheets, combos, players,
          frameData, teamNotes, savedTeams, activeSavedTeamId, locale, syncMeta, dismissedAnnouncements,
        };
      },

      importData: (data) => {
        const notes = (data.teamNotes ?? []).map((n) => migrateTeamNote(n as TeamNote));
        set({
          matchupTabs: data.matchupTabs ?? DEFAULT_MATCHUP_TABS,
          comboTabs: data.comboTabs ?? DEFAULT_COMBO_TABS,
          teamTabs: data.teamTabs ?? DEFAULT_TEAM_TABS,
          matchups: data.matchups ?? [],
          comboSheets: data.comboSheets ?? [],
          combos: data.combos ?? [],
          players: data.players ?? [],
          frameData: data.frameData ?? [],
          teamNotes: notes,
          savedTeams: data.savedTeams ?? [],
          activeSavedTeamId: data.activeSavedTeamId ?? null,
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
        locale: state.locale,
        syncMeta: state.syncMeta,
        dismissedAnnouncements: state.dismissedAnnouncements,
        notesViewMode: state.notesViewMode,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppData> & {
          notesViewMode?: NotesViewMode | Record<string, NotesViewMode>;
        };
        const teamNotes = (p?.teamNotes ?? []).map((n) => migrateTeamNote(n));
        return {
          ...current,
          ...p,
          matchupTabs: p?.matchupTabs ?? DEFAULT_MATCHUP_TABS,
          comboTabs: p?.comboTabs ?? DEFAULT_COMBO_TABS,
          teamTabs: p?.teamTabs ?? DEFAULT_TEAM_TABS,
          comboSheets: p?.comboSheets ?? [],
          teamNotes,
          savedTeams: p?.savedTeams ?? [],
          activeSavedTeamId: p?.activeSavedTeamId ?? null,
          locale: p?.locale ?? 'en',
          notesViewMode:
            p?.notesViewMode === 'preview' || p?.notesViewMode === 'edit'
              ? p.notesViewMode
              : current.notesViewMode,
        };
      },
    }
  )
);
