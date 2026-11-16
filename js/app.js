// App controller: wires settings, timer, photo editor, analysis, results and history together.
import { KITS, getKit } from './kits/index.js';
import { analyze } from './core/analyze.js';
import { PhotoEditor } from './ui/editor.js';
import { loadImageFile } from './ui/image-load.js';
import { renderResults, renderWarnings, renderSummary, combine, formatElapsed } from './ui/results.js';
import { loadHistory, addEntry, deleteEntry, clearHistory, makeEntry, toCsv, renderHistory } from './ui/history.js';
import { DipTimer } from './ui/timer.js';

const $ = (id) => document.getElementById(id);
const SETTINGS_KEY = 'tsa.settings.v1';

const settings = { kitId: KITS[0].id, water: 'fresh', align: true, overlay: true, ...readJson(SETTINGS_KEY) };
let kit = KITS.find((k) => k.id === settings.kitId) ?? KITS[0];

/** Photos of the current test. Each: { name, elapsed, image, marks, result } */
let photos = [];
let current = null;

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? {};
  } catch {
    return {};
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

const editor = new PhotoEditor($('photo-canvas'), $('loupe'), kit, { onChange: onEditorChange });
editor.showOverlay = settings.overlay;

const timer = new DipTimer({ button: $('timer-btn'), display: $('timer-display'), hint: $('timer-hint'), getKit: () => kit });

// ---------- settings ----------

function renderSettings() {
  $('kit-select').innerHTML = KITS.map((k) => `<option value="${k.id}" ${k.id === kit.id ? 'selected' : ''}>${k.name}</option>`).join('');
  if (!kit.waterTypes.some((w) => w.id === settings.water)) settings.water = kit.waterTypes[0].id;
  $('water-seg').innerHTML = kit.waterTypes
    .map((w) => `<button type="button" role="radio" data-water="${w.id}" aria-checked="${w.id === settings.water}">${w.name}</button>`)
    .join('');
  $('timing-text').textContent = kit.timing;
  $('align-chk').checked = settings.align;
  $('overlay-chk').checked = settings.overlay;
}

$('kit-select').addEventListener('change', (e) => {
  kit = getKit(e.target.value);
  settings.kitId = kit.id;
  saveSettings();
  renderSettings();
  newTest();
  refreshHistory();
});

$('water-seg').addEventListener('click', (e) => {
  const w = e.target.closest('button')?.dataset.water;
  if (!w || w === settings.water) return;
  settings.water = w;
  saveSettings();
  renderSettings();
  photos.forEach((p) => p !== current && p.result && analyzePhoto(p));
  if (current?.result) runAnalysis();
  else renderAll();
});

$('align-chk').addEventListener('change', (e) => {
  settings.align = e.target.checked;
  saveSettings();
  if (current?.result) runAnalysis();
});

$('overlay-chk').addEventListener('change', (e) => {
  settings.overlay = e.target.checked;
  saveSettings();
  editor.showOverlay = settings.overlay;
  editor.redraw();
});

// ---------- photo ----------

for (const id of ['file-camera', 'file-pick']) {
  $(id).addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await openPhoto(file);
  });
}

async function openPhoto(file) {
  const status = $('photo-status');
  const elapsed = timer.photoElapsed(file);
  status.textContent = 'Opening photo…';
  let image;
  try {
    image = await loadImageFile(file);
  } catch (err) {
    status.textContent = `Could not open this photo (${err.message || err}). Try a JPEG.`;
    return;
  }
  current = { name: file.name, elapsed, image, marks: null, result: null };
  photos.push(current);
  editor.setImage(image.canvas, image.space);
  $('editor-card').classList.remove('hidden');
  status.textContent = `Photo ${photos.length}: ${image.pixels.width}×${image.pixels.height}, ${image.space === 'display-p3' ? 'wide-gamut (P3)' : 'sRGB'} color${
    elapsed != null ? ` · taken ${formatElapsed(elapsed)} after dipping` : ''
  }`;
  updatePrompt();
  renderAll();
  $('editor-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updatePrompt() {
  $('step-prompt').textContent = editor.prompt();
  $('undo-btn').disabled = !editor.undoStack.length;
}

function onEditorChange() {
  updatePrompt();
  if (!current) return;
  if (editor.isComplete()) {
    scheduleAnalysis();
  } else if (current.result) {
    current.result = null;
    renderAll();
  }
}

let frame = 0;
function scheduleAnalysis() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(runAnalysis);
}

function analyzePhoto(photo) {
  // marks.corners are always the user's own taps; auto-align works from them on every run.
  const result = analyze(photo.image.pixels, kit, {
    corners: photo.marks.corners,
    pads: photo.marks.pads,
    water: settings.water,
    space: photo.image.space,
    refine: settings.align,
  });
  photo.result = result;
  return result;
}

function runAnalysis() {
  if (!current || !editor.isComplete()) return;
  current.marks = { corners: editor.corners.map((p) => [...p]), pads: editor.pads.map((p) => [...p]) };
  try {
    editor.setResult(analyzePhoto(current));
  } catch (err) {
    current.result = null;
    renderWarnings($('warnings'), [{ level: 'error', message: `Analysis failed: ${err.message}` }]);
    $('results-card').classList.remove('hidden');
    return;
  }
  renderAll();
}

$('undo-btn').addEventListener('click', () => editor.undo());
$('reset-btn').addEventListener('click', () => {
  editor.clear();
  onEditorChange();
});

// ---------- results ----------

function renderAll() {
  const analyzed = photos.filter((p) => p.result);
  const card = $('results-card');
  if (!analyzed.length) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');
  renderSummary($('summary'), combine(analyzed, kit), analyzed.length);
  if (current?.result) {
    renderWarnings($('warnings'), current.result.warnings);
    renderResults($('results'), current.result, current.elapsed);
  } else {
    $('warnings').innerHTML = '';
    $('results').innerHTML = '<p class="hint">Finish marking the current photo to see its reading.</p>';
  }
  updatePrompt();
}

$('save-btn').addEventListener('click', () => {
  const analyzed = photos.filter((p) => p.result);
  if (!analyzed.length) return;
  const entry = makeEntry(kit, settings.water, combine(analyzed, kit));
  refreshHistory(addEntry(entry));
  const btn = $('save-btn');
  btn.textContent = '✓ Saved';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = '💾 Save to history';
    btn.disabled = false;
  }, 1500);
});

$('another-btn').addEventListener('click', () => $('file-camera').click());
$('new-btn').addEventListener('click', newTest);

function newTest() {
  photos = [];
  current = null;
  editor.setKit(kit);
  timer.reset();
  $('editor-card').classList.add('hidden');
  $('photo-status').textContent = '';
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- history ----------

function refreshHistory(list = loadHistory()) {
  renderHistory($('history'), list, kit, { onDelete: (id) => refreshHistory(deleteEntry(id)) });
}

$('export-btn').addEventListener('click', () => {
  const list = loadHistory();
  if (!list.length) return;
  const blob = new Blob([toCsv(list, KITS)], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `test-strip-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});

$('clear-btn').addEventListener('click', () => {
  if (confirm('Delete all saved readings?')) refreshHistory(clearHistory());
});

renderSettings();
refreshHistory();
updatePrompt();

// Exposed for automated end-to-end tests.
window.__tsa = { editor, get photos() { return photos; }, openPhoto };
