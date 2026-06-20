import { invoke } from '@tauri-apps/api/core';
import { join, tempDir } from '@tauri-apps/api/path';

import { APP_VERSION, IS_PORTABLE_BUILD, PORTABLE_CHANNEL_MIN_VERSION } from '@/constants/version';
import { PUBLIC_PORTABLE_UPDATER_URL } from '@/constants/updates';
import { isDesktopApp } from '@/utils/platform';
import {
  mergeCharacterLists,
} from '@/data/manifest';
import {
  fetchAppManifest,
  fetchRemoteCharacters,
  clearManifestCaches,
  type AppManifest,
} from '@/services/appManifest';
import { checkForUpdates } from '@/services/remote';
import { fetchAnnouncements, clearAnnouncementsCache } from '@/services/remote';
import { setJustUpdatedVersion } from '@/utils/updatePreferences';
import { isAtLeastVersion, isMajorBump, isNewerVersion } from '@/utils/versionCompare';

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'content-applied';

export type UpdatePlan =
  | { kind: 'none' }
  | { kind: 'content'; manifest: AppManifest }
  | { kind: 'binary'; version: string; silent?: boolean; zipUrl?: string; exeUrl?: string };

type PendingUpdate = {
  install: () => Promise<void>;
  version: string;
  mode: 'zip' | 'exe' | 'tauri';
};

let pendingBinary: PendingUpdate | null = null;

function canReceivePortableBinaryUpdate(currentVersion: string, remoteVersion: string): boolean {
  if (!isAtLeastVersion(remoteVersion, PORTABLE_CHANNEL_MIN_VERSION)) return true;
  return IS_PORTABLE_BUILD || isAtLeastVersion(currentVersion, PORTABLE_CHANNEL_MIN_VERSION);
}

async function fetchPortableBinaryUrl(): Promise<{ version: string; url: string; format: 'exe' | 'zip' } | null> {
  try {
    const res = await fetch(PUBLIC_PORTABLE_UPDATER_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      version?: string;
      format?: string;
      platforms?: { 'windows-x86_64'?: { url?: string } };
    };
    const version = (json.version ?? '').replace(/^v/i, '');
    const url = json.platforms?.['windows-x86_64']?.url;
    const format = json.format === 'exe' ? 'exe' : json.format === 'zip' ? 'zip' : null;
    if (!version || !url || !format) return null;
    return { version, url, format };
  } catch {
    return null;
  }
}

/** Decide whether this release needs a full installer or only remote content. */
export async function checkUpdatePlan(currentVersion: string = APP_VERSION): Promise<UpdatePlan> {
  const manifest = await fetchAppManifest(true);
  if (!manifest) return { kind: 'none' };

  const remoteVersion = manifest.app.latestVersion;
  const needsNewerApp = remoteVersion && isNewerVersion(remoteVersion, currentVersion);
  const binaryRequired =
    manifest.app.binaryUpdateRequired === true ||
    isMajorBump(remoteVersion ?? currentVersion, currentVersion);

  if (needsNewerApp && !binaryRequired) {
    return { kind: 'content', manifest };
  }

  if (needsNewerApp && binaryRequired) {
    if (!canReceivePortableBinaryUpdate(currentVersion, remoteVersion ?? currentVersion)) {
      return { kind: 'none' };
    }

    if (IS_PORTABLE_BUILD && isDesktopApp()) {
      const portable = await fetchPortableBinaryUrl();
      if (portable && isNewerVersion(portable.version, currentVersion)) {
        return {
          kind: 'binary',
          version: portable.version,
          silent: true,
          ...(portable.format === 'exe'
            ? { exeUrl: portable.url }
            : { zipUrl: portable.url }),
        };
      }
    }

    if (isDesktopApp()) {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (update) {
          return {
            kind: 'binary',
            version: update.version.replace(/^v/i, ''),
            silent: IS_PORTABLE_BUILD,
          };
        }
      } catch (e) {
        console.warn('checkUpdatePlan (tauri):', e);
      }
    }

    if (IS_PORTABLE_BUILD || isAtLeastVersion(currentVersion, PORTABLE_CHANNEL_MIN_VERSION)) {
      const github = await checkForUpdates(currentVersion);
      if (github.status === 'available') {
        return { kind: 'binary', version: github.version, silent: IS_PORTABLE_BUILD };
      }
    }
  }

  const remoteChars = await fetchRemoteCharacters(manifest.characters.url, true);
  const hasContent =
    (remoteChars && remoteChars.version !== manifest.characters.version) ||
    manifest.frontend.version !== currentVersion;

  if (hasContent) {
    return { kind: 'content', manifest };
  }

  return { kind: 'none' };
}

