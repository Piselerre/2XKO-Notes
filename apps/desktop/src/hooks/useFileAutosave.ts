import { useEffect } from 'react';
import { useAppStore } from '@2xko/core';
import { loadFromDataFile, scheduleFileSave } from '@/services/fileStorage';

export function useFileAutosave() {
  useEffect(() => {
    void loadFromDataFile();
    return useAppStore.subscribe(() => scheduleFileSave());
  }, []);
}
