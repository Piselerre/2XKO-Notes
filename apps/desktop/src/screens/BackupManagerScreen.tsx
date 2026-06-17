import { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

import { useAppStore } from '@2xko/core';
import type { AppData } from '@2xko/core';

import { Layout } from '@/components/Layout';
import { BlockingModal } from '@/components/BlockingModal';
import { MarkdownPreviewContent } from '@/components/MarkdownPreviewContent';
import { ChecklistEditor } from '@/components/ChecklistEditor';
import { useI18n } from '@/hooks/useI18n';
import { parseSyncPayload } from '@/services/fileStorage';
import { supportsLocalFileStorage } from '@/utils/platform';
import {
  buildBackupNavigation,
  compareBackupData,
  normalizeBackupData,
  type BackupAreaId,
  type BackupDiff,
  type BackupNavGroup,
  type BackupNavInstance,
  type BackupNavTab,
} from '@/utils/backupCompare';
import type { BackupEntry } from '@/utils/backupListTypes';
import { formatMonthLabel, splitBackupEntries } from '@/utils/backupListGroups';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale === 'es' ? 'es-ES' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

const AREAS: BackupAreaId[] = ['combos', 'matchups', 'teams', 'players'];

function areaLabel(area: BackupAreaId, t: (k: string) => string): string {
  switch (area) {
    case 'combos':
      return t('home.combos');
    case 'matchups':
      return t('home.matchups');
    case 'teams':
      return t('teams.myTeams');
    case 'players':
      return t('home.players');
    default:
      return area;
  }
}

export function BackupManagerScreen() {
  const { t, locale } = useI18n();
  const exportData = useAppStore((s) => s.exportData);
  const importData = useAppStore((s) => s.importData);
  const touchRevision = useAppStore((s) => s.touchRevision);

  const [entries, setEntries] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewEntry, setPreviewEntry] = useState<BackupEntry | null>(null);
  const [restoreEntry, setRestoreEntry] = useState<BackupEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<BackupEntry | null>(null);
  const [previewData, setPreviewData] = useState<AppData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [area, setArea] = useState<BackupAreaId>('combos');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [tabId, setTabId] = useState<string | null>(null);

  const currentData = useMemo(() => normalizeBackupData(exportData() as AppData), [exportData]);
  const navigation = useMemo(
    () => (previewData ? buildBackupNavigation(previewData) : null),
    [previewData]
  );
  const diff: BackupDiff | null = useMemo(() => {
    if (!previewData) return null;
    return compareBackupData(currentData, previewData);
  }, [currentData, previewData]);

  const refresh = useCallback(async () => {
    if (!supportsLocalFileStorage()) return;
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<BackupEntry[]>('list_backups');
      setEntries(list);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const groups: BackupNavGroup[] = useMemo(() => {
    if (!navigation) return [];
    if (area === 'players') return [];
    return navigation[area];
  }, [navigation, area]);

  const selectedGroup = groups.find((g) => g.id === groupId) ?? groups[0];
  const instances: BackupNavInstance[] = useMemo(() => {
    if (area === 'players') return navigation?.players ?? [];
    return selectedGroup?.instances ?? [];
  }, [area, navigation, selectedGroup]);
  const selectedInstance = instances.find((i) => i.id === instanceId) ?? instances[0];
  const tabs: BackupNavTab[] = selectedInstance?.tabs ?? [];
  const selectedTab = tabs.find((tab) => tab.id === tabId) ?? tabs.find((tab) => tab.hasContent) ?? tabs[0];

  useEffect(() => {
    if (!navigation) return;
    if (area === 'players') {
      if (!instanceId && navigation.players[0]) setInstanceId(navigation.players[0].id);
      return;
    }
    const firstGroup = groups[0];
    if (!groupId && firstGroup) setGroupId(firstGroup.id);
    const firstInstance = selectedGroup?.instances[0];
    if (!instanceId && firstInstance) setInstanceId(firstInstance.id);
    const firstTab = selectedInstance?.tabs.find((tab) => tab.hasContent) ?? selectedInstance?.tabs[0];
    if (!tabId && firstTab) setTabId(firstTab.id);
  }, [navigation, area, groups, selectedGroup, selectedInstance, groupId, instanceId, tabId]);

  function resetNav() {
    setArea('combos');
    setGroupId(null);
    setInstanceId(null);
    setTabId(null);
  }

  async function openPreview(entry: BackupEntry) {
    setPreviewEntry(entry);
    setPreviewLoading(true);
    setPreviewData(null);
    resetNav();
    try {
      const raw = await invoke<string>('read_backup', { path: entry.path });
      const parsed = parseSyncPayload(raw);
      if (!parsed) throw new Error(t('settings.invalidFile'));
      setPreviewData(normalizeBackupData(parsed));
    } catch (e) {
      setError(String(e));
      setPreviewEntry(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreviewEntry(null);
    setPreviewData(null);
    resetNav();
  }

  async function confirmRestore() {
    if (!restoreEntry) return;
    setRestoring(true);
    setError(null);
    try {
      await invoke('restore_backup', { path: restoreEntry.path });
      const raw = await invoke<string>('load_data_file');
      const parsed = parseSyncPayload(raw);
      if (!parsed) throw new Error(t('settings.invalidFile'));
      importData(normalizeBackupData(parsed));
      touchRevision();
      setRestoreEntry(null);
      closePreview();
      window.location.reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setRestoring(false);
    }
  }

  async function confirmDelete() {
    if (!deleteEntry) return;
    setDeleting(true);
    setError(null);
    try {
      await invoke('delete_backup', { path: deleteEntry.path });
      if (previewEntry?.path === deleteEntry.path) closePreview();
      setDeleteEntry(null);
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setDeleting(false);
    }
  }

  const breadcrumb = useMemo(() => {
    if (!previewEntry) return '';
    const parts = [previewEntry.display_name, areaLabel(area, t)];
    if (area !== 'players' && selectedGroup) parts.push(selectedGroup.label);
    if (selectedInstance) parts.push(selectedInstance.label);
    if (selectedTab) parts.push(selectedTab.label);
    return parts.join(' › ');
  }, [previewEntry, area, selectedGroup, selectedInstance, selectedTab, t]);

  const { archive, months } = useMemo(() => splitBackupEntries(entries), [entries]);

  if (!supportsLocalFileStorage()) {
    return (
      <Layout title={t('settings.backupManager')} backTo="/settings" backLabel={t('nav.settings')}>
        <p className="text-sm text-text-muted">
          {locale === 'es'
            ? 'El administrador de copias requiere la app instalada.'
            : 'Backup manager requires the installed app.'}
        </p>
      </Layout>
    );
  }

  if (previewEntry) {
    return (
      <Layout title={t('settings.backupManager')} backTo="/settings" backLabel={t('nav.settings')}>
        <div className="backup-screen">
          <div className="backup-screen__banner">
            <p className="backup-screen__banner-title">
              {t('settings.backupPreviewTitle').replace('{name}', previewEntry.display_name)}
            </p>
            <p className="backup-screen__banner-sub">{breadcrumb}</p>
            <div className="backup-screen__banner-actions">
              <button type="button" className="xko-btn xko-btn--ghost" onClick={closePreview}>
                {t('settings.backupBackToList')}
              </button>
              <button type="button" className="xko-btn xko-btn--pink" onClick={() => setRestoreEntry(previewEntry)}>
                {t('settings.backupRestore')}
              </button>
            </div>
          </div>

          {previewLoading ? (
            <p className="text-sm text-text-muted">{t('common.loading')}</p>
          ) : previewData && navigation && diff ? (
            <>
              <details className="backup-screen__diff xko-panel xko-panel--compact">
                <summary className="backup-screen__diff-title">{t('settings.backupDiffTitle')}</summary>
                <p className="mt-2 text-sm text-text-muted">
                  {diff.revisionCompare === 'newer'
                    ? t('settings.backupDiffNewer')
                    : diff.revisionCompare === 'older'
                      ? t('settings.backupDiffOlder')
                      : t('settings.backupDiffSame')}
                </p>
                <p className="mt-2 text-sm">
                  {t('settings.backupDiffSections')
                    .replace('{current}', String(diff.sectionsWithContent.current))
                    .replace('{backup}', String(diff.sectionsWithContent.backup))}
                </p>
              </details>

              <div className="backup-explorer">
                <nav className="backup-explorer__col">
                  <p className="backup-explorer__col-title">{t('settings.backupNavArea')}</p>
                  {AREAS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`backup-explorer__item${area === id ? ' is-active' : ''}`}
                      onClick={() => {
                        setArea(id);
                        setGroupId(null);
                        setInstanceId(null);
                        setTabId(null);
                      }}
                    >
                      {areaLabel(id, t)}
                    </button>
                  ))}
                </nav>

                {area !== 'players' && (
                  <nav className="backup-explorer__col">
                    <p className="backup-explorer__col-title">{t('settings.backupNavSubject')}</p>
                    {groups.length === 0 ? (
                      <p className="backup-explorer__empty">{t('settings.backupNavEmpty')}</p>
                    ) : (
                      groups.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          className={`backup-explorer__item${selectedGroup?.id === group.id ? ' is-active' : ''}`}
                          onClick={() => {
                            setGroupId(group.id);
                            setInstanceId(null);
                            setTabId(null);
                          }}
                        >
                          {group.label}
                        </button>
                      ))
                    )}
                  </nav>
                )}

                <nav className="backup-explorer__col">
                  <p className="backup-explorer__col-title">{t('settings.backupNavInstance')}</p>
                  {instances.length === 0 ? (
                    <p className="backup-explorer__empty">{t('settings.backupNavEmpty')}</p>
                  ) : (
                    instances.map((instance) => (
                      <button
                        key={instance.id}
                        type="button"
                        className={`backup-explorer__item${selectedInstance?.id === instance.id ? ' is-active' : ''}`}
                        onClick={() => {
                          setInstanceId(instance.id);
                          setTabId(null);
                        }}
                      >
                        {instance.label}
                      </button>
                    ))
                  )}
                </nav>

                <nav className="backup-explorer__col">
                  <p className="backup-explorer__col-title">{t('settings.backupNavCategory')}</p>
                  {tabs.length === 0 ? (
                    <p className="backup-explorer__empty">{t('settings.backupNavEmpty')}</p>
                  ) : (
                    tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`backup-explorer__item${selectedTab?.id === tab.id ? ' is-active' : ''}${
                          tab.hasContent ? '' : ' is-muted'
                        }`}
                        onClick={() => setTabId(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))
                  )}
                </nav>

                <div className="backup-explorer__content xko-panel">
                  {selectedTab ? (
                    selectedTab.id === 'checklist' || selectedTab.label.toLowerCase() === 'checklist' ? (
                      <ChecklistEditor items={selectedTab.checklist} onChange={() => {}} readOnly />
                    ) : selectedTab.markdown.trim() ? (
                      <MarkdownPreviewContent markdown={selectedTab.markdown} />
                    ) : selectedTab.checklist.length > 0 ? (
                      <ChecklistEditor items={selectedTab.checklist} onChange={() => {}} readOnly />
                    ) : (
                      <p className="text-sm text-text-muted">{t('settings.backupNavNoContent')}</p>
                    )
                  ) : (
                    <p className="text-sm text-text-muted">{t('settings.backupNavPick')}</p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <BlockingModal
          open={!!restoreEntry}
          onClose={() => !restoring && setRestoreEntry(null)}
          title={t('settings.backupRestoreTitle')}
        >
          <p className="text-sm leading-relaxed text-text-muted">{t('settings.backupRestoreBody')}</p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" disabled={restoring} onClick={() => setRestoreEntry(null)} className="xko-btn xko-btn--lime">
              {t('common.cancel')}
            </button>
            <button type="button" disabled={restoring} onClick={() => void confirmRestore()} className="xko-btn xko-btn--pink">
              {restoring ? t('common.loading') : t('settings.backupRestoreConfirm')}
            </button>
          </div>
        </BlockingModal>
      </Layout>
    );
  }

  function renderBackupRow(entry: BackupEntry) {
    return (
      <div key={entry.path} className="backup-screen__row xko-panel xko-panel--compact">
        <div className="backup-screen__row-main">
          <p className="font-display text-sm font-bold">{entry.display_name}</p>
          <p className="text-xs text-text-muted">
            {formatDate(entry.modified_iso, locale)} · {formatBytes(entry.size_bytes)}
          </p>
        </div>
        <div className="backup-screen__row-actions">
          <button type="button" className="xko-btn xko-btn--ghost" onClick={() => void openPreview(entry)}>
            {t('settings.backupPreview')}
          </button>
          <button type="button" className="xko-btn xko-btn--pink" onClick={() => setRestoreEntry(entry)}>
            {t('settings.backupRestore')}
          </button>
          <button type="button" className="xko-btn xko-btn--ghost" onClick={() => setDeleteEntry(entry)}>
            {t('common.delete')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout title={t('settings.backupManager')} backTo="/settings" backLabel={t('nav.settings')}>
      <div className="backup-screen">
        <p className="text-sm text-text-muted">{t('settings.backupRetention')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void refresh()} disabled={loading} className="xko-btn xko-btn--ghost">
            {loading ? t('common.loading') : t('settings.backupRefresh')}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        {entries.length === 0 && !loading ? (
          <p className="mt-4 text-sm text-text-muted">{t('settings.backupListEmpty')}</p>
        ) : (
          <div className="backup-screen__groups mt-4">
            {months.map((monthGroup, monthIndex) => (
              <details
                key={monthGroup.month}
                className="backup-screen__group"
                open={monthIndex === 0}
              >
                <summary className="backup-screen__group-summary">
                  <span>{t('settings.backupGroupAuto')}</span>
                  <span className="backup-screen__group-meta">
                    {formatMonthLabel(monthGroup.month, locale)} · {monthGroup.count}
                  </span>
                </summary>
                <div className="backup-screen__group-body">
                  {monthGroup.days.map((dayGroup, dayIndex) => (
                    <details
                      key={dayGroup.folder}
                      className="backup-screen__subgroup"
                      open={monthIndex === 0 && dayIndex === 0}
                    >
                      <summary className="backup-screen__subgroup-summary">
                        <span>{dayGroup.folder}</span>
                        <span className="backup-screen__group-meta">{dayGroup.entries.length}</span>
                      </summary>
                      <div className="backup-screen__table">
                        {dayGroup.entries.map((entry) => renderBackupRow(entry))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}

            {archive.length > 0 && (
              <details className="backup-screen__group backup-screen__group--archive">
                <summary className="backup-screen__group-summary">
                  <span>{t('settings.backupGroupArchive')}</span>
                  <span className="backup-screen__group-meta">{archive.length}</span>
                </summary>
                <div className="backup-screen__group-body">
                  <p className="backup-screen__archive-hint text-xs text-text-muted">
                    {t('settings.backupArchiveHint')}
                  </p>
                  <div className="backup-screen__table">
                    {archive.map((entry) => renderBackupRow(entry))}
                  </div>
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      <BlockingModal
        open={!!restoreEntry}
        onClose={() => !restoring && setRestoreEntry(null)}
        title={t('settings.backupRestoreTitle')}
      >
        <p className="text-sm leading-relaxed text-text-muted">{t('settings.backupRestoreBody')}</p>
        {restoreEntry && (
          <p className="mt-3 text-sm">
            <strong className="text-accent">{restoreEntry.display_name}</strong>
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" disabled={restoring} onClick={() => setRestoreEntry(null)} className="xko-btn xko-btn--lime">
            {t('common.cancel')}
          </button>
          <button type="button" disabled={restoring} onClick={() => void confirmRestore()} className="xko-btn xko-btn--pink">
            {restoring ? t('common.loading') : t('settings.backupRestoreConfirm')}
          </button>
        </div>
      </BlockingModal>

      <BlockingModal
        open={!!deleteEntry}
        onClose={() => !deleting && setDeleteEntry(null)}
        title={t('settings.backupDeleteTitle')}
      >
        <p className="text-sm leading-relaxed text-text-muted">{t('settings.backupDeleteBody')}</p>
        {deleteEntry && (
          <p className="mt-3 text-sm">
            <strong className="text-accent">{deleteEntry.display_name}</strong>
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" disabled={deleting} onClick={() => setDeleteEntry(null)} className="xko-btn xko-btn--lime">
            {t('common.cancel')}
          </button>
          <button type="button" disabled={deleting} onClick={() => void confirmDelete()} className="xko-btn xko-btn--pink">
            {deleting ? t('common.loading') : t('settings.backupDeleteConfirm')}
          </button>
        </div>
      </BlockingModal>
    </Layout>
  );
}
