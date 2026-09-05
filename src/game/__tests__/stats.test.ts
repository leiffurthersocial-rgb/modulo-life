import { describe, expect, it } from 'vitest';
import { CHARACTER_MAP } from '@/data/characters';
import { addStatXp, currentStat, effectiveStats, emptyStatXp, movementMultiplier, statScore } from '@/game/systems/stats';

describe('stats', () => {
  it('grows with diminishing returns', () => {
    const first = currentStat(50, 200) - 50;
    const later = currentStat(50, 1200) - currentStat(50, 1000);
    expect(first).toBeGreaterThan(later);
  });

  it('gives less headroom to already-strong stats', () => {
    const weakGain = currentStat(42, 400) - 42;
    const strongGain = currentStat(96, 400) - 96;
    expect(weakGain).toBeGreaterThan(strongGain);
  });

  it('never exceeds 100', () => {
    expect(currentStat(96, 100000)).toBeLessThanOrEqual(100);
  });

  it('accumulates xp', () => {
    const xp = addStatXp(emptyStatXp(), { strength: 10 }, 2);
    expect(xp.strength).toBe(20);
    expect(xp.luck).toBe(0);
  });

  it('drags performance down when exhausted', () => {
    const stats = CHARACTER_MAP.leif.baseStats;
    const rested = effectiveStats(stats, { energy: 100, hunger: 100, mood: 100, health: 100 });
    const wrecked = effectiveStats(stats, { energy: 5, hunger: 5, mood: 5, health: 50 });
    expect(wrecked.strength).toBeLessThan(rested.strength);
    expect(wrecked.intelligence).toBeLessThan(rested.intelligence);
    // Luck is not affected by how you feel.
    expect(wrecked.luck).toBe(rested.luck);
  });

  it('scores weighted stat sets between 0 and 1', () => {
    const s = statScore(CHARACTER_MAP.lenni.baseStats, { intelligence: 1 });
    expect(s).toBeGreaterThan(0.8);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('slows movement when tired', () => {
    expect(movementMultiplier(70, 10)).toBeLessThan(movementMultiplier(70, 100));
  });
});
