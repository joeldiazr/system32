import site from '../content/site.json';
import worlds from '../content/worlds.json';
import resume from '../content/resume.json';
import games from '../content/games.json';

const mods = import.meta.glob('../content/projects/*.json', { eager: true, import: 'default' });

export const projects = Object.values(mods)
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  .map((p, i) => ({ ...p, index: i + 1 }));

export { site, worlds, resume, games };

export const worldOf = (id) => worlds.find((w) => w.id === id);
export const projectsOf = (worldId) => projects.filter((p) => p.world === worldId);

// ---------------- idioma
let lang = 'es';
try { lang = localStorage.getItem('s32-lang') || (navigator.language || 'es').slice(0, 2); } catch { /* sin storage */ }
if (!['es', 'en'].includes(lang)) lang = 'en';
document.documentElement.lang = lang;
const langListeners = new Set();
export const getLang = () => lang;
export function setLang(l) {
  if (l === lang) return;
  lang = l;
  document.documentElement.lang = l;
  try { localStorage.setItem('s32-lang', l); } catch { /* sin storage */ }
  langListeners.forEach((f) => f(l));
}
export const onLang = (f) => (langListeners.add(f), () => langListeners.delete(f));

// texto bilingüe: acepta "texto" o { es, en }
export const tr = (v) => (v == null ? '' : typeof v === 'string' ? v : v[lang] ?? v.es ?? v.en ?? '');

const UI = {
  hub: { es: 'Hub', en: 'Hub' },
  index: { es: 'Índice', en: 'Index' },
  cv: { es: 'Hoja de vida', en: 'Résumé' },
  enterWorlds: { es: 'Entrar a los mundos', en: 'Enter the worlds' },
  enterWorld: { es: 'Entrar al mundo', en: 'Enter world' },
  projects: { es: 'proyectos', en: 'projects' },
  openProject: { es: 'Abrir proyecto', en: 'Open project' },
  openGallery: { es: 'Ver galería completa', en: 'Open full gallery' },
  back: { es: 'Volver', en: 'Back' },
  next: { es: 'Siguiente', en: 'Next' },
  client: { es: 'Cliente', en: 'Client' },
  year: { es: 'Año', en: 'Year' },
  role: { es: 'Rol', en: 'Role' },
  tools: { es: 'Herramientas', en: 'Tools' },
  world: { es: 'Mundo', en: 'World' },
  material: { es: 'Material', en: 'Media' },
  close: { es: 'Cerrar', en: 'Close' },
  sound: { es: 'Sonido', en: 'Sound' },
  hint: { es: 'Mueve el cursor sobre los LEDs · clic para disparar', en: 'Move over the LEDs · click to fire' },
  dragOrbit: { es: 'arrastra para orbitar', en: 'drag to orbit' },
  autopilot: { es: 'Autopilot', en: 'Autopilot' },
  strobe: { es: 'Strobe', en: 'Strobe' },
  pixelmap: { es: 'Pixel map', en: 'Pixel map' },
  signal: { es: 'Señal', en: 'Signal' },
  template: { es: 'Plantilla', en: 'Template' },
  camWide: { es: 'FOH', en: 'FOH' },
  camStage: { es: 'Escenario', en: 'Stage' },
  camBooth: { es: 'Cabina VJ', en: 'VJ booth' },
  scenes: { es: 'Escenas', en: 'Scenes' },
  clips: { es: 'Clips', en: 'Clips' },
  liveSet: { es: 'Ver set en vivo', en: 'Watch live set' },
  available: { es: 'Disponible para shows, giras y proyectos', en: 'Available for shows, tours and projects' },
  contact: { es: 'Contacto', en: 'Contact' },
  contactBig: { es: '¿Hacemos<br>que la pantalla <em>suene</em>?', en: 'Let’s make<br>the screen <em>sing</em>.' },
  backTop: { es: 'Volver arriba ↑', en: 'Back to top ↑' },
  all: { es: 'Todo', en: 'All' },
  downloadCv: { es: 'Descargar PDF', en: 'Download PDF' },
  experience: { es: 'Experiencia', en: 'Experience' },
  education: { es: 'Educación', en: 'Education' },
  skills: { es: 'Habilidades', en: 'Skills' },
  languages: { es: 'Idiomas', en: 'Languages' },
  present: { es: 'Presente', en: 'Present' },
  pressStart: { es: 'Press start', en: 'Press start' },
  selectCart: { es: 'Selecciona un cartucho', en: 'Select a cartridge' },
  devlogs: { es: 'Devlogs técnicos — Unity', en: 'Technical devlogs — Unity' },
  captures: { es: 'Capturas del motor', en: 'Engine captures' },
  hdrFlash: { es: 'Disparar impacto HDR', en: 'Trigger HDR impact' },
  wireframe: { es: 'Wireframe', en: 'Wireframe' },
  shaded: { es: 'PBR', en: 'PBR' },
  hybrid: { es: 'PBR + quads', en: 'PBR + quads' },
  compare: { es: 'Arrastra para comparar render y topología', en: 'Drag to compare beauty and topology' },
  gameplay: { es: 'Gameplay en Unity', en: 'Unity gameplay' },
  loadingModel: { es: 'Cargando modelo FBX…', en: 'Loading FBX model…' },
  nodesHint: { es: 'Arrastra los nodos · clic para ver la salida', en: 'Drag the nodes · click to view the output' },
  headset: { es: 'Vista estéreo', en: 'Stereo view' },
  timeline: { es: 'Línea de tiempo', en: 'Timeline' },
  composition: { es: 'Composición', en: 'Composition' },
  scrub: { es: 'Arrastra la línea de tiempo', en: 'Scrub the timeline' },
};
export const t = (k) => tr(UI[k]) || k;

// ---------------- utilidades
export const asset = (p) => (!p ? '' : /^https?:/.test(p) ? p : import.meta.env.BASE_URL + p.replace(/^\//, ''));
export const posterOf = (src) => (src ? src.replace(/\.mp4$/, '.poster.jpg') : '');
export const pad = (n, l = 2) => String(n).padStart(l, '0');
export const isImg = (src) => /\.(jpe?g|png|webp)$/i.test(src || '');
