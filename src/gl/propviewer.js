// Visor de props 3D (FBX) para Opossum Atelier: tornamesa, modos PBR / wireframe / híbrido.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { asset } from '../data.js';

export class PropViewer {
  constructor(container, { onLoading } = {}) {
    this.container = container;
    this.onLoading = onLoading;
    this.mode = 'shaded';
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    this.camera.position.set(3.3, 2, 3.3);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true; this.controls.autoRotate = true; this.controls.autoRotateSpeed = 1.4;
    this.controls.enablePan = false; this.controls.enableZoom = false;
    this.controls.target.set(0, 0.5, 0);
    this.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x223322, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 4, 2); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd23f, 1.6); rim.position.set(-3, 2, -3); this.scene.add(rim);
    // piso circular tipo tornamesa
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 }));
    disc.rotation.x = -Math.PI / 2; this.scene.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.24, 1.27, 96), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; this.scene.add(ring);
    this.group = new THREE.Group(); this.scene.add(this.group);
    this.loader = new FBXLoader();
    this.texLoader = new THREE.TextureLoader();
    this.cache = {};
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(container);
    this.resize();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  resize() {
    const r = this.container.getBoundingClientRect();
    if (!r.width) return;
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height; this.camera.updateProjectionMatrix();
  }

  tex(src, srgb) {
    if (!src) return null;
    const t = this.texLoader.load(asset(src));
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  async load(prop) {
    const token = (this.token = Symbol());
    this.onLoading?.(true);
    let obj = this.cache[prop.slug];
    if (!obj) {
      try { obj = await this.loader.loadAsync(asset(prop.fbx)); }
      catch (e) { console.warn('FBX', e); this.onLoading?.(false); return; }
      const mat = new THREE.MeshStandardMaterial({
        map: this.tex(prop.baseColor, true), roughnessMap: this.tex(prop.roughness), metalnessMap: this.tex(prop.metallic),
        roughness: 1, metalness: prop.metallic ? 1 : 0,
      });
      const wire = new THREE.MeshBasicMaterial({ color: 0xffd23f, wireframe: true, transparent: true, opacity: 0.9 });
      obj.traverse((m) => { if (m.isMesh) { m.material = mat; m.userData.mat = mat; m.userData.wire = wire; } });
      // normalizar tamaño: cabe en una esfera de ~1 m y apoyado en el piso
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const s = 1.5 / Math.max(size.x, size.y, size.z);
      obj.scale.setScalar(s);
      const b2 = new THREE.Box3().setFromObject(obj);
      const c = b2.getCenter(new THREE.Vector3());
      obj.position.sub(new THREE.Vector3(c.x, b2.min.y, c.z));
      this.cache[prop.slug] = obj;
    }
    if (token !== this.token) return;
    this.group.clear();
    this.group.add(obj);
    const h = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3()).y;
    this.controls.target.set(0, h / 2, 0);
    this.setMode(this.mode);
    this.onLoading?.(false);
  }

  setMode(mode) {
    this.mode = mode;
    const meshes = [];
    this.group.traverse((m) => { if (m.isMesh && !m.userData.isOverlay) meshes.push(m); });
    meshes.forEach((m) => {
      m.material = mode === 'wire' ? m.userData.wire : m.userData.mat;
      // híbrido: malla PBR + wireframe superpuesto (una sola vez por malla)
      if (mode === 'hybrid' && !m.userData.overlay) {
        const o = new THREE.Mesh(m.geometry, m.userData.wire);
        o.userData.isOverlay = true;
        m.add(o); m.userData.overlay = o;
      }
      if (m.userData.overlay) m.userData.overlay.visible = mode === 'hybrid';
    });
  }

  loop() {
    this.raf = requestAnimationFrame(this.loop);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.raf); this.ro.disconnect(); this.controls.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
  }
}
