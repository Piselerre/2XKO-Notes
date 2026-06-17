import { useEffect } from 'react';

import { useAppStore } from '@2xko/core';

export function useUiScale(): void {
  const uiScale = useAppStore((s) => s.uiScale);

  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(uiScale / 100));
    document.documentElement.dataset.uiScale = String(uiScale);
  }, [uiScale]);
}
