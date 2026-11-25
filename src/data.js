import site from '../content/site.json';

const mods = import.meta.glob('../content/projects/*.json', { eager: true, import: 'default' });

export const projects = Object.values(mods)
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  .map((p, i) => ({ ...p, index: i + 1 }));

export { site };

export const CATS = [
  { id: 'all', label: 'Todo' },
  { id: 'visuales', label: 'Visuales' },
  { id: 'motion', label: 'Motion graphics' },
  { id: 'vr', label: 'VR / Real-time' },
];

export const catLabel = (id) => CATS.find((c) => c.id === id)?.label ?? id;

// rutas de medios relativas a index.html (sirve en localhost y en GitHub Pages)
export const asset = (p) => (!p ? '' : /^https?:/.test(p) ? p : import.meta.env.BASE_URL + p.replace(/^\//, ''));

export const posterOf = (src) => (src ? src.replace(/\.mp4$/, '.jpg') : '');

export const pad = (n, l = 2) => String(n).padStart(l, '0');
