import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { APP_VERSION } from '@/constants/version';
import { isDesktopApp } from '@/utils/platform';
import {
  applyContentUpdates,
  checkUpdatePlan,
  installPreparedUpdate,
  prepareBinaryUpdate,
  type UpdatePhase,
} from '@/services/updateOrchestrator';
import { areUpdatesIgnored } from '@/utils/updatePreferences';

export type UpdateKind = 'none' | 'content' | 'binary';

interface UpdateManagerValue {
  phase: UpdatePhase;
  progress: number;
  version: string;
  updateKind: UpdateKind;
  silentBinary: boolean;
  startInstall: () => Promise<void>;
  dismissReady: () => void;
}

const UpdateManagerContext = createContext<UpdateManagerValue | null>(null);

export function UpdateManagerProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<UpdatePhase>('idle');
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState('');
  const [updateKind, setUpdateKind] = useState<UpdateKind>('none');
  const [silentBinary, setSilentBinary] = useState(false);
  const started = useRef(false);

  const dismissReady = useCallback(() => {
    setPhase('idle');
    setUpdateKind('none');
    setSilentBinary(false);
  }, []);

  const startInstall = useCallback(async () => {
    setPhase('installing');
    try {
      await installPreparedUpdate(version, { silent: silentBinary });
    } catch (e) {
      console.error('Binary update install failed:', e);
      setPhase('ready');
    }
  }, [version, silentBinary]);

  useEffect(() => {
    if (started.current || areUpdatesIgnored() || !isDesktopApp()) return;
    started.current = true;

    async function run() {
      setPhase('checking');
      const plan = await checkUpdatePlan(APP_VERSION);
      if (plan.kind === 'none') {
        setPhase('idle');
        return;
      }

      if (plan.kind === 'content') {
        setUpdateKind('content');
        const applied = await applyContentUpdates(plan);
        if (applied) {
          setPhase('content-applied');
          window.setTimeout(() => {
            setPhase('idle');
            setUpdateKind('none');
          }, 4000);
        } else {
          setPhase('idle');
          setUpdateKind('none');
        }
        return;
      }

      setUpdateKind('binary');
      setVersion(plan.version);
      setSilentBinary(Boolean(plan.silent));
      setPhase('downloading');
      const ok = await prepareBinaryUpdate(plan, (pct) => setProgress(pct));
      if (!ok) {
        setPhase('idle');
        setUpdateKind('none');
        setSilentBinary(false);
        return;
      }

      setPhase('ready');
    }

    void run();
  }, []);

  const value = useMemo(
    () => ({ phase, progress, version, updateKind, silentBinary, startInstall, dismissReady }),
    [phase, progress, version, updateKind, silentBinary, startInstall, dismissReady]
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
      updateKind: 'none',
      silentBinary: false,
      startInstall: async () => {},
      dismissReady: () => {},
    };
  }
  return ctx;
}
