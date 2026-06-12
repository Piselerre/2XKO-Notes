const KEY = '2xko-dev-settings';

export interface DevSettings {
  debugOverlay: boolean;
  verboseLogs: boolean;
}

const DEFAULTS: DevSettings = {
  debugOverlay: false,
  verboseLogs: false,
};

export function getDevSettings(): DevSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setDevSettings(patch: Partial<DevSettings>): DevSettings {
  const next = { ...getDevSettings(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('2xko-dev-settings'));
  return next;
}
