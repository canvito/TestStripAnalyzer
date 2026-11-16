// End-to-end analysis of one photo: chart swatches + strip pads -> readings with quality checks.
import { scaleFor, orderClockwise, rotate, chartLayout, padLayout } from './layout.js';
import { refineCorners } from './refine.js';
import { sampleDisc } from './sample.js';
import { matchScale, fitQuality, DEFAULT_TOLERANCE } from './match.js';
import { deltaE2000, linearRgbToLab, decodeChannel } from './color.js';

export const LIMITS = {
  swatchSpread: 7, // mean ΔE*ab inside a chart swatch disc; higher = disc overlaps border/text
  padSpread: 9, // pads are textured paper, allow a bit more
  clipped: 0.05, // fraction of blown-out pixels in a disc
  lightingRatio: [0.7, 1.4], // strip-white / chart-white luminance
  chartMismatch: 14, // median ΔE00 vs. reference card after white balance
};

export { scaleFor, paramsFor, orderClockwise, interpolatePads, chartLayout, padLayout } from './layout.js';

function averageSamples(samples, space) {
  const ok = samples.filter((s) => s && s.ok);
  if (!ok.length) return null;
  const lin = [0, 1, 2].map((k) => ok.reduce((s, x) => s + x.linear[k], 0) / ok.length);
  return { ok: true, linear: lin, lab: linearRgbToLab(lin, space), luminance: 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2] };
}

function hexToLinear(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(decodeChannel);
}

/**
 * How well the sampled chart matches the kit's reference card (median ΔE00 after a von Kries white balance).
 * Returns null when the kit carries no reference colors.
 */
export function chartMismatch(kit, layout, swatchSamples, white, space, water) {
  if (!kit.chart.refWhite || !white) return null;
  const refWhite = hexToLinear(kit.chart.refWhite);
  const gain = refWhite.map((v, k) => v / Math.max(1e-6, white.linear[k]));
  const diffs = [];
  for (const p of layout.params) {
    const refs = scaleFor(kit.params.find((x) => x.id === p.id), water)?.ref;
    if (!refs) continue;
    swatchSamples[p.id].forEach((s, i) => {
      if (!s.ok || !refs[i]) return;
      const balanced = s.linear.map((v, k) => v * gain[k]);
      diffs.push(deltaE2000(linearRgbToLab(balanced, space), linearRgbToLab(hexToLinear(refs[i]), space)));
    });
  }
  if (!diffs.length) return null;
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)];
}

function sampleChart(img, kit, corners, water, space) {
  const layout = chartLayout(kit, corners, water);
  const swatchSamples = {};
  for (const p of layout.params) {
    swatchSamples[p.id] = p.swatches.map((s) => sampleDisc(img, s.point[0], s.point[1], s.radius, space));
  }
  const whiteSamples = layout.whites.map((w) => sampleDisc(img, w.point[0], w.point[1], w.radius, space));
  const white = averageSamples(whiteSamples, space);
  const mismatch = chartMismatch(kit, layout, swatchSamples, white, space, water);
  return { corners, layout, swatchSamples, white, whiteSamples, mismatch };
}

/**
 * @param {{width:number,height:number,data:Uint8ClampedArray|Uint8Array}} img RGBA pixels
 * @param {object} kit
 * @param {object} opts
 * @param {number[][]} opts.corners 4 chart-table corners [x, y] (any order when autoOrient is true)
 * @param {number[][]} opts.pads    center of every pad, tip first (see interpolatePads)
 * @param {string} [opts.water]     'fresh' | 'salt'
 * @param {string} [opts.space]     'srgb' | 'display-p3' — color space of the pixel values
 * @param {boolean} [opts.autoOrient] pick the corner rotation that best matches the reference card
 * @param {boolean} [opts.refine]   nudge corners so sample discs are centered in the swatches
 */
