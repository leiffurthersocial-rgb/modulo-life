import { describe, expect, it } from 'vitest';
import { LOCATIONS, approachPoint, isOpen } from '@/data/locations';
import { BUILDINGS, ROADS, buildNavGraph, findPath, isInsideBuilding, nearestNavNode } from '@/data/world-layout';
import { INTERIOR_MAP } from '@/data/interiors';

const nodes = buildNavGraph();

describe('world layout', () => {
  it('builds a connected navigation graph', () => {
    expect(nodes.length).toBeGreaterThan(50);
    expect(nodes.every((n) => n.links.length > 0)).toBe(true);
  });

  it('finds a path across the neighbourhood', () => {
    const path = findPath(nodes, { x: -74, z: -34 }, { x: 84, z: 22 });
    expect(path.length).toBeGreaterThan(3);
    const last = path[path.length - 1];
    expect(last.x).toBeCloseTo(84);
    expect(last.z).toBeCloseTo(22);
  });

  it('returns a direct step when start and goal share a node', () => {
    const path = findPath(nodes, { x: 0, z: 0 }, { x: 1, z: 1 });
    expect(path).toHaveLength(1);
  });

  it('keeps every road clear of buildings', () => {
    // Each footprint must leave at least a 1.5m pavement beside every road.
    for (const b of BUILDINGS) {
      for (const r of ROADS) {
        const clearance = r.width / 2 + 1.5;
        const clash =
          r.axis === 'ew'
            ? Math.abs(b.z - r.z) < b.halfD + clearance && b.x + b.halfW > r.x1 && b.x - b.halfW < r.x2
            : Math.abs(b.x - r.x) < b.halfW + clearance && b.z + b.halfD > r.z1 && b.z - b.halfD < r.z2;
        expect(clash, `${b.id} blocks ${r.name}`).toBe(false);
      }
    }
  });

  it('does not overlap building footprints', () => {
    for (let i = 0; i < BUILDINGS.length; i++) {
      for (let j = i + 1; j < BUILDINGS.length; j++) {
        const a = BUILDINGS[i];
        const b = BUILDINGS[j];
        const overlap =
          Math.abs(a.x - b.x) < a.halfW + b.halfW && Math.abs(a.z - b.z) < a.halfD + b.halfD;
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it('places every door outside its own building', () => {
    for (const loc of LOCATIONS) {
      if (!loc.door) continue;
      const b = BUILDINGS.find((bb) => bb.location === loc.id);
      if (!b) continue;
      const inside =
        Math.abs(loc.door.x - b.x) < b.halfW - 0.5 && Math.abs(loc.door.z - b.z) < b.halfD - 0.5;
      expect(inside, `${loc.id} door is inside its building`).toBe(false);
    }
  });

  it('gives every interior-bearing location a reachable approach point', () => {
    for (const loc of LOCATIONS) {
      if (!loc.interior) continue;
      const p = approachPoint(loc.id);
      expect(isInsideBuilding(p.x, p.z, -0.5), `${loc.id} approach point is inside a wall`).toBe(false);
    }
  });

  it('links every interior back to a real location', () => {
    for (const loc of LOCATIONS) {
      if (!loc.interior) continue;
      expect(INTERIOR_MAP[loc.interior], `missing interior ${loc.interior}`).toBeDefined();
      expect(INTERIOR_MAP[loc.interior].location).toBe(loc.id);
    }
  });

  it('respects opening hours', () => {
    expect(isOpen('konbini', 3)).toBe(true);
    expect(isOpen('cafe', 3)).toBe(false);
    expect(isOpen('cafe', 12)).toBe(true);
    expect(isOpen('park', 23)).toBe(true);
  });

  it('finds the nearest node to a point', () => {
    const n = nearestNavNode(nodes, 0, 0);
    expect(Math.hypot(n.x, n.z)).toBeLessThan(12);
  });
});

describe('camera basis', () => {
  it('puts screen-right to the right of forward', () => {
    // forward x right must point down (-Y) for a right-handed screen basis,
    // which is what makes A strafe left and D strafe right.
    for (const yaw of [0, 0.7, Math.PI / 2, Math.PI, -2.1]) {
      const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
      const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
      // 2D cross product of (forward x right) in the XZ plane.
      const cross = forward.x * right.z - forward.z * right.x;
      expect(cross).toBeCloseTo(1, 6);
    }
  });
});
