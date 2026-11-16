import { test } from 'node:test';
import assert from 'node:assert/strict';
import kit from '../js/kits/api-5in1.js';
import { analyze, interpolatePads, orderClockwise } from '../js/core/analyze.js';
import { renderScene } from './helpers/synthetic.js';

// Table drawn with mild perspective, strip lying to its left.
const CORNERS = [[430, 120], [1080, 95], [1110, 790], [440, 805]];
const PAD_ENDS = [[250, 140], [262, 700]];
const POSITIONS = { no3: 1.5, no2: 0, ph: 2.6, kh: 3, gh: 1.25 };

function expectReadings(result, truth, kitParams = kit.params) {
  for (const p of result.params) {
    const param = kitParams.find((k) => k.id === p.id);
    const values = p.values;
    const step = (values[values.length - 1] - values[0]) / (values.length - 1);
    const tol = Math.max(0.15 * step, 1e-6);
    assert.ok(p.match, `${param.id} has a reading`);
    assert.ok(Math.abs(p.match.value - truth[p.id]) <= tol, `${p.id}: expected ${truth[p.id]}, got ${p.match.value.toFixed(3)}`);
    assert.ok(p.match.range[0] <= truth[p.id] + tol && p.match.range[1] >= truth[p.id] - tol, `${p.id}: truth inside range ${p.match.range}`);
    assert.equal(p.quality, 'good', `${p.id} fit ΔE ${p.match.fitDeltaE}`);
  }
}

test('reads all five parameters from a synthetic photo', () => {
  const { img, truth } = renderScene(kit, { corners: CORNERS, padEnds: PAD_ENDS, padPositions: POSITIONS });
  const pads = interpolatePads(kit, PAD_ENDS[0], PAD_ENDS[1]);
  const result = analyze(img, kit, { corners: CORNERS, pads, space: 'display-p3' });
  assert.equal(result.params.length, 5);
  expectReadings(result, truth);
  assert.deepEqual(result.warnings, []);
  assert.ok(result.chartMismatch < 3);
});

test('a color cast affecting chart and strip equally does not change the reading', () => {
  const { img, truth } = renderScene(kit, { corners: CORNERS, padEnds: PAD_ENDS, padPositions: POSITIONS, gain: [1.15, 0.95, 0.7] });
  const pads = interpolatePads(kit, PAD_ENDS[0], PAD_ENDS[1]);
  const result = analyze(img, kit, { corners: CORNERS, pads, space: 'display-p3' });
  expectReadings(result, truth);
});

test('corner tap order and card rotation are detected automatically', () => {
  // Card rotated 90° clockwise in the photo: the chart's top-left corner sits at the image top-right.
  const rotated = [[1000, 150], [1000, 800], [330, 800], [330, 150]];
  const ends = [[150, 120], [150, 680]];
  const { img, truth } = renderScene(kit, { corners: rotated, padEnds: ends, padPositions: POSITIONS });
  const scrambled = [rotated[2], rotated[0], rotated[3], rotated[1]];
  const result = analyze(img, kit, { corners: scrambled, pads: interpolatePads(kit, ends[0], ends[1]), space: 'display-p3' });
  expectReadings(result, truth);
  result.corners.forEach((c, i) => assert.ok(Math.hypot(c[0] - rotated[i][0], c[1] - rotated[i][1]) < 1e-6, `corner ${i}`));
});

test('saltwater uses the saltwater pH row and skips GH', () => {
  const { img, truth } = renderScene(kit, { corners: CORNERS, padEnds: PAD_ENDS, padPositions: { ...POSITIONS, ph: 4.4 }, water: 'salt' });
  const result = analyze(img, kit, { corners: CORNERS, pads: interpolatePads(kit, PAD_ENDS[0], PAD_ENDS[1]), water: 'salt', space: 'display-p3' });
  assert.deepEqual(result.params.map((p) => p.id), ['no3', 'no2', 'ph', 'kh']);
  expectReadings(result, truth);
});

test('a shadow over the strip triggers a lighting warning', () => {
  const { img } = renderScene(kit, { corners: CORNERS, padEnds: PAD_ENDS, padPositions: POSITIONS, stripGain: [0.45, 0.45, 0.45] });
  const result = analyze(img, kit, { corners: CORNERS, pads: interpolatePads(kit, PAD_ENDS[0], PAD_ENDS[1]), space: 'display-p3' });
  assert.ok(result.warnings.some((w) => w.code === 'lighting-mismatch'));
});

test('misplaced chart corners are reported', () => {
  const { img } = renderScene(kit, { corners: CORNERS, padEnds: PAD_ENDS, padPositions: POSITIONS });
  const shifted = CORNERS.map(([x, y]) => [x + 45, y + 30]);
  const result = analyze(img, kit, { corners: shifted, pads: interpolatePads(kit, PAD_ENDS[0], PAD_ENDS[1]), space: 'display-p3' });
  assert.ok(result.warnings.some((w) => w.code === 'swatch-nonuniform' || w.code === 'chart-mismatch'));
});

test('auto-alignment recovers from imprecise corner taps', () => {
  const { img, truth } = renderScene(kit, { corners: CORNERS, padEnds: PAD_ENDS, padPositions: POSITIONS });
  const sloppy = CORNERS.map(([x, y], i) => [x + [14, -12, 10, -15][i], y + [-11, 13, 12, -9][i]]);
  const pads = interpolatePads(kit, PAD_ENDS[0], PAD_ENDS[1]);
  const raw = analyze(img, kit, { corners: sloppy, pads, space: 'display-p3' });
  assert.ok(raw.warnings.some((w) => w.code === 'swatch-nonuniform'), 'sloppy corners should misplace some swatch samples');
  const result = analyze(img, kit, { corners: sloppy, pads, space: 'display-p3', refine: true });
  assert.ok(result.refinement.cost < result.refinement.initialCost);
  assert.deepEqual(result.warnings, []);
  expectReadings(result, truth);
});

test('orderClockwise starts at the top-left-most point', () => {
  assert.deepEqual(orderClockwise([[10, 10], [0, 10], [10, 0], [0, 0]]), [[0, 0], [10, 0], [10, 10], [0, 10]]);
});
