# SYSTEM32 — portafolio de Sebastián Hincapié

Portafolio interactivo de Sebastián Hincapié (aka System32): technical artist, real-time visuals, live VJ y 3D, Medellín.
Vite + Three.js, sin framework. Rutas con hash (`#/w/stage`, `#/p/castrii-techno`), así que funciona en GitHub Pages sin configuración.

## Estructura

- **Inicio:** pared LED interactiva «SYSTEM32» de una sola pantalla; el botón **Entrar a los mundos** (o Enter) lleva al hub (`#/hub`). En el hub, las teclas 1–4 abren cada mundo y Esc vuelve desde cualquier mundo.
- **Mundo 01 · Stage & VJ** (`#/w/stage`): escenario 3D con un canal por proyecto. Los proyectos con pixel map real montan su rig:
  - pantalla cuadrada 1:1 (Peterblue, Alba Franch),
  - cruz (Castrii),
  - 4 pantallas con un video cada una (Semana de la Juventud),
  - pared curva panorámica con pórticos (Sophii).
  
  Los demás usan un rig de festival genérico.
- **Mundo 02 · Motion** (`#/w/motion`): estudio con composiciones, visor con timecode, línea de tiempo con keyframes y editor de curvas.
- **Mundo 03 · VR & Real-time** (`#/w/vr`): red de nodos tipo TouchDesigner con visor estéreo.
- **Mundo 04 · Videojuegos** (`#/w/games`): «press start» y cartuchos. Taw Breaker trae devlogs e impacto HDR; Opossum Atelier trae visor FBX con wireframe y comparador.
- **Contenidos** (`#/contenidos`), **hoja de vida** (`#/cv`) y **página de proyecto** (`#/p/<id>`) con galería.
- Bilingüe ES/EN (botón en el HUD).

## Correr en local

```bash
npm install
npm run dev        # http://localhost:5232
npm run build      # genera dist/
```

## Contenido (CMS)

Todo vive en JSON dentro del repo, con textos `{ "es": …, "en": … }`:

- `content/projects/<id>.json`: un archivo por proyecto (mundo, rol, resumen, galería, pixel map).
- `content/worlds.json`: los 4 mundos.
- `content/site.json`: bio, roles y contacto.
- `content/resume.json`: hoja de vida.
- `content/games.json`: devlogs de Taw Breaker, props y clips de Opossum Atelier.
- `public/media/`: videos, imágenes, pixel maps y modelos FBX.

**Editar con formularios:** entra con GitHub a [app.pagescms.org](https://app.pagescms.org) y abre el repo. Pages CMS lee `.pages.yml`.

**Importar desde el repo original de Sebas:**

```bash
npm run import -- "C:/ruta/a/system32portfolio"
```

Lee `src/data/*.js` del repo de Sebas (como datos, en un contexto aislado) y regenera los JSON de `content/`. También genera los pósters que falten.

### Pixel maps → escenario 3D

```json
"pixelmap": {
  "rig": "cross",
  "canvas": [1008, 784],
  "width": 14,
  "slices": [
    { "name": { "es": "PILAR VERTICAL", "en": "VERTICAL PILLAR" }, "x": 448, "y": 0, "w": 112, "h": 784 },
    { "name": { "es": "VIGA HORIZONTAL", "en": "HORIZONTAL BEAM" }, "x": 0, "y": 336, "w": 1008, "h": 112 }
  ],
  "playlist": ["media/stages/castrii/item_01.mp4"]
}
```

- `slices` son los rectángulos de Resolume › Advanced Output. Cada uno se vuelve una pantalla en 3D que muestra su recorte exacto del video.
- En rigs `multi`, cada slice tiene `src`, `pos` y `size` en metros, y `scenes` reemplaza a `playlist`: cada escena trae un video por fuente.
- En rigs `curved`, el lienzo se dobla en un arco (`curve` en radianes).

## Publicar en GitHub Pages

1. Sube el repo a GitHub (rama `main`).
2. En **Settings › Pages**, elige **Source: GitHub Actions**.
3. Cada push a `main` publica el sitio.
