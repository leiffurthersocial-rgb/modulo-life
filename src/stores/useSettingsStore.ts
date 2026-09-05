import { create } from 'zustand';
import {
  QUALITY_PRESETS,
  defaultSettings,
  detectQuality,
  effectiveSettings,
  type AccessibilitySettings,
  type AudioSettings,
  type GameplaySettings,
  type GraphicsSettings,
  type PerformanceSettings,
  type QualityLevel,
  type Settings,
} from '@/game/core/settings';

const KEY = 'modulo-life:settings';

function load(): Settings {
  const base = defaultSettings();
  base.graphics = { ...QUALITY_PRESETS[detectQuality()] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      graphics: { ...base.graphics, ...(parsed.graphics ?? {}) },
      performance: { ...base.performance, ...(parsed.performance ?? {}) },
      audio: { ...base.audio, ...(parsed.audio ?? {}) },
      gameplay: { ...base.gameplay, ...(parsed.gameplay ?? {}) },
      accessibility: { ...base.accessibility, ...(parsed.accessibility ?? {}) },
    };
  } catch {
    return base;
  }
}

function persist(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage may be unavailable in private mode - settings just will not stick */
  }
}

interface SettingsStore extends Settings {
  setQuality: (q: QualityLevel) => void;
  setGraphics: (patch: Partial<GraphicsSettings>) => void;
  setPerformance: (patch: Partial<PerformanceSettings>) => void;
  setAudio: (patch: Partial<AudioSettings>) => void;
  setGameplay: (patch: Partial<GameplaySettings>) => void;
  setAccessibility: (patch: Partial<AccessibilitySettings>) => void;
  reset: () => void;
  /** Settings after battery saver overrides are applied. */
  effective: () => Settings;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...load(),

  setQuality: (q) =>
    set((s) => {
      const next = { ...s, graphics: { ...QUALITY_PRESETS[q] } };
      persist(strip(next));
      return next;
    }),

  setGraphics: (patch) =>
    set((s) => {
      const graphics = { ...s.graphics, ...patch };
      const next = { ...s, graphics };
      persist(strip(next));
      return next;
    }),

  setPerformance: (patch) =>
    set((s) => {
      const next = { ...s, performance: { ...s.performance, ...patch } };
      persist(strip(next));
      return next;
    }),

  setAudio: (patch) =>
    set((s) => {
      const next = { ...s, audio: { ...s.audio, ...patch } };
      persist(strip(next));
      return next;
    }),

  setGameplay: (patch) =>
    set((s) => {
      const next = { ...s, gameplay: { ...s.gameplay, ...patch } };
      persist(strip(next));
      return next;
    }),

  setAccessibility: (patch) =>
    set((s) => {
      const next = { ...s, accessibility: { ...s.accessibility, ...patch } };
      persist(strip(next));
      return next;
    }),

  reset: () =>
    set(() => {
      const fresh = defaultSettings();
      fresh.graphics = { ...QUALITY_PRESETS[detectQuality()] };
      persist(fresh);
      return fresh;
    }),

  effective: () => effectiveSettings(strip(get())),
}));

function strip(s: SettingsStore | Settings): Settings {
  return {
    graphics: s.graphics,
    performance: s.performance,
    audio: s.audio,
    gameplay: s.gameplay,
    accessibility: s.accessibility,
  };
}
