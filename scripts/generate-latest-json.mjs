import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/generate-latest-json.mjs <version>');
  process.exit(1);
}

const repo = 'Piselerre/2XKO-Notes';
const nsisDir = path.join(root, 'apps/desktop/src-tauri/target/release/bundle/nsis');
const exeName = `2XKO Notes_${version}_x64-setup.exe`;
const githubAssetName = `2XKO.Notes_${version}_x64-setup.exe`;
const sigPath = path.join(nsisDir, `${exeName}.sig`);

if (!fs.existsSync(sigPath)) {
  console.error(`Missing signature file: ${sigPath}`);
  process.exit(1);
}

const signature = fs.readFileSync(sigPath, 'utf8').trim();
const url = `https://github.com/${repo}/releases/download/v${version}/${githubAssetName}`;

const latest = {
  version,
  notes: `2XKO Notes v${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      url,
      signature,
    },
  },
};

const outPath = path.join(nsisDir, 'latest.json');
fs.writeFileSync(outPath, `${JSON.stringify(latest, null, 2)}\n`);

const channelDir = path.join(root, 'updates-channel');
fs.mkdirSync(channelDir, { recursive: true });
fs.writeFileSync(path.join(channelDir, 'latest.json'), `${JSON.stringify(latest, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
