# SYSTEM32 — portafolio de Sebastián Hincapié

Sitio de Sebastián Hincapié (aka System32): visual generalist, VJ y motion designer, Medellín.
Vite + Three.js, sin framework. Las rutas usan hash (`#/p/slug`), así que funciona en GitHub Pages sin configuración extra.

## Correr en local

```bash
npm install
npm run dev        # http://localhost:5232
npm run build      # genera dist/
npm run preview    # sirve dist/ para probar el build
```

## Contenido (CMS)

Todo el contenido vive en archivos JSON dentro del repo:

- `content/site.json`: bio, servicios, herramientas, links y correo.
- `content/projects/<slug>.json`: un archivo por proyecto.
- `public/media/<slug>/`: videos (`.mp4`) y pósters (`.jpg`) de cada proyecto.

**Editar con formularios:** en [app.pagescms.org](https://app.pagescms.org), entra con GitHub y abre el repo. Pages CMS lee `.pages.yml` y muestra "Proyectos" y "Sitio". Cada cambio queda como commit y la GitHub Action vuelve a publicar.

### Categorías

`visuales` (escenarios, VJ, pantallas), `motion` (motion graphics) y `vr` (VR / tiempo real).

### Proyectos con pixel map → escenario 3D

Si un proyecto tiene el bloque `pixelmap`, su página muestra el escenario en 3D en vez del video de portada:

```json
"pixelmap": {
  "rig": "cross",
  "label": "TECHNO-CROSS",
  "canvas": [1008, 784],
  "width": 11,
  "bpm": 140,
  "image": "media/castrii-techno-stage/pixelmap.png",
  "slices": [
    { "name": "VERTICAL",   "x": 448, "y": 0,   "w": 112,  "h": 784 },
    { "name": "HORIZONTAL", "x": 0,   "y": 336, "w": 1008, "h": 112 }
  ],
  "playlist": ["media/castrii-techno-stage/cruz-ojo.mp4", "..."]
}
```

- `canvas`: resolución de la composición de Resolume.
- `slices`: los rectángulos de **Advanced Output › Input Selection** (se copian del XML de la Screen Setup). Cada slice se vuelve una pantalla LED ubicada igual que en el lienzo y muestra su recorte exacto del video.
- `width`: cuántos metros mide el lienzo completo (da la escala del escenario).
- `playlist`: clips hechos para ese lienzo; avanzan solos (autopilot) o se eligen en el deck.
- Opcionales por slice: `z` (profundidad) y `ry` (rotación) para rigs que no son planos.

Si el proyecto no tiene `pixelmap`, se muestra la portada a pantalla completa y la galería.

## Medios

Los insumos originales (ProRes, DXV, 4K) son demasiado pesados para la web. `scripts/media.mjs` los convierte a H.264 livianos con ffmpeg:

```bash
SEBAS_RAW="C:/ruta/CONTENIDO PROYECTOS SEBAS" npm run media   # convierte (incremental)
npm run sync                                                 # agrega los archivos nuevos a "media" de cada JSON
```

Para agregar un proyecto a mano: crea `public/media/<slug>/` con los `.mp4` (y un `.jpg` con el mismo nombre como póster), crea `content/projects/<slug>.json` copiando otro y corre `npm run sync`.

## Publicar en GitHub Pages

1. Sube el repo a GitHub (rama `main`).
2. En **Settings › Pages**, elige **Source: GitHub Actions**.
3. Cada push a `main` publica en `https://<usuario>.github.io/<repo>/`.
