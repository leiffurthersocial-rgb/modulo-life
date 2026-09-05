import * as THREE from 'three';
import { BUILDINGS, PLAZA_RADIUS, ROADS, WORLD_BOUNDS, type Road } from '@/data/world-layout';
import { LOCATIONS } from '@/data/locations';
import type { InteractionTarget } from '@/game/types';
import { blossomTexture, emissive, lambert, pavementTexture, roadTexture } from '@/game/core/materials';
import { createBuilding } from './buildings';
import { CollisionWorld } from './collision';
import { mergeStatics } from './mergeStatics';
import {
  bench,
  bikeRack,
  bush,
  clockTower,
  crane,
  fence,
  lantern,
  mailbox,
  noticeBoard,
  offeringBox,
  pineTree,
  planter,
  powerLine,
  sakuraTree,
  scaffolding,
  shrineHall,
  stoneLantern,
  streetLamp,
  torii,
  trafficCone,
  trashCan,
  utilityPole,
  vendingMachine,
  water,
  type NightLight,
} from './props';

export interface BuiltWorld {
  root: THREE.Group;
  collision: CollisionWorld;
  interactions: InteractionTarget[];
  nightLights: NightLight[];
  waters: THREE.Mesh[];
  /** Positions sakura petals should fall from. */
  petalSources: THREE.Vector3[];
  dispose(): void;
}

const GROUND_Y = 0;

