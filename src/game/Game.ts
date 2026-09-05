import * as THREE from 'three';
import { getCharacter } from '@/data/characters';
import { RANDOM_EVENTS, type RandomEventDefinition } from '@/data/events';
import { getInterior } from '@/data/interiors';
import { getJob } from '@/data/jobs';
import { approachPoint, getLocation, isOpen, LOCATIONS } from '@/data/locations';
import { Engine } from './core/Engine';
import { InputManager } from './core/Input';
import { effectiveSettings, type Settings } from './core/settings';
import { CharacterModel, type AnimState } from './characters/CharacterModel';
import { CameraRig } from './player/CameraRig';
import { PlayerController, PLAYER_RADIUS } from './player/PlayerController';
import { Atmosphere } from './world/Atmosphere';
import { buildInterior, type BuiltInterior } from './world/InteriorBuilder';
import { buildWorld, type BuiltWorld } from './world/WorldBuilder';
import { animateWater } from './world/props';
import { NpcManager } from './npc/NpcManager';
import { audio, type Ambience } from './audio/AudioManager';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { GameState } from './state';
import { hourOf, SECONDS_PER_GAME_HOUR, timeOfDay } from './systems/timeSystem';
import { movementMultiplier } from './systems/stats';
import { createRng } from './systems/rng';
import type { InteractionTarget } from './types';

const AUTOSAVE_INTERVAL_MINUTES = 90;

export class Game {
  private engine: Engine;
  private input = new InputManager();
  private camera: CameraRig;
  private world: BuiltWorld;
  private atmosphere: Atmosphere;
  private exteriorScene = new THREE.Scene();
  private playerModel: CharacterModel;
  /** Follows the player so they never dissolve into the night. */
  private playerLight = new THREE.PointLight(0xffe6c4, 0, 15, 1.9);
  private player: PlayerController;
  private npcs: NpcManager;

  private interior: BuiltInterior | null = null;
  private interiorId: string | null = null;

  private minuteAccumulator = 0;
  private eventTimer = 45;
  private autosaveTimer = AUTOSAVE_INTERVAL_MINUTES;
  private waterTime = 0;
  private paused = false;
  private disposed = false;
  private lockedTo: string | null = null;
  private combatFoe: string | null = null;
  /** Open-air locations the player is currently standing in, for visit counts. */
  private insideAreas = new Set<string>();
  private settings: Settings;
  private lastAmbience: Ambience = 'none';
  private uiFpsTimer = 0;

  /** Interaction currently offered to the player. */
  private activeTarget: InteractionTarget | null = null;

  constructor(canvas: HTMLCanvasElement, state: GameState) {
    this.engine = new Engine(canvas);
    this.settings = effectiveSettings(useSettingsStore.getState().effective());

    this.camera = new CameraRig(this.engine.aspect);
    this.applyCameraSettings();

    this.world = buildWorld();
    this.exteriorScene.add(this.world.root);

    this.atmosphere = new Atmosphere(this.exteriorScene, {
      shadows: this.settings.graphics.shadows,
      shadowMapSize: this.settings.graphics.shadowMapSize,
      viewDistance: this.settings.graphics.viewDistance,
      effects: this.settings.graphics.effects,
      reducedParticles: this.settings.performance.reducedParticles,
    });
    this.atmosphere.setWeather(state.weather);

    const def = getCharacter(state.playerId);
    this.playerModel = new CharacterModel(def.appearance);
    this.playerLight.position.set(0, 1.7, 0);
    this.playerModel.group.add(this.playerLight);
    this.exteriorScene.add(this.playerModel.group);

    this.player = new PlayerController(this.playerModel, {
      onFootstep: (running) => audio.play(running ? 'stepRun' : 'step'),
      onJump: () => audio.play('dodge'),
      onLand: (v) => {
        if (v > 6) this.camera.addShake(0.18);
      },
    });

    this.npcs = new NpcManager(state, this.exteriorScene);
    this.npcs.setSimRate(this.settings.performance.npcSimRate);
    this.npcs.warpToSchedule(state);

    // Start where the save says, nudged out of any geometry that has moved.
    const spawn = state.player.inside
      ? getInterior(state.player.inside)?.spawn ?? { x: 0, z: 0 }
      : this.world.collision.findFreeSpot(state.player.x, state.player.z, PLAYER_RADIUS);
    this.player.teleport(spawn.x, spawn.z, state.player.facing);
    this.camera.reset(this.player.position, state.player.facing + Math.PI);

    if (state.player.inside) this.enterInterior(state.player.inside, false);

    this.engine.applyGraphics(this.settings.graphics);
    this.input.attach(canvas);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.engine.start(this.frame);
  }

