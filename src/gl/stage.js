// Escenario 3D a partir de un pixel map de Resolume.
// Cada "slice" del pixel map (x, y, w, h en px sobre el lienzo de la composición) se vuelve
// una pantalla LED en el espacio, ubicada igual que en el lienzo y mostrando exactamente
// su recorte del video. Alrededor: truss, cabezas móviles que toman el color del contenido,
// humo, público que se mueve al BPM y piso reflectivo.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { beat } from '../ui/beat.js';
import { asset } from '../data.js';

const ledVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ledFrag = /* glsl */ `
uniform sampler2D map; uniform vec4 rect; uniform vec2 px; uniform float cab;
uniform float uTime; uniform float uGlitch; uniform float uStrobe; uniform float uHover; uniform float uOn;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = rect.xy + vUv * rect.zw;
  // glitch de cambio de clip: filas desplazadas + separación RGB
  float row = floor(vUv.y * 40.0);
  float gl = uGlitch * (hash(vec2(row, floor(uTime * 30.0))) - 0.5) * 0.25;
  vec3 c;
  c.r = texture2D(map, uv + vec2(gl + uGlitch * 0.012, 0.0)).r;
  c.g = texture2D(map, uv + vec2(gl, 0.0)).g;
  c.b = texture2D(map, uv + vec2(gl - uGlitch * 0.012, 0.0)).b;
  // estructura de pixel LED (se desvanece cuando el pixel es menor que un pixel de pantalla)
  vec2 p = vUv * px;
  vec2 f = abs(fract(p) - 0.5);
  vec2 w = fwidth(p);
  float grid = 1.0 - (1.0 - smoothstep(0.5 - w.x, 0.5, f.x * 1.15)) * (1.0 - smoothstep(0.5 - w.y, 0.5, f.y * 1.15)) ;
  float pxVis = 1.0 - smoothstep(0.25, 0.7, max(w.x, w.y));
  c *= 1.0 - 0.45 * pxVis * (1.0 - grid);
  // juntas de los gabinetes
  vec2 cp = p / cab;
  vec2 cf = abs(fract(cp) - 0.5);
  vec2 cw = fwidth(cp) * 1.2;
  float seam = max(smoothstep(0.5 - cw.x, 0.5, cf.x), smoothstep(0.5 - cw.y, 0.5, cf.y));
  c *= 1.0 - 0.55 * seam;
  // strobe en modo Difference (como en el protocolo de Peterblue)
  c = mix(c, abs(vec3(1.0) - c), uStrobe);
  c *= uOn;
  c += vec3(1.0, 0.29, 0.11) * uHover * 0.18;
  gl_FragColor = vec4(c * 0.92, 1.0);
}`;

const beamVert = /* glsl */ `
varying float vT; varying vec3 vN; varying vec3 vV;
void main(){
  vT = uv.y;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const beamFrag = /* glsl */ `
