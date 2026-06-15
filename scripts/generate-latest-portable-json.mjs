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
const zipName = `2XKO.Notes_${version}_x64-portable.zip`;
const url = `https://github.com/${repo}/releases/download/v${version}/${zipName}`;

const latest = {
  version,
  format: 'zip',
  notes: `2XKO Notes v${version} (portable zip)`,
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
