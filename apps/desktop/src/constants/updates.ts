/** Public update metadata lives in the main repo (updates-channel/). */
export const PUBLIC_UPDATES_REPO = 'Piselerre/2XKO-Notes';

const RAW_MAIN = `https://raw.githubusercontent.com/${PUBLIC_UPDATES_REPO}/main/updates-channel`;

export const PUBLIC_MANIFEST_URL = `${RAW_MAIN}/app-manifest.json`;

/** Legacy NSIS installer channel (0.4.x only — capped at 0.4.7). */
export const PUBLIC_UPDATER_URL = `${RAW_MAIN}/latest.json`;

/** Portable zip channel (0.5.0+). */
export const PUBLIC_PORTABLE_UPDATER_URL = `${RAW_MAIN}/latest-portable.json`;

export const PUBLIC_ANNOUNCEMENTS_URL = `${RAW_MAIN}/announcements.json`;

export const PUBLIC_CHARACTERS_URL = `${RAW_MAIN}/characters.json`;
