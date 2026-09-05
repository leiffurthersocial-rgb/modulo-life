/**
 * Geometric description of the neighbourhood: roads, building footprints and
 * the navigation graph NPCs walk along. Kept free of three.js so that
 * pathfinding can be unit-tested.
 */

export interface RoadEW {
  axis: 'ew';
  z: number;
  x1: number;
  x2: number;
  width: number;
  name: string;
}
export interface RoadNS {
  axis: 'ns';
  x: number;
  z1: number;
  z2: number;
  width: number;
  name: string;
}
export type Road = RoadEW | RoadNS;

export const ROADS: Road[] = [
  { axis: 'ew', z: -55, x1: -100, x2: 100, width: 10, name: 'Kita Street' },
  { axis: 'ew', z: 0, x1: -100, x2: 105, width: 14, name: 'Main Street' },
  { axis: 'ew', z: 55, x1: -100, x2: 100, width: 10, name: 'Minami Street' },
  { axis: 'ew', z: 84, x1: -44, x2: 62, width: 8, name: 'Riverside Walk' },
  { axis: 'ns', x: -58, z1: -80, z2: 80, width: 10, name: 'West Street' },
  { axis: 'ns', x: 0, z1: -80, z2: 88, width: 12, name: 'Center Street' },
  { axis: 'ns', x: 58, z1: -80, z2: 80, width: 10, name: 'East Street' },
  { axis: 'ew', z: 22, x1: 58, x2: 96, width: 8, name: 'Shrine Lane' },
];

export const WORLD_BOUNDS = { minX: -108, maxX: 112, minZ: -88, maxZ: 100 };

/** Radius of the paved roundabout at the origin. */
export const PLAZA_RADIUS = 15;

export type BuildingStyle =
  | 'house'
  | 'shop'
  | 'market'
  | 'arcade'
  | 'block'
  | 'tower'
  | 'apartment'
  | 'shed';

export interface BuildingFootprint {
  id: string;
  /** Location id this building belongs to, when it has one. */
  location?: string;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  height: number;
  style: BuildingStyle;
  wall: string;
  roof: string;
  accent: string;
  /** Sign text rendered on the facade (canvas texture). */
  sign?: string;
  signColor?: string;
  /** Yaw of the front face, 0 = facing +Z. */
  facing: number;
}

const HOUSE_PALETTES: Array<[string, string, string]> = [
  ['#efe6d8', '#5d6b74', '#c4a882'],
  ['#e6dfd2', '#7a5a4a', '#a9b7a0'],
  ['#f2ece0', '#4f5b62', '#d4b58e'],
  ['#e8e2d6', '#6b5344', '#9fb0bd'],
  ['#f0e8db', '#55606a', '#cbb197'],
  ['#eae3d5', '#7b6250', '#b6c1ae'],
  ['#f3ede2', '#4b5560', '#d8bfa0'],
  ['#e7e0d3', '#6f5a4c', '#a8b6c2'],
];

function house(id: string, location: string, x: number, z: number, facing: number, i: number): BuildingFootprint {
  const [wall, roof, accent] = HOUSE_PALETTES[i % HOUSE_PALETTES.length];
  return { id, location, x, z, halfW: 7, halfD: 6, height: 5.6, style: 'house', wall, roof, accent, facing };
}

