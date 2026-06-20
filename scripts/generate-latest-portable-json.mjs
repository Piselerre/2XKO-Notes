import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/generate-latest-portable-json.mjs <version>');
  process.exit(1);
}

const repo = 'Piselerre/2XKO-Notes';
const PORTABLE_EXE_NAME = '2XKO.Notes_x64-portable.exe';
const url = `https://github.com/${repo}/releases/download/v${version}/${PORTABLE_EXE_NAME}`;

const latest = {
  version,
  format: 'exe',
  notes: `2XKO Notes v${version} (portable exe)`,
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      url,
      signature: null,
    },
  },
};

const channelDir = path.join(root, 'updates-channel');
fs.mkdirSync(channelDir, { recursive: true });
const outPath = path.join(channelDir, 'latest-portable.json');
fs.writeFileSync(outPath, `${JSON.stringify(latest, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
