import * as THREE from 'three';
import type { InteriorDefinition, InteractionTarget } from '@/game/types';
import { box, cylinder, emissive, glass, lambert, sphere } from '@/game/core/materials';
import { CollisionWorld } from './collision';
import { mergeStatics } from './mergeStatics';

export interface BuiltInterior {
  scene: THREE.Scene;
  root: THREE.Group;
  collision: CollisionWorld;
  interactions: InteractionTarget[];
  definition: InteriorDefinition;
  /** Point lights whose intensity is animated (flicker, arcade pulse). */
  animatedLights: THREE.PointLight[];
  dispose(): void;
}

/** Blocking footprint of each prop, used for collision. */
const PROP_FOOTPRINTS: Record<string, [number, number]> = {
  bed: [1.1, 1.05],
  nightstand: [0.35, 0.35],
  storage: [0.6, 0.9],
  desk: [0.9, 0.45],
  chair: [0.28, 0.28],
  bookshelf: [0.35, 0.9],
  fridge: [0.45, 0.45],
  kitchenCounter: [1.4, 0.4],
  sofa: [0.55, 1.1],
  lowTable: [0.6, 0.4],
  tv: [0.3, 0.7],
  wardrobe: [0.8, 0.35],
  register: [0.7, 0.5],
  counter: [0.5, 1.2],
  shelf: [1.4, 0.45],
  fridgeWall: [0.5, 2.2],
  magazineRack: [0.4, 1.1],
  crateStack: [0.6, 0.6],
  jobBoard: [0.2, 0.9],
  hotFoodCase: [0.8, 0.4],
  cafeCounter: [2.2, 0.6],
  espressoMachine: [0.4, 0.3],
  shelfBottles: [0.9, 0.3],
  table: [0.55, 0.55],
  produceStand: [0.9, 0.7],
  sellDesk: [0.5, 1.1],
  ramenCounter: [3.4, 0.8],
  stove: [0.6, 0.5],
  stool: [0.25, 0.25],
  benchPress: [0.7, 1.2],
  dumbbellRack: [0.45, 1.4],
  treadmill: [0.6, 1.1],
  punchBag: [0.35, 0.35],
  waterCooler: [0.3, 0.3],
  deskCluster: [1.5, 1.1],
  officeDesk: [1.0, 0.5],
  partition: [2.2, 0.15],
  locker: [0.35, 1.0],
  arcadeCabinet: [0.6, 0.55],
  craneMachine: [0.7, 0.7],
  tokenMachine: [0.45, 0.35],
  vending: [0.6, 0.4],
  feltTable: [1.5, 1.0],
  wheelStand: [0.9, 0.4],
  coinTable: [0.6, 0.9],
  highlowTable: [0.6, 0.9],
  safe: [0.5, 0.5],
  barCounter: [2.0, 0.5],
};

