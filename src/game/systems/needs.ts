import { getItem } from '@/data/items';
import type { ItemEffects, Needs } from '@/game/types';
import { clamp } from './rng';

export function newNeeds(): Needs {
  return { energy: 90, hunger: 78, mood: 70, health: 100 };
}

/** Per in-game hour decay rates. */
const DECAY = {
  energy: 3.6,
  hunger: 5.2,
  mood: 1.4,
};

export function decayNeeds(needs: Needs, hours: number, activityDrain = 1): Needs {
  const energy = clamp(needs.energy - DECAY.energy * hours * activityDrain, 0, 100);
  const hunger = clamp(needs.hunger - DECAY.hunger * hours, 0, 100);
  // Being hungry or exhausted actively corrodes mood.
  const strain = (hunger < 25 ? 1.5 : 0) + (energy < 20 ? 1.5 : 0);
  const mood = clamp(needs.mood - (DECAY.mood + strain) * hours, 0, 100);
  const health = clamp(
    needs.health + (hunger > 45 && energy > 45 ? 1.2 * hours : -0.8 * hours),
    5,
    100,
  );
  return { energy, hunger, mood, health };
}

export function applyEffects(needs: Needs, effects: ItemEffects | undefined): Needs {
  if (!effects) return needs;
  return {
    energy: clamp(needs.energy + (effects.energy ?? 0), 0, 100),
    hunger: clamp(needs.hunger + (effects.hunger ?? 0), 0, 100),
    mood: clamp(needs.mood + (effects.mood ?? 0), 0, 100),
    health: needs.health,
  };
}

export function consumeItem(needs: Needs, itemId: string): Needs {
  return applyEffects(needs, getItem(itemId)?.effects);
}

export function sleep(needs: Needs, hours: number): Needs {
  return {
    energy: clamp(needs.energy + hours * 11, 0, 100),
    hunger: clamp(needs.hunger - hours * 2.6, 0, 100),
    mood: clamp(needs.mood + hours * 2.4, 0, 100),
    health: clamp(needs.health + hours * 2.2, 0, 100),
  };
}

export function adjustNeeds(needs: Needs, delta: Partial<Needs>): Needs {
  return {
    energy: clamp(needs.energy + (delta.energy ?? 0), 0, 100),
    hunger: clamp(needs.hunger + (delta.hunger ?? 0), 0, 100),
    mood: clamp(needs.mood + (delta.mood ?? 0), 0, 100),
    health: clamp(needs.health + (delta.health ?? 0), 5, 100),
  };
}

export type NeedBand = 'critical' | 'low' | 'ok' | 'good';

export function band(value: number): NeedBand {
  if (value < 15) return 'critical';
  if (value < 35) return 'low';
  if (value < 70) return 'ok';
  return 'good';
}

/** Text warning surfaced in the HUD when something needs attention. */
export function needsWarning(needs: Needs): string | null {
  if (needs.energy < 12) return 'You are exhausted. Find a bed.';
  if (needs.hunger < 12) return 'You are starving. Eat something.';
  if (needs.mood < 12) return 'You are miserable. Do something you enjoy.';
  if (needs.energy < 28) return 'Running low on energy.';
  if (needs.hunger < 28) return 'Getting hungry.';
  return null;
}
