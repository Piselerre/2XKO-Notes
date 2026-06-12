import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { useAppStore } from '@2xko/core';

import { DRIVE_SYNC_DEBOUNCE_MS } from '@/constants/autosave';
import { isDesktopApp } from '@/utils/isDesktopApp';
import { buildSyncPayload, mergeAppData, parseSyncPayload, saveToDataFile } from './fileStorage';

const DESKTOP_ONLY = 'Google Drive sync requires the desktop app (.exe).';

let driveTimer: ReturnType<typeof setTimeout> | null = null;
let driveSyncInFlight = false;
let driveSyncDueAt: number | null = null;
let pendingDriveSync = false;

function ensureDesktop(): void {
  if (!isDesktopApp()) {
    throw new Error(DESKTOP_ONLY);
  }
}

function clearDriveSchedule(): void {
  if (driveTimer) {
    clearTimeout(driveTimer);
    driveTimer = null;
  }
  driveSyncDueAt = null;
  pendingDriveSync = false;
}

export function getDriveSyncEtaMs(): number | null {
  if (driveSyncInFlight) return 0;
  if (!pendingDriveSync || driveSyncDueAt === null) return null;
  return Math.max(0, driveSyncDueAt - Date.now());
}

export function isDriveSyncScheduled(): boolean {
  return pendingDriveSync || driveSyncInFlight;
}

function isBenignPullError(msg: string): boolean {
  return (
    msg.includes('No sync file on Drive') ||
    msg.includes('Not connected to Google Drive')
  );
}

async function invokePush(): Promise<{ folder_id: string; file_id: string }> {
  const { syncMeta } = useAppStore.getState();
  const json = buildSyncPayload();
  return tauriInvoke<{ folder_id: string; file_id: string }>('google_drive_push', {
    content: json,
    folderId: syncMeta.driveFolderId,
    fileId: syncMeta.driveFileId,
  });
}

export async function syncGoogleDriveStatus(): Promise<void> {
  if (!isDesktopApp()) return;

  try {
    const status = await tauriInvoke<{ connected: boolean; email: string | null }>(
      'google_drive_status'
    );
    const { syncMeta, setGoogleConnected, setSyncStatus } = useAppStore.getState();
    if (status.connected) {
      setGoogleConnected(true, status.email);
      if (!syncMeta.googleConnected) {
        setSyncStatus('synced');
      }
    } else if (syncMeta.googleConnected) {
      setGoogleConnected(false);
      setSyncStatus('idle');
      clearDriveSchedule();
    }
  } catch (e) {
    console.warn('syncGoogleDriveStatus:', e);
  }
}

export async function connectGoogleDrive(): Promise<string> {
  ensureDesktop();
  const email = await tauriInvoke<string>('google_drive_connect');
  useAppStore.getState().setGoogleConnected(true, email);
  useAppStore.getState().setSyncStatus('syncing');
  await pushToGoogleDrive(true);
  return email;
}

export async function disconnectGoogleDrive(): Promise<void> {
  ensureDesktop();
  await tauriInvoke('google_drive_disconnect');
  clearDriveSchedule();
  useAppStore.getState().setGoogleConnected(false);
}

export async function pullFromGoogleDrive(silent = false): Promise<boolean> {
  if (!isDesktopApp()) return false;

  const { syncMeta, setDriveIds, setSyncStatus } = useAppStore.getState();
  if (!syncMeta.googleConnected) return false;

  if (!silent) setSyncStatus('syncing');
  try {
    const result = await tauriInvoke<{ content: string; folder_id: string; file_id: string }>(
      'google_drive_pull',
      {
        folderId: syncMeta.driveFolderId,
        fileId: syncMeta.driveFileId,
      }
    );

    const remote = parseSyncPayload(result.content);
    if (remote) {
      mergeAppData(remote, {
        googleConnected: true,
        googleEmail: syncMeta.googleEmail,
        driveFolderId: result.folder_id,
        driveFileId: result.file_id,
      });
    }

    setDriveIds(result.folder_id, result.file_id);
    setSyncStatus('synced');
    await saveToDataFile();
    return true;
  } catch (e) {
    const msg = String(e);
    if (isBenignPullError(msg)) {
      setSyncStatus('synced');
      return false;
    }
    console.warn('pullFromGoogleDrive:', e);
    setSyncStatus(navigator.onLine ? 'error' : 'offline');
    return false;
  }
}

export async function pushToGoogleDrive(force = false): Promise<boolean> {
  if (!isDesktopApp()) return false;

  const { syncMeta, setDriveIds, setSyncStatus, setLastSyncAt } = useAppStore.getState();
  if (!syncMeta.googleConnected) return false;
  if (driveSyncInFlight && !force) return false;

  clearDriveSchedule();
  driveSyncInFlight = true;
  setSyncStatus('syncing');
  try {
    const result = await invokePush();
    setDriveIds(result.folder_id, result.file_id);
    setLastSyncAt(new Date().toISOString());
    setSyncStatus('synced');
    return true;
  } catch (e) {
    console.warn('pushToGoogleDrive:', e);

    if (syncMeta.driveFileId) {
      setDriveIds(syncMeta.driveFolderId, null);
      try {
        const result = await invokePush();
        setDriveIds(result.folder_id, result.file_id);
        setLastSyncAt(new Date().toISOString());
        setSyncStatus('synced');
        return true;
      } catch (retryErr) {
        console.warn('pushToGoogleDrive retry:', retryErr);
      }
    }

    setSyncStatus(navigator.onLine ? 'error' : 'offline');
    return false;
  } finally {
    driveSyncInFlight = false;
  }
}

export function scheduleDriveSync(): void {
  const { syncMeta } = useAppStore.getState();
  if (!isDesktopApp() || !syncMeta.googleConnected) return;

  clearDriveSchedule();
  pendingDriveSync = true;
  driveSyncDueAt = Date.now() + DRIVE_SYNC_DEBOUNCE_MS;
  driveTimer = setTimeout(() => {
    pendingDriveSync = false;
    driveSyncDueAt = null;
    driveTimer = null;
    void pushToGoogleDrive();
  }, DRIVE_SYNC_DEBOUNCE_MS);
}

export async function flushDriveSync(): Promise<void> {
  if (!isDesktopApp()) return;
  if (!pendingDriveSync && !driveSyncInFlight) return;
  clearDriveSchedule();
  await pushToGoogleDrive(true);
}
