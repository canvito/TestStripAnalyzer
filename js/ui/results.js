// Rendering of readings, warnings and the multi-photo summary.
import { cssColor } from '../core/color.js';
import { formatReading, readingParts } from '../core/format.js';
import { esc } from './html.js';

export function formatElapsed(sec) {
  if (sec == null) return '';
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Reading window for a parameter: [start, end] seconds after the strip leaves the water. */
export function readWindow(readAfterSec) {
  return readAfterSec > 0 ? [readAfterSec - 5, readAfterSec + 90] : [0, 15];
}

/** 'ok' | 'early' | 'late' | null (unknown timing). */
export function timingStatus(readAfterSec, elapsed) {
  if (elapsed == null) return null;
  const [a, b] = readWindow(readAfterSec);
  if (elapsed < a) return 'early';
  if (elapsed > b) return 'late';
  return 'ok';
}

const TIMING_TEXT = {
  ok: (t) => `✓ read at ${t}`,
  early: (t) => `early (${t}) — read later`,
  late: (t) => `late (${t})`,
};

function timingTag(status, elapsed) {
  if (!status) return '';
  return `<span class="tag ${status}">${TIMING_TEXT[status](formatElapsed(elapsed))}</span>`;
}

export function renderWarnings(el, warnings) {
  el.innerHTML = warnings.map((w) => `<div class="warn ${w.level === 'error' ? 'error' : ''}">⚠️ ${esc(w.message)}</div>`).join('');
}

function paramCard(p, space, elapsed) {
  const n = p.swatches.length;
  const pct = (pos) => ((pos + 0.5) / n) * 100;
  const sw = p.swatches
    .map((s) => `<div class="sw" style="background:${s.sample.ok ? cssColor(s.sample.rgb, space) : '#ccc'}"><span>${s.value}</span></div>`)
    .join('');
  const padColor = p.pad.sample.ok ? cssColor(p.pad.sample.rgb, space) : '#ccc';
  if (!p.match) {
    return `<div class="param"><div class="param-head"><span class="chip" style="background:${padColor}"></span>
      <div class="param-name"><b>${esc(p.name)}</b><span>${esc(p.symbol)}</span></div><div class="param-value">—</div></div></div>`;
  }
  const m = p.match;
  // Positions may lie beyond the chart (extrapolated); keep the marker and range box on the bar's outer edges.
  const edge = (pos) => Math.min(n - 0.5, Math.max(-0.5, pos));
  const [lo, hi] = m.positionRange.map(edge);
  const pad = (100 / n) * 0.12;
  const r = readingParts(p);
  const extra = [r.range && `(${r.range})`, r.alt].filter(Boolean).join(' · ');
  const status = timingStatus(p.readAfterSec, elapsed);
  const note = r.note
    ? `<div class="note">${m.outOfRange === 'above' ? '⬆' : '⬇'} ${esc(r.note[0].toUpperCase() + r.note.slice(1))}: the pad's color goes past the chart, so this estimate follows the chart's color trend and is less certain.</div>`
    : '';
  return `<div class="param" data-param="${p.id}">
    <div class="param-head">
      <span class="chip" style="background:${padColor}" title="Pad color"></span>
      <div class="param-name"><b>${esc(p.name)}</b><span>${esc(p.symbol)}</span></div>
      <div class="param-value">${esc(r.main)}<small>${esc(extra)}</small></div>
    </div>
    <div class="scale">
      <div class="swatches">${sw}</div>
      <div class="range" style="left:${pct(lo) - pad}%;width:${pct(hi) - pct(lo) + 2 * pad}%"></div>
      <div class="marker" style="left:${pct(edge(m.rawPosition))}%">▲</div>
    </div>
    ${note}
    <div class="meta">
      <span>Color match <b class="q-${p.quality}">${p.quality}</b> (ΔE ${m.fitDeltaE.toFixed(1)})</span>
      <span>Nearest chart color: ${m.nearest.value} (ΔE ${m.nearest.deltaE.toFixed(1)})</span>
      ${timingTag(status, elapsed)}
    </div>
  </div>`;
}

export function renderResults(el, result, elapsed) {
  el.innerHTML = result.params.map((p) => paramCard(p, result.space, elapsed)).join('');
}

/** Pick, for every parameter, the reading from the best-timed photo (ties -> latest photo). */
export function combine(photos, kit) {
  const out = [];
  for (const param of kit.params) {
    let best = null;
    photos.forEach((ph, idx) => {
      const p = ph.result?.params.find((x) => x.id === param.id);
      if (!p?.match) return;
      const status = timingStatus(p.readAfterSec, ph.elapsed);
      const rank = status === 'ok' ? 2 : status == null ? 1 : 0;
      if (!best || rank > best.rank || (rank === best.rank && idx > best.idx)) best = { p, status, rank, idx, photo: ph };
    });
    if (best) out.push(best);
  }
  return out;
}

export function renderSummary(el, combined, photoCount) {
  if (photoCount < 2) {
    el.innerHTML = '';
    return;
  }
  const rows = combined
    .map(
      (c) => `<tr><td>${esc(c.p.symbol)}</td><td>${esc(formatReading(c.p))}</td>
        <td>photo ${c.idx + 1}${c.photo.elapsed != null ? ` · ${formatElapsed(c.photo.elapsed)}` : ''}</td>
        <td>${c.status ? `<span class="tag ${c.status}">${c.status}</span>` : ''}</td></tr>`,
    )
    .join('');
  el.innerHTML = `<div class="summary"><h3>Combined reading (${photoCount} photos, best-timed photo per parameter)</h3>
    <div class="table-scroll"><table><thead><tr><th>Test</th><th>Reading</th><th>Source</th><th>Timing</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="hint">Details below are for the latest photo.</p></div>`;
}
