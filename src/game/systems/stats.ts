import { STAT_KEYS, type Needs, type StatKey, type Stats } from '@/game/types';
import { clamp } from './rng';

/** Experience needed before growth noticeably slows. */
const XP_SCALE = 420;

/**
 * Stat growth uses diminishing returns against remaining headroom, so a
 * character with 96 strength gains far less from the gym than one with 42.
 */
export function growthFromXp(base: number, xp: number): number {
  const headroom = Math.max(0, 100 - base) * 0.82;
  if (headroom <= 0 || xp <= 0) return 0;
  return headroom * (1 - Math.exp(-xp / XP_SCALE));
}

export function currentStat(base: number, xp: number): number {
  return clamp(Math.round(base + growthFromXp(base, xp)), 1, 100);
}

export function currentStats(base: Stats, xp: Partial<Record<StatKey, number>>): Stats {
  const out = {} as Stats;
  for (const k of STAT_KEYS) out[k] = currentStat(base[k], xp[k] ?? 0);
  return out;
}

export function emptyStatXp(): Record<StatKey, number> {
  const out = {} as Record<StatKey, number>;
  for (const k of STAT_KEYS) out[k] = 0;
  return out;
}

export function addStatXp(
  xp: Record<StatKey, number>,
  gain: Partial<Record<StatKey, number>>,
  multiplier = 1,
): Record<StatKey, number> {
  const out = { ...xp };
  for (const k of STAT_KEYS) {
    const g = gain[k];
    if (g) out[k] = Math.max(0, (out[k] ?? 0) + g * multiplier);
  }
  return out;
}

/**
 * Stats as they actually apply right now: exhaustion and hunger drag physical
 * and mental performance down, a good mood lifts social stats slightly.
 */
export function effectiveStats(stats: Stats, needs: Needs): Stats {
  const energyFactor = 0.65 + 0.35 * (clamp(needs.energy, 0, 100) / 100);
  const hungerFactor = 0.75 + 0.25 * (clamp(needs.hunger, 0, 100) / 100);
  const moodFactor = 0.85 + 0.3 * (clamp(needs.mood, 0, 100) / 100);

  const physical = energyFactor * hungerFactor;
  const mental = 0.5 * energyFactor + 0.5 * hungerFactor;

  return {
    strength: Math.round(stats.strength * physical),
    speed: Math.round(stats.speed * physical),
    stamina: Math.round(stats.stamina * energyFactor),
    intelligence: Math.round(stats.intelligence * mental),
    charisma: Math.round(stats.charisma * moodFactor),
    luck: stats.luck,
    discipline: Math.round(stats.discipline * mental),
    social: Math.round(stats.social * moodFactor),
    workSkill: Math.round(stats.workSkill * mental),
  };
}

/** Weighted 0..1 score used by jobs and minigames. */
export function statScore(stats: Stats, weights: Partial<Record<StatKey, number>>): number {
  let total = 0;
  let sum = 0;
  for (const k of STAT_KEYS) {
    const w = weights[k];
    if (!w) continue;
    total += w;
    sum += w * (stats[k] / 100);
  }
  return total > 0 ? clamp(sum / total, 0, 1) : 0.5;
}

/** Movement speed multiplier from the speed stat and current energy. */
export function movementMultiplier(speed: number, energy: number): number {
  const base = 0.82 + (speed / 100) * 0.36;
  const tired = energy < 25 ? 0.72 + (energy / 25) * 0.28 : 1;
  return base * tired;
}