export const BUILDINGS: BuildingFootprint[] = [
  {
    id: 'b_konbini',
    location: 'konbini',
    x: -40,
    z: -16,
    halfW: 10,
    halfD: 6.5,
    height: 5,
    style: 'shop',
    wall: '#f4f6f8',
    roof: '#d8dee4',
    accent: '#2fa4d8',
    sign: 'MODULO MART',
    signColor: '#2fa4d8',
    facing: 0,
  },
  {
    id: 'b_cafe',
    location: 'cafe',
    x: -17,
    z: -16.5,
    halfW: 8,
    halfD: 6.5,
    height: 6,
    style: 'shop',
    wall: '#e9dfd0',
    roof: '#6d5342',
    accent: '#b5794a',
    sign: 'KOTORI',
    signColor: '#8a5a34',
    facing: 0,
  },
  {
    id: 'b_arcade',
    location: 'arcade',
    x: 18,
    z: -17,
    halfW: 9.5,
    halfD: 7.5,
    height: 8,
    style: 'arcade',
    wall: '#2a2233',
    roof: '#1a1522',
    accent: '#ff4d8d',
    sign: 'NEON ALLEY',
    signColor: '#ff4d8d',
    facing: 0,
  },
  {
    id: 'b_supermarket',
    location: 'supermarket',
    x: 40,
    z: 19,
    halfW: 10.5,
    halfD: 9.5,
    height: 7,
    style: 'market',
    wall: '#f1ece3',
    roof: '#c9ccd2',
    accent: '#e88aa8',
    sign: 'SAKURA FOODS',
    signColor: '#d9628c',
    facing: Math.PI,
  },
  {
    id: 'b_restaurant',
    location: 'restaurant',
    x: -40,
    z: 16,
    halfW: 8.5,
    halfD: 6.5,
    height: 5.5,
    style: 'shop',
    wall: '#3a2a24',
    roof: '#241a16',
    accent: '#e8b04b',
    sign: 'ICHIYA',
    signColor: '#e8b04b',
    facing: Math.PI,
  },
  {
    id: 'b_gym',
    location: 'gym',
    x: 18,
    z: 18,
    halfW: 9,
    halfD: 8,
    height: 7,
    style: 'block',
    wall: '#d9d5cc',
    roof: '#8f9296',
    accent: '#3f7d5a',
    sign: 'IRON PINE',
    signColor: '#3f7d5a',
    facing: Math.PI,
  },
  {
    id: 'b_office',
    location: 'office',
    x: 21,
    z: -36,
    halfW: 12,
    halfD: 10,
    height: 17,
    style: 'tower',
    wall: '#c9ced6',
    roof: '#8d949e',
    accent: '#4a6b8a',
    sign: 'MODULO WORKS',
    signColor: '#3d5a75',
    facing: -Math.PI / 2,
  },

  house('b_home_robin', 'home_robin', -74, -34, Math.PI / 2, 0),
  house('b_home_leif', 'home_leif', -74, -16, Math.PI / 2, 1),
  house('b_home_jovan', 'home_jovan', -74, 22, Math.PI / 2, 2),
  house('b_home_lenni', 'home_lenni', -30, -70, 0, 3),
  house('b_home_erim', 'home_erim', 16, -70, 0, 4),
  house('b_home_till', 'home_till', 34, -70, 0, 5),
  house('b_home_tusya', 'home_tusya', -20, 70, Math.PI, 6),
  house('b_home_leonidas', 'home_leonidas', 16, 70, Math.PI, 7),

  /* Filler buildings: no interiors, but they make the blocks feel inhabited. */
  { id: 'f1', x: -18, z: -38, halfW: 9, halfD: 8, height: 13, style: 'apartment', wall: '#dcd6cc', roof: '#9aa0a6', accent: '#8fa5b5', facing: Math.PI / 2 },
  { id: 'f2', x: 42, z: -18, halfW: 8, halfD: 7, height: 9, style: 'apartment', wall: '#e3ddd2', roof: '#a5a09a', accent: '#c08f6a', facing: 0 },
  { id: 'f3', x: 42, z: -38, halfW: 8, halfD: 7, height: 11, style: 'apartment', wall: '#d5d9dd', roof: '#8e949a', accent: '#7d94a8', facing: -Math.PI / 2 },
  { id: 'f4', x: -74, z: 40, halfW: 7, halfD: 6, height: 5.6, style: 'house', wall: '#ece5d8', roof: '#6a5648', accent: '#b8c2b0', facing: Math.PI / 2 },
  { id: 'f5', x: -74, z: -70, halfW: 7, halfD: 6, height: 5.6, style: 'house', wall: '#e6e0d3', roof: '#5a6670', accent: '#c9ae8c', facing: Math.PI / 2 },
  { id: 'f6', x: 73, z: -34, halfW: 7, halfD: 8, height: 12, style: 'apartment', wall: '#ded8ce', roof: '#979da3', accent: '#a08a72', facing: -Math.PI / 2 },
  { id: 'f7', x: 78, z: -70, halfW: 7, halfD: 6, height: 5.6, style: 'house', wall: '#f0e9dc', roof: '#6d5a4a', accent: '#aeb9a6', facing: Math.PI },
  { id: 'f8', x: -42, z: 70, halfW: 7, halfD: 6, height: 5.6, style: 'house', wall: '#e9e2d5', roof: '#525d67', accent: '#cbb094', facing: Math.PI },
  { id: 'f9', x: 42, z: 70, halfW: 7, halfD: 6, height: 5.6, style: 'house', wall: '#efe8db', roof: '#74604f', accent: '#b3bfae', facing: Math.PI },
  { id: 'f10', x: -88, z: -20, halfW: 4, halfD: 4, height: 3.2, style: 'shed', wall: '#cfc7ba', roof: '#6d6a64', accent: '#8a8378', facing: Math.PI / 2 },
  { id: 'f11', x: 76, z: 70, halfW: 8, halfD: 7, height: 6, style: 'block', wall: '#ddd7cd', roof: '#93989e', accent: '#8aa08f', facing: Math.PI },
  { id: 'f12', x: -90, z: -40, halfW: 8, halfD: 7, height: 10, style: 'apartment', wall: '#d9d3c9', roof: '#8f9499', accent: '#9a8fa8', facing: Math.PI / 2 },
];

