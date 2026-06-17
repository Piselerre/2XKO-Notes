import type { BackupEntry } from './backupListTypes';

export type { BackupEntry };

export interface BackupDayGroup {
  folder: string;
  entries: BackupEntry[];
}

export interface BackupMonthGroup {
  month: string;
  days: BackupDayGroup[];
  count: number;
}

export function splitBackupEntries(entries: BackupEntry[]) {
  const archive = entries.filter((e) => e.kind === 'pre_restore');
  const dated = entries.filter((e) => e.kind !== 'pre_restore');
  return { archive, dated, months: groupDatedBackupsByMonth(dated) };
}

export function groupDatedBackupsByMonth(entries: BackupEntry[]): BackupMonthGroup[] {
  const byFolder = new Map<string, BackupEntry[]>();
  for (const entry of entries) {
    const list = byFolder.get(entry.folder) ?? [];
    list.push(entry);
    byFolder.set(entry.folder, list);
  }

  const byMonth = new Map<string, BackupDayGroup[]>();
  for (const [folder, list] of byFolder) {
    const month = folder.length >= 7 ? folder.slice(0, 7) : folder;
    const days = byMonth.get(month) ?? [];
    days.push({
      folder,
      entries: [...list].sort((a, b) => b.modified_iso.localeCompare(a.modified_iso)),
    });
    byMonth.set(month, days);
  }

  return [...byMonth.entries()]
    .map(([month, days]) => ({
      month,
      days: days.sort((a, b) => b.folder.localeCompare(a.folder)),
      count: days.reduce((total, day) => total + day.entries.length, 0),
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

export function formatMonthLabel(month: string, locale: string): string {
  const [year, mon] = month.split('-').map(Number);
  if (!year || !mon) return month;
  try {
    return new Date(year, mon - 1, 1).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return month;
  }
}
