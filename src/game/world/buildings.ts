import * as THREE from 'three';
import type { BuildingFootprint } from '@/data/world-layout';
import { box, cylinder, emissive, glass, glowTexture, lambert, shopGlassMaterial, signTexture, windowMaterial } from '@/game/core/materials';

export interface BuiltBuilding {
  group: THREE.Group;
  /** Emissive materials that should switch on after dark. */
  lit: THREE.Object3D[];
  windows: THREE.Mesh[];
}

/**
 * Builds one building from its footprint. Styles differ in roof shape, window
 * pattern and signage so a street of eight houses does not read as one shape
 * repeated eight times.
 */
export function createBuilding(b: BuildingFootprint): BuiltBuilding {
  const group = new THREE.Group();
  group.position.set(b.x, 0, b.z);
  const lit: THREE.Object3D[] = [];
  const windows: THREE.Mesh[] = [];

  const w = b.halfW * 2;
  const d = b.halfD * 2;
  const wallMat = lambert(b.wall);
  const roofMat = lambert(b.roof);
  const accentMat = lambert(b.accent);

  const body = new THREE.Mesh(box(w, b.height, d), wallMat);
  body.position.y = b.height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // A plinth grounds the building instead of letting it float on the terrain.
  const plinth = new THREE.Mesh(box(w + 0.5, 0.35, d + 0.5), lambert('#9a958c'));
  plinth.position.y = 0.17;
  plinth.receiveShadow = true;
  group.add(plinth);

  switch (b.style) {
    case 'house':
      addGableRoof(group, w, d, b.height, roofMat);
      addWindowGrid(group, b, 2, 1, windows);
      addPorch(group, b, accentMat);
      break;
    case 'shop':
      addFlatRoof(group, w, d, b.height, roofMat, 0.32);
      addShopFront(group, b, accentMat, windows);
      break;
    case 'market':
      addFlatRoof(group, w, d, b.height, roofMat, 0.4);
      addShopFront(group, b, accentMat, windows);
      addAwning(group, b, accentMat);
      break;
    case 'arcade':
      addFlatRoof(group, w, d, b.height, roofMat, 0.3);
      addShopFront(group, b, accentMat, windows);
      addNeonTrim(group, b, lit);
      break;
    case 'block':
      addFlatRoof(group, w, d, b.height, roofMat, 0.25);
      addWindowGrid(group, b, 3, 2, windows);
      break;
    case 'tower':
      addFlatRoof(group, w, d, b.height, roofMat, 0.3);
      addWindowGrid(group, b, 4, 5, windows);
      addRooftopUnit(group, b, roofMat);
      break;
    case 'apartment':
      addFlatRoof(group, w, d, b.height, roofMat, 0.28);
      addWindowGrid(group, b, 3, Math.max(2, Math.floor(b.height / 3.2)), windows);
      addBalconies(group, b, accentMat);
      break;
    case 'shed':
      addGableRoof(group, w, d, b.height, roofMat);
      break;
  }

  if (b.sign) {
    const sign = createSign(b);
    if (sign) {
      group.add(sign);
      lit.push(sign);
    }
  }

  group.rotation.y = 0;
  return { group, lit, windows };
}

function addGableRoof(group: THREE.Group, w: number, d: number, h: number, mat: THREE.Material): void {
  const roof = new THREE.Mesh(cylinder(0, Math.max(w, d) * 0.78, 2.4, 4), mat);
  roof.position.y = h + 1.05;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(w / Math.max(w, d) * 1.02, 1, (d / Math.max(w, d)) * 1.02);
  roof.castShadow = true;
  group.add(roof);
  const eave = new THREE.Mesh(box(w + 1.1, 0.22, d + 1.1), mat);
  eave.position.y = h + 0.05;
  eave.castShadow = true;
  group.add(eave);
}

function addFlatRoof(group: THREE.Group, w: number, d: number, h: number, mat: THREE.Material, lip: number): void {
  const roof = new THREE.Mesh(box(w + 0.6, 0.3, d + 0.6), mat);
  roof.position.y = h + 0.15;
  roof.castShadow = true;
  group.add(roof);
  const parapet = new THREE.Mesh(box(w + 0.6, lip * 2, d + 0.6), mat);
  parapet.position.y = h + 0.3 + lip;
  group.add(parapet);
  const inner = new THREE.Mesh(box(w - 0.4, lip * 2 + 0.1, d - 0.4), lambert('#6f6a63'));
  inner.position.y = h + 0.3 + lip;
  group.add(inner);
}

