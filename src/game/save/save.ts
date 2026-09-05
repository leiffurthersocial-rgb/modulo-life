import { CHARACTERS, CHARACTER_MAP, getCharacter } from '@/data/characters';
import { INTERIOR_MAP } from '@/data/interiors';
import { approachPoint } from '@/data/locations';
import { SAVE_VERSION, createNewGame, newCounters, type GameState } from '@/game/state';
import { normalizeInventory } from '@/game/systems/inventory';
import { newNeeds } from '@/game/systems/needs';
import { newRelationship } from '@/game/systems/relationships';
import { emptyStatXp } from '@/game/systems/stats';
import { STAT_KEYS, type NpcRuntimeState } from '@/game/types';
import { clamp } from '@/game/systems/rng';

export const SAVE_KEY = 'modulo-life:save';
export const SAVE_META_KEY = 'modulo-life:save-meta';

export interface SaveMeta {
  playerId: string;
  playerName: string;
  day: number;
  clock: string;
  money: number;
  updatedAt: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

/**
 * Migrations run in order. Each takes the raw object at version N and returns
 * it at version N+1, so future save format changes stay additive.
 */
const MIGRATIONS: Array<(raw: Raw) => Raw> = [
  // v0 -> v1: the first published format. Older prototypes had no npcs map.
  (raw) => ({ ...raw, npcs: raw.npcs ?? {}, saveVersion: 1 }),
];

export function migrate(raw: Raw): Raw {
  let out = { ...raw };
  let version = num(out.saveVersion, 0);
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) break;
    out = step(out);
    version = num(out.saveVersion, version + 1);
    out.saveVersion = version;
  }
  return out;
}

/**
 * Rebuilds a fully-valid GameState from untrusted JSON. Anything missing or
 * corrupt is replaced with a sane default rather than throwing, so a partially
 * broken save still loads into a playable game.
 */
