import { useEffect } from 'react';

import { runUpdateCheck } from '@/services/appManifest';
import { getDevSettings } from '@/utils/devSettings';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function useRemoteUpdates() {
  useEffect(() => {
    async function check() {
      const report = await runUpdateCheck();
      if (getDevSettings().verboseLogs) {
        console.info('2XKO remote update check:', report);
      }
    }

    void check();
    const id = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);
}
