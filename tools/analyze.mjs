#!/usr/bin/env node
// Analyze a test-strip photo from the command line (same engine as the web app).
//
//   node tools/analyze.mjs photo.jpg --corners 2164,237 3415,196 3450,1535 2179,1545 \
//        --pads 1200,400 1200,1400 [--water fresh|salt] [--space display-p3|srgb] [--overlay out.jpg] [--json]
//
// Chart corners are auto-aligned unless --refine off is given.
// --pads takes either 2 points (tip pad, handle-side pad -> evenly interpolated) or one point per pad.
import { loadJpeg, saveJpeg, drawCircle, drawCross } from './lib/image-node.mjs';
import { parseArgs } from './lib/args.mjs';
import { analyze, interpolatePads } from '../js/core/analyze.js';
import { getKit } from '../js/kits/index.js';
import { formatReading } from '../js/core/format.js';

function main() {
  const opts = parseArgs(process.argv.slice(2), { kit: 'api-5in1', water: 'fresh', space: 'display-p3' });
  if (!opts._[0] || !opts.corners || !opts.pads) {
    console.error('usage: node tools/analyze.mjs photo.jpg --corners x,y x,y x,y x,y --pads x,y x,y [--water fresh|salt] [--overlay out.jpg] [--json]');
    process.exit(2);
  }
  const kit = getKit(opts.kit);
  const img = loadJpeg(opts._[0]);
  const pads = opts.pads.length === 2 ? interpolatePads(kit, opts.pads[0], opts.pads[1]) : opts.pads;
  const result = analyze(img, kit, { corners: opts.corners, pads, water: opts.water, space: opts.space, refine: opts.refine !== 'off' });

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`${kit.name} — ${opts.water}water — chart match ΔE ${result.chartMismatch?.toFixed(1) ?? 'n/a'}`);
    for (const p of result.params) {
      if (!p.match) {
        console.log(`  ${p.symbol.padEnd(5)} (no reading)`);
        continue;
      }
      const m = p.match;
      console.log(
        `  ${p.symbol.padEnd(5)} ${formatReading(p).padEnd(28)} nearest ${String(m.nearest.value).padStart(5)} (ΔE ${m.nearest.deltaE.toFixed(1)})  fit ΔE ${m.fitDeltaE.toFixed(1)} [${p.quality}]`,
      );
    }
    for (const w of result.warnings) console.log(`  ! ${w.message}`);
  }

  if (opts.overlay) {
    for (const p of result.params) {
      for (const s of p.swatches) drawCircle(img, s.point[0], s.point[1], s.radius, [255, 0, 255]);
      drawCircle(img, p.pad.point[0], p.pad.point[1], p.pad.radius, [0, 255, 0]);
      drawCross(img, p.pad.point[0], p.pad.point[1], p.pad.radius * 0.5, [0, 255, 0]);
    }
    for (const w of result.whites) drawCircle(img, w.point[0], w.point[1], w.radius, [0, 200, 255]);
    for (const g of result.gaps) drawCircle(img, g.point[0], g.point[1], g.radius, [0, 200, 255]);
    result.corners.forEach((c, i) => drawCross(img, c[0], c[1], 30 - i * 5, [255, 128, 0]));
    saveJpeg(opts.overlay, img);
    if (!opts.json) console.log(`overlay -> ${opts.overlay}`);
  }
}

main();
