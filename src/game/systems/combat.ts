import type { Personality, StatKey, Stats } from '@/game/types';
import { clamp } from './rng';

export type CombatAction = 'idle' | 'attack' | 'heavy' | 'dodge' | 'block' | 'retreat' | 'stagger' | 'down';

export interface CombatEvent {
  t: number;
  kind: 'hit' | 'block' | 'dodge' | 'miss' | 'crit' | 'knockdown' | 'stamina' | 'end' | 'retreat';
  by: 'player' | 'foe';
  amount?: number;
  text: string;
}

export interface Fighter {
  id: string;
  name: string;
  color: string;
  stats: Stats;
  personality: Personality;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  /** Seconds remaining of the current action. */
  actionTimer: number;
  action: CombatAction;
  /** Seconds until another action may be committed. */
  recovery: number;
  /** Absolute combat time until which incoming hits miss. */
  invulnUntil: number;
  blocking: boolean;
  /** Combat time at which an AI-held guard is released. */
  blockUntil: number;
  knockdowns: number;
  hitsLanded: number;
  /** Set when the action's damage window has already been resolved. */
  resolved: boolean;
}

export interface CombatState {
  t: number;
  player: Fighter;
  foe: Fighter;
  events: CombatEvent[];
  over: boolean;
  outcome: 'player' | 'foe' | 'fled' | null;
  aiTimer: number;
  seedCounter: number;
}

export const ACTION_COST: Record<string, number> = {
  attack: 11,
  heavy: 26,
  dodge: 15,
  block: 0,
  retreat: 12,
};

const ACTION_WINDUP: Record<string, number> = {
  attack: 0.26,
  heavy: 0.52,
  dodge: 0.34,
  block: 0.2,
  retreat: 0.5,
};

const ACTION_RECOVERY: Record<string, number> = {
  attack: 0.32,
  heavy: 0.72,
  dodge: 0.22,
  block: 0.12,
  retreat: 0.3,
};

export function maxHpFor(stats: Stats): number {
  return Math.round(58 + stats.stamina * 0.72 + stats.strength * 0.3);
}

export function maxStaminaFor(stats: Stats): number {
  return Math.round(52 + stats.stamina * 0.5 + stats.discipline * 0.18);
}

export function createFighter(
  id: string,
  name: string,
  color: string,
  stats: Stats,
  personality: Personality,
): Fighter {
  const maxHp = maxHpFor(stats);
  const maxStamina = maxStaminaFor(stats);
  return {
    id,
    name,
    color,
    stats,
    personality,
    hp: maxHp,
    maxHp,
    stamina: maxStamina,
    maxStamina,
    actionTimer: 0,
    action: 'idle',
    recovery: 0,
    invulnUntil: -1,
    blocking: false,
    blockUntil: 0,
    knockdowns: 0,
    hitsLanded: 0,
    resolved: true,
  };
}

export function createCombat(player: Fighter, foe: Fighter): CombatState {
  return {
    t: 0,
    player,
    foe,
    events: [],
    over: false,
    outcome: null,
    aiTimer: 0.8,
    seedCounter: 1,
  };
}

/** Damage a landed attack deals, before block reduction. */
export function attackDamage(
  attacker: Stats,
  defender: Stats,
  heavy: boolean,
  roll: number,
): { damage: number; crit: boolean } {
  const power = attacker.strength * 0.52 + attacker.speed * 0.16 + attacker.discipline * 0.08;
  const typeMul = heavy ? 1.85 : 1;
  const variance = 0.86 + roll * 0.28;
  const defense = defender.stamina * 0.22 + defender.strength * 0.16;
  const critChance = 0.03 + attacker.luck / 480 - defender.luck / 1600;
  const crit = roll > 1 - Math.max(0.01, critChance);
  let dmg = power * typeMul * variance * 0.34 - defense * 0.22;
  if (crit) dmg *= 1.75;
  return { damage: Math.max(2, Math.round(dmg)), crit };
}

/** Probability an attack connects at all, before dodge invulnerability. */
export function hitChance(attacker: Stats, defender: Stats, heavy: boolean): number {
  const base = heavy ? 0.78 : 0.9;
  return clamp(base + (attacker.speed - defender.speed) / 320, 0.45, 0.98);
}

export function canAct(f: Fighter, action: CombatAction): boolean {
  if (f.action === 'down' || f.action === 'stagger') return false;
  if (f.recovery > 0 || f.actionTimer > 0) return false;
  const cost = ACTION_COST[action] ?? 0;
  return f.stamina >= cost;
}

