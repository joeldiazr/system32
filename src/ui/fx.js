// Microinteracciones reutilizables: scramble de texto, botones magnéticos,
// revelado al hacer scroll y la transición de bloques (tipo Resolume) entre vistas.

const GLYPHS = '▓▒░█▚▞▙▟01#/\\<>_=+*';

export function scramble(el, { duration = 520, text } = {}) {
  // si ya había un scramble en curso, el texto real es el guardado; si no, el actual
  const final = text ?? (el._scr ? el.dataset.text : el.textContent);
  el.dataset.text = final;
  const start = performance.now();
  cancelAnimationFrame(el._scr);
  clearTimeout(el._scrT);
  el._scrT = setTimeout(() => { cancelAnimationFrame(el._scr); el._scr = 0; el.textContent = final; }, duration + 80);
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    let out = '';
    for (let i = 0; i < final.length; i++) {
      const c = final[i];
      if (c === ' ' || i / final.length < t * 1.15 - 0.15) out += c;
      else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (t < 1) el._scr = requestAnimationFrame(step);
    else { el.textContent = final; el._scr = 0; }
  };
  el._scr = requestAnimationFrame(step);
}

export function bindScramble(root = document) {
  root.querySelectorAll('[data-scramble]').forEach((el) => {
    if (el._scrBound) return;
    el._scrBound = true;
    const target = el.querySelector('.scr') || el;
    el.addEventListener('pointerenter', () => scramble(target));
  });
}

export function bindMagnetic(root = document) {
  if (!matchMedia('(hover: hover)').matches) return;
  root.querySelectorAll('[data-magnetic]').forEach((el) => {
    if (el._magBound) return;
    el._magBound = true;
    const k = Number(el.dataset.magnetic) || 0.3;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * k}px, ${y * k}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

export function bindReveal(root = document) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  root.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
  return io;
}

// Videos: reproducir solo cuando están en pantalla
export function bindAutoplay(root = document) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); }
      else v.pause();
    });
  }, { threshold: 0.2 });
  root.querySelectorAll('video[data-autoplay]').forEach((v) => io.observe(v));
  return io;
}

// Divide un texto en palabras envueltas para animarlas
export function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}"><span>${w}</span></span>`).join(' ');
}

// Transición de bloques: la pantalla se llena de "píxeles" en orden aleatorio,
// cambia la vista y se vacía.
const wipeCanvas = () => document.getElementById('wipe');
export function wipe(swap, { color = '#FF4A1C' } = {}) {
  const cv = wipeCanvas();
  // pestaña en segundo plano: requestAnimationFrame no corre, así que cambia sin animar
  if (document.hidden) { cv.style.visibility = 'hidden'; return Promise.resolve(swap()); }
  const ctx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio, 2);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const size = Math.max(48, Math.round(Math.min(innerWidth, innerHeight) / 9)) * dpr;
  const cols = Math.ceil(cv.width / size), rows = Math.ceil(cv.height / size);
  const cells = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells.push([x, y, Math.random() * 0.6 + (x / cols) * 0.4]);
  cv.style.visibility = 'visible';
  const dur = 380;
  const draw = (t, fill) => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const [x, y, d] of cells) {
      const on = fill ? t > d : t < d;
      if (!on) continue;
      const edge = Math.abs(t - d) < 0.08;
      ctx.fillStyle = edge ? color : '#070708';
      ctx.fillRect(x * size, y * size, size + 1, size + 1);
    }
  };
  return new Promise((resolve) => {
    let start = performance.now();
    const phaseIn = (now) => {
      const t = Math.min(1.08, (now - start) / dur);
      draw(t, true);
      if (t < 1.08) return requestAnimationFrame(phaseIn);
      Promise.resolve(swap()).then(() => {
        start = performance.now();
        requestAnimationFrame(phaseOut);
      });
    };
    const phaseOut = (now) => {
      const t = Math.min(1.08, (now - start) / dur);
      draw(t, false);
      if (t < 1.08) return requestAnimationFrame(phaseOut);
      ctx.clearRect(0, 0, cv.width, cv.height);
      cv.style.visibility = 'hidden';
      resolve();
    };
    requestAnimationFrame(phaseIn);
  });
}

// Títulos gigantes: si una palabra no cabe en su contenedor, se reduce el cuerpo hasta que quepa.
// data-fit="125" mide con el ancho variable que toma en hover, para que tampoco se salga ahí.
export function fitText(root = document) {
  root.querySelectorAll('[data-fit]').forEach((el) => {
    el.style.fontSize = '';
    const hoverW = el.dataset.fit;
    const prevFvs = el.style.fontVariationSettings;
    if (hoverW) el.style.fontVariationSettings = `'wdth' ${hoverW}`;
    let size = parseFloat(getComputedStyle(el).fontSize);
    let guard = 40;
    while (el.scrollWidth > el.clientWidth + 1 && size > 16 && guard--) {
      size *= 0.94;
      el.style.fontSize = size + 'px';
    }
    el.style.fontVariationSettings = prevFvs;
  });
}

export const reducedMotion =matchMedia('(prefers-reduced-motion: reduce)').matches;
