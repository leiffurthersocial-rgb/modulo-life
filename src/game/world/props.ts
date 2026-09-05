import * as THREE from 'three';
import { box, cylinder, emissive, glass, glowTexture, lambert, sphere } from '@/game/core/materials';
import { voxRing } from '@/game/core/voxel';

/** A light source that should switch on at dusk. */
export interface NightLight {
  object: THREE.Object3D;
  glow?: THREE.Sprite;
}

function glowSprite(color: string, size: number, y: number): THREE.Sprite | null {
  const tex = glowTexture();
  if (!tex) return null;
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  s.scale.set(size, size, 1);
  s.position.y = y;
  return s;
}

export function streetLamp(): { group: THREE.Group; light: NightLight } {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(cylinder(0.07, 0.09, 5, 6), lambert('#6f7379'));
  pole.position.y = 2.5;
  pole.castShadow = true;
  g.add(pole);
  const arm = new THREE.Mesh(box(0.9, 0.1, 0.1), lambert('#6f7379'));
  arm.position.set(0.42, 4.95, 0);
  g.add(arm);
  const head = new THREE.Mesh(box(0.7, 0.18, 0.34), lambert('#585c62'));
  head.position.set(0.82, 4.85, 0);
  g.add(head);
  const bulb = new THREE.Mesh(box(0.5, 0.06, 0.24), emissive('#ffe6b0'));
  bulb.position.set(0.82, 4.74, 0);
  g.add(bulb);
  const glow = glowSprite('#ffd992', 5.5, 4.7);
  if (glow) {
    glow.position.x = 0.82;
    g.add(glow);
  }
  return { group: g, light: { object: bulb, glow: glow ?? undefined } };
}

export function vendingMachine(color = '#2f7fd8'): { group: THREE.Group; light: NightLight } {
  const g = new THREE.Group();
  const body = new THREE.Mesh(box(1.1, 1.9, 0.75), lambert(color));
  body.position.y = 0.95;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const front = new THREE.Mesh(box(0.92, 1.15, 0.06), emissive('#fff6df'));
  front.position.set(-0.05, 1.25, 0.39);
  g.add(front);
  // Rows of bottles behind the glass.
  const colors = ['#e05252', '#4fb36b', '#e8b04b', '#5a8fd8', '#d86fb0'];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const can = new THREE.Mesh(cylinder(0.06, 0.06, 0.16, 6), lambert(colors[(r * 4 + c) % colors.length]));
      can.position.set(-0.38 + c * 0.22, 0.85 + r * 0.32, 0.42);
      g.add(can);
    }
  }
  const tray = new THREE.Mesh(box(0.7, 0.22, 0.1), lambert('#2b2f36'));
  tray.position.set(0, 0.4, 0.4);
  g.add(tray);
  const glow = glowSprite('#fff0c8', 3.2, 1.3);
  if (glow) {
    glow.position.z = 0.5;
    g.add(glow);
  }
  return { group: g, light: { object: front, glow: glow ?? undefined } };
}

export function utilityPole(): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(cylinder(0.14, 0.19, 9, 7), lambert('#8d8579'));
  pole.position.y = 4.5;
  pole.castShadow = true;
  g.add(pole);
  for (let i = 0; i < 2; i++) {
    const cross = new THREE.Mesh(box(2.4, 0.12, 0.12), lambert('#7a7267'));
    cross.position.y = 7.6 - i * 0.8;
    g.add(cross);
    for (const s of [-1, 1]) {
      const insulator = new THREE.Mesh(cylinder(0.06, 0.06, 0.18, 5), lambert('#c8ccd2'));
      insulator.position.set(s * 1.0, 7.75 - i * 0.8, 0);
      g.add(insulator);
    }
  }
  const transformer = new THREE.Mesh(cylinder(0.28, 0.28, 0.8, 8), lambert('#9a9186'));
  transformer.position.set(0.32, 6.4, 0);
  g.add(transformer);
  return g;
}

