#!/usr/bin/env node
// Print reference swatch colors of a chart photo, for filling `ref` / `refWhite` in a kit file.
//
//   node tools/kit-colors.mjs chart.jpg --corners TLx,TLy TRx,TRy BRx,BRy BLx,BLy [--kit api-5in1] [--space display-p3]
//
// Corners must be given in chart orientation (TL, TR, BR, BL). Use --overlay out.jpg to check placement.
import { loadJpeg, saveJpeg, drawCircle } from './lib/image-node.mjs';
import { parseArgs } from './lib/args.mjs';
import { chartLayout } from '../js/core/analyze.js';
import { sampleDisc } from '../js/core/sample.js';
import { getKit } from '../js/kits/index.js';

const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const opts = parseArgs(process.argv.slice(2), { kit: 'api-5in1', space: 'display-p3' });
if (!opts._[0] || !opts.corners) {
  console.error('usage: node tools/kit-colors.mjs chart.jpg --corners x,y x,y x,y x,y [--kit id] [--overlay out.jpg]');
  process.exit(2);
}
const kit = getKit(opts.kit);
const img = loadJpeg(opts._[0]);
const out = { refWhite: null, scales: {} };
for (const water of kit.waterTypes.map((w) => w.id)) {
  const layout = chartLayout(kit, opts.corners, water);
  for (const p of layout.params) {
    const samples = p.swatches.map((s) => sampleDisc(img, s.point[0], s.point[1], s.radius, opts.space));
    out.scales[`${p.id}/${water}`] = samples.map((s) => `${hex(s.rgb)} (spread ${s.spread.toFixed(1)})`);
    if (opts.overlay) p.swatches.forEach((s) => drawCircle(img, s.point[0], s.point[1], s.radius));
  }
  const whites = layout.whites.map((w) => sampleDisc(img, w.point[0], w.point[1], w.radius, opts.space));
  out.refWhite = whites.map((w) => `${hex(w.rgb)} (spread ${w.spread.toFixed(1)})`);
  if (opts.overlay) layout.whites.forEach((w) => drawCircle(img, w.point[0], w.point[1], w.radius, [0, 200, 255]));
}
console.log(JSON.stringify(out, null, 2));
if (opts.overlay) saveJpeg(opts.overlay, img);