/** Apply roster / announcements without reinstalling (~KB, not ~100MB). */
export async function applyContentUpdates(plan: Extract<UpdatePlan, { kind: 'content' }>): Promise<boolean> {
  let changed = false;
  const remoteChars = await fetchRemoteCharacters(plan.manifest.characters.url, true);
  if (remoteChars?.characters?.length) {
    const merged = mergeCharacterLists(remoteChars.characters);
    if (merged) changed = true;
  }

  clearAnnouncementsCache();
  const announcements = await fetchAnnouncements(true);
  if (announcements.length) changed = true;

  if (changed) {
    clearManifestCaches();
  }
  return changed;
}

export async function prepareBinaryUpdate(
  plan: Extract<UpdatePlan, { kind: 'binary' }>,
  onProgress: (percent: number) => void
): Promise<boolean> {
  if (!isDesktopApp()) return false;

  if (plan.exeUrl) {
    try {
      onProgress(2);
      const dir = await tempDir();
      const exePath = await join(dir, `2xko-update-${plan.version}.exe`);
      onProgress(10);
      await invoke('download_file', { url: plan.exeUrl, dest: exePath });
      onProgress(100);
      pendingBinary = {
        version: plan.version,
        mode: 'exe',
        install: async () => {
          await invoke('apply_portable_exe_update', { newExePath: exePath });
        },
      };
      return true;
    } catch (e) {
      console.warn('prepareBinaryUpdate (exe):', e);
      pendingBinary = null;
      return false;
    }
  }

  if (plan.zipUrl) {
    try {
      onProgress(2);
      const dir = await tempDir();
      const zipPath = await join(dir, `2xko-update-${plan.version}.zip`);
      onProgress(10);
      await invoke('download_file', { url: plan.zipUrl, dest: zipPath });
      onProgress(100);
      pendingBinary = {
        version: plan.version,
        mode: 'zip',
        install: async () => {
          await invoke('apply_portable_zip_update', { zipPath });
        },
      };
      return true;
    } catch (e) {
      console.warn('prepareBinaryUpdate (zip):', e);
      pendingBinary = null;
      return false;
    }
  }

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) return false;

    let downloaded = 0;
    let total = 0;

    await update.download((event) => {
      if (event.event === 'Started') {
        total = event.data.contentLength ?? 0;
        onProgress(1);
      }
      if (event.event === 'Progress') {
        downloaded += event.data.chunkLength;
        if (total > 0) {
          onProgress(Math.min(99, Math.max(1, Math.round((downloaded / total) * 100))));
        } else {
          const est = Math.min(90, Math.round(downloaded / 500_000));
          onProgress(Math.max(1, est));
        }
      }
      if (event.event === 'Finished') {
        onProgress(100);
      }
    });

    pendingBinary = {
      version: plan.version,
      mode: 'tauri',
      install: async () => {
        await update.install();
      },
    };
    return true;
  } catch (e) {
    console.warn('prepareBinaryUpdate:', e);
    pendingBinary = null;
    return false;
  }
}

export async function installPreparedUpdate(version: string, options?: { silent?: boolean }): Promise<void> {
  if (!pendingBinary) {
    throw new Error('No pending update package');
  }
  if (!options?.silent) {
    setJustUpdatedVersion(version);
  }
  await pendingBinary.install();
  if (pendingBinary.mode === 'zip' || pendingBinary.mode === 'exe') {
    // Rust apply_* commands spawn the swap script and exit the process themselves.
    return;
  }
  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}

export function clearPendingBinaryUpdate(): void {
  pendingBinary = null;
}
