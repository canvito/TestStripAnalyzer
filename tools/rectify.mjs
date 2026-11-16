#!/usr/bin/env node
// Straighten (rectify) a chart table from a photo and draw a 0.05 grid, to read swatch centers for a new kit.
//
//   node tools/rectify.mjs chart.jpg --corners TLx,TLy TRx,TRy BRx,BRy BLx,BLy [--width 1000] [--out rect.jpg]
//
// Writes <out> (plain) and <out>-grid.jpg. Grid lines every 0.05: magenta at odd, green at even multiples,
// so a swatch center at pixel (x, y) of the rectified image is u = x / width, v = y / height.
import { loadJpeg, saveJpeg } from './lib/image-node.mjs';
import { parseArgs } from './lib/args.mjs';
import { chartToImage, applyHomography, distance } from '../js/core/geometry.js';

const opts = parseArgs(process.argv.slice(2), { width: '1000', out: 'rectified.jpg' });
if (!opts._[0] || opts.corners?.length !== 4) {
  console.error('usage: node tools/rectify.mjs chart.jpg --corners TL TR BR BL [--width 1000] [--out rectified.jpg]');
  process.exit(2);
}
const img = loadJpeg(opts._[0]);
const c = opts.corners;
const W = Number(opts.width);
// Keep the physical aspect ratio of the table (average of opposite edge lengths).
const aspect = (distance(c[0], c[1]) + distance(c[3], c[2])) / (distance(c[0], c[3]) + distance(c[1], c[2]));
const H = Math.round(W / aspect);
const Hm = chartToImage(c);

const data = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [sx, sy] = applyHomography(Hm, [(x + 0.5) / W, (y + 0.5) / H]);
    const x0 = Math.floor(sx - 0.5);
    const y0 = Math.floor(sy - 0.5);
    const fx = sx - 0.5 - x0;
    const fy = sy - 0.5 - y0;
    const px = (xx, yy, k) => img.data[(Math.min(img.height - 1, Math.max(0, yy)) * img.width + Math.min(img.width - 1, Math.max(0, xx))) * 4 + k];
    for (let k = 0; k < 3; k++) {
      data[(y * W + x) * 4 + k] = (px(x0, y0, k) * (1 - fx) + px(x0 + 1, y0, k) * fx) * (1 - fy) + (px(x0, y0 + 1, k) * (1 - fx) + px(x0 + 1, y0 + 1, k) * fx) * fy;
    }
    data[(y * W + x) * 4 + 3] = 255;
  }
}
saveJpeg(opts.out, { width: W, height: H, data }, 95);

const grid = data.slice();
const paint = (x, y, col) => grid.set(col, (y * W + x) * 4);
for (let k = 1; k < 20; k++) {
  const col = k % 2 ? [255, 0, 255] : [0, 160, 0];
  for (let y = 0; y < H; y++) paint(Math.round((k * W) / 20), y, col);
  for (let x = 0; x < W; x++) paint(x, Math.round((k * H) / 20), col);
}
const gridOut = opts.out.replace(/(\.jpe?g)?$/i, '-grid.jpg');
saveJpeg(gridOut, { width: W, height: H, data: grid }, 95);
console.log(`table aspect (w/h) ${aspect.toFixed(3)} -> ${opts.out}, ${gridOut} (${W}×${H})`);
