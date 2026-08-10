/**
 * Renders the launcher mark to PNG.
 *
 * Two things need raster copies that the adaptive icon cannot supply:
 *   - Android 7 (API 24–25) predates adaptive icons and reads the PNG in each
 *     mipmap density folder
 *   - the Play Store listing needs a flat 512x512
 *
 * The geometry is a duplicate of res/drawable/ic_launcher_foreground.xml.
 * Duplication is deliberate: the vector is parsed by the platform and this file
 * by Node, and neither can read the other. Change one, change both — the
 * constants below are laid out to make that a mechanical edit.
 *
 * No image library. PNG is a container around zlib, and zlib ships with Node,
 * so a dependency here would buy nothing but supply-chain surface (Principle VI).
 *
 *   node scripts/generate-android-icons.mjs
 */

import {deflateSync} from 'node:zlib';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');

/** Brand accent and ground — src/theme/brand.ts, design-system.md §1. */
const BACKGROUND = [0xec, 0x30, 0x13];
const FOREGROUND = [0xf3, 0xf2, 0xf2];

/**
 * The mark, on the same 108-unit canvas the vector uses.
 *
 * A legacy icon is NOT masked, so it may use more of the canvas than the
 * adaptive foreground does — but keeping one geometry for both is worth more
 * than the few pixels a second layout would win.
 */
const CANVAS = 108;
const SPINE = {x: 36, y: 30, w: 6, h: 48};
const DOTS = [
  {cx: 39, cy: 32, r: 8},
  {cx: 39, cy: 54, r: 8},
  {cx: 39, cy: 76, r: 8},
];
const BARS = [
  {x: 53, y: 29, w: 24, h: 6},
  {x: 53, y: 51, w: 19, h: 6},
  {x: 53, y: 73, w: 14, h: 6},
];

/** Corner rounding of the square icon, as a fraction of its side. */
const CORNER_RATIO = 0.22;
/**
 * Samples per axis. Edges are computed by counting covered sub-pixels rather
 * than by blurring afterwards, so curves stay crisp at 48px — which is the
 * size that actually has to survive.
 */
const SUPERSAMPLE = 4;

/** Is this point inside the mark? Operates in canvas units, not pixels. */
function inMark(x, y) {
  if (
    x >= SPINE.x &&
    x < SPINE.x + SPINE.w &&
    y >= SPINE.y &&
    y < SPINE.y + SPINE.h
  ) {
    return true;
  }
  for (const dot of DOTS) {
    const dx = x - dot.cx;
    const dy = y - dot.cy;
    if (dx * dx + dy * dy <= dot.r * dot.r) {
      return true;
    }
  }
  for (const bar of BARS) {
    if (x >= bar.x && x < bar.x + bar.w && y >= bar.y && y < bar.y + bar.h) {
      return true;
    }
  }
  return false;
}

/** Is this point inside the icon's own silhouette? */
function inShape(x, y, shape) {
  if (shape === 'square') {
    // Full bleed, no rounding, no transparency. Play applies its own corner
    // mask to the listing icon, so rounding it here would round it twice.
    return true;
  }
  if (shape === 'circle') {
    const dx = x - CANVAS / 2;
    const dy = y - CANVAS / 2;
    return dx * dx + dy * dy <= (CANVAS / 2) * (CANVAS / 2);
  }
  const r = CANVAS * CORNER_RATIO;
  const cx = Math.min(Math.max(x, r), CANVAS - r);
  const cy = Math.min(Math.max(y, r), CANVAS - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/** RGBA pixel buffer for one icon, anti-aliased by coverage counting. */
function render(size, shape) {
  const pixels = Buffer.alloc(size * size * 4);
  const step = CANVAS / size;
  const sub = step / SUPERSAMPLE;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let shapeHits = 0;
      let markHits = 0;

      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const x = px * step + sx * sub + sub / 2;
          const y = py * step + sy * sub + sub / 2;
          if (!inShape(x, y, shape)) {
            continue;
          }
          shapeHits++;
          if (inMark(x, y)) {
            markHits++;
          }
        }
      }

      const total = SUPERSAMPLE * SUPERSAMPLE;
      const offset = (py * size + px) * 4;
      if (shapeHits === 0) {
        continue; // stays fully transparent
      }

      // Blend the mark over the background by how much of the pixel it covers,
      // then let the silhouette decide the alpha.
      const markRatio = markHits / shapeHits;
      for (let c = 0; c < 3; c++) {
        pixels[offset + c] = Math.round(
          BACKGROUND[c] * (1 - markRatio) + FOREGROUND[c] * markRatio,
        );
      }
      pixels[offset + 3] = Math.round((shapeHits / total) * 255);
    }
  }

  return pixels;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** 8-bit RGBA, no interlacing — the simplest PNG that carries what we need. */
function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: truecolour with alpha
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  // One filter byte per scanline. Filter 0 (None) keeps this readable; the
  // images are tiny and zlib does the compressing either way.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, {level: 9})),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function write(path, size, shape) {
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, encodePng(size, render(size, shape)));
  console.log(`  ${size.toString().padStart(4)}px  ${path.slice(ROOT.length + 1)}`);
}

/** The five density buckets Android asks for, at the documented sizes. */
const DENSITIES = [
  ['mdpi', 48],
  ['hdpi', 72],
  ['xhdpi', 96],
  ['xxhdpi', 144],
  ['xxxhdpi', 192],
];

console.log('Launcher icons (Android 7 and below):');
for (const [density, size] of DENSITIES) {
  write(join(RES, `mipmap-${density}`, 'ic_launcher.png'), size, 'squircle');
  write(join(RES, `mipmap-${density}`, 'ic_launcher_round.png'), size, 'circle');
}

// Not referenced by the app: Play Console asks for it as a separate upload,
// and it must be square with no transparency of its own.
console.log('\nPlay Store listing icon (upload manually in Play Console):');
write(join(ROOT, '.artifacts', 'store', 'play-icon-512.png'), 512, 'square');

console.log('\nDone. Adaptive icon for Android 8+ lives in res/mipmap-anydpi-v26/.');
