// Generates AumoN's branded leaf PNG assets with zero dependencies (raw PNG
// encoder + zlib). Run: `node scripts/generate-icons.js`. Outputs to assets/.
//
// Design: a vesica-piscis leaf (intersection of two circles) in AumoN green on
// the dark slate brand background, with a midrib vein + stem.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const crcTable = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
};

const render = (size, { transparent = false, scale = 1 } = {}) => {
  const cx = size / 2, cy = size / 2;
  const R = 0.42 * size * scale, d = 0.22 * size * scale;
  const tipY = cy + Math.sqrt(R * R - d * d);   // bottom point of the leaf
  const bg = transparent ? [15, 23, 42, 0] : [15, 23, 42, 255];

  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      let col = bg;
      const inLeaf = Math.hypot(x - (cx - d), y - cy) < R && Math.hypot(x - (cx + d), y - cy) < R;
      if (inLeaf) col = Math.abs(x - cx) < size * 0.006 * scale ? [16, 163, 74, 255] : [34, 197, 94, 255];
      if (x > cx - size * 0.013 * scale && x < cx + size * 0.013 * scale && y > tipY && y < tipY + size * 0.10 * scale) {
        col = [16, 163, 74, 255];
      }
      raw[p++] = col[0]; raw[p++] = col[1]; raw[p++] = col[2]; raw[p++] = col[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const out = path.join(__dirname, '..', 'assets');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon.png'), render(1024));
fs.writeFileSync(path.join(out, 'splash.png'), render(1024));
fs.writeFileSync(path.join(out, 'adaptive-icon.png'), render(1024, { transparent: true, scale: 0.66 }));
console.log('Wrote icon.png, splash.png, adaptive-icon.png to', out);