export function commitAction(state: CombatState, who: 'player' | 'foe', action: CombatAction): boolean {
  const f = who === 'player' ? state.player : state.foe;
  if (action === 'block') {
    if (f.action === 'down' || f.action === 'stagger') return false;
    f.blocking = true;
    return true;
  }
  if (!canAct(f, action)) return false;
  f.stamina = Math.max(0, f.stamina - (ACTION_COST[action] ?? 0));
  f.action = action;
  f.actionTimer = ACTION_WINDUP[action] ?? 0.3;
  f.recovery = 0;
  f.resolved = false;
  f.blocking = false;
  if (action === 'dodge') {
    // Speed extends the invulnerability window a little.
    f.invulnUntil = state.t + 0.28 + (f.stats.speed / 100) * 0.22;
  }
  return true;
}

export function releaseBlock(state: CombatState, who: 'player' | 'foe'): void {
  const f = who === 'player' ? state.player : state.foe;
  f.blocking = false;
}

function push(state: CombatState, e: Omit<CombatEvent, 't'>): void {
  state.events.push({ ...e, t: state.t });
  if (state.events.length > 40) state.events.shift();
}

function nextRoll(state: CombatState): number {
  // Deterministic-ish variation without threading an rng through every call.
  state.seedCounter = (state.seedCounter * 1103515245 + 12345) & 0x7fffffff;
  return (state.seedCounter % 10000) / 10000;
}

function resolveStrike(state: CombatState, attacker: 'player' | 'foe', heavy: boolean): void {
  const atk = attacker === 'player' ? state.player : state.foe;
  const def = attacker === 'player' ? state.foe : state.player;
  const roll = nextRoll(state);

  if (state.t < def.invulnUntil) {
    push(state, { kind: 'dodge', by: attacker, text: `${def.name} slips the ${heavy ? 'heavy ' : ''}strike` });
    return;
  }
  if (roll > hitChance(atk.stats, def.stats, heavy)) {
    push(state, { kind: 'miss', by: attacker, text: `${atk.name} misses` });
    return;
  }

  const { damage, crit } = attackDamage(atk.stats, def.stats, heavy, nextRoll(state));
  let final = damage;
  if (def.blocking && def.stamina > 0) {
    final = Math.max(1, Math.round(damage * 0.28));
    def.stamina = Math.max(0, def.stamina - Math.round(damage * 0.7));
    def.hp = Math.max(0, def.hp - final);
    push(state, { kind: 'block', by: attacker, amount: final, text: `${def.name} blocks (${final})` });
    if (def.stamina <= 0) {
      def.blocking = false;
      def.action = 'stagger';
      def.actionTimer = 0.75;
      def.resolved = true;
      push(state, { kind: 'stamina', by: attacker, text: `${def.name}'s guard breaks!` });
    }
    return;
  }

  def.hp = Math.max(0, def.hp - final);
  atk.hitsLanded += 1;
  push(state, {
    kind: crit ? 'crit' : 'hit',
    by: attacker,
    amount: final,
    text: crit ? `${atk.name} lands a clean counter! (${final})` : `${atk.name} connects (${final})`,
  });

  const knockdownThreshold = def.maxHp * (heavy ? 0.14 : 0.2);
  if (final >= knockdownThreshold || (crit && heavy)) {
    def.action = 'down';
    def.actionTimer = 1.25;
    def.blocking = false;
    def.resolved = true;
    def.knockdowns += 1;
    push(state, { kind: 'knockdown', by: attacker, text: `${def.name} goes down!` });
  } else if (final >= def.maxHp * 0.09) {
    def.action = 'stagger';
    def.actionTimer = 0.4;
    def.resolved = true;
  }
}

/** AI action choice, weighted by personality, stamina and how the fight is going. */
export function chooseAiAction(state: CombatState): CombatAction {
  const me = state.foe;
  const foe = state.player;
  const p = me.personality;
  const hpRatio = me.hp / me.maxHp;
  const stamRatio = me.stamina / me.maxStamina;
  const smart = me.stats.intelligence / 100;

  // React to an incoming attack: the smarter the fighter, the better the read.
  const incoming = foe.actionTimer > 0 && (foe.action === 'attack' || foe.action === 'heavy');
  if (incoming && Math.random() < 0.25 + smart * 0.55) {
    if (stamRatio > 0.3 && Math.random() < 0.45 + me.stats.speed / 300) return 'dodge';
    return 'block';
  }

  if (stamRatio < 0.2) return 'block';
  if (hpRatio < 0.18 && p.aggression < 0.4 && Math.random() < 0.3) return 'retreat';

  const heavyWeight = p.aggression * 0.6 + (me.stats.strength / 100) * 0.5 + (hpRatio < 0.4 ? 0.25 : 0);
  const attackWeight = 1.1 + p.aggression * 0.9;
  const blockWeight = 0.45 + (1 - p.aggression) * 0.8 + (hpRatio < 0.35 ? 0.6 : 0);
  const dodgeWeight = 0.35 + (me.stats.speed / 100) * 0.9;

  const total = heavyWeight + attackWeight + blockWeight + dodgeWeight;
  let r = Math.random() * total;
  if ((r -= attackWeight) <= 0) return 'attack';
  if ((r -= heavyWeight) <= 0) return 'heavy';
  if ((r -= dodgeWeight) <= 0) return 'dodge';
  return 'block';
}

