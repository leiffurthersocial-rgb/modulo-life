import { CHARACTERS, getCharacter } from '@/data/characters';
import type {
  GameTime,
  InventorySlot,
  Needs,
  NpcRuntimeState,
  QuestStatus,
  RelationshipState,
  StatKey,
  Stats,
  Weather,
} from '@/game/types';
import { emptyStatXp } from './systems/stats';
import { newNeeds } from './systems/needs';
import { newTime } from './systems/timeSystem';
import { newRelationship } from './systems/relationships';
import { approachPoint } from '@/data/locations';

export const SAVE_VERSION = 1;

export interface QuestProgress {
  status: QuestStatus;
  progress: number;
  startedDay: number;
}

export interface MinigameRecord {
  plays: number;
  wins: number;
  best: number;
}

export interface Counters {
  daysPlayed: number;
  earned: number;
  spent: number;
  fights: number;
  fightWins: number;
  fightLosses: number;
  conversations: number;
  shiftsWorked: number;
  fishCaught: number;
  itemsBought: number;
  studySessions: number;
  /** Character ids talked to on the current day. */
  talkedToday: string[];
}

export interface PlayerPose {
  x: number;
  z: number;
  facing: number;
  /** Interior id when indoors, otherwise null. */
  inside: string | null;
}

export interface GameState {
  saveVersion: number;
  createdAt: number;
  updatedAt: number;

  playerId: string;
  time: GameTime;
  weather: Weather;
  /** Deterministic seed for weather and event rolls. */
  seed: number;

  money: number;
  stats: Stats;
  statXp: Record<StatKey, number>;
  needs: Needs;

  inventory: InventorySlot[];
  storage: InventorySlot[];
  homeFurniture: string[];
  wearing: string | null;

  relationships: Record<string, RelationshipState>;
  npcs: Record<string, NpcRuntimeState>;
  quests: Record<string, QuestProgress>;

  jobId: string | null;
  jobsUnlocked: string[];
  shiftsToday: number;
  lastShiftDay: number;

  minigames: Record<string, MinigameRecord>;
  activitiesDiscovered: string[];
  flags: Record<string, number>;
  counters: Counters;

  player: PlayerPose;
  tutorialStep: number;
  tutorialDone: boolean;
}

export function newCounters(): Counters {
  return {
    daysPlayed: 1,
    earned: 0,
    spent: 0,
    fights: 0,
    fightWins: 0,
    fightLosses: 0,
    conversations: 0,
    shiftsWorked: 0,
    fishCaught: 0,
    itemsBought: 0,
    studySessions: 0,
    talkedToday: [],
  };
}

function initialNpcState(id: string): NpcRuntimeState {
  const c = getCharacter(id);
  const spot = approachPoint(c.home);
  return {
    id,
    state: 'sleeping',
    x: spot.x,
    z: spot.z,
    facing: 0,
    money: c.startingMoney,
    mood: 62 + Math.round(c.personality.sociability * 20),
    energy: 88,
    target: c.home,
    inside: null,
    inventory: [],
    losses: 0,
    wins: 0,
  };
}

export function createNewGame(playerId: string, seed = Math.floor(Math.random() * 1e9)): GameState {
  const def = getCharacter(playerId);
  const relationships: Record<string, RelationshipState> = {};
  const npcs: Record<string, NpcRuntimeState> = {};
  for (const c of CHARACTERS) {
    if (c.id === playerId) continue;
    relationships[c.id] = newRelationship();
    npcs[c.id] = initialNpcState(c.id);
  }

  const time: GameTime = newTime();
  const home = approachPoint(def.home);

  return {
    saveVersion: SAVE_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    playerId,
    time,
    weather: 'petals',
    seed,
    money: def.startingMoney,
    stats: { ...def.baseStats },
    statXp: emptyStatXp(),
    needs: newNeeds(),
    inventory: [
      { itemId: 'onigiri', qty: 2 },
      { itemId: 'canned_coffee', qty: 1 },
      { itemId: 'arcade_token', qty: 3 },
    ],
    storage: [],
    homeFurniture: [],
    wearing: null,
    relationships,
    npcs,
    quests: {},
    jobId: def.job,
    jobsUnlocked: [def.job],
    shiftsToday: 0,
    lastShiftDay: -1,
    minigames: {},
    activitiesDiscovered: [],
    flags: {},
    counters: newCounters(),
    player: { x: home.x, z: home.z, facing: 0, inside: `int_${def.home}` },
    tutorialStep: 0,
    tutorialDone: false,
  };
}

export function relationshipOf(state: GameState, id: string): RelationshipState {
  return state.relationships[id] ?? newRelationship();
}
