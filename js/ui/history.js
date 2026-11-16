// Reading history kept in localStorage, with CSV export.
// Note: on GitHub Pages every project site of the account shares one origin (and localStorage), so stored entries
// are treated as untrusted: validated on load and escaped on render.
import { formatReading } from '../core/format.js';
import { esc } from './html.js';

const KEY = 'tsa.history.v1';

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function isValidEntry(e) {
  return isObject(e) && typeof e.id === 'string' && typeof e.date === 'string' && isObject(e.readings);
}

function safeDecimals(d) {
  return Number.isInteger(d) && d >= 0 && d <= 4 ? d : 1;
}

export function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list.filter(isValidEntry) : [];
  } catch {
    return [];
  }
}

function store(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addEntry(entry) {
  const list = [entry, ...loadHistory()];
  store(list);
  return list;
}

export function deleteEntry(id) {
  const list = loadHistory().filter((e) => e.id !== id);
  store(list);
  return list;
}

export function clearHistory() {
  store([]);
  return [];
}

/** Build a history entry from combined readings ({ p, status } items, see results.combine). */
export function makeEntry(kit, water, combined) {
  const readings = {};
  for (const { p, status } of combined) {
    readings[p.id] = {
      value: round(p.match.value, p.decimals + 1),
      low: round(p.match.range[0], p.decimals + 1),
      high: round(p.match.range[1], p.decimals + 1),
      outOfRange: p.match.outOfRange,
      quality: p.quality,
      timing: status,
      text: formatReading(p),
      decimals: p.decimals,
      unit: p.unit,
    };
  }
  return { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, date: new Date().toISOString(), kitId: kit.id, water, readings };
}

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`; // keep spreadsheets from evaluating formulas
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(list, kits) {
  const ids = [...new Set(kits.flatMap((k) => k.params.map((p) => p.id)))];
  const header = ['date', 'kit', 'water', ...ids.flatMap((id) => [`${id}`, `${id}_low`, `${id}_high`, `${id}_quality`])];
  const rows = list.map((e) => [
    e.date,
    e.kitId,
    e.water,
    ...ids.flatMap((id) => {
      const r = e.readings[id];
      return isObject(r) ? [r.value, r.low, r.high, r.quality] : ['', '', '', ''];
    }),
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export function renderHistory(el, list, kit, { onDelete }) {
  if (!list.length) {
    el.innerHTML = '<p class="hint">No saved readings yet.</p>';
    return;
  }
  const params = kit.params;
  const head = params.map((p) => `<th>${esc(p.symbol)}${p.unit ? ` <small>${esc(p.unit)}</small>` : ''}</th>`).join('');
  const rows = list
    .map((e) => {
      const d = new Date(e.date);
      const cells = params
        .map((p) => {
          const r = e.readings[p.id];
          const v = Number(r?.value);
          if (!isObject(r) || !Number.isFinite(v)) return '<td>—</td>';
          const prefix = r.outOfRange === 'above' ? '≥' : '';
          return `<td class="${r.quality === 'poor' ? 'poor' : ''}" title="${esc(r.text)}">${prefix}${v.toFixed(safeDecimals(r.decimals))}</td>`;
        })
        .join('');
      const when = Number.isNaN(d.getTime()) ? '?' : `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      return `<tr><td>${esc(when)}<br><small>${esc(e.water)}</small></td>${cells}
        <td><button type="button" class="del" data-id="${esc(e.id)}" aria-label="Delete">✕</button></td></tr>`;
    })
    .join('');
  el.innerHTML = `<div class="table-scroll"><table><thead><tr><th>Date</th>${head}<th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  el.querySelectorAll('button.del').forEach((b) => b.addEventListener('click', () => onDelete(b.dataset.id)));
}
