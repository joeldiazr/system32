import { projects, worldOf, t, tr, asset, posterOf, pad, isImg } from '../data.js';
import { stageMarkup, mountStage } from './stage-ui.js';
import { beat } from '../ui/beat.js';
import { lenis } from '../ui/scroll.js';
import { bindReveal, bindAutoplay, scramble, fitText } from '../ui/fx.js';

export function renderProject(app, p) {
  const w = worldOf(p.world);
  const i = projects.indexOf(p);
  const next = projects[(i + 1) % projects.length];
  const prevP = projects[(i - 1 + projects.length) % projects.length];
  const pm = p.pixelmap;
  const prevBpm = beat.bpm;
  if (pm?.bpm) beat.set(pm.bpm);
  const media = p.gallery || [];

  const el = document.createElement('article');
  el.className = 'project';
  el.innerHTML = `
  <nav class="p-bar mono">
    <a href="#/w/${p.world}" class="p-back" data-scramble><span class="scr">← ${tr(w.shortName)}</span></a>
    <span class="p-count">${pad(p.index)} / ${pad(projects.length)} · <i class="dot" style="background:${w.accent}"></i>${tr({ es: 'MUNDO', en: 'WORLD' })} ${w.index}</span>
    <span class="p-nav"><a href="#/p/${prevP.id}" aria-label="←" data-cursor="PREV">←</a><a href="#/p/${next.id}" aria-label="→" data-cursor="NEXT">→</a></span>
  </nav>

  ${pm && pm.rig !== 'festival' ? `<section class="stage">${stageMarkup(pm)}</section>` : heroMarkup(p)}

  <header class="p-head">
    <h1 class="p-title" data-reveal data-fit>${p.title}</h1>
    <dl class="p-meta" data-reveal>
      <div><dt class="mono dim">${t('world')}</dt><dd>${w.index} · ${tr(w.shortName)}</dd></div>
      <div><dt class="mono dim">${t('year')}</dt><dd>${p.year}</dd></div>
      <div><dt class="mono dim">${t('role')}</dt><dd>${tr(p.role)}</dd></div>
      <div><dt class="mono dim">${t('tools')}</dt><dd class="tools-inline">${(p.tools || []).map((x) => `<span>${x}</span>`).join('')}</dd></div>
    </dl>
  </header>

  <section class="p-text">
    <p class="p-summary" data-reveal>${tr(p.summary)}</p>
    <div class="p-body" data-reveal>
      ${p.liveSet ? `<a class="pill pill--fill" href="${p.liveSet.url}" target="_blank" rel="noopener">▶ ${tr(p.liveSet.label)}</a>` : ''}
      ${pm ? `<a class="p-ext mono" href="#/w/stage" data-scramble><span class="scr">${tr({ es: 'Ver en el escenario 3D del mundo 01 →', en: 'See it on the world 01 3D stage →' })}</span></a>` : ''}
    </div>
  </section>

  ${gallery(media)}

  <a class="p-next" href="#/p/${next.id}" data-cursor="NEXT">
    <span class="mono dim">${t('next')} · ${pad(next.index)}</span>
    <span class="p-next-title" data-fit="125">${next.title}</span>
    <span class="p-next-media">${next.preview ? `<video muted loop playsinline preload="none" poster="${asset(next.poster)}" data-autoplay src="${asset(next.preview)}"></video>` : `<img src="${asset(next.poster)}" alt="" loading="lazy">`}</span>
  </a>

  <div class="lightbox" hidden><button class="lb-x mono">${t('close')} ✕</button><div class="lb-media"></div><button class="lb-prev" aria-label="←">←</button><button class="lb-next" aria-label="→">→</button><span class="lb-n mono"></span></div>`;
  app.appendChild(el);

  let stage = null;
  if (pm && pm.rig !== 'festival') stage = mountStage(el.querySelector('.stage'), pm, p.title);

  const heroV = el.querySelector('.p-hero video');
  const soundBtn = el.querySelector('.p-sound');
  if (heroV && soundBtn) soundBtn.addEventListener('click', () => {
    heroV.muted = !heroV.muted;
    soundBtn.querySelector('.scr').textContent = `${t('sound')}: ${heroV.muted ? 'off' : 'on'}`;
    if (!heroV.muted) heroV.play();
  });

  // ---- lightbox
  const lb = el.querySelector('.lightbox');
  const lbm = lb.querySelector('.lb-media');
  let cur = 0;
  const open = (k) => {
    cur = (k + media.length) % media.length;
    const m = media[cur];
    lbm.innerHTML = m.type === 'image' ? `<img src="${asset(m.src)}" alt="${tr(m.caption)}">`
      : m.type === 'youtube' ? `<iframe src="https://www.youtube-nocookie.com/embed/${m.youtubeId}?autoplay=1" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
      : `<video src="${asset(m.src)}" poster="${asset(m.poster || posterOf(m.src))}" controls autoplay playsinline loop></video>`;
    lb.querySelector('.lb-n').textContent = `${pad(cur + 1)} / ${pad(media.length)}${tr(m.caption) ? ' · ' + tr(m.caption) : ''}`;
    lb.hidden = false;
    lenis.stop();
  };
  const close = () => { lb.hidden = true; lbm.innerHTML = ''; lenis.start(); };
  el.querySelectorAll('.g-item').forEach((it) => it.addEventListener('click', () => open(+it.dataset.k)));
  lb.querySelector('.lb-x').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', () => open(cur - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => open(cur + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  const onKey = (e) => {
    if (!lb.hidden) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') open(cur + 1);
      if (e.key === 'ArrowLeft') open(cur - 1);
      return;
    }
    if (e.key === 'Escape') location.hash = `#/w/${p.world}`;
    if (e.key === 'ArrowRight' && !stage) location.hash = `#/p/${next.id}`;
    if (e.key === 'ArrowLeft' && !stage) location.hash = `#/p/${prevP.id}`;
  };
  addEventListener('keydown', onKey);

  const io1 = bindReveal(el);
  const io2 = bindAutoplay(el);
  scramble(el.querySelector('.p-title'), { duration: 700 });
  setTimeout(() => fitText(el), 720);

  return {
    name: 'project',
    destroy() {
      stage?.destroy();
      removeEventListener('keydown', onKey);
      io1.disconnect(); io2.disconnect();
      lenis.start();
      el.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
      if (pm?.bpm) beat.set(prevBpm);
    },
  };
}