  /* ------------------------------------------------------------ plumbing */

  private onResize = () => {
    this.engine.resize();
    this.camera.setAspect(this.engine.aspect);
  };

  private onVisibility = () => {
    if (document.hidden) audio.suspend();
    else if (!this.paused) audio.resume();
  };

  applySettings(settings: Settings): void {
    this.settings = effectiveSettings(settings);
    this.engine.applyGraphics(this.settings.graphics);
    this.atmosphere.setOptions({
      shadows: this.settings.graphics.shadows,
      shadowMapSize: this.settings.graphics.shadowMapSize,
      viewDistance: this.settings.graphics.viewDistance,
      effects: this.settings.graphics.effects,
      reducedParticles: this.settings.performance.reducedParticles,
    });
    this.npcs.setSimRate(this.settings.performance.npcSimRate);
    this.applyCameraSettings();
    audio.setVolumes(this.settings.audio.master, this.settings.audio.music, this.settings.audio.sfx);
  }

  private applyCameraSettings(): void {
    const g = this.settings.gameplay;
    this.camera.sensitivity = g.cameraSensitivity;
    this.camera.invertY = g.invertY;
    this.camera.distance = g.cameraDistance;
    this.camera.reducedMotion = this.settings.accessibility.reducedMotion;
    this.camera.shakeEnabled = this.settings.accessibility.screenShake;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.input.setEnabled(!paused);
    if (paused) audio.suspend();
    else audio.resume();
  }

  /** Freezes movement while a conversation or minigame is on screen. */
  setLockedTo(npcId: string | null): void {
    this.lockedTo = npcId;
    this.player.setLocked(npcId !== null);
  }

  get inputManager(): InputManager {
    return this.input;
  }

  get playerPosition(): THREE.Vector3 {
    return this.player.position;
  }

  get currentInterior(): string | null {
    return this.interiorId;
  }

  npcPositions() {
    return this.npcs.positions();
  }

  get renderStats() {
    return { fps: this.engine.fps, calls: this.engine.info.render.calls, tris: this.engine.info.render.triangles };
  }

  /* --------------------------------------------------------- transitions */

  enterInterior(interiorId: string, playSound = true): void {
    const def = getInterior(interiorId);
    if (!def) return;
    if (this.interior) this.leaveInteriorInternal();

    this.interior = buildInterior(def);
    this.interiorId = interiorId;
    this.interior.root.add(this.playerModel.group);
    this.npcs.setInteriorRoot(this.interior.root);

    // Give NPCs sensible standing spots rather than stacking them on the door.
    const spots: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 6; i++) {
      spots.push({ x: (i % 3 === 0 ? -1 : i % 3 === 1 ? 0 : 1) * def.width * 0.5, z: -def.depth * 0.35 + (i % 2) * 2.2 });
    }
    this.npcs.placeInInterior(interiorId, spots);

    // Step a little further in than the doormat, so the camera has room behind
    // the player and the exit prompt does not fire the moment you arrive.
    this.player.teleport(def.spawn.x, def.spawn.z - 1.2, Math.PI);
    this.player.jumpEnabled = false;
    this.camera.reset(this.player.position, 0, 0.42);

