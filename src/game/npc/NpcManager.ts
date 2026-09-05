import * as THREE from 'three';
import { CHARACTERS, getCharacter } from '@/data/characters';
import { approachPoint, getLocation, isOpen, requireLocation } from '@/data/locations';
import { buildNavGraph, findPath, type NavNode } from '@/data/world-layout';
import { CharacterModel } from '@/game/characters/CharacterModel';
import type { CollisionWorld } from '@/game/world/collision';
import type { GameState } from '@/game/state';
import type { ActivityKind, InteractionTarget, NpcRuntimeState, NpcState, ScheduleBlock } from '@/game/types';
import { hourOf } from '@/game/systems/timeSystem';
import { clamp } from '@/game/systems/rng';

const WALK_SPEED = 2.5;
const ARRIVE_RADIUS = 1.6;

/** Which activities send an NPC inside a building rather than loitering outside. */
const INDOOR_ACTIVITIES: ActivityKind[] = ['sleep', 'work', 'shop', 'eat', 'gamble', 'study', 'home'];

const ACTIVITY_STATE: Record<ActivityKind, NpcState> = {
  sleep: 'sleeping',
  home: 'idle',
  work: 'working',
  shop: 'shopping',
  eat: 'eating',
  exercise: 'exercising',
  play: 'playing',
  relax: 'idle',
  socialize: 'socializing',
  study: 'idle',
  gamble: 'playing',
};

export interface NpcContext {
  state: GameState;
  collision: CollisionWorld;
  playerPos: THREE.Vector3;
  playerInterior: string | null;
  dt: number;
  /** Player is talking to this NPC, so they should stand still and face them. */
  lockedTo: string | null;
}

export class NpcAgent {
  readonly id: string;
  readonly model: CharacterModel;
  readonly position = new THREE.Vector3();
  facing = 0;

  private path: Array<{ x: number; z: number }> = [];
  private pathIndex = 0;
  private repathTimer = 0;
  private targetLocation = '';
  private activity: ActivityKind = 'home';
  private idleWobble = Math.random() * 10;
  private animSpeed = 0;
  visible = true;
  inside: string | null = null;

  constructor(id: string, runtime: NpcRuntimeState) {
    this.id = id;
    const def = getCharacter(id);
    this.model = new CharacterModel(def.appearance);
    this.model.attachLabel(def.name, def.themeColor);
    this.position.set(runtime.x, 0, runtime.z);
    this.facing = runtime.facing;
    this.inside = runtime.inside;
    this.targetLocation = runtime.target;
    this.model.group.position.copy(this.position);
  }

  get definition() {
    return getCharacter(this.id);
  }

  currentActivity(): ActivityKind {
    return this.activity;
  }

  scheduleFor(hour: number): ScheduleBlock {
    const blocks = this.definition.schedule;
    for (const b of blocks) {
      if (b.from <= b.to ? hour >= b.from && hour < b.to : hour >= b.from || hour < b.to) return b;
    }
    return blocks[0];
  }

  /** Low-frequency decision making. */
  simulate(dt: number, ctx: NpcContext, nav: NavNode[]): void {
    const runtime = ctx.state.npcs[this.id];
    if (!runtime) return;
    const hour = hourOf(ctx.state.time);
    const block = this.scheduleFor(hour);

    // Locations that are shut send the NPC home instead of standing at a door.
    let wanted = block.location;
    if (!isOpen(wanted, hour) && wanted !== this.definition.home) wanted = this.definition.home;
    this.activity = block.activity;

    if (ctx.lockedTo === this.id) {
      this.path = [];
      this.animSpeed = 0;
      runtime.state = 'talking';
      return;
    }

    if (wanted !== this.targetLocation) {
      this.targetLocation = wanted;
      this.inside = null;
      this.repathTimer = 0;
    }

    const loc = getLocation(this.targetLocation);
    if (!loc) return;
    const goal = approachPoint(this.targetLocation);
    const distToGoal = Math.hypot(this.position.x - goal.x, this.position.z - goal.z);

    if (distToGoal < ARRIVE_RADIUS) {
      this.path = [];
      this.animSpeed = 0;
      const shouldEnter = !!loc.interior && INDOOR_ACTIVITIES.includes(this.activity);
      this.inside = shouldEnter ? loc.interior! : null;
      runtime.state = ACTIVITY_STATE[this.activity] ?? 'idle';
      runtime.inside = this.inside;
      // Idle NPCs turn slowly on the spot so they are not statues.
      this.idleWobble += dt * 0.4;
      if (!this.inside) this.facing += Math.sin(this.idleWobble) * dt * 0.5;
      this.simulateEconomy(dt, runtime);
      return;
    }

    this.inside = null;
    runtime.inside = null;
    runtime.state = 'walking';

    this.repathTimer -= dt;
    if (this.path.length === 0 || this.repathTimer <= 0) {
      this.path = findPath(nav, { x: this.position.x, z: this.position.z }, goal);
      this.pathIndex = 0;
      this.repathTimer = 6;
    }

    this.followPath(dt, ctx.collision);
    this.simulateEconomy(dt, runtime);
  }

