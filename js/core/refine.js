// Auto-alignment: nudge the 4 tapped chart corners so every swatch sample disc sits inside a uniform swatch.
import { chartLayout } from './layout.js';

/** Color standard deviation (8-bit units) inside a disc, on a sparse pixel grid for speed. */
function discStd(img, cx, cy, r, step) {
  const { width, height, data } = img;
  const r2 = r * r;
  let n = 0;
  const s = [0, 0, 0];
  const s2 = [0, 0, 0];
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(height - 1, Math.ceil(cy + r)); y += step) {
    const dy = y - cy;
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(width - 1, Math.ceil(cx + r)); x += step) {
      const dx = x - cx;
      if (dx * dx + dy * dy > r2) continue;
      const i = (y * width + x) * 4;
      for (let k = 0; k < 3; k++) {
        const v = data[i + k];
        s[k] += v;
        s2[k] += v * v;
      }
      n++;
    }
  }
  if (n < 4) return 255; // off-image: maximal penalty
  let variance = 0;
  for (let k = 0; k < 3; k++) variance += s2[k] / n - (s[k] / n) ** 2;
  return Math.sqrt(Math.max(0, variance));
}

/** Mean non-uniformity of large discs on every swatch; lowest when discs are centered in their swatches. */
export function chartAlignmentCost(img, kit, corners, water, radiusFactor = 0.36) {
  const layout = chartLayout(kit, corners, water, radiusFactor);
  const step = Math.max(1, Math.round(layout.pitch / 40));
  let total = 0;
  let n = 0;
  for (const p of layout.params) {
    for (const sw of p.swatches) {
      total += discStd(img, sw.point[0], sw.point[1], sw.radius, step);
      n++;
    }
  }
  return total / n;
}

/**
 * Coordinate-descent search over the 4 corners (plus whole-quad translations), limited to maxShift × pitch
 * from the starting corners. Corners must already be in chart orientation.
 */
export function refineCorners(img, kit, corners, water, { maxShift = 0.45 } = {}) {
  const pitch = chartLayout(kit, corners, water).pitch;
  const limit = maxShift * pitch;
  const cost = (c) => chartAlignmentCost(img, kit, c, water);
  const initialCost = cost(corners);
  let best = corners.map((c) => [...c]);
  let bestCost = initialCost;

  const tryMove = (cand) => {
    if (cand.some((c, i) => Math.hypot(c[0] - corners[i][0], c[1] - corners[i][1]) > limit)) return false;
    const c = cost(cand);
    if (c < bestCost - 1e-6) {
      best = cand;
      bestCost = c;
      return true;
    }
    return false;
  };

  for (const f of [0.16, 0.08, 0.04, 0.02]) {
    const step = f * pitch;
    for (let pass = 0; pass < 6; pass++) {
      let improved = false;
      for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        improved = tryMove(best.map(([x, y]) => [x + dx, y + dy])) || improved;
      }
      for (let i = 0; i < 4; i++) {
        for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
          const cand = best.map((c) => [...c]);
          cand[i] = [cand[i][0] + dx, cand[i][1] + dy];
          improved = tryMove(cand) || improved;
        }
      }
      if (!improved) break;
    }
  }
  return { corners: best, cost: bestCost, initialCost };
}
