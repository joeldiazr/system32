// Contenidos: los 23 proyectos en lista (con preview flotante) o grilla densa.
import { projects, worlds, worldOf, t, tr, asset, pad } from '../data.js';
import { mouse } from '../ui/cursor.js';
import { lenis } from '../ui/scroll.js';
import { bindReveal, scramble } from '../ui/fx.js';
import { contactBlock, bindContact } from './home.js';

export function renderIndex(app) {
  let view = 'list';
  try { view = localStorage.getItem('s32-view') || 'list'; } catch { /* */ }
  const counts = Object.fromEntries(worlds.map((w) => [w.id, projects.filter((p) => p.world === w.id).length]));
  const el = document.createElement('div');
  el.className = 'index-page';
  el.innerHTML = `
  <section class="work">
    <header class="work-head">
      <h1 class="big" data-reveal data-fit>${t('index')}<sup>${pad(projects.length)}</sup></h1>
      <div class="work-ctrl">
        <div class="chips" role="tablist">
          <button class="chip on" data-cat="all"><span>${t('all')}</span><sup>${pad(projects.length)}</sup></button>
          ${worlds.map((w) => `<button class="chip" data-cat="${w.id}" style="--wc:${w.accent}"><i class="wd"></i><span>${tr(w.shortName)}</span><sup>${pad(counts[w.id])}</sup></button>`).join('')}
        </div>
        <div class="views">
          <button data-view="list" class="${view === 'list' ? 'on' : ''}" aria-label="List"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" stroke-width="1.5"/></svg></button>
          <button data-view="grid" class="${view === 'grid' ? 'on' : ''}" aria-label="Grid"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M2 2h7v7H2zM11 2h7v7h-7zM2 11h7v7H2zM11 11h7v7h-7z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>
        </div>
      </div>
    </header>
    <div class="list ${view === 'list' ? '' : 'is-hidden'}">
      <div class="row row--head mono" aria-hidden="true"><span>N°</span><span>${tr({ es: 'Proyecto', en: 'Project' })}</span><span>${t('role')}</span><span>${t('world')}</span><span>${t('year')}</span><span></span></div>
      ${projects.map((p, i) => { const w = worldOf(p.world); return `
      <a class="row" href="#/p/${p.id}" data-cat="${p.world}" data-prev="${p.preview}" data-poster="${p.poster}" data-cursor="OPEN" style="--i:${i}; --wc:${w.accent}">
        <span class="r-n mono">${pad(p.index)}</span>
        <span class="r-t"><span class="r-title">${p.title}</span>${p.pixelmap && p.pixelmap.rig !== 'festival' ? `<em class="tag-px">PXMAP · ${p.pixelmap.rig.toUpperCase()}</em>` : ''}</span>
        <span class="r-c">${tr(p.role)}</span>
        <span class="r-k mono"><i class="wd"></i>${w.index} ${tr(w.shortName)}</span>
        <span class="r-y mono">${p.year}</span>
        <span class="r-a" aria-hidden="true">↗</span>
      </a>`; }).join('')}
    </div>
    <div class="grid ${view === 'grid' ? '' : 'is-hidden'}">
      ${projects.map((p, i) => { const w = worldOf(p.world); return `
      <a class="tile ${p.pixelmap && p.pixelmap.rig !== 'festival' ? 'tile--big' : ''}" href="#/p/${p.id}" data-cat="${p.world}" data-cursor="OPEN" style="--i:${i}; --wc:${w.accent}">
        ${p.preview ? `<video muted loop playsinline preload="none" poster="${asset(p.poster)}" data-src="${asset(p.preview)}"></video>` : `<img src="${asset(p.poster)}" alt="" loading="lazy">`}
        <span class="t-meta"><span class="mono">${pad(p.index)}</span><span class="t-title">${p.title}</span><span class="mono t-k">${w.index}</span></span>
        ${p.pixelmap && p.pixelmap.rig !== 'festival' ? '<span class="t-px mono">PXMAP 3D</span>' : ''}
      </a>`; }).join('')}
    </div>
  </section>
  ${contactBlock()}
  <div class="preview" aria-hidden="true"><div class="preview-in"><video muted loop playsinline></video><img alt=""><span class="preview-k mono"></span></div></div>`;
  app.appendChild(el);

  const rows = [...el.querySelectorAll('.row:not(.row--head)')];
  const tiles = [...el.querySelectorAll('.tile')];
  const chips = el.querySelectorAll('.chip');
  chips.forEach((c) => c.addEventListener('click', () => {
    chips.forEach((x) => x.classList.toggle('on', x === c));
    let k = 0;
    [...rows, ...tiles].forEach((r) => {
      const show = c.dataset.cat === 'all' || r.dataset.cat === c.dataset.cat;
      r.classList.toggle('is-out', !show);
      if (show) { r.style.setProperty('--i', k++ % rows.length); r.classList.remove('in-anim'); void r.offsetWidth; r.classList.add('in-anim'); }
    });
    lenis.resize();
  }));
  const list = el.querySelector('.list'), grid = el.querySelector('.grid');
  el.querySelectorAll('.views button').forEach((b) => b.addEventListener('click', () => {
    view = b.dataset.view;
    try { localStorage.setItem('s32-view', view); } catch { /* */ }
    el.querySelectorAll('.views button').forEach((x) => x.classList.toggle('on', x === b));
    list.classList.toggle('is-hidden', view !== 'list'); grid.classList.toggle('is-hidden', view !== 'grid');
    lenis.resize();
  }));

  const prev = el.querySelector('.preview');
  const pv = prev.querySelector('video'), pi = prev.querySelector('img'), pk = prev.querySelector('.preview-k');
  const fine = matchMedia('(hover: hover)').matches;
  let px = mouse.x, py = mouse.y, rot = 0, rafP;
  if (fine) {
    rows.forEach((r) => {
      r.addEventListener('pointerenter', () => {
        prev.classList.add('on');
        pk.textContent = r.querySelector('.r-n').textContent + ' · ' + r.querySelector('.r-k').textContent;
        if (!r.dataset.prev) { pi.src = asset(r.dataset.poster); pi.style.display = 'block'; pv.style.display = 'none'; pv.pause(); }
        else {
          pi.style.display = 'none'; pv.style.display = 'block';
          if (pv.dataset.src !== r.dataset.prev) { pv.dataset.src = r.dataset.prev; pv.poster = asset(r.dataset.poster); pv.src = asset(r.dataset.prev); }
          pv.play().catch(() => {});
        }
        scramble(r.querySelector('.r-title'), { duration: 380 });
      });
      r.addEventListener('pointerleave', () => { prev.classList.remove('on'); pv.pause(); });
    });
    const follow = () => {
      px += (mouse.x - px) * 0.14; py += (mouse.y - py) * 0.14;
      rot += (Math.max(-14, Math.min(14, (mouse.x - px) * 0.08)) - rot) * 0.2;
      prev.style.transform = `translate3d(${px}px, ${py}px, 0) rotate(${rot}deg)`;
      rafP = requestAnimationFrame(follow);
    };
    follow();
  }
  const tileIO = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target.querySelector('video');
    if (!v) return;
    if (e.isIntersecting && !fine) play(v); else if (!e.isIntersecting) v.pause();
  }), { threshold: 0.35 });
  tiles.forEach((tl) => {
    tileIO.observe(tl);
    const v = tl.querySelector('video');
    tl.addEventListener('pointerenter', () => { if (v) play(v); scramble(tl.querySelector('.t-title'), { duration: 420 }); });
    tl.addEventListener('pointerleave', () => v?.pause());
  });
  function play(v) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); }

  bindContact(el);
  const io = bindReveal(el);
  return {
    name: 'index',
    destroy() { cancelAnimationFrame(rafP); tileIO.disconnect(); io.disconnect(); el.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); }); },
  };
}
