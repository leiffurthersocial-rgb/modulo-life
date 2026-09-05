import { describe, expect, it } from 'vitest';
import { addItem, countItem, hasItem, inventoryValue, normalizeInventory, removeItem } from '@/game/systems/inventory';

describe('inventory', () => {
  it('stacks stackable items', () => {
    let inv = addItem([], 'onigiri', 2)!;
    inv = addItem(inv, 'onigiri', 3)!;
    expect(inv).toHaveLength(1);
    expect(countItem(inv, 'onigiri')).toBe(5);
  });

  it('does not stack non-stackable items', () => {
    const inv = addItem([], 'hoodie', 2)!;
    expect(inv).toHaveLength(2);
  });

  it('ignores unknown items', () => {
    const inv = addItem([], 'not_a_real_item', 1)!;
    expect(inv).toHaveLength(0);
  });

  it('removes exactly the requested quantity', () => {
    const inv = addItem([], 'soda', 4)!;
    const after = removeItem(inv, 'soda', 3)!;
    expect(countItem(after, 'soda')).toBe(1);
    expect(removeItem(after, 'soda', 5)).toBeNull();
  });

  it('drops empty stacks', () => {
    const inv = addItem([], 'soda', 1)!;
    expect(removeItem(inv, 'soda', 1)).toEqual([]);
  });

  it('reports whether an item is held', () => {
    const inv = addItem([], 'green_tea', 2)!;
    expect(hasItem(inv, 'green_tea', 2)).toBe(true);
    expect(hasItem(inv, 'green_tea', 3)).toBe(false);
  });

  it('values an inventory at sell price', () => {
    const inv = addItem([], 'koi_fish', 2)!;
    expect(inventoryValue(inv)).toBeGreaterThan(0);
  });

  it('normalizes corrupt data', () => {
    const inv = normalizeInventory([
      { itemId: 'soda', qty: 2 },
      { itemId: 'soda', qty: 3 },
      { itemId: 'ghost_item', qty: 9 },
      { itemId: 'onigiri', qty: -4 },
    ]);
    expect(countItem(inv, 'soda')).toBe(5);
    expect(countItem(inv, 'ghost_item')).toBe(0);
    expect(countItem(inv, 'onigiri')).toBe(0);
  });
});
