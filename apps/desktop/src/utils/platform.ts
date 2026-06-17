import { isTauri } from '@tauri-apps/api/core';

const MOBILE_UA = /android|iphone|ipad|ipod|mobile/i;

export function isTauriHost(): boolean {
  return isTauri();
}

export function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return MOBILE_UA.test(navigator.userAgent);
}

/** True on Android/iOS Tauri builds and mobile browsers. */
export function isMobileApp(): boolean {
  return isMobileUserAgent();
}

/** Windows/macOS/Linux Tauri shell — updater, NSIS, Drive localhost OAuth. */
export function isDesktopApp(): boolean {
  return isTauriHost() && !isMobileUserAgent();
}

/** Tauri desktop or mobile — local JSON file + Google Drive sync. */
export function supportsLocalFileStorage(): boolean {
  return isTauriHost();
}

/** Tauri desktop or mobile — Google Drive OAuth and API. */
export function supportsGoogleDrive(): boolean {
  return isTauriHost();
}

export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches || isMobileApp();
}