/** Sagging catenary between two poles, drawn as a thin tube. */
export function powerLine(from: THREE.Vector3, to: THREE.Vector3, sag = 1.1): THREE.Line {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const p = from.clone().lerp(to, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#2c2c30' }));
}

export function bench(): THREE.Group {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(box(1.9, 0.1, 0.5), lambert('#a1764c'));
  seat.position.y = 0.46;
  seat.castShadow = true;
  g.add(seat);
  const back = new THREE.Mesh(box(1.9, 0.5, 0.09), lambert('#a1764c'));
  back.position.set(0, 0.74, -0.22);
  back.rotation.x = -0.16;
  g.add(back);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(box(0.09, 0.46, 0.44), lambert('#4d5157'));
    leg.position.set(s * 0.78, 0.23, 0);
    g.add(leg);
  }
  return g;
}

export function trashCan(): THREE.Group {
  const g = new THREE.Group();
  const bin = new THREE.Mesh(cylinder(0.3, 0.26, 0.85, 10), lambert('#5f6b62'));
  bin.position.y = 0.42;
  bin.castShadow = true;
  g.add(bin);
  const lid = new THREE.Mesh(cylinder(0.33, 0.33, 0.08, 10), lambert('#3f4a44'));
  lid.position.y = 0.88;
  g.add(lid);
  return g;
}

export function mailbox(): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(cylinder(0.07, 0.07, 1.0, 6), lambert('#5b5b60'));
  post.position.y = 0.5;
  g.add(post);
  const bodyMesh = new THREE.Mesh(box(0.44, 0.5, 0.36), lambert('#c8453f'));
  bodyMesh.position.y = 1.2;
  bodyMesh.castShadow = true;
  g.add(bodyMesh);
  const slot = new THREE.Mesh(box(0.3, 0.05, 0.02), lambert('#2a2a2e'));
  slot.position.set(0, 1.32, 0.19);
  g.add(slot);
  return g;
}

export function bicycle(color = '#3f7d8c'): THREE.Group {
  const g = new THREE.Group();
  const wheelGeo = voxRing(0.32, 0.05, 10);
  const wheelMat = lambert('#2a2a2e');
  for (const z of [-0.5, 0.5]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(0, 0.33, z);
    w.rotation.y = Math.PI / 2;
    g.add(w);
  }
  const frame = new THREE.Mesh(box(0.06, 0.06, 1.05), lambert(color));
  frame.position.set(0, 0.55, 0);
  g.add(frame);
  const seatPost = new THREE.Mesh(box(0.05, 0.3, 0.05), lambert(color));
  seatPost.position.set(0, 0.7, -0.32);
  g.add(seatPost);
  const seat = new THREE.Mesh(box(0.12, 0.06, 0.28), lambert('#2f2f33'));
  seat.position.set(0, 0.86, -0.34);
  g.add(seat);
  const bars = new THREE.Mesh(box(0.5, 0.05, 0.05), lambert('#3a3a3f'));
  bars.position.set(0, 0.92, 0.42);
  g.add(bars);
  const fork = new THREE.Mesh(box(0.05, 0.6, 0.05), lambert(color));
  fork.position.set(0, 0.6, 0.44);
  fork.rotation.x = 0.2;
  g.add(fork);
  return g;
}

export function bikeRack(count = 4): THREE.Group {
  const g = new THREE.Group();
  const colors = ['#3f7d8c', '#a8563f', '#4a5f8c', '#5d7a4a', '#8c5d7a'];
  for (let i = 0; i < count; i++) {
    const hoop = new THREE.Mesh(voxRing(0.35, 0.04, 8), lambert('#8f959b'));
    hoop.position.set(i * 0.9 - (count - 1) * 0.45, 0.35, 0);
    g.add(hoop);
    if (i % 2 === 0) {
      const b = bicycle(colors[i % colors.length]);
      b.position.set(i * 0.9 - (count - 1) * 0.45, 0, 0);
      b.rotation.y = 0.1;
      g.add(b);
    }
  }
  return g;
}

