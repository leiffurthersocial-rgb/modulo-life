import { describe, expect, it } from 'vitest';
import {
  advanceMinutes,
  advanceToHour,
  dayFactor,
  dayName,
  formatClock,
  hourOf,
  isWeekend,
  newTime,
  timeOfDay,
} from '@/game/systems/timeSystem';

describe('time', () => {
  it('starts at 07:00 on day 1', () => {
    const t = newTime();
    expect(formatClock(t)).toBe('07:00');
    expect(t.day).toBe(0);
  });

  it('rolls over midnight', () => {
    const t = advanceMinutes({ day: 0, minutes: 23 * 60, season: 'spring' }, 90);
    expect(t.day).toBe(1);
    expect(formatClock(t)).toBe('00:30');
  });

  it('advances to a target hour, wrapping when it has passed', () => {
    const { time, hoursPassed } = advanceToHour({ day: 0, minutes: 22 * 60, season: 'spring' }, 6);
    expect(time.day).toBe(1);
    expect(formatClock(time)).toBe('06:00');
    expect(hoursPassed).toBe(8);
  });

  it('never goes negative', () => {
    const t = advanceMinutes(newTime(), -100000);
    expect(t.day).toBeGreaterThanOrEqual(0);
  });

  it('classifies the time of day', () => {
    expect(timeOfDay({ day: 0, minutes: 7 * 60, season: 'spring' })).toBe('morning');
    expect(timeOfDay({ day: 0, minutes: 13 * 60, season: 'spring' })).toBe('day');
    expect(timeOfDay({ day: 0, minutes: 19 * 60, season: 'spring' })).toBe('evening');
    expect(timeOfDay({ day: 0, minutes: 2 * 60, season: 'spring' })).toBe('night');
  });

  it('peaks daylight at midday and is dark at night', () => {
    expect(dayFactor({ day: 0, minutes: 12 * 60, season: 'spring' })).toBeCloseTo(1, 1);
    expect(dayFactor({ day: 0, minutes: 2 * 60, season: 'spring' })).toBe(0);
  });

  it('names days and detects weekends', () => {
    expect(dayName({ day: 0, minutes: 0, season: 'spring' })).toBe('Mon');
    expect(isWeekend({ day: 5, minutes: 0, season: 'spring' })).toBe(true);
    expect(isWeekend({ day: 2, minutes: 0, season: 'spring' })).toBe(false);
  });

  it('reports fractional hours', () => {
    expect(hourOf({ day: 0, minutes: 90, season: 'spring' })).toBe(1.5);
  });
});