/** Advances the fight by dt seconds. Returns the state for convenience. */
export function tickCombat(state: CombatState, dt: number, aiEnabled = true): CombatState {
  if (state.over) return state;
  state.t += dt;

  for (const who of ['player', 'foe'] as const) {
    const f = who === 'player' ? state.player : state.foe;

    if (f.actionTimer > 0) {
      f.actionTimer -= dt;
      if (f.actionTimer <= 0) {
        f.actionTimer = 0;
        if (!f.resolved && (f.action === 'attack' || f.action === 'heavy')) {
          resolveStrike(state, who, f.action === 'heavy');
          f.resolved = true;
          f.recovery = ACTION_RECOVERY[f.action] ?? 0.3;
        } else if (f.action === 'retreat' && !f.resolved) {
          f.resolved = true;
          const other = who === 'player' ? state.foe : state.player;
          const chance = clamp(0.35 + (f.stats.speed - other.stats.speed) / 200, 0.1, 0.9);
          if (Math.random() < chance) {
            state.over = true;
            state.outcome = 'fled';
            push(state, { kind: 'retreat', by: who, text: `${f.name} breaks away from the fight.` });
            return state;
          }
          push(state, { kind: 'miss', by: who, text: `${f.name} tries to disengage and is cut off.` });
          f.recovery = 0.4;
        }
        if (f.action !== 'block') f.action = 'idle';
      }
    } else if (f.recovery > 0) {
      f.recovery = Math.max(0, f.recovery - dt);
      if (f.recovery === 0) f.action = 'idle';
    }

    if (f.blocking && f.blockUntil > 0 && state.t >= f.blockUntil) {
      f.blocking = false;
      f.blockUntil = 0;
    }

    // Stamina economy: blocking bleeds, standing still recovers.
    if (f.blocking) {
      f.stamina = Math.max(0, f.stamina - 7 * dt);
      if (f.stamina <= 0) f.blocking = false;
    } else if (f.action === 'idle' || f.action === 'down') {
      const regen = 8 + f.stats.stamina * 0.06 + f.stats.discipline * 0.02;
      f.stamina = Math.min(f.maxStamina, f.stamina + regen * dt);
    }
  }

  if (aiEnabled && !state.over) {
    state.aiTimer -= dt;
    if (state.aiTimer <= 0) {
      const foe = state.foe;
      const think = 0.42 + (100 - foe.stats.speed) / 190;
      state.aiTimer = think * (0.75 + Math.random() * 0.5);
      const action = chooseAiAction(state);
      if (action === 'block') {
        foe.blocking = true;
        // Guard is dropped again after a short beat.
        foe.blockUntil = state.t + 0.5 + Math.random() * 0.5;
      } else {
        foe.blocking = false;
        commitAction(state, 'foe', action);
      }
    }
  }

  if (state.player.hp <= 0 || state.foe.hp <= 0) {
    state.over = true;
    state.outcome = state.player.hp <= 0 ? 'foe' : 'player';
    push(state, {
      kind: 'end',
      by: state.outcome === 'player' ? 'player' : 'foe',
      text: state.outcome === 'player' ? `${state.foe.name} cannot continue.` : `${state.player.name} cannot continue.`,
    });
  }
  return state;
}

/** Stat XP earned from a fight, win or lose. */
export function combatXp(won: boolean, rounds: number): Partial<Record<StatKey, number>> {
  const base = won ? 1 : 0.55;
  const scale = clamp(rounds / 20, 0.4, 1.6);
  return {
    strength: Math.round(14 * base * scale),
    stamina: Math.round(12 * base * scale),
    speed: Math.round(9 * base * scale),
    discipline: Math.round(5 * base * scale),
  };
}
