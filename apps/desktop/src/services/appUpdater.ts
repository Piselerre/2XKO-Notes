import { APP_VERSION } from '@/constants/version';
import { isDesktopApp } from '@/utils/isDesktopApp';
import { checkForUpdates } from '@/services/remote';
import { runUpdateCheck, type UpdateCheckReport } from '@/services/appManifest';
import { openExternal } from '@/utils/openExternal';

export interface AppUpdateOffer {
  version: string;
  source: 'tauri' | 'github';
  releaseUrl?: string;
}

export interface FullUpdateReport {
  manifest: UpdateCheckReport;
  githubRelease: Awaited<ReturnType<typeof checkForUpdates>>;
}

function normalizeVersion(version: string): string {
  return version.replace(/^v/i, '');
}

/** Unified check: remote manifest + GitHub release. */
export async function checkAllUpdates(force = false): Promise<FullUpdateReport> {
  const [manifest, githubRelease] = await Promise.all([
    runUpdateCheck(force),
    checkForUpdates(APP_VERSION),
  ]);
  return { manifest, githubRelease };
}

/** Prefer Tauri updater endpoint; fall back to GitHub Releases API. */
export async function checkForAppUpdate(): Promise<AppUpdateOffer | null> {
  if (isDesktopApp()) {
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        return {
          version: normalizeVersion(update.version),
          source: 'tauri',
          releaseUrl: `https://github.com/Piselerre/2XKO-Notes/releases/latest`,
        };
      }
    } catch (e) {
      console.warn('checkForAppUpdate (tauri):', e);
    }
  }

  const github = await checkForUpdates(APP_VERSION);
  if (github.status === 'available') {
    return {
      version: normalizeVersion(github.version),
      source: 'github',
      releaseUrl: github.url,
    };
  }

  return null;
}

/**
 * Download, install, and relaunch via the Tauri updater plugin.
 * Falls back to opening the release page when the plugin is unavailable.
 */
export async function installAppUpdate(
  offer: AppUpdateOffer
): Promise<'installed' | 'opened' | 'unavailable' | 'error'> {
  if (!isDesktopApp()) return 'unavailable';

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (update) {
      const { setJustUpdatedVersion } = await import('@/utils/updatePreferences');
      setJustUpdatedVersion(normalizeVersion(update.version));
      await update.downloadAndInstall();
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
      return 'installed';
    }
  } catch (e) {
    console.warn('installAppUpdate (tauri):', e);
  }

  if (offer.releaseUrl) {
    openExternal(offer.releaseUrl);
    return 'opened';
  }

  return 'unavailable';
}

export async function openLatestRelease(): Promise<void> {
  const result = await checkForUpdates(APP_VERSION);
  if (result.status === 'available') {
    openExternal(result.url);
  }
}