export function fence(length: number, color = '#c6bda9'): THREE.Group {
  const g = new THREE.Group();
  const rail = new THREE.Mesh(box(length, 0.09, 0.06), lambert(color));
  rail.position.y = 0.95;
  g.add(rail);
  const rail2 = rail.clone();
  rail2.position.y = 0.5;
  g.add(rail2);
  const posts = Math.max(2, Math.round(length / 1.6));
  for (let i = 0; i <= posts; i++) {
    const p = new THREE.Mesh(box(0.09, 1.15, 0.09), lambert(color));
    p.position.set(-length / 2 + (length * i) / posts, 0.58, 0);
    g.add(p);
  }
  return g;
}

export function planter(): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(box(1.0, 0.45, 0.7), lambert('#a8a196'));
  pot.position.y = 0.22;
  pot.castShadow = true;
  g.add(pot);
  for (let i = 0; i < 4; i++) {
    const bush = new THREE.Mesh(sphere(0.24, 8, 6), lambert(i % 2 ? '#5c8a4a' : '#6b9a56'));
    bush.position.set(-0.3 + i * 0.2, 0.55, (i % 2) * 0.14 - 0.07);
    bush.scale.y = 0.8;
    g.add(bush);
  }
  return g;
}

export function bush(scale = 1): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(sphere(0.45 + Math.random() * 0.2, 7, 5), lambert(i % 2 ? '#527f43' : '#65934f'));
    s.position.set((Math.random() - 0.5) * 0.6, 0.35 + Math.random() * 0.2, (Math.random() - 0.5) * 0.6);
    s.castShadow = true;
    g.add(s);
  }
  g.scale.setScalar(scale);
  return g;
}

/**
 * Voxel sakura. Flat colour blocks rather than a texture: at this size a
 * repeating canopy texture turns to mush, while three flat pinks read as
 * blossom from right across the street.
 */
export function sakuraTree(scale = 1, _blossomTex: THREE.Texture | null = null, bare = false): THREE.Group {
  const g = new THREE.Group();

  const barkDark = lambert('#5b4436');
  const barkLight = lambert('#6e5342');
  // Trunk as three stacked blocks, stepping in as it rises.
  const trunkParts: Array<[number, number, number, THREE.Material]> = [
    [0.66, 1.2, 0.6, barkDark],
    [0.54, 1.1, 0.54, barkLight],
    [0.44, 0.9, 0.44, barkDark],
  ];
  let y = 0;
  for (const [w, h, d, mat] of trunkParts) {
    const m = new THREE.Mesh(box(w, h, d), mat);
    m.position.y = y + h / 2;
    m.castShadow = true;
    g.add(m);
    y += h;
  }
  for (const [bx, bz] of [[0.55, 0.2], [-0.5, -0.35]] as const) {
    const branch = new THREE.Mesh(box(0.3, 0.3, 0.3), barkLight);
    branch.position.set(bx, y - 0.35, bz);
    g.add(branch);
  }

  const shades = bare
    ? [lambert('#588f45'), lambert('#69a455'), lambert('#4a7d3b')]
    : [lambert('#f6b3cd'), lambert('#ffd4e4'), lambert('#e493b4')];

  // A deliberate cluster: outer ring, inner ring, cap, and two low outliers.
  const canopy: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    canopy.push([Math.cos(a) * 1.15, y + 0.35, Math.sin(a) * 1.15, 1.15]);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    canopy.push([Math.cos(a) * 0.78, y + 1.05, Math.sin(a) * 0.78, 1.0]);
  }
  canopy.push([0, y + 1.55, 0, 0.9]);
  canopy.push([1.45, y - 0.15, 0.35, 0.85]);
  canopy.push([-1.3, y - 0.1, -0.5, 0.9]);

  canopy.forEach(([cx, cy, cz, size], i) => {
    const m = new THREE.Mesh(box(size, size * 0.92, size), shades[i % shades.length]);
    m.position.set(cx, cy, cz);
    m.castShadow = true;
    g.add(m);
  });

  g.scale.setScalar(scale);
  return g;
}

