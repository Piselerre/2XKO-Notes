const STORAGE_KEY = 'xko_dev_mobile_preview';

/** Dev-only: true when `?mobile=1` is active (persisted for the session across SPA navigations). */
export function isMobilePreviewForced(): boolean {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  const param = params.get('mobile');

  if (param === '1') {
    sessionStorage.setItem(STORAGE_KEY, '1');
    return true;
  }
  if (param === '0') {
    sessionStorage.removeItem(STORAGE_KEY);
    return false;
  }

  return sessionStorage.getItem(STORAGE_KEY) === '1';
}

/** Append `mobile=1` to internal paths while dev mobile preview is active. */
export function withMobilePreview(path: string): string {
  if (!isMobilePreviewForced()) return path;

  const hashIdx = path.indexOf('#');
  const hash = hashIdx >= 0 ? path.slice(hashIdx) : '';
  const base = hashIdx >= 0 ? path.slice(0, hashIdx) : path;
  const qIdx = base.indexOf('?');
  const pathname = qIdx >= 0 ? base.slice(0, qIdx) : base;
  const existing = qIdx >= 0 ? base.slice(qIdx + 1) : '';
  const params = new URLSearchParams(existing);

  if (params.get('mobile') === '1') return path;

  params.set('mobile', '1');
  const query = params.toString();
  return `${pathname}?${query}${hash}`;
}
