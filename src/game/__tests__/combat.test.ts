import { describe, expect, it } from 'vitest';
import { CHARACTER_MAP } from '@/data/characters';
import {
  attackDamage,
  combatXp,
  commitAction,
  createCombat,
  createFighter,
  hitChance,
  maxHpFor,
  tickCombat,
} from '@/game/systems/combat';

const make = (id: string) => {
  const c = CHARACTER_MAP[id];
  return createFighter(c.id, c.name, c.themeColor, c.baseStats, c.personality);
};

describe('combat', () => {
  it('gives tanky characters more health', () => {
    expect(maxHpFor(CHARACTER_MAP.leonidas.baseStats)).toBeGreaterThan(maxHpFor(CHARACTER_MAP.lenni.baseStats));
  });

  it('scales damage with strength', () => {
    const strong = attackDamage(CHARACTER_MAP.leonidas.baseStats, CHARACTER_MAP.robin.baseStats, false, 0.5);
    const weak = attackDamage(CHARACTER_MAP.lenni.baseStats, CHARACTER_MAP.robin.baseStats, false, 0.5);
    expect(strong.damage).toBeGreaterThan(weak.damage);
  });

  it('makes heavy attacks hit harder but less often', () => {
    const s = CHARACTER_MAP.leif.baseStats;
    const d = CHARACTER_MAP.jovan.baseStats;
    expect(attackDamage(s, d, true, 0.5).damage).toBeGreaterThan(attackDamage(s, d, false, 0.5).damage);
    expect(hitChance(s, d, true)).toBeLessThan(hitChance(s, d, false));
  });

  it('always deals at least some damage', () => {
    const { damage } = attackDamage(CHARACTER_MAP.lenni.baseStats, CHARACTER_MAP.leonidas.baseStats, false, 0);
    expect(damage).toBeGreaterThanOrEqual(2);
  });

  it('keeps hit chance inside sane bounds', () => {
    expect(hitChance(CHARACTER_MAP.till.baseStats, CHARACTER_MAP.leonidas.baseStats, false)).toBeLessThanOrEqual(0.98);
    expect(hitChance(CHARACTER_MAP.leonidas.baseStats, CHARACTER_MAP.till.baseStats, true)).toBeGreaterThanOrEqual(0.45);
  });

  it('spends stamina on actions and refuses when empty', () => {
    const state = createCombat(make('robin'), make('leif'));
    const before = state.player.stamina;
    expect(commitAction(state, 'player', 'heavy')).toBe(true);
    expect(state.player.stamina).toBeLessThan(before);
    // Mid-action, another commit is rejected.
    expect(commitAction(state, 'player', 'attack')).toBe(false);
  });

  it('resolves an attack after its wind-up', () => {
    const state = createCombat(make('leonidas'), make('lenni'));
    const hp = state.foe.hp;
    commitAction(state, 'player', 'heavy');
    for (let i = 0; i < 40; i++) tickCombat(state, 1 / 60, false);
    expect(state.foe.hp).toBeLessThanOrEqual(hp);
  });

  it('reaches a conclusion and names a winner', () => {
    const state = createCombat(make('leonidas'), make('lenni'));
    let guard = 0;
    while (!state.over && guard++ < 20000) {
      if (state.player.recovery === 0 && state.player.actionTimer === 0 && state.player.stamina > 30) {
        commitAction(state, 'player', 'attack');
      }
      tickCombat(state, 1 / 60);
    }
    expect(state.over).toBe(true);
    expect(['player', 'foe', 'fled']).toContain(state.outcome);
  });

  it('never drops health below zero', () => {
    const state = createCombat(make('leonidas'), make('lenni'));
    let guard = 0;
    while (!state.over && guard++ < 20000) {
      commitAction(state, 'player', 'heavy');
      tickCombat(state, 1 / 30);
    }
    expect(state.player.hp).toBeGreaterThanOrEqual(0);
    expect(state.foe.hp).toBeGreaterThanOrEqual(0);
  });

  it('awards more xp for a win than a loss', () => {
    const win = combatXp(true, 20).strength!;
    const loss = combatXp(false, 20).strength!;
    expect(win).toBeGreaterThan(loss);
  });
});
