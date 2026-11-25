// Reloj de BPM global: el sitio "late" al tempo del show que estés viendo.
// Tap tempo: haz clic en el indicador de BPM al ritmo (3+ toques).
const listeners = new Set();
let bpm = 128;
let t0 = performance.now();
let lastBeat = -1;
let taps = [];

export const beat = {
  get bpm() { return bpm; },
  set(v) { if (v > 40 && v < 260) { bpm = +v; t0 = performance.now(); lastBeat = -1; emit('bpm'); } },
  // fase 0..1 dentro del beat actual
  phase(now = performance.now()) { return (((now - t0) / 60000) * bpm) % 1; },
  // envolvente tipo kick: 1 al golpe, decae rápido
  env(now = performance.now()) { const p = this.phase(now); return Math.exp(-p * 6); },
  count(now = performance.now()) { return Math.floor(((now - t0) / 60000) * bpm); },
  tap() {
    const now = performance.now();
    taps = taps.filter((t) => now - t < 2500);
    taps.push(now);
    if (taps.length >= 3) {
      const d = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
      bpm = Math.round((60000 / d) * 100) / 100;
      t0 = now; lastBeat = -1;
      emit('bpm');
    }
    return taps.length;
  },
  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

function emit(type) { listeners.forEach((fn) => fn(type, bpm)); }

function loop() {
  const c = beat.count();
  if (c !== lastBeat) { lastBeat = c; emit('beat'); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
