// Portada (puerta de entrada, sin scroll) y hub de los 4 mundos (página aparte).
import { site, worlds, projectsOf, projects, t, tr, asset, pad, isImg } from '../data.js';
import { LedWall } from '../gl/ledwall.js';
import { lenis } from '../ui/scroll.js';
import { bindReveal, splitWords, scramble } from '../ui/fx.js';

export function renderGate(app) {
  const el = document.createElement('div');
  el.className = 'gate';
  const roles = site.roleLine.split('·').map((s) => s.trim());
  el.innerHTML = `
  <section class="hero" aria-label="SYSTEM32">
    <div class="hero-gl" data-cursor="CLIC"></div>
    <h1 class="sr-only">${site.alias} — ${site.name}</h1>
    <div class="hero-ui">
      <div class="hero-id" data-reveal>
        <p class="mono dim">AKA / ${site.handle}</p>
        <p class="hero-name">${site.name}</p>
        <p class="hero-roles">${roles.map((r) => `<span>${r}</span>`).join('')}</p>
      </div>
      <div class="hero-center">
        <a href="#/hub" class="hero-enter" data-magnetic="0.3" data-cursor="ENTER">${t('enterWorlds')} <kbd class="mono">↵</kbd></a>
        <p class="hero-chips">${worlds.map((w) => `<a href="#/w/${w.id}" style="--wc:${w.accent}" class="mono"><i></i>${w.index} ${tr(w.shortName)}</a>`).join('')}</p>
      </div>
      <div class="hero-loc mono" data-reveal>
        <span>${site.city}</span><span class="dim">6.2442° N · 75.5812° W</span>
        <span class="dim hero-hint">${t('hint')}</span>
      </div>
    </div>
  </section>`;
  app.appendChild(el);

  const wall = new LedWall(el.querySelector('.hero-gl'), { video: asset('media/site/hero-loop.mp4') });
  // Enter → directo a los mundos
  const onKey = (e) => {
    if (e.key !== 'Enter' || e.target?.closest?.('a, button, input, textarea')) return;
    location.hash = '#/hub';
  };
  addEventListener('keydown', onKey);
  const io = bindReveal(el);

  return {
    name: 'gate',
    destroy() { wall.destroy(); removeEventListener('keydown', onKey); io.disconnect(); },
  };
}

