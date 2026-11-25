import './style.css';
import './worlds.css';
import { site, projects, worlds, worldOf, t, tr, pad, getLang, setLang, onLang } from './data.js';
import { initCursor } from './ui/cursor.js';
import { beat } from './ui/beat.js';
import { bindScramble, bindMagnetic, wipe, reducedMotion, fitText } from './ui/fx.js';
import { lenis } from './ui/scroll.js';
import { renderHome } from './views/home.js';
import { renderProject } from './views/project.js';
import { renderIndex } from './views/index.js';
import { renderCV } from './views/cv.js';
import { renderStageWorld } from './views/world-stage.js';
import { renderMotionWorld } from './views/world-motion.js';
import { renderVRWorld } from './views/world-vr.js';
import { renderGamesWorld } from './views/world-games.js';

const WORLD_VIEWS = { stage: renderStageWorld, motion: renderMotionWorld, vr: renderVRWorld, games: renderGamesWorld };
const DEFAULT_ACCENT = '#FF4A1C';

// ---------- HUD fijo
const hud = document.getElementById('hud');
function drawHud() {
  hud.innerHTML = `
  <a href="#/" class="hud-logo" data-scramble aria-label="SYSTEM32">
    <span class="hud-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="scr">SYSTEM32</span>
  </a>
  <nav class="hud-nav" aria-label="Mundos">
    <a href="#/hub" data-r="hub"><i class="wd"></i><span class="mono">00</span> ${t('hub')}</a>
    ${worlds.map((w) => `<a href="#/w/${w.id}" data-r="w/${w.id}" style="--wc:${w.accent}"><i class="wd"></i><span class="mono">${w.index}</span> ${tr(w.shortName)}</a>`).join('')}
  </nav>
  <div class="hud-r">
    <a href="#/indice" class="hud-link" data-r="indice" data-scramble><span class="scr">${t('index')}</span><sup>${pad(projects.length)}</sup></a>
    <a href="#/cv" class="hud-link" data-r="cv" data-scramble><span class="scr">CV</span></a>
    <button class="hud-lang mono" type="button" aria-label="Idioma / Language"><span data-l="es">ES</span><span data-l="en">EN</span></button>
    <button class="hud-bpm" type="button" title="Tap tempo" data-cursor="TAP"><i class="bpm-dot"></i><span class="bpm-val">${beat.bpm.toFixed(2)}</span><span class="bpm-u">BPM</span></button>
    <span class="hud-clock" title="Medellín">MDE <b>--:--:--</b></span>
    <button class="hud-menu" type="button" aria-label="Menú" aria-expanded="false"><i></i><i></i></button>
  </div>`;
  bindScramble(hud);
  hud.querySelector('.hud-bpm').addEventListener('click', () => beat.tap());
  hud.querySelector('.hud-lang').addEventListener('click', () => setLang(getLang() === 'es' ? 'en' : 'es'));
  hud.querySelector('.hud-lang').dataset.lang = getLang();
  hud.querySelector('.hud-menu').addEventListener('click', () => {
    const open = !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    hud.querySelector('.hud-menu').setAttribute('aria-expanded', open);
  });
  hud.querySelectorAll('.hud-nav a, .hud-link').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('menu-open')));
  markActive();
  tickClock();
}

