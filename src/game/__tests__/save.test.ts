import { describe, expect, it } from 'vitest';
import { createNewGame, SAVE_VERSION } from '@/game/state';
import { migrate, validateSave } from '@/game/save/save';

describe('save', () => {
  it('round-trips a fresh game', () => {
    const state = createNewGame('till', 42);
    const loaded = validateSave(JSON.parse(JSON.stringify(state)))!;
    expect(loaded).not.toBeNull();
    expect(loaded.playerId).toBe('till');
    expect(loaded.money).toBe(state.money);
    expect(Object.keys(loaded.npcs)).toHaveLength(7);
    expect(loaded.npcs.till).toBeUndefined();
  });

  it('rejects garbage', () => {
    expect(validateSave(null)).toBeNull();
    expect(validateSave('nope')).toBeNull();
    expect(validateSave({})).toBeNull();
    expect(validateSave({ playerId: 'nobody' })).toBeNull();
  });

  it('repairs partial saves instead of throwing', () => {
    const loaded = validateSave({ playerId: 'erim', money: 'lots', time: { day: -3 } })!;
    expect(loaded).not.toBeNull();
    expect(typeof loaded.money).toBe('number');
    expect(loaded.time.day).toBe(0);
    expect(loaded.needs.energy).toBeGreaterThan(0);
  });

  it('clamps out-of-range values', () => {
    const loaded = validateSave({
      playerId: 'robin',
      money: -500,
      needs: { energy: 9999, hunger: -50, mood: 5, health: 0 },
      relationships: { leif: { score: 9999, respect: -9999 } },
      time: { minutes: 99999 },
    })!;
    expect(loaded.money).toBe(0);
    expect(loaded.needs.energy).toBe(100);
    expect(loaded.needs.hunger).toBe(0);
    expect(loaded.relationships.leif.score).toBe(100);
    expect(loaded.relationships.leif.respect).toBe(-100);
    expect(loaded.time.minutes).toBeLessThan(1440);
  });

  it('drops references to interiors that no longer exist', () => {
    const loaded = validateSave({ playerId: 'robin', player: { x: 1, z: 2, inside: 'int_atlantis' } })!;
    expect(loaded.player.inside).toBeNull();
    expect(loaded.player.x).toBe(1);
  });

  it('sanitises inventories', () => {
    const loaded = validateSave({
      playerId: 'robin',
      inventory: [{ itemId: 'ghost', qty: 5 }, { itemId: 'soda', qty: 2 }, { itemId: 'soda', qty: 1 }],
    })!;
    expect(loaded.inventory).toHaveLength(1);
    expect(loaded.inventory[0]).toEqual({ itemId: 'soda', qty: 3 });
  });

  it('migrates versionless saves forward', () => {
    const migrated = migrate({ playerId: 'robin' });
    expect(migrated.saveVersion).toBe(SAVE_VERSION);
    expect(migrated.npcs).toBeDefined();
  });

  it('preserves relationship history', () => {
    const loaded = validateSave({
      playerId: 'robin',
      relationships: { leif: { score: 30, history: ['a', 'b', 3] } },
    })!;
    expect(loaded.relationships.leif.history).toEqual(['a', 'b']);
  });
});
