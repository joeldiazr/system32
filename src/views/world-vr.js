// Mundo 03 — Realidad virtual & TouchDesigner.
// Red de nodos estilo TouchDesigner: cada proyecto es un nodo (arrastrable) con su video
// en vivo; los cables llevan la señal al nodo de salida, que se ve en un visor estéreo VR.
import { projectsOf, worldOf, t, tr, pad, asset } from '../data.js';
import { mouse } from '../ui/cursor.js';

const UTIL = [
  { id: 'audio', type: 'CHOP', name: 'audiodevicein1', x: 0, y: 8 },
  { id: 'noise', type: 'TOP', name: 'noise1', x: 0, y: 40 },
  { id: 'feedback', type: 'TOP', name: 'feedback1', x: 0, y: 72 },
];
const LINKS = [['audio', 0], ['audio', 2], ['noise', 1], ['noise', 3], ['feedback', 4], ['feedback', 1]];

export function renderVRWorld(app) {
  const w = worldOf('vr');
  const list = projectsOf('vr');
  let cur = 0;
  const pos = [[22, 0], [22, 37], [47, 9], [47, 50], [22, 73]];

  const el = document.createElement('div');
  el.className = 'world world--vr';
  el.innerHTML = `
  <header class="w-head">
    <p class="mono w-kicker"><span class="w-dot"></span>${tr({ es: 'MUNDO', en: 'WORLD' })} ${w.index} // ${w.coords}</p>
    <h1 class="w-title">${tr(w.name)}</h1>
    <p class="mono dim w-hint">${t('nodesHint')}</p>
  </header>
  <section class="net">
    <svg class="net-wires" aria-hidden="true"></svg>
    ${UTIL.map((u) => `<div class="node node--util" data-id="${u.id}" style="left:${u.x}%;top:${u.y}%"><span class="node-h mono"><b>${u.type}</b>${u.name}</span><span class="node-viz mono">${u.type === 'CHOP' ? '<i class="node-wave"></i>' : '<i class="node-noise"></i>'}</span><i class="port port--out"></i></div>`).join('')}
    ${list.map((p, i) => `<div class="node node--proj" data-i="${i}" data-id="p${i}" style="left:${pos[i % pos.length][0]}%;top:${pos[i % pos.length][1]}%">
      <span class="node-h mono"><b>${p.nodeType || 'TOP'}</b>${p.id.replace(/-/g, '_')}</span>
      <span class="node-viz"><video muted loop playsinline preload="none" poster="${asset(p.poster)}" data-src="${asset(p.preview)}"></video></span>
      <span class="node-t">${p.title}</span>
      <i class="port port--in"></i><i class="port port--out"></i>
    </div>`).join('')}
    <div class="node node--out" data-id="out" style="left:74%;top:36%"><span class="node-h mono"><b>COMP</b>out1 → HMD</span><span class="node-viz mono out-flag">● LIVE</span><i class="port port--in"></i></div>
  </section>
  <section class="hmd">
    <div class="hmd-lenses"><canvas class="hmd-c" width="900" height="460"></canvas></div>
    <p class="mono dim hmd-spec">${t('headset')} · 6DOF · 90Hz · IPD 64mm</p>
    <video class="hmd-src" muted loop playsinline crossorigin="anonymous"></video>
  </section>
  <article class="w-info">
    <p class="mono w-info-k"></p>
    <h2 class="w-info-t"></h2>
    <p class="w-info-s"></p>
    <div class="w-info-cta"></div>
  </article>`;
  app.appendChild(el);

  const net = el.querySelector('.net');
  const svg = el.querySelector('.net-wires');
  const nodes = [...el.querySelectorAll('.node')];
  const byId = (id) => el.querySelector(`.node[data-id="${id}"]`);

  // ---- cables
  const pairs = [
    ...LINKS.map(([a, b]) => [a, 'p' + b]),
    ...list.map((_, i) => ['p' + i, 'out']),
  ].filter(([a, b]) => byId(a) && byId(b));
  svg.innerHTML = pairs.map(([a, b]) => `<path data-a="${a}" data-b="${b}" class="wire ${b === 'out' ? 'wire--out' : ''}"/>`).join('');
  const portPos = (n, which) => {
    const nr = net.getBoundingClientRect();
    const p = n.querySelector(which === 'out' ? '.port--out' : '.port--in').getBoundingClientRect();
    return [p.left + p.width / 2 - nr.left, p.top + p.height / 2 - nr.top];
  };
  const drawWires = () => {
    const r = net.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    svg.querySelectorAll('path').forEach((path) => {
      const [x1, y1] = portPos(byId(path.dataset.a), 'out');
      const [x2, y2] = portPos(byId(path.dataset.b), 'in');
      const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
      path.setAttribute('d', `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
      path.classList.toggle('on', path.dataset.a === 'p' + cur || (path.dataset.b === 'p' + cur));
    });
  };

  // ---- arrastrar nodos
  nodes.forEach((n) => {
    let sx, sy, ox, oy, moved;
    n.addEventListener('pointerdown', (e) => {
      const r = net.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = n.offsetLeft; oy = n.offsetTop; moved = false;
      n.setPointerCapture(e.pointerId); n.classList.add('drag');
      const move = (ev) => {
        const nx = Math.min(r.width - n.offsetWidth, Math.max(0, ox + ev.clientX - sx));
        const ny = Math.min(r.height - n.offsetHeight, Math.max(0, oy + ev.clientY - sy));
        if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 4) moved = true;
        n.style.left = (nx / r.width) * 100 + '%'; n.style.top = (ny / r.height) * 100 + '%';
        drawWires();
      };
      const up = () => {
        n.classList.remove('drag');
        n.removeEventListener('pointermove', move); n.removeEventListener('pointerup', up);
        if (!moved && n.dataset.i) select(+n.dataset.i);
      };
      n.addEventListener('pointermove', move); n.addEventListener('pointerup', up);
    });
  });

  // ---- videos dentro de los nodos: se cargan al entrar en pantalla
  const nodeVids = [...el.querySelectorAll('.node-viz video')];
  nodeVids.forEach((v) => { v.src = v.dataset.src; v.play().catch(() => {}); });

  // ---- visor estéreo: el mismo video en dos lentes con paralaje según el cursor
  const src = el.querySelector('.hmd-src');
  const cv = el.querySelector('.hmd-c');
  const ctx = cv.getContext('2d');
  let raf, hx = 0, hy = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    hx += (mouse.nx - hx) * 0.08; hy += (mouse.ny - hy) * 0.08;
    const W = cv.width, H = cv.height, r = H * 0.47;
    ctx.fillStyle = '#020303'; ctx.fillRect(0, 0, W, H);
    [W * 0.27, W * 0.73].forEach((cx, eye) => {
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx, H / 2, r * 0.98, r, 0, 0, Math.PI * 2); ctx.clip();
      if (src.readyState >= 2) {
        const vw = src.videoWidth, vh = src.videoHeight;
        const s = (r * 2.5) / Math.min(vw, vh) * Math.max(1, vh / vw * 1.0);
        const dw = vw * s, dh = vh * s;
        const par = (eye ? -1 : 1) * 6;
        ctx.drawImage(src, cx - dw / 2 - hx * 40 + par, H / 2 - dh / 2 + hy * 30, dw, dh);
      }
      const g = ctx.createRadialGradient(cx, H / 2, r * 0.55, cx, H / 2, r);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.92)');
      ctx.fillStyle = g; ctx.fillRect(cx - r, 0, r * 2, H);
      // retícula del HUD
      ctx.strokeStyle = 'rgba(77,245,193,.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx + hx * 6, H / 2 - hy * 6, 10, 0, 7); ctx.moveTo(cx - 26, H / 2); ctx.lineTo(cx - 14, H / 2); ctx.moveTo(cx + 14, H / 2); ctx.lineTo(cx + 26, H / 2); ctx.stroke();
      ctx.restore();
    });
    ctx.fillStyle = 'rgba(77,245,193,.8)'; ctx.font = '500 13px "IBM Plex Mono", monospace';
    ctx.fillText(`YAW ${(hx * 45).toFixed(1)}°  PITCH ${(hy * 30).toFixed(1)}°`, 18, H - 16);
  };
  loop();

  function select(i) {
    cur = i;
    const p = list[i];
    nodes.forEach((n) => n.classList.toggle('on', n.dataset.i === String(i)));
    src.src = asset(p.preview); src.play().catch(() => {});
    drawWires();
    el.querySelector('.w-info-k').textContent = `VR NODE ${pad(i + 1)} / ${pad(list.length)} · ${p.year} · ${tr(p.role)}`;
    el.querySelector('.w-info-t').textContent = p.title;
    el.querySelector('.w-info-s').textContent = tr(p.summary);
    el.querySelector('.w-info-cta').innerHTML = `<a class="pill pill--fill" href="#/p/${p.id}">${t('openGallery')} →</a>`;
  }

  const ro = new ResizeObserver(drawWires);
  ro.observe(net);
  select(0);
  requestAnimationFrame(drawWires);

  return {
    name: 'world',
    destroy() {
      cancelAnimationFrame(raf); ro.disconnect();
      [src, ...nodeVids].forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
    },
  };
}
