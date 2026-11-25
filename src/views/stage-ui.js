// Escenario 3D con su interfaz: HUD del rig, cámaras, autopilot/strobe, pixel map 2D en
// vivo enlazado con las pantallas 3D y deck de canales (clips o escenas).
import { Stage } from '../gl/stage.js';
import { t, tr, asset, posterOf, pad } from '../data.js';

export function stageMarkup(pm, { label } = {}) {
  const [cw, ch] = pm.canvas;
  const multi = !!pm.scenes?.length;
  const items = multi ? pm.scenes : pm.playlist;
  const thumb = (it) => asset(posterOf(multi ? it.sources.central || Object.values(it.sources)[0] : it));
  return `
  <div class="stage-gl" data-cursor="DRAG"></div>
  <div class="stage-hud">
    <p class="mono stage-tag"><i class="rec"></i>RIG: ${pm.label} // ${cw}×${ch}px // ${pm.slices.length} SLICE${pm.slices.length > 1 ? 'S' : ''}${label ? ' — ' + label : ''}</p>
    <div class="stage-ctrl mono">
      <span class="seg">
        <button data-cam="wide" class="on">${t('camWide')}</button><button data-cam="stage">${t('camStage')}</button><button data-cam="booth">${t('camBooth')}</button>
      </span>
      <button class="sc-auto on" type="button">${t('autopilot')}</button>
      <button class="sc-strobe" type="button" title="Space">${t('strobe')}</button>
      <button class="sc-map on" type="button">${t('pixelmap')}</button>
    </div>
  </div>
  <aside class="pxmap">
    <div class="pxmap-tabs mono"><button class="on" data-mode="live">${t('signal')}</button><button data-mode="tpl">${t('template')}</button></div>
    <div class="pxmap-box" style="aspect-ratio:${cw}/${ch}">
      <canvas class="pxmap-live" width="${Math.min(1024, cw)}" height="${Math.round((Math.min(1024, cw) * ch) / cw)}"></canvas>
      ${pm.image ? `<img class="pxmap-tpl" src="${asset(pm.image)}" alt="">` : `<canvas class="pxmap-tpl pxmap-gen" width="${cw}" height="${ch}"></canvas>`}
      <svg class="pxmap-svg" viewBox="0 0 ${cw} ${ch}" preserveAspectRatio="none">
        ${pm.slices.map((s, i) => `<g class="sl" data-i="${i}"><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"/></g>`).join('')}
      </svg>
      ${pm.slices.map((s, i) => `<span class="sl-label mono" data-i="${i}" style="left:${((s.x + s.w / 2) / cw) * 100}%;top:${((s.y + s.h / 2) / ch) * 100}%">${tr(s.name)}<br>${s.w}×${s.h}${s.physical ? ' · ' + s.physical : ''}</span>`).join('')}
    </div>
    <p class="mono dim pxmap-foot">${pm.hardware || 'Resolume Arena · Advanced Output'}${pm.bpm ? ' · ' + pm.bpm + ' BPM' : ''}</p>
  </aside>
  <div class="deck" role="list" aria-label="${multi ? t('scenes') : t('clips')}">
    ${items.map((it, k) => `<button class="ch" role="listitem" data-k="${k}" data-cursor="CH ${pad(k + 1)}"><img src="${thumb(it)}" alt="" loading="lazy"><span class="mono">${multi ? it.label : 'CH ' + pad(k + 1)}</span></button>`).join('')}
  </div>`;
}

export function mountStage(root, pm, title = '') {
  const cleanups = [];
  const chs = [...root.querySelectorAll('.ch')];
  const svgG = [...root.querySelectorAll('.pxmap-svg .sl')];
  const labels = [...root.querySelectorAll('.sl-label')];
  const setHover = (i) => {
    svgG.forEach((g, k) => g.classList.toggle('hl', k === i));
    labels.forEach((l, k) => l.classList.toggle('hl', k === i));
  };
  const stage = new Stage(root.querySelector('.stage-gl'), pm, {
    onClip: (k) => chs.forEach((c, j) => { c.classList.toggle('on', j === k); if (j === k) c.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }),
    onHoverSlice: setHover,
  });
  chs.forEach((c) => c.addEventListener('click', () => stage.load(+c.dataset.k)));
  if (import.meta.env.DEV) window.__stage = stage;

  root.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => {
    root.querySelectorAll('[data-cam]').forEach((x) => x.classList.toggle('on', x === b));
    stage.setView(b.dataset.cam);
  }));
  const auto = root.querySelector('.sc-auto');
  auto.addEventListener('click', () => { auto.classList.toggle('on'); stage.setAutopilot(auto.classList.contains('on')); });
  const strobe = root.querySelector('.sc-strobe');
  const sOn = () => { strobe.classList.add('on'); stage.setStrobe(true); };
  const sOff = () => { strobe.classList.remove('on'); stage.setStrobe(false); };
  strobe.addEventListener('pointerdown', sOn);
  strobe.addEventListener('pointerup', sOff);
  strobe.addEventListener('pointerleave', sOff);
  const inView = () => { const r = root.getBoundingClientRect(); return r.bottom > innerHeight * 0.3 && r.top < innerHeight * 0.5; };
  const kd = (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.code === 'Space' && inView()) { e.preventDefault(); sOn(); }
    if (e.key === ']' ) stage.next();
    if (e.key === '[') stage.prev();
  };
  const ku = (e) => { if (e.code === 'Space') sOff(); };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  cleanups.push(() => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); });

  const mapBtn = root.querySelector('.sc-map');
  const aside = root.querySelector('.pxmap');
  if (innerWidth < 760) { mapBtn.classList.remove('on'); aside.classList.add('off'); }
  mapBtn.addEventListener('click', () => { mapBtn.classList.toggle('on'); aside.classList.toggle('off'); });

  [...svgG, ...labels].forEach((g) => {
    g.addEventListener('pointerenter', () => { stage.highlight(+g.dataset.i); setHover(+g.dataset.i); });
    g.addEventListener('pointerleave', () => { stage.highlight(undefined); setHover(-1); });
  });

  const box = root.querySelector('.pxmap-box');
  root.querySelectorAll('.pxmap-tabs button').forEach((b) => b.addEventListener('click', () => {
    root.querySelectorAll('.pxmap-tabs button').forEach((x) => x.classList.toggle('on', x === b));
    box.dataset.mode = b.dataset.mode;
  }));
  box.dataset.mode = 'live';

  const gen = root.querySelector('.pxmap-gen');
  if (gen) drawTestCard(gen, pm, title);

  // señal en vivo: cada slice dibuja su recorte (o su propio video en rigs multi)
  const live = root.querySelector('.pxmap-live');
  const lctx = live.getContext('2d');
  const k = live.width / pm.canvas[0];
  let rafL;
  const drawLive = () => {
    rafL = requestAnimationFrame(drawLive);
    if (aside.classList.contains('off') || box.dataset.mode !== 'live') return;
    lctx.fillStyle = '#0b0b0d'; lctx.fillRect(0, 0, live.width, live.height);
    if (!stage.multi) {
      const v = stage.video;
      if (v.readyState < 2) return;
      lctx.globalAlpha = 0.14; lctx.drawImage(v, 0, 0, live.width, live.height); lctx.globalAlpha = 1;
      pm.slices.forEach((s) => { lctx.save(); lctx.beginPath(); lctx.rect(s.x * k, s.y * k, s.w * k, s.h * k); lctx.clip(); lctx.drawImage(v, 0, 0, live.width, live.height); lctx.restore(); });
    } else {
      pm.slices.forEach((s) => { const v = stage.videoFor(s); if (v.readyState >= 2) lctx.drawImage(v, s.x * k, s.y * k, s.w * k, s.h * k); });
    }
  };
  drawLive();
  cleanups.push(() => cancelAnimationFrame(rafL));

  return { stage, destroy() { stage.destroy(); cleanups.forEach((f) => f()); } };
}

function drawTestCard(c, pm, title) {
  const g = c.getContext('2d');
  const [w, h] = pm.canvas;
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const sq = Math.round(Math.max(w, h) / 16);
  pm.slices.forEach((s) => {
    g.save(); g.beginPath(); g.rect(s.x, s.y, s.w, s.h); g.clip();
    for (let y = s.y; y < s.y + s.h; y += sq) for (let x = s.x; x < s.x + s.w; x += sq) {
      g.fillStyle = (Math.floor(x / sq) + Math.floor(y / sq)) % 2 ? '#1a1a1f' : '#ff4a1c';
      g.fillRect(x, y, sq, sq);
    }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(2, w / 500);
    g.strokeRect(s.x, s.y, s.w, s.h);
  });
  g.fillStyle = '#fff'; g.font = `700 ${Math.round(h / 12)}px Archivo, sans-serif`; g.textAlign = 'right';
  g.fillText(`${w} x ${h}`, w - 24, h - 24);
}
