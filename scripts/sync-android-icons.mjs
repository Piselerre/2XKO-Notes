/**
 * Copies launcher icons into the Android Studio project (gen/android/.../res).
 * Run after generate-android-icons.mjs or before APK build.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const iconSrc = join(root, 'apps/desktop/src-tauri/icons/android');
const resDest = join(root, 'apps/desktop/src-tauri/gen/android/app/src/main/res');

if (!existsSync(iconSrc)) {
  console.error('Missing icon source:', iconSrc);
  process.exit(1);
}

if (!existsSync(join(root, 'apps/desktop/src-tauri/gen/android'))) {
  console.error('Run pnpm tauri android init first (gen/android missing).');
  process.exit(1);
}

mkdirSync(resDest, { recursive: true });

for (const entry of readdirSync(iconSrc)) {
  const srcPath = join(iconSrc, entry);
  if (!statSync(srcPath).isDirectory()) continue;
  const destPath = join(resDest, entry);
  cpSync(srcPath, destPath, { recursive: true, force: true });
  console.log('synced', entry);
}

console.log('Android launcher icons synced to gen/android/app/src/main/res');
