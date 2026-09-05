/**
 * Central type definitions for Modulo: Life.
 * Pure data types only - no runtime dependencies on three.js or React,
 * so that simulation systems stay unit-testable in a node environment.
 */

/* ------------------------------------------------------------------ stats */

export const STAT_KEYS = [
  'strength',
  'speed',
  'stamina',
  'intelligence',
  'charisma',
  'luck',
  'discipline',
  'social',
  'workSkill',
] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export const STAT_LABELS: Record<StatKey, string> = {
  strength: 'Strength',
  speed: 'Speed',
  stamina: 'Stamina',
  intelligence: 'Intelligence',
  charisma: 'Charisma',
  luck: 'Luck',
  discipline: 'Discipline',
  social: 'Social',
  workSkill: 'Work Skill',
};

/* ------------------------------------------------------------- appearance */

export type HairStyle = 'short' | 'fringe' | 'middlePart' | 'mod' | 'hero';

export interface Appearance {
  /** Multiplier on the base humanoid height (1 = ~1.75m). */
  height: number;
  /** 0 = slim, 1 = very muscular. Drives shoulder/arm/chest geometry. */
  build: number;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  eyes: string;
  shirt: string;
  /** Secondary clothing accent (collar, sleeves, stripe). */
  accent: string;
  pants: string;
  shoes: string;
  glasses: boolean;
  facialHair: 'none' | 'goatee';
}

/* ------------------------------------------------------------ personality */

export interface Personality {
  /** Short descriptive words shown in the UI. */
  traits: string[];
  /** 0..1 - how likely to accept or start a fight. */
  aggression: number;
  /** 0..1 - how often they seek out other characters. */
  sociability: number;
  /** 0..1 - preference for study / reading / quiet activities. */
  intellect: number;
  /** 0..1 - willingness to gamble and take risky options. */
  riskTolerance: number;
  /** 0..1 - likelihood of pranks and teasing dialogue. */
  mischief: number;
  /** 0..1 - how reliably they show up for work. */
  workEthic: number;
  /** 0..1 - how much they train / exercise. */
  athleticism: number;
}

/* --------------------------------------------------------------- schedule */

export type ActivityKind =
  | 'sleep'
  | 'home'
  | 'work'
  | 'shop'
  | 'eat'
  | 'exercise'
  | 'play'
  | 'relax'
  | 'socialize'
  | 'study'
  | 'gamble';

export interface ScheduleBlock {
  /** In-game hour (0-24, may wrap when `to` < `from`). */
  from: number;
  to: number;
  activity: ActivityKind;
  /** Location id the NPC heads towards. */
  location: string;
}

/* ------------------------------------------------------------- characters */

export interface CharacterDefinition {
  id: string;
  name: string;
  /** One line shown on the selection screen. */
  tagline: string;
  bio: string;
  appearance: Appearance;
  personality: Personality;
  baseStats: Stats;
  /** Location id of their home. */
  home: string;
  /** Job id they hold by default. */
  job: string;
  startingMoney: number;
  /** Item ids this character loves / likes / dislikes as gifts. */
  preferences: {
    loved: string[];
    liked: string[];
    disliked: string[];
  };
  schedule: ScheduleBlock[];
  /** Accent colour used in UI chrome for this character. */
  themeColor: string;
}

/* ------------------------------------------------------------------ items */

export type ItemCategory =
  | 'food'
  | 'drink'
  | 'gift'
  | 'clothing'
  | 'furniture'
  | 'collectible'
  | 'consumable'
  | 'misc';

export interface ItemEffects {
  hunger?: number;
  energy?: number;
  mood?: number;
  /** Temporary or permanent stat XP granted on use. */
  statXp?: Partial<Record<StatKey, number>>;
}

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  price: number;
  /** What a shop pays for it. Usually ~45% of price. */
  sellValue: number;
  /** Emoji glyph used as the icon in the 2D UI. */
  icon: string;
  stackable: boolean;
  effects?: ItemEffects;
  /** Base relationship value when given as a gift, before preference scaling. */
  giftValue?: number;
}

export interface InventorySlot {
  itemId: string;
  qty: number;
}

/* ------------------------------------------------------------------- jobs */

export interface JobDefinition {
  id: string;
  name: string;
  location: string;
  description: string;
  /** Base pay per shift in yen. */
  basePay: number;
  /** In-game hours a shift consumes. */
  hours: number;
  energyCost: number;
  /** Stats that determine performance, weighted. */
  performanceStats: Partial<Record<StatKey, number>>;
  /** Stat XP granted per shift. */
  statXp: Partial<Record<StatKey, number>>;
  /** Minimum stat values needed to be hired. */
  requirements?: Partial<Record<StatKey, number>>;
  /** Which minigame (if any) the shift plays out through. */
  minigame?: MinigameId;
  /** Hours the workplace accepts shifts. */
  openHours: [number, number];
}

/* ------------------------------------------------------- relationships */

export type RelationshipTier =
  | 'hostile'
  | 'rival'
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'closeFriend'
  | 'bestFriend';

