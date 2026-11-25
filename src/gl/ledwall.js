// Pared LED del hero.
// Un único shader de pantalla completa dibuja una grilla de LEDs. Cada LED toma el color
// del reel de Sebas en su centro; la palabra SYSTEM32 (dibujada en un canvas) define qué
// LEDs se encienden fuerte. Bajo el cursor hay una lupa que agranda los LEDs y deja ver
// los subpíxeles RGB; el clic dispara una onda de choque y todo late al BPM.
import * as THREE from 'three';
import { beat } from '../ui/beat.js';
import { mouse } from '../ui/cursor.js';

const frag = /* glsl */ `
precision highp float;
uniform sampler2D uVideo; uniform sampler2D uMask;
uniform vec2 uRes; uniform vec2 uVideoRes; uniform vec2 uMouse;
uniform float uTime; uniform float uBeat; uniform float uCell; uniform float uLens;
uniform vec3 uClick; uniform float uScroll; uniform float uReady; uniform float uHover;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

vec2 coverUV(vec2 uv){
  float ra = uRes.x / uRes.y, va = uVideoRes.x / uVideoRes.y;
  vec2 s = ra > va ? vec2(1.0, va / ra) : vec2(ra / va, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main(){
  vec2 p = vUv * uRes;                     // px, origen abajo-izquierda
  vec2 m = vec2(uMouse.x, uRes.y - uMouse.y);
  vec2 d = p - m; float r = length(d);
  float R = uLens;
  float lens = smoothstep(R, 0.0, r) * uHover;
  vec2 q = m + d * (1.0 - 0.62 * lens);    // lupa: comprime muestras → LEDs más grandes

  // la grilla se pixela más al hacer scroll
  float cs = uCell * (1.0 + uScroll * 2.5);
  vec2 cell = floor(q / cs);
  vec2 local = fract(q / cs);
  vec2 center = (cell + 0.5) * cs / uRes;

  // glitch: bandas horizontales que se corren de vez en cuando
  float band = floor(center.y * 24.0);
  float g = step(0.985, hash(vec2(band, floor(uTime * 6.0)))) * (hash(vec2(band, 3.0)) - 0.5) * 0.12;
  vec2 cuv = center + vec2(g, 0.0);

  float mask = texture2D(uMask, cuv).r;
  vec3 vid = texture2D(uVideo, coverUV(cuv)).rgb;
  // sin video todavía: degradado procedural
  vec3 proc = 0.5 + 0.5 * cos(uTime * 0.6 + cuv.xyx * 3.0 + vec3(0.0, 2.0, 4.0));
  vid = mix(proc * 0.6, vid, uReady);
  float lum = dot(vid, vec3(0.299, 0.587, 0.114));

  // onda de choque del clic
  vec2 cp = vec2(uClick.x, uRes.y - uClick.y);
  float ct = uTime - uClick.z;
  float ring = smoothstep(26.0, 0.0, abs(length((cell + 0.5) * cs - cp) - ct * 900.0)) * exp(-ct * 1.6);

  // intensidad: texto encendido, fondo tenue, lupa revela
  float base = 0.035 + 0.05 * lum;
  float on = mask * (1.05 + 0.35 * uBeat);
  float reveal = lens * 0.85;
  float I = max(base, max(on, reveal)) + ring * 0.9;
  vec3 col = vid * 1.35;
  col = mix(vec3(lum) * 0.8, col, 0.85 + 0.15 * mask);
  // letras: un toque del acento al latir
  col = mix(col, vec3(1.0, 0.29, 0.11), mask * uBeat * 0.18);

  // forma del LED: punto redondo lejos, subpíxeles RGB bajo la lupa
  vec2 lc = local - 0.5;
  float dotShape = smoothstep(0.48, 0.30, length(lc));
  float sub = floor(local.x * 3.0);
  vec3 subMask = vec3(sub == 0.0, sub == 1.0, sub == 2.0);
  float subShape = smoothstep(0.5, 0.36, abs(fract(local.x * 3.0) - 0.5)) * smoothstep(0.5, 0.40, abs(lc.y));
  vec3 led = mix(vec3(dotShape), subMask * subShape * 2.6, smoothstep(0.15, 0.7, lens));

  vec3 c = col * I * led;
  // brillo/halo suave
  c += col * I * 0.10 * smoothstep(0.75, 0.0, length(lc));
  c += vec3(1.0, 0.29, 0.11) * ring * 0.25 * dotShape;
  // viñeta y fundido al hacer scroll
  float vig = smoothstep(1.25, 0.35, length(vUv - 0.5));
  c *= vig * (1.0 - uScroll * 0.75);
  gl_FragColor = vec4(c, 1.0);
}`;

