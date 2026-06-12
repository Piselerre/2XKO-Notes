import { createDefaultAppData, useAppStore } from '@2xko/core';

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
  alert('Caché de imágenes limpiada.');
}