export function pineTree(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(cylinder(0.14, 0.24, 2.2, 6), lambert('#5b4636'));
  trunk.position.y = 1.1;
  g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(cylinder(0, 1.4 - i * 0.32, 1.6, 7), lambert('#3f6b41'));
    cone.position.y = 2.3 + i * 1.0;
    cone.castShadow = true;
    g.add(cone);
  }
  g.scale.setScalar(scale);
  return g;
}

export function torii(): THREE.Group {
  const g = new THREE.Group();
  const mat = lambert('#c0392b');
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(cylinder(0.22, 0.28, 5.2, 8), mat);
    post.position.set(s * 2.4, 2.6, 0);
    post.castShadow = true;
    g.add(post);
  }
  const top = new THREE.Mesh(box(6.6, 0.4, 0.6), mat);
  top.position.y = 5.3;
  top.castShadow = true;
  g.add(top);
  const topCurve = new THREE.Mesh(box(7.2, 0.26, 0.8), lambert('#8e2b20'));
  topCurve.position.y = 5.62;
  g.add(topCurve);
  const second = new THREE.Mesh(box(5.4, 0.28, 0.42), mat);
  second.position.y = 4.4;
  g.add(second);
  const plaque = new THREE.Mesh(box(0.9, 0.7, 0.14), lambert('#e8dcc0'));
  plaque.position.y = 4.9;
  g.add(plaque);
  return g;
}

export function stoneLantern(): { group: THREE.Group; light: NightLight } {
  const g = new THREE.Group();
  const baseMesh = new THREE.Mesh(cylinder(0.24, 0.3, 0.4, 6), lambert('#9a978f'));
  baseMesh.position.y = 0.2;
  g.add(baseMesh);
  const shaft = new THREE.Mesh(cylinder(0.13, 0.15, 0.85, 6), lambert('#a5a29a'));
  shaft.position.y = 0.82;
  g.add(shaft);
  const housing = new THREE.Mesh(box(0.5, 0.42, 0.5), lambert('#b0ada4'));
  housing.position.y = 1.45;
  housing.castShadow = true;
  g.add(housing);
  const lightBox = new THREE.Mesh(box(0.32, 0.26, 0.32), emissive('#ffcf85'));
  lightBox.position.y = 1.45;
  g.add(lightBox);
  const cap = new THREE.Mesh(cylinder(0, 0.52, 0.34, 6), lambert('#8d8a82'));
  cap.position.y = 1.82;
  g.add(cap);
  const glow = glowSprite('#ffc574', 2.6, 1.45);
  if (glow) g.add(glow);
  return { group: g, light: { object: lightBox, glow: glow ?? undefined } };
}

export function offeringBox(): THREE.Group {
  const g = new THREE.Group();
  const bodyMesh = new THREE.Mesh(box(1.8, 0.9, 1.0), lambert('#6b5240'));
  bodyMesh.position.y = 0.45;
  bodyMesh.castShadow = true;
  g.add(bodyMesh);
  for (let i = 0; i < 7; i++) {
    const slat = new THREE.Mesh(box(0.06, 0.12, 0.9), lambert('#4a3a2c'));
    slat.position.set(-0.75 + i * 0.25, 0.94, 0);
    g.add(slat);
  }
  return g;
}

export function shrineHall(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(box(9, 0.8, 7), lambert('#a8a49b'));
  base.position.y = 0.4;
  base.receiveShadow = true;
  g.add(base);
  const hall = new THREE.Mesh(box(7.6, 3.4, 5.6), lambert('#c9432f'));
  hall.position.y = 2.5;
  hall.castShadow = true;
  g.add(hall);
  const roof = new THREE.Mesh(cylinder(0, 7.2, 2.6, 4), lambert('#3d4a52'));
  roof.position.y = 5.4;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.0, 1, 0.82);
  roof.castShadow = true;
  g.add(roof);
  const eave = new THREE.Mesh(box(9.4, 0.3, 7.2), lambert('#313c43'));
  eave.position.y = 4.2;
  g.add(eave);
  for (const s of [-1, 1]) {
    const pillar = new THREE.Mesh(cylinder(0.22, 0.22, 3.4, 7), lambert('#8e2b20'));
    pillar.position.set(s * 3.2, 2.5, 2.9);
    g.add(pillar);
  }
  const doorway = new THREE.Mesh(box(2.6, 2.6, 0.14), lambert('#e6dcc4'));
  doorway.position.set(0, 2.1, 2.82);
  g.add(doorway);
  return g;
}

