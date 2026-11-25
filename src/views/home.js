import { projects, site, CATS, catLabel, asset, posterOf, pad } from '../data.js';
import { LedWall } from '../gl/ledwall.js';
import { mouse } from '../ui/cursor.js';
import { lenis } from '../ui/scroll.js';
import { bindReveal, bindAutoplay, splitWords, scramble } from '../ui/fx.js';

const rigTag = (p) => (p.pixelmap ? `<em class="tag-px" title="Tiene vista 3D del pixel map">PXMAP · ${p.pixelmap.rig === 'cross' ? 'CRUZ' : p.pixelmap.rig === 'square' ? '1:1' : 'RIG'}</em>` : '');
const isImg = (src) => /\.(jpe?g|png|webp)$/i.test(src || '');
const thumbOf = (src) => (isImg(src) ? src.replace(/\.(jpe?g|png|webp)$/i, '.thumb.jpg') : posterOf(src));

export function renderHome(app) {
  const counts = Object.fromEntries(CATS.map((c) => [c.id, c.id === 'all' ? projects.length : projects.filter((p) => p.category === c.id).length]));
  let state = { cat: 'all', view: 'list' };
  try { state.view = localStorage.getItem('s32-view') || 'list'; } catch { /* sin storage */ }

  const el = document.createElement('div');
  el.className = 'home';
  el.innerHTML = `
  <section class="hero" aria-label="Portada">
    <div class="hero-gl" data-cursor="CLIC"></div>
    <h1 class="sr-only">${site.alias} — ${site.name}</h1>
    <div class="hero-ui">
      <div class="hero-id" data-reveal>
        <p class="mono dim">AKA / ${site.handle}</p>
        <p class="hero-name">${site.name}</p>
        <p class="hero-roles">${site.roles.map((r) => `<span>${r}</span>`).join('')}</p>
      </div>
      <p class="hero-hint mono">Mueve el cursor sobre los LEDs · clic para disparar</p>
      <div class="hero-loc mono" data-reveal>
        <span>${site.city}</span><span class="dim">6.2442° N · 75.5812° W</span>
        <a href="#/trabajo" class="hero-scroll" data-magnetic="0.4" data-cursor="BAJAR">↓</a>
      </div>
    </div>
  </section>

  <div class="ticker" aria-hidden="true"><div class="ticker-track">${tickerItems()}${tickerItems()}</div></div>

  <section class="work" id="trabajo">
    <header class="work-head">
      <h2 class="big" data-reveal data-fit>Trabajo<sup>${pad(projects.length)}</sup></h2>
      <div class="work-ctrl">
        <div class="chips" role="tablist" aria-label="Filtrar por disciplina">
          ${CATS.map((c) => `<button class="chip ${c.id === 'all' ? 'on' : ''}" role="tab" data-cat="${c.id}" data-scramble><span class="scr">${c.label}</span><sup>${pad(counts[c.id])}</sup></button>`).join('')}
        </div>
        <div class="views" aria-label="Vista">
          <button data-view="list" class="${state.view === 'list' ? 'on' : ''}" aria-label="Lista">${iconList}</button>
          <button data-view="grid" class="${state.view === 'grid' ? 'on' : ''}" aria-label="Grilla">${iconGrid}</button>
        </div>
      </div>
    </header>

    <div class="list ${state.view === 'list' ? '' : 'is-hidden'}" role="list">
      <div class="row row--head mono" aria-hidden="true"><span>N°</span><span>Proyecto</span><span>Cliente</span><span>Disciplina</span><span>Año</span><span></span></div>
      ${projects.map((p, i) => `
      <a class="row" role="listitem" href="#/p/${p.slug}" data-cat="${p.category}" data-cover="${p.cover}" data-cursor="ABRIR" style="--i:${i}">
        <span class="r-n mono">${pad(p.index)}</span>
        <span class="r-t"><span class="r-title">${p.title}</span>${rigTag(p)}</span>
        <span class="r-c">${p.client}</span>
        <span class="r-k mono"><i class="dot dot--${p.category}"></i>${catLabel(p.category)}</span>
        <span class="r-y mono">${p.year}</span>
        <span class="r-a" aria-hidden="true">↗</span>
      </a>`).join('')}
    </div>

    <div class="grid ${state.view === 'grid' ? '' : 'is-hidden'}">
      ${projects.map((p, i) => `
      <a class="tile ${p.featured ? 'tile--big' : ''}" href="#/p/${p.slug}" data-cat="${p.category}" data-cursor="ABRIR" style="--i:${i}">
        ${isImg(p.cover)
          ? `<img src="${asset(thumbOf(p.cover))}" alt="" loading="lazy">`
          : `<video muted loop playsinline preload="none" poster="${asset(thumbOf(p.cover))}" data-src="${asset(p.cover)}"></video>`}
        <span class="t-meta"><span class="mono">${pad(p.index)}</span><span class="t-title" data-text="${p.title}">${p.title}</span><span class="mono t-k">${catLabel(p.category)}</span></span>
        ${p.pixelmap ? '<span class="t-px mono">PXMAP 3D</span>' : ''}
      </a>`).join('')}
    </div>
  </section>

  <section class="info" id="info">
    <p class="mono dim info-k" data-reveal>( Info )</p>
    <p class="statement" data-split>${site.bio}</p>
    <div class="info-cols">
      <div data-reveal><h3 class="mono dim">Hace</h3><ul>${site.services.map((s) => `<li>${s}</li>`).join('')}</ul></div>
      <div data-reveal><h3 class="mono dim">Con</h3><ul class="tools">${site.tools.map((s) => `<li data-scramble><span class="scr">${s}</span></li>`).join('')}</ul></div>
      <div data-reveal><h3 class="mono dim">Estado</h3><p class="avail ${site.available ? 'on' : ''}"><i></i>${site.available ? 'Disponible para shows, giras y proyectos' : 'Agenda llena por ahora'}</p>
        <p class="dim small">Trabaja desde ${site.city.split(',')[0]} para escenarios en cualquier lugar.</p></div>
    </div>
  </section>

  <section class="contact" id="contacto">
    <p class="mono dim" data-reveal>( Contacto )</p>
    <h2 class="contact-big" data-reveal data-fit="125">¿Hacemos<br>que la pantalla <em>suene</em>?</h2>
    <div class="contact-links">
      ${site.email ? `<a href="mailto:${site.email}" data-magnetic="0.25" data-scramble><span class="scr">${site.email}</span></a>` : ''}
      <a href="${site.instagram}" target="_blank" rel="noopener" data-magnetic="0.25" data-scramble data-cursor="IG ↗"><span class="scr">Instagram</span></a>
      <a href="${site.behance}" target="_blank" rel="noopener" data-magnetic="0.25" data-scramble data-cursor="BE ↗"><span class="scr">Behance</span></a>
    </div>
  </section>

  <footer class="foot mono">
    <span>C:\\WINDOWS\\SYSTEM32\\${site.name.split(' ')[0].toUpperCase()}</span>
    <span>© ${new Date().getFullYear()} ${site.name}</span>
    <button class="to-top" type="button" data-scramble><span class="scr">Volver arriba ↑</span></button>
  </footer>

  <div class="preview" aria-hidden="true"><div class="preview-in"><video muted loop playsinline></video><img alt=""><span class="preview-k mono"></span></div></div>
  `;
  app.appendChild(el);

  // ---- hero LED
  const wall = new LedWall(el.querySelector('.hero-gl'), { video: asset('media/site/hero-loop.mp4') });
  const hero = el.querySelector('.hero');
  const offScroll = lenis.on('scroll', ({ scroll }) => {
    const p = Math.min(1, Math.max(0, scroll / (hero.offsetHeight * 0.9)));
    wall.setScroll(p);
    hero.style.setProperty('--p', p);
  });

  // ---- ticker que acelera con la velocidad del scroll
  const track = el.querySelector('.ticker-track');
  let tx = 0, rafT;
  const tick = () => {
    const v = Math.abs(lenis.velocity || 0);
    tx -= 0.6 + v * 0.35;
    const half = track.scrollWidth / 2;
    if (-tx > half) tx += half;
    track.style.transform = `translate3d(${tx}px,0,0) skewX(${Math.max(-12, Math.min(12, -(lenis.velocity || 0) * 0.4))}deg)`;
    rafT = requestAnimationFrame(tick);
  };
  tick();

  // ---- filtros
  const chips = el.querySelectorAll('.chip');
  const rows = [...el.querySelectorAll('.row:not(.row--head)')];
  const tiles = [...el.querySelectorAll('.tile')];
  chips.forEach((c) => c.addEventListener('click', () => {
    state.cat = c.dataset.cat;
    chips.forEach((x) => x.classList.toggle('on', x === c));
    let k = 0;
    [...rows, ...tiles].forEach((r) => {
      const show = state.cat === 'all' || r.dataset.cat === state.cat;
      r.classList.toggle('is-out', !show);
      if (show) { r.style.setProperty('--i', k++ % rows.length); r.classList.remove('in-anim'); void r.offsetWidth; r.classList.add('in-anim'); }
    });
    lenis.resize();
  }));

  // ---- lista / grilla
  const list = el.querySelector('.list'), grid = el.querySelector('.grid');
  el.querySelectorAll('.views button').forEach((b) => b.addEventListener('click', () => {
    state.view = b.dataset.view;
    try { localStorage.setItem('s32-view', state.view); } catch { /* sin storage */ }
    el.querySelectorAll('.views button').forEach((x) => x.classList.toggle('on', x === b));
    list.classList.toggle('is-hidden', state.view !== 'list');
    grid.classList.toggle('is-hidden', state.view !== 'grid');
    lenis.resize();
  }));

  // ---- preview flotante en la lista
  const prev = el.querySelector('.preview');
  const pv = prev.querySelector('video'), pi = prev.querySelector('img'), pk = prev.querySelector('.preview-k');
  const fine = matchMedia('(hover: hover)').matches;
  let px = mouse.x, py = mouse.y, rot = 0, active = false, rafP;
  if (fine) {
    rows.forEach((r) => {
      r.addEventListener('pointerenter', () => {
        active = true;
        const src = r.dataset.cover;
        prev.classList.add('on');
        pk.textContent = r.querySelector('.r-n').textContent + ' · ' + r.querySelector('.r-k').textContent;
        if (isImg(src)) { pi.src = asset(thumbOf(src)); pi.style.display = 'block'; pv.style.display = 'none'; pv.pause(); }
        else {
          pi.style.display = 'none'; pv.style.display = 'block';
          if (pv.dataset.src !== src) { pv.dataset.src = src; pv.poster = asset(posterOf(src)); pv.src = asset(src); }
          pv.play().catch(() => {});
        }
        scramble(r.querySelector('.r-title'), { duration: 380 });
      });
      r.addEventListener('pointerleave', () => { active = false; prev.classList.remove('on'); pv.pause(); });
    });
    const follow = () => {
      px += (mouse.x - px) * 0.14; py += (mouse.y - py) * 0.14;
      rot += (Math.max(-14, Math.min(14, (mouse.x - px) * 0.08)) - rot) * 0.2;
      prev.style.transform = `translate3d(${px}px, ${py}px, 0) rotate(${rot}deg)`;
      rafP = requestAnimationFrame(follow);
    };
    follow();
  }

  // ---- grilla: los videos se reproducen al pasar el cursor (o en pantalla en móvil)
  const tileIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    const v = e.target.querySelector('video');
    if (!v) return;
    if (e.isIntersecting && !fine) playTile(v); else if (!e.isIntersecting) v.pause();
  }), { threshold: 0.35 });
  tiles.forEach((t) => {
    tileIO.observe(t);
    const v = t.querySelector('video');
    const title = t.querySelector('.t-title');
    t.addEventListener('pointerenter', () => { if (v) playTile(v); scramble(title, { duration: 420 }); });
    t.addEventListener('pointerleave', () => v?.pause());
  });
  function playTile(v) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); }

  // ---- texto de info palabra por palabra
  const st = el.querySelector('[data-split]');
  splitWords(st);
  const words = [...st.querySelectorAll('.w')];
  const offWords = lenis.on('scroll', () => {
    const r = st.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('lit', i < n));
  });

  el.querySelector('.to-top').addEventListener('click', () => { history.replaceState(null, '', '#/'); lenis.scrollTo(0, { duration: 1.6 }); });

  const io1 = bindReveal(el);
  const io2 = bindAutoplay(el);

  return {
    name: 'home',
    scrollTo(section, immediate) {
      const target = section && el.querySelector('#' + section);
      if (target) lenis.scrollTo(target, { offset: section === 'trabajo' ? -10 : -40, duration: immediate ? 0 : 1.4, immediate: !!immediate });
      else if (!section) lenis.scrollTo(0, { duration: 1.2 });
    },
    destroy() {
      wall.destroy();
      cancelAnimationFrame(rafT); cancelAnimationFrame(rafP);
      offScroll?.(); offWords?.();
      tileIO.disconnect(); io1.disconnect(); io2.disconnect();
      el.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
    },
  };
}

function tickerItems() {
  return projects.map((p) => `<a href="#/p/${p.slug}" tabindex="-1"><span class="mono">CH ${pad(p.index)}</span> ${p.title}</a><i>◼</i>`).join('');
}

const iconList = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" stroke-width="1.5"/></svg>';
const iconGrid = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M2 2h7v7H2zM11 2h7v7h-7zM2 11h7v7H2zM11 11h7v7h-7z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
