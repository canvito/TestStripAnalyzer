import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES, getProfile, evaluate, assess, formatTarget } from '../js/core/targets.js';

const community = getProfile('fw-community', 'fresh');
const DH = 17.848;

test('pH status bands: normal, high, very high, low, very low', () => {
  const cases = [
    [7.0, 'Normal', 'ok'],
    [7.8, 'Normal', 'ok'],
    [7.9, 'High', 'caution'],
    [8.6, 'Very high', 'danger'],
    [6.4, 'Low', 'caution'],
    [5.9, 'Very low', 'danger'],
  ];
  for (const [v, label, severity] of cases) {
    const s = evaluate('ph', v, community, 1);
    assert.equal(s.label, label, `pH ${v}`);
    assert.equal(s.severity, severity, `pH ${v}`);
    assert.equal(s.actions.length > 0, label !== 'Normal', `pH ${v} actions`);
  }
});

test('status uses the displayed precision, so the label agrees with the number shown', () => {
  assert.equal(evaluate('ph', 7.84, community, 1).label, 'Normal'); // shown as 7.8
  assert.equal(evaluate('ph', 7.86, community, 1).label, 'High'); // shown as 7.9
});

test('nitrite: any detectable amount is high, 0.5+ is very high', () => {
  assert.equal(evaluate('no2', 0, community, 1).label, 'Normal');
  assert.equal(evaluate('no2', 0.3, community, 1).label, 'High');
  assert.equal(evaluate('no2', 0.6, community, 1).label, 'Very high');
});

test('the same KH is high for a community tank but normal for Rift Lake cichlids', () => {
  const kh = 14.5 * DH;
  assert.equal(evaluate('kh', kh, community, 0).label, 'High');
  assert.equal(evaluate('kh', kh, getProfile('fw-rift-cichlid', 'fresh'), 0).label, 'Normal');
});

test('planted tanks flag nitrate that is too low for plants', () => {
  const s = evaluate('no3', 2, getProfile('fw-planted', 'fresh'), 0);
  assert.equal(s.label, 'Low');
  assert.match(s.actions[0], /fertilizer/);
});

test('every out-of-range direction of every profile has actions, an impact and a mitigation', () => {
  for (const profile of PROFILES) {
    for (const [id, r] of Object.entries(profile.ranges)) {
      const probes = [];
      if (r.min != null) probes.push(['low', r.min - 0.02], ['very low', (r.dangerBelow ?? r.min) - 1]);
      if (r.max != null) probes.push(['high', r.max + 0.02], ['very high', (r.dangerAbove ?? r.max) + 1]);
      for (const [what, v] of probes) {
        const s = evaluate(id, v, profile, 2);
        assert.notEqual(s.level, 'normal', `${profile.id} ${id} ${what} (${v})`);
        assert.ok(s.actions.length, `${profile.id} ${id} ${what} actions`);
        assert.ok(s.impact.length > 20, `${profile.id} ${id} ${what} impact`);
        assert.ok(s.mitigation.length > 20, `${profile.id} ${id} ${what} mitigation`);
      }
    }
  }
});

test('the impact text escalates from High to Very high', () => {
  const high = evaluate('no2', 0.3, community, 1);
  const veryHigh = evaluate('no2', 0.6, community, 1);
  assert.notEqual(high.impact, veryHigh.impact);
  assert.match(veryHigh.impact, /die/);
  assert.equal(evaluate('no2', 0, community, 1).impact, '');
  assert.match(veryHigh.mitigation, /^Act now: /);
  assert.doesNotMatch(high.mitigation, /^Act now/);
});

test('saltwater profiles have no GH target and fall back to the first profile of the water type', () => {
  assert.equal(evaluate('gh', 150, getProfile('sw-reef', 'salt'), 0), null);
  assert.equal(getProfile('fw-community', 'salt').water, 'salt');
});

test('cross-parameter insight: high pH caused by high KH', () => {
  const params = [
    { id: 'ph', decimals: 1, match: { value: 9.2 } },
    { id: 'kh', decimals: 0, match: { value: 259 } },
    { id: 'gh', decimals: 0, match: { value: 147 } },
    { id: 'no3', decimals: 0, match: { value: 2 } },
    { id: 'no2', decimals: 1, match: { value: 0 } },
  ];
  const a = assess(params, community);
  assert.equal(a.statuses.ph.label, 'Very high');
  assert.equal(a.statuses.kh.label, 'High');
  assert.equal(a.statuses.gh.label, 'Normal');
  assert.deepEqual(a.counts, { ok: 3, caution: 1, danger: 1 });
  assert.ok(a.insights.some((t) => /high KH/.test(t)));
});

test('cross-parameter insight: nitrite at high pH asks for an ammonia test', () => {
  const a = assess(
    [
      { id: 'ph', decimals: 1, match: { value: 8.2 } },
      { id: 'no2', decimals: 1, match: { value: 1 } },
    ],
    community,
  );
  assert.ok(a.insights.some((t) => /ammonia/.test(t)));
});

test('targets are formatted with the alternate unit', () => {
  const kh = { unit: 'ppm', decimals: 0, altUnit: { unit: '°dKH', factor: 1 / DH } };
  assert.equal(formatTarget(community.ranges.kh, kh), '54–143 ppm (3–8 °dKH)');
  assert.equal(formatTarget(community.ranges.no3, { unit: 'ppm', decimals: 0 }), '≤ 40 ppm');
});
