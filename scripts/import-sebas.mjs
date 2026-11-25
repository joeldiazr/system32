// Importa el contenido del repo de Sebas (system32portfolio) a nuestro CMS en JSON.
// Uso: node scripts/import-sebas.mjs "C:/ruta/a/system32portfolio"
//
// - Lee src/data/*.js de su repo como DATOS (se evalúan en un contexto vm aislado,
//   sin require/process; solo objetos literales).
// - Escribe content/site.json, content/worlds.json, content/resume.json,
//   content/games.json y content/projects/<id>.json (todo bilingüe {es, en}).
// - Mide ancho/alto de cada medio y genera pósters .jpg para los videos que no tienen.
import vm from 'node:vm';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2];
if (!SRC) { console.error('Falta la ruta del repo de Sebas'); process.exit(1); }
const PUB = join(ROOT, 'public');

function loadData(file) {
  let code = readFileSync(join(SRC, 'src', 'data', file), 'utf8').replace(/^﻿/, '');
  code = code.replace(/^import .*$/gm, '');
  const names = [...code.matchAll(/export const (\w+)/g)].map((m) => m[1]);
  code = code.replace(/export const /g, 'const ').replace(/export function [\s\S]*$/m, '');
  code += `\n;({ ${names.join(', ')} })`;
  const ctx = vm.createContext({ prefixAssets: (v) => v, assetUrl: (v) => v });
  return vm.runInContext(code, ctx, { timeout: 2000 });
}

const D = loadData('portfolioData.js');
const S = loadData('stageEngineering.js');
const R = loadData('resumeData.js');
const manifest = JSON.parse(readFileSync(join(SRC, 'public', 'media', 'manifest.json'), 'utf8'));

