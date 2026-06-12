import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const channelDir = path.join(root, 'updates-channel');
const repo = 'Piselerre/2XKO-Notes-Updates';

if (!fs.existsSync(channelDir)) {
  console.error('Missing updates-channel/ directory');
  process.exit(1);
}

const tmp = path.join(root, '.tmp-updates-channel');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

for (const file of fs.readdirSync(channelDir)) {
  fs.copyFileSync(path.join(channelDir, file), path.join(tmp, file));
}

execSync('git init', { cwd: tmp, stdio: 'inherit' });
execSync('git add -A', { cwd: tmp, stdio: 'inherit' });
execSync('git commit -m "Update public channel"', { cwd: tmp, stdio: 'inherit' });
execSync(`git branch -M main`, { cwd: tmp, stdio: 'inherit' });
execSync(`git remote add origin https://github.com/${repo}.git`, { cwd: tmp, stdio: 'inherit' });
execSync('git push -f origin main', { cwd: tmp, stdio: 'inherit' });
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Published ${repo}`);
