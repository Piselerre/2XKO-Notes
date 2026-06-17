export function parseVersionParts(v: string): number[] {
  return v.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
}

export function isNewerVersion(remote: string, current: string): boolean {
  const a = parseVersionParts(remote);
  const b = parseVersionParts(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

export function isAtLeastVersion(current: string, minimum: string): boolean {
  return !isNewerVersion(minimum, current);
}

/** Major or minor bump (e.g. 0.4.x → 0.5.x). */
export function isMajorBump(remote: string, current: string): boolean {
  const a = parseVersionParts(remote);
  const b = parseVersionParts(current);
  return (a[0] ?? 0) > (b[0] ?? 0) || (a[1] ?? 0) > (b[1] ?? 0);
}
