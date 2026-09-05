import type { StatKey, Stats } from '@/game/types';
import { clamp, randInt, weightedPick } from './rng';

/* ---------------------------------------------------------------- dice */

export type DiceBet = 'low' | 'high' | 'seven' | 'exact';

export interface DiceOutcome {
  dice: [number, number];
  total: number;
  won: boolean;
  /** Multiplier applied to the stake and returned to the player. */
  payout: number;
  net: number;
  message: string;
}

/** Displayed to the player so the odds are never hidden. */
export const DICE_ODDS: Record<DiceBet, { label: string; chance: string; pays: string }> = {
  low: { label: 'Low (2–6)', chance: '41.7%', pays: '2.2×' },
  high: { label: 'High (8–12)', chance: '41.7%', pays: '2.2×' },
  seven: { label: 'Exactly 7', chance: '16.7%', pays: '5×' },
  exact: { label: 'Call the number', chance: 'varies', pays: 'up to 30×' },
};

export function rollDice(rng: () => number): [number, number] {
  return [randInt(rng, 1, 6), randInt(rng, 1, 6)];
}

const EXACT_PAYOUT: Record<number, number> = {
  2: 30,
  3: 15,
  4: 10,
  5: 8,
  6: 6.5,
  7: 5,
  8: 6.5,
  9: 8,
  10: 10,
  11: 15,
  12: 30,
};

export function resolveDice(bet: DiceBet, stake: number, rng: () => number, exactCall = 7): DiceOutcome {
  const dice = rollDice(rng);
  const total = dice[0] + dice[1];
  let won = false;
  let payout = 0;

  switch (bet) {
    case 'low':
      won = total <= 6;
      payout = won ? 2.2 : 0;
      break;
    case 'high':
      won = total >= 8;
      payout = won ? 2.2 : 0;
      break;
    case 'seven':
      won = total === 7;
      payout = won ? 5 : 0;
      break;
    case 'exact':
      won = total === exactCall;
      payout = won ? (EXACT_PAYOUT[exactCall] ?? 5) : 0;
      break;
  }

  const net = Math.round(stake * payout) - stake;
  return {
    dice,
    total,
    won,
    payout,
    net,
    message: won ? `${dice[0]} + ${dice[1]} = ${total}. Paid ${payout}×.` : `${dice[0]} + ${dice[1]} = ${total}. The house takes it.`,
  };
}

/* ------------------------------------------------------------ high/low */

export interface HighLowState {
  current: number;
  streak: number;
  pot: number;
  over: boolean;
}

export const HIGHLOW_MULTIPLIER = 1.75;

export function newHighLow(stake: number, rng: () => number): HighLowState {
  return { current: randInt(rng, 1, 13), streak: 0, pot: stake, over: false };
}

/** A tie goes to the house - that is where the edge lives. */
export function playHighLow(state: HighLowState, guess: 'higher' | 'lower', rng: () => number): HighLowState & { drawn: number } {
  const drawn = randInt(rng, 1, 13);
  const correct = guess === 'higher' ? drawn > state.current : drawn < state.current;
  if (!correct) {
    return { current: drawn, streak: state.streak, pot: 0, over: true, drawn };
  }
  return {
    current: drawn,
    streak: state.streak + 1,
    pot: Math.round(state.pot * HIGHLOW_MULTIPLIER),
    over: false,
    drawn,
  };
}

/** Chance the guess is correct, shown to the player before they commit. */
export function highLowChance(current: number, guess: 'higher' | 'lower'): number {
  const better = guess === 'higher' ? 13 - current : current - 1;
  return better / 13;
}

/* ---------------------------------------------------------------- cards */

export interface Card {
  rank: number;
  suit: 'blossom' | 'river' | 'lantern' | 'stone';
}

export const SUITS: Card['suit'][] = ['blossom', 'river', 'lantern', 'stone'];
export const SUIT_GLYPH: Record<Card['suit'], string> = {
  blossom: '🌸',
  river: '💧',
  lantern: '🏮',
  stone: '🪨',
};

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });
  return deck;
}

export function cardValue(card: Card): number {
  if (card.rank > 10) return 10;
  if (card.rank === 1) return 11;
  return card.rank;
}

export function handValue(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === 1) aces++;
  }
  // Aces drop from 11 to 1 as needed.
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

export type CardResult = 'win' | 'lose' | 'push' | 'blackjack';

export function resolveCards(player: Card[], dealer: Card[]): CardResult {
  const p = handValue(player);
  const d = handValue(dealer);
  if (p > 21) return 'lose';
  if (p === 21 && player.length === 2 && d !== 21) return 'blackjack';
  if (d > 21) return 'win';
  if (p > d) return 'win';
  if (p < d) return 'lose';
  return 'push';
}

export function cardPayout(result: CardResult): number {
  switch (result) {
    case 'blackjack':
      return 2.5;
    case 'win':
      return 2;
    case 'push':
      return 1;
    default:
      return 0;
  }
}

/** Dealer draws to 17, standing on all 17s. */
export function dealerShouldHit(dealer: Card[]): boolean {
  return handValue(dealer) < 17;
}

/* ------------------------------------------------------------ coin flip */

export function flipCoin(rng: () => number): 'heads' | 'tails' {
  return rng() < 0.5 ? 'heads' : 'tails';
}

export const COIN_PAYOUT = 1.95;

/* ---------------------------------------------------------------- wheel */

export interface WheelSegment {
  label: string;
  multiplier: number;
  color: string;
}

