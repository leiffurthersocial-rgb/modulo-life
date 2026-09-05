import * as THREE from 'three';
import type { GraphicsSettings } from './settings';

/**
 * Thin wrapper around the WebGL renderer: owns the canvas, resolution scaling
 * and the frame loop, and nothing about gameplay.
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  private raf = 0;
  private lastTime = 0;
  private running = false;
  private frameCallback: ((dt: number) => void) | null = null;
  private resolutionScale = 1;
  /** Target frame rate; also reported to the debug overlay. */
  fpsTarget = 60;
  private frameBudget = 0;
  private accumulator = 0;

  /** Rolling FPS estimate for the debug overlay. */
  fps = 0;
  private fpsSamples: number[] = [];

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setClearColor(0x9fc4d8, 1);
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.resize();
  }

  applyGraphics(g: GraphicsSettings): void {
    this.renderer.shadowMap.enabled = g.shadows;
    this.resolutionScale = g.resolutionScale;
    this.fpsTarget = g.fpsTarget;
    this.frameBudget = g.fpsTarget >= 120 ? 0 : 1 / g.fpsTarget - 0.0015;
    this.resize();
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.resolutionScale;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
  }

  get aspect(): number {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || window.innerHeight;
    return w / Math.max(1, h);
  }

  start(callback: (dt: number) => void): void {
    this.frameCallback = callback;
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const raw = (now - this.lastTime) / 1000;
      this.lastTime = now;
      // A long tab-out must not teleport the simulation.
      const dt = Math.min(raw, 0.1);

      // Frame pacing for the 30fps battery-saver target.
      if (this.frameBudget > 0) {
        this.accumulator += dt;
        if (this.accumulator < this.frameBudget) return;
        this.accumulator = 0;
      }

      if (raw > 0) {
        this.fpsSamples.push(1 / raw);
        if (this.fpsSamples.length > 30) this.fpsSamples.shift();
        this.fps = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
      }

      this.frameCallback?.(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  get info() {
    return this.renderer.info;
  }

  dispose(): void {
    this.stop();
    this.renderer.dispose();
  }
}