function markActive() {
  const h = location.hash.replace(/^#\/?/, '') || '';
  const key = h.startsWith('w/') ? h.split('/').slice(0, 2).join('/') : h.split('/')[0] || '';
  hud.querySelectorAll('[data-r]').forEach((a) => a.classList.toggle('on', a.dataset.r === key || (key === '' && a.dataset.r === 'hub' && false)));
}

beat.on((type, v) => {
  const btn = hud.querySelector('.hud-bpm');
  if (!btn) return;
  if (type === 'bpm') btn.querySelector('.bpm-val').textContent = v.toFixed(2);
  if (type === 'beat') { btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit'); }
});

const fmt = new Intl.DateTimeFormat('es-CO', { timeZone: site.timezone || 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
function tickClock() { const c = hud.querySelector('.hud-clock b'); if (c) c.textContent = fmt.format(new Date()); }
setInterval(tickClock, 1000);

let lastY = 0;
lenis.on('scroll', ({ scroll }) => {
  const free = document.body.classList.contains('is-world');
  hud.classList.toggle('hud--hide', !free && scroll > 200 && scroll > lastY);
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
  if (a === 'p' && b) return { name: 'project', id: decodeURIComponent(b) };
  if (a === 'w' && WORLD_VIEWS[b]) return { name: 'world', id: b };
  if (a === 'indice') return { name: 'index' };
  if (a === 'cv') return { name: 'cv' };
  if (a === 'hub') return { name: 'home', section: 'hub' };
  if (a === 'contacto') return { name: 'home', section: 'contacto' };
  return { name: 'home' };
}

async function route(force = false) {
  const r = parse();
  markActive();
  if (!force && r.name === 'home' && view?.name === 'home') { view.scrollTo?.(r.section); return; }

  const accentFor = () => {
    if (r.name === 'world') return worldOf(r.id).accent;
    if (r.name === 'project') { const p = projects.find((x) => x.id === r.id); return p ? worldOf(p.world)?.accent : DEFAULT_ACCENT; }
    return DEFAULT_ACCENT;
  };
  const accent = accentFor();

  const swap = () => {
    view?.destroy?.();
    app.innerHTML = '';
    document.body.classList.toggle('is-world', r.name === 'world');
    document.body.classList.toggle('is-scroll', r.name === 'world' && r.id === 'games');
    document.body.classList.remove('menu-open');
    document.documentElement.style.setProperty('--accent', accent);
    lenis.scrollTo(0, { immediate: true });
    if (r.name === 'project') {
      const p = projects.find((x) => x.id === r.id);
      view = p ? renderProject(app, p) : renderHome(app);
      document.title = p ? `${p.title} — SYSTEM32` : 'SYSTEM32 — Sebastián Hincapié';
    } else if (r.name === 'world') {
      view = WORLD_VIEWS[r.id](app);
      document.title = `${tr(worldOf(r.id).name)} — SYSTEM32`;
    } else if (r.name === 'index') { view = renderIndex(app); document.title = `${t('index')} — SYSTEM32`; }
    else if (r.name === 'cv') { view = renderCV(app); document.title = `${t('cv')} — SYSTEM32`; }
    else { view = renderHome(app); document.title = 'SYSTEM32 — Sebastián Hincapié'; }
    bindScramble(app); bindMagnetic(document);
    fitText(app); document.fonts.ready.then(() => fitText(app));
    lenis.resize();
    if (r.section) requestAnimationFrame(() => view.scrollTo?.(r.section, true));
  };

  if (first || reducedMotion || force === 'instant') { first = false; swap(); return; }
  await wipe(swap, { color: accent });
}

addEventListener('hashchange', () => route());
onLang(() => { drawHud(); route('instant'); });

// ---------- arranque
drawHud();
initCursor();
boot().then(() => route());

// pantalla de arranque estilo consola (corta, y solo la primera visita de la sesión)
async function boot() {
  const el = document.getElementById('boot');
  let seen = false;
  try { seen = sessionStorage.getItem('s32-boot') === '1'; sessionStorage.setItem('s32-boot', '1'); } catch { /* sin storage */ }
  if (seen || reducedMotion) { el.remove(); return; }
  const pre = el.querySelector('pre');
  const lines = [
    'C:\\> cd SYSTEM32',
    'C:\\SYSTEM32> load visuals.dxv ............ ok',
    `C:\\SYSTEM32> mount ${worlds.length} worlds · ${projects.length} projects .. ok`,
    'C:\\SYSTEM32> pixelmap --rig square,cross,multi,curved ok',
    'C:\\SYSTEM32> sync bpm 180.32 .............. ok',
    'C:\\SYSTEM32> run sebastian_hincapie.exe',
  ];
  for (const l of lines) {
    pre.textContent += l + '\n';
    await new Promise((res) => setTimeout(res, 110 + Math.random() * 80));
  }
  await new Promise((res) => setTimeout(res, 200));
  el.classList.add('out');
  setTimeout(() => el.remove(), 600);
}

let fitT;
addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(() => fitText(app), 120); });
