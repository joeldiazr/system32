// Pipeline de medios: convierte los insumos crudos de Sebas (ProRes, DXV, 4K, JPG pesados)
// en versiones livianas para la web dentro de public/media/<slug>/.
//
// Uso:  SEBAS_SRC="C:/ruta/a/extraido" SEBAS_RAW="C:/ruta/a/CONTENIDO PROYECTOS SEBAS" npm run media
//       (si no se pasan, usa las rutas por defecto de abajo)
// Es incremental: si el archivo de salida ya existe, lo salta. Borra el archivo para regenerarlo.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'media');
const RAW = process.env.SEBAS_RAW || 'C:/Users/fdrjo/Downloads/CONTENIDO PROYECTOS SEBAS';
const SRC = process.env.SEBAS_SRC || join(RAW, 'extraido');
const PROY = join(SRC, 'proyectos');
const CASTRI = join(SRC, 'CASTRIESCENARIO_TECHNO', 'Media', 'Downloads');
const ALBA = join(SRC, 'ALBA FRANCH');

// carpeta de Behance/Drive → slug del proyecto, con opciones por archivo
const FOLDERS = {
  'SONAR PARK 2026 - PETERBLUE': 'peterblue-sonar-park-2026',
  'FUMARATTO & FRIENDS LA SOLAR 2024': 'fumaratto-la-solar-2024',
  'ROMANTICAS DE ORO SHOW': 'romanticas-de-oro',
  'SOPHII SHOW': 'sophii-show',
  'RITVALES 2024': 'ritvales-2024',
  'MOTION GRAPHICS AND LIVE VJ SHOW': 'motion-live-vj-show',
  'VJ AND 3D ANIMATIONS': 'vj-3d-animations',
  'SHOWREEL TOUCHDESIGNER': 'showreel-touchdesigner',
  'LEE EYE VIDEO LYRICS AND TOUCHDESIGNER': 'lee-eye-video-lyrics',
  'LEONISA MOTION GRAPHICS': 'leonisa',
  'MOTION GRAPHICS BETBETBET': 'betbetbet',
  'MOTION GRAPHICS PRACTICE': 'belo-practice',
  'SAMER YOGA EL SOL SALE PARA TODOS': 'samer-yoga',
  'FREELANCE WORKS': 'freelance-works',
  'UNREAL ENGINE': 'unreal-engine',
  'VR GAME FOR TELEMEDELLIN': 'vr-telemedellin',
};

// overrides por archivo: { dur, audio, skip, long }
const OVERRIDES = {
  'freelance-works/06': { skip: true }, // duplicado exacto de vj-3d-animations/03
  'vj-3d-animations/03': { dur: 40 },
  'showreel-touchdesigner/01': { dur: 75, audio: true },
  'lee-eye-video-lyrics/01': { dur: 35, audio: true },
  'lee-eye-video-lyrics/02': { dur: 35, audio: true },
  'lee-eye-video-lyrics/03': { dur: 35, audio: true },
  'lee-eye-video-lyrics/04': { dur: 35, audio: true },
  'vr-telemedellin/01': { dur: 82, audio: true },
  'leonisa/01': { dur: 45 },
  'sophii-show/02': { dur: 40 },
  'romanticas-de-oro/01': { dur: 40 },
  'romanticas-de-oro/03': { dur: 40 },
};

const jobs = [];
const add = (src, slug, name, opts = {}) => jobs.push({ src, slug, name, ...opts });

for (const [folder, slug] of Object.entries(FOLDERS)) {
  const dir = join(PROY, folder);
  if (!existsSync(dir)) { console.warn('falta carpeta', dir); continue; }
  for (const f of readdirSync(dir).sort()) {
    const name = basename(f, extname(f));
    const o = OVERRIDES[`${slug}/${name}`] || {};
    if (o.skip) continue;
    add(join(dir, f), slug, name, o);
  }
}

// Peterblue: los ProRes 1024×1024 que se veían en la pantalla cuadrada de Sónar Park
for (const [f, n] of [
  ['PANTERASPETERBLUEbueno-002.mov', 'screen-panteras'],
  ['peterañañaybueno-001.mov', 'screen-ananay'],
  ['peterblueraro-005.mov', 'screen-raro'],
  ['peterimagesstack-004.mov', 'screen-stack'],
]) add(join(RAW, f), 'peterblue-sonar-park-2026', n, { dur: 16, long: 768 });

