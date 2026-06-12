import { isTauri } from '@tauri-apps/api/core';

/** True when running inside the Tauri desktop shell (.exe), not a plain browser tab. */
export function isDesktopApp(): boolean {
  return isTauri();
}
