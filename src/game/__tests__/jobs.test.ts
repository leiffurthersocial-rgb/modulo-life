import { describe, expect, it } from 'vitest';
import { CHARACTER_MAP } from '@/data/characters';
import { JOB_MAP } from '@/data/jobs';
import { meetsRequirements, resolveShift, shiftAvailable } from '@/game/systems/jobs';

describe('jobs', () => {
  it('pays more for a better performance', () => {
    const stats = CHARACTER_MAP.robin.baseStats;
    const bad = resolveShift('konbini_clerk', stats, 0.1, 100)!;
    const good = resolveShift('konbini_clerk', stats, 1, 100)!;
    expect(good.pay).toBeGreaterThan(bad.pay);
  });

  it('rewards the right stats for the right job', () => {
    const office = 'office_analyst';
    const smart = resolveShift(office, CHARACTER_MAP.lenni.baseStats, 0.5, 100)!;
    const strong = resolveShift(office, CHARACTER_MAP.leonidas.baseStats, 0.5, 100)!;
    expect(smart.pay).toBeGreaterThan(strong.pay);

    const site = 'construction_hand';
    const smartSite = resolveShift(site, CHARACTER_MAP.lenni.baseStats, 0.5, 100)!;
    const strongSite = resolveShift(site, CHARACTER_MAP.leonidas.baseStats, 0.5, 100)!;
    expect(strongSite.pay).toBeGreaterThan(smartSite.pay);
  });

  it('penalises working while exhausted', () => {
    const stats = CHARACTER_MAP.jovan.baseStats;
    const rested = resolveShift('office_analyst', stats, 0.7, 100)!;
    const tired = resolveShift('office_analyst', stats, 0.7, 5)!;
    expect(tired.pay).toBeLessThan(rested.pay);
    expect(tired.energyCost).toBeGreaterThan(rested.energyCost);
  });

  it('grants a bonus for an excellent shift only', () => {
    const stats = CHARACTER_MAP.lenni.baseStats;
    expect(resolveShift('office_analyst', stats, 1, 100)!.bonus).toBeGreaterThan(0);
    expect(resolveShift('office_analyst', stats, 0.2, 100)!.bonus).toBe(0);
  });

  it('returns null for an unknown job', () => {
    expect(resolveShift('not_a_job', CHARACTER_MAP.robin.baseStats, 0.5, 100)).toBeNull();
  });

  it('enforces hiring requirements', () => {
    expect(meetsRequirements(JOB_MAP.office_analyst, CHARACTER_MAP.leonidas.baseStats).ok).toBe(false);
    expect(meetsRequirements(JOB_MAP.office_analyst, CHARACTER_MAP.lenni.baseStats).ok).toBe(true);
    expect(meetsRequirements(JOB_MAP.construction_hand, CHARACTER_MAP.lenni.baseStats).missing).toContain('strength');
  });

  it('respects opening hours and a daily shift cap', () => {
    expect(shiftAvailable('office_analyst', 3, 0).ok).toBe(false);
    expect(shiftAvailable('office_analyst', 10, 0).ok).toBe(true);
    expect(shiftAvailable('office_analyst', 10, 2).ok).toBe(false);
  });

  it('gives stat xp proportional to performance', () => {
    const stats = CHARACTER_MAP.robin.baseStats;
    const good = resolveShift('konbini_clerk', stats, 1, 100)!;
    const bad = resolveShift('konbini_clerk', stats, 0, 100)!;
    expect(good.statXp.workSkill!).toBeGreaterThan(bad.statXp.workSkill!);
  });
});
