const IGNORE_KEY = '2xko-ignore-updates';
const DISMISSED_VERSION_KEY = '2xko-dismissed-update-version';

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
  localStorage.setItem(DISMISSED_VERSION_KEY, version);
}

export function clearDismissedUpdateVersion(): void {
  localStorage.removeItem(DISMISSED_VERSION_KEY);
}

/** New release available and user has not opted out or dismissed this version. */
export function shouldPromptForUpdate(remoteVersion: string): boolean {
  if (areUpdatesIgnored()) return false;
  return getDismissedUpdateVersion() !== remoteVersion;
}
