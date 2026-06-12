import { useAppStore } from '@2xko/core';

import { useI18n } from '@/hooks/useI18n';

export function SyncStatus() {
  const googleConnected = useAppStore((s) => s.syncMeta.googleConnected);
  const syncStatus = useAppStore((s) => s.syncMeta.syncStatus);
  const { t } = useI18n();

  if (!googleConnected) {
    return <span className="sync-pill">{t('sync.cloudSyncOff')}</span>;
  }

  const label =
    syncStatus === 'syncing' ? t('sync.syncing') :
    syncStatus === 'synced' ? t('sync.synced') :
    syncStatus === 'offline' ? t('sync.offline') :
    syncStatus === 'error' ? t('sync.error') : t('sync.drive');

  return (
    <span className="sync-pill sync-pill--on flex items-center gap-1.5">
      <span className={`inline-block h-1.5 w-1.5 rounded-full bg-accent ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}
