import { APP_VERSION } from '@/constants/version';
import { isDesktopApp } from '@/utils/isDesktopApp';
import { checkForUpdates } from '@/services/remote';
import { runUpdateCheck, type UpdateCheckReport } from '@/services/appManifest';
import { openExternal } from '@/utils/openExternal';

export interface FullUpdateReport {
  manifest: UpdateCheckReport;
  githubRelease: Awaited<ReturnType<typeof checkForUpdates>>;
}

/** Unified check: remote manifest + GitHub release. */
export async function checkAllUpdates(force = false): Promise<FullUpdateReport> {
  const [manifest, githubRelease] = await Promise.all([
    runUpdateCheck(force),
    checkForUpdates(APP_VERSION),
  ]);
  return { manifest, githubRelease };
}

/**
 * Silent in-app update (Tauri updater plugin).
 * Requires signed releases + pubkey in app-manifest / tauri.conf.
 */
export async function installAppUpdate(): Promise<'installed' | 'unavailable' | 'error'> {
  if (!isDesktopApp()) return 'unavailable';

  try {
    const updaterMod = '@tauri-apps/plugin-updater';
    const processMod = '@tauri-apps/plugin-process';
    const updater = await import(/* @vite-ignore */ updaterMod).catch(() => null) as {
      check?: () => Promise<{ available: boolean; downloadAndInstall: () => Promise<void> } | null>;
    } | null;
    if (!updater?.check) return 'unavailable';

    const update = await updater.check();
    if (!update?.available) return 'unavailable';

    await update.downloadAndInstall();
    const relaunch = await import(/* @vite-ignore */ processMod).catch(() => null) as {
      relaunch?: () => Promise<void>;
    } | null;
    await relaunch?.relaunch?.();
    return 'installed';
  } catch (e) {
    console.warn('installAppUpdate:', e);
    return 'error';
  }
}

export async function openLatestRelease(): Promise<void> {
  const result = await checkForUpdates(APP_VERSION);
  if (result.status === 'available') {
    openExternal(result.url);
  }
}
