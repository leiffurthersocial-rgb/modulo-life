import { create } from 'zustand';
import { getCharacter } from '@/data/characters';
import { getItem } from '@/data/items';
import { QUEST_MAP } from '@/data/quests';
import { baselineKey, rawCounter } from '@/game/systems/questSystem';
import { createNewGame, type GameState, type PlayerPose } from '@/game/state';
import { addItem, countItem, normalizeInventory, removeItem } from '@/game/systems/inventory';
import { adjustNeeds, consumeItem, decayNeeds, sleep as sleepNeeds } from '@/game/systems/needs';
import { applyRelationship, newRelationship, type RelationshipDelta } from '@/game/systems/relationships';
import { addStatXp, currentStats } from '@/game/systems/stats';
import { advanceMinutes } from '@/game/systems/timeSystem';
import { createRng } from '@/game/systems/rng';
import { rollWeather } from '@/game/world/Atmosphere';
import { deleteSave, loadGame, saveGame } from '@/game/save/save';
import type { InventorySlot, Needs, StatKey, Weather } from '@/game/types';
import { useUiStore } from './useUiStore';

interface GameStore {
  state: GameState | null;
  /** Bumped whenever something the HUD cares about changes. */
  revision: number;

  newGame: (playerId: string) => GameState;
  continueGame: () => boolean;
  save: () => boolean;
  clearSave: () => void;
  quit: () => void;

  patch: (fn: (s: GameState) => void) => void;

  addMoney: (amount: number, reason?: string) => void;
  spendMoney: (amount: number, reason?: string) => boolean;

  give: (itemId: string, qty?: number, quiet?: boolean) => boolean;
  take: (itemId: string, qty?: number) => boolean;
  useItem: (itemId: string) => boolean;

  adjustNeed: (delta: Partial<Needs>) => void;
  grantStatXp: (gain: Partial<Record<StatKey, number>>, multiplier?: number) => void;

  relationship: (id: string, delta: RelationshipDelta) => void;
  discoverGiftPreference: (id: string) => void;

  advanceTime: (minutes: number, drain?: number) => void;
  sleepUntil: (hour: number) => void;
  setWeather: (w: Weather) => void;

  setPose: (pose: Partial<PlayerPose>) => void;

  startQuest: (id: string) => void;
  bumpQuest: (id: string, amount?: number) => void;
  completeQuest: (id: string) => void;

  recordMinigame: (id: string, won: boolean, score: number) => void;
  discoverActivity: (id: string) => void;
  setFlag: (key: string, value?: number) => void;

  storeItem: (itemId: string, qty: number) => void;
  retrieveItem: (itemId: string, qty: number) => void;
}

