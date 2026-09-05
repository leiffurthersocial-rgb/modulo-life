export type QualityLevel = 'low' | 'medium' | 'high';

export interface GraphicsSettings {
  quality: QualityLevel;
  shadows: boolean;
  shadowMapSize: number;
  effects: boolean;
  /** Fog far distance in metres. */
  viewDistance: number;
  /** Device pixel ratio multiplier, 0.5 – 1. */
  resolutionScale: number;
  fpsTarget: 30 | 60 | 120;
}

export interface PerformanceSettings {
  batterySaver: boolean;
  reducedParticles: boolean;
  /** NPC simulation ticks per second. */
  npcSimRate: number;
}

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
}

export interface GameplaySettings {
  cameraSensitivity: number;
  cameraDistance: number;
  invertY: boolean;
  vibration: boolean;
  autosave: boolean;
}

export interface AccessibilitySettings {
  textScale: number;
  uiScale: number;
  reducedMotion: boolean;
  screenShake: boolean;
  subtitles: boolean;
  highContrast: boolean;
}

export interface Settings {
  graphics: GraphicsSettings;
  performance: PerformanceSettings;
  audio: AudioSettings;
  gameplay: GameplaySettings;
  accessibility: AccessibilitySettings;
}

export const QUALITY_PRESETS: Record<QualityLevel, GraphicsSettings> = {
  low: {
    quality: 'low',
    shadows: false,
    shadowMapSize: 512,
    effects: false,
    viewDistance: 130,
    resolutionScale: 0.72,
    fpsTarget: 30,
  },
  medium: {
    quality: 'medium',
    shadows: true,
    shadowMapSize: 1024,
    effects: true,
    viewDistance: 200,
    resolutionScale: 0.9,
    fpsTarget: 60,
  },
  high: {
    quality: 'high',
    shadows: true,
    shadowMapSize: 2048,
    effects: true,
    viewDistance: 320,
    resolutionScale: 1,
    fpsTarget: 60,
  },
};

export function defaultSettings(): Settings {
  return {
    graphics: { ...QUALITY_PRESETS.medium },
    performance: { batterySaver: false, reducedParticles: false, npcSimRate: 10 },
    audio: { master: 0.8, music: 0.5, sfx: 0.8 },
    gameplay: {
      cameraSensitivity: 1,
      cameraDistance: 7.5,
      invertY: false,
      vibration: true,
      autosave: true,
    },
    accessibility: {
      textScale: 1,
      uiScale: 1,
      reducedMotion: false,
      screenShake: true,
      subtitles: true,
      highContrast: false,
    },
  };
}

/**
 * Battery saver is a real workload reduction, not a label: it clamps the
 * renderer resolution, disables shadows and post effects, shortens draw
 * distance and slows NPC simulation.
 */
export function effectiveSettings(s: Settings): Settings {
  if (!s.performance.batterySaver) return s;
  return {
    ...s,
    graphics: {
      ...s.graphics,
      shadows: false,
      shadowMapSize: 512,
      effects: false,
      viewDistance: Math.min(s.graphics.viewDistance, 110),
      resolutionScale: Math.min(s.graphics.resolutionScale, 0.65),
      fpsTarget: 30,
    },
    performance: { ...s.performance, reducedParticles: true, npcSimRate: 4 },
  };
}

/** Picks a starting quality tier from what the device reports. */
export function detectQuality(): QualityLevel {
  if (typeof navigator === 'undefined') return 'medium';
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  if (mem <= 3 || cores <= 3) return 'low';
  if (touch && mem <= 6) return 'medium';
  if (mem >= 8 && cores >= 8) return 'high';
  return 'medium';
}
