import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { useAppStore } from '@2xko/core';
import type { AppData, SyncMeta } from '@2xko/core';

import { LOCAL_SAVE_DEBOUNCE_MS } from '@/constants/autosave';
import { supportsLocalFileStorage } from '@/utils/platform';

const SYNC_FILENAME = '2xko-notes.sync.json';
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let cachedPath: string | null = null;

export function buildSyncPayload(): string {
  const data = useAppStore.getState().exportData();
  return JSON.stringify(
    { schemaVersion: 1, exportedAt: new Date().toISOString(), data },
    null,
    2
  );
}

export async function getDataFilePath(): Promise<string> {
  if (cachedPath) return cachedPath;
  if (supportsLocalFileStorage()) {
    try {
      cachedPath = await tauriInvoke<string>('get_data_file_path');
      return cachedPath;
    } catch {
      /* fallthrough */
    }
  }
  return `(navegador) localStorage → clave "2xko-notes-storage" — usa la app instalada para archivo real`;
}

export async function saveToDataFile(): Promise<string | null> {
  const json = buildSyncPayload();

  if (supportsLocalFileStorage()) {
    try {
      const path = await tauriInvoke<string>('save_data_file', { content: json });
      cachedPath = path;
      return path;
    } catch (e) {
      console.error('Error guardando archivo:', e);
      return null;
    }
  }
  return null;
}

export function scheduleFileSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveToDataFile();
    if (supportsLocalFileStorage()) {
      void import('./googleDrive').then((m) => m.scheduleDriveSync());
    }
  }, LOCAL_SAVE_DEBOUNCE_MS);
}

export function parseSyncPayload(raw: string): AppData | null {
  try {
    const parsed = JSON.parse(raw) as { data?: AppData } & AppData;
    return (parsed.data ?? parsed) as AppData;
  } catch {
    return null;
  }
}

function hasPersistedNotes(data: AppData): boolean {
  return (
    (data.syncMeta?.revision ?? 0) > 0 ||
    data.savedTeams.length > 0 ||
    data.matchups.length > 0 ||
    data.comboSheets.length > 0 ||
    data.teamNotes.length > 0 ||
    data.players.length > 0
  );
}

function pickNewer(local: AppData, fileData: AppData): 'local' | 'file' {
  if (!hasPersistedNotes(local) && hasPersistedNotes(fileData)) {
    return 'file';
  }

  const fileRev = fileData.syncMeta?.revision ?? 0;
  const localRev = local.syncMeta?.revision ?? 0;
  const fileTime = Date.parse(fileData.syncMeta?.lastModified ?? '0');
  const localTime = Date.parse(local.syncMeta?.lastModified ?? '0');

  if (fileRev > localRev || (fileRev === localRev && fileTime >= localTime)) {
    return 'file';
  }
  return 'local';
}

export function mergeAppData(remote: AppData, preserveSyncMeta?: Partial<SyncMeta>): void {
  const local = useAppStore.getState().exportData();
  const winner = pickNewer(local, remote);

  if (winner === 'file') {
    const meta = preserveSyncMeta
      ? { ...remote.syncMeta, ...preserveSyncMeta }
      : remote.syncMeta;
    useAppStore.getState().importData({ ...remote, syncMeta: meta });
  } else {
    void saveToDataFile();
  }
}

/** Carga el .json al arrancar (Tauri desktop + Android). Usa la copia con revision más alta. */
export async function loadFromDataFile(): Promise<void> {
  if (!supportsLocalFileStorage()) return;

  try {
    const content = await tauriInvoke<string>('load_data_file');
    if (!content.trim()) return;

    const fileData = parseSyncPayload(content);
    if (!fileData) return;

    mergeAppData(fileData);
  } catch (e) {
    console.warn('loadFromDataFile:', e);
  }
}

export { SYNC_FILENAME };
