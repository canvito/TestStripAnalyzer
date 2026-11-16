import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rgb8ToLab, deltaE2000, labToRgb8, deltaE76 } from '../js/core/color.js';

const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ''} expected ${b}, got ${a}`);

test('sRGB white and primaries map to known CIELAB values', () => {
  const white = rgb8ToLab([255, 255, 255]);
  close(white[0], 100, 0.01);
  close(white[1], 0, 0.01);
  close(white[2], 0, 0.01);
  const red = rgb8ToLab([255, 0, 0]);
  close(red[0], 53.24, 0.02);
  close(red[1], 80.09, 0.05);
  close(red[2], 67.2, 0.05);
});

test('Display-P3 white is neutral and P3 red is more saturated than sRGB red', () => {
  const white = rgb8ToLab([255, 255, 255], 'display-p3');
  close(white[0], 100, 0.01);
  close(Math.hypot(white[1], white[2]), 0, 0.05);
  const p3Red = rgb8ToLab([255, 0, 0], 'display-p3');
  const sRed = rgb8ToLab([255, 0, 0]);
  assert.ok(Math.hypot(p3Red[1], p3Red[2]) > Math.hypot(sRed[1], sRed[2]));
});

test('Lab -> RGB round trips', () => {
  for (const space of ['srgb', 'display-p3']) {
    for (const rgb of [[200, 120, 40], [30, 90, 160], [180, 170, 150]]) {
      const back = labToRgb8(rgb8ToLab(rgb, space), space);
      back.forEach((v, i) => close(v, rgb[i], 0.01, `${space} channel ${i}`));
    }
  }
});

// Reference pairs from Sharma, Wu & Dalal (2005), "The CIEDE2000 color-difference formula".
const SHARMA = [
  [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
  [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
  [[50, 2.8361, -74.02], [50, 0, -82.7485], 3.4412],
  [[50, 0, 0], [50, -1, 2], 2.3669],
  [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
  [[50, 2.49, -0.001], [50, -2.49, 0.0011], 7.2195],
  [[50, -0.001, 2.49], [50, 0.0009, -2.49], 4.8045],
  [[50, -0.001, 2.49], [50, 0.0011, -2.49], 4.7461],
  [[50, 2.5, 0], [73, 25, -18], 27.1492],
  [[50, 2.5, 0], [50, 3.1736, 0.5854], 1.0],
];

test('CIEDE2000 matches published reference data', () => {
  for (const [a, b, expected] of SHARMA) {
    close(deltaE2000(a, b), expected, 1e-4, `${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
    close(deltaE2000(b, a), expected, 1e-4, 'symmetry');
  }
});

test('ΔE of identical colors is zero', () => {
  assert.equal(deltaE2000([60, 10, -20], [60, 10, -20]), 0);
  assert.equal(deltaE76([60, 10, -20], [60, 10, -20]), 0);
});