uniform vec3 color; uniform float intensity;
varying float vT; varying vec3 vN; varying vec3 vV;
void main(){
  float edge = pow(abs(dot(vN, vV)), 1.6);
  float fall = pow(vT, 2.2);
  gl_FragColor = vec4(color * edge * fall * intensity, 1.0);
}`;

function spriteTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// truss cuadrado de 30 cm: 4 cordones + diagonales en zigzag, todo fusionado en una geometría
function trussGeometry(length, size = 0.3, r = 0.022) {
  const parts = [];
  const h = size / 2;
  const corners = [[-h, -h], [h, -h], [h, h], [-h, h]];
  for (const [x, z] of corners) {
    const g = new THREE.CylinderGeometry(r, r, length, 6);
    g.translate(x, length / 2, z); parts.push(g);
  }
  const seg = size * 1.6;
  const n = Math.max(1, Math.round(length / seg));
  const step = length / n;
  const diag = Math.hypot(size, step);
  const ang = Math.atan2(size, step);
  for (let i = 0; i < n; i++) {
    const y = i * step + step / 2;
    const flip = i % 2 ? 1 : -1;
    for (let f = 0; f < 4; f++) {
      const g = new THREE.CylinderGeometry(r * 0.6, r * 0.6, diag, 4);
      g.rotateZ(ang * flip);
      g.translate(0, y, h);
      g.rotateY((f * Math.PI) / 2);
      parts.push(g);
    }
  }
  return mergeGeometries(parts);
}

export class Stage {
  constructor(container, pm, { onClip, onHoverSlice } = {}) {
    this.container = container;
    this.pm = pm;
    this.onClip = onClip; this.onHoverSlice = onHoverSlice;
    this.playlist = pm.playlist || [];
    this.clip = 0;
    this.autopilot = true;
    this.strobe = 0; this.strobeHeld = false;
    this.glitch = 0;
    this.slicesHover = -1;

    const renderer = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    container.appendChild(renderer.domElement);

    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(0x050506);
    scene.fog = new THREE.FogExp2(0x050506, 0.028);

    // ---- video compartido por todas las pantallas
    const v = (this.video = document.createElement('video'));
    Object.assign(v, { muted: true, playsInline: true, crossOrigin: 'anonymous', preload: 'auto' });
    v.setAttribute('playsinline', '');
    v.addEventListener('ended', () => (this.autopilot ? this.next() : (v.currentTime = 0, v.play())));
    this.tex = new THREE.VideoTexture(v);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.minFilter = THREE.LinearFilter;

    // ---- dimensiones: metros por pixel del lienzo
    const [cw, ch] = pm.canvas;
    const s = (this.s = (pm.width || 6) / cw);
    const W = cw * s, H = ch * s;
    const bottom = 1.6;
    this.screenCenter = new THREE.Vector3(0, bottom + H / 2, 0);
    this.dims = { W, H, bottom };

    // ---- pantallas LED, una por slice
    this.screens = [];
    const cab = pm.cabinet || (pm.rig === 'cross' ? 112 : 128);
    const backMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.6, metalness: 0.6 });
    pm.slices.forEach((sl, i) => {
      const w = sl.w * s, h = sl.h * s;
      const x = (sl.x + sl.w / 2 - cw / 2) * s;
      const y = bottom + (ch / 2 - (sl.y + sl.h / 2)) * s + H / 2;
      const z = (sl.z || 0) + i * 0.012; // evita z-fighting en cruces
      const uniforms = {
        map: { value: this.tex },
        rect: { value: new THREE.Vector4(sl.x / cw, 1 - (sl.y + sl.h) / ch, sl.w / cw, sl.h / ch) },
        px: { value: new THREE.Vector2(sl.w, sl.h) }, cab: { value: cab },
        uTime: { value: 0 }, uGlitch: { value: 0 }, uStrobe: { value: 0 }, uHover: { value: 0 }, uOn: { value: 0 },
      };
      const mat = new THREE.ShaderMaterial({ vertexShader: ledVert, fragmentShader: ledFrag, uniforms, toneMapped: false });
      mat.extensions = { derivatives: true };
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.position.set(x, y, z);
      if (sl.ry) mesh.rotation.y = sl.ry;
      mesh.userData.slice = i;
      scene.add(mesh);
      const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.16), backMat);
      back.position.set(x, y, z - 0.09);
      scene.add(back);
      this.screens.push(mesh);
    });

    // ---- truss: dos torres y un puente superior
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x9a9aa2, roughness: 0.35, metalness: 0.9 });
    const span = W + 3.2;
    const towerH = bottom + H + 1.4;
    for (const sx of [-1, 1]) {
      const t = new THREE.Mesh(trussGeometry(towerH), trussMat);
      t.position.set(sx * span / 2, 0, -0.4);
      scene.add(t);
    }
    const top = new THREE.Mesh(trussGeometry(span + 0.3), trussMat);
    top.rotation.z = Math.PI / 2;
    top.position.set(span / 2 + 0.15, towerH, -0.4);
    scene.add(top);
    // puente frontal para luces
    const front = new THREE.Mesh(trussGeometry(span + 0.3), trussMat);
    front.rotation.z = Math.PI / 2;
    front.position.set(span / 2 + 0.15, towerH, 3.2);
    scene.add(front);
    for (const sx of [-1, 1]) {
      const t = new THREE.Mesh(trussGeometry(towerH), trussMat);
      t.position.set(sx * span / 2, 0, 3.2);
      scene.add(t);
    }

    // ---- tarima y cabina del DJ
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.8, metalness: 0.2 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(span + 1.5, 1.1, 5.2), deckMat);
    deck.position.set(0, 0.55, 1.3);
    scene.add(deck);
    const booth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.05, 0.9), deckMat);
    booth.position.set(0, 1.1 + 0.52, 2.2);
    scene.add(booth);
    this.boothStrip = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.06), new THREE.MeshBasicMaterial({ color: 0xff4a1c, toneMapped: false }));
    this.boothStrip.position.set(0, 1.1 + 0.85, 2.66);
    scene.add(this.boothStrip);
    // tira LED del borde de la tarima
    this.deckStrip = new THREE.Mesh(new THREE.PlaneGeometry(span + 1.5, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    this.deckStrip.position.set(0, 1.08, 3.91);
    scene.add(this.deckStrip);

    // ---- piso reflectivo (espejo atenuado)
    const mirror = new Reflector(new THREE.PlaneGeometry(80, 80), {
      textureWidth: Math.round(innerWidth * 0.5), textureHeight: Math.round(innerHeight * 0.5), color: 0x777777,
    });
    mirror.rotation.x = -Math.PI / 2;
    scene.add(mirror);
    this.mirror = mirror;
    const dim = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9, transparent: true, opacity: 0.82 }));
    dim.rotation.x = -Math.PI / 2; dim.position.y = 0.005;
    scene.add(dim);

    // ---- público: siluetas que saltan al BPM
    const crowdN = 170;
    const bodyG = new THREE.CapsuleGeometry(0.2, 0.95, 3, 8);
    bodyG.translate(0, 0.68, 0);
    const headG = new THREE.SphereGeometry(0.13, 10, 8);
    headG.translate(0, 1.42, 0);
    const personG = mergeGeometries([bodyG, headG]);
    const crowdMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
    this.crowd = new THREE.InstancedMesh(personG, crowdMat, crowdN);
    this.crowdData = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < crowdN; i++) {
      const z = 5.4 + Math.random() * 11;
      const spread = 3 + (z - 5) * 0.9;
      const x = (Math.random() * 2 - 1) * spread;
      const sc = 0.9 + Math.random() * 0.25;
      this.crowdData.push({ x, z, sc, ph: Math.random(), amp: 0.06 + Math.random() * 0.14, hands: Math.random() < 0.2 });
      dummy.position.set(x, 0, z); dummy.scale.setScalar(sc); dummy.updateMatrix();
      this.crowd.setMatrixAt(i, dummy.matrix);
    }
    scene.add(this.crowd);
    this.dummy = dummy;

    // ---- cabezas móviles con haz volumétrico
    const coneLen = 17;
    const coneG = new THREE.ConeGeometry(0.85, coneLen, 32, 1, true);
    coneG.translate(0, -coneLen / 2, 0); // ápice en el origen, apunta hacia -Y
    // uv.y: 1 en el ápice → 0 en la base (para el degradado)
    this.beams = [];
    const fixtureG = new THREE.BoxGeometry(0.3, 0.35, 0.3);
    const fixtureM = new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 0.4, metalness: 0.7 });
    const nBeams = 6;
    for (let i = 0; i < nBeams; i++) {
      const pivot = new THREE.Group();
      const x = -span / 2 + 0.6 + (i * (span - 1.2)) / (nBeams - 1);
      pivot.position.set(x, towerH - 0.35, 3.2);
      const mat = new THREE.ShaderMaterial({
        vertexShader: beamVert, fragmentShader: beamFrag,
        uniforms: { color: { value: new THREE.Color(1, 1, 1) }, intensity: { value: 0.32 } },
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      });
      const cone = new THREE.Mesh(coneG, mat);
      pivot.add(cone);
      pivot.add(new THREE.Mesh(fixtureG, fixtureM));
      scene.add(pivot);
      this.beams.push({ pivot, mat, ph: i / nBeams, side: i < nBeams / 2 ? -1 : 1 });
    }
    // luces de piso (contraluz) detrás de la pantalla
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        const pivot = new THREE.Group();
        pivot.position.set(sx * (W / 2 + 0.6 + k * 0.9), 1.15, -0.8);
        const mat = new THREE.ShaderMaterial({
          vertexShader: beamVert, fragmentShader: beamFrag,
          uniforms: { color: { value: new THREE.Color(1, 1, 1) }, intensity: { value: 0.22 } },
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
        });
        const cone = new THREE.Mesh(coneG, mat);
        cone.rotation.x = Math.PI; // apunta hacia arriba
        pivot.add(cone);
        scene.add(pivot);
        this.beams.push({ pivot, mat, ph: 0.5 + k * 0.25, side: sx, up: true });
      }
    }

    // ---- humo
    const hazeN = 500;
    const hp = new Float32Array(hazeN * 3);
    for (let i = 0; i < hazeN; i++) {
      hp[i * 3] = (Math.random() * 2 - 1) * 14;
      hp[i * 3 + 1] = Math.random() * 9;
      hp[i * 3 + 2] = -2 + Math.random() * 16;
    }
    const hazeG = new THREE.BufferGeometry();
    hazeG.setAttribute('position', new THREE.BufferAttribute(hp, 3));
    this.haze = new THREE.Points(hazeG, new THREE.PointsMaterial({
      size: 2.6, map: spriteTexture(), transparent: true, opacity: 0.018, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff,
    }));
    scene.add(this.haze);

    // ---- iluminación: la pantalla "ilumina" la escena con su color promedio
    scene.add(new THREE.HemisphereLight(0x8890ff, 0x050505, 0.25));
    this.screenLight = new THREE.PointLight(0xffffff, 40, 30, 1.6);
    this.screenLight.position.set(0, this.screenCenter.y, 3);
    scene.add(this.screenLight);

    // ---- cámara y controles
    const cam = (this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200));
    const dist = Math.max(W, H) * 1.55 + 7;
    cam.position.set(dist * 0.32, this.screenCenter.y * 0.62, dist);
    const controls = (this.controls = new OrbitControls(cam, renderer.domElement));
    controls.target.copy(this.screenCenter).add(new THREE.Vector3(0, -0.6, 0));
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = Math.max(W, H) * 0.7 + 2; controls.maxDistance = dist * 1.7;
    controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.56;
    controls.minAzimuthAngle = -1.2; controls.maxAzimuthAngle = 1.2;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.35;
    controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(this.idleT); });
    controls.addEventListener('end', () => { this.idleT = setTimeout(() => (controls.autoRotate = true), 6000); });
    // zoom con rueda solo si se mantiene Ctrl/⌘ (no secuestra el scroll de la página)
    controls.enableZoom = false;
    this.onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const dir = cam.position.clone().sub(controls.target);
      const len = THREE.MathUtils.clamp(dir.length() * (1 + Math.sign(e.deltaY) * 0.08), controls.minDistance, controls.maxDistance);
      cam.position.copy(controls.target).add(dir.setLength(len));
    };
    renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });

    // ---- postproceso: bloom para el brillo del LED
    const composer = (this.composer = new EffectComposer(renderer));
    composer.addPass(new RenderPass(scene, cam));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 0.78);
    composer.addPass(this.bloom);
    composer.addPass(new OutputPass());

    // ---- muestreo de color del video (para luces)
    this.sampler = document.createElement('canvas');
    this.sampler.width = this.sampler.height = 8;
    this.sctx = this.sampler.getContext('2d', { willReadFrequently: true });
    this.avg = new THREE.Color(1, 0.3, 0.1);
    this.avgTarget = new THREE.Color(1, 0.3, 0.1);

    // ---- hover sobre pantallas
    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(9, 9);
    this.onMove = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    this.onOut = () => this.pointer.set(9, 9);
    renderer.domElement.addEventListener('pointermove', this.onMove);
    renderer.domElement.addEventListener('pointerleave', this.onOut);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) v.play().catch(() => {}); else v.pause();
    });
    this.io.observe(container);
    this.visible = true;
    this.on = 0;

    this.clock = new THREE.Clock();
    this.resize();
    this.load(0);
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  load(i) {
    if (!this.playlist.length) return;
    this.clip = (i + this.playlist.length) % this.playlist.length;
    this.video.src = asset(this.playlist[this.clip]);
    this.video.loop = !this.autopilot;
    this.video.play().catch(() => {});
    this.glitch = 1;
    this.onClip?.(this.clip);
  }
  next() { this.load(this.clip + 1); }
  prev() { this.load(this.clip - 1); }
  setAutopilot(on) { this.autopilot = on; this.video.loop = !on; }
  setStrobe(on) { this.strobeHeld = on; }
  highlight(i) { this.forcedHover = i; }

  resize() {
    const r = this.container.getBoundingClientRect();
    if (!r.width) return;
    this.renderer.setSize(r.width, r.height, false);
    this.composer.setSize(r.width, r.height);
    this.bloom.setSize(r.width / 2, r.height / 2);
    this.camera.aspect = r.width / r.height;
    // en pantallas angostas alejamos la cámara para que quepa el rig
    this.camera.fov = r.width / r.height < 1 ? 55 : 38;
    this.camera.updateProjectionMatrix();
  }

  sampleColor() {
    const v = this.video;
    if (v.readyState < 2) return;
    try {
      this.sctx.drawImage(v, 0, 0, 8, 8);
      const d = this.sctx.getImageData(0, 0, 8, 8).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = d[i] + d[i + 1] + d[i + 2];
        const wgt = 0.2 + l / 765; // los píxeles brillantes pesan más
        r += d[i] * wgt; g += d[i + 1] * wgt; b += d[i + 2] * wgt; n += wgt;
      }
      const c = new THREE.Color(r / n / 255, g / n / 255, b / n / 255);
      const hsl = {}; c.getHSL(hsl);
      c.setHSL(hsl.h, Math.min(1, hsl.s * 1.6 + 0.15), Math.max(0.45, hsl.l));
      this.avgTarget.copy(c);
    } catch { /* video aún sin cuadros */ }
  }

  loop() {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.visible) return;
    const t = this.clock.getElapsedTime();
    const env = beat.env();
    const ph = beat.phase();
    if (((t * 8) | 0) !== this._lastSample) { this._lastSample = (t * 8) | 0; this.sampleColor(); }
    this.avg.lerp(this.avgTarget, 0.08);

    this.glitch *= 0.88;
    const strobeTarget = this.strobeHeld ? (ph < 0.5 ? 1 : 0) : 0;
    this.strobe = strobeTarget;
    this.on += (1 - this.on) * 0.03; // encendido gradual de la pantalla al entrar

    // hover
    this.ray.setFromCamera(this.pointer, this.camera);
    const hit = this.ray.intersectObjects(this.screens)[0];
    const hi = hit ? hit.object.userData.slice : this.forcedHover ?? -1;
    if (hi !== this.slicesHover) { this.slicesHover = hi; this.onHoverSlice?.(hi); }
    this.screens.forEach((m, i) => {
      const u = m.material.uniforms;
      u.uTime.value = t; u.uGlitch.value = this.glitch; u.uStrobe.value = this.strobe; u.uOn.value = this.on;
      u.uHover.value += ((i === hi ? 1 : 0) - u.uHover.value) * 0.15;
    });

    // cabezas móviles
    const white = new THREE.Color(1, 1, 1);
    this.beams.forEach((b, i) => {
      const a = t * 0.55 + b.ph * Math.PI * 2;
      if (b.up) {
        b.pivot.rotation.z = b.side * (0.25 + Math.sin(a) * 0.22);
        b.pivot.rotation.x = 0.2 + Math.cos(a * 0.7) * 0.12;
      } else {
        b.pivot.rotation.z = Math.sin(a) * 0.55 + b.side * 0.1;
        b.pivot.rotation.x = -0.25 + Math.cos(a * 0.8) * 0.45;
      }
      const c = (i % 2 ? this.avg.clone().lerp(white, 0.35) : this.avg.clone());
      b.mat.uniforms.color.value.copy(c);
      b.mat.uniforms.intensity.value = (b.up ? 0.12 : 0.15) * (0.7 + env * 0.6) + (this.strobe ? 0.15 : 0);
    });

    // público
    const ds = this.dummy;
    this.crowdData.forEach((p, i) => {
      const jump = Math.max(0, Math.sin((ph + p.ph * 0.25) * Math.PI * 2)) * p.amp;
      ds.position.set(p.x, jump, p.z);
      ds.scale.setScalar(p.sc);
      ds.rotation.y = Math.sin(t * 0.3 + p.ph * 6) * 0.3;
      ds.updateMatrix();
      this.crowd.setMatrixAt(i, ds.matrix);
    });
    this.crowd.instanceMatrix.needsUpdate = true;

    // humo a la deriva
    this.haze.rotation.y = Math.sin(t * 0.05) * 0.08;
    this.haze.material.color.copy(this.avg);

    this.screenLight.color.copy(this.avg);
    this.screenLight.intensity = (18 + env * 14) * this.on;
    this.boothStrip.material.color.copy(this.avg).multiplyScalar(1.5 + env);
    this.deckStrip.material.color.setScalar(0.3 + env * 1.2);
    this.bloom.strength = 0.42 + env * 0.18 + this.strobe * 0.3;

    this.controls.update();
    this.composer.render();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.idleT);
    this.ro.disconnect(); this.io.disconnect();
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    this.video.pause(); this.video.removeAttribute('src'); this.video.load();
    this.controls.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
    this.mirror.getRenderTarget?.().dispose();
    this.composer.dispose?.();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
