import * as THREE from 'three';
import type { Appearance } from '@/game/types';
import { box, cylinder, sphere, standard, emissive } from '@/game/core/materials';

export type AnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'talk'
  | 'attack'
  | 'heavy'
  | 'hit'
  | 'dodge'
  | 'block'
  | 'victory'
  | 'defeat'
  | 'sit'
  | 'sleep'
  | 'work'
  | 'train';

/** Base humanoid height in metres before the per-character multiplier. */
const BASE_HEIGHT = 1.75;

interface Parts {
  root: THREE.Group;
  body: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  forearmL: THREE.Group;
  forearmR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  shinL: THREE.Group;
  shinR: THREE.Group;
}

/**
 * A stylised low-poly humanoid assembled from primitives and animated
 * procedurally. Everything that makes a character recognisable - height,
 * build, hair silhouette, glasses, colours - comes from their Appearance
 * record, so adding a ninth character needs no new code.
 */
export class CharacterModel {
  readonly group = new THREE.Group();
  readonly parts: Parts;
  private readonly scale: number;

  private phase = 0;
  private blinkTimer = 2 + Math.random() * 3;
  private state: AnimState = 'idle';
  private stateTime = 0;
  private moveSpeed = 0;
  private eyeL!: THREE.Mesh;
  private eyeR!: THREE.Mesh;
  private label: THREE.Sprite | null = null;
  private readonly meshes: THREE.Mesh[] = [];

