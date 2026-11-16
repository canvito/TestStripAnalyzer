#!/usr/bin/env node
// Browser smoke test: serves the app, uploads a synthetic photo with known pad values, taps the markers like a user
// and checks the readings. Needs Microsoft Edge or Chrome installed (BROWSER_CHANNEL=msedge|chrome, default msedge).
//
//   npm run e2e                      # headless
//   SCREENSHOT=out.png npm run e2e   # also save a full-page screenshot
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import jpeg from 'jpeg-js';
import { chromium } from 'playwright-core';
import kit from '../../js/kits/api-5in1.js';
import { renderScene } from '../helpers/synthetic.js';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
const PORT = 8765;
const CORNERS = [[430, 120], [1080, 95], [1110, 790], [440, 805]];
// Strip lies right next to the table, like on the real card: the tip pad is close to the table's top-left corner.
const PAD_ENDS = [[380, 140], [392, 700]];
const POSITIONS = { no3: 1.5, no2: 0, ph: 2.6, kh: 3, gh: 1.25 };

const failures = [];
const check = (cond, msg) => {
  console.log(`${cond ? '✔' : '✖'} ${msg}`);
  if (!cond) failures.push(msg);
};

const { img, truth } = renderScene(kit, { corners: CORNERS, padEnds: PAD_ENDS, padPositions: POSITIONS });
const photo = path.join(os.tmpdir(), 'tsa-e2e.jpg');
fs.writeFileSync(photo, jpeg.encode(img, 95).data);

