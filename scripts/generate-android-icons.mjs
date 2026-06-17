/**
 * Regenerates Android launcher icons from img/logo/LogoApp.png.
 * Uses legacy square icons only (no adaptive/circular crop).
 * Run: node scripts/generate-android-icons.mjs
 */
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const logo = join(root, 'img/logo/LogoApp.png');
const outBase = join(root, 'apps/desktop/src-tauri/icons/android');

const SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const BG = { r: 12, g: 14, b: 20, alpha: 1 };
/** Logo fills ~72% so the full mark stays visible on launchers that apply masks. */
const LOGO_SCALE = 0.72;

async function writeIcon(dir, name, size) {
  const folder = join(outBase, dir);
  mkdirSync(folder, { recursive: true });
  const logoSize = Math.round(size * LOGO_SCALE);
  const buf = await sharp(logo)
    .resize(logoSize, logoSize, { fit: 'contain', background: BG })
    .extend({
      top: Math.floor((size - logoSize) / 2),
      bottom: Math.ceil((size - logoSize) / 2),
      left: Math.floor((size - logoSize) / 2),
      right: Math.ceil((size - logoSize) / 2),
      background: BG,
    })
    .png()
    .toBuffer();
  const path = join(folder, name);
  await sharp(buf).toFile(path);
  console.log('wrote', path);
}

const adaptiveDir = join(outBase, 'mipmap-anydpi-v26');
if (existsSync(adaptiveDir)) {
  rmSync(adaptiveDir, { recursive: true, force: true });
  console.log('removed adaptive icon layer', adaptiveDir);
}

for (const [dir, size] of Object.entries(SIZES)) {
  await writeIcon(dir, 'ic_launcher.png', size);
  await writeIcon(dir, 'ic_launcher_round.png', size);
}

console.log('Android icons updated from LogoApp.png (full logo, no adaptive crop)');

const sync = spawnSync(process.execPath, [join(root, 'scripts/sync-android-icons.mjs')], {
  stdio: 'inherit',
});
if (sync.status !== 0) process.exit(sync.status ?? 1);
