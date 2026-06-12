import type { Announcement } from '@2xko/core';

import { APP_VERSION, GITHUB_REPO } from '@/constants/version';

const ANNOUNCEMENTS_URL =
  import.meta.env.VITE_ANNOUNCEMENTS_URL ?? '/remote/announcements.json';

const CACHE_KEY = '2xko-announcements-cache';
const CACHE_TTL = 60 * 60 * 1000;

interface AnnouncementsResponse {
  version: number;
  announcements: Announcement[];
}

export async function fetchAnnouncements(force = false): Promise<Announcement[]> {
  if (!force) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) return data;
      } catch {
        /* ignore */
      }
    }
  }

  try {
    const res = await fetch(ANNOUNCEMENTS_URL);
    if (!res.ok) return [];
    const json: AnnouncementsResponse = await res.json();
    const active = json.announcements.filter((a) => {
      if (!a.enabled) return false;
      if (a.expiresAt && new Date(a.expiresAt) < new Date()) return false;
      return true;
    });
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), data: active })
    );
    return active;
  } catch {
    return [];
  }
}

export function clearAnnouncementsCache(): void {
  localStorage.removeItem(CACHE_KEY);
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

export type UpdateCheckResult =
  | { status: 'available'; version: string; url: string }
  | { status: 'current' }
  | { status: 'no_release' }
  | { status: 'error' };

export async function checkForUpdates(
  currentVersion: string = APP_VERSION
): Promise<UpdateCheckResult> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (res.status === 404) return { status: 'no_release' };
    if (!res.ok) return { status: 'error' };

    const data = (await res.json()) as { tag_name?: string; html_url?: string };
    const remote = (data.tag_name ?? '').replace(/^v/i, '');
    if (!remote) return { status: 'error' };

    if (isNewerVersion(remote, currentVersion)) {
      return {
        status: 'available',
        version: remote,
        url: data.html_url ?? `https://github.com/${GITHUB_REPO}/releases/latest`,
      };
    }
    return { status: 'current' };
  } catch {
    return { status: 'error' };
  }
}

export async function syncToGoogleDrive(_data: unknown): Promise<boolean> {
  return false;
}