  constructor(appearance: Appearance, castShadow = true) {
    this.scale = appearance.height;

    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    this.group.add(root);
    this.group.scale.setScalar(this.scale);

    const build = appearance.build;
    const skinMat = standard(appearance.skin, { roughness: 0.92 });
    const shirtMat = standard(appearance.shirt, { roughness: 0.85 });
    const accentMat = standard(appearance.accent, { roughness: 0.8 });
    const pantsMat = standard(appearance.pants, { roughness: 0.9 });
    const shoeMat = standard(appearance.shoes, { roughness: 0.7 });
    const hairMat = standard(appearance.hair, { roughness: 0.75, flat: true });

    const shoulderW = 0.34 + build * 0.16;
    const chestD = 0.19 + build * 0.07;
    const armR = 0.055 + build * 0.028;
    const legR = 0.075 + build * 0.022;

    /* ------------------------------------------------------------ legs */
    const hips = new THREE.Group();
    hips.position.y = 0.86;
    body.add(hips);

    const makeLeg = (side: number) => {
      const leg = new THREE.Group();
      leg.position.set(side * (0.105 + build * 0.02), 0, 0);
      const thigh = this.mesh(cylinder(legR, legR * 0.92, 0.44, 8), pantsMat, castShadow);
      thigh.position.y = -0.22;
      leg.add(thigh);

      const shin = new THREE.Group();
      shin.position.y = -0.44;
      const calf = this.mesh(cylinder(legR * 0.9, legR * 0.78, 0.42, 8), pantsMat, castShadow);
      calf.position.y = -0.21;
      shin.add(calf);
      const shoe = this.mesh(box(legR * 2.1, 0.1, 0.28), shoeMat, castShadow);
      shoe.position.set(0, -0.44, 0.05);
      shin.add(shoe);
      leg.add(shin);
      hips.add(leg);
      return { leg, shin };
    };
    const left = makeLeg(1);
    const right = makeLeg(-1);

    /* ----------------------------------------------------------- torso */
    const torso = new THREE.Group();
    torso.position.y = 0.86;
    body.add(torso);

    const chest = this.mesh(box(shoulderW, 0.42, chestD), shirtMat, castShadow);
    chest.position.y = 0.24;
    torso.add(chest);
    const waist = this.mesh(box(shoulderW * 0.82, 0.16, chestD * 0.92), shirtMat, castShadow);
    waist.position.y = 0.04;
    torso.add(waist);
    // Collar detail in the accent colour keeps silhouettes readable at distance.
    const collar = this.mesh(box(shoulderW * 0.55, 0.06, chestD * 1.04), accentMat, false);
    collar.position.y = 0.44;
    torso.add(collar);

    /* ------------------------------------------------------------ arms */
    const makeArm = (side: number) => {
      const arm = new THREE.Group();
      arm.position.set(side * (shoulderW / 2 + armR * 0.6), 0.4, 0);
      const upper = this.mesh(cylinder(armR, armR * 0.9, 0.3, 7), shirtMat, castShadow);
      upper.position.y = -0.15;
      arm.add(upper);

      const forearm = new THREE.Group();
      forearm.position.y = -0.3;
      const lower = this.mesh(cylinder(armR * 0.85, armR * 0.74, 0.28, 7), skinMat, castShadow);
      lower.position.y = -0.14;
      forearm.add(lower);
      const hand = this.mesh(sphere(armR * 1.05, 8, 6), skinMat, false);
      hand.position.y = -0.3;
      forearm.add(hand);
      arm.add(forearm);
      torso.add(arm);
      return { arm, forearm };
    };
    const armLeft = makeArm(1);
    const armRight = makeArm(-1);

    /* ------------------------------------------------------------ head */
    const neck = new THREE.Group();
    neck.position.y = 0.5;
    torso.add(neck);
    const neckMesh = this.mesh(cylinder(0.05, 0.055, 0.08, 7), skinMat, false);
    neckMesh.position.y = 0.03;
    neck.add(neckMesh);

    const head = new THREE.Group();
    head.position.y = 0.08;
    neck.add(head);

    const skull = this.mesh(sphere(0.135, 14, 12), skinMat, castShadow);
    skull.scale.set(1, 1.12, 0.96);
    skull.position.y = 0.13;
    head.add(skull);

    // Eyes sit slightly proud of the skull so they stay visible from an angle.
    const eyeGeo = sphere(0.026, 8, 6);
    const eyeMat = standard(appearance.eyes, { roughness: 0.35 });
    const whiteMat = standard('#ffffff', { roughness: 0.4 });
    for (const side of [1, -1]) {
      const white = this.mesh(sphere(0.032, 8, 6), whiteMat, false);
      white.scale.set(1, 1.1, 0.5);
      white.position.set(side * 0.052, 0.14, 0.116);
      head.add(white);
      const iris = this.mesh(eyeGeo, eyeMat, false);
      iris.scale.set(1, 1.1, 0.55);
      iris.position.set(side * 0.052, 0.138, 0.132);
      head.add(iris);
      if (side === 1) this.eyeL = white;
      else this.eyeR = white;
    }

    // Brows give each face a little attitude without needing textures.
    for (const side of [1, -1]) {
      const brow = this.mesh(box(0.05, 0.011, 0.02), hairMat, false);
      brow.position.set(side * 0.052, 0.183, 0.122);
      brow.rotation.z = side * 0.12;
      head.add(brow);
    }

    const mouth = this.mesh(box(0.045, 0.008, 0.014), standard('#8a4a44', { roughness: 0.6 }), false);
    mouth.position.set(0, 0.062, 0.128);
    head.add(mouth);

    this.buildHair(head, hairMat, appearance);

    if (appearance.facialHair === 'goatee') {
      const goatee = this.mesh(box(0.062, 0.05, 0.03), hairMat, false);
      goatee.position.set(0, 0.028, 0.118);
      head.add(goatee);
      const chinStrip = this.mesh(box(0.03, 0.03, 0.02), hairMat, false);
      chinStrip.position.set(0, 0.005, 0.115);
      head.add(chinStrip);
    }

    if (appearance.glasses) {
      const frameMat = standard('#2b2b31', { roughness: 0.35, metalness: 0.3 });
      for (const side of [1, -1]) {
        // Square frames: a voxel face wants a voxel pair of glasses.
        const lens = this.mesh(box(0.084, 0.07, 0.012), emissive('#cfe6f2', 0.3), false);
        lens.position.set(side * 0.053, 0.14, 0.126);
        head.add(lens);
        for (const [dx, dy, w, h] of [
          [0, 0.04, 0.092, 0.012],
          [0, -0.04, 0.092, 0.012],
          [side * 0.046, 0, 0.012, 0.082],
          [-side * 0.046, 0, 0.012, 0.082],
        ] as const) {
          const bar = this.mesh(box(w, h, 0.014), frameMat, false);
          bar.position.set(side * 0.053 + dx, 0.14 + dy, 0.13);
          head.add(bar);
        }
      }
      const bridge = this.mesh(box(0.03, 0.007, 0.007), frameMat, false);
      bridge.position.set(0, 0.145, 0.128);
      head.add(bridge);
      for (const side of [1, -1]) {
        const arm = this.mesh(box(0.008, 0.007, 0.09), frameMat, false);
        arm.position.set(side * 0.09, 0.145, 0.085);
        head.add(arm);
      }
    }

    // Blob shadow: cheap grounding that survives the low quality preset.
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.02;
    blob.renderOrder = -1;
    root.add(blob);

    this.parts = {
      root,
      body,
      hips,
      torso,
      neck,
      head,
      armL: armLeft.arm,
      armR: armRight.arm,
      forearmL: armLeft.forearm,
      forearmR: armRight.forearm,
      legL: left.leg,
      legR: right.leg,
      shinL: left.shin,
      shinR: right.shin,
    };
  }

