import { projects, catLabel, asset, posterOf, pad } from '../data.js';
import { Stage } from '../gl/stage.js';
import { beat } from '../ui/beat.js';
import { lenis } from '../ui/scroll.js';
import { bindReveal, bindAutoplay, scramble, fitText } from '../ui/fx.js';

const isImg = (src) => /\.(jpe?g|png|webp)$/i.test(src || '');
const thumbOf = (src) => (isImg(src) ? src.replace(/\.(jpe?g|png|webp)$/i, '.thumb.jpg') : posterOf(src));

export function renderProject(app, p) {
  const i = projects.indexOf(p);
  const next = projects[(i + 1) % projects.length];
  const prevP = projects[(i - 1 + projects.length) % projects.length];
  const pm = p.pixelmap;
  const prevBpm = beat.bpm;
  if (pm?.bpm) beat.set(pm.bpm);

  const el = document.createElement('article');
  el.className = 'project';
  el.innerHTML = `
  <nav class="p-bar mono">
    <a href="#/trabajo" class="p-back" data-scramble data-cursor="ESC"><span class="scr">← Índice</span></a>
    <span class="p-count">${pad(p.index)} / ${pad(projects.length)} · <i class="dot dot--${p.category}"></i>${catLabel(p.category)}</span>
    <span class="p-nav"><a href="#/p/${prevP.slug}" aria-label="Anterior" data-cursor="ANTERIOR">←</a><a href="#/p/${next.slug}" aria-label="Siguiente" data-cursor="SIGUIENTE">→</a></span>
  </nav>

  ${pm ? stageMarkup(p) : heroMarkup(p)}

  <header class="p-head">
    <h1 class="p-title" data-reveal data-fit>${p.title}</h1>
    <dl class="p-meta" data-reveal>
      <div><dt class="mono dim">Cliente</dt><dd>${p.client}</dd></div>
      ${p.event ? `<div><dt class="mono dim">Evento</dt><dd>${p.event}</dd></div>` : ''}
      <div><dt class="mono dim">Año</dt><dd>${p.year}</dd></div>
      <div><dt class="mono dim">Rol</dt><dd>${(p.role || []).join(', ')}</dd></div>
      <div><dt class="mono dim">Herramientas</dt><dd class="tools-inline">${(p.tools || []).map((t) => `<span>${t}</span>`).join('')}</dd></div>
    </dl>
  </header>

  <section class="p-text">
    <p class="p-summary" data-reveal>${p.summary}</p>
    <div class="p-body" data-reveal>
      <p>${p.body}</p>
      ${p.credits ? `<p class="dim small">${p.credits}</p>` : ''}
      ${p.behance ? `<a class="p-ext mono" href="${p.behance}" target="_blank" rel="noopener" data-scramble><span class="scr">Ver en Behance ↗</span></a>` : ''}
    </div>
  </section>

  ${gallery(p)}

  <a class="p-next" href="#/p/${next.slug}" data-cursor="SIGUIENTE">
    <span class="mono dim">Siguiente · ${pad(next.index)}</span>
    <span class="p-next-title" data-fit="125">${next.title}</span>
    <span class="p-next-media">${isImg(next.cover) ? `<img src="${asset(thumbOf(next.cover))}" alt="" loading="lazy">` : `<video muted loop playsinline preload="none" poster="${asset(thumbOf(next.cover))}" data-autoplay src="${asset(next.cover)}"></video>`}</span>
  </a>

  <div class="lightbox" hidden><button class="lb-x mono" aria-label="Cerrar">Cerrar ✕</button><div class="lb-media"></div><button class="lb-prev" aria-label="Anterior">←</button><button class="lb-next" aria-label="Siguiente">→</button><span class="lb-n mono"></span></div>
  `;
  app.appendChild(el);

  let stage = null;
  const cleanups = [];
  if (pm) stage = mountStage(el, p, cleanups);

  // héroe sin pixel map: el video con sonido opcional
  const heroV = el.querySelector('.p-hero video');
  const soundBtn = el.querySelector('.p-sound');
  if (heroV && soundBtn) soundBtn.addEventListener('click', () => {
    heroV.muted = !heroV.muted;
    soundBtn.querySelector('.scr').textContent = heroV.muted ? 'Sonido: off' : 'Sonido: on';
    if (!heroV.muted) heroV.play();
  });

  // ---- lightbox
  const items = [...el.querySelectorAll('.g-item')];
  const lb = el.querySelector('.lightbox');
  const lbm = lb.querySelector('.lb-media');
  let cur = 0;
  const media = p.media || [];
  const open = (k) => {
    cur = (k + media.length) % media.length;
    const m = media[cur];
    lbm.innerHTML = m.type === 'image'
      ? `<img src="${asset(m.src)}" alt="${m.caption || p.title}">`
      : `<video src="${asset(m.src)}" poster="${asset(m.poster || posterOf(m.src))}" controls autoplay playsinline loop></video>`;
    lb.querySelector('.lb-n').textContent = `${pad(cur + 1)} / ${pad(media.length)}${m.caption ? ' · ' + m.caption : ''}`;
    lb.hidden = false;
    lenis.stop();
  };
  const close = () => { lb.hidden = true; lbm.innerHTML = ''; lenis.start(); };
  items.forEach((it) => it.addEventListener('click', () => open(+it.dataset.k)));
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
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'Escape') location.hash = '#/trabajo';
    if (e.key === 'ArrowRight' && !stage) location.hash = `#/p/${next.slug}`;
    if (e.key === 'ArrowLeft' && !stage) location.hash = `#/p/${prevP.slug}`;
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
      cleanups.forEach((f) => f());
      removeEventListener('keydown', onKey);
      io1.disconnect(); io2.disconnect();
      lenis.start();
      el.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
      if (pm?.bpm) beat.set(prevBpm);
    },
  };
}

