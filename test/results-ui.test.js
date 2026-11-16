import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderResults, renderAssessment, renderOverview } from '../js/ui/results.js';
import { assess, getProfile } from '../js/core/targets.js';

const sw = (value) => ({ value, sample: { ok: true, rgb: [200, 100, 50] } });
const phParam = {
  id: 'ph',
  name: 'pH',
  symbol: 'pH',
  unit: '',
  decimals: 1,
  readAfterSec: 30,
  values: [6, 7, 8, 9],
  swatches: [sw(6), sw(7), sw(8), sw(9)],
  pad: { sample: { ok: true, rgb: [220, 60, 60] } },
  quality: 'good',
  match: {
    value: 9.2,
    range: [8.7, 9.5],
    position: 3,
    rawPosition: 3.2,
    positionRange: [2.7, 3.5],
    outOfRange: 'above',
    atLimit: null,
    fitDeltaE: 2.3,
    nearest: { value: 9, deltaE: 2.8 },
  },
};

test('a result card shows the estimate, its status, potential impact and what to do', () => {
  const profile = getProfile('fw-community', 'fresh');
  const el = { innerHTML: '' };
  renderResults(el, { space: 'srgb', params: [phParam] }, null, assess([phParam], profile));
  assert.match(el.innerHTML, /≈ 9\.2/);
  assert.match(el.innerHTML, /class="status s-danger">⛔ Very high/);
  assert.match(el.innerHTML, /Target 6\.5–7\.8 · Community tropical/);
  assert.match(el.innerHTML, /<p class="impact s-danger"><b>Potential impact:<\/b> Gill, skin and eye damage/);
  assert.match(el.innerHTML, /<details class="actions s-danger" open><summary>What to do<\/summary><ul><li>/);
});

test('the overview table has a potential-impact column, empty for normal readings', () => {
  const profile = getProfile('fw-community', 'fresh');
  const no3 = { ...phParam, id: 'no3', name: 'Nitrate', symbol: 'NO₃⁻', unit: 'ppm', decimals: 0, match: { ...phParam.match, value: 10, outOfRange: null } };
  const combined = [{ p: phParam }, { p: no3 }];
  const el = { innerHTML: '' };
  renderOverview(el, combined, assess([phParam, no3], profile), 1);
  assert.match(el.innerHTML, /<th>Test<\/th><th>Reading<\/th><th>Status<\/th><th>Potential impact<\/th><\/tr>/);
  assert.match(el.innerHTML, /data-param="ph">[\s\S]*?Very high[\s\S]*?Gill, skin and eye damage/);
  assert.match(el.innerHTML, /data-param="no3">[\s\S]*?Normal[\s\S]*?class="muted">—/);
  assert.doesNotMatch(el.innerHTML, /<th>Source<\/th>/);
});

test('the verdict box names flagged readings', () => {
  const profile = getProfile('fw-community', 'fresh');
  const el = { innerHTML: '' };
  renderAssessment(el, assess([phParam], profile), { ph: phParam });
  assert.match(el.innerHTML, /1 reading outside the Community tropical targets: <b>pH<\/b> very high/);
});
