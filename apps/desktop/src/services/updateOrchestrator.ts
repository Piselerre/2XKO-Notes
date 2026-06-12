import { APP_VERSION } from '@/constants/version';
import { isDesktopApp } from '@/utils/isDesktopApp';
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
  | { kind: 'binary'; version: string };

type PendingUpdate = {
  install: () => Promise<void>;
  version: string;
};

let pendingBinary: PendingUpdate | null = null;

function parseVersionParts(v: string): number[] {
  return v.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
}

function isNewerVersion(remote: string, current: string): boolean {
  const a = parseVersionParts(remote);
  const b = parseVersionParts(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

function isMajorBump(remote: string, current: string): boolean {
  const a = parseVersionParts(remote);
  const b = parseVersionParts(current);
  return (a[0] ?? 0) > (b[0] ?? 0) || (a[1] ?? 0) > (b[1] ?? 0);
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
    if (isDesktopApp()) {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (update) {
          return { kind: 'binary', version: update.version.replace(/^v/i, '') };
        }
      } catch (e) {
        console.warn('checkUpdatePlan (tauri):', e);
      }
    }

    const github = await checkForUpdates(currentVersion);
    if (github.status === 'available') {
      return { kind: 'binary', version: github.version };
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

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) return false;

    let downloaded = 0;
    let total = 0;

    await update.download((event) => {
      if (event.event === 'Started') {
        total = event.data.contentLength ?? 0;
        onProgress(0);
      }
      if (event.event === 'Progress') {
        downloaded += event.data.chunkLength;
        if (total > 0) {
          onProgress(Math.min(99, Math.round((downloaded / total) * 100)));
        }
      }
      if (event.event === 'Finished') {
        onProgress(100);
      }
    });

    pendingBinary = {
      version: plan.version,
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

export async function installPreparedUpdate(version: string): Promise<void> {
  if (!pendingBinary) return;
  setJustUpdatedVersion(version);
  await pendingBinary.install();
  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}

export function clearPendingBinaryUpdate(): void {
  pendingBinary = null;
}
