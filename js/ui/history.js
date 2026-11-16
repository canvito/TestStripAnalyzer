// Reading history kept in localStorage, with CSV export.
// Note: on GitHub Pages every site of the account shares one origin (here the custom domain), and therefore
// one localStorage, so stored entries are treated as untrusted: validated on load and escaped on render.
import { formatReading } from '../core/format.js';
import { assess, PROFILES } from '../core/targets.js';
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
export function makeEntry(kit, water, combined, profile) {
  const statuses = profile ? assess(combined.map((c) => c.p), profile).statuses : {};
  const readings = {};
  for (const { p, status } of combined) {
    const s = statuses[p.id];
    readings[p.id] = {
      value: round(p.match.value, p.decimals + 1),
      low: round(p.match.range[0], p.decimals + 1),
      high: round(p.match.range[1], p.decimals + 1),
      outOfRange: p.match.outOfRange,
      atLimit: p.match.atLimit,
      quality: p.quality,
      status: s ? s.label : null,
      severity: s ? s.severity : null,
      timing: status,
      text: formatReading(p),
      decimals: p.decimals,
      unit: p.unit,
    };
  }
  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString(),
    kitId: kit.id,
    water,
    profileId: profile?.id ?? null,
    readings,
  };
}

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`; // keep spreadsheets from evaluating formulas
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(list, kits) {
  const ids = [...new Set(kits.flatMap((k) => k.params.map((p) => p.id)))];
  const header = ['date', 'kit', 'water', 'tank', ...ids.flatMap((id) => [`${id}`, `${id}_low`, `${id}_high`, `${id}_status`, `${id}_quality`, `${id}_chart`])];
  // `<id>_status`: Normal / Low / High / Very low / Very high for the tank type chosen when saved.
  // `<id>_chart`: "above"/"below" when the value was extrapolated beyond the chart, empty when within it.
  const rows = list.map((e) => [
    e.date,
    e.kitId,
    e.water,
    PROFILES.find((p) => p.id === e.profileId)?.name ?? '',
    ...ids.flatMap((id) => {
      const r = e.readings[id];
      return isObject(r) ? [r.value, r.low, r.high, r.status ?? '', r.quality, r.outOfRange ?? ''] : ['', '', '', '', '', ''];
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
          const prefix = r.atLimit === 'above' ? '>' : r.atLimit === 'below' ? '<' : r.outOfRange ? '≈' : '';
          const cls = ['caution', 'danger'].includes(r.severity) ? `s-${r.severity}` : '';
          const flag = r.severity === 'danger' ? ' ⛔' : r.severity === 'caution' ? ' ⚠' : '';
          const title = [r.text, r.status].filter(Boolean).join(' — ');
          return `<td class="${cls}" title="${esc(title)}">${prefix}${v.toFixed(safeDecimals(r.decimals))}${flag}</td>`;
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