const notify = (text: string, tone: 'info' | 'good' | 'bad' | 'money' = 'info', icon?: string) =>
  useUiStore.getState().toast(text, tone, icon);

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  revision: 0,

  newGame: (playerId) => {
    const state = createNewGame(playerId);
    set({ state, revision: 0 });
    return state;
  },

  continueGame: () => {
    const loaded = loadGame();
    if (!loaded) return false;
    set({ state: loaded, revision: 0 });
    return true;
  },

  save: () => {
    const s = get().state;
    if (!s) return false;
    const ok = saveGame(s);
    if (ok) notify('Game saved', 'good', '💾');
    else notify('Could not save — storage unavailable', 'bad', '⚠️');
    return ok;
  },

  clearSave: () => {
    deleteSave();
    notify('Save data cleared', 'info', '🗑️');
  },

  quit: () => set({ state: null, revision: 0 }),

  patch: (fn) =>
    set((store) => {
      if (!store.state) return store;
      const next = { ...store.state };
      fn(next);
      return { state: next, revision: store.revision + 1 };
    }),

  addMoney: (amount, reason) => {
    if (amount <= 0) return;
    get().patch((s) => {
      s.money += Math.round(amount);
      s.counters = { ...s.counters, earned: s.counters.earned + Math.round(amount) };
    });
    notify(`${reason ? `${reason}: ` : ''}+¥${Math.round(amount).toLocaleString('en-US')}`, 'money', '💴');
  },

  spendMoney: (amount, reason) => {
    const s = get().state;
    if (!s) return false;
    if (s.money < amount) {
      notify('Not enough yen', 'bad', '💸');
      return false;
    }
    get().patch((st) => {
      st.money -= Math.round(amount);
      st.counters = { ...st.counters, spent: st.counters.spent + Math.round(amount) };
    });
    if (reason) notify(`${reason}: −¥${Math.round(amount).toLocaleString('en-US')}`, 'info', '🧾');
    return true;
  },

  give: (itemId, qty = 1, quiet = false) => {
    const s = get().state;
    if (!s) return false;
    const next = addItem(s.inventory, itemId, qty);
    if (!next) {
      notify('Your bag is full', 'bad', '🎒');
      return false;
    }
    get().patch((st) => {
      st.inventory = next;
    });
    const def = getItem(itemId);
    if (!quiet && def) notify(`${def.name} ×${qty}`, 'good', def.icon);
    return true;
  },

  take: (itemId, qty = 1) => {
    const s = get().state;
    if (!s) return false;
    const next = removeItem(s.inventory, itemId, qty);
    if (!next) return false;
    get().patch((st) => {
      st.inventory = next;
    });
    return true;
  },

  useItem: (itemId) => {
    const s = get().state;
    if (!s) return false;
    const def = getItem(itemId);
    if (!def) return false;
    if (countItem(s.inventory, itemId) < 1) return false;

    // Furniture is placed in the home rather than consumed.
    if (def.category === 'furniture') {
      if (s.homeFurniture.includes(itemId)) {
        notify(`${def.name} is already in your home`, 'info', def.icon);
        return false;
      }
      get().patch((st) => {
        st.inventory = removeItem(st.inventory, itemId, 1) ?? st.inventory;
        st.homeFurniture = [...st.homeFurniture, itemId];
        if (def.effects) st.needs = adjustNeeds(st.needs, { mood: def.effects.mood ?? 0 });
      });
      notify(`${def.name} placed at home`, 'good', def.icon);
      return true;
    }

    if (def.category === 'clothing') {
      get().patch((st) => {
        st.wearing = itemId;
        if (def.effects?.statXp) st.statXp = addStatXp(st.statXp, def.effects.statXp);
        st.needs = adjustNeeds(st.needs, { mood: 4 });
      });
      notify(`Wearing ${def.name}`, 'good', def.icon);
      return true;
    }

    if (!def.effects) {
      notify(`${def.name} is not something you can use`, 'info', def.icon);
      return false;
    }

    get().patch((st) => {
      st.inventory = removeItem(st.inventory, itemId, 1) ?? st.inventory;
      st.needs = consumeItem(st.needs, itemId);
      if (def.effects?.statXp) st.statXp = addStatXp(st.statXp, def.effects.statXp);
      st.stats = currentStats(getCharacter(st.playerId).baseStats, st.statXp);
    });
    notify(`Used ${def.name}`, 'good', def.icon);
    return true;
  },

  adjustNeed: (delta) =>
    get().patch((s) => {
      s.needs = adjustNeeds(s.needs, delta);
    }),

  grantStatXp: (gain, multiplier = 1) => {
    let raised: string[] = [];
    get().patch((s) => {
      const before = s.stats;
      s.statXp = addStatXp(s.statXp, gain, multiplier);
      const after = currentStats(getCharacter(s.playerId).baseStats, s.statXp);
      raised = Object.keys(after).filter((k) => after[k as StatKey] > before[k as StatKey]);
      s.stats = after;
    });
    if (raised.length) {
      notify(`${raised.map(prettyStat).join(', ')} increased`, 'good', '📈');
    }
  },

  relationship: (id, delta) =>
    get().patch((s) => {
      const rel = s.relationships[id] ?? newRelationship();
      s.relationships = { ...s.relationships, [id]: applyRelationship(rel, s.time.day, delta) };
    }),

  discoverGiftPreference: (id) =>
    get().patch((s) => {
      const rel = s.relationships[id] ?? newRelationship();
      if (rel.giftPreferenceKnown) return;
      s.relationships = { ...s.relationships, [id]: { ...rel, giftPreferenceKnown: true } };
    }),

  advanceTime: (minutes, drain = 1) => {
    const before = get().state;
    if (!before) return;
    const beforeDay = before.time.day;
    get().patch((s) => {
      s.time = advanceMinutes(s.time, minutes);
      s.needs = decayNeeds(s.needs, minutes / 60, drain);
      if (s.time.day !== beforeDay) rollOverDay(s, beforeDay);
    });
    const after = get().state!;
    if (after.time.day !== beforeDay) {
      notify(`Day ${after.time.day + 1} — the neighbourhood wakes up`, 'info', '🌅');
    }
  },

  sleepUntil: (hour) => {
    const s = get().state;
    if (!s) return;
    const target = hour * 60;
    let delta = target - s.time.minutes;
    if (delta <= 0) delta += 1440;
    const hours = delta / 60;
    const beforeDay = s.time.day;
    get().patch((st) => {
      st.time = advanceMinutes(st.time, delta);
      st.needs = sleepNeeds(st.needs, hours);
      if (st.time.day !== beforeDay) rollOverDay(st, beforeDay);
    });
    notify(`Slept for ${hours.toFixed(0)} hours`, 'good', '🛏️');
  },

  setWeather: (w) =>
    get().patch((s) => {
      s.weather = w;
    }),

  setPose: (pose) =>
    set((store) => {
      if (!store.state) return store;
      // Pose changes every frame, so they deliberately do not bump the revision.
      store.state.player = { ...store.state.player, ...pose };
      return store;
    }),

  startQuest: (id) => {
    const q = QUEST_MAP[id];
    if (!q) return;
    get().patch((s) => {
      s.quests = { ...s.quests, [id]: { status: 'active', progress: 0, startedDay: s.time.day } };
      s.flags = { ...s.flags, [baselineKey(id)]: rawCounter(s, q) };
    });
    notify(`New task: ${q.title}`, 'good', '📋');
  },

  bumpQuest: (id, amount = 1) =>
    get().patch((s) => {
      const cur = s.quests[id];
      if (!cur || cur.status !== 'active') return;
      s.quests = { ...s.quests, [id]: { ...cur, progress: cur.progress + amount } };
    }),

  completeQuest: (id) => {
    const q = QUEST_MAP[id];
    if (!q) return;
    get().patch((s) => {
      const cur = s.quests[id];
      if (!cur) return;
      s.quests = { ...s.quests, [id]: { ...cur, status: 'complete' } };
    });
    notify(`Task complete: ${q.title}`, 'good', '✅');
  },

  recordMinigame: (id, won, score) =>
    get().patch((s) => {
      const cur = s.minigames[id] ?? { plays: 0, wins: 0, best: 0 };
      s.minigames = {
        ...s.minigames,
        [id]: { plays: cur.plays + 1, wins: cur.wins + (won ? 1 : 0), best: Math.max(cur.best, score) },
      };
    }),

  discoverActivity: (id) => {
    const s = get().state;
    if (!s || s.activitiesDiscovered.includes(id)) return;
    get().patch((st) => {
      st.activitiesDiscovered = [...st.activitiesDiscovered, id];
    });
    notify(`New activity discovered: ${id.replace(/[-_]/g, ' ')}`, 'good', '⭐');
  },

  setFlag: (key, value = 1) =>
    get().patch((s) => {
      s.flags = { ...s.flags, [key]: value };
    }),

  storeItem: (itemId, qty) => {
    const s = get().state;
    if (!s) return;
    const inv = removeItem(s.inventory, itemId, qty);
    if (!inv) return;
    const st = addItem(s.storage, itemId, qty);
    if (!st) {
      notify('Storage is full', 'bad', '📦');
      return;
    }
    get().patch((g) => {
      g.inventory = inv;
      g.storage = st;
    });
  },

  retrieveItem: (itemId, qty) => {
    const s = get().state;
    if (!s) return;
    const st = removeItem(s.storage, itemId, qty);
    if (!st) return;
    const inv = addItem(s.inventory, itemId, qty);
    if (!inv) {
      notify('Your bag is full', 'bad', '🎒');
      return;
    }
    get().patch((g) => {
      g.inventory = inv;
      g.storage = st;
    });
  },
}));