const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export class LedWall {
  constructor(container, { video: src, word = 'SYSTEM32' }) {
    this.container = container;
    this.word = word;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();

    this.video = Object.assign(document.createElement('video'), { src, muted: true, loop: true, playsInline: true, autoplay: true, crossOrigin: 'anonymous' });
    this.video.setAttribute('playsinline', '');
    this.videoTex = new THREE.VideoTexture(this.video);
    this.videoTex.colorSpace = THREE.SRGBColorSpace;

    this.maskCanvas = document.createElement('canvas');
    this.maskTex = new THREE.CanvasTexture(this.maskCanvas);

    this.uniforms = {
      uVideo: { value: this.videoTex }, uMask: { value: this.maskTex },
      uRes: { value: new THREE.Vector2() }, uVideoRes: { value: new THREE.Vector2(16, 9) },
      uMouse: { value: new THREE.Vector2(-999, -999) }, uTime: { value: 0 }, uBeat: { value: 0 },
      uCell: { value: 10 }, uLens: { value: 180 }, uClick: { value: new THREE.Vector3(-999, -999, -99) },
      uScroll: { value: 0 }, uReady: { value: 0 }, uHover: { value: 0 },
    };
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: this.uniforms }));
    this.scene.add(mesh);

    this.video.addEventListener('loadeddata', () => {
      this.uniforms.uVideoRes.value.set(this.video.videoWidth, this.video.videoHeight);
      this.uniforms.uReady.value = 1;
    });
    this.video.play().catch(() => {});

    this.m = new THREE.Vector2(innerWidth / 2, innerHeight / 2);
    this.hoverT = 0;
    this.onClick = (e) => {
      const r = this.renderer.domElement.getBoundingClientRect();
      this.uniforms.uClick.value.set((e.clientX - r.left) * this.pr, (e.clientY - r.top) * this.pr, this.uniforms.uTime.value);
    };
    this.onEnter = () => (this.inside = true);
    this.onLeave = () => (this.inside = false);
    container.addEventListener('pointerdown', this.onClick);
    container.addEventListener('pointerenter', this.onEnter);
    container.addEventListener('pointerleave', this.onLeave);
    this.inside = matchMedia('(hover: hover)').matches;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; if (this.visible) this.video.play().catch(() => {}); else this.video.pause(); });
    this.io.observe(container);
    this.visible = true;
    this.clock = new THREE.Clock();
    this.resize();
    document.fonts.ready.then(() => this.drawMask());
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  drawMask() {
    const { w, h } = this.size;
    const c = this.maskCanvas;
    const s = 0.5; // la máscara no necesita resolución completa
    c.width = Math.max(2, Math.round(w * s)); c.height = Math.max(2, Math.round(h * s));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const narrow = w < 700;
    const lines = narrow ? ['SYS', 'TEM', '32'] : [this.word];
    if ('fontStretch' in ctx) ctx.fontStretch = narrow ? 'normal' : 'expanded';
    let fs = 100;
    ctx.font = `900 ${fs}px Archivo`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const target = c.width * (narrow ? 0.86 : 0.9);
    fs = Math.min((fs * target) / widest, (c.height * 0.72) / (lines.length * 0.86));
    ctx.font = `900 ${fs}px Archivo`;
    const lh = fs * 0.86;
    const y0 = c.height * (narrow ? 0.46 : 0.47) - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, c.width / 2, y0 + i * lh));
    this.maskTex.needsUpdate = true;
  }

  resize() {
    const r = this.container.getBoundingClientRect();
    this.size = { w: r.width, h: r.height };
    this.renderer.setSize(r.width, r.height, false);
    const pr = this.renderer.getPixelRatio();
    this.uniforms.uRes.value.set(r.width * pr, r.height * pr);
    this.pr = pr;
    const cell = r.width < 700 ? 7 : r.width < 1400 ? 9 : 11;
    this.uniforms.uCell.value = cell * pr;
    this.uniforms.uLens.value = (r.width < 700 ? 110 : 190) * pr;
    this.drawMask();
  }

  setScroll(v) { this.uniforms.uScroll.value = v; }

  loop() {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.visible) return;
    const u = this.uniforms;
    u.uTime.value = this.clock.getElapsedTime();
    u.uBeat.value = beat.env();
    const r = this.renderer.domElement.getBoundingClientRect();
    this.m.x += (mouse.x - r.left - this.m.x) * 0.16;
    this.m.y += (mouse.y - r.top - this.m.y) * 0.16;
    u.uMouse.value.set(this.m.x * this.pr, this.m.y * this.pr);
    this.hoverT += ((this.inside ? 1 : 0) - this.hoverT) * 0.08;
    u.uHover.value = this.hoverT;
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect(); this.io.disconnect();
    this.container.removeEventListener('pointerdown', this.onClick);
    this.video.pause(); this.video.removeAttribute('src'); this.video.load();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
