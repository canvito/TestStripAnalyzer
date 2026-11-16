// Kit geometry: where chart swatches and strip pads are in the image.
import { chartToImage, applyHomography, distance } from './geometry.js';

export function scaleFor(param, water) {
  return param.scales.find((s) => s.water.includes(water)) || null;
}

export function paramsFor(kit, water) {
  return kit.params.filter((p) => scaleFor(p, water));
}

/** Sort 4 points clockwise (image coords, y down) starting from the one nearest the top-left. */
export function orderClockwise(points) {
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  const sorted = [...points].sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  let start = 0;
  sorted.forEach((p, i) => {
    if (p[0] + p[1] < sorted[start][0] + sorted[start][1]) start = i;
  });
  return rotate(sorted, start);
}

export function rotate(arr, k) {
  return arr.map((_, i) => arr[(i + k) % arr.length]);
}

/** Evenly place pad centers between the tip pad and the handle-side pad using the kit's pad positions. */
export function interpolatePads(kit, first, last) {
  return kit.strip.padPositions.map((t) => [first[0] + (last[0] - first[0]) * t, first[1] + (last[1] - first[1]) * t]);
}

function neighbourRadius(points, i, factor) {
  const d = [];
  if (i > 0) d.push(distance(points[i], points[i - 1]));
  if (i < points.length - 1) d.push(distance(points[i], points[i + 1]));
  return factor * (d.reduce((s, v) => s + v, 0) / d.length);
}

/**
 * Image-space geometry of the chart for the given corners (TL, TR, BR, BL in chart orientation).
 * Sample radius = radiusFactor × local swatch pitch.
 */
export function chartLayout(kit, corners, water, radiusFactor = kit.chart.sampleRadius) {
  const H = chartToImage(corners);
  let pitch = 0;
  const params = paramsFor(kit, water).map((p) => {
    const scale = scaleFor(p, water);
    const points = scale.swatches.map((uv) => applyHomography(H, uv));
    pitch ||= distance(points[0], points[1]);
    return {
      id: p.id,
      swatches: points.map((pt, i) => ({ value: scale.values[i], point: pt, radius: neighbourRadius(points, i, radiusFactor) })),
    };
  });
  const whites = (kit.chart.whitePoints || []).map((uv) => ({ point: applyHomography(H, uv), radius: pitch * 0.25 }));
  return { H, params, whites, pitch };
}

export function padLayout(kit, pads) {
  const r = kit.strip.sampleRadius;
  const list = pads.map((pt, i) => ({ id: kit.strip.padOrder[i], point: pt, radius: neighbourRadius(pads, i, r) }));
  // Midpoints between neighbouring pads: the bare (white) strip backing.
  const gaps = pads.slice(1).map((pt, i) => ({
    point: [(pt[0] + pads[i][0]) / 2, (pt[1] + pads[i][1]) / 2],
    radius: distance(pt, pads[i]) * 0.08,
  }));
  return { pads: list, gaps };
}
