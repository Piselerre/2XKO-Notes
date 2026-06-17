/**
 * Ensures Android Gradle includes all Tauri plugins used by the Rust app.
 * Without the native DeepLink module the app crashes immediately on launch.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const genRoot = join(root, 'apps/desktop/src-tauri/gen/android');
const settingsPath = join(genRoot, 'tauri.settings.gradle');
const buildGradlePath = join(genRoot, 'app/tauri.build.gradle.kts');
const manifestPath = join(genRoot, 'app/src/main/AndroidManifest.xml');
const lockPath = join(root, 'apps/desktop/src-tauri/Cargo.lock');

const PLUGIN_META = {
  tauri: { module: 'tauri-android', subpath: 'mobile/android' },
  'tauri-plugin-opener': { module: 'tauri-plugin-opener', subpath: 'android' },
  'tauri-plugin-deep-link': { module: 'tauri-plugin-deep-link', subpath: 'android' },
};

function lockVersion(crateName) {
  const lock = readFileSync(lockPath, 'utf8');
  const block = lock.match(
    new RegExp(`\\[\\[package\\]\\][\\s\\S]*?name = "${crateName}"[\\s\\S]*?version = "([^"]+)"`),
  );
  if (!block) throw new Error(`Missing ${crateName} in Cargo.lock`);
  return block[1];
}

function pluginDir(crateName) {
  const registryRoot = join(homedir(), '.cargo/registry/src');
  const index = readdirSync(registryRoot).find((d) => d.startsWith('index.crates.io'));
  if (!index) throw new Error('Cargo registry index not found');

  const version = lockVersion(crateName);
  const meta = PLUGIN_META[crateName];
  const path = join(registryRoot, index, `${crateName}-${version}`, meta.subpath);
  if (!existsSync(path)) throw new Error(`Missing Android sources: ${path}`);

  return { module: meta.module, path: path.replace(/\\/g, '\\\\') };
}

function patchManifest() {
  let xml = readFileSync(manifestPath, 'utf8');
  if (xml.includes('DEEP LINK PLUGIN') || xml.includes('android:scheme="com.x2ko.notes"')) {
    return;
  }

  const intentFilter = `
            <!-- DEEP LINK PLUGIN -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <action android:name="org.chromium.arc.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.x2ko.notes" />
                <data android:host="oauth" />
                <data android:path="/callback" />
            </intent-filter>`;

  xml = xml.replace(/(\s*<\/intent-filter>\s*)(\s*<\/activity>)/, `$1${intentFilter}$2`);
  writeFileSync(manifestPath, xml, 'utf8');
  console.log('AndroidManifest deep-link intent filter added.');
}

function main() {
  if (!existsSync(genRoot)) {
    console.error('Run pnpm tauri android init first (gen/android missing).');
    process.exit(1);
  }

  const tauri = pluginDir('tauri');
  const opener = pluginDir('tauri-plugin-opener');
  const deepLink = pluginDir('tauri-plugin-deep-link');

  writeFileSync(
    settingsPath,
    `// Patched by scripts/sync-android-plugins.mjs
include ':tauri-android'
project(':tauri-android').projectDir = new File("${tauri.path}")
include ':tauri-plugin-opener'
project(':tauri-plugin-opener').projectDir = new File("${opener.path}")
include ':tauri-plugin-deep-link'
project(':tauri-plugin-deep-link').projectDir = new File("${deepLink.path}")
`,
    'utf8',
  );

  writeFileSync(
    buildGradlePath,
    `// Patched by scripts/sync-android-plugins.mjs
val implementation by configurations
dependencies {
  implementation("androidx.lifecycle:lifecycle-process:2.10.0")
  implementation(project(":tauri-android"))
  implementation(project(":tauri-plugin-opener"))
  implementation(project(":tauri-plugin-deep-link"))
}
`,
    'utf8',
  );

  patchManifest();
  console.log('Android Tauri plugins synced (opener + deep-link).');
}

main();
