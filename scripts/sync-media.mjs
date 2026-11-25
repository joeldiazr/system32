// Sincroniza public/media/<slug>/ con content/projects/<slug>.json
// Agrega al arreglo "media" los videos e imágenes nuevos que encuentre en la carpeta
// (con su ancho/alto), sin tocar los que ya están ni su orden ni sus captions.
// Si el proyecto no tiene "cover", usa el primer video.
//
// Uso: npm run sync
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import ffprobe from 'ffprobe-static';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content', 'projects');
const MEDIA = join(ROOT, 'public', 'media');

const probe = (file) => {
  const out = execFileSync(ffprobe.path, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file]).toString().trim();
  const [w, h] = out.split('x').map(Number);
  return { w, h };
};

for (const f of readdirSync(CONTENT).filter((f) => f.endsWith('.json'))) {
  const path = join(CONTENT, f);
  const p = JSON.parse(readFileSync(path, 'utf8'));
  const dir = join(MEDIA, p.slug);
  if (!existsSync(dir)) { console.warn('sin carpeta de medios:', p.slug); continue; }
  const files = readdirSync(dir).sort();
  const have = new Set((p.media || []).map((m) => m.src));
  const skip = new Set(p.pixelmap?.playlist || []);
  let added = 0;
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const name = basename(file, ext);
    const src = `media/${p.slug}/${file}`;
    if (file.startsWith('pixelmap') || file.includes('.thumb.')) continue;
    if (have.has(src)) continue;
    if (ext === '.mp4') {
      if (skip.has(src) && name.startsWith('screen-')) continue; // solo pantalla 3D
      const poster = `media/${p.slug}/${name}.jpg`;
      p.media.push({ type: 'video', src, poster, ...probe(join(dir, file)), caption: '' });
      added++;
    } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      if (files.includes(`${name}.mp4`)) continue; // es el póster de un video
      const thumb = files.includes(`${name}.thumb.jpg`) ? `media/${p.slug}/${name}.thumb.jpg` : src;
      p.media.push({ type: 'image', src, poster: thumb, ...probe(join(dir, file)), caption: '' });
      added++;
    }
  }
  if (!p.cover) {
    const v = p.media.find((m) => m.type === 'video' && m.w >= m.h) || p.media.find((m) => m.type === 'video') || p.media[0];
    if (v) p.cover = v.src;
  }
  writeFileSync(path, JSON.stringify(p, null, 2) + '\n');
  console.log(`${p.slug}: +${added} (total ${p.media.length})`);
}
