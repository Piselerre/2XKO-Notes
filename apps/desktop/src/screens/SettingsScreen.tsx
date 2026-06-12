import { useEffect, useRef, useState } from 'react';

import { Layout } from '@/components/Layout';
import { useAppStore } from '@2xko/core';
import type { AppData } from '@2xko/core';
import { APP_VERSION } from '@/constants/version';
import { getDataFilePath, saveToDataFile, SYNC_FILENAME } from '@/services/fileStorage';
import { connectGoogleDrive, disconnectGoogleDrive } from '@/services/googleDrive';
import { isDesktopApp } from '@/utils/isDesktopApp';
import { checkForUpdates, type UpdateCheckResult } from '@/services/remote';
import { DevSettingsPanel } from '@/components/DevSettingsPanel';
import { BlockingModal } from '@/components/BlockingModal';
import { useI18n } from '@/hooks/useI18n';
import { openExternal } from '@/utils/openExternal';
import {
  areUpdatesIgnored,
  clearDismissedUpdateVersion,
  setUpdatesIgnored,
} from '@/utils/updatePreferences';

const FLAG_US = '/img/flags/Flag_of_the_United_States.svg';
const FLAG_ES = '/img/flags/Flag_of_Spain.svg';

function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();

  return (
    <section className="xko-panel">
      <h2 className="font-display text-xs font-bold tracking-widest text-accent uppercase">
        {t('settings.language')}
      </h2>
      <div className="lang-switch mt-3">
        <button
          type="button"
          className={`lang-switch__btn${locale === 'en' ? ' is-active' : ''}`}
          onClick={() => setLocale('en')}
          title="English (US)"
          aria-label="English (US)"
          aria-pressed={locale === 'en'}
        >
          <img src={FLAG_US} alt="" className="lang-switch__flag" />
          <span className="lang-switch__code">US</span>
        </button>
        <button
          type="button"
          className={`lang-switch__btn${locale === 'es' ? ' is-active' : ''}`}
          onClick={() => setLocale('es')}
          title="Español"
          aria-label="Español"
          aria-pressed={locale === 'es'}
        >
          <img src={FLAG_ES} alt="" className="lang-switch__flag" />
          <span className="lang-switch__code">ES</span>
        </button>
      </div>
    </section>
  );
}

