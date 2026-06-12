import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { APP_VERSION } from '@/constants/version';
import {
  applyContentUpdates,
  checkUpdatePlan,
  installPreparedUpdate,
  prepareBinaryUpdate,
  type UpdatePhase,
} from '@/services/updateOrchestrator';
import { areUpdatesIgnored } from '@/utils/updatePreferences';

interface UpdateManagerValue {
  phase: UpdatePhase;
  progress: number;
  version: string;
  startInstall: () => Promise<void>;
  dismissReady: () => void;
}

const UpdateManagerContext = createContext<UpdateManagerValue | null>(null);

export function UpdateManagerProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<UpdatePhase>('idle');
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState('');
  const started = useRef(false);

  const dismissReady = useCallback(() => {
    setPhase('idle');
  }, []);

  const startInstall = useCallback(async () => {
    setPhase('installing');
    await installPreparedUpdate(version);
  }, [version]);

  useEffect(() => {
    if (started.current || areUpdatesIgnored()) return;
    started.current = true;

    async function run() {
      setPhase('checking');
      const plan = await checkUpdatePlan(APP_VERSION);
      if (plan.kind === 'none') {
        setPhase('idle');
        return;
      }

      if (plan.kind === 'content') {
        const applied = await applyContentUpdates(plan);
        if (applied) {
          setPhase('content-applied');
          window.setTimeout(() => setPhase('idle'), 4000);
        } else {
          setPhase('idle');
        }
        return;
      }

      setVersion(plan.version);
      setPhase('downloading');
      const ok = await prepareBinaryUpdate(plan, (pct) => setProgress(pct));
      setPhase(ok ? 'ready' : 'idle');
    }

    void run();
  }, []);

  const value = useMemo(
    () => ({ phase, progress, version, startInstall, dismissReady }),
    [phase, progress, version, startInstall, dismissReady]
  );

  return <UpdateManagerContext.Provider value={value}>{children}</UpdateManagerContext.Provider>;
}

export function useUpdateManager(): UpdateManagerValue {
  const ctx = useContext(UpdateManagerContext);
  if (!ctx) {
    return {
      phase: 'idle',
      progress: 0,
      version: '',
      startInstall: async () => {},
      dismissReady: () => {},
    };
  }
  return ctx;
}
