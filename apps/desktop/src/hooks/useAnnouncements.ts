import { useEffect } from 'react';
import { useAppStore } from '@2xko/core';
import { fetchAnnouncements } from '@/services/remote';

export function useAnnouncements() {
  const setAnnouncements = useAppStore((s) => s.setAnnouncements);

  useEffect(() => {
    fetchAnnouncements().then(setAnnouncements);
  }, [setAnnouncements]);
}
