import { DIALOGUE, type DialogueLine, type DialogueTopic, type TimeOfDay } from '@/data/dialogue';
import type { StatKey, Stats, Weather } from '@/game/types';
import { tierFor } from './relationships';
import { weightedPick } from './rng';

export interface DialogueContext {
  speaker: string;
  topic: DialogueTopic;
  score: number;
  time: TimeOfDay;
  weather: Weather;
  location?: string;
  playerMood: number;
  npcEnergy: number;
  playerStats: Stats;
  flags: Record<string, number>;
  weekend: boolean;
}

function matches(line: DialogueLine, ctx: DialogueContext): boolean {
  const w = line.when;
  if (!w) return true;
  if (w.tier && !w.tier.includes(tierFor(ctx.score))) return false;
  if (w.minScore !== undefined && ctx.score < w.minScore) return false;
  if (w.maxScore !== undefined && ctx.score > w.maxScore) return false;
  if (w.time && !w.time.includes(ctx.time)) return false;
  if (w.weather && !w.weather.includes(ctx.weather)) return false;
  if (w.location && (!ctx.location || !w.location.includes(ctx.location))) return false;
  if (w.mood === 'low' && ctx.playerMood >= 35) return false;
  if (w.mood === 'high' && ctx.playerMood < 70) return false;
  if (w.energy === 'low' && ctx.npcEnergy >= 35) return false;
  if (w.energy === 'high' && ctx.npcEnergy < 70) return false;
  if (w.weekend !== undefined && w.weekend !== ctx.weekend) return false;
  if (w.flag && !ctx.flags[w.flag]) return false;
  if (w.notFlag && ctx.flags[w.notFlag]) return false;
  if (w.minStat) {
    for (const [k, v] of Object.entries(w.minStat)) {
      if (ctx.playerStats[k as StatKey] < (v as number)) return false;
    }
  }
  return true;
}

/**
 * Picks the most situational line available: character-specific lines with
 * satisfied conditions beat character-specific fallbacks, which beat generic.
 */
export function selectDialogue(ctx: DialogueContext, rng: () => number = Math.random): string {
  const own = DIALOGUE.filter((l) => l.speaker === ctx.speaker && l.topic === ctx.topic);
  const conditional = own.filter((l) => l.when && matches(l, ctx));
  const plain = own.filter((l) => !l.when);

  const pool = conditional.length ? conditional : plain.length ? plain : null;
  if (pool) {
    const chosen = weightedPick(rng, pool, (l) => l.weight ?? 1);
    if (chosen) return chosen.text;
  }

  const generic = DIALOGUE.filter((l) => l.speaker === '*' && l.topic === ctx.topic);
  const g = weightedPick(rng, generic, (l) => l.weight ?? 1);
  return g?.text ?? '...';
}

/** All lines a character could ever say, for the debug menu. */
export function linesFor(speaker: string): DialogueLine[] {
  return DIALOGUE.filter((l) => l.speaker === speaker);
}
