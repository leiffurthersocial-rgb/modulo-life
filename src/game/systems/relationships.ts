import { getCharacter } from '@/data/characters';
import { getItem } from '@/data/items';
import type { RelationshipState, RelationshipTier } from '@/game/types';
import { clamp } from './rng';

export const TIER_THRESHOLDS: Array<{ tier: RelationshipTier; min: number; label: string; color: string }> = [
  { tier: 'hostile', min: -100, label: 'Hostile', color: '#c8434a' },
  { tier: 'rival', min: -55, label: 'Rival', color: '#d97a3c' },
  { tier: 'stranger', min: -15, label: 'Stranger', color: '#8b93a1' },
  { tier: 'acquaintance', min: 15, label: 'Acquaintance', color: '#6fa8c8' },
  { tier: 'friend', min: 40, label: 'Friend', color: '#5cb87f' },
  { tier: 'closeFriend', min: 65, label: 'Close Friend', color: '#4fc3a1' },
  { tier: 'bestFriend', min: 88, label: 'Best Friend', color: '#f0b23c' },
];

export function tierFor(score: number): RelationshipTier {
  let out: RelationshipTier = 'hostile';
  for (const t of TIER_THRESHOLDS) if (score >= t.min) out = t.tier;
  return out;
}

export function tierMeta(score: number) {
  const tier = tierFor(score);
  return TIER_THRESHOLDS.find((t) => t.tier === tier)!;
}

export function newRelationship(): RelationshipState {
  return {
    score: 0,
    respect: 0,
    interactionsToday: 0,
    lastInteractionDay: -1,
    giftPreferenceKnown: false,
    history: [],
  };
}

/**
 * Diminishing returns: the fifth conversation of the day is worth a fraction of
 * the first, so the player cannot grind a relationship in one spot.
 */
export function diminish(interactionsToday: number): number {
  return 1 / (1 + interactionsToday * 0.85);
}

export interface RelationshipDelta {
  score?: number;
  respect?: number;
  note?: string;
  /** Skip the diminishing-returns curve (gifts, fights, quests). */
  ignoreDiminish?: boolean;
  countsAsInteraction?: boolean;
}

export function applyRelationship(
  rel: RelationshipState,
  day: number,
  delta: RelationshipDelta,
): RelationshipState {
  const fresh = rel.lastInteractionDay !== day;
  const interactions = fresh ? 0 : rel.interactionsToday;
  const factor = delta.ignoreDiminish ? 1 : diminish(interactions);
  const raw = delta.score ?? 0;
  // Negative changes always land in full - being rude is not subject to fatigue.
  const applied = raw < 0 ? raw : raw * factor;

  const history = delta.note ? [delta.note, ...rel.history].slice(0, 8) : rel.history;

  return {
    ...rel,
    score: clamp(rel.score + applied, -100, 100),
    respect: clamp(rel.respect + (delta.respect ?? 0), -100, 100),
    interactionsToday: interactions + (delta.countsAsInteraction === false ? 0 : 1),
    lastInteractionDay: day,
    history,
  };
}

export type GiftReaction = 'loved' | 'liked' | 'neutral' | 'disliked';

export function giftReaction(characterId: string, itemId: string): GiftReaction {
  const c = getCharacter(characterId);
  if (c.preferences.loved.includes(itemId)) return 'loved';
  if (c.preferences.liked.includes(itemId)) return 'liked';
  if (c.preferences.disliked.includes(itemId)) return 'disliked';
  return 'neutral';
}

/** Relationship points a gift is worth, scaled by the recipient's taste. */
export function giftScore(characterId: string, itemId: string): number {
  const item = getItem(itemId);
  const base = item?.giftValue ?? 2;
  switch (giftReaction(characterId, itemId)) {
    case 'loved':
      return Math.round(base * 1.6 + 6);
    case 'liked':
      return Math.round(base * 1.1 + 2);
    case 'disliked':
      return -Math.round(base * 0.4 + 5);
    default:
      return Math.max(1, Math.round(base * 0.55));
  }
}

/**
 * How a character reacts to losing a fight against the player. Aggressive,
 * competitive characters gain respect for a good beating; gentler ones just
 * resent it.
 */
export function fightAftermath(
  characterId: string,
  playerWon: boolean,
): { score: number; respect: number; note: string } {
  const c = getCharacter(characterId);
  const competitive = (c.personality.aggression + c.personality.athleticism) / 2;
  if (playerWon) {
    const respect = Math.round(6 + competitive * 14);
    const score = Math.round(competitive * 9 - 7);
    return { score, respect, note: `You beat ${c.name} in a match.` };
  }
  const respect = Math.round(3 + competitive * 6);
  const score = Math.round(competitive * 4 - 1);
  return { score, respect, note: `${c.name} beat you in a match.` };
}

/** Blended figure used for gating dialogue and quests. */
export function standing(rel: RelationshipState): number {
  return clamp(rel.score * 0.8 + rel.respect * 0.2, -100, 100);
}
