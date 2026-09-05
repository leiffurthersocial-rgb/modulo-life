import { describe, expect, it } from 'vitest';
import { adjustNeeds, band, consumeItem, decayNeeds, needsWarning, newNeeds, sleep } from '@/game/systems/needs';

describe('needs', () => {
  it('decays over time', () => {
    const after = decayNeeds(newNeeds(), 4);
    expect(after.energy).toBeLessThan(90);
    expect(after.hunger).toBeLessThan(78);
  });

  it('never goes below zero', () => {
    const after = decayNeeds(newNeeds(), 500);
    expect(after.energy).toBe(0);
    expect(after.hunger).toBe(0);
    expect(after.mood).toBe(0);
  });

  it('punishes mood harder when starving', () => {
    const fed = decayNeeds({ energy: 90, hunger: 90, mood: 60, health: 100 }, 2);
    const starving = decayNeeds({ energy: 90, hunger: 10, mood: 60, health: 100 }, 2);
    expect(starving.mood).toBeLessThan(fed.mood);
  });

  it('restores from food', () => {
    const before = { energy: 40, hunger: 20, mood: 40, health: 100 };
    const after = consumeItem(before, 'katsu_curry');
    expect(after.hunger).toBeGreaterThan(before.hunger);
    expect(after.energy).toBeGreaterThan(before.energy);
  });

  it('ignores unknown items', () => {
    const before = newNeeds();
    expect(consumeItem(before, 'nope')).toEqual(before);
  });

  it('restores energy through sleep', () => {
    const after = sleep({ energy: 10, hunger: 60, mood: 30, health: 60 }, 8);
    expect(after.energy).toBeGreaterThan(90);
    expect(after.hunger).toBeLessThan(60);
    expect(after.health).toBeGreaterThan(60);
  });

  it('bands values for the HUD', () => {
    expect(band(5)).toBe('critical');
    expect(band(20)).toBe('low');
    expect(band(50)).toBe('ok');
    expect(band(90)).toBe('good');
  });

  it('warns about the worst problem first', () => {
    expect(needsWarning({ energy: 5, hunger: 5, mood: 50, health: 100 })).toMatch(/exhausted/i);
    expect(needsWarning({ energy: 80, hunger: 5, mood: 50, health: 100 })).toMatch(/starving/i);
    expect(needsWarning(newNeeds())).toBeNull();
  });

  it('clamps adjustments', () => {
    expect(adjustNeeds(newNeeds(), { energy: 999 }).energy).toBe(100);
    expect(adjustNeeds(newNeeds(), { health: -999 }).health).toBe(5);
  });
});