export function buildInterior(def: InteriorDefinition): BuiltInterior {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  scene.add(root);
  const collision = new CollisionWorld();
  const interactions: InteractionTarget[] = [];
  const animatedLights: THREE.PointLight[] = [];

  const w = def.width;
  const d = def.depth;
  const h = def.height;
  collision.setBounds({ minX: -w + 0.4, maxX: w - 0.4, minZ: -d + 0.4, maxZ: d + 1.5 });

  /* --------------------------------------------------------------- shell */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w * 2, d * 2), lambert(def.floorColor));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w * 2, d * 2), lambert('#f2eee6'));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = h;
  root.add(ceiling);

  const wallMat = lambert(def.wallColor);
  const wallT = 0.25;
  // Back and side walls are solid; the front wall has a doorway cut into it.
  const back = new THREE.Mesh(box(w * 2 + wallT * 2, h, wallT), wallMat);
  back.position.set(0, h / 2, -d - wallT / 2);
  root.add(back);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(box(wallT, h, d * 2 + wallT * 2), wallMat);
    side.position.set(s * (w + wallT / 2), h / 2, 0);
    root.add(side);
  }
  const doorHalf = 1.3;
  for (const s of [-1, 1]) {
    const segW = w - doorHalf;
    const seg = new THREE.Mesh(box(segW, h, wallT), wallMat);
    seg.position.set(s * (doorHalf + segW / 2), h / 2, d + wallT / 2);
    root.add(seg);
  }
  const lintel = new THREE.Mesh(box(doorHalf * 2, h - 2.3, wallT), wallMat);
  lintel.position.set(0, 2.3 + (h - 2.3) / 2, d + wallT / 2);
  root.add(lintel);

  // Skirting board reads as trim and hides the floor/wall seam.
  const trimMat = lambert(def.accentColor);
  const trimBack = new THREE.Mesh(box(w * 2, 0.16, 0.08), trimMat);
  trimBack.position.set(0, 0.08, -d + 0.04);
  root.add(trimBack);
  for (const s of [-1, 1]) {
    const t = new THREE.Mesh(box(0.08, 0.16, d * 2), trimMat);
    t.position.set(s * (w - 0.04), 0.08, 0);
    root.add(t);
  }

  // Doormat + exit marker.
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), lambert(def.accentColor));
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(def.exit.x, 0.02, def.exit.z - 0.6);
  root.add(mat);

  collision.add({ x: 0, z: -d - 0.2, halfW: w + 0.5, halfD: 0.3, id: 'wall-back' });
  for (const s of [-1, 1]) collision.add({ x: s * (w + 0.2), z: 0, halfW: 0.3, halfD: d + 0.5, id: 'wall-side' });
  for (const s of [-1, 1]) {
    const segW = w - doorHalf;
    collision.add({ x: s * (doorHalf + segW / 2), z: d + 0.2, halfW: segW / 2, halfD: 0.3, id: 'wall-front' });
  }

  /* -------------------------------------------------------------- lights */
  scene.add(new THREE.AmbientLight(new THREE.Color(def.lightColor), 0.55 * def.lightIntensity));
  const hemi = new THREE.HemisphereLight(new THREE.Color(def.lightColor), new THREE.Color(def.floorColor), 0.4);
  scene.add(hemi);

  const lampCount = w > 10 ? 3 : 2;
  for (let i = 0; i < lampCount; i++) {
    const x = (i / (lampCount - 1) - 0.5) * (w * 1.2);
    const light = new THREE.PointLight(new THREE.Color(def.lightColor), def.lightIntensity * 12, 26, 1.6);
    light.position.set(x, h - 0.45, 0);
    scene.add(light);
    if (def.id === 'int_arcade' || def.id === 'int_basement') animatedLights.push(light);

    const fixture = new THREE.Mesh(cylinder(0.42, 0.32, 0.14, 10), emissive(def.lightColor));
    fixture.position.set(x, h - 0.24, 0);
    root.add(fixture);
    const stem = new THREE.Mesh(cylinder(0.03, 0.03, 0.22, 5), lambert('#5f5f66'));
    stem.position.set(x, h - 0.11, 0);
    root.add(stem);
  }

  /* --------------------------------------------------------------- props */
  for (const prop of def.props) {
    const obj = createProp(prop.kind, def);
    if (obj) {
      obj.position.set(prop.x, 0, prop.z);
      obj.rotation.y = prop.rot ?? 0;
      root.add(obj);
    }
    const fp = PROP_FOOTPRINTS[prop.kind];
    if (fp) {
      const rot = prop.rot ?? 0;
      const swap = Math.abs(Math.sin(rot)) > 0.5;
      collision.add({
        x: prop.x,
        z: prop.z,
        halfW: swap ? fp[1] : fp[0],
        halfD: swap ? fp[0] : fp[1],
        id: prop.kind,
      });
    }
    if (prop.interaction) {
      const rot = prop.rot ?? 0;
      // Stand in front of the prop rather than inside it.
      const offset = fp ? Math.max(fp[0], fp[1]) + 0.6 : 1;
      interactions.push({
        id: `${def.id}:${prop.kind}:${prop.x},${prop.z}`,
        label: prop.label ?? prop.kind,
        icon: iconFor(prop.interaction),
        x: prop.x + Math.sin(rot) * offset,
        y: 1,
        z: prop.z + Math.cos(rot) * offset,
        radius: 2.2,
        kind: kindFor(prop.interaction),
        data: { action: prop.interaction, ...(prop.data ?? {}) },
      });
    }
  }

  interactions.push({
    id: `${def.id}:exit`,
    label: 'Go outside',
    icon: '🚪',
    x: def.exit.x,
    y: 1,
    z: def.exit.z - 0.4,
    radius: 2.2,
    kind: 'exit',
    data: { location: def.location },
  });

  mergeStatics(root);

  return {
    scene,
    root,
    collision,
    interactions,
    definition: def,
    animatedLights,
    dispose() {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      scene.clear();
    },
  };
}