export interface RelationshipState {
  /** -100..100 */
  score: number;
  /** Separate axis: earned by fair fights and challenges. -100..100 */
  respect: number;
  /** Interactions used today, for diminishing returns. */
  interactionsToday: number;
  /** Day index of the last interaction. */
  lastInteractionDay: number;
  /** Gift preference discovered by the player yet? */
  giftPreferenceKnown: boolean;
  /** Short log of recent events shown in the social menu. */
  history: string[];
}

/* -------------------------------------------------------------- minigames */

export type MinigameId =
  | 'dice'
  | 'highlow'
  | 'cards'
  | 'coinflip'
  | 'wheel'
  | 'arcade'
  | 'fishing'
  | 'running'
  | 'strength'
  | 'shift-konbini'
  | 'shift-cafe'
  | 'shift-delivery'
  | 'shift-office'
  | 'shift-construction';

export interface MinigameResult {
  won: boolean;
  score: number;
  /** Net money change (may be negative). */
  money: number;
  statXp?: Partial<Record<StatKey, number>>;
  itemsGained?: InventorySlot[];
  message: string;
}

/* ------------------------------------------------------------------ needs */

export interface Needs {
  /** 0..100 */
  energy: number;
  hunger: number;
  mood: number;
  health: number;
}

/* ------------------------------------------------------------------- time */

export interface GameTime {
  /** Day index since the game started (0-based). */
  day: number;
  /** Minutes since midnight, 0..1440. */
  minutes: number;
  season: Season;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'petals';

/* ------------------------------------------------------------------- npcs */

export type NpcState =
  | 'idle'
  | 'walking'
  | 'working'
  | 'shopping'
  | 'eating'
  | 'talking'
  | 'exercising'
  | 'playing'
  | 'goingHome'
  | 'sleeping'
  | 'fighting'
  | 'following'
  | 'socializing';

export interface NpcRuntimeState {
  id: string;
  state: NpcState;
  /** World position. Persisted so NPCs resume where they were. */
  x: number;
  z: number;
  facing: number;
  money: number;
  mood: number;
  energy: number;
  /** Location id currently targeted. */
  target: string;
  /** Which interior the NPC is inside, or null when outdoors. */
  inside: string | null;
  inventory: InventorySlot[];
  /** Beaten by the player in a fight this many times. */
  losses: number;
  wins: number;
}

/* ----------------------------------------------------------------- quests */

export type QuestStatus = 'available' | 'active' | 'complete' | 'failed';

export interface QuestObjective {
  kind: 'deliver' | 'talk' | 'earn' | 'win' | 'visit' | 'collect';
  /** Item id / character id / location id / minigame id depending on kind. */
  target: string;
  count: number;
}

export interface QuestDefinition {
  id: string;
  title: string;
  giver: string;
  summary: string;
  /** Conditions to become available. */
  requires?: {
    minRelationship?: number;
    minDay?: number;
    questsDone?: string[];
  };
  objective: QuestObjective;
  rewards: {
    money?: number;
    relationship?: number;
    items?: InventorySlot[];
    statXp?: Partial<Record<StatKey, number>>;
  };
  dialogue: {
    offer: string;
    accepted: string;
    progress: string;
    complete: string;
  };
}

/* -------------------------------------------------------------- locations */

export type LocationKind =
  | 'home'
  | 'konbini'
  | 'supermarket'
  | 'cafe'
  | 'restaurant'
  | 'park'
  | 'office'
  | 'arcade'
  | 'gym'
  | 'shrine'
  | 'basement'
  | 'plaza'
  | 'river';

export interface LocationDefinition {
  id: string;
  name: string;
  kind: LocationKind;
  /** World-space anchor (the point NPCs walk to). */
  x: number;
  z: number;
  /** Door position for buildings with interiors. */
  door?: { x: number; z: number; facing: number };
  interior?: string;
  openHours?: [number, number];
  /** Owner character id for homes. */
  owner?: string;
  /** Shown on the map screen. */
  mapIcon: string;
  description: string;
}

/* -------------------------------------------------------------- interiors */

export interface InteriorPropDef {
  kind: string;
  x: number;
  z: number;
  rot?: number;
  /** Interaction id resolved by the interaction registry. */
  interaction?: string;
  label?: string;
  data?: Record<string, string | number | boolean>;
}

export interface InteriorDefinition {
  id: string;
  name: string;
  /** Half-extents of the room in metres. */
  width: number;
  depth: number;
  height: number;
  floorColor: string;
  wallColor: string;
  accentColor: string;
  /** Warm interior light colour. */
  lightColor: string;
  lightIntensity: number;
  /** Where the player appears when entering. */
  spawn: { x: number; z: number };
  /** Exit trigger. */
  exit: { x: number; z: number };
  props: InteriorPropDef[];
  /** Location id this interior belongs to. */
  location: string;
  music?: string;
}

/* -------------------------------------------------------------- interaction */

export interface InteractionTarget {
  id: string;
  label: string;
  icon: string;
  /** World position for the prompt / proximity test. */
  x: number;
  y: number;
  z: number;
  radius: number;
  kind: 'npc' | 'door' | 'prop' | 'shop' | 'job' | 'minigame' | 'exit' | 'bed' | 'activity';
  /** Payload consumed by the interaction handler. */
  data?: Record<string, string | number | boolean>;
  disabled?: boolean;
  disabledReason?: string;
}