function heroMarkup(p) {
  const src = p.preview || p.gallery?.find((g) => g.type === 'video')?.src;
  const hasAudio = /darwin|showreel|telemedellin|colombian|lee-eye|trailer/.test(p.id + (src || ''));
  return `
  <section class="p-hero">
    ${src ? `<video src="${asset(src)}" poster="${asset(p.poster)}" muted loop playsinline autoplay data-autoplay></video>` : `<img src="${asset(p.poster)}" alt="">`}
    ${src && hasAudio ? `<button class="p-sound mono" type="button" data-scramble data-cursor="AUDIO"><span class="scr">${t('sound')}: off</span></button>` : ''}
  </section>`;
}

function gallery(media) {
  if (!media.length) return '';
  return `
  <section class="gallery">
    <p class="mono dim g-k" data-reveal>( ${t('material')} · ${pad(media.length)} )</p>
    <div class="g-grid">
      ${media.map((m, k) => {
        const r = m.w && m.h ? m.w / m.h : 16 / 9;
        const shape = r > 2.4 ? 'pano' : r > 1.2 ? 'land' : r < 0.85 ? 'port' : 'sq';
        const ar = m.w && m.h ? `${m.w}/${m.h}` : '16/9';
        const inner = m.type === 'image' ? `<img src="${asset(m.src)}" alt="${tr(m.caption)}" loading="lazy">`
          : m.type === 'youtube' ? `<img src="${m.poster}" alt="" loading="lazy"><span class="g-play">▶ YouTube</span>`
          : `<video muted loop playsinline preload="none" poster="${asset(m.poster || posterOf(m.src))}" data-autoplay src="${asset(m.src)}"></video>`;
        return `<button class="g-item g-${shape}" data-k="${k}" style="aspect-ratio:${ar}" data-cursor="${m.type === 'image' ? '+' : 'PLAY'}" data-reveal>${inner}${tr(m.caption) ? `<span class="g-cap mono">${tr(m.caption)}</span>` : ''}</button>`;
      }).join('')}
    </div>
  </section>`;
}

export { isImg };