export function analyze(img, kit, { corners, pads, water = 'fresh', space = 'srgb', autoOrient = true, refine = false, tolerance = DEFAULT_TOLERANCE } = {}) {
  if (!corners || corners.length !== 4) throw new Error('Need 4 chart corners');
  if (!pads || pads.length !== kit.strip.padOrder.length) throw new Error(`Need ${kit.strip.padOrder.length} pad centers`);

  let chart;
  if (autoOrient && kit.chart.refWhite) {
    const cw = orderClockwise(corners);
    const candidates = [0, 1, 2, 3].map((k) => sampleChart(img, kit, rotate(cw, k), water, space));
    chart = candidates.reduce((best, c) => ((c.mismatch ?? Infinity) < (best.mismatch ?? Infinity) ? c : best));
  } else {
    chart = sampleChart(img, kit, corners, water, space);
  }
  let refinement = null;
  if (refine) {
    refinement = refineCorners(img, kit, chart.corners, water);
    chart = sampleChart(img, kit, refinement.corners, water, space);
  }
  const usedCorners = chart.corners;

  const strip = padLayout(kit, pads);
  const padSamples = strip.pads.map((p) => sampleDisc(img, p.point[0], p.point[1], p.radius, space));
  const gapSamples = strip.gaps.map((g) => sampleDisc(img, g.point[0], g.point[1], g.radius, space));
  const stripWhite = averageSamples(gapSamples, space);

  const warnings = [];
  const params = [];
  for (const lp of chart.layout.params) {
    const param = kit.params.find((p) => p.id === lp.id);
    const padIndex = kit.strip.padOrder.indexOf(lp.id);
    const pad = { ...strip.pads[padIndex], sample: padSamples[padIndex] };
    const swatches = lp.swatches.map((s, i) => ({ ...s, sample: chart.swatchSamples[lp.id][i] }));
    const entry = {
      id: param.id,
      name: param.name,
      symbol: param.symbol,
      unit: param.unit,
      altUnit: param.altUnit,
      decimals: param.decimals ?? (scaleFor(param, water).values.some((v) => !Number.isInteger(v)) ? 1 : 0),
      readAfterSec: param.readAfterSec,
      values: scaleFor(param, water).values,
      swatches,
      pad,
      match: null,
      quality: 'poor',
    };
    if (!pad.sample.ok || swatches.some((s) => !s.sample.ok)) {
      warnings.push({ level: 'error', code: 'out-of-image', paramId: param.id, message: `${param.name}: sample point is outside the photo or fully blown out.` });
      params.push(entry);
      continue;
    }
    entry.match = matchScale(pad.sample.lab, swatches.map((s) => s.sample.lab), entry.values, { tolerance });
    entry.quality = fitQuality(entry.match.fitDeltaE);

    if (entry.quality === 'poor') {
      warnings.push({
        level: 'warn',
        code: 'poor-fit',
        paramId: param.id,
        message: `${param.name}: pad color is far from every chart color (ΔE ${entry.match.fitDeltaE.toFixed(1)}). Check pad position, glare, shadows and read timing.`,
      });
    }
    if (pad.sample.spread > LIMITS.padSpread) {
      warnings.push({ level: 'warn', code: 'pad-nonuniform', paramId: param.id, message: `${param.name}: pad sample is not uniform — move the marker to the middle of the pad.` });
    }
    const badSwatch = swatches.find((s) => s.sample.spread > LIMITS.swatchSpread);
    if (badSwatch) {
      warnings.push({ level: 'warn', code: 'swatch-nonuniform', paramId: param.id, message: `${param.name}: chart swatch ${badSwatch.value} sample overlaps an edge or text — adjust the table corners.` });
    }
    const clipped = [pad, ...swatches].some((s) => s.sample.clippedFraction > LIMITS.clipped);
    if (clipped) {
      warnings.push({ level: 'warn', code: 'clipped', paramId: param.id, message: `${param.name}: glare / over-exposure detected. Avoid direct light reflections and flash.` });
    }
    params.push(entry);
  }

  let lightingRatio = null;
  if (stripWhite && chart.white) {
    lightingRatio = stripWhite.luminance / chart.white.luminance;
    const [lo, hi] = LIMITS.lightingRatio;
    if (lightingRatio < lo || lightingRatio > hi) {
      warnings.push({
        level: 'warn',
        code: 'lighting-mismatch',
        message: `Strip and chart look unevenly lit (strip white is ${Math.round(lightingRatio * 100)}% of chart white). Lay the strip on the card and avoid shadows.`,
      });
    }
  }
  if (chart.mismatch != null && chart.mismatch > LIMITS.chartMismatch) {
    warnings.push({
      level: 'warn',
      code: 'chart-mismatch',
      message: `The chart in the photo does not look like the ${kit.name} card (ΔE ${chart.mismatch.toFixed(1)}). Check that the 4 corners are on the outer corners of the color table.`,
    });
  }

  return {
    kitId: kit.id,
    water,
    space,
    corners: usedCorners,
    refinement,
    chartMismatch: chart.mismatch,
    chartWhite: chart.white,
    whites: chart.layout.whites,
    stripWhite,
    gaps: strip.gaps,
    lightingRatio,
    params,
    warnings,
  };
}