  private mesh(geo: THREE.BufferGeometry, mat: THREE.Material, castShadow: boolean): THREE.Mesh {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = castShadow;
    m.receiveShadow = false;
    this.meshes.push(m);
    return m;
  }

  /** Silhouette is the main way players tell characters apart at distance. */
  private buildHair(head: THREE.Group, mat: THREE.Material, a: Appearance): void {
    const cap = this.mesh(sphere(0.142, 14, 10), mat, true);
    cap.scale.set(1, 1.06, 1);
    cap.position.y = 0.145;
    head.add(cap);
    // Carve the face out by pushing a skin-coloured plane in front of the cap.
    const faceCut = this.mesh(box(0.2, 0.16, 0.1), standard(a.skin, { roughness: 0.92 }), false);
    faceCut.position.set(0, 0.115, 0.095);
    head.add(faceCut);

    switch (a.hairStyle) {
      case 'short': {
        const back = this.mesh(box(0.2, 0.12, 0.06), mat, true);
        back.position.set(0, 0.135, -0.1);
        head.add(back);
        break;
      }
      case 'fringe': {
        const fringe = this.mesh(box(0.24, 0.075, 0.09), mat, true);
        fringe.position.set(0, 0.208, 0.075);
        fringe.rotation.x = -0.16;
        head.add(fringe);
        const side = this.mesh(box(0.05, 0.14, 0.16), mat, true);
        side.position.set(0.13, 0.14, 0.0);
        head.add(side);
        const side2 = side.clone();
        side2.position.x = -0.13;
        head.add(side2);
        break;
      }
      case 'middlePart': {
        for (const s of [1, -1]) {
          const flap = this.mesh(box(0.11, 0.09, 0.1), mat, true);
          flap.position.set(s * 0.07, 0.212, 0.07);
          flap.rotation.z = s * 0.28;
          head.add(flap);
        }
        const sideL = this.mesh(box(0.045, 0.17, 0.15), mat, true);
        sideL.position.set(0.132, 0.125, -0.01);
        head.add(sideL);
        const sideR = sideL.clone();
        sideR.position.x = -0.132;
        head.add(sideR);
        break;
      }
      case 'mod': {
        const sweep = this.mesh(box(0.255, 0.085, 0.125), mat, true);
        sweep.position.set(0, 0.215, 0.045);
        sweep.rotation.x = -0.1;
        head.add(sweep);
        for (const s of [1, -1]) {
          const sides = this.mesh(box(0.046, 0.175, 0.17), mat, true);
          sides.position.set(s * 0.132, 0.115, -0.01);
          head.add(sides);
        }
        const nape = this.mesh(box(0.22, 0.09, 0.07), mat, true);
        nape.position.set(0, 0.075, -0.115);
        head.add(nape);
        break;
      }
      case 'hero': {
        const spike = this.mesh(box(0.2, 0.14, 0.1), mat, true);
        spike.position.set(0, 0.255, 0.045);
        spike.rotation.x = -0.42;
        head.add(spike);
        const spike2 = this.mesh(box(0.1, 0.13, 0.08), mat, true);
        spike2.position.set(0.07, 0.28, 0.0);
        spike2.rotation.z = -0.35;
        head.add(spike2);
        const spike3 = this.mesh(box(0.1, 0.13, 0.08), mat, true);
        spike3.position.set(-0.07, 0.28, 0.0);
        spike3.rotation.z = 0.35;
        head.add(spike3);
        break;
      }
    }
  }