export const BUILDING_MAP: Record<string, BuildingFootprint> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b]),
);

/* ---------------------------------------------------------------- nav graph */

export interface NavNode {
  id: number;
  x: number;
  z: number;
  links: number[];
}

/**
 * Samples every road into nodes and welds nodes that are close together, which
 * naturally produces connected intersections. Deterministic, so NPC paths are
 * reproducible between sessions.
 */
export function buildNavGraph(spacing = 11): NavNode[] {
  const nodes: NavNode[] = [];
  const add = (x: number, z: number): NavNode => {
    const n: NavNode = { id: nodes.length, x, z, links: [] };
    nodes.push(n);
    return n;
  };

  for (const road of ROADS) {
    const [a, b] = road.axis === 'ew' ? [road.x1, road.x2] : [road.z1, road.z2];
    const len = b - a;
    const steps = Math.max(1, Math.round(len / spacing));
    let prev: NavNode | null = null;
    for (let i = 0; i <= steps; i++) {
      const t = a + (len * i) / steps;
      const n = road.axis === 'ew' ? add(t, road.z) : add(road.x, t);
      if (prev) {
        prev.links.push(n.id);
        n.links.push(prev.id);
      }
      prev = n;
    }
  }

  // Weld nearby nodes from different roads to form intersections.
  const weld = spacing * 0.75;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dz = nodes[i].z - nodes[j].z;
      if (dx * dx + dz * dz <= weld * weld && !nodes[i].links.includes(j)) {
        nodes[i].links.push(j);
        nodes[j].links.push(i);
      }
    }
  }
  return nodes;
}

export function nearestNavNode(nodes: NavNode[], x: number, z: number): NavNode {
  let best = nodes[0];
  let bestD = Infinity;
  for (const n of nodes) {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

/** A* across the road graph. Returns world-space waypoints (excluding start). */
export function findPath(
  nodes: NavNode[],
  from: { x: number; z: number },
  to: { x: number; z: number },
): Array<{ x: number; z: number }> {
  const start = nearestNavNode(nodes, from.x, from.z);
  const goal = nearestNavNode(nodes, to.x, to.z);
  if (start.id === goal.id) return [{ x: to.x, z: to.z }];

  const dist = new Float64Array(nodes.length).fill(Infinity);
  const prev = new Int32Array(nodes.length).fill(-1);
  const visited = new Uint8Array(nodes.length);
  dist[start.id] = 0;

  const h = (n: NavNode) => Math.hypot(n.x - goal.x, n.z - goal.z);
  // Small graph: a linear scan open set is cheaper than a heap here.
  for (;;) {
    let cur = -1;
    let bestF = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      if (visited[i] || dist[i] === Infinity) continue;
      const f = dist[i] + h(nodes[i]);
      if (f < bestF) {
        bestF = f;
        cur = i;
      }
    }
    if (cur === -1) break;
    if (cur === goal.id) break;
    visited[cur] = 1;
    for (const l of nodes[cur].links) {
      const d = dist[cur] + Math.hypot(nodes[cur].x - nodes[l].x, nodes[cur].z - nodes[l].z);
      if (d < dist[l]) {
        dist[l] = d;
        prev[l] = cur;
      }
    }
  }

  if (dist[goal.id] === Infinity) return [{ x: to.x, z: to.z }];
  const path: Array<{ x: number; z: number }> = [];
  let c = goal.id;
  while (c !== -1) {
    path.push({ x: nodes[c].x, z: nodes[c].z });
    if (c === start.id) break;
    c = prev[c];
  }
  path.reverse();
  path.shift(); // drop the node we are effectively standing on
  path.push({ x: to.x, z: to.z });
  return path;
}

/** True when the point is inside any building footprint (plus margin). */
export function isInsideBuilding(x: number, z: number, margin = 0): boolean {
  for (const b of BUILDINGS) {
    if (
      x > b.x - b.halfW - margin &&
      x < b.x + b.halfW + margin &&
      z > b.z - b.halfD - margin &&
      z < b.z + b.halfD + margin
    ) {
      return true;
    }
  }
  return false;
}
