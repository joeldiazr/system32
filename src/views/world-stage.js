// Mundo 01 — Visuales, VJ & Stage Creation.
// Un escenario 3D a pantalla completa; cada proyecto es un "canal" que monta su rig
// (pixel map real, o pantalla de festival para los que no tienen).
// A la izquierda, un solo panel: lista de canales (con scroll propio) + ficha del proyecto.
import { projectsOf, worldOf, t, tr, pad, asset } from '../data.js';
import { stageMarkup, mountStage } from './stage-ui.js';
import { beat } from '../ui/beat.js';
import { scramble } from '../ui/fx.js';

const RIG_TAG = { square: '1:1 PXMAP', cross: 'CROSS', multi: '4 SCREENS', curved: 'CURVED', festival: 'FESTIVAL' };

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
  <aside class="w-side">
    <div class="w-side-head mono">
      <span>${tr({ es: 'PROYECTOS', en: 'PROJECTS' })} <b class="w-side-n">01</b> / ${pad(list.length)}</span>
      <span class="w-side-arrows">
        <button type="button" data-step="-1" aria-label="${tr({ es: 'Proyecto anterior', en: 'Previous project' })}">↑</button>
        <button type="button" data-step="1" aria-label="${tr({ es: 'Proyecto siguiente', en: 'Next project' })}">↓</button>
      </span>
    </div>
    <div class="w-list">
      <nav class="w-channels" aria-label="${tr({ es: 'Proyectos', en: 'Projects' })}" data-lenis-prevent tabindex="0">
        ${list.map((p, i) => `<button class="w-ch ${i === cur ? 'on' : ''}" data-i="${i}" style="--pc:${p.color || w.accent}">
          <span class="mono w-ch-n">${pad(i + 1)}</span>
          <span class="w-ch-t">${p.title}</span>
          <span class="mono w-ch-rig ${p.pixelmap?.rig !== 'festival' ? 'is-px' : ''}">${RIG_TAG[p.pixelmap?.rig] || ''}</span></button>`).join('')}
      </nav>
      <button class="w-more mono" type="button"><span class="w-more-n"></span> ${tr({ es: 'más · desliza', en: 'more · scroll' })} <i>↓</i></button>
    </div>
    <article class="w-info">
      <p class="mono w-info-k"></p>
      <h2 class="w-info-t"></h2>
      <p class="w-info-s"></p>
      <div class="w-info-cta"></div>
    </article>
  </aside>`;
  app.appendChild(el);

  const sec = el.querySelector('.stage');
  const info = el.querySelector('.w-info');
  const nav = el.querySelector('.w-channels');
  const more = el.querySelector('.w-more');
  const chs = [...el.querySelectorAll('.w-ch')];
  let mounted = null;

  // ---- indicador de scroll de la lista: degradados arriba/abajo + "N más ↓"
  const updateScroll = () => {
    const max = nav.scrollHeight - nav.clientHeight;
    const top = nav.scrollTop;
    el.querySelector('.w-list').classList.toggle('can-up', top > 4);
    el.querySelector('.w-list').classList.toggle('can-down', top < max - 4);
    const navR = nav.getBoundingClientRect();
    const hidden = chs.filter((c) => c.getBoundingClientRect().top >= navR.bottom - 8).length;
    more.querySelector('.w-more-n').textContent = `+${hidden}`;
    more.classList.toggle('on', hidden > 0);
  };
  nav.addEventListener('scroll', updateScroll, { passive: true });
  more.addEventListener('click', () => nav.scrollBy({ top: nav.clientHeight * 0.8, behavior: 'smooth' }));
  const ro = new ResizeObserver(updateScroll);
  ro.observe(nav);

  function show(i) {
    cur = (i + list.length) % list.length;
    try { sessionStorage.setItem('s32-stage', list[cur].id); } catch { /* */ }
    const p = list[cur];
    chs.forEach((b, k) => b.classList.toggle('on', k === cur));
    // lleva el canal activo a la vista dentro de la lista (vertical en escritorio, horizontal en móvil)
    const c = chs[cur];
    if (nav.scrollWidth > nav.clientWidth + 4) nav.scrollTo({ left: c.offsetLeft - 16, behavior: 'smooth' });
    else if (c.offsetTop < nav.scrollTop || c.offsetTop + c.offsetHeight > nav.scrollTop + nav.clientHeight) nav.scrollTo({ top: c.offsetTop - 40, behavior: 'smooth' });
    el.querySelector('.w-side-n').textContent = pad(cur + 1);
    el.style.setProperty('--pc', p.color || w.accent);
    mounted?.destroy();
    sec.classList.add('switching');
    sec.innerHTML = stageMarkup(p.pixelmap);
    mounted = mountStage(sec, p.pixelmap, p.title);
    setTimeout(() => sec.classList.remove('switching'), 60);
    if (p.pixelmap.bpm) beat.set(p.pixelmap.bpm);
    info.querySelector('.w-info-k').textContent = `${p.year} · ${tr(p.role)}`;
    info.querySelector('.w-info-t').textContent = p.title;
    scramble(info.querySelector('.w-info-t'), { duration: 500 });
    info.querySelector('.w-info-s').textContent = tr(p.summary);
    info.querySelector('.w-info-cta').innerHTML = `
      <a class="pill pill--fill" href="#/p/${p.id}" data-magnetic="0.2">${t('openGallery')} →</a>
      ${p.liveSet ? `<a class="pill" href="${p.liveSet.url}" target="_blank" rel="noopener">▶ ${tr(p.liveSet.label) || t('liveSet')}</a>` : ''}`;
    setTimeout(updateScroll, 400);
  }

  chs.forEach((b) => b.addEventListener('click', () => show(+b.dataset.i)));
  el.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => show(cur + +b.dataset.step)));
  const onKey = (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
  };
  addEventListener('keydown', onKey);
  show(cur);

  return {
    name: 'world',
    destroy() { mounted?.destroy(); ro.disconnect(); removeEventListener('keydown', onKey); beat.set(prevBpm); },
  };
}

export { asset };