export function validateSave(input: unknown): GameState | null {
  if (!input || typeof input !== 'object') return null;
  const raw = migrate(input as Raw);

  const playerId = str(raw.playerId, '');
  if (!CHARACTER_MAP[playerId]) return null;
  const def = getCharacter(playerId);

  const base = createNewGame(playerId, num(raw.seed, 1));

  const stats = { ...def.baseStats };
  const statXp = emptyStatXp();
  if (raw.statXp && typeof raw.statXp === 'object') {
    for (const k of STAT_KEYS) statXp[k] = Math.max(0, num(raw.statXp[k], 0));
  }
  if (raw.stats && typeof raw.stats === 'object') {
    for (const k of STAT_KEYS) stats[k] = clamp(num(raw.stats[k], def.baseStats[k]), 1, 100);
  }

  const needs = { ...newNeeds() };
  if (raw.needs && typeof raw.needs === 'object') {
    needs.energy = clamp(num(raw.needs.energy, needs.energy), 0, 100);
    needs.hunger = clamp(num(raw.needs.hunger, needs.hunger), 0, 100);
    needs.mood = clamp(num(raw.needs.mood, needs.mood), 0, 100);
    needs.health = clamp(num(raw.needs.health, needs.health), 5, 100);
  }

  const relationships = { ...base.relationships };
  if (raw.relationships && typeof raw.relationships === 'object') {
    for (const c of CHARACTERS) {
      if (c.id === playerId) continue;
      const r = raw.relationships[c.id];
      const fresh = newRelationship();
      relationships[c.id] = r
        ? {
            score: clamp(num(r.score, 0), -100, 100),
            respect: clamp(num(r.respect, 0), -100, 100),
            interactionsToday: Math.max(0, num(r.interactionsToday, 0)),
            lastInteractionDay: num(r.lastInteractionDay, -1),
            giftPreferenceKnown: !!r.giftPreferenceKnown,
            history: Array.isArray(r.history) ? r.history.filter((h: unknown) => typeof h === 'string').slice(0, 8) : [],
          }
        : fresh;
    }
  }

  const npcs: Record<string, NpcRuntimeState> = { ...base.npcs };
  if (raw.npcs && typeof raw.npcs === 'object') {
    for (const c of CHARACTERS) {
      if (c.id === playerId) continue;
      const n = raw.npcs[c.id];
      if (!n) continue;
      const fallback = base.npcs[c.id];
      const spot = approachPoint(c.home);
      npcs[c.id] = {
        id: c.id,
        state: str(n.state, fallback.state) as NpcRuntimeState['state'],
        x: num(n.x, spot.x),
        z: num(n.z, spot.z),
        facing: num(n.facing, 0),
        money: Math.max(0, num(n.money, c.startingMoney)),
        mood: clamp(num(n.mood, 60), 0, 100),
        energy: clamp(num(n.energy, 80), 0, 100),
        target: str(n.target, c.home),
        inside: typeof n.inside === 'string' && INTERIOR_MAP[n.inside] ? n.inside : null,
        inventory: Array.isArray(n.inventory) ? normalizeInventory(n.inventory) : [],
        losses: Math.max(0, num(n.losses, 0)),
        wins: Math.max(0, num(n.wins, 0)),
      };
    }
  }

  const time = {
    day: Math.max(0, Math.floor(num(raw.time?.day, 0))),
    minutes: clamp(num(raw.time?.minutes, 420), 0, 1439),
    season: str(raw.time?.season, 'spring') as GameState['time']['season'],
  };

  const insideRaw = raw.player?.inside;
  const inside = typeof insideRaw === 'string' && INTERIOR_MAP[insideRaw] ? insideRaw : null;

  const counters = { ...newCounters(), ...(typeof raw.counters === 'object' && raw.counters ? raw.counters : {}) };
  counters.talkedToday = Array.isArray(counters.talkedToday) ? counters.talkedToday.filter((s: unknown) => typeof s === 'string') : [];

  return {
    saveVersion: SAVE_VERSION,
    createdAt: num(raw.createdAt, Date.now()),
    updatedAt: Date.now(),
    playerId,
    time,
    weather: str(raw.weather, 'petals') as GameState['weather'],
    seed: num(raw.seed, 1),
    money: Math.max(0, Math.round(num(raw.money, def.startingMoney))),
    stats,
    statXp,
    needs,
    inventory: Array.isArray(raw.inventory) ? normalizeInventory(raw.inventory) : base.inventory,
    storage: Array.isArray(raw.storage) ? normalizeInventory(raw.storage) : [],
    homeFurniture: Array.isArray(raw.homeFurniture) ? raw.homeFurniture.filter((s: unknown) => typeof s === 'string') : [],
    wearing: typeof raw.wearing === 'string' ? raw.wearing : null,
    relationships,
    npcs,
    quests: typeof raw.quests === 'object' && raw.quests ? raw.quests : {},
    jobId: typeof raw.jobId === 'string' ? raw.jobId : def.job,
    jobsUnlocked: Array.isArray(raw.jobsUnlocked) && raw.jobsUnlocked.length ? raw.jobsUnlocked : [def.job],
    shiftsToday: Math.max(0, num(raw.shiftsToday, 0)),
    lastShiftDay: num(raw.lastShiftDay, -1),
    minigames: typeof raw.minigames === 'object' && raw.minigames ? raw.minigames : {},
    activitiesDiscovered: Array.isArray(raw.activitiesDiscovered) ? raw.activitiesDiscovered : [],
    flags: typeof raw.flags === 'object' && raw.flags ? raw.flags : {},
    counters,
    player: {
      x: num(raw.player?.x, base.player.x),
      z: num(raw.player?.z, base.player.z),
      facing: num(raw.player?.facing, 0),
      inside,
    },
    tutorialStep: Math.max(0, num(raw.tutorialStep, 0)),
    tutorialDone: !!raw.tutorialDone,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): boolean {
  const s = storage();
  if (!s) return false;
  try {
    const payload = { ...state, updatedAt: Date.now(), saveVersion: SAVE_VERSION };
    s.setItem(SAVE_KEY, JSON.stringify(payload));
    const meta: SaveMeta = {
      playerId: state.playerId,
      playerName: getCharacter(state.playerId).name,
      day: state.time.day + 1,
      clock: `${String(Math.floor(state.time.minutes / 60)).padStart(2, '0')}:${String(
        Math.floor(state.time.minutes % 60),
      ).padStart(2, '0')}`,
      money: state.money,
      updatedAt: Date.now(),
    };
    s.setItem(SAVE_META_KEY, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): GameState | null {
  const s = storage();
  if (!s) return null;
  try {
    const text = s.getItem(SAVE_KEY);
    if (!text) return null;
    return validateSave(JSON.parse(text));
  } catch {
    return null;
  }
}

export function loadSaveMeta(): SaveMeta | null {
  const s = storage();
  if (!s) return null;
  try {
    const text = s.getItem(SAVE_META_KEY);
    if (!text) return null;
    const meta = JSON.parse(text) as SaveMeta;
    if (!meta || typeof meta.playerId !== 'string') return null;
    return meta;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  const s = storage();
  if (!s) return false;
  try {
    return !!s.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function deleteSave(): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(SAVE_KEY);
    s.removeItem(SAVE_META_KEY);
  } catch {
    /* ignore */
  }
}

export function exportSave(state: GameState): string {
  return JSON.stringify(state);
}