  /** Floating name tag, shown when the player is close to an NPC. */
  attachLabel(text: string, color: string): void {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'rgba(18,16,26,0.72)';
    ctx.roundRect(4, 12, 248, 40, 12);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(12, 24, 5, 16);
    ctx.fillStyle = '#f4f1ea';
    ctx.font = 'bold 26px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 132, 33, 210);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sprite.scale.set(1.1, 0.28, 1);
    sprite.position.y = 2.05;
    sprite.renderOrder = 10;
    this.group.add(sprite);
    this.label = sprite;
    this.setLabelVisible(false);
  }

  setLabelVisible(v: boolean): void {
    if (this.label) this.label.visible = v;
  }

  setState(state: AnimState): void {
    if (this.state === state) return;
    this.state = state;
    this.stateTime = 0;
  }

  getState(): AnimState {
    return this.state;
  }

  /** `speed` is horizontal metres per second, used to time the walk cycle. */
  update(dt: number, speed = 0): void {
    this.moveSpeed = speed;
    this.stateTime += dt;
    const p = this.parts;

    // Blink on a loose timer - cheap, and it makes faces feel alive.
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      const closed = this.blinkTimer > -0.12;
      this.eyeL.scale.y = closed ? 0.12 : 1.1;
      this.eyeR.scale.y = closed ? 0.12 : 1.1;
      if (this.blinkTimer < -0.12) this.blinkTimer = 2.5 + Math.random() * 4;
    }

    const moving = this.state === 'walk' || this.state === 'run';
    if (moving) {
      this.phase += dt * (this.state === 'run' ? 11 : 7.2) * Math.max(0.4, Math.min(1.6, speed / 2.4));
    } else {
      this.phase += dt * 1.6;
    }

    // Reset to a neutral pose before layering the current animation on top.
    p.body.position.set(0, 0, 0);
    p.body.rotation.set(0, 0, 0);
    p.torso.rotation.set(0, 0, 0);
    p.head.rotation.set(0, 0, 0);
    p.armL.rotation.set(0, 0, 0.08);
    p.armR.rotation.set(0, 0, -0.08);
    p.forearmL.rotation.set(0, 0, 0);
    p.forearmR.rotation.set(0, 0, 0);
    p.legL.rotation.set(0, 0, 0);
    p.legR.rotation.set(0, 0, 0);
    p.shinL.rotation.set(0, 0, 0);
    p.shinR.rotation.set(0, 0, 0);

