import { QUESTS, QUEST_MAP } from '@/data/quests';
import type { QuestDefinition } from '@/game/types';
import type { GameState, QuestProgress } from '@/game/state';
import { standing } from './relationships';
import { countItem } from './inventory';

export function questProgress(state: GameState, id: string): QuestProgress {
  return state.quests[id] ?? { status: 'available', progress: 0, startedDay: -1 };
}

export function isComplete(state: GameState, id: string): boolean {
  return questProgress(state, id).status === 'complete';
}

export function questUnlocked(state: GameState, q: QuestDefinition): boolean {
  const r = q.requires;
  if (!r) return true;
  if (r.minDay !== undefined && state.time.day < r.minDay) return false;
  if (r.questsDone && !r.questsDone.every((qq) => isComplete(state, qq))) return false;
  if (r.minRelationship !== undefined) {
    const rel = state.relationships[q.giver];
    if (!rel || standing(rel) < r.minRelationship) return false;
  }
  return true;
}

/** Quests a character can currently offer, in priority order. */
export function offerableQuests(state: GameState, giver: string): QuestDefinition[] {
  return QUESTS.filter(
    (q) => q.giver === giver && questProgress(state, q.id).status === 'available' && questUnlocked(state, q),
  );
}

export function activeQuests(state: GameState): QuestDefinition[] {
  return QUESTS.filter((q) => questProgress(state, q.id).status === 'active');
}

/**
 * Recomputes progress for a quest from live game state. Deliver and collect
 * quests read the inventory directly, the rest use counters incremented by
 * gameplay events.
 */
export function computeProgress(state: GameState, q: QuestDefinition): number {
  const p = questProgress(state, q.id);
  switch (q.objective.kind) {
    case 'deliver':
    case 'collect':
      return countItem(state.inventory, q.objective.target);
    default:
      return p.progress;
  }
}

export function canTurnIn(state: GameState, q: QuestDefinition): boolean {
  return questProgress(state, q.id).status === 'active' && computeProgress(state, q) >= q.objective.count;
}

export function objectiveText(q: QuestDefinition, progress: number): string {
  const o = q.objective;
  const n = `${Math.min(progress, o.count)}/${o.count}`;
  switch (o.kind) {
    case 'deliver':
      return `Bring ${o.count}× ${itemName(o.target)} — ${n}`;
    case 'collect':
      return `Catch ${o.count}× ${itemName(o.target)} — ${n}`;
    case 'talk':
      return `Talk to ${o.count} different people today — ${n}`;
    case 'earn':
      return `Earn ¥${o.count.toLocaleString('en-US')} — ¥${Math.min(progress, o.count).toLocaleString('en-US')}`;
    case 'win':
      return `Win ${o.count}× at ${prettyTarget(o.target)} — ${n}`;
    case 'visit':
      return `${visitVerb(o.target)} ${o.count}× — ${n}`;
    default:
      return `${o.kind} ${n}`;
  }
}

function itemName(id: string): string {
  return id
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function prettyTarget(id: string): string {
  if (id.startsWith('fight_')) return `beating ${itemName(id.slice(6))}`;
  return itemName(id);
}

function visitVerb(id: string): string {
  if (id === 'study') return 'Study at your desk';
  return `Visit ${itemName(id)}`;
}

export function questById(id: string): QuestDefinition | undefined {
  return QUEST_MAP[id];
}
