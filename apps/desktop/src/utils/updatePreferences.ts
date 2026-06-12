const IGNORE_KEY = '2xko-ignore-updates';
const DISMISSED_VERSION_KEY = '2xko-dismissed-update-version';
const JUST_UPDATED_KEY = '2xko-just-updated';

export function areUpdatesIgnored(): boolean {
  return localStorage.getItem(IGNORE_KEY) === '1';
}

export function setUpdatesIgnored(ignored: boolean): void {
  if (ignored) localStorage.setItem(IGNORE_KEY, '1');
  else localStorage.removeItem(IGNORE_KEY);
}

export function getDismissedUpdateVersion(): string | null {
  return localStorage.getItem(DISMISSED_VERSION_KEY);
}

export function dismissUpdateVersion(version: string): void {
  localStorage.setItem(DISMISSED_VERSION_KEY, version.replace(/^v/i, ''));
}

export function clearDismissedUpdateVersion(): void {
  localStorage.removeItem(DISMISSED_VERSION_KEY);
}

export function setJustUpdatedVersion(version: string): void {
  localStorage.setItem(JUST_UPDATED_KEY, version.replace(/^v/i, ''));
}

/** If the app just updated to the current version, return that version once. */
export function consumeJustUpdatedVersion(currentVersion: string): string | null {
  const stored = localStorage.getItem(JUST_UPDATED_KEY);
  if (!stored) return null;
  const current = currentVersion.replace(/^v/i, '');
  if (stored !== current) return null;
  localStorage.removeItem(JUST_UPDATED_KEY);
  clearDismissedUpdateVersion();
  return stored;
}

/** New release available and user has not opted out or dismissed this version. */
export function shouldPromptForUpdate(remoteVersion: string): boolean {
  if (areUpdatesIgnored()) return false;
  return getDismissedUpdateVersion() !== remoteVersion.replace(/^v/i, '');
}
