// ============================================================
// Generates 16×16 pixel-art PNG textures for each block face.
// Pure Node.js — no external dependencies (builds PNGs by hand).
// ============================================================
import fs from 'fs';
import { deflateSync } from 'zlib';

const W = 16, H = 16;

// ---- tiny PNG encoder ---------------------------------------

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(pixels /* Uint8Array w*h*4 RGBA */) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- colour helpers -----------------------------------------

function hex(r, g, b) { return [r, g, b, 255]; }
function vary(base, amount) {
  return base.map((v, i) => i === 3 ? v : Math.max(0, Math.min(255, v + (Math.random() * amount * 2 - amount) | 0)));
}

function makeTexture(fn) {
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b, a] = fn(x, y);
      const i = (y * W + x) * 4;
      buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = a;
    }
  }
  return encodePNG(buf);
}

// ---- seeded random for deterministic textures ---------------
let seed = 42;
function srand(s) { seed = s; }
function rand() { seed = (seed * 16807 + 0) % 2147483647; return (seed & 0x7fffffff) / 0x7fffffff; }

// ---- texture definitions ------------------------------------

const textures = {
  // Grass top — green with darker green speckles
  grass_top: () => {
    srand(101);
    return makeTexture((x, y) => {
      const r = rand();
      if (r < 0.15) return hex(60, 120, 30);    // dark green
      if (r < 0.35) return hex(80, 160, 45);     // mid green
      if (r < 0.55) return hex(95, 180, 55);     // bright green
      return hex(75, 148, 40);                     // base green
    });
  },

  // Grass side — green strip on top, dirt below
  grass_side: () => {
    srand(202);
    return makeTexture((x, y) => {
      if (y < 3) {
        // Green top strip
        const r = rand();
        if (r < 0.3) return hex(60, 120, 30);
        if (r < 0.6) return hex(80, 155, 42);
        return hex(72, 140, 38);
      }
      // Dirt portion
      const r = rand();
      if (r < 0.2) return hex(120, 85, 30);
      if (r < 0.45) return hex(145, 105, 45);
      if (r < 0.7) return hex(155, 115, 55);
      return hex(135, 95, 38);
    });
  },

  // Dirt — brown earthy tones with variation
  dirt: () => {
    srand(303);
    return makeTexture((x, y) => {
      const r = rand();
      if (r < 0.15) return hex(100, 70, 25);
      if (r < 0.35) return hex(120, 85, 30);
      if (r < 0.6)  return hex(145, 105, 45);
      if (r < 0.8)  return hex(155, 115, 55);
      return hex(135, 95, 38);
    });
  },

  // Stone — grey with cracks and variation
  stone: () => {
    srand(404);
    return makeTexture((x, y) => {
      const r = rand();
      // Simulate cracks
      if (r < 0.05) return hex(90, 90, 90);      // dark crack
      if (r < 0.15) return hex(105, 105, 105);
      if (r < 0.4)  return hex(125, 125, 125);
      if (r < 0.7)  return hex(140, 140, 140);
      if (r < 0.9)  return hex(150, 150, 150);
      return hex(130, 130, 130);
    });
  },

  // Wood side — brown bark with vertical grain lines
  wood_side: () => {
    srand(505);
    return makeTexture((x, y) => {
      const grain = Math.sin(x * 1.2 + rand() * 0.3) > 0.3;
      const r = rand();
      if (grain) {
        if (r < 0.3) return hex(100, 65, 20);
        return hex(115, 75, 28);
      }
      if (r < 0.25) return hex(140, 100, 40);
      if (r < 0.5)  return hex(155, 110, 48);
      if (r < 0.75) return hex(165, 118, 55);
      return hex(150, 105, 42);
    });
  },

  // Wood top — tree ring cross-section
  wood_top: () => {
    srand(606);
    return makeTexture((x, y) => {
      const cx = x - 7.5, cy = y - 7.5;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const ring = Math.sin(dist * 1.8) > 0;
      const r = rand();
      if (ring) {
        if (r < 0.4) return hex(130, 90, 35);
        return hex(140, 100, 40);
      }
      if (r < 0.4) return hex(170, 130, 60);
      return hex(160, 120, 50);
    });
  },

  // Glass — mostly transparent with light blue tint and edge highlights
  glass: () => {
    srand(707);
    return makeTexture((x, y) => {
      // Border pixels
      if (x === 0 || x === 15 || y === 0 || y === 15) {
        return [180, 210, 230, 180];
      }
      // Inner border
      if (x === 1 || x === 14 || y === 1 || y === 14) {
        return [200, 225, 240, 100];
      }
      // Subtle reflection highlight
      if ((x === 3 || x === 4) && y >= 2 && y <= 5) {
        return [220, 240, 255, 80];
      }
      // Mostly transparent center
      const r = rand();
      if (r < 0.1) return [200, 220, 240, 40];
      return [190, 215, 235, 25];
    });
  },
};

// ---- write files --------------------------------------------

for (const [name, gen] of Object.entries(textures)) {
  const png = gen();
  fs.writeFileSync(`public/textures/${name}.png`, png);
  console.log(`  ✓ ${name}.png (${png.length} bytes)`);
}

console.log('\nAll textures generated!');
