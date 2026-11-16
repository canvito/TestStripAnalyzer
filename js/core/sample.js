// Robust color sampling of a circular region of an RGBA image ({ width, height, data }).
import { LINEAR_LUT, linearRgbToLab, encodeChannel, deltaE76 } from './color.js';

const CLIP = 254;

/**
 * Average the pixels in a disc, ignoring clipped pixels and trimming the darkest / brightest
 * fractions (texture, specks, glare). Averaging is done in linear light.
 */
export function sampleDisc(img, cx, cy, r, space = 'srgb', { trimLow = 0.1, trimHigh = 0.2 } = {}) {
  const { width, height, data } = img;
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(width - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(height - 1, Math.ceil(cy + r));
  const lin = [];
  let total = 0;
  let clipped = 0;
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy;
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      if (dx * dx + dy * dy > r2) continue;
      total++;
      const i = (y * width + x) * 4;
      const R = data[i];
      const G = data[i + 1];
      const B = data[i + 2];
      if (R >= CLIP || G >= CLIP || B >= CLIP) {
        clipped++;
        continue;
      }
      const lr = LINEAR_LUT[R];
      const lg = LINEAR_LUT[G];
      const lb = LINEAR_LUT[B];
      lin.push([lr, lg, lb, 0.2126 * lr + 0.7152 * lg + 0.0722 * lb]);
    }
  }
  if (lin.length < 5) {
    return { ok: false, n: total, clippedFraction: total ? clipped / total : 1 };
  }
  lin.sort((a, b) => a[3] - b[3]);
  const lo = Math.floor(lin.length * trimLow);
  const hi = Math.max(lo + 1, Math.ceil(lin.length * (1 - trimHigh)));
  const kept = lin.slice(lo, hi);
  const mean = [0, 0, 0];
  for (const p of kept) {
    mean[0] += p[0];
    mean[1] += p[1];
    mean[2] += p[2];
  }
  mean[0] /= kept.length;
  mean[1] /= kept.length;
  mean[2] /= kept.length;
  const lab = linearRgbToLab(mean, space);

  // Spread: mean ΔE*ab of all unclipped pixels from the robust mean (high = non-uniform region).
  const stride = Math.max(1, Math.floor(lin.length / 400));
  let spread = 0;
  let m = 0;
  for (let k = 0; k < lin.length; k += stride) {
    spread += deltaE76(linearRgbToLab(lin[k], space), lab);
    m++;
  }

  return {
    ok: true,
    lab,
    linear: mean,
    rgb: mean.map(encodeChannel),
    luminance: 0.2126 * mean[0] + 0.7152 * mean[1] + 0.0722 * mean[2],
    n: total,
    used: kept.length,
    clippedFraction: clipped / total,
    spread: spread / m,
  };
}
