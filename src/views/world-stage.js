// Mundo 01 — Visuales, VJ & Stage Creation.
// Un escenario 3D a pantalla completa; cada proyecto es un "canal" que monta su rig
// (pixel map real, o pantalla de festival para los que no tienen).
import { projectsOf, worldOf, t, tr, pad, asset } from '../data.js';
import { stageMarkup, mountStage } from './stage-ui.js';
import { beat } from '../ui/beat.js';
import { scramble } from '../ui/fx.js';

const RIG_TAG = { square: '1:1 PXMAP 3D', cross: 'CROSS 3D', multi: '4-SCREEN 3D', curved: 'CURVED 3D', festival: 'FESTIVAL RIG' };

export function renderStageWorld(app) {
  const w = worldOf('stage');
  const list = projectsOf('stage');
  const prevBpm = beat.bpm;
  let cur = 0;
  try { cur = Math.max(0, list.findIndex((p) => p.id === sessionStorage.getItem('s32-stage'))); } catch { /* */ }

  const el = document.createElement('div');
  el.className = 'world world--stage';
  el.innerHTML = `
  <header class="w-head">
    <p class="mono w-kicker"><span class="w-dot"></span>${tr({ es: 'MUNDO', en: 'WORLD' })} ${w.index} // ${w.coords}</p>
    <h1 class="w-title">${tr(w.name)}</h1>
  </header>
  <section class="stage stage--world"></section>
  <nav class="w-channels" aria-label="Canales">
    ${list.map((p, i) => `<button class="w-ch ${i === cur ? 'on' : ''}" data-i="${i}" style="--pc:${p.color || w.accent}">
      <span class="mono w-ch-n">CH ${pad(i + 1)} · ${RIG_TAG[p.pixelmap?.rig] || ''}</span>
      <span class="w-ch-t">${p.title}</span></button>`).join('')}
  </nav>
  <article class="w-info">
    <p class="mono w-info-k"></p>
    <h2 class="w-info-t"></h2>
    <p class="w-info-s"></p>
    <div class="w-info-cta"></div>
  </article>`;
  app.appendChild(el);

  const sec = el.querySelector('.stage');
  const info = el.querySelector('.w-info');
  let mounted = null;

  function show(i) {
    cur = i;
    try { sessionStorage.setItem('s32-stage', list[i].id); } catch { /* */ }
    const p = list[i];
    el.querySelectorAll('.w-ch').forEach((b, k) => b.classList.toggle('on', k === i));
    el.style.setProperty('--pc', p.color || w.accent);
    mounted?.destroy();
    sec.classList.add('switching');
    sec.innerHTML = stageMarkup(p.pixelmap);
    mounted = mountStage(sec, p.pixelmap, p.title);
    setTimeout(() => sec.classList.remove('switching'), 60);
    if (p.pixelmap.bpm) beat.set(p.pixelmap.bpm);
    info.querySelector('.w-info-k').textContent = `CH ${pad(i + 1)} / ${pad(list.length)} · ${p.year} · ${tr(p.role)}`;
    info.querySelector('.w-info-t').textContent = p.title;
    scramble(info.querySelector('.w-info-t'), { duration: 500 });
    info.querySelector('.w-info-s').textContent = tr(p.summary);
    info.querySelector('.w-info-cta').innerHTML = `
      <a class="pill pill--fill" href="#/p/${p.id}" data-magnetic="0.2">${t('openGallery')} →</a>
      ${p.liveSet ? `<a class="pill" href="${p.liveSet.url}" target="_blank" rel="noopener">▶ ${tr(p.liveSet.label) || t('liveSet')}</a>` : ''}`;
  }

  el.querySelectorAll('.w-ch').forEach((b) => b.addEventListener('click', () => show(+b.dataset.i)));
  const onKey = (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); show((cur + 1) % list.length); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); show((cur - 1 + list.length) % list.length); }
  };
  addEventListener('keydown', onKey);
  show(cur);

  return {
    name: 'world',
    destroy() { mounted?.destroy(); removeEventListener('keydown', onKey); beat.set(prevBpm); },
  };
}

export { asset };