  /** NPCs earn and spend so the neighbourhood economy is not player-only. */
  private simulateEconomy(dt: number, runtime: NpcRuntimeState): void {
    const p = this.definition.personality;
    if (this.activity === 'work') {
      runtime.money += dt * (6 + p.workEthic * 10);
      runtime.energy = clamp(runtime.energy - dt * 0.6, 0, 100);
    } else if (this.activity === 'shop' || this.activity === 'eat') {
      const spend = dt * 4;
      if (runtime.money > spend) {
        runtime.money -= spend;
        runtime.mood = clamp(runtime.mood + dt * 0.8, 0, 100);
      }
    } else if (this.activity === 'gamble') {
      // Erim's table: small swings either way, house edge included.
      const swing = (Math.random() - 0.52) * dt * 40;
      runtime.money = Math.max(0, runtime.money + swing);
    } else if (this.activity === 'sleep') {
      runtime.energy = clamp(runtime.energy + dt * 3.2, 0, 100);
      runtime.mood = clamp(runtime.mood + dt * 0.4, 0, 100);
    } else if (this.activity === 'exercise') {
      runtime.energy = clamp(runtime.energy - dt * 1.4, 0, 100);
      runtime.mood = clamp(runtime.mood + dt * 0.6, 0, 100);
    } else if (this.activity === 'socialize' || this.activity === 'relax' || this.activity === 'play') {
      runtime.mood = clamp(runtime.mood + dt * 0.9, 0, 100);
      runtime.energy = clamp(runtime.energy - dt * 0.4, 0, 100);
    }
    runtime.x = this.position.x;
    runtime.z = this.position.z;
    runtime.facing = this.facing;
    runtime.target = this.targetLocation;
  }

  private followPath(dt: number, collision: CollisionWorld): void {
    if (this.pathIndex >= this.path.length) {
      this.animSpeed = 0;
      return;
    }
    const wp = this.path[this.pathIndex];
    const dx = wp.x - this.position.x;
    const dz = wp.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.4) {
      this.pathIndex++;
      return;
    }

    const speed = WALK_SPEED * (0.85 + this.definition.baseStats.speed / 320);
    const step = speed * dt;
    const nx = (dx / dist) * step;
    const nz = (dz / dist) * step;
    const resolved = collision.move(this.position.x, this.position.z, nx, nz, 0.35);

    // Being wedged against geometry triggers a fresh path next tick.
    const moved = Math.hypot(resolved.x - this.position.x, resolved.z - this.position.z);
    if (moved < step * 0.25) this.repathTimer = 0;

    this.position.x = resolved.x;
    this.position.z = resolved.z;
    this.animSpeed = moved / Math.max(dt, 1e-4);

    const wanted = Math.atan2(dx, dz);
    let delta = wanted - this.facing;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.facing += delta * Math.min(1, dt * 8);
  }

  /** High-frequency visual update; skipped entirely when far away. */
  updateVisual(dt: number, ctx: NpcContext): void {
    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = this.facing;

    if (ctx.lockedTo === this.id) {
      const dx = ctx.playerPos.x - this.position.x;
      const dz = ctx.playerPos.z - this.position.z;
      this.facing = Math.atan2(dx, dz);
      this.model.group.rotation.y = this.facing;
      this.model.setState('talk');
      this.model.update(dt, 0);
      return;
    }

    if (this.animSpeed > 0.3) {
      this.model.setState(this.animSpeed > 3.6 ? 'run' : 'walk');
    } else {
      switch (this.activity) {
        case 'sleep':
          this.model.setState('sleep');
          break;
        case 'work':
          this.model.setState('work');
          break;
        case 'exercise':
          this.model.setState('train');
          break;
        case 'relax':
        case 'eat':
          this.model.setState('sit');
          break;
        case 'socialize':
          this.model.setState('talk');
          break;
        default:
          this.model.setState('idle');
      }
    }
    this.model.update(dt, this.animSpeed);
  }

  setVisible(v: boolean): void {
    if (this.visible === v) return;
    this.visible = v;
    this.model.group.visible = v;
  }

  dispose(): void {
    this.model.dispose();
  }
}

/**
 * Owns every NPC in the neighbourhood. Simulation runs on a fixed low-rate
 * tick (configurable, and slowed further in battery saver), while animation
 * only runs for the handful of characters the player can actually see.
 */
export class NpcManager {
  readonly agents = new Map<string, NpcAgent>();
  private nav: NavNode[] = buildNavGraph();
  private simAccumulator = 0;
  private simRate = 10;
  private exteriorRoot: THREE.Group;
  private interiorRoot: THREE.Group | null = null;

  constructor(state: GameState, exteriorScene: THREE.Scene) {
    this.exteriorRoot = new THREE.Group();
    this.exteriorRoot.name = 'npcs';
    exteriorScene.add(this.exteriorRoot);

    for (const c of CHARACTERS) {
      if (c.id === state.playerId) continue;
      const runtime = state.npcs[c.id];
      if (!runtime) continue;
      const agent = new NpcAgent(c.id, runtime);
      this.agents.set(c.id, agent);
      this.exteriorRoot.add(agent.model.group);
    }
  }

