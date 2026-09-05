import { getItem } from '@/data/items';
import type { InventorySlot } from '@/game/types';

export const MAX_SLOTS = 40;

export function countItem(inv: readonly InventorySlot[], itemId: string): number {
  let n = 0;
  for (const s of inv) if (s.itemId === itemId) n += s.qty;
  return n;
}

export function hasItem(inv: readonly InventorySlot[], itemId: string, qty = 1): boolean {
  return countItem(inv, itemId) >= qty;
}

/** Returns a new inventory with the item added, or null when it does not fit. */
export function addItem(inv: readonly InventorySlot[], itemId: string, qty = 1): InventorySlot[] | null {
  const def = getItem(itemId);
  if (!def || qty <= 0) return inv.slice();
  const out = inv.map((s) => ({ ...s }));
  if (def.stackable) {
    const slot = out.find((s) => s.itemId === itemId);
    if (slot) {
      slot.qty += qty;
      return out;
    }
    if (out.length >= MAX_SLOTS) return null;
    out.push({ itemId, qty });
    return out;
  }
  if (out.length + qty > MAX_SLOTS) return null;
  for (let i = 0; i < qty; i++) out.push({ itemId, qty: 1 });
  return out;
}

/** Returns a new inventory with the item removed, or null when there is not enough. */
export function removeItem(inv: readonly InventorySlot[], itemId: string, qty = 1): InventorySlot[] | null {
  if (countItem(inv, itemId) < qty) return null;
  let remaining = qty;
  const out: InventorySlot[] = [];
  for (const s of inv) {
    if (remaining > 0 && s.itemId === itemId) {
      const take = Math.min(remaining, s.qty);
      remaining -= take;
      if (s.qty - take > 0) out.push({ ...s, qty: s.qty - take });
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

export function inventoryValue(inv: readonly InventorySlot[]): number {
  let total = 0;
  for (const s of inv) {
    const def = getItem(s.itemId);
    if (def) total += def.sellValue * s.qty;
  }
  return total;
}

export function totalItems(inv: readonly InventorySlot[]): number {
  return inv.reduce((n, s) => n + s.qty, 0);
}

/** Merges duplicate stacks and drops unknown / empty entries. */
export function normalizeInventory(inv: readonly InventorySlot[]): InventorySlot[] {
  const stacks = new Map<string, number>();
  const singles: InventorySlot[] = [];
  for (const s of inv) {
    const def = getItem(s.itemId);
    if (!def || s.qty <= 0) continue;
    if (def.stackable) stacks.set(s.itemId, (stacks.get(s.itemId) ?? 0) + s.qty);
    else for (let i = 0; i < s.qty; i++) singles.push({ itemId: s.itemId, qty: 1 });
  }
  return [...Array.from(stacks, ([itemId, qty]) => ({ itemId, qty })), ...singles].slice(0, MAX_SLOTS);
}
