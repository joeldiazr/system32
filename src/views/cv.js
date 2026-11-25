// Hoja de vida (bilingüe) a partir de content/resume.json
import { resume, site, t, tr, asset } from '../data.js';
import { bindReveal } from '../ui/fx.js';
import { contactBlock, bindContact } from './home.js';

export function renderCV(app) {
  const r = resume;
  const el = document.createElement('div');
  el.className = 'cv';
  el.innerHTML = `
  <header class="cv-head">
    <p class="mono dim" data-reveal>( ${t('cv')} )</p>
    <h1 class="big" data-reveal data-fit>${site.name}</h1>
    <p class="cv-role" data-reveal>${tr(r.title)}</p>
    <div class="cv-cta" data-reveal>
      <a class="pill pill--fill" href="${asset('Sebastian_Hincapie_Resume.pdf')}" download data-magnetic="0.2">↓ ${t('downloadCv')}</a>
      <a class="pill" href="mailto:${site.email}">${site.email}</a>
      <a class="pill" href="${site.linkedin}" target="_blank" rel="noopener">LinkedIn ↗</a>
    </div>
  </header>
  <section class="cv-sum"><p class="p-summary" data-reveal>${tr(r.summary)}</p></section>
  <section class="cv-hl">${r.highlights.map((h) => `<div data-reveal><b>${h.value}</b><span class="mono dim">${tr(h.label)}</span></div>`).join('')}</section>
  <section class="cv-sec">
    <h2 class="mono dim">${t('experience')}</h2>
    ${r.experience.map((x) => `
    <article class="cv-job" data-reveal>
      <p class="mono cv-dates">${tr(x.dates)}${x.current ? ' <i class="cv-now" aria-hidden="true">●</i>' : ''}</p>
      <div>
        <h3>${tr(x.role)}</h3>
        <p class="dim">${x.company} · ${x.place}</p>
        <ul>${(x.bullets[document.documentElement.lang] || x.bullets.es).map((b) => `<li>${b}</li>`).join('')}</ul>
      </div>
    </article>`).join('')}
  </section>
  <section class="cv-grid">
    <div><h2 class="mono dim">${t('skills')}</h2>${r.skills.map((s) => `<div class="cv-skill" data-reveal><h3 class="mono">${tr(s.title)}</h3><p class="tools-inline">${s.items.map((i) => `<span>${i}</span>`).join('')}</p></div>`).join('')}</div>
    <div>
      <h2 class="mono dim">${t('education')}</h2>${r.education.map((e) => `<div class="cv-edu" data-reveal><h3>${tr(e.title)}</h3><p class="dim">${e.school} · ${e.place}</p><p class="mono dim">${tr(e.dates)}</p></div>`).join('')}
      <h2 class="mono dim" style="margin-top:40px">${t('languages')}</h2>${r.languages.map((l) => `<p class="cv-lang"><b>${tr(l.name)}</b> <span class="dim">— ${tr(l.level)}</span></p>`).join('')}
    </div>
  </section>
  ${contactBlock()}`;
  app.appendChild(el);
  bindContact(el);
  const io = bindReveal(el);
  return { name: 'cv', destroy() { io.disconnect(); } };
}
