import { getItem } from '@/data/items';
import { getShop } from '@/data/shops';
import type { ItemCategory } from '@/game/types';

export function formatMoney(amount: number): string {
  const rounded = Math.round(amount);
  return `¥${rounded.toLocaleString('en-US')}`;
}

export interface TransactionResult {
  ok: boolean;
  money: number;
  reason?: string;
}

export function spend(money: number, amount: number): TransactionResult {
  if (amount < 0) return { ok: false, money, reason: 'Invalid amount' };
  if (money < amount) return { ok: false, money, reason: 'Not enough yen' };
  return { ok: true, money: money - amount };
}

export function earn(money: number, amount: number): TransactionResult {
  if (amount < 0) return { ok: false, money, reason: 'Invalid amount' };
  return { ok: true, money: money + amount };
}

export function buyPrice(shopId: string, itemId: string): number {
  const shop = getShop(shopId);
  const item = getItem(itemId);
  if (!shop || !item) return 0;
  return Math.max(1, Math.round(item.price * shop.markup));
}

export function sellPrice(shopId: string, itemId: string): number {
  const shop = getShop(shopId);
  const item = getItem(itemId);
  if (!shop || !item || shop.buyback <= 0) return 0;
  return Math.max(1, Math.round(item.sellValue * shop.buyback));
}

export function shopBuysCategory(shopId: string, category: ItemCategory): boolean {
  const shop = getShop(shopId);
  return !!shop && shop.buys.includes(category);
}

/** Total cost of a basket, used by the shop UI before committing. */
export function basketTotal(shopId: string, basket: Record<string, number>): number {
  let total = 0;
  for (const [itemId, qty] of Object.entries(basket)) total += buyPrice(shopId, itemId) * qty;
  return total;
}
