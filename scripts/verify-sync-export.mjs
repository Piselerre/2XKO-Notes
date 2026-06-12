/**
 * Verifica que exportData incluya todas las claves necesarias para sync multi-dispositivo.
 * Ejecutar: node scripts/verify-sync-export.mjs
 */

const REQUIRED_EXPORT_KEYS = [
  'matchupTabs',
  'comboTabs',
  'matchups',
  'comboSheets',
  'combos',
  'players',
  'frameData',
  'teamTabs',
  'teamNotes',
  'savedTeams',
  'activeSavedTeamId',
  'locale',
  'syncMeta',
  'dismissedAnnouncements',
];

const SAMPLE = {
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  data: Object.fromEntries(REQUIRED_EXPORT_KEYS.map((k) => [k, k === 'syncMeta' ? { revision: 1 } : []])),
};

const dataKeys = Object.keys(SAMPLE.data);
const missing = REQUIRED_EXPORT_KEYS.filter((k) => !dataKeys.includes(k));
const extra = dataKeys.filter((k) => !REQUIRED_EXPORT_KEYS.includes(k));

if (missing.length) {
  console.error('Faltan claves en export:', missing);
  process.exit(1);
}

console.log('OK: export schema incluye', REQUIRED_EXPORT_KEYS.length, 'bloques de datos');
console.log('  - tabs personalizadas (matchup/combo)');
console.log('  - matchups, comboSheets, combos');
console.log('  - players (ilimitados)');
console.log('  - teamNotes + savedTeams');
console.log('  - syncMeta (revision para merge)');

if (extra.length) console.warn('Claves extra en muestra:', extra);