function addWindowGrid(
  group: THREE.Group,
  b: BuildingFootprint,
  cols: number,
  rows: number,
  windows: THREE.Mesh[],
): void {
  const winMat = windowMaterial();
  const frameMat = lambert('#f2efe8');
  const floorH = b.height / (rows + 0.4);
  for (let r = 0; r < rows; r++) {
    const y = 1.2 + r * floorH;
    if (y + 0.9 > b.height) continue;
    for (let c = 0; c < cols; c++) {
      const t = cols === 1 ? 0.5 : c / (cols - 1);
      const x = (t - 0.5) * (b.halfW * 2 - 2.4);
      for (const side of [1, -1]) {
        const frame = new THREE.Mesh(box(1.25, 1.15, 0.12), frameMat);
        frame.position.set(x, y, side * (b.halfD + 0.06));
        group.add(frame);
        const pane = new THREE.Mesh(box(1.05, 0.95, 0.08), winMat);
        pane.position.set(x, y, side * (b.halfD + 0.12));
        group.add(pane);
        windows.push(pane);
      }
    }
    // Side elevations get a couple of windows too.
    for (const side of [1, -1]) {
      const frame = new THREE.Mesh(box(0.12, 1.15, 1.25), frameMat);
      frame.position.set(side * (b.halfW + 0.06), y, 0);
      group.add(frame);
      const pane = new THREE.Mesh(box(0.08, 0.95, 1.05), winMat);
      pane.position.set(side * (b.halfW + 0.12), y, 0);
      group.add(pane);
      windows.push(pane);
    }
  }
}

function addPorch(group: THREE.Group, b: BuildingFootprint, accent: THREE.Material): void {
  const facing = b.facing;
  const nx = Math.sin(facing);
  const nz = Math.cos(facing);
  const door = new THREE.Mesh(box(1.2, 2.1, 0.16), accent);
  door.position.set(nx * (b.halfW * Math.abs(nx) + b.halfD * Math.abs(nz) + 0.09), 1.05, nz * (b.halfD * Math.abs(nz) + b.halfW * Math.abs(nx) + 0.09));
  door.rotation.y = facing;
  group.add(door);

  const canopy = new THREE.Mesh(box(2.4, 0.16, 1.1), lambert('#6f6a63'));
  canopy.position.set(nx * (b.halfW * Math.abs(nx) + b.halfD * Math.abs(nz) + 0.5), 2.5, nz * (b.halfD * Math.abs(nz) + b.halfW * Math.abs(nx) + 0.5));
  canopy.rotation.y = facing;
  canopy.castShadow = true;
  group.add(canopy);
}

function addShopFront(group: THREE.Group, b: BuildingFootprint, accent: THREE.Material, windows: THREE.Mesh[]): void {
  const facing = b.facing;
  const nx = Math.sin(facing);
  const nz = Math.cos(facing);
  const depth = b.halfD * Math.abs(nz) + b.halfW * Math.abs(nx);
  const width = (b.halfW * Math.abs(nz) + b.halfD * Math.abs(nx)) * 2;

  const glassMat = shopGlassMaterial();
  const front = new THREE.Mesh(box(width - 1.6, 2.6, 0.14), glassMat);
  front.position.set(nx * (depth + 0.08), 1.6, nz * (depth + 0.08));
  front.rotation.y = facing;
  group.add(front);
  windows.push(front);

  const frame = new THREE.Mesh(box(width - 1.2, 0.22, 0.2), accent);
  frame.position.set(nx * (depth + 0.1), 3.0, nz * (depth + 0.1));
  frame.rotation.y = facing;
  group.add(frame);

  const door = new THREE.Mesh(box(1.5, 2.3, 0.2), accent);
  door.position.set(nx * (depth + 0.14), 1.15, nz * (depth + 0.14));
  door.rotation.y = facing;
  group.add(door);
}

