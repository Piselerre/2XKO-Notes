import { useEffect, useState } from 'react';

import { useAppStore } from '@2xko/core';

import { getDevSettings } from '@/utils/devSettings';

export function DevDebugOverlay() {
  const [on, setOn] = useState(() => getDevSettings().debugOverlay);
  const saveStatus = useAppStore((s) => s.saveStatus);
  const revision = useAppStore((s) => s.syncMeta.revision);
  const matchups = useAppStore((s) => s.matchups.length);
  const combos = useAppStore((s) => s.comboSheets.length);

  useEffect(() => {
    const sync = () => setOn(getDevSettings().debugOverlay);
    window.addEventListener('2xko-dev-settings', sync);
    return () => window.removeEventListener('2xko-dev-settings', sync);
  }, []);

  if (!on) return null;

  return (
    <div className="dev-overlay" aria-hidden>
      <span>DEV</span>
      <span>save: {saveStatus}</span>
      <span>rev: {revision}</span>
      <span>MU: {matchups} · CB: {combos}</span>
    </div>
  );
}