// Alba Franch @ Sónar Park (1024×1024)
for (const [f, n] of [
  ['albalogoconfondo.mp4', 'screen-logo'],
  ['Glare.mp4', 'screen-glare'],
  ['IRISSSSSROSADP.mp4', 'iris'],
  ['texturametalicadecolores.mp4', 'textura-metalica'],
  ['clothhhh.mp4', 'cloth'],
  ['0001-0321.mov', 'screen-intro'],
]) add(join(ALBA, f), 'alba-franch-sonar-park', n, { dur: 16, long: n.startsWith('screen') ? 768 : 1280 });

// Castrii — escenario techno en cruz (lienzo 1008×784, DXV con alfa → sobre negro)
for (const [f, n] of [
  ['cruzconprofundidadsola0001-0300.mov', 'cruz-profundidad'],
  ['cadenassobrecruz0001-0300.mov', 'cruz-cadenas'],
  ['muricelagos dentro de la cruz0001-0300.mov', 'cruz-murcielagos'],
  ['eclipsemoviendose.mov', 'cruz-eclipse'],
  ['cruzdeojoa.mov', 'cruz-ojo'],
  ['casstriletrassmear.mov', 'cruz-letras-smear'],
  ['castrirandomletras.mov', 'cruz-letras-random'],
  ['logocastriianimadocruz.mov', 'cruz-logo'],
]) add(join(CASTRI, f), 'castrii-techno-stage', n, { dur: 10, long: 1008, flatten: true });

// ---------------------------------------------------------------------------

const run = (args) => new Promise((res, rej) => {
  const p = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
  let err = '';
  p.stderr.on('data', (d) => (err += d));
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(err.slice(-600)))));
});

const IMG = ['.jpg', '.jpeg', '.png', '.webp'];

async function process1(j) {
  const dir = join(OUT, j.slug);
  mkdirSync(dir, { recursive: true });
  const ext = extname(j.src).toLowerCase();
  if (!existsSync(j.src)) return console.warn('  ✗ no existe', j.src);

  if (IMG.includes(ext)) {
    const out = join(dir, `${j.name}.jpg`);
    const thumb = join(dir, `${j.name}.thumb.jpg`);
    if (!existsSync(out)) await run(['-i', j.src, '-vf', "scale='if(gt(iw,ih),min(1800,iw),-2)':'if(gt(iw,ih),-2,min(1800,ih))'", '-q:v', '4', out]);
    if (!existsSync(thumb)) await run(['-i', j.src, '-vf', "scale='if(gt(iw,ih),min(640,iw),-2)':'if(gt(iw,ih),-2,min(640,ih))'", '-q:v', '5', thumb]);
    return;
  }

  const long = j.long || 1280;
  const out = join(dir, `${j.name}.mp4`);
  const poster = join(dir, `${j.name}.jpg`);
  const scale = `scale='if(gte(iw,ih),min(${long},iw),-2)':'if(gte(iw,ih),-2,min(${long},ih))',setsar=1`;
  if (!existsSync(out)) {
    const pre = ['-t', String(j.dur || 30), '-i', j.src];
    const vf = j.flatten
      ? ['-filter_complex', `color=black:s=1008x784:r=30[bg];[bg][0:v]overlay=shortest=1:format=auto,${scale},format=yuv420p[v]`, '-map', '[v]']
      : ['-vf', `${scale},fps=30,format=yuv420p`, '-map', '0:v:0'];
    const audio = j.audio ? ['-map', '0:a:0?', '-c:a', 'aac', '-b:a', '112k'] : ['-an'];
    await run([...pre, ...vf, ...audio, '-c:v', 'libx264', '-preset', 'medium', '-crf', '28',
      '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  }
  if (!existsSync(poster)) await run(['-ss', '1', '-i', out, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '5', poster]);
}

const N = Number(process.env.JOBS || 3);
let i = 0, done = 0;
const t0 = Date.now();
async function worker() {
  while (i < jobs.length) {
    const j = jobs[i++];
    try { await process1(j); } catch (e) { console.error(`  ✗ ${j.slug}/${j.name}: ${e.message}`); }
    done++;
    console.log(`[${done}/${jobs.length}] ${j.slug}/${j.name}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
}
await Promise.all(Array.from({ length: N }, worker));

// resumen de peso total
let total = 0;
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); const s = statSync(p); s.isDirectory() ? walk(p) : (total += s.size); });
walk(OUT);
console.log(`listo · public/media pesa ${(total / 1e6).toFixed(1)} MB`);
