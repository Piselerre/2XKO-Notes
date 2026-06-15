import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const channelDir = path.join(root, 'updates-channel');

if (!fs.existsSync(channelDir)) {
  console.error('Missing updates-channel/');
  process.exit(1);
}

const required = [
  'app-manifest.json',
  'latest.json',
  'latest-portable.json',
  'announcements.json',
  'characters.json',
];

for (const file of required) {
  const p = path.join(channelDir, file);
  if (!fs.existsSync(p)) {
    console.error(`Missing updates-channel/${file}`);
    process.exit(1);
  }
}

console.log('updates-channel/ is ready — commit and push to Piselerre/2XKO-Notes (no separate updates repo).');
