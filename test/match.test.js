import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchScale, labAt, fitQuality } from '../js/core/match.js';
import { formatReading } from '../js/core/format.js';

const SW = [
  [85, 0, 40],
  [70, 20, 40],
  [55, 40, 30],
  [45, 50, 20],
];
const VALUES = [0, 10, 20, 40];

test('a pad identical to a swatch reads that swatch value', () => {
  const m = matchScale(SW[2], SW, VALUES);
  assert.ok(Math.abs(m.value - 20) < 0.05);
  assert.ok(m.fitDeltaE < 0.01);
  assert.equal(m.nearest.index, 2);
  assert.equal(m.outOfRange, null);
});

test('a pad between two swatches is interpolated', () => {
  const m = matchScale(labAt(SW, 2.5), SW, VALUES);
  assert.ok(Math.abs(m.value - 30) < 0.3, `got ${m.value}`);
  assert.ok(m.range[0] <= 30 && m.range[1] >= 30);
  assert.ok(m.range[0] > 20 && m.range[1] < 40, `range ${m.range} should be narrower than the neighbouring swatches`);
});

test('colors beyond the last swatch are flagged as above range and clamped', () => {
  const m = matchScale(labAt(SW, 3.4), SW, VALUES);
  assert.equal(m.outOfRange, 'above');
  assert.equal(m.value, 40);
  assert.equal(formatReading({ match: m, values: VALUES, decimals: 0, unit: 'ppm' }).startsWith('≥ 40 ppm'), true);
});

test('below-zero readings on a scale starting at 0 display as 0', () => {
  const m = matchScale(labAt(SW, -0.4), SW, VALUES);
  assert.equal(m.outOfRange, 'below');
  assert.ok(formatReading({ match: m, values: VALUES, decimals: 0, unit: 'ppm' }).startsWith('0 ppm'));
});

test('an off-path color yields a poor fit', () => {
  const m = matchScale([50, -40, -40], SW, VALUES);
  assert.equal(fitQuality(m.fitDeltaE), 'poor');
});

test('alternate units are shown for in-range readings', () => {
  const m = matchScale(SW[3], SW, VALUES);
  const s = formatReading({ match: m, values: VALUES, decimals: 0, unit: 'ppm', altUnit: { unit: '°dKH', factor: 1 / 17.848 } });
  assert.match(s, /≈ 2\.2 °dKH/);
});
