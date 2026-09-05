import { describe, expect, it } from 'vitest';
import { CHARACTER_MAP } from '@/data/characters';
import {
  arcadeReward,
  cardPayout,
  dealerShouldHit,
  flipCoin,
  gradeFor,
  handValue,
  highLowChance,
  makeDeck,
  newHighLow,
  pickFish,
  playHighLow,
  reelWindow,
  resolveCards,
  resolveDice,
  shiftScore,
  spinWheel,
  wheelExpectedValue,
  WHEEL,
} from '@/game/systems/minigames';
import { createRng } from '@/game/systems/rng';

describe('dice', () => {
  it('never rolls outside 2-12', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i++) {
      const out = resolveDice('high', 100, rng);
      expect(out.total).toBeGreaterThanOrEqual(2);
      expect(out.total).toBeLessThanOrEqual(12);
    }
  });

  it('pays out only on a win', () => {
    const rng = createRng(11);
    for (let i = 0; i < 200; i++) {
      const out = resolveDice('seven', 100, rng);
      if (out.won) expect(out.net).toBe(400);
      else expect(out.net).toBe(-100);
    }
  });

  it('keeps a house edge over many rounds', () => {
    const rng = createRng(2024);
    let bankroll = 0;
    for (let i = 0; i < 20000; i++) bankroll += resolveDice('high', 100, rng).net;
    expect(bankroll).toBeLessThan(0);
  });

  it('resolves low and high correctly', () => {
    const fixedLow = () => 0; // both dice roll 1
    expect(resolveDice('low', 100, fixedLow).won).toBe(true);
    expect(resolveDice('high', 100, fixedLow).won).toBe(false);
  });
});

describe('high/low', () => {
  it('grows the pot on a correct guess and wipes it on a wrong one', () => {
    const state = { current: 2, streak: 0, pot: 100, over: false };
    const alwaysHigh = () => 0.99;
    const win = playHighLow(state, 'higher', alwaysHigh);
    expect(win.pot).toBeGreaterThan(100);
    expect(win.over).toBe(false);

    const lose = playHighLow({ current: 12, streak: 0, pot: 100, over: false }, 'higher', () => 0);
    expect(lose.pot).toBe(0);
    expect(lose.over).toBe(true);
  });

  it('reports honest odds', () => {
    expect(highLowChance(1, 'higher')).toBeCloseTo(12 / 13);
    expect(highLowChance(13, 'higher')).toBe(0);
    expect(highLowChance(1, 'lower')).toBe(0);
  });

  it('starts with a card in range', () => {
    const s = newHighLow(200, createRng(3));
    expect(s.current).toBeGreaterThanOrEqual(1);
    expect(s.current).toBeLessThanOrEqual(13);
    expect(s.pot).toBe(200);
  });
});

describe('cards', () => {
  it('builds a 52-card deck', () => {
    expect(makeDeck()).toHaveLength(52);
  });

  it('counts aces softly', () => {
    expect(handValue([{ rank: 1, suit: 'river' }, { rank: 13, suit: 'stone' }])).toBe(21);
    expect(handValue([{ rank: 1, suit: 'river' }, { rank: 1, suit: 'stone' }])).toBe(12);
    expect(handValue([{ rank: 10, suit: 'river' }, { rank: 10, suit: 'stone' }, { rank: 1, suit: 'blossom' }])).toBe(21);
  });

  it('resolves hands', () => {
    const twenty = [{ rank: 10, suit: 'river' as const }, { rank: 10, suit: 'stone' as const }];
    const bust = [...twenty, { rank: 5, suit: 'blossom' as const }];
    const blackjack = [{ rank: 1, suit: 'river' as const }, { rank: 12, suit: 'stone' as const }];
    expect(resolveCards(bust, twenty)).toBe('lose');
    expect(resolveCards(blackjack, twenty)).toBe('blackjack');
    expect(resolveCards(twenty, bust)).toBe('win');
    expect(resolveCards(twenty, twenty)).toBe('push');
  });

  it('returns the stake on a push', () => {
    expect(cardPayout('push')).toBe(1);
    expect(cardPayout('lose')).toBe(0);
    expect(cardPayout('blackjack')).toBeGreaterThan(cardPayout('win'));
  });

  it('makes the dealer stand on 17', () => {
    expect(dealerShouldHit([{ rank: 10, suit: 'river' }, { rank: 6, suit: 'stone' }])).toBe(true);
    expect(dealerShouldHit([{ rank: 10, suit: 'river' }, { rank: 7, suit: 'stone' }])).toBe(false);
  });
});

describe('coin and wheel', () => {
  it('flips roughly evenly', () => {
    const rng = createRng(99);
    let heads = 0;
    for (let i = 0; i < 4000; i++) if (flipCoin(rng) === 'heads') heads++;
    expect(heads).toBeGreaterThan(1800);
    expect(heads).toBeLessThan(2200);
  });

  it('keeps the wheel below break-even', () => {
    expect(wheelExpectedValue()).toBeLessThan(1);
  });

  it('always lands on a real segment', () => {
    const rng = createRng(5);
    for (let i = 0; i < 500; i++) {
      const idx = spinWheel(rng, 100);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(WHEEL.length);
    }
  });
});

describe('fishing', () => {
  it('catches something from the right table', () => {
    const rng = createRng(17);
    const ids = new Set<string>();
    for (let i = 0; i < 400; i++) ids.add(pickFish('river', 60, false, rng).itemId);
    expect(ids.size).toBeGreaterThan(2);
    expect(ids.has('golden_koi') || ids.has('koi_fish')).toBe(true);
  });

  it('reduces junk with bait and luck', () => {
    const count = (luck: number, bait: boolean) => {
      const rng = createRng(31);
      let junk = 0;
      for (let i = 0; i < 3000; i++) if (pickFish('pond', luck, bait, rng).itemId === 'empty_can') junk++;
      return junk;
    };
    expect(count(90, true)).toBeLessThan(count(20, false));
  });

  it('gives a wider reel window to faster characters', () => {
    const fast = reelWindow(0.5, CHARACTER_MAP.till.baseStats);
    const slow = reelWindow(0.5, CHARACTER_MAP.leonidas.baseStats);
    expect(fast).toBeGreaterThan(slow);
  });
});

describe('score rewards', () => {
  it('grades scores', () => {
    expect(gradeFor(1)).toBe('S');
    expect(gradeFor(0.7)).toBe('B');
    expect(gradeFor(0)).toBe('E');
  });

  it('pays more for a better run', () => {
    expect(arcadeReward(1).money).toBeGreaterThan(arcadeReward(0.3).money);
    expect(arcadeReward(0.1).won).toBe(false);
    expect(arcadeReward(0.9).won).toBe(true);
  });

  it('penalises mistakes in a shift', () => {
    expect(shiftScore(10, 10, 0)).toBe(1);
    expect(shiftScore(10, 10, 5)).toBeLessThan(1);
    expect(shiftScore(0, 10, 10)).toBe(0);
    expect(shiftScore(5, 0, 0)).toBe(0);
  });
});
