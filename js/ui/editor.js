// Interactive photo canvas: tap to place chart corners and strip pads, drag to adjust, with a magnifier loupe.
import { interpolatePads, orderClockwise } from '../core/layout.js';

const HIT_CSS_PX = 26;
// While markers are still being placed, a tap only grabs an existing marker when it lands right on it,
// so a pad next to a table corner can still be placed.
const HIT_PLACING_CSS_PX = 11;
const HANDLE_CSS_PX = 9;
const LOUPE_ZOOM = 4;

export class PhotoEditor {
  constructor(canvas, loupe, kit, { onChange } = {}) {
    this.canvas = canvas;
    this.loupe = loupe;
    this.loupeCtx = loupe.getContext('2d');
    this.kit = kit;
    this.onChange = onChange;
    this.source = null;
    this.ctx = null;
    this.showOverlay = true;
    this.clear();
    canvas.addEventListener('pointerdown', (e) => this.#down(e));
    canvas.addEventListener('pointermove', (e) => this.#move(e));
    canvas.addEventListener('pointerup', (e) => this.#up(e));
    canvas.addEventListener('pointercancel', (e) => this.#up(e));
    window.addEventListener('resize', () => this.redraw());
  }

  setImage(source, space) {
    this.source = source;
    this.canvas.width = source.width;
    this.canvas.height = source.height;
    this.ctx = this.canvas.getContext('2d', space === 'display-p3' ? { colorSpace: 'display-p3' } : undefined);
    this.clear();
  }

  setKit(kit) {
    this.kit = kit;
    this.clear();
  }

  clear() {
    this.corners = [];
    this.padEnds = [];
    this.pads = [];
    this.padManual = [];
    this.undoStack = [];
    this.drag = null;
    this.result = null;
    this.redraw();
  }

  get phase() {
    if (this.corners.length < 4) return 'corners';
    if (this.pads.length === 0) return 'pads';
    return 'done';
  }

  isComplete() {
    return this.phase === 'done';
  }

  prompt() {
    const { chart, strip } = this.kit;
    if (!this.source) return '';
    if (this.corners.length < 4) {
      return `Tap the ${chart.cornerHint} — corner ${this.corners.length + 1} of 4 (any order). Hold and slide to fine-tune.`;
    }
    if (this.pads.length === 0) {
      return `Tap the center of ${strip.tapHints[this.padEnds.length]}.`;
    }
    return 'Drag any marker to adjust — results update automatically.';
  }

  setResult(result) {
    this.result = result;
    this.redraw();
  }

  undo() {
    const snap = this.undoStack.pop();
    if (!snap) return;
    Object.assign(this, JSON.parse(snap));
    this.result = null;
    this.redraw();
    this.onChange?.(this);
  }

  #pushUndo() {
    this.undoStack.push(JSON.stringify({ corners: this.corners, padEnds: this.padEnds, pads: this.pads, padManual: this.padManual }));
    if (this.undoStack.length > 60) this.undoStack.shift();
  }

  #cssScale() {
    const r = this.canvas.getBoundingClientRect();
    return r.width ? this.canvas.width / r.width : 1;
  }

  #toImage(e) {
    const r = this.canvas.getBoundingClientRect();
    const s = this.canvas.width / r.width;
    return { pt: [(e.clientX - r.left) * s, (e.clientY - r.top) * s], scale: s };
  }

  #hit(pt, scale) {
    let best = null;
    let bestD = (this.isComplete() ? HIT_CSS_PX : HIT_PLACING_CSS_PX) * scale;
    const consider = (type, list) =>
      list.forEach((p, index) => {
        const d = Math.hypot(p[0] - pt[0], p[1] - pt[1]);
        if (d < bestD) {
          bestD = d;
          best = { type, index };
        }
      });
    consider('corner', this.corners);
    if (this.pads.length) consider('pad', this.pads);
    else consider('end', this.padEnds);
    return best;
  }

