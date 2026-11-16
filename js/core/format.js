// Human-friendly formatting of readings (shared by the web UI and CLI).

export function formatNumber(v, decimals) {
  return Number(v).toFixed(decimals);
}

/**
 * Parts of a reading: always an estimated number, plus range, alternate unit and an out-of-chart note.
 * e.g. { main: '7.3', range: '7.1–7.5' } or { main: '≈ 262 ppm', range: '245–290', alt: '14.7 °dKH',
 * note: 'above chart (max 240 ppm), extrapolated' }
 */
export function readingParts(p) {
  const m = p.match;
  if (!m) return null;
  const d = p.decimals;
  const unit = p.unit ? ` ${p.unit}` : '';
  const vals = p.values;
  const prefix = m.atLimit ? (m.atLimit === 'above' ? '> ' : '< ') : m.outOfRange ? '≈ ' : '';
  const main = `${prefix}${formatNumber(m.value, d)}${unit}`;
  const [lo, hi] = m.range.map((v) => formatNumber(v, d));
  const range = lo === hi ? '' : `${lo}–${hi}`;
  const alt = p.altUnit ? `${formatNumber(m.value * p.altUnit.factor, 1)} ${p.altUnit.unit}` : '';
  let note = '';
  if (m.outOfRange === 'above') note = `above chart (max ${formatNumber(vals[vals.length - 1], d)}${unit}), extrapolated`;
  else if (m.outOfRange === 'below') note = `below chart (min ${formatNumber(vals[0], d)}${unit}), extrapolated`;
  return { main, range, alt, note };
}

/** e.g. "7.3 (7.1–7.5)", "120 ppm (102–137) · 6.7 °dKH", "≈ 262 ppm (245–290) · 14.7 °dKH — above chart (max 240 ppm), extrapolated" */
export function formatReading(p) {
  const r = readingParts(p);
  if (!r) return '—';
  return `${r.main}${r.range ? ` (${r.range})` : ''}${r.alt ? ` · ${r.alt}` : ''}${r.note ? ` — ${r.note}` : ''}`;
}
