// Cursor tipo retícula de pixel map: punto + anillo con inercia, etiqueta contextual
// y lectura de coordenadas en píxeles.
import { pad } from '../data.js';

export const mouse = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, nx: 0, ny: 0 };

export function initCursor() {
  const el = document.getElementById('cursor');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  addEventListener('pointermove', (e) => {
    mouse.vx = e.clientX - mouse.x; mouse.vy = e.clientY - mouse.y;
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.nx = (e.clientX / innerWidth) * 2 - 1; mouse.ny = -(e.clientY / innerHeight) * 2 + 1;
  }, { passive: true });
  if (!fine) { el.remove(); return; }
  document.documentElement.classList.add('has-cursor');

  const dot = el.querySelector('.c-dot');
  const ring = el.querySelector('.c-ring');
  const label = el.querySelector('.c-label');
  const xy = el.querySelector('.c-xy');
  let rx = mouse.x, ry = mouse.y;

  const tick = () => {
    rx += (mouse.x - rx) * 0.18; ry += (mouse.y - ry) * 0.18;
    dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    label.style.transform = `translate(${rx}px, ${ry}px)`;
    xy.style.transform = `translate(${mouse.x + 14}px, ${mouse.y + 14}px)`;
    xy.textContent = `${pad(Math.round(mouse.x), 4)}·${pad(Math.round(mouse.y), 4)}`;
    requestAnimationFrame(tick);
  };
  tick();

  // estados según lo que haya debajo: [data-cursor="Texto"]
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor], a, button, [role="button"]');
    if (!t) { el.className = ''; label.textContent = ''; return; }
    const txt = t.dataset.cursor;
    el.className = txt ? 'is-label' : 'is-link';
    label.textContent = txt || '';
  });
  document.addEventListener('pointerdown', () => el.classList.add('is-down'));
  document.addEventListener('pointerup', () => el.classList.remove('is-down'));
  document.addEventListener('pointerleave', () => (el.style.opacity = 0));
  document.addEventListener('pointerenter', () => (el.style.opacity = 1));
}