  #get({ type, index }) {
    if (type === 'corner') return this.corners[index];
    if (type === 'end') return this.padEnds[index];
    return this.pads[index];
  }

  #set({ type, index }, p) {
    if (type === 'corner') this.corners[index] = p;
    else if (type === 'end') this.padEnds[index] = p;
    else {
      this.pads[index] = p;
      const last = this.pads.length - 1;
      if (index === 0 || index === last) {
        // Moving an end pad re-spreads the middle pads that were not placed by hand.
        this.padEnds = [this.pads[0], this.pads[last]];
        const auto = interpolatePads(this.kit, this.pads[0], this.pads[last]);
        this.pads = this.pads.map((q, i) => (i === 0 || i === last || this.padManual[i] ? q : auto[i]));
      } else {
        this.padManual[index] = true;
      }
    }
  }

  #down(e) {
    if (!this.source || this.drag) return;
    e.preventDefault();
    const { pt, scale } = this.#toImage(e);
    let target = this.#hit(pt, scale);
    this.#pushUndo();
    if (!target) {
      if (this.phase === 'corners') {
        this.corners.push(pt);
        target = { type: 'corner', index: this.corners.length - 1 };
      } else if (this.phase === 'pads') {
        this.padEnds.push(pt);
        target = { type: 'end', index: this.padEnds.length - 1 };
      } else {
        this.undoStack.pop();
        return;
      }
    }
    const cur = this.#get(target);
    this.drag = { target, offset: [cur[0] - pt[0], cur[1] - pt[1]], id: e.pointerId };
    this.canvas.setPointerCapture?.(e.pointerId);
    this.#showLoupe(e, cur);
    this.redraw();
  }

  #move(e) {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    e.preventDefault();
    const { pt } = this.#toImage(e);
    const p = [pt[0] + this.drag.offset[0], pt[1] + this.drag.offset[1]];
    this.#set(this.drag.target, p);
    this.#showLoupe(e, p);
    this.redraw();
  }

  #up(e) {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    const { target } = this.drag;
    this.drag = null;
    this.loupe.classList.add('hidden');
    if (target.type === 'end' && this.padEnds.length === 2 && this.pads.length === 0) {
      this.pads = interpolatePads(this.kit, this.padEnds[0], this.padEnds[1]);
      this.padManual = this.pads.map(() => false);
    }
    this.redraw();
    this.onChange?.(this);
  }

  #showLoupe(e, p) {
    const wrap = this.canvas.parentElement.getBoundingClientRect();
    const cssSize = 160;
    const s = this.#cssScale();
    const src = (cssSize * s) / LOUPE_ZOOM;
    const L = this.loupe.width;
    const ctx = this.loupeCtx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, L, L);
    ctx.drawImage(this.source, p[0] - src / 2, p[1] - src / 2, src, src, 0, 0, L, L);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L / 2, 0);
    ctx.lineTo(L / 2, L / 2 - 10);
    ctx.moveTo(L / 2, L / 2 + 10);
    ctx.lineTo(L / 2, L);
    ctx.moveTo(0, L / 2);
    ctx.lineTo(L / 2 - 10, L / 2);
    ctx.moveTo(L / 2 + 10, L / 2);
    ctx.lineTo(L, L / 2);
    ctx.stroke();
    ctx.strokeStyle = '#ff2d55';
    ctx.strokeRect(L / 2 - 2, L / 2 - 2, 4, 4);

    let x = e.clientX - wrap.left - cssSize / 2;
    let y = e.clientY - wrap.top - cssSize - 50;
    if (y < 0) y = e.clientY - wrap.top + 50;
    x = Math.max(0, Math.min(wrap.width - cssSize, x));
    y = Math.max(0, Math.min(wrap.height - cssSize, y));
    this.loupe.style.left = `${x}px`;
    this.loupe.style.top = `${y}px`;
    this.loupe.classList.remove('hidden');
  }

  redraw() {
    const ctx = this.ctx;
    if (!ctx || !this.source) return;
    ctx.drawImage(this.source, 0, 0);
    const s = this.#cssScale();
    const lw = 1.6 * s;

    // Table outline: the analyzed (auto-aligned, chart-oriented) quad when available, else the taps.
    let outline = this.corners;
    if (this.result && !this.drag) outline = this.result.corners;
    else if (this.corners.length === 4) outline = orderClockwise(this.corners);
    if (outline.length > 1) {
      ctx.beginPath();
      outline.forEach((c, i) => (i ? ctx.lineTo(c[0], c[1]) : ctx.moveTo(c[0], c[1])));
      if (outline.length === 4) ctx.closePath();
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.9)';
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    if (this.showOverlay && this.result) {
      for (const p of this.result.params) {
        for (const sw of p.swatches) ring(ctx, sw.point, sw.radius, lw, '#fff');
        ring(ctx, p.pad.point, p.pad.radius, lw, '#39ff14');
      }
      for (const w of this.result.whites) ring(ctx, w.point, w.radius, lw, '#00c8ff');
    }

    if (this.pads.length) {
      const dir = unit(this.pads[0], this.pads[this.pads.length - 1]);
      this.pads.forEach((p, i) => {
        handle(ctx, p, HANDLE_CSS_PX * s, '#2ecc71', s);
        const sym = this.kit.params.find((q) => q.id === this.kit.strip.padOrder[i])?.symbol ?? '';
        label(ctx, sym, [p[0] - dir[1] * 22 * s, p[1] + dir[0] * 22 * s], s);
      });
    } else {
      this.padEnds.forEach((p, i) => handle(ctx, p, HANDLE_CSS_PX * s, '#2ecc71', s, i ? 'end' : 'tip'));
    }
    this.corners.forEach((c, i) => handle(ctx, c, HANDLE_CSS_PX * s, '#ff9800', s, this.isComplete() ? '' : String(i + 1)));
  }
}

function unit(a, b) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
}

function ring(ctx, [x, y], r, lw, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = lw * 2.2;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.stroke();
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function handle(ctx, [x, y], r, color, s, text = '') {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = `${color}55`;
  ctx.fill();
  ctx.lineWidth = 2 * s;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 1.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (text) label(ctx, text, [x + r * 1.1, y - r * 1.1], s);
}

function label(ctx, text, [x, y], s) {
  ctx.font = `600 ${13 * s}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3 * s;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x, y);
}
