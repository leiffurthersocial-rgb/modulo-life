import * as THREE from 'three';
import { voxColumn, voxSphere } from './voxel';

/**
 * Every material and generated texture in the game is created through this
 * cache, so repeated colours share one GPU resource and everything can be
 * disposed in one call when the scene is torn down.
 */
const materialCache = new Map<string, THREE.Material>();
const textureCache = new Map<string, THREE.Texture>();
const geometryCache = new Map<string, THREE.BufferGeometry>();

export function lambert(color: string | number, opts: { flat?: boolean; transparent?: boolean; opacity?: number } = {}): THREE.MeshLambertMaterial {
  const key = `lam:${color}:${opts.flat ? 1 : 0}:${opts.opacity ?? 1}`;
  const hit = materialCache.get(key);
  if (hit) return hit as THREE.MeshLambertMaterial;
  const m = new THREE.MeshLambertMaterial({
    color,
    flatShading: opts.flat ?? true,
    transparent: opts.transparent ?? (opts.opacity ?? 1) < 1,
    opacity: opts.opacity ?? 1,
  });
  materialCache.set(key, m);
  return m;
}

export function standard(
  color: string | number,
  opts: { roughness?: number; metalness?: number; flat?: boolean } = {},
): THREE.MeshStandardMaterial {
  const key = `std:${color}:${opts.roughness ?? 0.8}:${opts.metalness ?? 0}:${opts.flat ? 1 : 0}`;
  const hit = materialCache.get(key);
  if (hit) return hit as THREE.MeshStandardMaterial;
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.8,
    metalness: opts.metalness ?? 0,
    flatShading: opts.flat ?? true,
  });
  materialCache.set(key, m);
  return m;
}

/** Unlit material used for signage and lights so they read at night. */
export function emissive(color: string | number, opacity = 1): THREE.MeshBasicMaterial {
  const key = `emi:${color}:${opacity}`;
  const hit = materialCache.get(key);
  if (hit) return hit as THREE.MeshBasicMaterial;
  const m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });
  materialCache.set(key, m);
  return m;
}

export function glass(color: string | number, opacity = 0.35): THREE.MeshLambertMaterial {
  const key = `gls:${color}:${opacity}`;
  const hit = materialCache.get(key);
  if (hit) return hit as THREE.MeshLambertMaterial;
  const m = new THREE.MeshLambertMaterial({ color, transparent: true, opacity, depthWrite: false });
  materialCache.set(key, m);
  return m;
}

/**
 * Windows are given their own shared materials so the day/night system can
 * warm them up after dark with a single assignment, even though the geometry
 * itself has been merged into the static world batches.
 */
export function windowMaterial(): THREE.MeshLambertMaterial {
  const key = 'window:house';
  const hit = materialCache.get(key);
  if (hit) return hit as THREE.MeshLambertMaterial;
  const m = new THREE.MeshLambertMaterial({ color: '#9fc4d8', transparent: true, opacity: 0.55 });
  materialCache.set(key, m);
  return m;
}

export function shopGlassMaterial(): THREE.MeshLambertMaterial {
  const key = 'window:shop';
  const hit = materialCache.get(key);
  if (hit) return hit as THREE.MeshLambertMaterial;
  const m = new THREE.MeshLambertMaterial({ color: '#bfe0ee', transparent: true, opacity: 0.45 });
  materialCache.set(key, m);
  return m;
}

export function box(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `box:${w}:${h}:${d}`;
  const hit = geometryCache.get(key);
  if (hit) return hit as THREE.BoxGeometry;
  const g = new THREE.BoxGeometry(w, h, d);
  geometryCache.set(key, g);
  return g;
}

/**
 * Kept for call-site compatibility: the whole game asks for "cylinders" and
 * "spheres", and gets stepped cubes back. One redirect voxelises everything.
 */
export function cylinder(rt: number, rb: number, h: number, seg = 8): THREE.BufferGeometry {
  return voxColumn(rt, rb, h, seg);
}

export function sphere(r: number, _w = 12, _h = 8): THREE.BufferGeometry {
  // Small details stay a single cube; anything bigger becomes a cube cluster.
  return voxSphere(r, r < 0.11 ? 0 : 1);
}

/* ------------------------------------------------------- generated textures */

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return { canvas, ctx };
}

/** Shop signage rendered to a canvas texture - no external font assets needed. */
export function signTexture(text: string, color: string, bg = '#ffffff'): THREE.Texture | null {
  const key = `sign:${text}:${color}:${bg}`;
  const hit = textureCache.get(key);
  if (hit) return hit;
  const made = makeCanvas(512, 128);
  if (!made) return null;
  const { canvas, ctx } = made;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = color;
  ctx.fillRect(0, 108, 512, 8);
  ctx.font = 'bold 62px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 58, 470);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textureCache.set(key, tex);
  return tex;
}

/** Asphalt with a dashed centre line, tiled along the road. */
export function roadTexture(width: number, dashed: boolean): THREE.Texture | null {
  const key = `road:${width}:${dashed}`;
  const hit = textureCache.get(key);
  if (hit) return hit;
  const made = makeCanvas(128, 256);
  if (!made) return null;
  const { canvas, ctx } = made;
  ctx.fillStyle = '#4b4c52';
  ctx.fillRect(0, 0, 128, 256);
  // Subtle noise so the surface is not a flat colour.
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 256, 2, 2);
  }
  ctx.fillStyle = '#d9d5c8';
  ctx.fillRect(3, 0, 4, 256);
  ctx.fillRect(121, 0, 4, 256);
  if (dashed) {
    ctx.fillStyle = '#e8e2cc';
    for (let y = 0; y < 256; y += 64) ctx.fillRect(62, y, 5, 36);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, tex);
  return tex;
}

export function pavementTexture(): THREE.Texture | null {
  const key = 'pavement';
  const hit = textureCache.get(key);
  if (hit) return hit;
  const made = makeCanvas(128, 128);
  if (!made) return null;
  const { canvas, ctx } = made;
  ctx.fillStyle = '#c9c5ba';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 128; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, tex);
  return tex;
}

/** Soft radial sprite used for lamp glow and neon bloom without a composer. */
export function glowTexture(): THREE.Texture | null {
  const hit = textureCache.get('glow');
  if (hit) return hit;
  const made = makeCanvas(128, 128);
  if (!made) return null;
  const { canvas, ctx } = made;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.42)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  textureCache.set('glow', tex);
  return tex;
}

/** Five-petal blossom sprite for the sakura particle system. */
export function petalTexture(): THREE.Texture | null {
  const hit = textureCache.get('petal');
  if (hit) return hit;
  const made = makeCanvas(64, 64);
  if (!made) return null;
  const { canvas, ctx } = made;
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = '#ffd7e4';
  ctx.beginPath();
  ctx.ellipse(32, 32, 12, 20, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,180,205,0.85)';
  ctx.beginPath();
  ctx.ellipse(32, 38, 7, 12, 0.4, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  textureCache.set('petal', tex);
  return tex;
}

export function disposeMaterialCache(): void {
  for (const m of materialCache.values()) m.dispose();
  for (const t of textureCache.values()) t.dispose();
  for (const g of geometryCache.values()) g.dispose();
  materialCache.clear();
  textureCache.clear();
  geometryCache.clear();
}
