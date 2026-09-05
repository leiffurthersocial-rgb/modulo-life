import { describe, expect, it } from 'vitest';
import { basketTotal, buyPrice, earn, formatMoney, sellPrice, spend } from '@/game/systems/economy';

describe('economy', () => {
  it('formats yen with separators', () => {
    expect(formatMoney(0)).toBe('¥0');
    expect(formatMoney(1234567)).toBe('¥1,234,567');
    expect(formatMoney(999.6)).toBe('¥1,000');
  });

  it('refuses to spend more than you have', () => {
    expect(spend(500, 800)).toMatchObject({ ok: false, money: 500 });
    expect(spend(500, 500)).toMatchObject({ ok: true, money: 0 });
    expect(spend(500, -1).ok).toBe(false);
  });

  it('earns money', () => {
    expect(earn(100, 250)).toMatchObject({ ok: true, money: 350 });
    expect(earn(100, -5).ok).toBe(false);
  });

  it('applies shop markup and buyback', () => {
    const konbiniPrice = buyPrice('konbini', 'onigiri');
    const marketPrice = buyPrice('supermarket', 'onigiri');
    expect(marketPrice).toBeLessThan(konbiniPrice);
    // The café does not buy anything back.
    expect(sellPrice('cafe', 'onigiri')).toBe(0);
    expect(sellPrice('supermarket', 'koi_fish')).toBeGreaterThan(0);
  });

  it('sells for less than it buys', () => {
    expect(sellPrice('konbini', 'bento')).toBeLessThan(buyPrice('konbini', 'bento'));
  });

  it('totals a basket', () => {
    const total = basketTotal('konbini', { onigiri: 2, soda: 1 });
    expect(total).toBe(buyPrice('konbini', 'onigiri') * 2 + buyPrice('konbini', 'soda'));
  });
});
