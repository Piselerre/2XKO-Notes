import type { AppData, ChecklistItem, ComboSheet, Matchup, TeamNote } from '@2xko/core';
import {
  DEFAULT_COMBO_TABS,
  DEFAULT_MATCHUP_TABS,
  DEFAULT_TEAM_TABS,
  migrateComboSheet,
  migrateMatchup,
  migrateTeamNote,
  savedTeamKey,
} from '@2xko/core';

import { getCharacter } from '@/data/manifest';

export function normalizeBackupData(data: AppData): AppData {
  const globalMatchupTabs = data.matchupTabs ?? DEFAULT_MATCHUP_TABS;
  const globalComboTabs = data.comboTabs ?? DEFAULT_COMBO_TABS;
  const globalTeamTabs = data.teamTabs ?? DEFAULT_TEAM_TABS;
  return {
    ...data,
    comboSheets: (data.comboSheets ?? []).map((s) => migrateComboSheet(s as ComboSheet, globalComboTabs)),
    matchups: (data.matchups ?? []).map((m) => migrateMatchup(m as Matchup, globalMatchupTabs)),
    teamNotes: (data.teamNotes ?? []).map((n) => migrateTeamNote(n as TeamNote, globalTeamTabs)),
  };
}

export interface BackupDiff {
  currentRevision: number;
  backupRevision: number;
  comboSheets: { current: number; backup: number };
  matchups: { current: number; backup: number };
  teamNotes: { current: number; backup: number };
  players: { current: number; backup: number };
  savedTeams: { current: number; backup: number };
  sectionsWithContent: { current: number; backup: number };
  revisionCompare: 'newer' | 'older' | 'same';
}

function countSectionsWithContent(data: AppData): number {
  let count = 0;
  const bump = (sections: Record<string, { markdown?: string; checklist?: unknown[] }>) => {
    for (const sec of Object.values(sections ?? {})) {
      if (sec.markdown?.trim() || (sec.checklist?.length ?? 0) > 0) count++;
    }
  };
  for (const sheet of data.comboSheets ?? []) bump(sheet.sections);
  for (const matchup of data.matchups ?? []) bump(matchup.sections);
  for (const note of data.teamNotes ?? []) bump(note.sections);
  return count;
}

export function compareBackupData(current: AppData, backup: AppData): BackupDiff {
  const currentRevision = current.syncMeta?.revision ?? 0;
  const backupRevision = backup.syncMeta?.revision ?? 0;
  let revisionCompare: BackupDiff['revisionCompare'] = 'same';
  if (backupRevision > currentRevision) revisionCompare = 'newer';
  else if (backupRevision < currentRevision) revisionCompare = 'older';

  return {
    currentRevision,
    backupRevision,
    comboSheets: {
      current: current.comboSheets?.length ?? 0,
      backup: backup.comboSheets?.length ?? 0,
    },
    matchups: {
      current: current.matchups?.length ?? 0,
      backup: backup.matchups?.length ?? 0,
    },
    teamNotes: {
      current: current.teamNotes?.length ?? 0,
      backup: backup.teamNotes?.length ?? 0,
    },
    players: {
      current: current.players?.length ?? 0,
      backup: backup.players?.length ?? 0,
    },
    savedTeams: {
      current: current.savedTeams?.length ?? 0,
      backup: backup.savedTeams?.length ?? 0,
    },
    sectionsWithContent: {
      current: countSectionsWithContent(current),
      backup: countSectionsWithContent(backup),
    },
    revisionCompare,
  };
}

export type BackupAreaId = 'combos' | 'matchups' | 'teams' | 'players';

export interface BackupNavTab {
  id: string;
  label: string;
  hasContent: boolean;
  markdown: string;
  checklist: ChecklistItem[];
}

export interface BackupNavInstance {
  id: string;
  label: string;
  tabs: BackupNavTab[];
}

export interface BackupNavGroup {
  id: string;
  label: string;
  instances: BackupNavInstance[];
}

export interface BackupNavigation {
  combos: BackupNavGroup[];
  matchups: BackupNavGroup[];
  teams: BackupNavGroup[];
  players: BackupNavInstance[];
}

function charName(id: string): string {
  return getCharacter(id)?.name ?? id;
}

function tabsForInstance(
  tabs: { id: string; label: string }[],
  sections: Record<string, { markdown?: string; checklist?: ChecklistItem[] }>
): BackupNavTab[] {
  return tabs.map((tab) => {
    const sec = sections?.[tab.id];
    const markdown = sec?.markdown ?? '';
    const checklist = sec?.checklist ?? [];
    return {
      id: tab.id,
      label: tab.label,
      hasContent: !!markdown.trim() || checklist.length > 0,
      markdown,
      checklist,
    };
  });
}

export function buildBackupNavigation(data: AppData): BackupNavigation {
  const comboMap = new Map<string, ComboSheet[]>();
  for (const sheet of data.comboSheets ?? []) {
    const list = comboMap.get(sheet.characterId) ?? [];
    list.push(sheet);
    comboMap.set(sheet.characterId, list);
  }

  const combos: BackupNavGroup[] = [...comboMap.entries()]
    .map(([characterId, sheets]) => ({
      id: characterId,
      label: charName(characterId),
      instances: sheets.map((sheet) => ({
        id: sheet.id,
        label: sheet.label || 'Main',
        tabs: tabsForInstance(sheet.tabs ?? [], sheet.sections),
      })),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const matchupMap = new Map<string, Matchup[]>();
  for (const matchup of data.matchups ?? []) {
    const list = matchupMap.get(matchup.opponentId) ?? [];
    list.push(matchup);
    matchupMap.set(matchup.opponentId, list);
  }

  const matchups: BackupNavGroup[] = [...matchupMap.entries()]
    .map(([opponentId, items]) => ({
      id: opponentId,
      label: charName(opponentId),
      instances: items.map((matchup) => ({
        id: matchup.id,
        label: matchup.label || 'Main',
        tabs: tabsForInstance(matchup.tabs ?? [], matchup.sections),
      })),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const teamMap = new Map<string, TeamNote[]>();
  for (const note of data.teamNotes ?? []) {
    const key = savedTeamKey(note.char1Id, note.char2Id);
    const list = teamMap.get(key) ?? [];
    list.push(note);
    teamMap.set(key, list);
  }

  const teams: BackupNavGroup[] = [...teamMap.entries()]
    .map(([key, notes]) => {
      const first = notes[0];
      const label = `${charName(first.char1Id)} + ${charName(first.char2Id)}`;
      return {
        id: key,
        label,
        instances: notes.map((note) => ({
          id: note.id,
          label: note.label || 'Main',
          tabs: tabsForInstance(note.tabs ?? [], note.sections),
        })),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const players: BackupNavInstance[] = (data.players ?? []).map((player) => {
    const chunks = [
      player.mainTeam?.trim() ? `**Team:** ${player.mainTeam}` : '',
      player.tendencies?.trim() ? `**Tendencies:**\n${player.tendencies}` : '',
      player.habits?.trim() ? `**Habits:**\n${player.habits}` : '',
      player.setNotes?.trim() ? `**Set notes:**\n${player.setNotes}` : '',
    ].filter(Boolean);
    return {
      id: player.id,
      label: player.name,
      tabs: [
        {
          id: 'profile',
          label: 'Profile',
          hasContent: chunks.length > 0 || (player.checklist?.length ?? 0) > 0,
          markdown: chunks.join('\n\n'),
          checklist: player.checklist ?? [],
        },
      ],
    };
  });

  return { combos, matchups, teams, players };
}