export function clockTower(): { group: THREE.Group; light: NightLight } {
  const g = new THREE.Group();
  const base = new THREE.Mesh(cylinder(2.2, 2.6, 0.7, 12), lambert('#b8b2a6'));
  base.position.y = 0.35;
  base.receiveShadow = true;
  g.add(base);
  const column = new THREE.Mesh(box(1.5, 6.5, 1.5), lambert('#e0d8c8'));
  column.position.y = 3.8;
  column.castShadow = true;
  g.add(column);
  const head = new THREE.Mesh(box(2.1, 2.1, 2.1), lambert('#d8cfbc'));
  head.position.y = 8.1;
  head.castShadow = true;
  g.add(head);
  for (const [ax, az] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    const face = new THREE.Mesh(box(1.5, 1.5, 0.06), emissive('#fff6e0'));
    face.position.set(ax * 1.07, 8.1, az * 1.07);
    face.rotation.y = ax !== 0 ? (ax > 0 ? Math.PI / 2 : -Math.PI / 2) : az > 0 ? 0 : Math.PI;
    g.add(face);
    const hand = new THREE.Mesh(box(0.07, 0.55, 0.03), lambert('#2f2f35'));
    hand.position.set(ax * 1.1, 8.28, az * 1.1);
    hand.rotation.y = face.rotation.y;
    g.add(hand);
  }
  const roof = new THREE.Mesh(cylinder(0, 1.7, 1.5, 4), lambert('#4a5560'));
  roof.position.y = 9.9;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  const finial = new THREE.Mesh(sphere(0.18, 8, 6), emissive('#f0c96a'));
  finial.position.y = 10.8;
  g.add(finial);
  const glow = glowSprite('#ffeec0', 6, 8.1);
  if (glow) g.add(glow);
  return { group: g, light: { object: finial, glow: glow ?? undefined } };
}

export function noticeBoard(): THREE.Group {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(box(0.1, 1.8, 0.1), lambert('#7a6450'));
    post.position.set(s * 0.8, 0.9, 0);
    g.add(post);
  }
  const boardMesh = new THREE.Mesh(box(1.9, 1.1, 0.08), lambert('#8a7156'));
  boardMesh.position.y = 1.5;
  boardMesh.castShadow = true;
  g.add(boardMesh);
  const paperColors = ['#f4f0e4', '#e8eef4', '#f6ecd8'];
  for (let i = 0; i < 4; i++) {
    const paper = new THREE.Mesh(box(0.34, 0.42, 0.02), lambert(paperColors[i % 3]));
    paper.position.set(-0.62 + i * 0.42, 1.5 + (i % 2) * 0.08, 0.05);
    paper.rotation.z = (Math.random() - 0.5) * 0.1;
    g.add(paper);
  }
  const roof = new THREE.Mesh(box(2.2, 0.09, 0.5), lambert('#5f5145'));
  roof.position.set(0, 2.14, 0.06);
  roof.rotation.x = -0.2;
  g.add(roof);
  return g;
}

/** Rippling water surface for the pond and river. */
export function water(width: number, depth: number, color = '#3f7f86'): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, depth, Math.min(48, Math.ceil(width / 2)), Math.min(48, Math.ceil(depth / 2)));
  const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.86 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = false;
  mesh.userData.isWater = true;
  mesh.userData.basePositions = Float32Array.from(geo.attributes.position.array);
  return mesh;
}

export function animateWater(mesh: THREE.Mesh, t: number, amplitude = 1): void {
  const geo = mesh.geometry as THREE.PlaneGeometry;
  const pos = geo.attributes.position;
  const base = mesh.userData.basePositions as Float32Array | undefined;
  if (!base) return;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    pos.setZ(i, base[i * 3 + 2] + Math.sin(x * 0.35 + t * 1.4) * 0.09 * amplitude + Math.cos(y * 0.28 + t * 1.1) * 0.07 * amplitude);
  }
  pos.needsUpdate = true;
}

