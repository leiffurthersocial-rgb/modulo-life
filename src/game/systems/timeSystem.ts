import type { GameTime, Season } from '@/game/types';

export const MINUTES_PER_DAY = 1440;
/** Real seconds per in-game hour at normal speed. */
export const SECONDS_PER_GAME_HOUR = 45;

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const DAY_NAMES_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export function newTime(): GameTime {
  return { day: 0, minutes: 7 * 60, season: 'spring' };
}

export function hourOf(t: GameTime): number {
  return t.minutes / 60;
}

export function advanceMinutes(t: GameTime, minutes: number): GameTime {
  let total = t.minutes + minutes;
  let day = t.day;
  while (total >= MINUTES_PER_DAY) {
    total -= MINUTES_PER_DAY;
    day += 1;
  }
  while (total < 0) {
    total += MINUTES_PER_DAY;
    day -= 1;
  }
  return { ...t, minutes: total, day: Math.max(0, day) };
}

/** Skips forward to a given hour, rolling to the next day if it has passed. */
export function advanceToHour(t: GameTime, hour: number): { time: GameTime; hoursPassed: number } {
  const target = hour * 60;
  let delta = target - t.minutes;
  if (delta <= 0) delta += MINUTES_PER_DAY;
  return { time: advanceMinutes(t, delta), hoursPassed: delta / 60 };
}

export function formatClock(t: GameTime): string {
  const h = Math.floor(t.minutes / 60) % 24;
  const m = Math.floor(t.minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function dayName(t: GameTime, long = false): string {
  const names = long ? DAY_NAMES_LONG : DAY_NAMES;
  return names[t.day % 7];
}

export function isWeekend(t: GameTime): boolean {
  return t.day % 7 >= 5;
}

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

export function timeOfDay(t: GameTime): TimeOfDay {
  const h = hourOf(t);
  if (h < 5 || h >= 21) return 'night';
  if (h < 10) return 'morning';
  if (h < 17) return 'day';
  return 'evening';
}

/**
 * 0 at midnight, 1 at midday. Used to drive sun elevation and light colour.
 */
export function dayFactor(t: GameTime): number {
  const h = hourOf(t);
  return Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
}

export function seasonName(s: Season): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Date label like "Spring, Day 4 (Thu)". */
export function dateLabel(t: GameTime): string {
  return `${seasonName(t.season)} · Day ${t.day + 1} · ${dayName(t)}`;
}