function addAwning(group: THREE.Group, b: BuildingFootprint, accent: THREE.Material): void {
  const nx = Math.sin(b.facing);
  const nz = Math.cos(b.facing);
  const depth = b.halfD * Math.abs(nz) + b.halfW * Math.abs(nx);
  const width = (b.halfW * Math.abs(nz) + b.halfD * Math.abs(nx)) * 2;
  const awning = new THREE.Mesh(box(width - 0.8, 0.14, 2.2), accent);
  awning.position.set(nx * (depth + 1.0), 3.5, nz * (depth + 1.0));
  awning.rotation.y = b.facing;
  awning.rotation.x = nz !== 0 ? -0.12 * Math.sign(nz) : 0;
  awning.castShadow = true;
  group.add(awning);
}

function addNeonTrim(group: THREE.Group, b: BuildingFootprint, lit: THREE.Object3D[]): void {
  const colors = ['#ff4d8d', '#4dd2ff', '#ffe14d'];
  for (let i = 0; i < 3; i++) {
    const strip = new THREE.Mesh(box(b.halfW * 2 + 0.7, 0.12, 0.12), emissive(colors[i]));
    strip.position.set(0, 3.4 + i * 1.4, b.halfD + 0.35);
    group.add(strip);
    lit.push(strip);
  }
  for (const side of [1, -1]) {
    const strip = new THREE.Mesh(box(0.12, b.height - 1, 0.12), emissive('#ff4d8d'));
    strip.position.set(side * (b.halfW + 0.2), b.height / 2 + 0.4, b.halfD + 0.32);
    group.add(strip);
    lit.push(strip);
  }
  const tex = glowTexture();
  if (tex) {
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, color: '#ff5c9c', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    glow.scale.set(16, 9, 1);
    glow.position.set(0, 5.5, b.halfD + 1.2);
    group.add(glow);
    lit.push(glow);
  }
}

function addRooftopUnit(group: THREE.Group, b: BuildingFootprint, mat: THREE.Material): void {
  const unit = new THREE.Mesh(box(4, 1.6, 3), mat);
  unit.position.set(1.5, b.height + 1.4, -1.5);
  unit.castShadow = true;
  group.add(unit);
  const mast = new THREE.Mesh(cylinder(0.08, 0.08, 4, 6), lambert('#8c8f95'));
  mast.position.set(-3, b.height + 2.4, 2);
  group.add(mast);
  const light = new THREE.Mesh(box(0.3, 0.3, 0.3), emissive('#ff5a5a'));
  light.position.set(-3, b.height + 4.4, 2);
  group.add(light);
}

function addBalconies(group: THREE.Group, b: BuildingFootprint, accent: THREE.Material): void {
  const floors = Math.max(2, Math.floor(b.height / 3.2));
  for (let i = 1; i < floors; i++) {
    const y = 1.0 + i * (b.height / (floors + 0.4));
    if (y > b.height - 0.8) break;
    const slab = new THREE.Mesh(box(b.halfW * 1.7, 0.14, 1.1), accent);
    slab.position.set(0, y, b.halfD + 0.55);
    slab.castShadow = true;
    group.add(slab);
    const rail = new THREE.Mesh(box(b.halfW * 1.7, 0.7, 0.08), glass('#c8d4dc', 0.45));
    rail.position.set(0, y + 0.42, b.halfD + 1.05);
    group.add(rail);
  }
}

function createSign(b: BuildingFootprint): THREE.Object3D | null {
  const tex = signTexture(b.sign!, b.signColor ?? '#333333');
  if (!tex) return null;
  const nx = Math.sin(b.facing);
  const nz = Math.cos(b.facing);
  const depth = b.halfD * Math.abs(nz) + b.halfW * Math.abs(nx);
  // Signs are sized off the facade rather than fixed, and capped so a wide
  // building does not end up with a billboard.
  const facade = (b.halfW * Math.abs(nz) + b.halfD * Math.abs(nx)) * 2;
  const width = Math.min(facade * 0.62, 8.2);

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), mat);
  const y = b.style === 'house' ? b.height - 0.6 : Math.min(b.height - 0.7, 4.3);
  plane.position.set(nx * (depth + 0.2), y, nz * (depth + 0.2));
  plane.rotation.y = b.facing;
  return plane;
}
