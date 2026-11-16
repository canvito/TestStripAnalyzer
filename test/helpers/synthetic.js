// Renders synthetic "photos" of a kit's color card plus a dipped strip with known pad values.
import { chartToImage, invert3x3, applyHomography, distance } from '../../js/core/geometry.js';
import { decodeChannel, encodeChannel, linearRgbToLab, labToLinearRgb } from '../../js/core/color.js';
import { labAt, valueAt } from '../../js/core/match.js';
import { scaleFor } from '../../js/core/analyze.js';

const hexToLinear = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(decodeChannel);
};

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/**
 * @param {object} kit
 * @param {object} o
 * @param {number[][]} o.corners      image positions of the table corners TL, TR, BR, BL (chart orientation)
 * @param {number[][]} o.padEnds      image positions of the tip pad and handle-side pad centers
 * @param {Record<string, number>} o.padPositions  scale position (in swatch steps) of each pad's true color
 * @returns {{ img, truth: Record<string, number>, pads: number[][] }}
 */
export function renderScene(kit, o) {
  const { width = 1200, height = 900, corners, padEnds, padPositions, water = 'fresh', space = 'display-p3' } = o;
  const gain = o.gain ?? [1, 1, 1];
  const stripGain = o.stripGain ?? [1, 1, 1];
  const noise = o.noise ?? 2;
  const rand = prng(o.seed ?? 7);

  const Hi = invert3x3(chartToImage(corners));
  const [sw, sh] = kit.chart.swatchSize;
  const paper = hexToLinear(kit.chart.refWhite);
  const border = hexToLinear('#2a6a9a');
  const swatchRects = [];
  for (const p of kit.params) {
    for (const s of p.scales) s.swatches.forEach(([u, v], i) => swatchRects.push({ u, v, color: hexToLinear(s.ref[i]) }));
  }

  // Strip geometry.
  const pads = kit.strip.padPositions.map((t) => [padEnds[0][0] + (padEnds[1][0] - padEnds[0][0]) * t, padEnds[0][1] + (padEnds[1][1] - padEnds[0][1]) * t]);
  const len = distance(padEnds[0], padEnds[1]);
  const pitch = len / (pads.length - 1);
  const dir = [(padEnds[1][0] - padEnds[0][0]) / len, (padEnds[1][1] - padEnds[0][1]) / len];
  const padHalf = pitch * 0.32;
  const truth = {};
  const padColors = kit.strip.padOrder.map((id) => {
    const param = kit.params.find((p) => p.id === id);
    const scale = scaleFor(param, water) ?? param.scales[0];
    const labs = scale.ref.map((h) => linearRgbToLab(hexToLinear(h), space));
    const pos = padPositions[id] ?? 0;
    truth[id] = valueAt(scale.values, pos);
    return labToLinearRgb(labAt(labs, pos), space).map((v) => Math.max(0, v));
  });
  const plastic = paper.map((v) => v * 0.98);

  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = [0.18, 0.17, 0.16];
      let onStrip = false;
      const [u, v] = applyHomography(Hi, [x + 0.5, y + 0.5]);
      if (u > -0.15 && u < 1.1 && v > -0.1 && v < 1.15) {
        c = paper;
        const inTable = u >= 0 && u <= 1 && v >= 0 && v <= 1;
        if (inTable && (u < 0.008 || u > 0.992 || v < 0.008 || v > 0.992)) c = border;
        for (const r of swatchRects) {
          if (Math.abs(u - r.u) < sw / 2 && Math.abs(v - r.v) < sh / 2) {
            c = r.color;
            break;
          }
        }
      }
      // Strip coordinates: along (a) from the tip pad, across (b).
      const dx = x + 0.5 - padEnds[0][0];
      const dy = y + 0.5 - padEnds[0][1];
      const a = dx * dir[0] + dy * dir[1];
      const b = -dx * dir[1] + dy * dir[0];
      if (a > -pitch * 0.6 && a < len + pitch * 3 && Math.abs(b) < padHalf * 1.15) {
        onStrip = true;
        c = plastic;
        pads.forEach((pc, i) => {
          const pa = (pc[0] - padEnds[0][0]) * dir[0] + (pc[1] - padEnds[0][1]) * dir[1];
          if (Math.abs(a - pa) < padHalf && Math.abs(b) < padHalf) c = padColors[i];
        });
      }
      const idx = (y * width + x) * 4;
      for (let k = 0; k < 3; k++) {
        const lin = c[k] * gain[k] * (onStrip ? stripGain[k] : 1);
        data[idx + k] = Math.max(0, Math.min(255, Math.round(encodeChannel(lin) + (rand() - 0.5) * 2 * noise)));
      }
      data[idx + 3] = 255;
    }
  }
  return { img: { width, height, data }, truth, pads };
}