    switch (this.state) {
      case 'walk':
      case 'run':
        this.poseWalk(this.state === 'run');
        break;
      case 'jump':
        this.poseJump();
        break;
      case 'talk':
        this.poseTalk();
        break;
      case 'attack':
        this.poseAttack(false);
        break;
      case 'heavy':
        this.poseAttack(true);
        break;
      case 'block':
        this.poseBlock();
        break;
      case 'dodge':
        this.poseDodge();
        break;
      case 'hit':
        this.poseHit();
        break;
      case 'victory':
        this.poseVictory();
        break;
      case 'defeat':
        this.poseDefeat();
        break;
      case 'sit':
        this.poseSit();
        break;
      case 'sleep':
        this.poseSleep();
        break;
      case 'work':
        this.poseWork();
        break;
      case 'train':
        this.poseTrain();
        break;
      default:
        this.poseIdle();
    }
  }

  private poseIdle(): void {
    const p = this.parts;
    const breathe = Math.sin(this.phase * 1.4) * 0.5 + 0.5;
    p.body.position.y = breathe * 0.012;
    p.torso.rotation.x = -0.02 + breathe * 0.02;
    p.armL.rotation.x = Math.sin(this.phase * 1.2) * 0.04 - 0.03;
    p.armR.rotation.x = Math.sin(this.phase * 1.2 + 0.6) * 0.04 - 0.03;
    p.armL.rotation.z = 0.09 + breathe * 0.015;
    p.armR.rotation.z = -0.09 - breathe * 0.015;
    p.head.rotation.y = Math.sin(this.phase * 0.35) * 0.16;
  }

  private poseWalk(run: boolean): void {
    const p = this.parts;
    const amp = run ? 0.95 : 0.62;
    const s = Math.sin(this.phase);
    const c = Math.cos(this.phase);
    p.legL.rotation.x = s * amp;
    p.legR.rotation.x = -s * amp;
    p.shinL.rotation.x = Math.max(0, -Math.sin(this.phase - 0.6)) * (run ? 1.1 : 0.7);
    p.shinR.rotation.x = Math.max(0, -Math.sin(this.phase + Math.PI - 0.6)) * (run ? 1.1 : 0.7);
    p.armL.rotation.x = -s * amp * 0.8;
    p.armR.rotation.x = s * amp * 0.8;
    p.forearmL.rotation.x = -Math.max(0, -s) * (run ? 0.9 : 0.4);
    p.forearmR.rotation.x = -Math.max(0, s) * (run ? 0.9 : 0.4);
    // Vertical bob and a slight forward lean sell the weight of the stride.
    p.body.position.y = Math.abs(c) * (run ? 0.07 : 0.035) - 0.01;
    p.torso.rotation.x = run ? 0.16 : 0.06;
    p.torso.rotation.y = -s * 0.09;
    p.head.rotation.y = s * 0.05;
  }

  private poseJump(): void {
    const p = this.parts;
    p.legL.rotation.x = 0.5;
    p.legR.rotation.x = -0.25;
    p.shinL.rotation.x = 0.7;
    p.armL.rotation.x = -2.1;
    p.armR.rotation.x = -1.7;
    p.torso.rotation.x = -0.1;
  }

  private poseTalk(): void {
    const p = this.parts;
    this.poseIdle();
    const g = Math.sin(this.phase * 3.1);
    p.armR.rotation.x = -0.5 - g * 0.3;
    p.armR.rotation.z = -0.4;
    p.forearmR.rotation.x = -0.7 - g * 0.35;
    p.head.rotation.x = Math.sin(this.phase * 2.4) * 0.06;
    p.head.rotation.y = Math.sin(this.phase * 1.1) * 0.1;
  }

  private poseAttack(heavy: boolean): void {
    const p = this.parts;
    const d = heavy ? 0.55 : 0.32;
    const t = Math.min(1, this.stateTime / d);
    // Wind up, then snap through.
    const swing = t < 0.45 ? -(t / 0.45) * 0.9 : ((t - 0.45) / 0.55) * 2.6 - 0.9;
    p.armR.rotation.x = -1.1 - swing;
    p.forearmR.rotation.x = -0.5 + swing * 0.4;
    p.armL.rotation.x = -0.6;
    p.forearmL.rotation.x = -1.1;
    p.torso.rotation.y = -swing * 0.4;
    p.torso.rotation.x = heavy ? 0.18 : 0.08;
    p.legR.rotation.x = -0.2;
    p.legL.rotation.x = 0.25;
  }

  private poseBlock(): void {
    const p = this.parts;
    p.armL.rotation.x = -1.55;
    p.armR.rotation.x = -1.55;
    p.armL.rotation.z = 0.5;
    p.armR.rotation.z = -0.5;
    p.forearmL.rotation.x = -1.5;
    p.forearmR.rotation.x = -1.5;
    p.torso.rotation.x = 0.14;
    p.legL.rotation.x = 0.2;
    p.legR.rotation.x = -0.2;
    p.body.position.y = -0.05;
  }

  private poseDodge(): void {
    const p = this.parts;
    const t = Math.min(1, this.stateTime / 0.34);
    const lean = Math.sin(t * Math.PI);
    p.body.rotation.z = lean * 0.55;
    p.body.position.y = -lean * 0.12;
    p.armL.rotation.x = -0.9;
    p.armR.rotation.x = -0.9;
    p.legL.rotation.x = lean * 0.5;
    p.legR.rotation.x = -lean * 0.3;
  }

  private poseHit(): void {
    const p = this.parts;
    const t = Math.min(1, this.stateTime / 0.3);
    const recoil = Math.sin(t * Math.PI);
    p.torso.rotation.x = -recoil * 0.4;
    p.head.rotation.x = -recoil * 0.5;
    p.armL.rotation.x = recoil * 0.6;
    p.armR.rotation.x = recoil * 0.5;
    p.body.position.z = -recoil * 0.12;
  }

  private poseVictory(): void {
    const p = this.parts;
    const b = Math.abs(Math.sin(this.phase * 2.2));
    p.armL.rotation.x = -2.5 - b * 0.2;
    p.armR.rotation.x = -2.5 - b * 0.2;
    p.armL.rotation.z = 0.35;
    p.armR.rotation.z = -0.35;
    p.body.position.y = b * 0.09;
    p.head.rotation.x = -0.2;
  }

  private poseDefeat(): void {
    const p = this.parts;
    const t = Math.min(1, this.stateTime / 0.8);
    p.body.rotation.x = t * 0.5;
    p.body.position.y = -t * 0.42;
    p.torso.rotation.x = t * 0.5;
    p.head.rotation.x = t * 0.4;
    p.legL.rotation.x = -t * 1.3;
    p.legR.rotation.x = -t * 1.1;
    p.shinL.rotation.x = t * 1.6;
    p.shinR.rotation.x = t * 1.5;
    p.armL.rotation.x = -t * 0.7;
    p.armR.rotation.x = -t * 0.5;
  }

  private poseSit(): void {
    const p = this.parts;
    p.body.position.y = -0.42;
    p.legL.rotation.x = -1.5;
    p.legR.rotation.x = -1.5;
    p.shinL.rotation.x = 1.5;
    p.shinR.rotation.x = 1.5;
    p.armL.rotation.x = -0.35;
    p.armR.rotation.x = -0.35;
    p.torso.rotation.x = 0.06 + Math.sin(this.phase * 1.2) * 0.02;
  }

  private poseSleep(): void {
    const p = this.parts;
    p.body.rotation.x = -Math.PI / 2;
    p.body.position.y = -0.72;
    p.legL.rotation.x = -0.12;
    p.legR.rotation.x = 0.12;
    p.armL.rotation.z = 0.9;
    p.armR.rotation.z = -0.9;
    p.torso.rotation.x = Math.sin(this.phase * 0.8) * 0.02;
  }

  private poseWork(): void {
    const p = this.parts;
    const g = Math.sin(this.phase * 2.6);
    p.torso.rotation.x = 0.22;
    p.armL.rotation.x = -1.1 - g * 0.2;
    p.armR.rotation.x = -1.1 + g * 0.2;
    p.forearmL.rotation.x = -0.7;
    p.forearmR.rotation.x = -0.7;
    p.head.rotation.x = 0.22;
  }

  private poseTrain(): void {
    const p = this.parts;
    const g = Math.abs(Math.sin(this.phase * 2.4));
    p.armL.rotation.x = -0.4 - g * 1.9;
    p.armR.rotation.x = -0.4 - g * 1.9;
    p.armL.rotation.z = 0.42;
    p.armR.rotation.z = -0.42;
    p.forearmL.rotation.x = -g * 0.6;
    p.forearmR.rotation.x = -g * 0.6;
    p.body.position.y = -g * 0.06;
    p.legL.rotation.x = g * 0.2;
    p.legR.rotation.x = g * 0.2;
  }

  /** Current animation speed, used by the footstep sound trigger. */
  get stridePhase(): number {
    return this.phase;
  }

  get speed(): number {
    return this.moveSpeed;
  }

  setShadows(enabled: boolean): void {
    for (const m of this.meshes) m.castShadow = enabled && m.castShadow;
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Sprite) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
    // Geometries and materials are shared through the cache and disposed there.
    this.group.clear();
  }
}

export const CHARACTER_HEIGHT = BASE_HEIGHT;