export function buildWorld(): BuiltWorld {
  const root = new THREE.Group();
  root.name = 'neighbourhood';
  const collision = new CollisionWorld();
  collision.setBounds(WORLD_BOUNDS);
  const interactions: InteractionTarget[] = [];
  const nightLights: NightLight[] = [];
  const waters: THREE.Mesh[] = [];
  const petalSources: THREE.Vector3[] = [];

  /* ---------------------------------------------------------------- ground */
  const groundGeo = new THREE.PlaneGeometry(260, 230);
  const ground = new THREE.Mesh(groundGeo, lambert('#7d9663'));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(2, GROUND_Y - 0.02, 6);
  ground.receiveShadow = true;
  root.add(ground);

  /* ----------------------------------------------------------------- roads */
  const pavement = pavementTexture();
  for (const road of ROADS) addRoad(root, road);
  addPlaza(root);
  addCrosswalks(root);

  function addRoad(parent: THREE.Object3D, road: Road): void {
    const dashed = road.width >= 12;
    const tex = roadTexture(road.width, dashed);
    const length = road.axis === 'ew' ? road.x2 - road.x1 : road.z2 - road.z1;
    if (tex) {
      tex.repeat.set(1, length / road.width);
      tex.needsUpdate = true;
    }
    const mat = tex
      ? new THREE.MeshLambertMaterial({ map: tex.clone() })
      : lambert('#4b4c52');
    if (tex && mat.map) {
      mat.map.wrapS = THREE.RepeatWrapping;
      mat.map.wrapT = THREE.RepeatWrapping;
      mat.map.repeat.set(1, length / road.width);
      mat.map.needsUpdate = true;
    }
    const geo = new THREE.PlaneGeometry(road.width, length);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    if (road.axis === 'ew') {
      mesh.position.set((road.x1 + road.x2) / 2, GROUND_Y + 0.01, road.z);
      mesh.rotation.z = Math.PI / 2;
    } else {
      mesh.position.set(road.x, GROUND_Y + 0.01, (road.z1 + road.z2) / 2);
    }
    parent.add(mesh);

    // Kerbed pavement on both sides.
    const sideW = 2.6;
    for (const s of [-1, 1]) {
      const pavMat = pavement
        ? new THREE.MeshLambertMaterial({ map: pavement.clone() })
        : lambert('#c9c5ba');
      if (pavMat.map) {
        pavMat.map.wrapS = THREE.RepeatWrapping;
        pavMat.map.wrapT = THREE.RepeatWrapping;
        pavMat.map.repeat.set(1, length / 4);
        pavMat.map.needsUpdate = true;
      }
      const pav = new THREE.Mesh(new THREE.PlaneGeometry(sideW, length), pavMat);
      pav.rotation.x = -Math.PI / 2;
      pav.receiveShadow = true;
      if (road.axis === 'ew') {
        pav.position.set((road.x1 + road.x2) / 2, GROUND_Y + 0.05, road.z + s * (road.width / 2 + sideW / 2));
        pav.rotation.z = Math.PI / 2;
      } else {
        pav.position.set(road.x + s * (road.width / 2 + sideW / 2), GROUND_Y + 0.05, (road.z1 + road.z2) / 2);
      }
      parent.add(pav);

      const kerb = new THREE.Mesh(
        road.axis === 'ew' ? new THREE.BoxGeometry(length, 0.16, 0.22) : new THREE.BoxGeometry(0.22, 0.16, length),
        lambert('#b4b0a6'),
      );
      if (road.axis === 'ew') kerb.position.set((road.x1 + road.x2) / 2, GROUND_Y + 0.06, road.z + s * (road.width / 2));
      else kerb.position.set(road.x + s * (road.width / 2), GROUND_Y + 0.06, (road.z1 + road.z2) / 2);
      parent.add(kerb);
    }
  }

  function addPlaza(parent: THREE.Object3D): void {
    const mat = pavement ? new THREE.MeshLambertMaterial({ map: pavement.clone() }) : lambert('#cfcabd');
    if (mat.map) {
      mat.map.wrapS = THREE.RepeatWrapping;
      mat.map.wrapT = THREE.RepeatWrapping;
      mat.map.repeat.set(6, 6);
      mat.map.needsUpdate = true;
    }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(PLAZA_RADIUS, 40), mat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = GROUND_Y + 0.06;
    disc.receiveShadow = true;
    parent.add(disc);

    const ring = new THREE.Mesh(new THREE.RingGeometry(PLAZA_RADIUS - 0.4, PLAZA_RADIUS, 40), lambert('#e2ddd0'));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = GROUND_Y + 0.07;
    parent.add(ring);

    const island = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.8, 0.4, 24), lambert('#8fa86e'));
    island.position.y = GROUND_Y + 0.2;
    island.receiveShadow = true;
    parent.add(island);

    const tower = clockTower();
    tower.group.position.set(0, GROUND_Y + 0.4, 0);
    parent.add(tower.group);
    nightLights.push(tower.light);
    collision.add({ x: 0, z: 0, halfW: 5.6, halfD: 5.6, id: 'clock-island' });
  }

  function addCrosswalks(parent: THREE.Object3D): void {
    const stripeMat = lambert('#eae6d8');
    const spots: Array<[number, number, 'ew' | 'ns', number]> = [
      [-58, -22, 'ns', 10],
      [-58, 22, 'ns', 10],
      [58, -22, 'ns', 10],
      [58, 22, 'ns', 10],
      [-24, -55, 'ew', 10],
      [24, -55, 'ew', 10],
      [-24, 55, 'ew', 10],
      [24, 55, 'ew', 10],
      [-22, 0, 'ew', 14],
      [22, 0, 'ew', 14],
      [0, -24, 'ns', 12],
      [0, 24, 'ns', 12],
    ];
    for (const [x, z, axis, width] of spots) {
      for (let i = 0; i < 6; i++) {
        const stripe = new THREE.Mesh(
          axis === 'ew' ? new THREE.PlaneGeometry(0.55, width - 1) : new THREE.PlaneGeometry(width - 1, 0.55),
          stripeMat,
        );
        stripe.rotation.x = -Math.PI / 2;
        const off = (i - 2.5) * 0.95;
        stripe.position.set(axis === 'ew' ? x + off : x, GROUND_Y + 0.03, axis === 'ew' ? z : z + off);
        parent.add(stripe);
      }
    }
  }

  /* ------------------------------------------------------------- buildings */
  for (const b of BUILDINGS) {
    const built = createBuilding(b);
    root.add(built.group);
    collision.add({ x: b.x, z: b.z, halfW: b.halfW, halfD: b.halfD, id: b.id });
    for (const l of built.lit) nightLights.push({ object: l });

    // Small front garden with a low fence for houses.
    if (b.style === 'house') {
      const nx = Math.sin(b.facing);
      const nz = Math.cos(b.facing);
      const fenceLen = (b.halfW * Math.abs(nz) + b.halfD * Math.abs(nx)) * 2 + 1.5;
      const f = fence(fenceLen);
      f.position.set(b.x + nx * (b.halfD * Math.abs(nz) + b.halfW * Math.abs(nx) + 2.6), 0, b.z + nz * (b.halfD * Math.abs(nz) + b.halfW * Math.abs(nx) + 2.6));
      f.rotation.y = b.facing + Math.PI / 2;
      root.add(f);
      for (let i = 0; i < 3; i++) {
        const bs = bush(0.7 + Math.random() * 0.4);
        const t = (i - 1) * 2.6;
        bs.position.set(b.x + nx * (b.halfD * Math.abs(nz) + b.halfW * Math.abs(nx) + 1.3) + nz * t, 0, b.z + nz * (b.halfD * Math.abs(nz) + b.halfW * Math.abs(nx) + 1.3) + nx * t);
        root.add(bs);
      }
      const mb = mailbox();
      mb.position.set(b.x + nx * (b.halfD * Math.abs(nz) + b.halfW * Math.abs(nx) + 2.4) + nz * (fenceLen / 2 - 0.6), 0, b.z + nz * (b.halfD * Math.abs(nz) + b.halfW * Math.abs(nx) + 2.4) + nx * (fenceLen / 2 - 0.6));
      root.add(mb);
    }
  }

  /* ------------------------------------------------------------------ doors */
  for (const loc of LOCATIONS) {
    if (!loc.door || !loc.interior) continue;
    const marker = new THREE.Mesh(new THREE.CircleGeometry(1.3, 18), emissive('#ffe6ae', 0.28));
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(loc.door.x, GROUND_Y + 0.09, loc.door.z);
    marker.userData.noMerge = true;
    root.add(marker);
    interactions.push({
      id: `door:${loc.id}`,
      label: `Enter ${loc.name}`,
      icon: '🚪',
      x: loc.door.x,
      y: 1,
      z: loc.door.z,
      radius: 2.6,
      kind: 'door',
      data: { location: loc.id, interior: loc.interior },
    });
  }

  /* -------------------------------------------------------------- lighting */
  const lampSpots: Array<[number, number, number]> = [];
  for (const road of ROADS) {
    const length = road.axis === 'ew' ? road.x2 - road.x1 : road.z2 - road.z1;
    const step = 26;
    const n = Math.floor(length / step);
    for (let i = 1; i < n; i++) {
      const t = road.axis === 'ew' ? road.x1 + i * step : road.z1 + i * step;
      const side = i % 2 === 0 ? 1 : -1;
      if (road.axis === 'ew') lampSpots.push([t, road.z + side * (road.width / 2 + 1.6), side > 0 ? Math.PI : 0]);
      else lampSpots.push([road.x + side * (road.width / 2 + 1.6), t, side > 0 ? -Math.PI / 2 : Math.PI / 2]);
    }
  }
  for (const [x, z, rot] of lampSpots) {
    if (Math.hypot(x, z) < PLAZA_RADIUS + 2) continue;
    const lamp = streetLamp();
    lamp.group.position.set(x, 0, z);
    lamp.group.rotation.y = rot;
    root.add(lamp.group);
    nightLights.push(lamp.light);
  }

  /* ---------------------------------------------------- poles & power lines */
  const polePositions: THREE.Vector3[] = [];
  for (let x = -92; x <= 96; x += 30) {
    if (Math.abs(x) < PLAZA_RADIUS + 4) continue;
    const p = new THREE.Vector3(x, 0, 9.6);
    polePositions.push(p);
    const pole = utilityPole();
    pole.position.copy(p);
    root.add(pole);
  }
  for (let i = 0; i < polePositions.length - 1; i++) {
    const a = polePositions[i].clone().setY(7.6);
    const b = polePositions[i + 1].clone().setY(7.6);
    if (b.x - a.x > 40) continue;
    const line = powerLine(a, b);
    line.userData.noMerge = true;
    root.add(line);
    const line2 = powerLine(a.clone().setY(6.9), b.clone().setY(6.9), 0.9);
    line2.userData.noMerge = true;
    root.add(line2);
  }

  /* ----------------------------------------------------------- street trees */
  const blossom = blossomTexture();
  const treeSpots: Array<[number, number, number, boolean]> = [];
  for (let x = -90; x <= 98; x += 13) {
    if (Math.abs(x) < PLAZA_RADIUS + 3) continue;
    treeSpots.push([x, -9.9, 0.85 + ((x * 7919) % 30) / 100, false]);
    treeSpots.push([x + 6, 9.9, 0.85 + ((x * 6151) % 30) / 100, false]);
  }
  for (let z = -70; z <= 76; z += 15) {
    if (Math.abs(z) < PLAZA_RADIUS + 3) continue;
    treeSpots.push([-8.6, z, 0.8 + ((z * 3571) % 30) / 100, z % 30 === 0]);
    treeSpots.push([8.6, z + 7, 0.8 + ((z * 2749) % 30) / 100, z % 30 === 0]);
  }
  for (const [x, z, s, pine] of treeSpots) {
    const t = pine ? pineTree(s) : sakuraTree(s, blossom);
    t.position.set(x, 0, z);
    t.rotation.y = (x + z) % 6.28;
    root.add(t);
    collision.add({ x, z, halfW: 0.4, halfD: 0.4, id: 'tree' });
    if (!pine) petalSources.push(new THREE.Vector3(x, 3.4 * s, z));
  }

  /* ------------------------------------------------------------ plaza props */
  const plazaProps: Array<[number, number, number]> = [
    [-9.5, -6.5, 0.8],
    [9.5, 6.5, -2.4],
    [-9.5, 6.5, 2.4],
    [9.5, -6.5, -0.8],
  ];
  for (const [x, z, rot] of plazaProps) {
    const b = bench();
    b.position.set(x, 0, z);
    b.rotation.y = rot;
    root.add(b);
    interactions.push({
      id: `bench:${x},${z}`,
      label: 'Sit down',
      icon: '🪑',
      x,
      y: 0.6,
      z,
      radius: 2,
      kind: 'activity',
      data: { activity: 'relax' },
    });
  }
  addVending(root, -12.5, -2, Math.PI / 2, '#2f7fd8');
  addVending(root, -12.5, 2.6, Math.PI / 2, '#d84f4f');
  const rack = bikeRack(4);
  rack.position.set(12.4, 0, -3);
  rack.rotation.y = -Math.PI / 2;
  root.add(rack);
  interactions.push({
    id: 'bikerack:plaza',
    label: 'Bicycle rack',
    icon: '🚲',
    x: 12.4,
    y: 0.6,
    z: -3,
    radius: 2.6,
    kind: 'activity',
    data: { activity: 'fasttravel', from: 'plaza' },
  });
  const board = noticeBoard();
  board.position.set(4.5, 0, 11.5);
  board.rotation.y = Math.PI;
  root.add(board);
  interactions.push({
    id: 'notice:plaza',
    label: 'Neighbourhood notice board',
    icon: '📌',
    x: 4.5,
    y: 1.4,
    z: 11.5,
    radius: 2.4,
    kind: 'activity',
    data: { activity: 'notices' },
  });
  for (const [x, z] of [[-4, 12], [4, -12], [-13.5, 8], [13.5, -8]] as const) {
    const p = planter();
    p.position.set(x, 0, z);
    root.add(p);
  }
  for (const [x, z] of [[11, 10], [-11, -10]] as const) {
    const t = trashCan();
    t.position.set(x, 0, z);
    root.add(t);
    interactions.push({
      id: `trash:${x},${z}`,
      label: 'Bin',
      icon: '🗑️',
      x,
      y: 0.6,
      z,
      radius: 1.8,
      kind: 'activity',
      data: { activity: 'trash' },
    });
  }

  function addVending(parent: THREE.Object3D, x: number, z: number, rot: number, color: string): void {
    const vm = vendingMachine(color);
    vm.group.position.set(x, 0, z);
    vm.group.rotation.y = rot;
    parent.add(vm.group);
    nightLights.push(vm.light);
    collision.add({ x, z, halfW: 0.7, halfD: 0.7, id: 'vending' });
    interactions.push({
      id: `vending:${x},${z}`,
      label: 'Vending machine',
      icon: '🥤',
      x: x + Math.sin(rot) * 1.1,
      y: 1.2,
      z: z + Math.cos(rot) * 1.1,
      radius: 2.1,
      kind: 'shop',
      data: { shop: 'vending' },
    });
  }

  /* -------------------------------------------------------------- the park */
  const parkGrass = new THREE.Mesh(new THREE.PlaneGeometry(46, 28), lambert('#6f9455'));
  parkGrass.rotation.x = -Math.PI / 2;
  parkGrass.position.set(-28, GROUND_Y + 0.02, 37);
  parkGrass.receiveShadow = true;
  root.add(parkGrass);

  const pathRing = new THREE.Mesh(new THREE.RingGeometry(9.5, 11.2, 32), lambert('#c2b79c'));
  pathRing.rotation.x = -Math.PI / 2;
  pathRing.position.set(-28, GROUND_Y + 0.04, 37);
  pathRing.scale.set(1.6, 1, 1);
  root.add(pathRing);

  const pond = water(15, 10, '#3f7f86');
  pond.position.set(-33, GROUND_Y + 0.12, 39);
  pond.userData.noMerge = true;
  root.add(pond);
  waters.push(pond);
  // You fish from the bank, not from inside the pond.
  collision.add({ x: -33, z: 39, halfW: 7.2, halfD: 4.8, id: 'pond' });
  const pondRim = new THREE.Mesh(new THREE.RingGeometry(0, 1, 4), lambert('#9a9483'));
  pondRim.visible = false;
  root.add(pondRim);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.3, 0), lambert('#8f8a7e'));
    rock.position.set(-33 + Math.cos(a) * 7.9, 0.2, 39 + Math.sin(a) * 5.4);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    root.add(rock);
  }
  interactions.push({
    id: 'fish:pond',
    label: 'Fish in the pond',
    icon: '🎣',
    x: -33,
    y: 0.6,
    z: 44.6,
    radius: 3,
    kind: 'minigame',
    data: { minigame: 'fishing', spot: 'pond' },
  });

  for (const [x, z, rot] of [
    [-18, 32, Math.PI],
    [-18, 43, 0],
    [-40, 30, 2.2],
  ] as const) {
    const b = bench();
    b.position.set(x, 0, z);
    b.rotation.y = rot;
    root.add(b);
    interactions.push({
      id: `bench:${x},${z}`,
      label: 'Sit on the bench',
      icon: '🪑',
      x,
      y: 0.6,
      z,
      radius: 2,
      kind: 'activity',
      data: { activity: 'relax' },
    });
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const t = sakuraTree(0.9 + (i % 3) * 0.15, blossom);
    const x = -28 + Math.cos(a) * 19;
    const z = 37 + Math.sin(a) * 12;
    t.position.set(x, 0, z);
    root.add(t);
    collision.add({ x, z, halfW: 0.4, halfD: 0.4, id: 'tree' });
    petalSources.push(new THREE.Vector3(x, 3.4, z));
  }
  for (const [x, z] of [[-14, 37], [-42, 44], [-24, 27]] as const) {
    const l = stoneLantern();
    l.group.position.set(x, 0, z);
    root.add(l.group);
    nightLights.push(l.light);
  }
  interactions.push({
    id: 'run:park',
    label: 'Run the park loop',
    icon: '🏃',
    x: -12,
    y: 0.6,
    z: 37,
    radius: 2.6,
    kind: 'minigame',
    data: { minigame: 'running' },
  });

  /* ----------------------------------------------------------------- river */
  const river = water(190, 16, '#3c6f80');
  river.position.set(6, GROUND_Y + 0.1, 96);
  river.userData.noMerge = true;
  root.add(river);
  waters.push(river);
  for (const s of [-1, 1]) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(190, 1.2, 3), lambert('#a8a08e'));
    bank.position.set(6, GROUND_Y + 0.3, 96 + s * 9);
    bank.receiveShadow = true;
    root.add(bank);
    collision.add({ x: 6, z: 96 + s * 9, halfW: 95, halfD: 1.5, id: 'riverbank' });
  }
  // River water blocks movement on both sides of the bridge.
  collision.add({ x: -44, z: 96, halfW: 51, halfD: 8, id: 'river-west' });
  collision.add({ x: 56, z: 96, halfW: 45, halfD: 8, id: 'river-east' });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 22), lambert('#b0a894'));
  bridge.position.set(0, GROUND_Y + 0.9, 96);
  bridge.receiveShadow = true;
  root.add(bridge);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 22), lambert('#8d8574'));
    rail.position.set(s * 5.8, GROUND_Y + 1.6, 96);
    root.add(rail);
  }
  interactions.push({
    id: 'fish:river',
    label: 'Fish in the Kogawa',
    icon: '🎣',
    x: 16,
    y: 0.6,
    z: 87.5,
    radius: 3.2,
    kind: 'minigame',
    data: { minigame: 'fishing', spot: 'river' },
  });
  for (let x = -40; x <= 56; x += 16) {
    const t = sakuraTree(1.0, blossom);
    t.position.set(x, 0, 80);
    root.add(t);
    collision.add({ x, z: 80, halfW: 0.4, halfD: 0.4, id: 'tree' });
    petalSources.push(new THREE.Vector3(x, 3.6, 80));
  }

  /* ---------------------------------------------------------------- shrine */
  const shrineBase = new THREE.Mesh(new THREE.BoxGeometry(30, 1.6, 26), lambert('#8d9a72'));
  shrineBase.position.set(100, GROUND_Y + 0.8, 22);
  shrineBase.receiveShadow = true;
  root.add(shrineBase);
  for (let i = 0; i < 6; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(8, 0.28, 1.1), lambert('#b5b0a3'));
    step.position.set(85 + i * 0.9, 0.14 + i * 0.28, 22);
    root.add(step);
  }
  const gate = torii();
  gate.position.set(82, 0, 22);
  gate.rotation.y = Math.PI / 2;
  root.add(gate);
  const hall = shrineHall();
  hall.position.set(104, 1.6, 22);
  hall.rotation.y = -Math.PI / 2;
  root.add(hall);
  collision.add({ x: 104, z: 22, halfW: 3.5, halfD: 4.5, id: 'shrine-hall' });
  const offering = offeringBox();
  offering.position.set(98.5, 1.6, 22);
  offering.rotation.y = Math.PI / 2;
  root.add(offering);
  interactions.push({
    id: 'shrine:offering',
    label: 'Make an offering',
    icon: '⛩️',
    x: 97,
    y: 1.6,
    z: 22,
    radius: 2.6,
    kind: 'activity',
    data: { activity: 'pray' },
  });
  for (let i = 0; i < 6; i++) {
    for (const s of [-1, 1]) {
      const l = stoneLantern();
      l.group.position.set(90 + i * 3.4, 1.6, 22 + s * 5.5);
      root.add(l.group);
      nightLights.push(l.light);
    }
  }
  for (let i = 0; i < 5; i++) {
    const t = pineTree(1.1 + (i % 3) * 0.2);
    t.position.set(96 + (i % 3) * 6, 1.6, 10 + (i % 2) * 24);
    root.add(t);
  }

  /* ---------------------------------------------------- construction site */
  const site = new THREE.Mesh(new THREE.PlaneGeometry(24, 20), lambert('#9a8f7b'));
  site.rotation.x = -Math.PI / 2;
  site.position.set(-39, GROUND_Y + 0.03, -38);
  site.receiveShadow = true;
  root.add(site);
  const scaff = scaffolding(14, 9, 8);
  scaff.position.set(-40, 0, -40);
  root.add(scaff);
  collision.add({ x: -40, z: -40, halfW: 7, halfD: 4, id: 'scaffold' });
  const cr = crane();
  cr.position.set(-30, 0, -44);
  root.add(cr);
  collision.add({ x: -30, z: -44, halfW: 1, halfD: 1, id: 'crane' });
  for (let i = 0; i < 7; i++) {
    const c = trafficCone();
    c.position.set(-50 + i * 3.4, 0, -28.5);
    root.add(c);
  }
  for (let i = 0; i < 3; i++) {
    const pile = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.6), lambert('#8a7f6c'));
    pile.position.set(-46 + i * 3, 0.45, -33);
    pile.castShadow = true;
    root.add(pile);
  }
  const siteBoard = noticeBoard();
  siteBoard.position.set(-33, 0, -30);
  siteBoard.rotation.y = Math.PI;
  root.add(siteBoard);
  interactions.push({
    id: 'job:construction_hand',
    label: 'Site foreman',
    icon: '🚧',
    x: -33,
    y: 1.4,
    z: -29,
    radius: 2.6,
    kind: 'job',
    data: { job: 'construction_hand' },
  });

  /* ----------------------------------------------- misc street furniture */
  addVending(root, -47, -8.5, 0, '#e0a63c');
  addVending(root, 30, -9.2, 0, '#2f7fd8');
  addVending(root, 48, 10.6, Math.PI, '#4fa86b');
  const rack2 = bikeRack(3);
  rack2.position.set(-46, 0, -7.5);
  root.add(rack2);
  interactions.push({
    id: 'bikerack:konbini',
    label: 'Bicycle rack',
    icon: '🚲',
    x: -46,
    y: 0.6,
    z: -7.5,
    radius: 2.6,
    kind: 'activity',
    data: { activity: 'fasttravel', from: 'konbini' },
  });
  const rack3 = bikeRack(3);
  rack3.position.set(-22, 0, 30);
  root.add(rack3);
  interactions.push({
    id: 'bikerack:park',
    label: 'Bicycle rack',
    icon: '🚲',
    x: -22,
    y: 0.6,
    z: 30,
    radius: 2.6,
    kind: 'activity',
    data: { activity: 'fasttravel', from: 'park' },
  });

  // Red lanterns outside the ramen shop.
  for (const s of [-1, 1]) {
    const l = lantern();
    l.group.position.set(-40 + s * 4.5, 3.2, 9.6);
    root.add(l.group);
    nightLights.push(l.light);
  }
  const shopNoren = new THREE.Group();
  root.add(shopNoren);

  for (const [x, z] of [[-30, -8.5], [20, 10.6], [60, -9], [-70, 9]] as const) {
    const t = trashCan();
    t.position.set(x, 0, z);
    root.add(t);
  }

  /* ------------------------------------------------------------- finalise */
  const before = countMeshes(root);
  const merged = mergeStatics(root);
  const after = countMeshes(root);
  if (typeof console !== 'undefined') {
    console.info(`[world] merged ${before} meshes into ${after} draw batches (${merged.meshes.length} materials)`);
  }

  return {
    root,
    collision,
    interactions,
    nightLights,
    waters,
    petalSources,
    dispose() {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh && !Array.isArray(o.material)) {
          o.geometry.dispose();
        }
      });
      root.clear();
    },
  };
}

function countMeshes(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) n++;
  });
  return n;
}
