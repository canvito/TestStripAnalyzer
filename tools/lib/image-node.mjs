// Node-only image helpers (development tools and tests). The browser app uses <canvas> instead.
import fs from 'node:fs';
import jpeg from 'jpeg-js';

/** Decode a JPEG into { width, height, data: RGBA Uint8Array }. EXIF orientation is applied. */
export function loadJpeg(path) {
  const buf = fs.readFileSync(path);
  const img = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 2048 });
  return applyOrientation(img, readExifOrientation(buf));
}

export function saveJpeg(path, img, quality = 90) {
  fs.writeFileSync(path, jpeg.encode(img, quality).data);
}

export function readExifOrientation(buf) {
  let i = 2;
  while (i + 4 < buf.length && buf[i] === 0xff) {
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker === 0xe1 && buf.toString('ascii', i + 4, i + 8) === 'Exif') {
      const t = i + 10;
      const le = buf.toString('ascii', t, t + 2) === 'II';
      const r16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
      const r32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
      const ifd = t + r32(t + 4);
      const n = r16(ifd);
      for (let k = 0; k < n; k++) {
        const e = ifd + 2 + k * 12;
        if (r16(e) === 0x0112) return r16(e + 8);
      }
      return 1;
    }
    if (marker === 0xda) break;
    i += 2 + len;
  }
  return 1;
}

function applyOrientation(img, orientation) {
  if (orientation === 1 || !orientation) return img;
  const { width: w, height: h, data } = img;
  const swap = orientation >= 5;
  const W = swap ? h : w;
  const H = swap ? w : h;
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let X;
      let Y;
      switch (orientation) {
        case 2: X = w - 1 - x; Y = y; break;
        case 3: X = w - 1 - x; Y = h - 1 - y; break;
        case 4: X = x; Y = h - 1 - y; break;
        case 5: X = y; Y = x; break;
        case 6: X = h - 1 - y; Y = x; break;
        case 7: X = h - 1 - y; Y = w - 1 - x; break;
        case 8: X = y; Y = w - 1 - x; break;
        default: X = x; Y = y;
      }
      const s = (y * w + x) * 4;
      const d = (Y * W + X) * 4;
      out[d] = data[s];
      out[d + 1] = data[s + 1];
      out[d + 2] = data[s + 2];
      out[d + 3] = 255;
    }
  }
  return { width: W, height: H, data: out };
}

export function crop(img, x0, y0, w, h) {
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.width - 1, Math.max(0, x0 + x));
      const sy = Math.min(img.height - 1, Math.max(0, y0 + y));
      const s = (sy * img.width + sx) * 4;
      const d = (y * w + x) * 4;
      out.set(img.data.subarray(s, s + 4), d);
    }
  }
  return { width: w, height: h, data: out };
}

export function scaleNearest(img, factor) {
  const W = Math.round(img.width * factor);
  const H = Math.round(img.height * factor);
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const sy = Math.min(img.height - 1, Math.floor(y / factor));
    for (let x = 0; x < W; x++) {
      const sx = Math.min(img.width - 1, Math.floor(x / factor));
      const s = (sy * img.width + sx) * 4;
      out.set(img.data.subarray(s, s + 4), (y * W + x) * 4);
    }
  }
  return { width: W, height: H, data: out };
}

export function drawCross(img, x, y, size, rgb = [255, 0, 255]) {
  for (let d = -size; d <= size; d++) {
    setPx(img, Math.round(x + d), Math.round(y), rgb);
    setPx(img, Math.round(x), Math.round(y + d), rgb);
  }
}

export function drawCircle(img, cx, cy, r, rgb = [255, 0, 255]) {
  const steps = Math.max(24, Math.ceil(2 * Math.PI * r));
  for (let k = 0; k < steps; k++) {
    const a = (2 * Math.PI * k) / steps;
    setPx(img, Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a)), rgb);
  }
}

function setPx(img, x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = r;
  img.data[i + 1] = g;
  img.data[i + 2] = b;
}
