// Dip timer: tells you when to take the photo for each group of parameters and tags photos with their timing.
import { readWindow, formatElapsed } from './results.js';

const AUTO_STOP_SEC = 300;

export class DipTimer {
  constructor({ button, display, hint, getKit }) {
    this.button = button;
    this.display = display;
    this.hint = hint;
    this.getKit = getKit;
    this.startTime = null;
    this.interval = null;
    this.audio = null;
    button.addEventListener('click', () => (this.running ? this.stop() : this.start()));
    this.#render(0);
  }

  get running() {
    return this.startTime != null && this.interval != null;
  }

  start() {
    this.startTime = Date.now();
    this.fired = new Set();
    try {
      this.audio ??= new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      this.audio = null;
    }
    this.button.textContent = '■ Stop timer';
    this.interval = setInterval(() => this.#tick(), 250);
    this.#tick();
  }

  stop() {
    clearInterval(this.interval);
    this.interval = null;
    this.button.textContent = '▶ Start timer';
    this.hint.textContent = this.startTime ? 'Timer stopped.' : '';
    this.hint.className = 'timer-hint';
  }

  reset() {
    this.stop();
    this.startTime = null;
    this.#render(0);
    this.hint.textContent = '';
  }

  /**
   * Seconds after the dip when this photo was taken, or null when unknown.
   * Uses the file timestamp when it falls inside the timer run (camera capture), otherwise "now".
   */
  photoElapsed(file) {
    if (this.startTime == null) return null;
    const now = Date.now();
    const t = file?.lastModified;
    if (t && t >= this.startTime - 2000 && t <= now + 1000) return Math.max(0, (t - this.startTime) / 1000);
    if (t && t < this.startTime - 2000) return null; // an older photo from the library
    return (now - this.startTime) / 1000;
  }

  #groups() {
    const kit = this.getKit();
    const map = new Map();
    for (const p of kit.params) {
      if (!map.has(p.readAfterSec)) map.set(p.readAfterSec, []);
      map.get(p.readAfterSec).push(p.symbol);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([t, symbols]) => ({ t, symbols, window: readWindow(t) }));
  }

  #tick() {
    const e = (Date.now() - this.startTime) / 1000;
    this.#render(e);
    const groups = this.#groups();
    for (const g of groups) {
      if (e >= g.t && !this.fired.has(g.t)) {
        this.fired.add(g.t);
        this.#beep();
      }
    }
    const now = groups.filter((g) => e >= g.window[0] && e <= g.window[1]);
    const next = groups.find((g) => g.window[0] > e);
    const parts = [];
    if (now.length) parts.push(`📸 Now: photo for ${now.flatMap((g) => g.symbols).join(', ')}`);
    if (next) parts.push(`⏳ ${next.symbols.join(', ')} in ${Math.ceil(next.t - e)} s`);
    if (!parts.length) parts.push('Late — colors keep changing. Dip a fresh strip for the most accurate reading.');
    this.hint.textContent = parts.join(' · ');
    this.hint.className = `timer-hint ${now.length ? 'now' : 'wait'}`;
    if (e > AUTO_STOP_SEC) this.stop();
  }

  #render(e) {
    this.display.textContent = formatElapsed(e);
  }

  #beep() {
    navigator.vibrate?.(200);
    if (!this.audio) return;
    try {
      const osc = this.audio.createOscillator();
      const gain = this.audio.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + 0.35);
      osc.connect(gain).connect(this.audio.destination);
      osc.start();
      osc.stop(this.audio.currentTime + 0.35);
    } catch {
      /* audio is best-effort */
    }
  }
}
