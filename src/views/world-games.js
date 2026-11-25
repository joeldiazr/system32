// Mundo 04 — Videojuegos & 3D Technical Art.
// "Press start" → selección de cartuchos → Taw Breaker (devlogs + impacto HDR) u
// Opossum Atelier (visor 3D de props FBX con wireframe y comparador render/topología).
import { projectsOf, worldOf, games, t, tr, pad, asset, posterOf } from '../data.js';
import { PropViewer } from '../gl/propviewer.js';
import { bindReveal, bindAutoplay } from '../ui/fx.js';

export function renderGamesWorld(app) {
  const w = worldOf('games');
  const list = projectsOf('games');
  const el = document.createElement('div');
  el.className = 'world world--games';
  app.appendChild(el);
  let viewer = null, ios = [];
  let started = false;
  try { started = sessionStorage.getItem('s32-start') === '1'; } catch { /* */ }

  const cleanup = () => { viewer?.destroy(); viewer = null; ios.forEach((i) => i.disconnect()); ios = []; el.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); }); };

  function title() {
    el.innerHTML = `
    <section class="g-title" tabindex="0">
      <p class="mono w-kicker"><span class="w-dot"></span>${tr({ es: 'MUNDO', en: 'WORLD' })} ${w.index} // PLAYER 1</p>
      <h1 class="g-logo" data-fit="125">${tr({ es: 'Videojuegos', en: 'Video games' })}</h1>
      <p class="mono dim">& 3D TECHNICAL ART</p>
      <button class="g-start mono" type="button" data-cursor="START">▶ ${t('pressStart')}</button>
      <p class="mono dim g-hint">CLICK · TAP · ENTER</p>
    </section>`;
    const go = () => { try { sessionStorage.setItem('s32-start', '1'); } catch { /* */ } select(); };
    el.querySelector('.g-start').addEventListener('click', go);
    el.querySelector('.g-title').addEventListener('keydown', (e) => e.key === 'Enter' && go());
    el.querySelector('.g-title').focus({ preventScroll: true });
  }

  function select() {
    cleanup();
    el.innerHTML = `
    <header class="w-head">
      <p class="mono w-kicker"><span class="w-dot"></span>${tr({ es: 'MUNDO', en: 'WORLD' })} ${w.index} // ${w.coords}</p>
      <h1 class="w-title">${tr(w.name)}</h1>
      <p class="mono dim w-hint">${t('selectCart')}</p>
    </header>
    <div class="carts">
      ${list.map((p, i) => `
      <button class="cart" data-id="${p.id}" style="--i:${i}" data-cursor="INSERT">
        <span class="cart-notch" aria-hidden="true"></span>
        <span class="cart-label"><img src="${asset(p.poster)}" alt=""><span class="cart-shine"></span></span>
        <span class="cart-t">${p.title}</span>
        <span class="mono dim">${p.year} · ${(p.tools || []).slice(0, 2).join(' · ')}</span>
      </button>`).join('')}
    </div>`;
    el.querySelectorAll('.cart').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateY(-6px)`;
        c.style.setProperty('--sx', `${(x + 0.5) * 100}%`);
      });
      c.addEventListener('pointerleave', () => (c.style.transform = ''));
      c.addEventListener('click', () => { c.classList.add('inserting'); setTimeout(() => (c.dataset.id === 'taw-breaker' ? taw() : opossum()), 380); });
    });
  }

  const head = (p) => `
    <header class="w-head g-head">
      <button class="pill g-eject mono" type="button">⏏ ${tr({ es: 'Cartuchos', en: 'Cartridges' })}</button>
      <p class="mono w-kicker"><span class="w-dot"></span>${p.year} · ${tr(p.role)}</p>
      <h1 class="w-title">${p.title}</h1>
      <p class="g-sum">${tr(p.summary)}</p>
      <p class="tools-inline">${(p.tools || []).map((x) => `<span>${x}</span>`).join('')}</p>
    </header>`;

  function taw() {
    cleanup();
    const p = list.find((x) => x.id === 'taw-breaker');
    const trailer = p.gallery.find((g) => g.type === 'video');
    const caps = p.gallery.filter((g) => g.type === 'image');
    el.innerHTML = `
    ${head(p)}
    <section class="g-trailer"><video src="${asset(trailer.src)}" poster="${asset(trailer.poster)}" controls playsinline preload="metadata"></video><span class="mono g-cap">${tr(trailer.caption)}</span></section>
    <section class="g-hdr">
      <div class="g-hdr-row"><h2 class="mono">${t('captures')}</h2><button class="pill pill--fill g-flash" type="button" data-cursor="BOOM">✦ ${t('hdrFlash')}</button></div>
      <div class="g-caps">${caps.map((c) => `<figure class="g-capfig"><img src="${asset(c.src)}" alt="${tr(c.caption)}" loading="lazy"><figcaption class="mono">${tr(c.caption)}</figcaption></figure>`).join('')}</div>
    </section>
    <section class="g-devlogs">
      <h2 class="mono dim">${t('devlogs')}</h2>
      ${games.tawDevlogs.map((d) => `
      <article class="devlog" data-reveal>
        <div class="devlog-imgs"><img src="${asset(d.image)}" alt="" loading="lazy"><img src="${asset(d.extraImage)}" alt="" loading="lazy"></div>
        <div class="devlog-txt">
          <p class="mono devlog-n">DEVLOG ${d.num}</p>
          <h3>${tr(d.title)}</h3>
          <p>${tr(d.body)}</p>
          <ul class="mono">${(d.bullets[getLangKey()] || []).map((b) => `<li>${b}</li>`).join('')}</ul>
        </div>
      </article>`).join('')}
    </section>`;
    el.querySelector('.g-eject').addEventListener('click', select);
    const flash = el.querySelector('.g-flash');
    flash.addEventListener('click', () => {
      const s = el.querySelector('.g-hdr');
      s.classList.remove('boom'); void s.offsetWidth; s.classList.add('boom');
    });
    ios.push(bindReveal(el));
  }

  function opossum() {
    cleanup();
    const p = list.find((x) => x.id === 'opossum-atelier');
    const props = games.opossumProps;
    el.innerHTML = `
    ${head(p)}
    <section class="g-viewer">
      <div class="g-3d"><span class="g-loading mono">${t('loadingModel')}</span></div>
      <div class="g-viewer-ui">
        <div class="seg mono g-modes"><button data-m="shaded" class="on">${t('shaded')}</button><button data-m="wire">${t('wireframe')}</button><button data-m="hybrid">${t('hybrid')}</button></div>
        <div class="g-props">${props.map((x, i) => `<button class="g-prop ${i === 0 ? 'on' : ''}" data-i="${i}"><img src="${asset(x.beauty)}" alt="" loading="lazy"><span>${tr(x.name)}</span><span class="mono dim">${x.quads} quads</span></button>`).join('')}</div>
        <dl class="g-stats mono"></dl>
      </div>
    </section>
    <section class="g-compare">
      <p class="mono dim">${t('compare')}</p>
      <div class="cmp" data-cursor="↔">
        <img class="cmp-a" src="${asset(props[0].beauty)}" alt="">
        <div class="cmp-b"><img src="${asset(props[0].wireframe)}" alt=""></div>
        <i class="cmp-bar"></i>
      </div>
    </section>
    <section class="g-clips">
      <h2 class="mono dim">${t('gameplay')}</h2>
      <div class="g-clip-grid">${games.opossumClips.map((c) => `<figure><video src="${asset(c.src)}" poster="${asset(c.poster)}" muted loop playsinline preload="none" data-autoplay></video><figcaption><span class="mono">${c.num} · ${c.duration}</span> ${tr(c.title)}<br><span class="dim small">${tr(c.propsFeatured)}</span></figcaption></figure>`).join('')}</div>
    </section>`;
    el.querySelector('.g-eject').addEventListener('click', select);
    const loading = el.querySelector('.g-loading');
    viewer = new PropViewer(el.querySelector('.g-3d'), { onLoading: (on) => loading.classList.toggle('on', on) });
    if (import.meta.env.DEV) window.__prop = viewer;
    const stats = el.querySelector('.g-stats');
    const cmpA = el.querySelector('.cmp-a'), cmpB = el.querySelector('.cmp-b img');
    const pick = (i) => {
      const x = props[i];
      el.querySelectorAll('.g-prop').forEach((b, k) => b.classList.toggle('on', k === i));
      viewer.load(x);
      stats.innerHTML = `<div><dt class="dim">${x.code}</dt><dd>${tr(x.category)}</dd></div><div><dt class="dim">QUADS</dt><dd>${x.quads}</dd></div><div><dt class="dim">GPU TRIS</dt><dd>${x.gpuTris}</dd></div><div><dt class="dim">MAPS</dt><dd>${x.maps}</dd></div>`;
      cmpA.src = asset(x.beauty); cmpB.src = asset(x.wireframe);
    };
    el.querySelectorAll('.g-prop').forEach((b) => b.addEventListener('click', () => pick(+b.dataset.i)));
    el.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => {
      el.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === b));
      viewer.setMode(b.dataset.m);
    }));
    // comparador: arrastrar o pasar el cursor
    const cmp = el.querySelector('.cmp');
    const setCmp = (e) => { const r = cmp.getBoundingClientRect(); cmp.style.setProperty('--x', `${Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))}%`); };
    cmp.addEventListener('pointermove', setCmp);
    cmp.addEventListener('pointerdown', setCmp);
    pick(0);
    ios.push(bindAutoplay(el));
  }

  if (started) select(); else title();

  return { name: 'world', destroy: cleanup };
}

import { getLang } from '../data.js';
const getLangKey = () => getLang();
export { posterOf, pad };
