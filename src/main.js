import './style.css';
import { site, projects } from './data.js';
import { initCursor } from './ui/cursor.js';
import { beat } from './ui/beat.js';
import { bindScramble, bindMagnetic, wipe, reducedMotion, fitText } from './ui/fx.js';
import { lenis } from './ui/scroll.js';
import { renderHome } from './views/home.js';
import { renderProject } from './views/project.js';

// ---------- HUD fijo
const hud = document.getElementById('hud');
hud.innerHTML = `
  <a href="#/" class="hud-logo" data-scramble aria-label="Inicio">
    <span class="hud-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="scr">SYSTEM32</span>
  </a>
  <nav class="hud-nav" aria-label="Principal">
    <a href="#/trabajo" data-scramble><span class="scr">Trabajo</span><sup>${String(projects.length).padStart(2, '0')}</sup></a>
    <a href="#/info" data-scramble><span class="scr">Info</span></a>
    <a href="#/contacto" data-scramble><span class="scr">Contacto</span></a>
  </nav>
  <div class="hud-r">
    <button class="hud-bpm" type="button" title="Tap tempo: haz clic al ritmo" data-cursor="TAP">
      <i class="bpm-dot"></i><span class="bpm-val">${beat.bpm.toFixed(2)}</span><span class="bpm-u">BPM</span>
    </button>
    <span class="hud-clock" title="Hora en Medellín">MDE <b>--:--:--</b></span>
  </div>`;
bindScramble(hud);

const bpmBtn = hud.querySelector('.hud-bpm');
const bpmVal = hud.querySelector('.bpm-val');
bpmBtn.addEventListener('click', () => beat.tap());
beat.on((type, v) => {
  if (type === 'bpm') bpmVal.textContent = v.toFixed(2);
  if (type === 'beat') { bpmBtn.classList.remove('hit'); void bpmBtn.offsetWidth; bpmBtn.classList.add('hit'); }
});

const clock = hud.querySelector('.hud-clock b');
const fmt = new Intl.DateTimeFormat('es-CO', { timeZone: site.timezone || 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const tickClock = () => (clock.textContent = fmt.format(new Date()));
tickClock(); setInterval(tickClock, 1000);

// ocultar HUD al bajar, mostrar al subir
let lastY = 0;
lenis.on('scroll', ({ scroll }) => {
  hud.classList.toggle('hud--hide', scroll > 200 && scroll > lastY);
  hud.classList.toggle('hud--solid', scroll > 40);
  lastY = scroll;
});

// ---------- router por hash (sirve en GitHub Pages sin configuración)
const app = document.getElementById('app');
let view = null;
let first = true;

function parse() {
  const h = location.hash.replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  if (a === 'p' && b) return { name: 'project', slug: decodeURIComponent(b) };
  if (['trabajo', 'info', 'contacto'].includes(a)) return { name: 'home', section: a };
  return { name: 'home' };
}

async function route() {
  const r = parse();
  const sameHome = r.name === 'home' && view?.name === 'home';
  if (sameHome) { view.scrollTo?.(r.section); return; }

  const swap = () => {
    view?.destroy?.();
    app.innerHTML = '';
    lenis.scrollTo(0, { immediate: true });
    if (r.name === 'project') {
      const p = projects.find((x) => x.slug === r.slug);
      view = p ? renderProject(app, p) : renderHome(app);
      document.title = p ? `${p.title} — SYSTEM32` : 'SYSTEM32 — Sebastián Hincapié';
    } else {
      view = renderHome(app);
      document.title = 'SYSTEM32 — Sebastián Hincapié';
    }
    bindScramble(app); bindMagnetic(document);
    fitText(app); document.fonts.ready.then(() => fitText(app));
    lenis.resize();
    if (r.section) requestAnimationFrame(() => view.scrollTo?.(r.section, true));
  };

  if (first || reducedMotion) { first = false; swap(); return; }
  await wipe(swap);
}

addEventListener('hashchange', route);

// ---------- arranque
initCursor();
boot().then(route);

// pantalla de arranque estilo consola (corta, y solo la primera visita de la sesión)
async function boot() {
  const el = document.getElementById('boot');
  let seen = false;
  try { seen = sessionStorage.getItem('s32-boot') === '1'; sessionStorage.setItem('s32-boot', '1'); } catch { /* sin storage */ }
  if (seen || reducedMotion) { el.remove(); return; }
  const pre = el.querySelector('pre');
  const lines = [
    'C:\\> cd SYSTEM32',
    'C:\\SYSTEM32> load visuals.dxv ......... ok',
    `C:\\SYSTEM32> mount ${projects.length} proyectos ......... ok`,
    'C:\\SYSTEM32> pixelmap --rig square,cross ... ok',
    'C:\\SYSTEM32> sync bpm 180.32 ........... ok',
    'C:\\SYSTEM32> run sebastian_hincapie.exe',
  ];
  for (const l of lines) {
    pre.textContent += l + '\n';
    await new Promise((r) => setTimeout(r, 120 + Math.random() * 90));
  }
  await new Promise((r) => setTimeout(r, 220));
  el.classList.add('out');
  setTimeout(() => el.remove(), 600);
}

// reajustar títulos al cambiar el tamaño de la ventana
let fitT;
addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(() => fitText(app), 120); });
