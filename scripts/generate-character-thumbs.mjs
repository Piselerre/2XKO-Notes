/**
 * Generates WebP thumbnails for roster cards.
 *
 * Source priority:
 *   1. img/character/recut/{slug}.png  — custom Photoshop crops (recommended)
 *   2. img/character/*.png             — Champion Select PNGs
 *
 * Photoshop crop spec (see img/character/recut/README.txt):
 *   900 x 1200 px, 3:4, #0c0c14 background, ~12% safe margin, character centered.
 *
 * Run: pnpm img:thumbs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'img', 'character');
const RECUT_DIR = path.join(CHAR_DIR, 'recut');
const OUT_DIR = path.join(CHAR_DIR, 'thumbs');
const THUMB_WIDTH = 640;
const THUMB_HEIGHT = 853;
const WEBP_QUALITY = 90;
const PAD_COLOR = { r: 12, g: 12, b: 20, alpha: 1 };

const CHAMP_SELECT = {
  ahri: 'Ahri Champion Select 2XKO.png',
  akali: 'Akali Champion Select 2XKO.png',
  blitzcrank: 'Blitzcrank Champion Select 2XKO.png',
  braum: 'Braum Champion Select 2XKO.png',
  caitlyn: 'Caitlyn Key Visual_Champion Select 2XKO.png',
  darius: 'Darius Champion Select 2XKO.png',
  ekko: 'Ekko Champion Select 2XKO.png',
  illaoi: 'Illaoi Champion Select 2XKO.png',
  jinx: 'Jinx Champion Select 2XKO.png',
  senna: 'Senna-Champ-Select-2XKO.png',
  teemo: 'Teemo Champion Select 2XKO.png',
  vi: 'Vi Champion Select 2XKO.png',
  warwick: 'Warwick Champion Select 2XKO.png',
  yasuo: 'Yasuo Chmpion Select 2XKO.png',
};

function findRecut(slug) {
  if (!fs.existsSync(RECUT_DIR)) return null;
  for (const file of fs.readdirSync(RECUT_DIR)) {
    if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
    const base = path.basename(file, path.extname(file)).toLowerCase();
    if (base === slug) return path.join(RECUT_DIR, file);
  }
  return null;
}

function resolveSource(slug) {
  const recut = findRecut(slug);
  if (recut) return recut;
  const legacy = CHAMP_SELECT[slug];
  if (legacy) {
    const p = path.join(CHAR_DIR, legacy);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const slugs = new Set([
  ...Object.keys(CHAMP_SELECT),
  ...(fs.existsSync(RECUT_DIR)
    ? fs.readdirSync(RECUT_DIR)
        .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
        .map((f) => path.basename(f, path.extname(f)).toLowerCase())
    : []),
]);

let ok = 0;
for (const slug of slugs) {
  const src = resolveSource(slug);
  const dest = path.join(OUT_DIR, `${slug}.webp`);
  if (!src) {
    console.warn(`SKIP (no source): ${slug}`);
    continue;
  }
  const isRecut = src.includes(`${path.sep}recut${path.sep}`);
  const pipeline = sharp(src);
  if (isRecut) {
    await pipeline
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover', position: 'centre' })
      .webp({ quality: WEBP_QUALITY })
      .toFile(dest);
  } else {
    await pipeline
      .resize(THUMB_WIDTH, THUMB_HEIGHT, {
        fit: 'contain',
        position: 'centre',
        background: PAD_COLOR,
      })
      .webp({ quality: WEBP_QUALITY })
      .toFile(dest);
  }
  const kb = (fs.statSync(dest).size / 1024).toFixed(1);
  const tag = isRecut ? 'recut' : 'legacy-pad';
  console.log(`✓ ${slug}.webp (${kb} KB, ${tag})`);
  ok++;
}

console.log(`\nDone: ${ok} thumbnails → img/character/thumbs/`);
