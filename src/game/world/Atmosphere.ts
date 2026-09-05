import * as THREE from 'three';
import type { GameTime, Weather } from '@/game/types';
import { dayFactor, hourOf } from '@/game/systems/timeSystem';
import { glowTexture, petalTexture, shopGlassMaterial, windowMaterial } from '@/game/core/materials';

interface Palette {
  top: THREE.Color;
  bottom: THREE.Color;
  fog: THREE.Color;
  sun: THREE.Color;
  sunIntensity: number;
  ambient: THREE.Color;
  ambientIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
}

const c = (hex: string) => new THREE.Color(hex);

const NIGHT: Palette = {
  top: c('#080d20'),
  bottom: c('#1a2140'),
  fog: c('#141b31'),
  sun: c('#8fa6d8'),
  sunIntensity: 0.16,
  ambient: c('#3a4670'),
  ambientIntensity: 0.5,
  hemiSky: c('#222c50'),
  hemiGround: c('#141826'),
};

const DAWN: Palette = {
  top: c('#4d6ea8'),
  bottom: c('#f2b184'),
  fog: c('#d8b3a0'),
  sun: c('#ffd0a0'),
  sunIntensity: 1.15,
  ambient: c('#8a90b0'),
  ambientIntensity: 0.6,
  hemiSky: c('#9fb4d8'),
  hemiGround: c('#8a7a68'),
};

const DAY: Palette = {
  top: c('#5f9fd8'),
  bottom: c('#cfe6f2'),
  fog: c('#cfe0ea'),
  sun: c('#fff3dc'),
  sunIntensity: 1.85,
  ambient: c('#bcd0e0'),
  ambientIntensity: 0.72,
  hemiSky: c('#bcd8ee'),
  hemiGround: c('#94a07c'),
};

const DUSK: Palette = {
  top: c('#2f3f6e'),
  bottom: c('#eb8f5c'),
  fog: c('#b98a7e'),
  sun: c('#ffb072'),
  sunIntensity: 1.0,
  ambient: c('#7d7fa4'),
  ambientIntensity: 0.6,
  hemiSky: c('#8794c0'),
  hemiGround: c('#7d6f60'),
};

const SKY_VERT = `
varying vec3 vWorld;
void main() {
  vWorld = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;
varying vec3 vWorld;
void main() {
  float h = normalize(vWorld + vec3(0.0, offset, 0.0)).y;
  float t = pow(max(h, 0.0), exponent);
  gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
}`;

export interface AtmosphereOptions {
  shadows: boolean;
  shadowMapSize: number;
  viewDistance: number;
  effects: boolean;
  reducedParticles: boolean;
}

/**
 * Owns the sky dome, sun/moon, fog and weather particles, and blends the whole
 * palette across the in-game day. Everything is driven from one `update` call
 * so lighting, fog and sky can never disagree with each other.
 */
export class Atmosphere {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;
  readonly hemi: THREE.HemisphereLight;

  private skyMesh: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private sunSprite: THREE.Sprite | null = null;
  private moonSprite: THREE.Sprite | null = null;
  private stars: THREE.Points | null = null;
  private clouds: THREE.Group = new THREE.Group();

  private rain: THREE.Points | null = null;
  private rainVel: Float32Array | null = null;
  private petals: THREE.Points | null = null;
  private petalData: Float32Array | null = null;

  private weather: Weather = 'petals';
  private options: AtmosphereOptions;
  private nightAmount = 0;
  private windPhase = 0;

