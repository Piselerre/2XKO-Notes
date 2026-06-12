import { createDefaultAppData, useAppStore } from '@2xko/core';

import { APP_VERSION } from '@/constants/version';
import { checkAllUpdates, installAppUpdate } from '@/services/appUpdater';
import { clearManifestCaches, runUpdateCheck } from '@/services/appManifest';
import { flushDriveSync, getDriveSyncEtaMs, isDriveSyncScheduled } from '@/services/googleDrive';
import { clearImageCache } from '@/utils/imageCache';

export function resetAllAppData(): void {
  if (!window.confirm('¿Borrar TODAS las notas y reiniciar la app? No se puede deshacer.')) return;
  localStorage.removeItem('2xko-notes-storage');
  useAppStore.getState().importData(createDefaultAppData());
  window.location.reload();
}

export function seedBetaTestData(): void {
  const store = useAppStore.getState();
  const mu = store.getOrCreateMatchup('yasuo');
  store.updateMatchupSection(mu.id, 'general', {
    markdown: '**Neutral:** spacing con M\n\n**Punish:** 2M tras whiff dash',
  });
  store.updateMatchupSection(mu.id, 'checklist', {
    checklist: [
      { id: 'c1', text: 'Revisar anti-air', checked: false },
      { id: 'c2', text: 'Oki tras knockdown', checked: true },
    ],
  });

  const sheet = store.getOrCreateComboSheet('vi');
  store.updateComboSection(sheet.id, 'midscreen', {
    markdown: 'L M H → **S1**\n\n- Oki: 2M\n- Corner carry: j.H',
  });

  const player = store.addPlayer();
  store.updatePlayer(player.id, {
    name: 'Beta Tester',
    checklist: [{ id: 'p1', text: 'Favorece rush', checked: false }],
  });

  alert('Datos de prueba cargados (Yasuo MU, Vi combos, 1 player).');
}

export function resetStartupModals(): void {
  sessionStorage.removeItem('2xko-kofi-dismissed');
  localStorage.removeItem('2xko-dismissed-update-version');
  localStorage.removeItem('2xko-just-updated');
  const store = useAppStore.getState();
  store.importData({ dismissedAnnouncements: [] });
  alert('Modales de inicio reseteados. Recarga la app (F5).');
}

export function logAppState(): void {
  const state = useAppStore.getState();
  console.group('2XKO Notes — estado');
  console.log('matchups:', state.matchups.length);
  console.log('comboSheets:', state.comboSheets.length);
  console.log('players:', state.players.length);
  console.log('revision:', state.syncMeta.revision);
  console.log('saveStatus:', state.saveStatus);
  console.log('full:', state.exportData());
  console.groupEnd();
  alert('Estado volcado en la consola (F12 → Console).');
}

export function clearCaches(): void {
  clearImageCache();
  clearManifestCaches();
  alert('Caché de imágenes y manifests limpiada.');
}

export async function runBetaUpdateCheck(): Promise<void> {
  const report = await checkAllUpdates(true);
  console.group('2XKO Beta — update check');
  console.log(report);
  console.groupEnd();

  const lines = [
    `App: v${report.manifest.appVersion}`,
    `Remoto: v${report.manifest.remoteAppVersion ?? '?'}`,
    `Personajes: ${report.manifest.charactersVersion} → ${report.manifest.remoteCharactersVersion ?? '?'}`,
    report.manifest.newCharacters.length
      ? `Nuevos: ${report.manifest.newCharacters.join(', ')}`
      : 'Sin personajes nuevos en remoto',
    `GitHub: ${report.githubRelease.status}`,
    `Updater plugin: ${report.manifest.updaterEnabled ? 'ON' : 'OFF (pendiente pubkey)'}`,
  ];
  alert(lines.join('\n'));
}

export async function testSilentUpdater(): Promise<void> {
  const { checkForAppUpdate } = await import('@/services/appUpdater');
  const offer = await checkForAppUpdate();
  if (!offer) {
    alert('No hay actualización disponible.');
    return;
  }
  const result = await installAppUpdate(offer);
  if (result === 'installed') {
    alert('Actualización instalada. Reiniciando…');
    return;
  }
  if (result === 'opened') {
    alert('Updater no disponible en este build. Se abrió la página de release.');
    return;
  }
  if (result === 'unavailable') {
    alert('Updater no disponible aún.');
    return;
  }
  alert('Error al instalar actualización. Revisa consola.');
}

export function exportBetaDiagnostics(): void {
  const state = useAppStore.getState();
  const diag = {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    revision: state.syncMeta.revision,
    googleConnected: state.syncMeta.googleConnected,
    syncStatus: state.syncMeta.syncStatus,
    lastSyncAt: state.syncMeta.lastSyncAt,
    driveSyncScheduled: isDriveSyncScheduled(),
    driveSyncEtaMs: getDriveSyncEtaMs(),
    matchups: state.matchups.length,
    comboSheets: state.comboSheets.length,
    players: state.players.length,
  };
  console.group('2XKO Beta — diagnostics');
  console.log(diag);
  console.groupEnd();
  alert('Diagnóstico volcado en consola (F12).');
}

export async function forceDriveSyncNow(): Promise<void> {
  await flushDriveSync();
  alert('Sync a Drive forzado (solo si había cambios pendientes).');
}

export async function previewRemoteManifest(): Promise<void> {
  const report = await runUpdateCheck(true);
  alert(JSON.stringify(report, null, 2));
}