export function crane(): THREE.Group {
  const g = new THREE.Group();
  const mast = new THREE.Mesh(box(0.9, 18, 0.9), lambert('#e0a63c'));
  mast.position.y = 9;
  mast.castShadow = true;
  g.add(mast);
  const jib = new THREE.Mesh(box(16, 0.6, 0.7), lambert('#e0a63c'));
  jib.position.set(4, 17.6, 0);
  jib.castShadow = true;
  g.add(jib);
  const counter = new THREE.Mesh(box(2, 1.2, 1.2), lambert('#c8912f'));
  counter.position.set(-3.6, 17.6, 0);
  g.add(counter);
  const cable = new THREE.Mesh(cylinder(0.04, 0.04, 6, 4), lambert('#3a3a3e'));
  cable.position.set(9, 14.4, 0);
  g.add(cable);
  const hook = new THREE.Mesh(box(0.6, 0.5, 0.6), lambert('#7d7f85'));
  hook.position.set(9, 11.2, 0);
  g.add(hook);
  return g;
}

export function scaffolding(w: number, h: number, d: number): THREE.Group {
  const g = new THREE.Group();
  const mat = lambert('#9aa0a6');
  const cols = Math.max(2, Math.round(w / 2.5));
  const rows = Math.max(2, Math.round(h / 2.2));
  for (let i = 0; i <= cols; i++) {
    for (const z of [-d / 2, d / 2]) {
      const post = new THREE.Mesh(cylinder(0.07, 0.07, h, 5), mat);
      post.position.set(-w / 2 + (w * i) / cols, h / 2, z);
      g.add(post);
    }
  }
  for (let r = 1; r <= rows; r++) {
    const y = (h * r) / rows;
    for (const z of [-d / 2, d / 2]) {
      const rail = new THREE.Mesh(box(w, 0.07, 0.07), mat);
      rail.position.set(0, y, z);
      g.add(rail);
    }
    const deck = new THREE.Mesh(box(w, 0.08, d), lambert('#b09472'));
    deck.position.set(0, y - 0.05, 0);
    g.add(deck);
  }
  const mesh = new THREE.Mesh(box(w, h, 0.04), glass('#5f8f6a', 0.28));
  mesh.position.set(0, h / 2, d / 2 + 0.1);
  g.add(mesh);
  return g;
}

export function trafficCone(): THREE.Mesh {
  const m = new THREE.Mesh(cylinder(0.03, 0.22, 0.7, 8), lambert('#e2622f'));
  m.position.y = 0.35;
  return m;
}

export function noren(width = 2.2, color = '#2f4858'): THREE.Group {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(cylinder(0.04, 0.04, width, 6), lambert('#6b5340'));
  rod.rotation.z = Math.PI / 2;
  rod.position.y = 2.1;
  g.add(rod);
  const panels = 3;
  for (let i = 0; i < panels; i++) {
    const p = new THREE.Mesh(box(width / panels - 0.06, 0.75, 0.02), lambert(color));
    p.position.set(-width / 2 + (width / panels) * (i + 0.5), 1.72, 0);
    g.add(p);
  }
  return g;
}

export function lantern(color = '#e05a4a'): { group: THREE.Group; light: NightLight } {
  const g = new THREE.Group();
  const bodyMesh = new THREE.Mesh(cylinder(0.22, 0.22, 0.5, 10), emissive(color));
  bodyMesh.position.y = 0;
  g.add(bodyMesh);
  const capTop = new THREE.Mesh(cylinder(0.1, 0.24, 0.09, 10), lambert('#3a3a3e'));
  capTop.position.y = 0.28;
  g.add(capTop);
  const capBottom = capTop.clone();
  capBottom.position.y = -0.28;
  g.add(capBottom);
  const glow = glowSprite(color, 2.2, 0);
  if (glow) g.add(glow);
  return { group: g, light: { object: bodyMesh, glow: glow ?? undefined } };
}