export function SettingsScreen() {
  const syncMeta = useAppStore((s) => s.syncMeta);
  const setSyncStatus = useAppStore((s) => s.setSyncStatus);
  const exportData = useAppStore((s) => s.exportData);
  const importData = useAppStore((s) => s.importData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dataPath, setDataPath] = useState('');
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | UpdateCheckResult>('idle');
  const [updateUrl, setUpdateUrl] = useState<string | null>(null);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveError, setDriveError] = useState('');
  const [updatesIgnored, setIgnoredState] = useState(areUpdatesIgnored());
  const [ignoreConfirmOpen, setIgnoreConfirmOpen] = useState(false);
  const desktopApp = isDesktopApp();
  const { t } = useI18n();

  useEffect(() => {
    getDataFilePath().then(setDataPath);
  }, []);

  useEffect(() => {
    document.documentElement.lang = useAppStore.getState().locale;
    setIgnoredState(areUpdatesIgnored());
  }, []);

  async function handleConnectGoogle() {
    setDriveError('');
    setDriveBusy(true);
    setSyncStatus('syncing');
    try {
      await connectGoogleDrive();
    } catch (e) {
      setSyncStatus('error');
      setDriveError(String(e));
    } finally {
      setDriveBusy(false);
    }
  }

  async function handleDisconnectGoogle() {
    setDriveError('');
    setDriveBusy(true);
    try {
      await disconnectGoogleDrive();
    } catch (e) {
      setDriveError(String(e));
    } finally {
      setDriveBusy(false);
    }
  }

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = SYNC_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const data = (parsed.data ?? parsed) as AppData;
        importData(data);
        void saveToDataFile();
        alert(t('settings.imported'));
      } catch {
        alert(t('settings.invalidFile'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  async function handleCheckUpdate() {
    setUpdateState('checking');
    setUpdateUrl(null);
    const result = await checkForUpdates(APP_VERSION);
    setUpdateState(result);
    if (result.status === 'available') setUpdateUrl(result.url);
  }

  function updateMessage(): string {
    if (updateState === 'idle') return '';
    if (updateState === 'checking') return t('settings.checkingUpdate');
    if (updateState.status === 'current') return t('settings.updateCurrent');
    if (updateState.status === 'available') return `${t('settings.updateAvailable')} v${updateState.version}`;
    if (updateState.status === 'no_release') return t('settings.updateNoRelease');
    return t('settings.updateError');
  }

  return (
    <Layout title={t('settings.title')} backTo="/" backLabel={t('nav.menu')}>
      <div className="mx-auto max-w-lg space-y-4">
        <LanguageSwitch />

        <section className="xko-panel">
          <h2 className="font-display text-xs font-bold tracking-widest text-accent uppercase">
            {t('settings.updates')}
          </h2>
          <p className="mt-2 text-xs text-text-muted">v{APP_VERSION}</p>
          <button
            type="button"
            onClick={() => void handleCheckUpdate()}
            disabled={updateState === 'checking'}
            className="xko-btn xko-btn--outline mt-3"
          >
            {updateState === 'checking' ? t('settings.checkingUpdate') : t('settings.checkUpdate')}
          </button>
          {updateState !== 'idle' && (
            <p className="mt-2 text-sm text-text-muted">{updateMessage()}</p>
          )}
          {updateUrl && (
            <button
              type="button"
              onClick={() => openExternal(updateUrl)}
              className="xko-btn xko-btn--lime mt-2"
            >
              {t('settings.updateOpenRelease')}
            </button>
          )}
          <div className="mt-4 border-t border-border pt-4">
            {updatesIgnored ? (
              <>
                <p className="text-xs text-text-muted">{t('settings.ignoreUpdatesOn')}</p>
                <button
                  type="button"
                  className="link-pink mt-2"
                  onClick={() => {
                    setUpdatesIgnored(false);
                    clearDismissedUpdateVersion();
                    setIgnoredState(false);
                  }}
                >
                  {t('settings.resumeUpdates')}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="xko-btn xko-btn--ghost"
                onClick={() => setIgnoreConfirmOpen(true)}
              >
                {t('settings.ignoreUpdates')}
              </button>
            )}
          </div>
        </section>

        <section className="xko-panel">
          <h2 className="font-display text-xs font-bold tracking-widest text-accent uppercase">
            {t('settings.dataFile')}
          </h2>
          <p className="mt-2 text-sm text-text-muted">{t('settings.dataFileDesc')}</p>
          <code className="mt-3 block break-all rounded border border-border bg-bg-elevated p-3 text-xs text-accent-cyan">
            {dataPath || t('common.loading')}
          </code>
          <p className="mt-2 text-xs text-text-muted">{SYNC_FILENAME}</p>
          <button
            type="button"
            onClick={() => void saveToDataFile().then((p) => p && setDataPath(p))}
            className="xko-btn xko-btn--outline mt-4"
          >
            {t('settings.forceSave')}
          </button>
        </section>

        <section className="xko-panel">
          <h2 className="font-display text-xs font-bold tracking-widest text-text-muted uppercase">
            {t('settings.googleDrive')}
          </h2>
          <p className="mt-2 text-xs text-text-muted">{t('settings.driveDesc')}</p>
          {!desktopApp && (
            <p className="mt-2 text-xs text-amber-400/90">{t('settings.driveDesktopOnly')}</p>
          )}
          {syncMeta.googleConnected ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm">{syncMeta.googleEmail}</p>
              {syncMeta.lastSyncAt && (
                <p className="text-xs text-text-muted">
                  {t('settings.lastSync')}: {new Date(syncMeta.lastSyncAt).toLocaleString()}
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleDisconnectGoogle()}
                disabled={driveBusy || !desktopApp}
                className="link-pink"
              >
                {t('settings.disconnect')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleConnectGoogle()}
              disabled={driveBusy || !desktopApp}
              className="xko-btn xko-btn--lime mt-3"
            >
              {driveBusy ? t('settings.driveConnecting') : t('settings.connectDrive')}
            </button>
          )}
          {driveError && <p className="mt-2 text-sm text-red-400">{driveError}</p>}
        </section>

        <section className="xko-panel">
          <h2 className="font-display text-xs font-bold tracking-widest text-text-muted uppercase">
            {t('settings.backup')}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={handleExport} className="xko-btn xko-btn--ghost">
              {t('settings.export')}
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="xko-btn xko-btn--ghost">
              {t('settings.import')}
            </button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </section>

        <DevSettingsPanel />
      </div>

      <BlockingModal
        open={ignoreConfirmOpen}
        onClose={() => setIgnoreConfirmOpen(false)}
        title={t('settings.ignoreUpdatesTitle')}
      >
        <p className="text-sm leading-relaxed text-text-muted whitespace-pre-line">
          {t('settings.ignoreUpdatesBody')}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setIgnoreConfirmOpen(false)} className="xko-btn xko-btn--lime">
            {t('settings.ignoreUpdatesNo')}
          </button>
          <button
            type="button"
            onClick={() => {
              setUpdatesIgnored(true);
              setIgnoredState(true);
              setIgnoreConfirmOpen(false);
            }}
            className="xko-btn xko-btn--ghost"
          >
            {t('settings.ignoreUpdatesYes')}
          </button>
        </div>
      </BlockingModal>
    </Layout>
  );
}