const server = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve) => server.stdout.once('data', resolve));

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(`http://localhost:${PORT}/`);
  // Disclaimer: full text on first visit, collapses to a reminder once acknowledged, and stays acknowledged.
  check((await page.isVisible('.disclaimer-summary')) && (await page.isVisible('#disclaimer-ack')), 'disclaimer is shown in full on first visit');
  await page.click('#disclaimer-ack');
  check(!(await page.isVisible('.disclaimer-summary')) && (await page.isVisible('.disclaimer-short')), 'acknowledged disclaimer collapses to a one-line reminder');
  await page.click('#footer-disclaimer-link');
  check(await page.$eval('#disclaimer-full', (d) => d.open), 'footer link opens the full disclaimer');
  // A hostile history entry (other sites on the same github.io origin share localStorage) must render as text.
  await page.evaluate(() => {
    const evil = '<img src=x onerror="window.__pwned=1">';
    localStorage.setItem('tsa.history.v1', JSON.stringify([{ id: '"x', date: 'bad', water: evil, readings: { ph: { value: 7, text: evil, decimals: 999 } } }, { id: 'broken' }]));
  });
  await page.reload();
  await page.waitForTimeout(200);
  check((await page.evaluate(() => window.__pwned)) === undefined && (await page.$$('#history tbody tr')).length === 1, 'stored history is escaped and malformed entries are skipped');
  await page.evaluate(() => localStorage.removeItem('tsa.history.v1'));
  await page.reload();

  check(await page.$eval('#disclaimer', (el) => el.classList.contains('acked')), 'disclaimer acknowledgement is remembered after reload');
  await page.setInputFiles('#file-pick', photo);
  await page.waitForSelector('#editor-card:not(.hidden)');
  await page.evaluate(() => document.getElementById('photo-canvas').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);

  const toClient = (pt) =>
    page.evaluate(([x, y]) => {
      const c = document.getElementById('photo-canvas');
      const r = c.getBoundingClientRect();
      return [r.left + (x * r.width) / c.width, r.top + (y * r.height) / c.height];
    }, pt);
  const tap = async (pt) => {
    const [x, y] = await toClient(pt);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.up();
  };
  const drag = async (from, to) => {
    const [x0, y0] = await toClient(from);
    const [x1, y1] = await toClient(to);
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x1, y1, { steps: 5 });
    await page.mouse.up();
  };

  // Corners in a scrambled order with a few pixels of tapping error.
  for (const i of [2, 0, 3, 1]) await tap([CORNERS[i][0] + 6, CORNERS[i][1] - 5]);
  check((await page.textContent('#step-prompt')).includes('tip of the strip'), 'prompt asks for the tip pad after 4 corners');
  await tap(PAD_ENDS[0]);
  await tap(PAD_ENDS[1]);
  await page.waitForSelector('#results-card:not(.hidden) .param');

  const readings = await page.evaluate(() => Object.fromEntries(window.__tsa.photos[0].result.params.map((p) => [p.id, p.match.value])));
  for (const p of kit.params) {
    const values = p.scales[0].values;
    const tol = (0.15 * (values[values.length - 1] - values[0])) / (values.length - 1);
    check(Math.abs(readings[p.id] - truth[p.id]) <= tol, `${p.id}: ${readings[p.id]?.toFixed(2)} ≈ ${truth[p.id]}`);
  }
  check((await page.$$('#warnings .warn')).length === 0, 'no warnings');

  // Status vs. tank-type targets (synthetic GH 37.5 ppm ≈ 2.1 °dGH is below the community minimum of 4 °dGH).
  check((await page.textContent('[data-param="ph"] .status')).includes('Normal'), 'pH 7.3 is Normal for a community tank');
  check((await page.textContent('[data-param="gh"] .status')).includes('Low') && (await page.$$('[data-param="gh"] .actions li')).length > 0, 'low GH shows corrective actions');
  check(/1 reading outside the Community tropical targets/.test(await page.textContent('#assessment')), 'verdict box summarizes flagged readings');
  check(
    (await page.textContent('#overview thead')).includes('Potential impact') &&
      /calcium/.test(await page.textContent('#overview tr[data-param="gh"] .impact-cell')) &&
      /GH booster/.test(await page.textContent('#overview tr[data-param="gh"] .mitigation-cell')),
    'overview table shows the potential impact and suggested mitigation of the low GH',
  );
  await page.selectOption('#tank-select', 'fw-rift-cichlid');
  check((await page.textContent('[data-param="ph"] .status')).includes('Low'), 'the same pH is Low for Rift Lake cichlids');
  await page.selectOption('#tank-select', 'fw-community');

  // Auto-align never overwrites the user's taps; turning it off analyzes the exact taps.
  const tapped = [2, 0, 3, 1].map((i) => [CORNERS[i][0] + 6, CORNERS[i][1] - 5]);
  const marks = await page.evaluate(() => window.__tsa.editor.corners);
  check(marks.every((c, i) => Math.hypot(c[0] - tapped[i][0], c[1] - tapped[i][1]) < 1.5), 'corner markers stay at the tapped positions');
  await page.click('#align-chk');
  await page.waitForTimeout(200);
  check((await page.evaluate(() => window.__tsa.photos[0].result.refinement)) === null, 'unticking auto-align analyzes the raw taps');
  await page.click('#align-chk');
  await page.waitForTimeout(200);

  // Dragging a pad re-runs the analysis.
  const pads = await page.evaluate(() => window.__tsa.editor.pads);
  await drag(pads[2], [pads[2][0] + 4, pads[2][1] + 3]);
  await page.waitForTimeout(200);
  const ph = await page.evaluate(() => window.__tsa.photos[0].result.params.find((p) => p.id === 'ph').match.value);
  check(Math.abs(ph - truth.ph) < 0.1, `pH still ${ph.toFixed(2)} after nudging its marker`);

  await page.click('#save-btn');
  check((await page.$$('#history tbody tr')).length === 1, 'reading saved to history');

  await page.click('#water-seg button[data-water="salt"]');
  await page.waitForTimeout(200);
  check((await page.$$('#results .param')).length === 4, 'saltwater mode shows 4 parameters (no GH)');
  await page.click('#water-seg button[data-water="fresh"]');

  if (process.env.SCREENSHOT) await page.screenshot({ path: process.env.SCREENSHOT, fullPage: true });
  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);

  // Dev server hardening: it is reachable from the LAN.
  const status = async (p) => (await fetch(`http://localhost:${PORT}${p}`)).status;
  check((await status('/.git/config')) === 403, 'dev server refuses dot-files');
  check((await status('/a%00b')) === 400 && (await status('/')) === 200, 'dev server survives a NUL byte in the URL');
} finally {
  await browser.close();
  server.kill();
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nE2E smoke test passed');