/** Everything that resets when the clock passes midnight. */
function rollOverDay(s: GameState, previousDay: number): void {
  const days = s.time.day - previousDay;
  s.counters = { ...s.counters, daysPlayed: s.counters.daysPlayed + days, talkedToday: [] };
  s.shiftsToday = 0;

  const rng = createRng(s.seed + s.time.day * 7919);
  s.weather = rollWeather(rng, s.time.season);
  s.seed = Math.floor(rng() * 1e9);

  const relationships = { ...s.relationships };
  for (const [id, rel] of Object.entries(relationships)) {
    relationships[id] = { ...rel, interactionsToday: 0 };
  }
  s.relationships = relationships;

  // Any quest whose window was "today" expires.
  const quests = { ...s.quests };
  for (const [id, q] of Object.entries(quests)) {
    const def = QUEST_MAP[id];
    if (!def || q.status !== 'active') continue;
    if (def.objective.kind === 'talk' && s.time.day > q.startedDay) {
      quests[id] = { ...q, progress: 0, startedDay: s.time.day };
    }
  }
  s.quests = quests;
  s.inventory = normalizeInventory(s.inventory);
}

function prettyStat(k: string): string {
  return k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

/** Convenience selector used all over the UI. */
export function useGame(): GameState | null {
  return useGameStore((s) => s.state);
}

export function inventorySlots(state: GameState | null): InventorySlot[] {
  return state?.inventory ?? [];
}
