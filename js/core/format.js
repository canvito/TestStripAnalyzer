// Human-friendly formatting of readings (shared by the web UI and CLI).

export function formatNumber(v, decimals) {
  return Number(v).toFixed(decimals);
}

/** e.g. "7.3 (7.1–7.5)", "≥ 200 ppm", "120 ppm (≈ 6.7 °dKH)" */
export function formatReading(p) {
  const m = p.match;
  if (!m) return '—';
  const d = p.decimals;
  const unit = p.unit ? ` ${p.unit}` : '';
  const vals = p.values;
  let main;
  if (m.outOfRange === 'above') main = `≥ ${formatNumber(vals[vals.length - 1], d)}${unit}`;
  else if (m.outOfRange === 'below' && vals[0] !== 0) main = `≤ ${formatNumber(vals[0], d)}${unit}`;
  else main = `${formatNumber(m.value, d)}${unit}`;
  const [lo, hi] = m.range;
  const range = formatNumber(lo, d) === formatNumber(hi, d) ? '' : ` (${formatNumber(lo, d)}–${formatNumber(hi, d)})`;
  const alt = p.altUnit && !m.outOfRange ? ` ≈ ${formatNumber(m.value * p.altUnit.factor, 1)} ${p.altUnit.unit}` : '';
  return `${main}${range}${alt}`;
}