  constructor(scene: THREE.Scene, options: AtmosphereOptions) {
    this.options = options;

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: DAY.top.clone() },
        bottomColor: { value: DAY.bottom.clone() },
        offset: { value: 12 },
        exponent: { value: 0.7 },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(480, 24, 16), this.skyMat);
    this.skyMesh.renderOrder = -1000;
    this.group.add(this.skyMesh);

    this.ambient = new THREE.AmbientLight(DAY.ambient.clone(), DAY.ambientIntensity);
    this.group.add(this.ambient);

    this.hemi = new THREE.HemisphereLight(DAY.hemiSky.clone(), DAY.hemiGround.clone(), 0.55);
    this.group.add(this.hemi);

    this.sun = new THREE.DirectionalLight(DAY.sun.clone(), DAY.sunIntensity);
    this.sun.position.set(60, 90, 40);
    this.sun.castShadow = options.shadows;
    this.configureShadow(options.shadowMapSize);
    this.group.add(this.sun);
    this.group.add(this.sun.target);

    this.buildCelestials();
    this.buildStars();
    this.buildClouds();
    this.group.add(this.clouds);

    scene.fog = new THREE.Fog(DAY.fog.clone(), options.viewDistance * 0.28, options.viewDistance);
    scene.add(this.group);
  }

  private configureShadow(size: number): void {
    const cam = this.sun.shadow.camera;
    cam.near = 1;
    cam.far = 260;
    cam.left = -70;
    cam.right = 70;
    cam.top = 70;
    cam.bottom = -70;
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.bias = -0.0012;
    this.sun.shadow.normalBias = 0.035;
    cam.updateProjectionMatrix();
  }

  private buildCelestials(): void {
    const tex = glowTexture();
    if (!tex) return;
    this.sunSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, color: '#fff2c8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    );
    this.sunSprite.scale.set(60, 60, 1);
    this.group.add(this.sunSprite);

    this.moonSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, color: '#dfe7ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    );
    this.moonSprite.scale.set(34, 34, 1);
    this.group.add(this.moonSprite);
  }

  private buildStars(): void {
    const count = 420;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Upper hemisphere only - stars below the horizon are wasted vertices.
      const u = Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - u * 0.85);
      const r = 400;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 2.4,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    this.stars = new THREE.Points(geo, mat);
    this.stars.renderOrder = -999;
    this.group.add(this.stars);
  }

  private buildClouds(): void {
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, fog: false, depthWrite: false });
    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Group();
      const blobs = 3 + Math.floor(Math.random() * 3);
      for (let b = 0; b < blobs; b++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(6 + Math.random() * 5, 7, 5), mat);
        m.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 12);
        m.scale.y = 0.45;
        cloud.add(m);
      }
      const a = (i / 12) * Math.PI * 2;
      const r = 120 + Math.random() * 90;
      cloud.position.set(Math.cos(a) * r, 78 + Math.random() * 24, Math.sin(a) * r);
      this.clouds.add(cloud);
    }
  }

  /* ------------------------------------------------------------- weather */

  setWeather(weather: Weather): void {
    if (this.weather === weather) return;
    this.weather = weather;
    this.rebuildParticles();
  }

  getWeather(): Weather {
    return this.weather;
  }

  setOptions(options: AtmosphereOptions): void {
    const shadowChanged = options.shadowMapSize !== this.options.shadowMapSize;
    this.options = options;
    this.sun.castShadow = options.shadows;
    if (shadowChanged) this.configureShadow(options.shadowMapSize);
    this.rebuildParticles();
  }

  private clearParticles(): void {
    if (this.rain) {
      this.rain.removeFromParent();
      this.rain.geometry.dispose();
      (this.rain.material as THREE.Material).dispose();
      this.rain = null;
      this.rainVel = null;
    }
    if (this.petals) {
      this.petals.removeFromParent();
      this.petals.geometry.dispose();
      (this.petals.material as THREE.Material).dispose();
      this.petals = null;
      this.petalData = null;
    }
  }

  private rebuildParticles(): void {
    this.clearParticles();
    if (!this.options.effects && this.weather !== 'rain') return;
    const budget = this.options.reducedParticles ? 0.35 : 1;

    if (this.weather === 'rain') {
      const count = Math.floor(1800 * budget);
      const pos = new Float32Array(count * 3);
      const vel = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 90;
        pos[i * 3 + 1] = Math.random() * 40;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 90;
        vel[i] = 28 + Math.random() * 16;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: '#bcd4e6',
        size: 0.18,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      });
      this.rain = new THREE.Points(geo, mat);
      this.rain.frustumCulled = false;
      this.group.add(this.rain);
      this.rainVel = vel;
      return;
    }

    if (this.weather === 'petals' || this.weather === 'sunny') {
      const count = Math.floor((this.weather === 'petals' ? 420 : 140) * budget);
      if (count <= 0) return;
      const pos = new Float32Array(count * 3);
      // Per-particle: fall speed, sway frequency, sway phase.
      const data = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 80;
        pos[i * 3 + 1] = Math.random() * 22;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
        data[i * 3] = 0.5 + Math.random() * 0.9;
        data[i * 3 + 1] = 0.4 + Math.random() * 1.2;
        data[i * 3 + 2] = Math.random() * Math.PI * 2;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        map: petalTexture() ?? undefined,
        color: '#ffd9e6',
        size: 0.42,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      this.petals = new THREE.Points(geo, mat);
      this.petals.frustumCulled = false;
      this.group.add(this.petals);
      this.petalData = data;
    }
  }

  /* -------------------------------------------------------------- update */

  update(dt: number, time: GameTime, focus: THREE.Vector3, scene: THREE.Scene): void {
    const h = hourOf(time);
    const day = dayFactor(time);
    this.windPhase += dt * 0.6;

    // Blend between the four key palettes across the day.
    let a: Palette;
    let b: Palette;
    let t: number;
    if (h < 5) {
      a = NIGHT;
      b = NIGHT;
      t = 0;
    } else if (h < 7.5) {
      a = NIGHT;
      b = DAWN;
      t = (h - 5) / 2.5;
    } else if (h < 10) {
      a = DAWN;
      b = DAY;
      t = (h - 7.5) / 2.5;
    } else if (h < 16) {
      a = DAY;
      b = DAY;
      t = 0;
    } else if (h < 18.5) {
      a = DAY;
      b = DUSK;
      t = (h - 16) / 2.5;
    } else if (h < 20.5) {
      a = DUSK;
      b = NIGHT;
      t = (h - 18.5) / 2;
    } else {
      a = NIGHT;
      b = NIGHT;
      t = 0;
    }

    const top = a.top.clone().lerp(b.top, t);
    const bottom = a.bottom.clone().lerp(b.bottom, t);
    const fog = a.fog.clone().lerp(b.fog, t);
    const sunColor = a.sun.clone().lerp(b.sun, t);
    const sunIntensity = a.sunIntensity + (b.sunIntensity - a.sunIntensity) * t;
    const ambientColor = a.ambient.clone().lerp(b.ambient, t);
    const ambientIntensity = a.ambientIntensity + (b.ambientIntensity - a.ambientIntensity) * t;

    // Overcast and rain drain saturation and light.
    let dim = 1;
    let desat = 0;
    if (this.weather === 'rain') {
      dim = 0.55;
      desat = 0.55;
    } else if (this.weather === 'cloudy') {
      dim = 0.78;
      desat = 0.3;
    }
    const grey = (col: THREE.Color) => {
      if (desat <= 0) return col;
      const l = col.r * 0.3 + col.g * 0.59 + col.b * 0.11;
      return col.lerp(new THREE.Color(l, l, l), desat);
    };

    this.skyMat.uniforms.topColor.value.copy(grey(top));
    this.skyMat.uniforms.bottomColor.value.copy(grey(bottom));

    const fogColor = grey(fog);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(fogColor);
      scene.fog.near = this.options.viewDistance * (this.weather === 'rain' ? 0.14 : 0.3);
      scene.fog.far = this.options.viewDistance * (this.weather === 'rain' ? 0.72 : 1);
    }

    this.sun.color.copy(grey(sunColor));
    this.sun.intensity = sunIntensity * dim;
    this.ambient.color.copy(grey(ambientColor));
    this.ambient.intensity = ambientIntensity * (this.weather === 'rain' ? 1.15 : 1);
    this.hemi.color.copy(grey(a.hemiSky.clone().lerp(b.hemiSky, t)));
    this.hemi.groundColor.copy(a.hemiGround.clone().lerp(b.hemiGround, t));
    this.hemi.intensity = 0.4 + day * 0.3;

    // Sun arc: rises in the east, sets in the west.
    const sunAngle = ((h - 6) / 12) * Math.PI;
    const sunDir = new THREE.Vector3(Math.cos(sunAngle) * -1, Math.sin(sunAngle), 0.35).normalize();
    this.sun.position.copy(focus).addScaledVector(sunDir, 120);
    this.sun.target.position.copy(focus);
    this.sun.target.updateMatrixWorld();

    if (this.sunSprite) {
      this.sunSprite.position.copy(focus).addScaledVector(sunDir, 320);
      (this.sunSprite.material as THREE.SpriteMaterial).opacity = Math.max(0, day) * (1 - desat * 0.8);
      this.sunSprite.visible = sunDir.y > -0.1;
    }
    if (this.moonSprite) {
      const moonDir = sunDir.clone().negate();
      this.moonSprite.position.copy(focus).addScaledVector(moonDir, 320);
      (this.moonSprite.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - day * 2.4) * 0.9;
      this.moonSprite.visible = moonDir.y > -0.1;
    }

    this.nightAmount = Math.max(0, 1 - day * 2.6);
    if (this.stars) {
      (this.stars.material as THREE.PointsMaterial).opacity = this.nightAmount * (this.weather === 'rain' ? 0.1 : 0.9);
      this.stars.position.copy(focus);
      this.stars.rotation.y += dt * 0.004;
    }

    this.clouds.position.set(focus.x, 0, focus.z);
    this.clouds.rotation.y += dt * 0.006;
    for (const child of this.clouds.children) {
      const mat = (child.children[0] as THREE.Mesh)?.material as THREE.MeshBasicMaterial | undefined;
      if (mat) mat.opacity = this.weather === 'sunny' ? 0.4 : this.weather === 'rain' ? 0.85 : 0.62;
    }
    this.clouds.visible = this.weather !== 'petals' || true;

    // Warm the windows and shopfronts once the sun is down.
    const win = windowMaterial();
    win.color.lerpColors(new THREE.Color('#9fc4d8'), new THREE.Color('#ffd9a0'), this.nightAmount);
    win.opacity = 0.5 + this.nightAmount * 0.42;
    const shopGlass = shopGlassMaterial();
    shopGlass.color.lerpColors(new THREE.Color('#bfe0ee'), new THREE.Color('#ffe6b8'), this.nightAmount);
    shopGlass.opacity = 0.42 + this.nightAmount * 0.4;

    this.skyMesh.position.copy(focus);

    this.updateParticles(dt, focus);
  }

  private updateParticles(dt: number, focus: THREE.Vector3): void {
    if (this.rain && this.rainVel) {
      const pos = this.rain.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] -= this.rainVel[i] * dt;
        arr[i * 3] += dt * 3.5;
        if (arr[i * 3 + 1] < -2) {
          arr[i * 3] = focus.x + (Math.random() - 0.5) * 90;
          arr[i * 3 + 1] = 34 + Math.random() * 8;
          arr[i * 3 + 2] = focus.z + (Math.random() - 0.5) * 90;
        }
      }
      pos.needsUpdate = true;
    }

    if (this.petals && this.petalData) {
      const pos = this.petals.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const d = this.petalData;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] -= d[i * 3] * dt;
        // Petals drift on a wind sine rather than falling straight down.
        arr[i * 3] += Math.sin(this.windPhase * d[i * 3 + 1] + d[i * 3 + 2]) * dt * 1.5 + dt * 0.7;
        arr[i * 3 + 2] += Math.cos(this.windPhase * d[i * 3 + 1] * 0.7 + d[i * 3 + 2]) * dt * 0.9;
        if (arr[i * 3 + 1] < -1) {
          arr[i * 3] = focus.x + (Math.random() - 0.5) * 80;
          arr[i * 3 + 1] = 16 + Math.random() * 10;
          arr[i * 3 + 2] = focus.z + (Math.random() - 0.5) * 80;
        }
      }
      pos.needsUpdate = true;
    }
  }

  /** 0 in full daylight, 1 in the middle of the night. */
  get night(): number {
    return this.nightAmount;
  }

  dispose(): void {
    this.clearParticles();
    this.skyMesh.geometry.dispose();
    this.skyMat.dispose();
    this.stars?.geometry.dispose();
    this.group.removeFromParent();
  }
}

/**
 * Weather picks itself from a seeded roll each morning, biased towards the
 * bright spring days the neighbourhood is built around.
 */
export function rollWeather(rng: () => number, season: string): Weather {
  const r = rng();
  if (season === 'spring') {
    if (r < 0.4) return 'petals';
    if (r < 0.68) return 'sunny';
    if (r < 0.86) return 'cloudy';
    return 'rain';
  }
  if (r < 0.45) return 'sunny';
  if (r < 0.75) return 'cloudy';
  return 'rain';
}
