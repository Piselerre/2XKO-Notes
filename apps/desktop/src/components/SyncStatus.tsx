import { useEffect, useState } from 'react';
import { useAppStore } from '@2xko/core';

import { getDriveSyncEtaMs, isDriveSyncScheduled } from '@/services/googleDrive';
import { useI18n } from '@/hooks/useI18n';

function formatEta(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec >= 60) {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
  return `${totalSec}s`;
}

export function SyncStatus() {
  const googleConnected = useAppStore((s) => s.syncMeta.googleConnected);
  const syncStatus = useAppStore((s) => s.syncMeta.syncStatus);
  const revision = useAppStore((s) => s.syncMeta.revision);
  const { t } = useI18n();
  const [etaMs, setEtaMs] = useState<number | null>(null);

  useEffect(() => {
    if (!googleConnected) {
      setEtaMs(null);
      return;
    }
    const tick = () => setEtaMs(getDriveSyncEtaMs());
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [googleConnected, syncStatus, revision]);

  if (!googleConnected) {
    return <span className="sync-pill">{t('sync.cloudSyncOff')}</span>;
  }

  const label =
    syncStatus === 'syncing' ? t('sync.syncing') :
    syncStatus === 'synced' ? t('sync.synced') :
    syncStatus === 'offline' ? t('sync.offline') :
    syncStatus === 'error' ? t('sync.error') : t('sync.drive');

  const showEta = etaMs !== null && isDriveSyncScheduled() && syncStatus !== 'syncing';

  return (
    <div className="sync-status">
      <span className="sync-pill sync-pill--on flex items-center gap-1.5">
        <span className={`inline-block h-1.5 w-1.5 rounded-full bg-accent ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`} />
        {label}
      </span>
      {showEta && (
        <span className="sync-status__eta">
          {t('sync.driveIn').replace('{time}', formatEta(etaMs))}
        </span>
      )}
    </div>
  );
}
