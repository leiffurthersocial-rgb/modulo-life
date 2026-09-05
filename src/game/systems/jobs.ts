import { getJob } from '@/data/jobs';
import type { JobDefinition, StatKey, Stats } from '@/game/types';
import { clamp } from './rng';
import { statScore } from './stats';

export interface ShiftOutcome {
  pay: number;
  bonus: number;
  performance: number;
  energyCost: number;
  statXp: Partial<Record<StatKey, number>>;
  hours: number;
  summary: string;
}

export function meetsRequirements(job: JobDefinition, stats: Stats): { ok: boolean; missing: StatKey[] } {
  const missing: StatKey[] = [];
  for (const [k, v] of Object.entries(job.requirements ?? {})) {
    if (stats[k as StatKey] < (v as number)) missing.push(k as StatKey);
  }
  return { ok: missing.length === 0, missing };
}

/**
 * Turns a raw minigame score (0..1) and the character's stats into pay.
 * Pure so it can be tested independently of the minigame UI.
 */
export function resolveShift(
  jobId: string,
  stats: Stats,
  minigameScore: number,
  energy: number,
): ShiftOutcome | null {
  const job = getJob(jobId);
  if (!job) return null;

  const aptitude = statScore(stats, job.performanceStats);
  const tired = energy < 30 ? 0.7 + (energy / 30) * 0.3 : 1;
  // The minigame is the bigger lever, but stats always matter.
  const performance = clamp((minigameScore * 0.6 + aptitude * 0.4) * tired, 0, 1.25);

  const pay = Math.round(job.basePay * (0.55 + performance * 0.75));
  const bonus = performance > 0.85 ? Math.round(job.basePay * 0.25) : 0;

  const xpMul = 0.6 + performance * 0.8;
  const statXp: Partial<Record<StatKey, number>> = {};
  for (const [k, v] of Object.entries(job.statXp)) {
    statXp[k as StatKey] = Math.round((v as number) * xpMul);
  }

  let summary: string;
  if (performance > 0.9) summary = 'Outstanding shift. The manager actually said so out loud.';
  else if (performance > 0.7) summary = 'Solid shift. Nothing went wrong and a few things went well.';
  else if (performance > 0.45) summary = 'An ordinary shift. The hours passed.';
  else summary = 'Rough shift. You will not be putting this one on a CV.';

  return {
    pay,
    bonus,
    performance,
    energyCost: Math.round(job.energyCost * (energy < 30 ? 1.15 : 1)),
    statXp,
    hours: job.hours,
    summary,
  };
}

/** Whether a shift can be started at the given hour. */
export function shiftAvailable(jobId: string, hour: number, shiftsToday: number): { ok: boolean; reason?: string } {
  const job = getJob(jobId);
  if (!job) return { ok: false, reason: 'Unknown job' };
  const [from, to] = job.openHours;
  const open = from <= to ? hour >= from && hour < to : hour >= from || hour < to;
  if (!open) return { ok: false, reason: `${job.name} shifts run ${from}:00 – ${to}:00` };
  if (shiftsToday >= 2) return { ok: false, reason: 'You have worked enough for one day' };
  return { ok: true };
}
