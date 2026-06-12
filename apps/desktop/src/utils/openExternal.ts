export async function openExternal(url: string) {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    } catch {
      /* fallback */
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
