export const APP_VERSION = '0.5.3';

export const GITHUB_REPO = 'Piselerre/2XKO-Notes';

/** First release that uses the portable-only auto-update channel. */
export const PORTABLE_CHANNEL_MIN_VERSION = '0.5.0';

/** Set at build time via `VITE_PORTABLE_BUILD=1` (see scripts/build-portable.ps1). */
export const IS_PORTABLE_BUILD = import.meta.env.VITE_PORTABLE_BUILD === '1';