function iconFor(action: string): string {
  if (action.startsWith('shop')) return '🛒';
  if (action.startsWith('sell')) return '💴';
  if (action.startsWith('job')) return '💼';
  if (action.startsWith('minigame')) return '🎮';
  if (action.startsWith('train')) return '🏋️';
  if (action === 'sleep') return '🛏️';
  if (action === 'storage') return '📦';
  if (action === 'study') return '📚';
  if (action === 'fridge') return '🍱';
  if (action === 'tv') return '📺';
  if (action === 'relax') return '🪑';
  if (action === 'vending') return '🥤';
  return '✋';
}

function kindFor(action: string): InteractionTarget['kind'] {
  if (action.startsWith('shop') || action.startsWith('sell') || action === 'vending') return 'shop';
  if (action.startsWith('job')) return 'job';
  if (action.startsWith('minigame')) return 'minigame';
  if (action === 'sleep') return 'bed';
  return 'prop';
}

/* ---------------------------------------------------------------- factory */

function createProp(kind: string, def: InteriorDefinition): THREE.Object3D | null {
  const accent = def.accentColor;
  const g = new THREE.Group();

  const add = (
    geo: THREE.BufferGeometry,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    rot?: [number, number, number],
  ) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  const wood = lambert('#a3805c');
  const darkWood = lambert('#6a5240');
  const metal = lambert('#9aa0a6');
  const dark = lambert('#3a3d44');
  const white = lambert('#f0ece4');
  const fabric = lambert(accent);

  switch (kind) {
    case 'bed':
      add(box(2.0, 0.34, 1.9), darkWood, 0, 0.2);
      add(box(1.9, 0.24, 1.8), white, 0, 0.48);
      add(box(1.9, 0.14, 1.1), fabric, 0, 0.62, 0.32);
      add(box(0.8, 0.16, 0.4), white, 0, 0.68, -0.66);
      add(box(2.0, 0.7, 0.14), darkWood, 0, 0.6, -0.98);
      break;
    case 'nightstand':
      add(box(0.6, 0.55, 0.55), wood, 0, 0.28);
      add(box(0.5, 0.06, 0.5), darkWood, 0, 0.58);
      add(cylinder(0.11, 0.14, 0.3, 8), emissive('#ffd9a0'), 0, 0.75);
      break;
    case 'storage':
      add(box(1.1, 0.8, 1.6), darkWood, 0, 0.4);
      add(box(1.14, 0.1, 1.64), lambert(accent), 0, 0.84);
      add(box(0.12, 0.12, 0.3), metal, 0.58, 0.5);
      break;
    case 'wardrobe':
      add(box(1.5, 2.1, 0.6), wood, 0, 1.05);
      add(box(0.05, 2.0, 0.02), dark, 0, 1.05, 0.31);
      add(sphere(0.05, 6, 5), metal, -0.12, 1.05, 0.33);
      add(sphere(0.05, 6, 5), metal, 0.12, 1.05, 0.33);
      break;
    case 'desk':
    case 'officeDesk':
      add(box(1.7, 0.08, 0.8), wood, 0, 0.74);
      for (const s of [-1, 1]) add(box(0.08, 0.74, 0.7), metal, s * 0.75, 0.37);
      add(box(0.6, 0.36, 0.05), dark, 0, 1.05, -0.3);
      add(box(0.62, 0.34, 0.02), emissive('#6d9fd0'), 0, 1.05, -0.27);
      add(box(0.4, 0.02, 0.16), dark, 0, 0.79, 0.12);
      break;
    case 'deskCluster':
      for (const s of [-1, 1]) {
        add(box(1.5, 0.07, 0.75), white, s * 0.8, 0.74);
        add(box(0.55, 0.34, 0.05), dark, s * 0.8, 1.02, -0.26);
        add(box(0.57, 0.32, 0.02), emissive('#7fb0d8'), s * 0.8, 1.02, -0.23);
        for (const t of [-1, 1]) add(box(0.06, 0.74, 0.65), metal, s * 0.8 + t * 0.68, 0.37);
      }
      add(box(3.2, 0.5, 0.06), lambert(accent), 0, 1.0, -0.4);
      break;
    case 'chair':
      add(box(0.46, 0.08, 0.46), wood, 0, 0.45);
      add(box(0.46, 0.5, 0.07), wood, 0, 0.72, -0.2);
      for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]] as const)
        add(box(0.05, 0.45, 0.05), darkWood, x, 0.22, z);
      break;
    case 'stool':
      add(cylinder(0.2, 0.2, 0.07, 10), fabric, 0, 0.62);
      add(cylinder(0.05, 0.07, 0.6, 8), metal, 0, 0.3);
      add(cylinder(0.2, 0.2, 0.03, 10), metal, 0, 0.02);
      break;
    case 'sofa':
      add(box(1.0, 0.4, 2.1), fabric, 0, 0.3);
      add(box(0.32, 0.7, 2.1), fabric, -0.36, 0.65);
      for (const z of [-0.7, 0.7]) add(box(1.0, 0.5, 0.28), fabric, 0.06, 0.65, z);
      add(box(1.0, 0.14, 1.9), lambert('#ffffff'), 0.08, 0.53);
      break;
    case 'lowTable':
      add(box(1.1, 0.07, 0.7), wood, 0, 0.4);
      for (const [x, z] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]] as const)
        add(box(0.06, 0.4, 0.06), darkWood, x, 0.2, z);
      add(cylinder(0.06, 0.05, 0.11, 8), white, 0.2, 0.49, 0);
      break;
    case 'tv':
      add(box(0.3, 0.5, 0.4), dark, 0, 0.25);
      add(box(0.12, 1.15, 1.85), dark, 0, 1.1);
      add(box(0.03, 1.0, 1.7), emissive('#2b3a4a'), 0.08, 1.1);
      break;
    case 'rug':
      add(new THREE.PlaneGeometry(3.0, 2.2), lambert(accent), 0, 0.015, 0, [-Math.PI / 2, 0, 0]);
      break;
    case 'bookshelf':
      add(box(0.4, 2.0, 1.8), darkWood, 0, 1.0);
      for (let i = 0; i < 4; i++) {
        add(box(0.36, 0.05, 1.7), wood, 0.02, 0.4 + i * 0.45);
        for (let b = 0; b < 7; b++) {
          const colors = ['#b5493f', '#3f6b8c', '#c8a24a', '#4f7f5b', '#7a5b8c'];
          add(box(0.24, 0.28, 0.06), lambert(colors[(i + b) % colors.length]), 0.02, 0.57 + i * 0.45, -0.7 + b * 0.22);
        }
      }
      break;
    case 'fridge':
      add(box(0.75, 1.75, 0.72), white, 0, 0.88);
      add(box(0.03, 0.04, 0.66), metal, 0.38, 1.3, 0.05);
      add(box(0.76, 0.03, 0.73), lambert('#d8d4cc'), 0, 1.15);
      break;
    case 'fridgeWall':
      add(box(0.7, 2.4, 4.4), white, 0, 1.2);
      add(box(0.06, 2.0, 4.1), glass('#bfe4ee', 0.4), 0.35, 1.25);
      for (let r = 0; r < 4; r++) {
        for (let cIdx = 0; cIdx < 9; cIdx++) {
          const colors = ['#e05252', '#4fb36b', '#e8b04b', '#5a8fd8', '#d86fb0', '#6ac5d8'];
          add(cylinder(0.07, 0.07, 0.2, 6), lambert(colors[(r + cIdx) % colors.length]), 0.16, 0.55 + r * 0.5, -1.9 + cIdx * 0.46);
        }
      }
      break;
    case 'kitchenCounter':
      add(box(2.8, 0.9, 0.7), white, 0, 0.45);
      add(box(2.85, 0.07, 0.76), lambert('#4a4d55'), 0, 0.92);
      add(box(0.5, 0.06, 0.4), metal, -0.7, 0.94);
      add(cylinder(0.03, 0.03, 0.3, 6), metal, -0.7, 1.1, -0.15);
      break;
    case 'stove':
      add(box(1.0, 0.9, 0.75), lambert('#5b5f66'), 0, 0.45);
      add(box(1.02, 0.05, 0.77), dark, 0, 0.93);
      for (const x of [-0.24, 0.24]) add(cylinder(0.16, 0.16, 0.03, 10), emissive('#e2643c'), x, 0.96);
      add(cylinder(0.24, 0.22, 0.26, 10), metal, -0.24, 1.1);
      break;
    case 'register':
      add(box(1.6, 1.0, 0.8), white, 0, 0.5);
      add(box(1.64, 0.06, 0.84), lambert(accent), 0, 1.03);
      add(box(0.45, 0.28, 0.4), dark, 0, 1.2);
      add(box(0.4, 0.2, 0.02), emissive('#9fe0c0'), 0, 1.26, 0.21);
      break;
    case 'counter':
    case 'sellDesk':
      add(box(1.0, 1.0, 2.4), white, 0, 0.5);
      add(box(1.06, 0.06, 2.46), lambert(accent), 0, 1.03);
      break;
    case 'cafeCounter':
      add(box(4.4, 1.05, 1.1), darkWood, 0, 0.52);
      add(box(4.5, 0.08, 1.2), lambert('#2f2a26'), 0, 1.08);
      add(box(4.2, 0.5, 0.06), lambert(accent), 0, 0.75, 0.58);
      break;
    case 'barCounter':
      add(box(4.0, 1.05, 0.9), darkWood, 0, 0.52);
      add(box(4.1, 0.08, 1.0), lambert('#2b2029'), 0, 1.08);
      for (let i = 0; i < 5; i++) add(cylinder(0.05, 0.05, 0.24, 6), lambert('#8fa87a'), -1.6 + i * 0.8, 1.2, -0.2);
      break;
    case 'ramenCounter':
      add(box(6.8, 1.05, 1.5), darkWood, 0, 0.52);
      add(box(6.9, 0.08, 1.6), lambert('#e8b04b'), 0, 1.08);
      for (let i = 0; i < 5; i++) add(cylinder(0.16, 0.13, 0.12, 10), white, -2.4 + i * 1.2, 1.18, 0.4);
      break;
    case 'espressoMachine':
      add(box(0.8, 0.5, 0.5), metal, 0, 1.35);
      add(box(0.7, 0.12, 0.06), lambert(accent), 0, 1.5, 0.26);
      for (const x of [-0.2, 0.2]) add(cylinder(0.05, 0.05, 0.16, 6), dark, x, 1.16, 0.2);
      break;
    case 'shelfBottles':
      add(box(1.8, 0.06, 0.35), wood, 0, 1.5);
      add(box(1.8, 0.06, 0.35), wood, 0, 1.9);
      for (let i = 0; i < 12; i++) {
        const colors = ['#7a9a4a', '#b5843f', '#8c5b7a', '#4f7f8c'];
        add(cylinder(0.05, 0.06, 0.28, 6), lambert(colors[i % 4]), -0.75 + (i % 6) * 0.3, i < 6 ? 1.67 : 2.07);
      }
      break;
    case 'shelf':
      add(box(2.8, 0.1, 0.9), white, 0, 0.35);
      add(box(2.8, 0.1, 0.9), white, 0, 0.9);
      add(box(2.8, 0.1, 0.9), white, 0, 1.45);
      add(box(2.8, 1.9, 0.06), lambert('#dfe2e6'), 0, 0.95, -0.44);
      for (let r = 0; r < 3; r++)
        for (let i = 0; i < 8; i++) {
          const colors = ['#e0a63c', '#7fb36b', '#d8687f', '#6f9fd8', '#c9a24f'];
          add(box(0.22, 0.3, 0.2), lambert(colors[(r + i) % colors.length]), -1.2 + i * 0.34, 0.55 + r * 0.55, 0.1);
        }
      break;
    case 'produceStand':
      add(box(1.8, 0.75, 1.4), wood, 0, 0.38);
      add(box(1.84, 0.08, 1.44), lambert('#5f8f4c'), 0, 0.78);
      for (let i = 0; i < 9; i++) {
        const colors = ['#d8503c', '#e2a53c', '#6fa84f', '#c94f7a'];
        add(sphere(0.12, 7, 5), lambert(colors[i % 4]), -0.6 + (i % 3) * 0.6, 0.9, -0.4 + Math.floor(i / 3) * 0.4);
      }
      break;
    case 'hotFoodCase':
      add(box(1.6, 1.0, 0.8), metal, 0, 0.5);
      add(box(1.5, 0.6, 0.7), glass('#e8f0f4', 0.35), 0, 1.3);
      add(box(1.5, 0.06, 0.7), lambert('#e8b04b'), 0, 1.02);
      break;
    case 'magazineRack':
      add(box(0.7, 1.6, 2.2), lambert('#dfe2e6'), 0, 0.8);
      for (let r = 0; r < 4; r++)
        for (let i = 0; i < 5; i++)
          add(box(0.04, 0.34, 0.26), lambert(['#e05a5a', '#5a8fe0', '#e0c05a', '#5ae08f'][i % 4]), 0.37, 0.35 + r * 0.4, -0.9 + i * 0.44);
      break;
    case 'crateStack':
      for (let i = 0; i < 3; i++) add(box(1.0, 0.5, 1.0), lambert(i % 2 ? '#b08a5c' : '#c79a68'), (i % 2) * 0.1, 0.25 + i * 0.5);
      break;
    case 'jobBoard':
      add(box(0.12, 1.4, 2.0), darkWood, 0, 1.4);
      for (let i = 0; i < 5; i++)
        add(box(0.02, 0.36, 0.28), lambert(['#f4f0e4', '#e8eef4', '#f6ecd8'][i % 3]), 0.08, 1.05 + (i % 2) * 0.5, -0.7 + i * 0.35);
      break;
    case 'noticeBoard':
      add(box(0.12, 1.2, 1.8), darkWood, 0, 1.3);
      break;
    case 'partition':
      add(box(4.4, 1.5, 0.12), lambert('#cfd6dc'), 0, 0.75);
      add(box(4.4, 0.08, 0.16), lambert(accent), 0, 1.52);
      break;
    case 'whiteboard':
      add(box(4.0, 1.6, 0.1), white, 0, 1.7);
      add(box(4.1, 0.08, 0.16), metal, 0, 0.88);
      for (let i = 0; i < 3; i++) add(box(0.9, 0.05, 0.02), lambert(['#4a7fc8', '#c85a4a', '#4aa87a'][i]), -0.9 + i * 0.9, 1.9 - i * 0.3, 0.06);
      break;
    case 'locker':
      for (let i = 0; i < 3; i++) {
        add(box(0.6, 1.8, 0.6), lambert('#7f8a94'), 0, 0.9, -0.65 + i * 0.65);
        add(box(0.03, 1.7, 0.55), lambert('#6d7882'), 0.31, 0.9, -0.65 + i * 0.65);
      }
      break;
    case 'waterCooler':
      add(box(0.42, 1.0, 0.42), white, 0, 0.5);
      add(cylinder(0.19, 0.19, 0.5, 10), glass('#bfe4ee', 0.55), 0, 1.25);
      add(box(0.2, 0.1, 0.1), lambert('#5a8fd8'), 0, 0.72, 0.22);
      break;
    case 'benchPress':
      add(box(0.5, 0.4, 1.9), fabric, 0, 0.45);
      for (const z of [-0.7, 0.7]) add(box(0.4, 0.42, 0.1), metal, 0, 0.22, z);
      for (const s of [-1, 1]) add(cylinder(0.05, 0.05, 1.2, 6), metal, s * 0.55, 0.6, -0.75);
      add(cylinder(0.03, 0.03, 2.0, 6), lambert('#5f6368'), 0, 1.2, -0.75, [0, 0, Math.PI / 2]);
      for (const s of [-1, 1]) add(cylinder(0.24, 0.24, 0.09, 12), dark, s * 0.82, 1.2, -0.75, [0, 0, Math.PI / 2]);
      break;
    case 'dumbbellRack':
      add(box(0.6, 0.7, 2.4), metal, 0, 0.35);
      add(box(0.65, 0.08, 2.45), dark, 0, 0.74);
      for (let i = 0; i < 5; i++) {
        add(cylinder(0.03, 0.03, 0.4, 6), metal, 0, 0.85, -1.0 + i * 0.5, [0, 0, Math.PI / 2]);
        for (const s of [-1, 1]) add(cylinder(0.1, 0.1, 0.09, 10), dark, s * 0.2, 0.85, -1.0 + i * 0.5, [0, 0, Math.PI / 2]);
      }
      break;
    case 'treadmill':
      add(box(0.9, 0.28, 1.9), dark, 0, 0.16);
      add(box(0.75, 0.05, 1.6), lambert('#2a2c31'), 0, 0.31);
      for (const s of [-1, 1]) add(cylinder(0.04, 0.04, 1.1, 6), metal, s * 0.42, 0.68, -0.8, [0.25, 0, 0]);
      add(box(0.9, 0.4, 0.14), lambert('#4a4d55'), 0, 1.15, -0.92);
      add(box(0.7, 0.28, 0.03), emissive('#8fd8c0'), 0, 1.18, -0.85);
      break;
    case 'punchBag':
      add(cylinder(0.03, 0.03, 0.6, 5), metal, 0, 2.2);
      add(cylinder(0.28, 0.32, 1.5, 12), lambert('#5a3d33'), 0, 1.15);
      add(cylinder(0.3, 0.3, 0.1, 12), lambert(accent), 0, 1.9);
      break;
    case 'matArea':
      add(new THREE.PlaneGeometry(5, 4), lambert('#4a6b5b'), 0, 0.02, 0, [-Math.PI / 2, 0, 0]);
      break;
    case 'mirror':
      add(box(0.1, 2.0, 2.6), lambert('#8f959b'), 0, 1.2);
      add(box(0.04, 1.85, 2.45), lambert('#cfe0e8'), 0.06, 1.2);
      break;
    case 'plant':
      add(cylinder(0.24, 0.3, 0.45, 10), lambert('#a8734a'), 0, 0.22);
      for (let i = 0; i < 5; i++) {
        const leaf = add(sphere(0.3, 7, 5), lambert(i % 2 ? '#4f7f43' : '#63975a'), (Math.random() - 0.5) * 0.5, 0.7 + Math.random() * 0.5, (Math.random() - 0.5) * 0.5);
        leaf.scale.set(1, 0.5, 1);
      }
      break;
    case 'poster':
      add(box(1.2, 1.6, 0.04), lambert(accent), 0, 1.8);
      add(box(1.05, 1.42, 0.02), lambert('#f0ece0'), 0, 1.8, 0.03);
      break;
    case 'floorLamp':
    case 'lamp':
      add(cylinder(0.22, 0.24, 0.06, 10), dark, 0, 0.03);
      add(cylinder(0.03, 0.03, 1.6, 6), metal, 0, 0.8);
      add(cylinder(0.26, 0.34, 0.4, 10), emissive('#ffe0b0'), 0, 1.8);
      break;
    case 'arcadeCabinet':
      add(box(0.9, 1.9, 0.9), lambert('#2b2438'), 0, 0.95);
      add(box(0.78, 0.62, 0.06), emissive('#6ad8e0'), 0, 1.42, 0.44);
      add(box(0.82, 0.24, 0.3), lambert('#1a1626'), 0, 1.0, 0.42, [0.4, 0, 0]);
      for (let i = 0; i < 3; i++) add(cylinder(0.05, 0.05, 0.05, 8), emissive(['#ff4d6d', '#4dff9f', '#ffd84d'][i]), -0.2 + i * 0.2, 1.06, 0.42);
      add(box(0.9, 0.3, 0.08), emissive(accent), 0, 1.92, 0.42);
      break;
    case 'craneMachine':
      add(box(1.1, 0.8, 1.1), lambert('#e05a8a'), 0, 0.4);
      add(box(1.05, 1.3, 1.05), glass('#dff0f6', 0.3), 0, 1.45);
      add(box(1.15, 0.16, 1.15), lambert('#f0c94a'), 0, 2.15);
      for (let i = 0; i < 6; i++)
        add(sphere(0.15, 7, 5), lambert(['#f0a0b8', '#a0d8f0', '#f0e0a0'][i % 3]), -0.3 + (i % 3) * 0.3, 0.95, -0.25 + Math.floor(i / 3) * 0.4);
      break;
    case 'tokenMachine':
      add(box(0.8, 1.5, 0.6), lambert('#3f4a6b'), 0, 0.75);
      add(box(0.5, 0.4, 0.05), emissive('#ffd84d'), 0, 1.15, 0.32);
      add(box(0.4, 0.14, 0.08), dark, 0, 0.55, 0.32);
      break;
    case 'vending':
      add(box(1.1, 1.9, 0.75), lambert('#2f7fd8'), 0, 0.95);
      add(box(0.92, 1.15, 0.06), emissive('#fff6df'), -0.05, 1.25, 0.39);
      break;
    case 'scoreBoard':
      add(box(3.4, 1.6, 0.12), lambert('#1a1626'), 0, 1.9);
      for (let i = 0; i < 5; i++) add(box(2.8, 0.14, 0.04), emissive(i === 0 ? '#ffd84d' : '#6ad8e0'), 0, 2.5 - i * 0.28, 0.08);
      break;
    case 'neonStrip':
      for (let i = 0; i < 4; i++) {
        add(box(0.1, 0.1, 8), emissive(['#ff4d8d', '#4dd2ff', '#ffe14d', '#9d4dff'][i]), -4 + i * 2.6, 3.6, 0);
      }
      break;
    case 'feltTable':
      add(cylinder(1.5, 1.5, 0.12, 20), lambert('#2f6b4a'), 0, 0.78);
      add(new THREE.TorusGeometry(1.5, 0.09, 6, 24), darkWood, 0, 0.82, 0, [Math.PI / 2, 0, 0]);
      add(cylinder(0.16, 0.3, 0.76, 8), darkWood, 0, 0.38);
      add(cylinder(0.7, 0.7, 0.06, 12), dark, 0, 0.03);
      for (let i = 0; i < 4; i++) add(box(0.16, 0.02, 0.24), lambert('#f0ece0'), -0.5 + i * 0.34, 0.86, 0.5);
      break;
    case 'coinTable':
    case 'highlowTable':
      add(box(1.1, 0.1, 1.8), lambert('#3f5a6b'), 0, 0.78);
      add(box(0.9, 0.76, 1.6), darkWood, 0, 0.38);
      add(cylinder(0.09, 0.09, 0.02, 12), emissive('#f0c94a'), 0, 0.85, 0.2);
      break;
    case 'wheelStand':
      add(box(1.8, 0.9, 0.7), darkWood, 0, 0.45);
      add(cylinder(1.0, 1.0, 0.14, 18), lambert('#8a2f3f'), 0, 1.9, 0, [Math.PI / 2, 0, 0]);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        add(box(0.9, 0.02, 0.16), lambert(i % 2 ? '#f0c94a' : '#f0ece0'), Math.cos(a) * 0.5, 1.9 + Math.sin(a) * 0.5, 0.09, [0, 0, a]);
      }
      add(box(0.1, 0.3, 0.1), lambert('#f0ece0'), 0, 3.0, 0.12);
      break;
    case 'safe':
      add(box(0.9, 1.1, 0.9), lambert('#4a4d55'), 0, 0.55);
      add(cylinder(0.16, 0.16, 0.1, 10), metal, 0, 0.6, 0.46, [Math.PI / 2, 0, 0]);
      add(box(0.5, 0.1, 0.06), metal, 0, 0.9, 0.46);
      break;
    case 'table':
      add(cylinder(0.55, 0.55, 0.07, 14), wood, 0, 0.72);
      add(cylinder(0.08, 0.16, 0.7, 8), darkWood, 0, 0.35);
      add(cylinder(0.35, 0.35, 0.04, 12), darkWood, 0, 0.02);
      add(cylinder(0.06, 0.05, 0.1, 8), white, 0.15, 0.8, 0.05);
      break;
    case 'noren':
      add(cylinder(0.04, 0.04, 2.4, 6), darkWood, 0, 2.1, 0, [0, 0, Math.PI / 2]);
      for (let i = 0; i < 3; i++) add(box(0.72, 0.75, 0.02), lambert('#2f4858'), -0.8 + i * 0.8, 1.72);
      break;
    case 'lantern':
      add(cylinder(0.24, 0.24, 0.55, 10), emissive('#e05a4a'), 0, 2.2);
      add(cylinder(0.03, 0.03, 0.5, 5), dark, 0, 2.7);
      break;
    default:
      return null;
  }
  return g;
}