const rel = (p) => (typeof p === 'string' ? p.replace(/^\//, '') : p);
const deep = (v) => (typeof v === 'string' ? rel(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v);

// ---------- medición y pósters
const dimsCache = {};
function dims(src) {
  if (!src || /^https?:/.test(src)) return {};
  if (dimsCache[src]) return dimsCache[src];
  const f = join(PUB, src);
  if (!existsSync(f)) { console.warn('  falta', src); return (dimsCache[src] = {}); }
  try {
    const out = execFileSync(ffprobe.path, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', f]).toString().trim();
    const [w, h] = out.split('\n')[0].split('x').map(Number);
    return (dimsCache[src] = { w, h });
  } catch { return (dimsCache[src] = {}); }
}
function posterFor(src) {
  if (!src || !src.endsWith('.mp4')) return '';
  const p = src.replace(/\.mp4$/, '.poster.jpg');
  const f = join(PUB, p);
  if (!existsSync(f) && existsSync(join(PUB, src))) {
    try { execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '1', '-i', join(PUB, src), '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '5', f]); }
    catch { try { execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(PUB, src), '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '5', f]); } catch { return ''; } }
  }
  return p;
}
const media = (it) => {
  const src = rel(it.src);
  const o = { type: it.type, src, poster: rel(it.poster) || (it.type === 'video' ? posterFor(src) : ''), ...(it.type === 'youtube' ? { youtubeId: it.youtubeId } : dims(src)), caption: it.caption || { es: '', en: '' } };
  if (it.type === 'image') o.poster = src;
  return o;
};

// ---------- mundos (acentos propios de nuestro sistema)
const ACCENT = { stage: '#FF4A1C', motion: '#B69CFF', vr: '#4DF5C1', games: '#FFD23F' };
const worlds = D.WORLDS.map((w, i) => ({
  id: w.id, index: w.index, accent: ACCENT[w.id], shortName: w.shortName, name: w.name, tagline: w.tagline, coords: w.coords,
  preview: rel(w.previewVideo) || '', poster: rel(w.poster) || '',
}));

// ---------- pixel maps → nuestro formato de escenario
const STAGE_EXTRA = 'media/stages/peterblue/extra';
const extraPeter = existsSync(join(PUB, STAGE_EXTRA))
  ? readdirSync(join(PUB, STAGE_EXTRA)).filter((f) => f.endsWith('.mp4')).sort((a, b) => (a.startsWith('screen') ? -1 : 0) - (b.startsWith('screen') ? -1 : 0) || a.localeCompare(b)).map((f) => `${STAGE_EXTRA}/${f}`)
  : [];

function pixelmapFor(p) {
  const spec = S.STAGE_ENGINEERING[p.stageRig];
  const pl = (p.stagePlaylist || []).map((x) => rel(x.src));
  const vids = (arr) => arr.filter(Boolean).filter((s) => s.endsWith('.mp4'));
  const name = (sl) => sl.name;
  if (p.stageRig === 'sonar-square') {
    const own = p.id === 'alba-franch' ? (p.gallery || []).filter((g) => g.type === 'video').map((g) => rel(g.src)) : [...pl, ...extraPeter];
    return {
      rig: 'square', label: 'SONAR-SQUARE', canvas: [1024, 1024], width: 8.1, cabinet: 128, bpm: p.id === 'sonar-park' ? 180.32 : 128,
      hardware: p.id === 'alba-franch' ? 'Resolume Arena (DXV3 Alpha) · 1024×1024' : spec.hardware,
      image: rel(p.pixelmapImage || spec.pixelmapUrl),
      slices: [{ name: { es: 'SLICE 1 · MONOLITO 1:1', en: 'SLICE 1 · 1:1 MONOLITH' }, x: 0, y: 0, w: 1024, h: 1024, physical: '8.1m × 8.1m' }],
      playlist: vids(own),
    };
  }
  if (p.stageRig === 'techno-cross') {
    return {
      rig: 'cross', label: 'TECHNO-CROSS', canvas: [1008, 784], width: 14, cabinet: 112, bpm: 140, hardware: spec.hardware,
      image: rel(p.pixelmapImage || spec.pixelmapUrl),
      slices: spec.slices.map((s) => ({ name: name(s), ...s.pxRect, physical: s.physical })),
      // su stagePlaylist trae solo los clips hechos para la cruz; si no hay, los videos de la galería
      playlist: vids(pl.length ? pl : (p.gallery || []).filter((g) => g.type === 'video').map((g) => rel(g.src))),
    };
  }
  if (p.stageRig === 'semana-mainstage') {
    // posiciones físicas reales (metros): cenefa 12×1 arriba, central 8×5, laterales 3×4
    const pos = { 'sem-cenefa': { pos: [0, 7.45], size: [12, 1], src: 'cenefa' }, 'sem-central': { pos: [0, 4.1], size: [8, 5], src: 'central' }, 'sem-left': { pos: [-6.2, 3.6], size: [3, 4], src: 'lateral' }, 'sem-right': { pos: [6.2, 3.6], size: [3, 4], src: 'lateral' } };
    return {
      rig: 'multi', label: 'MAINSTAGE-4', canvas: [2496, 2080], width: 12, cabinet: 104, bpm: 128, hardware: spec.hardware,
      image: rel(p.pixelmapImage || spec.pixelmapUrl),
      slices: spec.slices.map((s) => ({ name: name(s), ...s.pxRect, physical: s.physical, ...pos[s.id] })),
      scenes: p.multiZoneScenes.map((z) => ({ label: z.label, sources: { cenefa: rel(z.cenefa), central: rel(z.central), lateral: rel(z.lateral) } })),
      playlist: [],
    };
  }
  if (p.stageRig === 'sophii-curved') {
    // forma escalonada real según el pixel map 7424×1280 (pórticos y cortes incluidos)
    return {
      rig: 'curved', label: 'S-CURVE-PANO', canvas: [7424, 1280], width: 22, cabinet: 256, bpm: 124, curve: 1.25, hardware: spec.hardware,
      image: rel(p.pixelmapImage || spec.pixelmapUrl),
      slices: [
        { name: { es: 'CORONA CENTRAL', en: 'CENTER CROWN' }, x: 1408, y: 0, w: 4608, h: 384 },
        { name: { es: 'BANDA PANORÁMICA', en: 'PANORAMIC BAND' }, x: 0, y: 384, w: 7424, h: 256 },
        { name: { es: 'ALA IZQ', en: 'LEFT WING' }, x: 0, y: 640, w: 2048, h: 640 },
        { name: { es: 'ARCO CENTRAL', en: 'CENTER ARCH' }, x: 2432, y: 640, w: 2560, h: 640 },
        { name: { es: 'ALA DER', en: 'RIGHT WING' }, x: 5376, y: 640, w: 2048, h: 640 },
      ],
      cutouts: spec.cutouts,
      playlist: vids(pl),
    };
  }
  return null;
}

// escenario genérico (pantalla 16:9 + dos laterales IMAG) para proyectos de escenario sin pixel map
function festivalRig(p, gallery) {
  const pl = (p.stagePlaylist || []).map((x) => rel(x.src));
  const vids = [...pl, rel(p.preview), ...gallery.filter((g) => g.type === 'video').map((g) => g.src)].filter((s) => s && s.endsWith('.mp4'));
  return {
    rig: 'festival', label: 'FESTIVAL-WIDE', canvas: [1920, 1080], width: 10, cabinet: 120, bpm: 128, hardware: 'Resolume Arena · 16:9 + 2× IMAG',
    slices: [
      { name: { es: 'PANTALLA CENTRAL', en: 'CENTER WALL' }, x: 0, y: 0, w: 1920, h: 1080, pos: [0, 4.5], size: [10, 5.625] },
      { name: { es: 'IMAG IZQ', en: 'IMAG LEFT' }, x: 640, y: 0, w: 640, h: 1080, pos: [-8.2, 4.1], size: [3, 5.06], ry: 0.35 },
      { name: { es: 'IMAG DER', en: 'IMAG RIGHT' }, x: 640, y: 0, w: 640, h: 1080, pos: [8.2, 4.1], size: [3, 5.06], ry: -0.35 },
    ],
    playlist: [...new Set(vids)].slice(0, 10),
  };
}

// ---------- proyectos
const outDir = join(ROOT, 'content', 'projects');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const order = { stage: 0, motion: 100, vr: 200, games: 300 };
const counters = {};
for (const p of D.PROJECTS) {
  counters[p.world] = (counters[p.world] || 0) + 1;
  let gallery = p.gallery || (p.behanceSlug && manifest.behance[p.behanceSlug]?.gallery) || [];
  gallery = gallery.map(media).filter((g) => g.src);
  const preview = rel(p.preview) || '';
  const poster = rel(p.poster) || posterFor(preview);
  const o = {
    id: p.id, world: p.world, order: order[p.world] + counters[p.world], title: p.title, year: String(p.year),
    role: p.role, tools: p.tools, summary: p.summary,
    poster, preview, ...dims(preview),
    color: p.stageColor || p.accentColor || '',
    nodeType: p.nodeType || '',
    liveSet: p.liveSetVideo ? { youtubeId: p.liveSetVideo.youtubeId, url: p.liveSetVideo.url, label: p.liveSetVideo.label } : null,
    gallery,
    pixelmap: null,
  };
  if (p.world === 'stage') {
    o.pixelmap = pixelmapFor(p) || festivalRig(p, gallery);
    // pósters para las miniaturas del deck de canales
    o.pixelmap.playlist.forEach(posterFor);
    (o.pixelmap.scenes || []).forEach((sc) => Object.values(sc.sources).forEach(posterFor));
  }
  writeFileSync(join(outDir, `${p.id}.json`), JSON.stringify(o, null, 2) + '\n');
  console.log(`${p.world.padEnd(6)} ${p.id}: ${gallery.length} medios${o.pixelmap ? ' · rig ' + o.pixelmap.rig : ''}`);
}

// ---------- videojuegos (devlogs, props y clips de Opossum)
const games = deep({ tawDevlogs: D.TAW_BREAKER_DEVLOGS, opossumProps: D.OPOSSUM_PROPS, opossumClips: D.OPOSSUM_GAMEPLAY_CLIPS });
writeFileSync(join(ROOT, 'content', 'games.json'), JSON.stringify(games, null, 2) + '\n');

// ---------- textos de interfaz, hoja de vida, sitio
writeFileSync(join(ROOT, 'content', 'worlds.json'), JSON.stringify(worlds, null, 2) + '\n');
writeFileSync(join(ROOT, 'content', 'resume.json'), JSON.stringify(R.RESUME, null, 2) + '\n');
const ui = D.UI_TEXT;
writeFileSync(join(ROOT, 'content', 'site.json'), JSON.stringify({
  name: 'Sebastián Hincapié', alias: 'SYSTEM32', handle: 'system.032', city: 'Medellín, CO', timezone: 'America/Bogota',
  roleLine: ui.es.roleLine,
  role: { es: ui.es.aboutRole, en: ui.en.aboutRole },
  bio: { es: ui.es.aboutBio, en: ui.en.aboutBio },
  heroSubtitle: { es: ui.es.heroSubtitle, en: ui.en.heroSubtitle },
  email: 'sebashinca13@gmail.com',
  linkedin: 'https://www.linkedin.com/in/sebastianhin',
  instagram: 'https://www.instagram.com/system.032/',
  behance: 'https://www.behance.net/sebastihincapi12',
  available: true,
}, null, 2) + '\n');
console.log('listo');
