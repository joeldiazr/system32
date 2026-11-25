import Lenis from 'lenis';
import { reducedMotion } from './fx.js';

export const lenis = new Lenis({ lerp: 0.11, smoothWheel: !reducedMotion });
const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
requestAnimationFrame(raf);