  setSimRate(hz: number): void {
    this.simRate = Math.max(1, hz);
  }

  /** Called when the player enters or leaves an interior. */
  setInteriorRoot(root: THREE.Group | null): void {
    this.interiorRoot = root;
  }

  update(ctx: NpcContext): void {
    const step = 1 / this.simRate;
    this.simAccumulator += ctx.dt;
    let guard = 0;
    while (this.simAccumulator >= step && guard++ < 4) {
      this.simAccumulator -= step;
      for (const agent of this.agents.values()) agent.simulate(step, ctx, this.nav);
    }

    for (const agent of this.agents.values()) {
      const sameSpace = ctx.playerInterior ? agent.inside === ctx.playerInterior : agent.inside === null;
      const dist = agent.position.distanceTo(ctx.playerPos);

      // Move the model between the exterior and the interior scene as needed.
      const wantParent = ctx.playerInterior && sameSpace ? this.interiorRoot : this.exteriorRoot;
      if (sameSpace && wantParent && agent.model.group.parent !== wantParent) {
        wantParent.add(agent.model.group);
      } else if (!sameSpace && agent.model.group.parent !== this.exteriorRoot) {
        this.exteriorRoot.add(agent.model.group);
      }

      const visible = sameSpace && dist < 120;
      agent.setVisible(visible);
      agent.model.setLabelVisible(visible && dist < 14);

      if (!visible) continue;
      if (dist < 45) agent.updateVisual(ctx.dt, ctx);
      else if (dist < 95) agent.updateVisual(ctx.dt * 2, ctx); // coarser cadence far away
    }
  }

  /** Places NPCs sensibly when the player walks into a shared interior. */
  placeInInterior(interiorId: string, spots: Array<{ x: number; z: number }>): void {
    let i = 0;
    for (const agent of this.agents.values()) {
      if (agent.inside !== interiorId) continue;
      const spot = spots[i % spots.length] ?? { x: 0, z: 0 };
      agent.position.set(spot.x + (i % 2) * 0.6, 0, spot.z);
      agent.facing = Math.PI;
      agent.model.group.position.copy(agent.position);
      i++;
    }
  }

  /** Interaction targets for NPCs the player can currently reach. */
  interactionTargets(playerPos: THREE.Vector3, playerInterior: string | null): InteractionTarget[] {
    const out: InteractionTarget[] = [];
    for (const agent of this.agents.values()) {
      const sameSpace = playerInterior ? agent.inside === playerInterior : agent.inside === null;
      if (!sameSpace) continue;
      if (agent.position.distanceTo(playerPos) > 6) continue;
      const def = agent.definition;
      out.push({
        id: `npc:${agent.id}`,
        label: `Talk to ${def.name}`,
        icon: '💬',
        x: agent.position.x,
        y: 1.2,
        z: agent.position.z,
        radius: 2.6,
        kind: 'npc',
        data: { npc: agent.id },
      });
    }
    return out;
  }

  get(id: string): NpcAgent | undefined {
    return this.agents.get(id);
  }

  /** Where an NPC currently is, for the map screen. */
  positions(): Array<{ id: string; x: number; z: number; inside: string | null }> {
    return Array.from(this.agents.values(), (a) => ({ id: a.id, x: a.position.x, z: a.position.z, inside: a.inside }));
  }

  /** Nearest NPC within range, used for random events and the fight prompt. */
  nearest(pos: THREE.Vector3, maxDist = 18, interior: string | null = null): NpcAgent | null {
    let best: NpcAgent | null = null;
    let bestD = maxDist;
    for (const agent of this.agents.values()) {
      const sameSpace = interior ? agent.inside === interior : agent.inside === null;
      if (!sameSpace) continue;
      const d = agent.position.distanceTo(pos);
      if (d < bestD) {
        bestD = d;
        best = agent;
      }
    }
    return best;
  }

  /** Snaps every NPC to where their schedule says they should be right now. */
  warpToSchedule(state: GameState): void {
    const hour = hourOf(state.time);
    for (const agent of this.agents.values()) {
      const block = agent.scheduleFor(hour);
      const loc = isOpen(block.location, hour) ? block.location : agent.definition.home;
      const spot = approachPoint(loc);
      agent.position.set(spot.x, 0, spot.z);
      agent.model.group.position.copy(agent.position);
      const def = requireLocation(loc);
      agent.inside = def.interior && INDOOR_ACTIVITIES.includes(block.activity) ? def.interior : null;
      const runtime = state.npcs[agent.id];
      if (runtime) {
        runtime.x = spot.x;
        runtime.z = spot.z;
        runtime.inside = agent.inside;
        runtime.target = loc;
      }
    }
  }

  dispose(): void {
    for (const agent of this.agents.values()) agent.dispose();
    this.agents.clear();
    this.exteriorRoot.removeFromParent();
  }
}