// ---------------------------------------------------------------------------

function heroMarkup(p) {
  const hasAudio = /lee-eye|showreel|vr-telemedellin/.test(p.slug);
  return `
  <section class="p-hero">
    ${isImg(p.cover)
      ? `<img src="${asset(p.cover)}" alt="">`
      : `<video src="${asset(p.cover)}" poster="${asset(posterOf(p.cover))}" muted loop playsinline autoplay data-autoplay></video>`}
    ${hasAudio && !isImg(p.cover) ? '<button class="p-sound mono" type="button" data-scramble data-cursor="AUDIO"><span class="scr">Sonido: off</span></button>' : ''}
  </section>`;
}

function stageMarkup(p) {
  const pm = p.pixelmap;
  const [cw, ch] = pm.canvas;
  return `
  <section class="stage" aria-label="Vista 3D del pixel map">
    <div class="stage-gl" data-cursor="ARRASTRA"></div>
    <div class="stage-hud">
      <p class="mono stage-tag"><i class="rec"></i>RIG: ${pm.label || pm.rig.toUpperCase()} // ${cw}×${ch}px // ${pm.slices.length} slice${pm.slices.length > 1 ? 's' : ''} — arrastra para orbitar</p>
      <div class="stage-ctrl mono">
        <button class="sc-auto on" type="button" title="Avanza solo al terminar cada clip, como el autopilot de Resolume">Autopilot</button>
        <button class="sc-strobe" type="button" title="Mantén presionado (o la barra espaciadora)">Strobe</button>
        <button class="sc-map on" type="button" title="Mostrar el pixel map 2D">Pixel map</button>
      </div>
    </div>
    <aside class="pxmap" aria-label="Pixel map 2D">
      <div class="pxmap-tabs mono"><button class="on" data-mode="live">Señal</button><button data-mode="tpl">Plantilla</button></div>
      <div class="pxmap-box" style="aspect-ratio:${cw}/${ch}">
        <canvas class="pxmap-live" width="${Math.round(cw / 2)}" height="${Math.round(ch / 2)}"></canvas>
        ${pm.image ? `<img class="pxmap-tpl" src="${asset(pm.image)}" alt="Plantilla de pixel map">` : `<canvas class="pxmap-tpl pxmap-gen" width="${cw}" height="${ch}"></canvas>`}
        <svg class="pxmap-svg" viewBox="0 0 ${cw} ${ch}" preserveAspectRatio="none">
          ${pm.slices.map((s, i) => `<g class="sl" data-i="${i}"><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"/></g>`).join('')}
        </svg>
        ${pm.slices.map((s, i) => `<span class="sl-label mono" data-i="${i}" style="left:${((s.x + s.w / 2) / cw) * 100}%;top:${((s.y + s.h / 2) / ch) * 100}%">${s.name}<br>${s.x},${s.y} // ${s.w}×${s.h}</span>`).join('')}
      </div>
      <p class="mono dim pxmap-foot">Resolume · Advanced Output · ${pm.bpm ? pm.bpm + ' BPM' : ''}</p>
    </aside>
    <div class="deck" role="list" aria-label="Clips">
      ${(pm.playlist || []).map((src, k) => `<button class="ch" role="listitem" data-k="${k}" data-cursor="CH ${pad(k + 1)}"><img src="${asset(posterOf(src))}" alt="" loading="lazy"><span class="mono">CH ${pad(k + 1)}</span></button>`).join('')}
    </div>
  </section>`;
}

function mountStage(el, p, cleanups) {
  const pm = p.pixelmap;
  const chs = [...el.querySelectorAll('.ch')];
  const svgG = [...el.querySelectorAll('.pxmap-svg .sl')];
  const labels = [...el.querySelectorAll('.sl-label')];
  const setHover = (i) => {
    svgG.forEach((g, k) => g.classList.toggle('hl', k === i));
    labels.forEach((l, k) => l.classList.toggle('hl', k === i));
  };
  const stage = new Stage(el.querySelector('.stage-gl'), pm, {
    onClip: (k) => chs.forEach((c, j) => c.classList.toggle('on', j === k)),
    onHoverSlice: setHover,
  });
  chs.forEach((c) => c.addEventListener('click', () => stage.load(+c.dataset.k)));

  const auto = el.querySelector('.sc-auto');
  auto.addEventListener('click', () => { auto.classList.toggle('on'); stage.setAutopilot(auto.classList.contains('on')); });
  const strobe = el.querySelector('.sc-strobe');
  const sOn = () => { strobe.classList.add('on'); stage.setStrobe(true); };
  const sOff = () => { strobe.classList.remove('on'); stage.setStrobe(false); };
  strobe.addEventListener('pointerdown', sOn);
  strobe.addEventListener('pointerup', sOff);
  strobe.addEventListener('pointerleave', sOff);
  const kd = (e) => {
    if (e.code === 'Space' && el.querySelector('.stage').getBoundingClientRect().bottom > 0 && el.querySelector('.stage').getBoundingClientRect().top < innerHeight * 0.5) { e.preventDefault(); sOn(); }
    if (e.key === 'ArrowRight') stage.next();
    if (e.key === 'ArrowLeft') stage.prev();
  };
  const ku = (e) => { if (e.code === 'Space') sOff(); };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  cleanups.push(() => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); });

  const mapBtn = el.querySelector('.sc-map');
  const aside = el.querySelector('.pxmap');
  if (innerWidth < 760) { mapBtn.classList.remove('on'); aside.classList.add('off'); }
  mapBtn.addEventListener('click', () => { mapBtn.classList.toggle('on'); aside.classList.toggle('off'); });

  // hover en el mapa 2D → resalta la pantalla en 3D
  [...svgG, ...labels].forEach((g) => {
    g.addEventListener('pointerenter', () => { stage.highlight(+g.dataset.i); setHover(+g.dataset.i); });
    g.addEventListener('pointerleave', () => { stage.highlight(undefined); setHover(-1); });
  });

  // pestañas Señal / Plantilla
  const box = el.querySelector('.pxmap-box');
  el.querySelectorAll('.pxmap-tabs button').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('.pxmap-tabs button').forEach((x) => x.classList.toggle('on', x === b));
    box.dataset.mode = b.dataset.mode;
  }));
  box.dataset.mode = 'live';

  // plantilla generada (cuando no hay imagen): damero tipo test card de Resolume
  const gen = el.querySelector('.pxmap-gen');
  if (gen) drawTestCard(gen, pm, p.title);

  // señal en vivo: el mismo video del escenario, recortado por los slices
  const live = el.querySelector('.pxmap-live');
  const lctx = live.getContext('2d');
  let rafL;
  const drawLive = () => {
    rafL = requestAnimationFrame(drawLive);
    if (aside.classList.contains('off') || box.dataset.mode !== 'live') return;
    const v = stage.video;
    if (v.readyState < 2) return;
    lctx.fillStyle = '#0b0b0d'; lctx.fillRect(0, 0, live.width, live.height);
    const k = live.width / pm.canvas[0];
    lctx.globalAlpha = 0.16; lctx.drawImage(v, 0, 0, live.width, live.height); lctx.globalAlpha = 1;
    pm.slices.forEach((s) => {
      lctx.save(); lctx.beginPath(); lctx.rect(s.x * k, s.y * k, s.w * k, s.h * k); lctx.clip();
      lctx.drawImage(v, 0, 0, live.width, live.height); lctx.restore();
    });
  };
  drawLive();
  cleanups.push(() => cancelAnimationFrame(rafL));
  return stage;
}

function drawTestCard(c, pm, title) {
  const g = c.getContext('2d');
  const [w, h] = pm.canvas;
  const sq = 64;
  for (let y = 0; y < h; y += sq) for (let x = 0; x < w; x += sq) {
    g.fillStyle = ((x + y) / sq) % 2 ? '#1a1a1f' : '#2a2a31';
    g.fillRect(x, y, sq, sq);
  }
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
  g.beginPath(); g.arc(w / 2, h / 2, Math.min(w, h) / 2 - 4, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#FF4A1C'; g.font = '700 54px Archivo, sans-serif'; g.textAlign = 'right';
  g.fillText(`${w} x ${h}`, w - 24, 70);
  g.fillStyle = '#fff'; g.font = '700 40px Archivo, sans-serif';
  g.fillText(title.toUpperCase(), w - 24, 120);
}

function gallery(p) {
  const media = p.media || [];
  if (!media.length) return '';
  return `
  <section class="gallery">
    <p class="mono dim g-k" data-reveal>( Material · ${pad(media.length)} )</p>
    <div class="g-grid">
      ${media.map((m, k) => {
        const r = m.w && m.h ? m.w / m.h : 16 / 9;
        const shape = r > 1.2 ? 'land' : r < 0.85 ? 'port' : 'sq';
        return `<button class="g-item g-${shape}" data-k="${k}" style="aspect-ratio:${m.w || 16}/${m.h || 9}" data-cursor="${m.type === 'image' ? 'AMPLIAR' : 'PLAY'}" data-reveal>
          ${m.type === 'image'
            ? `<img src="${asset(m.poster || m.src)}" alt="${m.caption || ''}" loading="lazy">`
            : `<video muted loop playsinline preload="none" poster="${asset(m.poster || posterOf(m.src))}" data-autoplay src="${asset(m.src)}"></video>`}
          ${m.caption ? `<span class="g-cap mono">${m.caption}</span>` : ''}
        </button>`;
      }).join('')}
    </div>
  </section>`;
}
