import { useEffect } from 'react';
import { useAppStore } from '@2xko/core';
import { loadFromDataFile, scheduleFileSave } from '@/services/fileStorage';
import { flushDriveSync, pullFromGoogleDrive, syncGoogleDriveStatus } from '@/services/googleDrive';

export function useFileAutosave() {
  useEffect(() => {
    async function init() {
      await syncGoogleDriveStatus();
      await loadFromDataFile();
      await pullFromGoogleDrive(true);
    }
    void init();

    let lastRevision = useAppStore.getState().syncMeta.revision;
    const unsub = useAppStore.subscribe((state) => {
      const rev = state.syncMeta.revision;
      if (rev !== lastRevision) {
        lastRevision = rev;
        scheduleFileSave();
      }
    });

    const onHide = () => void flushDriveSync();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onHide();
    });
    window.addEventListener('beforeunload', onHide);

    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, []);
}
