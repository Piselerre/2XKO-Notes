/**
 * Generates NSIS installer BMP assets (24-bit, bottom-up).
 * Run: node scripts/generate-nsis-assets.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../apps/desktop/src-tauri/windows');

const BG = [12, 12, 20];
const ACCENT = [212, 255, 0];
const CYAN = [0, 255, 255];
const MUTED = [100, 100, 120];

function writeBmp(path, width, height, paint) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowSize * height;
  const buf = Buffer.alloc(54 + pixelBytes);

  buf.write('BM', 0);
  buf.writeUInt32LE(54 + pixelBytes, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);

  for (let y = 0; y < height; y += 1) {
    const row = height - 1 - y;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = paint(x, y, width, height);
      const offset = 54 + row * rowSize + x * 3;
      buf[offset] = b;
      buf[offset + 1] = g;
      buf[offset + 2] = r;
    }
  }

  writeFileSync(path, buf);
}

mkdirSync(outDir, { recursive: true });

writeBmp(join(outDir, 'header.bmp'), 150, 57, (x, y, w, h) => {
  if (y < 3) return ACCENT;
  if (x < 4) return ACCENT;
  if (x > w - 8 && y > h - 14) return CYAN;
  return BG;
});

writeBmp(join(outDir, 'sidebar.bmp'), 164, 314, (x, y, w, h) => {
  if (x < 6) return ACCENT;
  if (y < 8) return ACCENT;
  if (y > h - 24) return [20, 20, 32];
  const stripe = Math.floor((y + x) / 18) % 2 === 0;
  return stripe ? BG : [16, 16, 26];
});

writeFileSync(
  join(outDir, 'license.txt'),
  `2XKO Notes — End User License

Copyright © PixelR. All rights reserved.

Your local notes are stored in your Documents folder (Documents\\2XKO Notes\\)
and are NOT removed when you update or reinstall this application.

By installing 2XKO Notes you agree to use the software at your own risk.
The author is not affiliated with Riot Games or 2XKO.
`
);

console.log('NSIS assets written to', outDir);
