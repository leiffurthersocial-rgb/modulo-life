import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Voxel geometry kit.
 *
 * Everything in the world is built from cubes. Rather than scatter box maths
 * through every prop, the old sphere/cylinder helpers are re-pointed at these
 * builders, so a single call site change turns the whole neighbourhood blocky.
 *
 * Each shape is merged into one BufferGeometry and cached by its parameters,
 * so a hundred identical tree crowns share one geometry on the GPU.
 */

const cache = new Map<string, THREE.BufferGeometry>();

function cached(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  const hit = cache.get(key);
  if (hit) return hit;
  const geo = build();
  cache.set(key, geo);
  return geo;
}

/** Boxes must be non-indexed and share attributes to merge cleanly. */
function cube(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(x, y, z);
  return g;
}

function combine(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (parts.length === 1) return parts[0];
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return merged ?? new THREE.BoxGeometry(1, 1, 1);
}

export function voxBox(w: number, h: number, d: number): THREE.BufferGeometry {
  return cached(`b:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
}

/**
 * A blocky ball. `detail` is the number of cells either side of centre, so 1
 * gives a 3x3x3 cluster with the corners knocked off - chunky, and cheap.
 */
export function voxSphere(radius: number, detail = 1): THREE.BufferGeometry {
  return cached(`s:${radius.toFixed(3)}:${detail}`, () => {
    if (detail <= 0 || radius < 0.07) return new THREE.BoxGeometry(radius * 1.7, radius * 1.7, radius * 1.7);
    const n = detail * 2 + 1;
    const cell = (radius * 2) / n;
    const parts: THREE.BufferGeometry[] = [];
    for (let ix = 0; ix < n; ix++) {
      for (let iy = 0; iy < n; iy++) {
        for (let iz = 0; iz < n; iz++) {
          const x = (ix - detail) * cell;
          const y = (iy - detail) * cell;
          const z = (iz - detail) * cell;
          // Knock off anything whose centre falls outside the ball.
          if (Math.hypot(x, y, z) > radius * 1.02) continue;
          parts.push(cube(cell, cell, cell, x, y, z));
        }
      }
    }
    return parts.length ? combine(parts) : new THREE.BoxGeometry(radius, radius, radius);
  });
}

/**
 * Replaces cylinders and cones. A zero top radius builds a stepped pyramid,
 * which is what roofs and tree tops want; anything else is a stack of boxes
 * that steps in as it tapers.
 */
export function voxColumn(topRadius: number, bottomRadius: number, height: number, sides = 8): THREE.BufferGeometry {
  const key = `c:${topRadius.toFixed(3)}:${bottomRadius.toFixed(3)}:${height.toFixed(3)}:${sides}`;
  return cached(key, () => {
    const parts: THREE.BufferGeometry[] = [];

    if (topRadius <= 0.001) {
      // Stepped pyramid: four or five tiers reads as a roof at any size.
      const tiers = height > 2 ? 5 : 4;
      for (let i = 0; i < tiers; i++) {
        const t = i / tiers;
        const w = bottomRadius * 2 * (1 - t) * 0.98;
        const layer = height / tiers;
        parts.push(cube(w, layer, w, 0, -height / 2 + layer * (i + 0.5), 0));
      }
      return combine(parts);
    }

    const taper = Math.abs(topRadius - bottomRadius) / Math.max(topRadius, bottomRadius);
    const tiers = taper > 0.18 ? 3 : 1;
    for (let i = 0; i < tiers; i++) {
      const t = tiers === 1 ? 0.5 : (i + 0.5) / tiers;
      const r = bottomRadius + (topRadius - bottomRadius) * t;
      const layer = height / tiers;
      // 0.9 keeps a box roughly the visual weight of the cylinder it replaces.
      parts.push(cube(r * 1.8, layer, r * 1.8, 0, -height / 2 + layer * (i + 0.5), 0));
    }
    return combine(parts);
  });
}

/** A ring of cubes: wheels, spectacle rims, table edging. */
export function voxRing(radius: number, thickness: number, count = 10): THREE.BufferGeometry {
  return cached(`r:${radius.toFixed(3)}:${thickness.toFixed(3)}:${count}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    const size = Math.max(thickness * 2, (radius * 2 * Math.PI) / count);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      parts.push(cube(size, size, thickness * 2, Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    return combine(parts);
  });
}

/** A lumpy boulder built from a handful of offset cubes. */
export function voxRock(size: number, seed = 1): THREE.BufferGeometry {
  return cached(`k:${size.toFixed(3)}:${seed}`, () => {
    let s = seed * 9301 + 49297;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const parts: THREE.BufferGeometry[] = [cube(size * 1.6, size * 1.2, size * 1.6, 0, 0, 0)];
    for (let i = 0; i < 3; i++) {
      const c = size * (0.5 + rnd() * 0.5);
      parts.push(cube(c, c, c, (rnd() - 0.5) * size * 1.5, (rnd() - 0.2) * size * 0.9, (rnd() - 0.5) * size * 1.5));
    }
    return combine(parts);
  });
}

/** A flat blocky disc for plazas and ponds - an octagon, not a circle. */
export function voxDisc(radius: number, thickness = 0.12): THREE.BufferGeometry {
  return cached(`d:${radius.toFixed(2)}:${thickness}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const half = radius * Math.cos((t * Math.PI) / 2.6);
      const depth = radius * Math.sqrt(Math.max(0, 1 - t * t));
      parts.push(cube(half * 2, thickness, depth * 2 * 0.42, 0, 0, 0));
      parts.push(cube(depth * 2 * 0.42, thickness, half * 2, 0, 0, 0));
    }
    return combine(parts);
  });
}

export function disposeVoxelCache(): void {
  for (const g of cache.values()) g.dispose();
  cache.clear();
}
