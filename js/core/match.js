// Match a pad color against a chart scale: treat the swatches as a piecewise-linear path in CIELAB,
// find the closest point on that path by CIEDE2000, and interpolate the value along it.
import { deltaE2000, lerp3 } from './color.js';

export const DEFAULT_TOLERANCE = 2.0;

function segmentAt(n, pos) {
  const i = Math.min(n - 2, Math.max(0, Math.floor(pos)));
  return [i, pos - i];
}

export function labAt(swatchLabs, pos) {
  if (swatchLabs.length === 1) return swatchLabs[0];
  const [i, t] = segmentAt(swatchLabs.length, pos);
  return lerp3(swatchLabs[i], swatchLabs[i + 1], t);
}

export function valueAt(values, pos) {
  if (values.length === 1) return values[0];
  const p = Math.min(values.length - 1, Math.max(0, pos));
  const [i, t] = segmentAt(values.length, p);
  return values[i] + (values[i + 1] - values[i]) * t;
}

/**
 * @param {number[]} padLab
 * @param {number[][]} swatchLabs  Lab of each chart swatch, in scale order
 * @param {number[]} values        chart value of each swatch
 * @param {object} [opts]
 * @param {number} [opts.tolerance] ΔE00 above the best match still considered indistinguishable (range)
 * @param {number} [opts.extrapolate] how far (in swatch steps) to extend the path beyond both ends
 */
export function matchScale(padLab, swatchLabs, values, { tolerance = DEFAULT_TOLERANCE, extrapolate = 0.5, steps = 50 } = {}) {
  const n = swatchLabs.length;
  if (n < 2 || values.length !== n) throw new Error('A scale needs at least 2 swatches with matching values');

  const dist = (pos) => deltaE2000(padLab, labAt(swatchLabs, pos));
  const posMin = -extrapolate;
  const posMax = n - 1 + extrapolate;
  const count = Math.round((posMax - posMin) * steps);
  const samples = [];
  let best = 0;
  for (let k = 0; k <= count; k++) {
    const pos = posMin + k / steps;
    samples.push({ pos, d: dist(pos) });
    if (samples[k].d < samples[best].d) best = k;
  }

  // Golden-section refinement around the best grid sample.
  let a = Math.max(posMin, samples[best].pos - 1 / steps);
  let b = Math.min(posMax, samples[best].pos + 1 / steps);
  const g = (Math.sqrt(5) - 1) / 2;
  for (let it = 0; it < 30; it++) {
    const c = b - g * (b - a);
    const d = a + g * (b - a);
    if (dist(c) < dist(d)) b = d;
    else a = c;
  }
  const bestPos = (a + b) / 2;
  const fitDeltaE = dist(bestPos);

  // Indistinguishable range: contiguous positions whose path color is within tolerance of the best fit.
  const limit = fitDeltaE + tolerance;
  let lo = best;
  while (lo > 0 && samples[lo - 1].d <= limit) lo--;
  let hi = best;
  while (hi < samples.length - 1 && samples[hi + 1].d <= limit) hi++;

  const clampPos = (p) => Math.min(n - 1, Math.max(0, p));
  const swatchDeltaE = swatchLabs.map((s) => deltaE2000(padLab, s));
  let nearest = 0;
  swatchDeltaE.forEach((d, i) => {
    if (d < swatchDeltaE[nearest]) nearest = i;
  });

  let outOfRange = null;
  if (bestPos < -0.05) outOfRange = 'below';
  else if (bestPos > n - 1 + 0.05) outOfRange = 'above';

  return {
    position: clampPos(bestPos),
    value: valueAt(values, bestPos),
    outOfRange,
    fitDeltaE,
    range: [valueAt(values, clampPos(samples[lo].pos)), valueAt(values, clampPos(samples[hi].pos))],
    positionRange: [clampPos(samples[lo].pos), clampPos(samples[hi].pos)],
    nearest: { index: nearest, value: values[nearest], deltaE: swatchDeltaE[nearest] },
    swatchDeltaE,
  };
}

export function fitQuality(fitDeltaE) {
  if (fitDeltaE <= 3) return 'good';
  if (fitDeltaE <= 6) return 'fair';
  return 'poor';
}
