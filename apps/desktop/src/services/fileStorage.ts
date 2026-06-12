import { useAppStore } from '@2xko/core';
import type { AppData } from '@2xko/core';

const SYNC_FILENAME = '2xko-notes.sync.json';
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let cachedPath: string | null = null;

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function getDataFilePath(): Promise<string> {
  if (cachedPath) return cachedPath;
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      cachedPath = await invoke<string>('get_data_file_path');
      return cachedPath;
    } catch {
      /* fallthrough */
    }
  }
  return `(navegador) localStorage → clave "2xko-notes-storage" — usa la app .exe para archivo real`;
}

export async function saveToDataFile(): Promise<string | null> {
  const data = useAppStore.getState().exportData();
  const json = JSON.stringify(
    { schemaVersion: 1, exportedAt: new Date().toISOString(), data },
    null,
    2
  );

  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const path = await invoke<string>('save_data_file', { content: json });
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
  saveTimer = setTimeout(() => void saveToDataFile(), 500);
}

function parseSyncPayload(raw: string): AppData | null {
  try {
    const parsed = JSON.parse(raw) as { data?: AppData } & AppData;
    return (parsed.data ?? parsed) as AppData;
  } catch {
    return null;
  }
}

/** Carga el .json al arrancar (Tauri). Usa la copia con revision más alta. */
export async function loadFromDataFile(): Promise<void> {
  if (!isTauri()) return;

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const content = await invoke<string>('load_data_file');
    if (!content.trim()) return;

    const fileData = parseSyncPayload(content);
    if (!fileData) return;

    const local = useAppStore.getState().exportData();
    const fileRev = fileData.syncMeta?.revision ?? 0;
    const localRev = local.syncMeta?.revision ?? 0;
    const fileTime = Date.parse(fileData.syncMeta?.lastModified ?? '0');
    const localTime = Date.parse(local.syncMeta?.lastModified ?? '0');

    if (fileRev > localRev || (fileRev === localRev && fileTime >= localTime)) {
      useAppStore.getState().importData(fileData);
    } else {
      await saveToDataFile();
    }
  } catch (e) {
    console.warn('loadFromDataFile:', e);
  }
}

export { SYNC_FILENAME };
