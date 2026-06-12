import { useEffect } from 'react';

import { applyContentUpdates, checkUpdatePlan } from '@/services/updateOrchestrator';
import { getDevSettings } from '@/utils/devSettings';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function useRemoteUpdates() {
  useEffect(() => {
    async function check() {
      const plan = await checkUpdatePlan();
      if (plan.kind === 'content') {
        await applyContentUpdates(plan);
      }
      if (getDevSettings().verboseLogs) {
        console.info('2XKO remote update check:', plan);
      }
    }

    void check();
    const id = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);
}