export function renderHub(app) {
  const el = document.createElement('div');
  el.className = 'home';
  el.innerHTML = `
  <section class="hub" id="hub">
    <header class="hub-head">
      <p class="mono dim" data-reveal>( ${worlds.length} ${getWorldsWord()} · ${projects.length} ${t('projects')} )</p>
      <p class="hub-lead" data-reveal>${tr(site.heroSubtitle)}</p>
    </header>
    <div class="worlds">
      ${worlds.map((w, i) => {
        const list = projectsOf(w.id);
        const media = w.preview
          ? `<video muted loop playsinline preload="none" poster="${asset(w.poster)}" data-src="${asset(w.preview)}"></video>`
          : `<img src="${asset(w.poster)}" alt="" loading="lazy">`;
        return `
        <a class="wcard" href="#/w/${w.id}" style="--wc:${w.accent}; --i:${i}" data-cursor="${t('enterWorld').toUpperCase()}">
          <div class="wcard-media">${media}</div>
          <div class="wcard-top mono"><span class="wcard-n">${tr({ es: 'MUNDO', en: 'WORLD' })} ${w.index}</span><span class="wcard-count">${pad(list.length)} ${t('projects')}</span></div>
          <div class="wcard-body">
            <h2 class="wcard-title" data-fit="125">${tr(w.name)}</h2>
            <p class="wcard-tag">${tr(w.tagline)}</p>
            <ul class="wcard-list mono">${list.slice(0, 5).map((p) => `<li>${p.title}</li>`).join('')}${list.length > 5 ? `<li class="dim">+${list.length - 5}</li>` : ''}</ul>
          </div>
          <div class="wcard-foot mono"><span class="dim"><kbd>${i + 1}</kbd> ${w.coords}</span><span class="wcard-go">${t('enterWorld')} →</span></div>
        </a>`;
      }).join('')}
    </div>
  </section>

  <div class="ticker" aria-hidden="true"><div class="ticker-track">${tickerItems()}${tickerItems()}</div></div>

  <section class="info" id="info">
    <p class="mono dim info-k" data-reveal>( ${tr(site.role)} )</p>
    <p class="statement" data-split>${tr(site.bio)}</p>
    <div class="info-cta" data-reveal>
      <a href="#/cv" class="pill" data-magnetic="0.25" data-scramble><span class="scr">${t('cv')} →</span></a>
      <a href="#/contenidos" class="pill" data-magnetic="0.25" data-scramble><span class="scr">${t('index')} (${projects.length}) →</span></a>
      <p class="avail ${site.available ? 'on' : ''}"><i></i>${t('available')}</p>
    </div>
  </section>

  ${contactBlock()}
  `;
  app.appendChild(el);

  // ---- ticker: avanza solo y acelera con el scroll; quieto fuera de vista
  const track = el.querySelector('.ticker-track');
  let tx = 0, rafT, tickerOn = false;
  const tick = () => {
    rafT = requestAnimationFrame(tick);
    if (!tickerOn) return;
    const v = lenis.velocity || 0;
    tx -= 0.6 + Math.abs(v) * 0.35;
    const half = track.scrollWidth / 2;
    if (-tx > half) tx += half;
    track.style.transform = `translate3d(${tx}px,0,0) skewX(${Math.max(-12, Math.min(12, -v * 0.4))}deg)`;
  };
  tick();
  const ioT = new IntersectionObserver(([e]) => (tickerOn = e.isIntersecting));
  ioT.observe(el.querySelector('.ticker'));

  // ---- tarjetas de mundo: video al pasar el cursor + inclinación 3D
  const fine = matchMedia('(hover: hover)').matches;
  const cards = [...el.querySelectorAll('.wcard')];
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target.querySelector('video');
    if (!v) return;
    if (e.isIntersecting && !fine) play(v); else if (!e.isIntersecting) v.pause();
  }), { threshold: 0.4 });
  cards.forEach((c) => {
    io.observe(c);
    const v = c.querySelector('video');
    c.addEventListener('pointerenter', () => { if (v) play(v); scramble(c.querySelector('.wcard-n'), { duration: 400 }); });
    c.addEventListener('pointerleave', () => { v?.pause(); c.style.transform = ''; });
    if (fine) c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      c.style.transform = `perspective(1100px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
      c.style.setProperty('--mx', `${(x + 0.5) * 100}%`); c.style.setProperty('--my', `${(y + 0.5) * 100}%`);
    });
  });
  function play(v) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); }

  // teclas 1–4 → entrar a cada mundo
  const onKey = (e) => {
    if (e.target?.closest?.('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    const w = worlds[+e.key - 1];
    if (w) location.hash = `#/w/${w.id}`;
  };
  addEventListener('keydown', onKey);

  // ---- bio palabra por palabra
  const st = el.querySelector('[data-split]');
  splitWords(st);
  const words = [...st.querySelectorAll('.w')];
  const offWords = lenis.on('scroll', () => {
    const r = st.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('lit', i < n));
  });

  bindContact(el);
  const io1 = bindReveal(el);

  return {
    name: 'hub',
    scrollTo(section, immediate) {
      const target = section && section !== 'hub' && el.querySelector('#' + section);
      if (target) lenis.scrollTo(target, { offset: -70, duration: immediate ? 0 : 1.4, immediate: !!immediate });
      else lenis.scrollTo(0, { duration: immediate ? 0 : 1.2, immediate: !!immediate });
    },
    destroy() {
      removeEventListener('keydown', onKey);
      cancelAnimationFrame(rafT);
      offWords?.();
      io.disconnect(); io1.disconnect(); ioT.disconnect();
      el.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
    },
  };
}

const getWorldsWord = () => tr({ es: 'mundos', en: 'worlds' });

function tickerItems() {
  return projects.map((p) => `<a href="#/p/${p.id}" tabindex="-1"><span class="mono">CH ${pad(p.index)}</span> ${p.title}</a><i>◼</i>`).join('');
}

export function contactBlock() {
  return `
  <section class="contact" id="contacto">
    <p class="mono dim" data-reveal>( ${t('contact')} )</p>
    <h2 class="contact-big" data-reveal data-fit="125">${t('contactBig')}</h2>
    <div class="contact-links">
      <a href="mailto:${site.email}" data-magnetic="0.25" data-scramble data-cursor="MAIL"><span class="scr">${site.email}</span></a>
      <a href="${site.linkedin}" target="_blank" rel="noopener" data-magnetic="0.25" data-scramble data-cursor="IN ↗"><span class="scr">LinkedIn</span></a>
      <a href="${site.instagram}" target="_blank" rel="noopener" data-magnetic="0.25" data-scramble data-cursor="IG ↗"><span class="scr">Instagram</span></a>
      <a href="${site.behance}" target="_blank" rel="noopener" data-magnetic="0.25" data-scramble data-cursor="BE ↗"><span class="scr">Behance</span></a>
    </div>
  </section>
  <footer class="foot mono">
    <span>C:\\WINDOWS\\SYSTEM32\\SEBASTIAN</span>
    <span>© ${new Date().getFullYear()} ${site.name}</span>
    <button class="to-top" type="button" data-scramble><span class="scr">${t('backTop')}</span></button>
  </footer>`;
}

export function bindContact(el) {
  el.querySelector('.to-top')?.addEventListener('click', () => lenis.scrollTo(0, { duration: 1.6 }));
}

export { isImg };
