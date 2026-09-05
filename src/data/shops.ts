import type { ItemCategory } from '@/game/types';

export interface ShopDefinition {
  id: string;
  name: string;
  location: string;
  greeting: string;
  /** Item ids in stock. */
  stock: string[];
  /** Multiplier applied to base item price. */
  markup: number;
  /** Multiplier applied to sell value; 0 means the shop does not buy. */
  buyback: number;
  /** Categories the shop will buy back. */
  buys: ItemCategory[];
}

export const SHOPS: ShopDefinition[] = [
  {
    id: 'konbini',
    name: 'Modulo Mart',
    location: 'konbini',
    greeting: 'Irasshaimase! Everything you need at two in the morning.',
    stock: [
      'onigiri',
      'melonpan',
      'curry_bread',
      'sandwich',
      'bento',
      'canned_coffee',
      'green_tea',
      'milk_tea',
      'soda',
      'ramune',
      'energy_drink',
      'sports_drink',
      'arcade_token',
      'fishing_bait',
      'umbrella',
      'sticker_set',
      'keychain',
    ],
    markup: 1.0,
    buyback: 0.8,
    buys: ['food', 'drink', 'consumable', 'misc', 'collectible'],
  },
  {
    id: 'supermarket',
    name: 'Sakura Foods',
    location: 'supermarket',
    greeting: 'Fresh in this morning. Baskets are by the door.',
    stock: [
      'onigiri',
      'apple',
      'bento',
      'katsu_curry',
      'strawberry_daifuku',
      'taiyaki',
      'green_tea',
      'milk_tea',
      'sports_drink',
      'protein_bar',
      'first_aid',
      'flower_bouquet',
      'chocolate_box',
      'incense',
      'plant_pot',
      'rug',
      'floor_lamp',
      'bookshelf',
      'poster',
      'hoodie',
      'cap',
      'scarf',
      'sneakers',
      'jacket',
      'fishing_bait',
      'umbrella',
    ],
    markup: 0.92,
    buyback: 1.0,
    buys: ['food', 'drink', 'consumable', 'misc', 'collectible', 'gift', 'clothing', 'furniture'],
  },
  {
    id: 'cafe',
    name: 'Kotori Café',
    location: 'cafe',
    greeting: 'Table or takeaway? The matcha latte is the one to get.',
    stock: ['matcha_latte', 'milk_tea', 'green_tea', 'sandwich', 'melonpan', 'strawberry_daifuku', 'manga_volume'],
    markup: 1.15,
    buyback: 0,
    buys: [],
  },
  {
    id: 'restaurant',
    name: 'Ramen Ichiya',
    location: 'restaurant',
    greeting: 'Nine seats. Take whichever one is free.',
    stock: ['ramen_ticket', 'katsu_curry', 'green_tea', 'ramune', 'bento'],
    markup: 1.05,
    buyback: 0,
    buys: [],
  },
];

export const SHOP_MAP: Record<string, ShopDefinition> = Object.fromEntries(SHOPS.map((s) => [s.id, s]));

export function getShop(id: string): ShopDefinition | undefined {
  return SHOP_MAP[id];
}
