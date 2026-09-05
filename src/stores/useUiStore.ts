import { create } from 'zustand';
import type { InteractionTarget, MinigameId } from '@/game/types';
import type { RandomEventDefinition } from '@/data/events';

export type Screen = 'boot' | 'menu' | 'select' | 'loading' | 'playing' | 'credits';

export type Panel =
  | null
  | 'pause'
  | 'settings'
  | 'inventory'
  | 'character'
  | 'social'
  | 'map'
  | 'quests'
  | 'activities'
  | 'debug'
  | 'shop'
  | 'dialogue'
  | 'minigame'
  | 'combat'
  | 'result'
  | 'event'
  | 'storage'
  | 'fasttravel'
  | 'confirm'
  | 'notices';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad' | 'money';
  icon?: string;
}

export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'good' | 'bad' | 'info';
  onConfirm: () => void;
}

export interface ResultScreen {
  title: string;
  lines: string[];
  tone: 'good' | 'bad' | 'info';
}

interface UiStore {
  screen: Screen;
  panel: Panel;
  /** Panels stack so closing a shop returns you to the world, not the menu. */
  loadingProgress: number;
  loadingLabel: string;
  prompt: InteractionTarget | null;
  nearby: InteractionTarget[];
  toasts: Toast[];
  dialogueNpc: string | null;
  shopId: string | null;
  minigame: MinigameId | null;
  minigameContext: Record<string, string | number | boolean> | null;
  combatFoe: string | null;
  result: ResultScreen | null;
  confirm: ConfirmRequest | null;
  event: RandomEventDefinition | null;
  eventNpc: string | null;
  tutorialHint: string | null;
  fps: number;
  isTouch: boolean;

  setScreen: (s: Screen) => void;
  openPanel: (p: Panel) => void;
  closePanel: () => void;
  togglePanel: (p: Panel) => void;
  setLoading: (progress: number, label?: string) => void;
  setPrompt: (t: InteractionTarget | null) => void;
  setNearby: (t: InteractionTarget[]) => void;
  toast: (text: string, tone?: Toast['tone'], icon?: string) => void;
  dismissToast: (id: number) => void;
  openDialogue: (npc: string) => void;
  openShop: (shopId: string) => void;
  openMinigame: (id: MinigameId, context?: Record<string, string | number | boolean>) => void;
  openCombat: (foe: string) => void;
  showResult: (r: ResultScreen) => void;
  askConfirm: (r: ConfirmRequest) => void;
  showEvent: (e: RandomEventDefinition, npc: string | null) => void;
  setTutorialHint: (t: string | null) => void;
  setFps: (n: number) => void;
  setTouch: (v: boolean) => void;
}

let toastId = 0;

export const useUiStore = create<UiStore>((set, get) => ({
  screen: 'boot',
  panel: null,
  loadingProgress: 0,
  loadingLabel: 'Loading neighbourhood…',
  prompt: null,
  nearby: [],
  toasts: [],
  dialogueNpc: null,
  shopId: null,
  minigame: null,
  minigameContext: null,
  combatFoe: null,
  result: null,
  confirm: null,
  event: null,
  eventNpc: null,
  tutorialHint: null,
  fps: 0,
  isTouch: typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,

  setScreen: (screen) => set({ screen, panel: null }),
  openPanel: (panel) => set({ panel }),
  closePanel: () =>
    set({
      panel: null,
      dialogueNpc: null,
      shopId: null,
      minigame: null,
      minigameContext: null,
      combatFoe: null,
      result: null,
      confirm: null,
      event: null,
    }),
  togglePanel: (p) => set((s) => ({ panel: s.panel === p ? null : p })),
  setLoading: (loadingProgress, loadingLabel) =>
    set((s) => ({ loadingProgress, loadingLabel: loadingLabel ?? s.loadingLabel })),
  setPrompt: (prompt) => set({ prompt }),
  setNearby: (nearby) => set({ nearby }),

  toast: (text, tone = 'info', icon) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-4), { id, text, tone, icon }] }));
    window.setTimeout(() => get().dismissToast(id), 3600);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  openDialogue: (npc) => set({ panel: 'dialogue', dialogueNpc: npc }),
  openShop: (shopId) => set({ panel: 'shop', shopId }),
  openMinigame: (id, context) => set({ panel: 'minigame', minigame: id, minigameContext: context ?? null }),
  openCombat: (foe) => set({ panel: 'combat', combatFoe: foe }),
  showResult: (result) => set({ panel: 'result', result }),
  askConfirm: (confirm) => set({ panel: 'confirm', confirm }),
  showEvent: (event, eventNpc) => set({ panel: 'event', event, eventNpc }),
  setTutorialHint: (tutorialHint) => set({ tutorialHint }),
  setFps: (fps) => set({ fps }),
  setTouch: (isTouch) => set({ isTouch }),
}));
