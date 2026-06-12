import type { Character } from '@2xko/core';

import { APP_VERSION } from '@/constants/version';
import charactersData from '../../../../assets/manifest/characters.json';

const MANIFEST_URL =
  import.meta.env.VITE_APP_MANIFEST_URL ?? '/remote/app-manifest.json';

const MANIFEST_CACHE_KEY = '2xko-app-manifest-cache';
const CHARACTERS_CACHE_KEY = '2xko-remote-characters-cache';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface AppManifest {
  version: number;
  channel: string;
  app: { minVersion: string; latestVersion: string };
  characters: { version: string; url: string };
  announcements: { url: string };
  frontend: { version: string; bundleUrl: string | null };
  updater: { enabled: boolean; endpoints: string[]; pubkey: string | null };
}

export interface RemoteCharactersManifest {
  version: string;
  characters: Character[];
}

export interface UpdateCheckReport {
  checkedAt: string;
  appVersion: string;
  remoteAppVersion: string | null;
  charactersVersion: string;
  remoteCharactersVersion: string | null;
  newCharacters: string[];
  frontendUpdate: boolean;
  appUpdateAvailable: boolean;
  updaterEnabled: boolean;
  announcementsUrl: string | null;
}

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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

export async function fetchAppManifest(force = false): Promise<AppManifest | null> {
  if (!force) {
    const cached = localStorage.getItem(MANIFEST_CACHE_KEY);
    if (cached) {
      try {
        const { timestamp, data } = JSON.parse(cached) as { timestamp: number; data: AppManifest };
        if (Date.now() - timestamp < CHECK_INTERVAL_MS) return data;
      } catch {
        /* ignore */
      }
    }
  }

  try {
    const data = await fetchJson<AppManifest>(MANIFEST_URL);
    localStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
    return data;
  } catch (e) {
    console.warn('fetchAppManifest:', e);
    return null;
  }
}

export async function fetchRemoteCharacters(
  url: string,
  force = false
): Promise<RemoteCharactersManifest | null> {
  if (!force) {
    const cached = localStorage.getItem(CHARACTERS_CACHE_KEY);
    if (cached) {
      try {
        const { timestamp, data } = JSON.parse(cached) as {
          timestamp: number;
          data: RemoteCharactersManifest;
        };
        if (Date.now() - timestamp < CHECK_INTERVAL_MS) return data;
      } catch {
        /* ignore */
      }
    }
  }

  try {
    const data = await fetchJson<RemoteCharactersManifest>(url);
    localStorage.setItem(CHARACTERS_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
    return data;
  } catch (e) {
    console.warn('fetchRemoteCharacters:', e);
    return null;
  }
}

export async function runUpdateCheck(force = false): Promise<UpdateCheckReport> {
  const bundled = charactersData as RemoteCharactersManifest;
  const manifest = await fetchAppManifest(force);
  const remoteChars = manifest
    ? await fetchRemoteCharacters(manifest.characters.url, force)
    : null;

  const bundledIds = new Set(bundled.characters.map((c) => c.id));
  const remoteList = remoteChars?.characters ?? bundled.characters;
  const newCharacters = remoteList
    .filter((c) => !bundledIds.has(c.id))
    .map((c) => c.name);

  return {
    checkedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    remoteAppVersion: manifest?.app.latestVersion ?? null,
    charactersVersion: bundled.version,
    remoteCharactersVersion: remoteChars?.version ?? null,
    newCharacters,
    frontendUpdate: Boolean(
      manifest?.frontend.bundleUrl &&
        manifest.frontend.version &&
        isNewerVersion(manifest.frontend.version, APP_VERSION)
    ),
    appUpdateAvailable: Boolean(
      manifest?.app.latestVersion && isNewerVersion(manifest.app.latestVersion, APP_VERSION)
    ),
    updaterEnabled: manifest?.updater.enabled ?? false,
    announcementsUrl: manifest?.announcements.url ?? null,
  };
}

export function clearManifestCaches(): void {
  localStorage.removeItem(MANIFEST_CACHE_KEY);
  localStorage.removeItem(CHARACTERS_CACHE_KEY);
}