    const homeLoc = getLocation(def.location);
    useGameStore.getState().setPose({
      inside: interiorId,
      x: homeLoc?.x ?? this.player.position.x,
      z: homeLoc?.z ?? this.player.position.z,
    });
    if (playSound) audio.play('door');
  }

  private leaveInteriorInternal(): void {
    if (!this.interior) return;
    this.exteriorScene.add(this.playerModel.group);
    this.npcs.setInteriorRoot(null);
    this.interior.dispose();
    this.interior = null;
    this.interiorId = null;
    this.player.jumpEnabled = true;
  }

  exitToLocation(locationId: string): void {
    const loc = getLocation(locationId);
    this.leaveInteriorInternal();
    const spot = loc ? approachPoint(locationId) : { x: 0, z: 0 };
    const free = this.world.collision.findFreeSpot(spot.x, spot.z, PLAYER_RADIUS);
    this.player.teleport(free.x, free.z, loc?.door ? loc.door.facing : 0);
    this.camera.reset(this.player.position, (loc?.door?.facing ?? 0) + Math.PI);
    useGameStore.getState().setPose({ inside: null, x: free.x, z: free.z });
    audio.play('door');
  }

  fastTravel(locationId: string): void {
    const spot = approachPoint(locationId);
    if (this.interior) this.leaveInteriorInternal();
    const free = this.world.collision.findFreeSpot(spot.x, spot.z, PLAYER_RADIUS);
    this.player.teleport(free.x, free.z, 0);
    this.camera.reset(this.player.position, Math.PI);
    useGameStore.getState().setPose({ inside: null, x: free.x, z: free.z });
    useGameStore.getState().advanceTime(12, 1.1);
  }

  /* ------------------------------------------------------------- the loop */

  private frame = (dt: number) => {
    if (this.disposed) return;
    const store = useGameStore.getState();
    const state = store.state;
    if (!state) return;

    this.input.update();

    const collision = this.interior ? this.interior.collision : this.world.collision;

    if (!this.paused) {
      const speedStat = state.stats.speed;
      this.player.speedMultiplier = movementMultiplier(speedStat, state.needs.energy);
      this.player.update(dt, this.input, this.camera, collision, !!this.interior);
      this.advanceClock(dt, state);
    } else {
      this.playerModel.update(dt, 0);
    }

    // The rig only knows where to look because we hand it the player every
    // frame - without this the camera stays anchored wherever it last reset.
    this.camera.target.copy(this.player.position);
    this.camera.update(
      dt,
      this.input,
      collision,
      !!this.interior,
      this.interior
        ? {
            width: this.interior.definition.width,
            depth: this.interior.definition.depth,
            height: this.interior.definition.height,
          }
        : null,
    );

    if (this.combatFoe) {
      // While fighting, the models are posed by the combat panel, not the AI.
      const agent = this.npcs.get(this.combatFoe);
      agent?.model.update(dt, 0);
    } else {
      this.npcs.update({
        state,
        collision: this.world.collision,
        playerPos: this.player.position,
        playerInterior: this.interiorId,
        dt: this.paused ? 0 : dt,
        lockedTo: this.lockedTo,
      });
    }

    this.atmosphere.update(this.paused ? 0 : dt, state.time, this.player.position, this.exteriorScene);
    // Interiors have their own lighting, so the fill is outdoors-only.
    this.playerLight.intensity = this.interior ? 0 : this.atmosphere.night * 6;

    if (!this.paused && this.settings.graphics.effects) {
      this.waterTime += dt;
      for (const w of this.world.waters) animateWater(w, this.waterTime, state.weather === 'rain' ? 2 : 1);
    }

    if (this.interior) {
      for (const light of this.interior.animatedLights) {
        light.intensity = 8 + Math.sin(this.waterTime * 3 + light.position.x) * 3;
      }
    }

    this.updateInteractions(state);
    this.updateAmbience(state);
    if (!this.paused) this.trackVisits();

    if (!this.paused) {
      // Indoors the controller works in room-local space, so the position the
      // rest of the game sees (map pin, saves) is the building's own.
      const here = this.interiorId ? getLocation(getInterior(this.interiorId)?.location ?? '') : null;
      useGameStore.getState().setPose({
        x: here ? here.x : this.player.position.x,
        z: here ? here.z : this.player.position.z,
        facing: this.player.facing,
      });
    }

    this.uiFpsTimer += dt;
    if (this.uiFpsTimer > 0.5) {
      this.uiFpsTimer = 0;
      useUiStore.getState().setFps(Math.round(this.engine.fps));
    }

    audio.hourHint = hourOf(state.time);

    const scene = this.interior ? this.interior.scene : this.exteriorScene;
    this.engine.render(scene, this.camera.camera);
  };

  private advanceClock(dt: number, state: GameState): void {
    const gameMinutes = (dt * 60) / SECONDS_PER_GAME_HOUR;
    this.minuteAccumulator += gameMinutes;
    if (this.minuteAccumulator >= 1) {
      const whole = Math.floor(this.minuteAccumulator);
      this.minuteAccumulator -= whole;
      const drain = this.player.currentSpeed > 4 ? 1.5 : this.player.currentSpeed > 0.4 ? 1.05 : 0.8;
      useGameStore.getState().advanceTime(whole, drain);

      this.autosaveTimer -= whole;
      if (this.autosaveTimer <= 0) {
        this.autosaveTimer = AUTOSAVE_INTERVAL_MINUTES;
        if (this.settings.gameplay.autosave) useGameStore.getState().save();
      }

      this.eventTimer -= whole;
      if (this.eventTimer <= 0) {
        this.eventTimer = 70 + Math.random() * 130;
        this.maybeFireEvent(state);
      }
    }

    const weather = useGameStore.getState().state?.weather;
    if (weather && weather !== this.atmosphere.getWeather()) this.atmosphere.setWeather(weather);
  }

  /**
   * Counts arrivals at the open-air places that have no door to walk through,
   * which is what "meet me at the park bench" style tasks measure.
   */
  private trackVisits(): void {
    if (this.interior) return;
    for (const loc of LOCATIONS) {
      if (loc.interior || loc.kind === 'home') continue;
      const d = Math.hypot(this.player.position.x - loc.x, this.player.position.z - loc.z);
      if (d < 22 && !this.insideAreas.has(loc.id)) {
        this.insideAreas.add(loc.id);
        const key = `visit:${loc.id}`;
        const store = useGameStore.getState();
        store.setFlag(key, (store.state?.flags[key] ?? 0) + 1);
        store.discoverActivity(loc.id);
      } else if (d > 32) {
        this.insideAreas.delete(loc.id);
      }
    }
  }

  private updateAmbience(state: GameState): void {
    let kind: Ambience;
    if (state.weather === 'rain' && !this.interior) kind = 'rain';
    else if (this.interiorId === 'int_arcade') kind = 'arcade';
    else if (this.interiorId === 'int_basement') kind = 'basement';
    else if (this.interior) kind = 'interior';
    else if (this.player.position.distanceTo(new THREE.Vector3(-28, 0, 37)) < 30) kind = 'park';
    else kind = 'street';
    if (kind !== this.lastAmbience) {
      this.lastAmbience = kind;
      audio.setAmbience(kind);
    }
  }

  /* ------------------------------------------------------- interactions */

  private updateInteractions(state: GameState): void {
    const pool: InteractionTarget[] = this.interior
      ? this.interior.interactions
      : this.world.interactions;

    const pos = this.player.position;
    const nearby: InteractionTarget[] = [];
    let best: InteractionTarget | null = null;
    let bestDist = Infinity;

    const consider = (t: InteractionTarget) => {
      const d = Math.hypot(t.x - pos.x, t.z - pos.z);
      if (d > t.radius) return;
      nearby.push(t);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    };

    for (const t of pool) consider(t);
    for (const t of this.npcs.interactionTargets(pos, this.interiorId)) consider(t);

    const changed = best !== this.activeTarget;
    this.activeTarget = best;
    if (changed) useUiStore.getState().setPrompt(best);
    if (nearby.length !== useUiStore.getState().nearby.length) useUiStore.getState().setNearby(nearby);

    if (!this.paused && this.input.consume('interact') && best) {
      this.execute(best, state);
    }
  }

  /** Runs an interaction. UI-heavy actions open a panel and return. */
  execute(target: InteractionTarget, state: GameState): void {
    const ui = useUiStore.getState();
    const store = useGameStore.getState();
    const action = String(target.data?.action ?? '');
    audio.play('interact');

    switch (target.kind) {
      case 'door': {
        const locId = String(target.data?.location);
        const hour = hourOf(state.time);
        if (!isOpen(locId, hour)) {
          ui.toast(`${getLocation(locId)?.name ?? 'It'} is closed right now`, 'bad', '🔒');
          audio.play('error');
          return;
        }
        this.enterInterior(String(target.data?.interior));
        store.discoverActivity(locId);
        store.setFlag(`visit:${locId}`, (state.flags[`visit:${locId}`] ?? 0) + 1);
        return;
      }
      case 'exit':
        this.exitToLocation(String(target.data?.location));
        return;
      case 'npc':
        ui.openDialogue(String(target.data?.npc));
        this.setLockedTo(String(target.data?.npc));
        return;
      case 'shop': {
        const shopId = String(target.data?.shop ?? action.split(':')[1] ?? 'konbini');
        if (action.startsWith('sell')) ui.openShop(action.split(':')[1]);
        else ui.openShop(shopId);
        return;
      }
      case 'job': {
        const jobId = String(target.data?.job ?? action.split(':')[1]);
        const job = getJob(jobId);
        if (!job) return;
        ui.openMinigame(job.minigame ?? 'shift-konbini', { job: jobId });
        return;
      }
      case 'minigame': {
        const id = String(target.data?.minigame ?? action.split(':')[1]);
        ui.openMinigame(id as never, { ...(target.data ?? {}) });
        return;
      }
      case 'bed':
        ui.askConfirm({
          title: 'Sleep until morning?',
          body: 'Sleeping restores energy, mood and health, and takes the clock through to 07:00.',
          confirmLabel: 'Sleep',
          tone: 'info',
          onConfirm: () => this.sleep(),
        });
        return;
      default:
        break;
    }

    this.runPropAction(action, target, state);
  }

  private runPropAction(action: string, target: InteractionTarget, state: GameState): void {
    const ui = useUiStore.getState();
    const store = useGameStore.getState();

    switch (action) {
      case 'storage':
        ui.openPanel('storage');
        return;
      case 'study': {
        store.advanceTime(90, 0.9);
        store.grantStatXp({ intelligence: 14, discipline: 6 }, state.homeFurniture.includes('bookshelf') ? 1.35 : 1);
        store.adjustNeed({ mood: -4, energy: -8 });
        store.patch((s) => {
          s.counters = { ...s.counters, studySessions: s.counters.studySessions + 1 };
        });
        store.discoverActivity('studying');
        ui.toast('You studied for an hour and a half', 'good', '📚');
        audio.play('levelUp');
        return;
      }
      case 'tv':
        store.advanceTime(60, 0.7);
        store.adjustNeed({ mood: 12, energy: -3 });
        store.discoverActivity('watching TV');
        ui.toast('You watched a variety show. It was fine.', 'good', '📺');
        return;
      case 'relax':
        store.advanceTime(30, 0.5);
        store.adjustNeed({ mood: 8, energy: 6 });
        store.discoverActivity('resting');
        ui.toast('You sat for a while. Better.', 'good', '🪑');
        return;
      case 'fridge': {
        const meal = state.inventory.find((slot) => {
          const item = slot.itemId;
          return item === 'bento' || item === 'onigiri' || item === 'katsu_curry' || item === 'sandwich';
        });
        if (meal) {
          store.useItem(meal.itemId);
          store.advanceTime(20);
        } else if (state.money >= 300) {
          store.spendMoney(300, 'Groceries');
          store.adjustNeed({ hunger: 30, mood: 3 });
          store.advanceTime(25);
          ui.toast('You cooked something simple', 'good', '🍳');
        } else {
          ui.toast('The fridge is empty and so is your wallet', 'bad', '🍽️');
          audio.play('error');
        }
        return;
      }
      case 'wardrobe':
        ui.openPanel('inventory');
        ui.toast('Pick something to wear from your bag', 'info', '🧥');
        return;
      case 'vending':
        ui.openShop('vending');
        return;
      case 'drink:water':
        store.adjustNeed({ energy: 6, mood: 2 });
        store.advanceTime(5);
        ui.toast('Cold water. Surprisingly good.', 'good', '💧');
        return;
      case 'pray': {
        if (!store.spendMoney(100, 'Offering')) return;
        store.grantStatXp({ luck: 12, discipline: 4 });
        store.adjustNeed({ mood: 14 });
        store.advanceTime(20);
        store.discoverActivity('visiting the shrine');
        const rng = createRng(state.seed + state.time.day);
        if (rng() < 0.12) store.give('shrine_omamori', 1);
        ui.toast('You bow twice, clap twice, bow once.', 'good', '⛩️');
        audio.play('levelUp');
        return;
      }
      case 'notices':
      case 'arcade:scores':
        ui.openPanel('notices');
        return;
      case 'gym:membership':
        ui.openPanel('activities');
        return;
      case 'arcade:tokens':
        ui.openShop('vending');
        return;
      case 'basement:bar':
        if (store.spendMoney(400, 'A drink')) {
          store.adjustNeed({ mood: 10, energy: 5, hunger: 5 });
          store.advanceTime(15);
        }
        return;
      case 'train:strength':
      case 'train:stamina':
      case 'train:combat': {
        const kind = action.split(':')[1];
        if (state.needs.energy < 15) {
          ui.toast('You are far too tired to train', 'bad', '😵');
          audio.play('error');
          return;
        }
        if (!store.spendMoney(500, 'Gym session')) return;
        store.advanceTime(60, 1.6);
        store.adjustNeed({ energy: -18, hunger: -8, mood: 6 });
        if (kind === 'strength') store.grantStatXp({ strength: 16, stamina: 6, discipline: 4 });
        else if (kind === 'stamina') store.grantStatXp({ stamina: 16, speed: 8, discipline: 4 });
        else store.grantStatXp({ strength: 8, speed: 10, stamina: 8 });
        store.discoverActivity('training at the gym');
        audio.play('levelUp');
        this.player.playAnimation('train');
        return;
      }
      case 'eat:restaurant':
        ui.openShop('restaurant');
        return;
      default:
        break;
    }

    // World-level activities carried on the target itself.
    const activity = String(target.data?.activity ?? '');
    switch (activity) {
      case 'relax':
        store.advanceTime(30, 0.5);
        store.adjustNeed({ mood: 9, energy: 7 });
        store.discoverActivity('resting on a bench');
        ui.toast('You watched the street go by', 'good', '🌸');
        return;
      case 'fasttravel':
        ui.openPanel('fasttravel');
        return;
      case 'notices':
        ui.openPanel('notices');
        return;
      case 'pray':
        this.runPropAction('pray', target, state);
        return;
      case 'trash': {
        const junk = state.inventory.filter((s) => s.itemId === 'empty_can' || s.itemId === 'scrap_metal');
        if (!junk.length) {
          ui.toast('Nothing to throw away', 'info', '🗑️');
          return;
        }
        let total = 0;
        for (const j of junk) {
          total += j.qty;
          store.take(j.itemId, j.qty);
        }
        store.adjustNeed({ mood: 3 });
        ui.toast(`Recycled ${total} item${total === 1 ? '' : 's'}`, 'good', '♻️');
        return;
      }
      default:
        ui.toast('Nothing happens', 'info');
    }
  }

  /* ------------------------------------------------------------- combat */

  /**
   * Stages a fight in the world: both characters are placed facing each other
   * and the camera swings side-on so the player can read the spacing.
   */
  beginCombat(npcId: string): void {
    const agent = this.npcs.get(npcId);
    this.setLockedTo(null);
    this.player.setLocked(true);
    if (!agent) return;

    const dir = new THREE.Vector3(
      agent.position.x - this.player.position.x,
      0,
      agent.position.z - this.player.position.z,
    );
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    dir.normalize();

    // Stand them a fixed distance apart so the framing is consistent.
    agent.position.set(
      this.player.position.x + dir.x * 2.6,
      0,
      this.player.position.z + dir.z * 2.6,
    );
    agent.facing = Math.atan2(-dir.x, -dir.z);
    agent.model.group.position.copy(agent.position);
    agent.model.group.rotation.y = agent.facing;

    this.player.facing = Math.atan2(dir.x, dir.z);
    this.playerModel.group.rotation.y = this.player.facing;

    this.combatFoe = npcId;
    this.camera.yaw = this.player.facing + Math.PI / 2;
    this.camera.pitch = 0.16;
    this.camera.distance = 6.4;
  }

  /** Mirrors a combat action onto the 3D models. */
  combatAnim(who: 'player' | 'foe', anim: AnimState): void {
    if (who === 'player') {
      this.playerModel.setState(anim);
      return;
    }
    const agent = this.combatFoe ? this.npcs.get(this.combatFoe) : null;
    agent?.model.setState(anim);
  }

  endCombat(): void {
    this.combatFoe = null;
    this.player.setLocked(false);
    this.camera.distance = this.settings.gameplay.cameraDistance;
  }

  shakeCamera(amount: number): void {
    this.camera.addShake(amount);
  }

  /** Triggers the bed flow from the confirmation dialog. */
  sleep(): void {
    const store = useGameStore.getState();
    store.sleepUntil(7);
    store.save();
    this.autosaveTimer = AUTOSAVE_INTERVAL_MINUTES;
    const state = store.state;
    if (state) this.npcs.warpToSchedule(state);
    audio.play('confirm');
  }

  /* ------------------------------------------------------- random events */

  private maybeFireEvent(state: GameState): void {
    const ui = useUiStore.getState();
    if (ui.panel !== null) return;
    const hour = hourOf(state.time);
    const nearNpc = this.npcs.nearest(this.player.position, 16, this.interiorId);

    const candidates = RANDOM_EVENTS.filter((e) => {
      const w = e.when;
      if (!w) return true;
      if (w.needsNpc && !nearNpc) return false;
      if (w.weather && !w.weather.includes(state.weather)) return false;
      if (w.hours && (hour < w.hours[0] || hour >= w.hours[1])) return false;
      if (w.location) {
        const here = this.interiorId ? getInterior(this.interiorId)?.location : null;
        if (!here || !w.location.includes(here)) return false;
      }
      return true;
    });
    if (!candidates.length) return;

    const rng = createRng(state.seed + Math.floor(state.time.minutes));
    if (rng() > 0.55) return;

    let total = 0;
    for (const c of candidates) total += c.weight;
    let r = rng() * total;
    let chosen: RandomEventDefinition = candidates[0];
    for (const c of candidates) {
      r -= c.weight;
      if (r <= 0) {
        chosen = c;
        break;
      }
    }
    ui.showEvent(chosen, nearNpc?.id ?? null);
    this.setPaused(true);
  }

  /* -------------------------------------------------------------- misc */

  /** Debug helper: jump straight to a location. */
  teleportTo(locationId: string): void {
    this.fastTravel(locationId);
  }

  refreshNpcSchedules(): void {
    const state = useGameStore.getState().state;
    if (state) this.npcs.warpToSchedule(state);
  }

  visibleLocations(): typeof LOCATIONS {
    return LOCATIONS;
  }

  timeOfDayLabel(): string {
    const state = useGameStore.getState().state;
    return state ? timeOfDay(state.time) : 'day';
  }

  dispose(): void {
    this.disposed = true;
    this.engine.stop();
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.input.detach();
    this.leaveInteriorInternal();
    this.npcs.dispose();
    this.atmosphere.dispose();
    this.world.dispose();
    this.playerModel.dispose();
    this.engine.dispose();
  }
}
