import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homography, applyHomography, invert3x3, chartToImage, isConvexQuad } from '../js/core/geometry.js';

const near = (p, q, eps = 1e-6) => assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) < eps, `${p} vs ${q}`);

test('homography maps the 4 source points onto the destination points', () => {
  const src = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const dst = [[120, 80], [930, 40], [990, 860], [100, 900]];
  const H = homography(src, dst);
  src.forEach((p, i) => near(applyHomography(H, p), dst[i]));
});

test('inverse homography round-trips interior points', () => {
  const H = chartToImage([[2164, 237], [3415, 196], [3450, 1535], [2179, 1545]]);
  const Hi = invert3x3(H);
  for (const uv of [[0.5, 0.5], [0.27, 0.07], [0.87, 0.89]]) near(applyHomography(Hi, applyHomography(H, uv)), uv, 1e-9);
});

test('degenerate (collinear) points are rejected', () => {
  assert.throws(() => homography([[0, 0], [1, 0], [1, 1], [0, 1]], [[0, 0], [1, 1], [2, 2], [3, 3]]));
});

test('isConvexQuad detects crossed / bow-tie corner orders', () => {
  assert.equal(isConvexQuad([[0, 0], [10, 0], [10, 10], [0, 10]]), true);
  assert.equal(isConvexQuad([[0, 0], [10, 10], [10, 0], [0, 10]]), false);
});