export const WHEEL: WheelSegment[] = [
  { label: '0×', multiplier: 0, color: '#3a3a44' },
  { label: '1.5×', multiplier: 1.5, color: '#4a8f6b' },
  { label: '0×', multiplier: 0, color: '#3a3a44' },
  { label: '2×', multiplier: 2, color: '#3f7fa8' },
  { label: '0.5×', multiplier: 0.5, color: '#8a7a4a' },
  { label: '0×', multiplier: 0, color: '#3a3a44' },
  { label: '1×', multiplier: 1, color: '#6b6b76' },
  { label: '0×', multiplier: 0, color: '#3a3a44' },
  { label: '0.5×', multiplier: 0.5, color: '#8a7a4a' },
  { label: '5×', multiplier: 5, color: '#c9a227' },
  { label: '0×', multiplier: 0, color: '#3a3a44' },
  { label: '0.5×', multiplier: 0.5, color: '#8a7a4a' },
];

export function spinWheel(rng: () => number, luck: number): number {
  // Luck nudges a losing spin one segment along, never past the jackpot.
  let index = Math.floor(rng() * WHEEL.length) % WHEEL.length;
  if (WHEEL[index].multiplier === 0 && rng() < luck / 260) {
    index = (index + 1) % WHEEL.length;
    if (WHEEL[index].multiplier >= 5) index = (index + 1) % WHEEL.length;
  }
  return index;
}

export function wheelExpectedValue(): number {
  return WHEEL.reduce((sum, s) => sum + s.multiplier, 0) / WHEEL.length;
}

/* -------------------------------------------------------------- fishing */

export interface FishEntry {
  itemId: string;
  weight: number;
  /** How hard the reel-in minigame is, 0..1. */
  difficulty: number;
}

export const FISH_TABLES: Record<string, FishEntry[]> = {
  pond: [
    { itemId: 'crucian_carp', weight: 55, difficulty: 0.25 },
    { itemId: 'catfish', weight: 22, difficulty: 0.45 },
    { itemId: 'koi_fish', weight: 8, difficulty: 0.7 },
    { itemId: 'empty_can', weight: 15, difficulty: 0.1 },
  ],
  river: [
    { itemId: 'crucian_carp', weight: 32, difficulty: 0.25 },
    { itemId: 'catfish', weight: 30, difficulty: 0.45 },
    { itemId: 'koi_fish', weight: 22, difficulty: 0.7 },
    { itemId: 'golden_koi', weight: 4, difficulty: 0.92 },
    { itemId: 'old_coin', weight: 3, difficulty: 0.5 },
    { itemId: 'empty_can', weight: 9, difficulty: 0.1 },
  ],
};

export function pickFish(spot: string, luck: number, baited: boolean, rng: () => number): FishEntry {
  const table = FISH_TABLES[spot] ?? FISH_TABLES.pond;
  const luckBoost = 1 + luck / 140 + (baited ? 0.6 : 0);
  const chosen = weightedPick(rng, table, (f) => {
    // Bait and luck shift weight away from junk towards the rare catches.
    if (f.itemId === 'empty_can') return f.weight / luckBoost;
    return f.weight * (f.difficulty > 0.6 ? luckBoost : 1);
  });
  return chosen ?? table[0];
}

/** How long the reeling window stays open, in seconds. */
export function reelWindow(difficulty: number, stats: Stats): number {
  const skill = (stats.speed * 0.5 + stats.discipline * 0.3 + stats.luck * 0.2) / 100;
  return clamp(1.9 - difficulty * 1.1 + skill * 0.9, 0.45, 2.4);
}

/* -------------------------------------------------- score-based rewards */

export interface ScoreReward {
  money: number;
  statXp: Partial<Record<StatKey, number>>;
  won: boolean;
  grade: string;
}

export function gradeFor(score01: number): string {
  if (score01 >= 0.95) return 'S';
  if (score01 >= 0.82) return 'A';
  if (score01 >= 0.65) return 'B';
  if (score01 >= 0.45) return 'C';
  if (score01 >= 0.25) return 'D';
  return 'E';
}

export function arcadeReward(score01: number): ScoreReward {
  const s = clamp(score01, 0, 1);
  return {
    money: Math.round(s * 2200),
    statXp: { speed: Math.round(6 + s * 12), luck: Math.round(2 + s * 5), intelligence: Math.round(2 + s * 6) },
    won: s >= 0.5,
    grade: gradeFor(s),
  };
}

export function runningReward(score01: number): ScoreReward {
  const s = clamp(score01, 0, 1);
  return {
    money: Math.round(s * 1600),
    statXp: { speed: Math.round(8 + s * 16), stamina: Math.round(6 + s * 14) },
    won: s >= 0.5,
    grade: gradeFor(s),
  };
}

export function strengthReward(score01: number): ScoreReward {
  const s = clamp(score01, 0, 1);
  return {
    money: Math.round(s * 1400),
    statXp: { strength: Math.round(9 + s * 17), stamina: Math.round(4 + s * 9), discipline: Math.round(3 + s * 6) },
    won: s >= 0.5,
    grade: gradeFor(s),
  };
}

/**
 * The shift minigames all report a 0..1 score; this converts a raw hit count
 * into that score so the job system stays independent of the UI.
 */
export function shiftScore(correct: number, total: number, mistakes: number): number {
  if (total <= 0) return 0;
  return clamp((correct - mistakes * 0.6) / total, 0, 1);
}
