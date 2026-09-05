import type { ItemDefinition } from '@/game/types';

const sell = (price: number) => Math.max(1, Math.round(price * 0.45));

function item(
  id: string,
  name: string,
  category: ItemDefinition['category'],
  price: number,
  icon: string,
  description: string,
  extra: Partial<ItemDefinition> = {},
): ItemDefinition {
  return {
    id,
    name,
    category,
    description,
    price,
    sellValue: sell(price),
    icon,
    stackable: category !== 'furniture' && category !== 'clothing',
    ...extra,
  };
}

export const ITEMS: ItemDefinition[] = [
  /* ---------------------------------------------------------------- food */
  item('onigiri', 'Onigiri', 'food', 140, '🍙', 'Salted rice, seaweed, a reliable centre.', {
    effects: { hunger: 22, energy: 4 },
    giftValue: 4,
  }),
  item('bento', 'Bento Box', 'food', 520, '🍱', 'Six compartments of good decisions.', {
    effects: { hunger: 48, energy: 10, mood: 4 },
    giftValue: 8,
  }),
  item('melonpan', 'Melon Bread', 'food', 180, '🍞', 'Crisp sugar shell, cloud underneath.', {
    effects: { hunger: 20, mood: 8 },
    giftValue: 6,
  }),
  item('taiyaki', 'Taiyaki', 'food', 200, '🐟', 'Fish-shaped, filled with red bean paste.', {
    effects: { hunger: 18, mood: 10 },
    giftValue: 7,
  }),
  item('curry_bread', 'Curry Bread', 'food', 210, '🥐', 'Fried, dangerous, worth it.', {
    effects: { hunger: 26, mood: 5 },
    giftValue: 5,
  }),
  item('sandwich', 'Egg Sandwich', 'food', 260, '🥪', 'Crustless. Suspiciously perfect.', {
    effects: { hunger: 28, energy: 5 },
    giftValue: 5,
  }),
  item('katsu_curry', 'Katsu Curry', 'food', 880, '🍛', 'The whole afternoon, solved.', {
    effects: { hunger: 70, energy: 14, mood: 10 },
    giftValue: 12,
  }),
  item('ramen_ticket', 'Ramen Ticket', 'food', 900, '🎫', 'Redeemable at Ichiya for one steaming bowl.', {
    effects: { hunger: 66, energy: 12, mood: 12 },
    giftValue: 12,
  }),
  item('strawberry_daifuku', 'Strawberry Daifuku', 'food', 320, '🍡', 'Mochi, bean paste, one whole strawberry.', {
    effects: { hunger: 16, mood: 14 },
    giftValue: 10,
  }),
  item('apple', 'Apple', 'food', 120, '🍎', 'Crunchy and unbothered.', {
    effects: { hunger: 12, energy: 3, mood: 2 },
    giftValue: 3,
  }),
  item('protein_bar', 'Protein Bar', 'consumable', 340, '🍫', 'Tastes like ambition. Chalky ambition.', {
    effects: { hunger: 18, energy: 16, statXp: { strength: 3 } },
    giftValue: 6,
  }),

  /* --------------------------------------------------------------- drink */
  item('green_tea', 'Green Tea', 'drink', 150, '🍵', 'Bitter, warm, quietly restorative.', {
    effects: { energy: 10, mood: 5 },
    giftValue: 5,
  }),
  item('canned_coffee', 'Canned Coffee', 'drink', 130, '🥫', 'Hot from the machine, cold in ten minutes.', {
    effects: { energy: 16, mood: 3 },
    giftValue: 4,
  }),
  item('milk_tea', 'Milk Tea', 'drink', 170, '🧋', 'Sweet enough to count as a snack.', {
    effects: { energy: 12, hunger: 6, mood: 6 },
    giftValue: 5,
  }),
  item('soda', 'Melon Soda', 'drink', 160, '🥤', 'Radioactively green. Delightful.', {
    effects: { energy: 8, mood: 8 },
    giftValue: 4,
  }),
  item('ramune', 'Ramune', 'drink', 190, '🫧', 'The marble is the whole point.', {
    effects: { energy: 9, mood: 11 },
    giftValue: 6,
  }),
  item('energy_drink', 'Energy Drink', 'consumable', 380, '⚡', 'Restores a lot of energy. Costs you later.', {
    effects: { energy: 42, mood: -4 },
    giftValue: 5,
  }),
  item('sports_drink', 'Sports Drink', 'drink', 220, '🧴', 'Electrolytes and optimism.', {
    effects: { energy: 22, mood: 3, statXp: { stamina: 2 } },
    giftValue: 6,
  }),
  item('matcha_latte', 'Matcha Latte', 'drink', 480, '🍶', 'Kotori Café pours a good one.', {
    effects: { energy: 18, mood: 12 },
    giftValue: 8,
  }),

  /* ---------------------------------------------------------------- gift */
  item('flower_bouquet', 'Flower Bouquet', 'gift', 900, '💐', 'Cut this morning at the corner stand.', {
    giftValue: 16,
    effects: { mood: 6 },
  }),
  item('plush_cat', 'Plush Cat', 'gift', 1400, '🐈', 'Arcade crane prize. Slightly lopsided.', { giftValue: 18 }),
  item('keychain', 'Brass Keychain', 'gift', 420, '🔑', 'Little bell, big personality.', { giftValue: 9 }),
  item('incense', 'Incense Bundle', 'gift', 560, '🕯️', 'Cedar and something green.', { giftValue: 11, effects: { mood: 8 } }),
  item('manga_volume', 'Manga Volume', 'gift', 620, '📕', 'Volume 4. Everyone starts at volume 4.', { giftValue: 12 }),
  item('puzzle_cube', 'Puzzle Cube', 'gift', 700, '🧩', 'Twelve moves from solved, always.', {
    giftValue: 13,
    effects: { statXp: { intelligence: 4 }, mood: 5 },
  }),
  item('wristband', 'Training Wristband', 'gift', 480, '🎽', 'Absorbs effort.', { giftValue: 10 }),
  item('sticker_set', 'Sticker Set', 'gift', 300, '✨', 'Holographic. Non-negotiably cool.', { giftValue: 8 }),
  item('chocolate_box', 'Chocolate Box', 'gift', 1100, '🍫', 'Twelve pieces, one map on the lid.', {
    giftValue: 17,
    effects: { mood: 10, hunger: 10 },
  }),
  item('sakura_charm', 'Sakura Charm', 'gift', 1500, '🌸', 'Blessed at the shrine. Feels lucky.', {
    giftValue: 20,
    effects: { statXp: { luck: 5 } },
  }),

  /* ------------------------------------------------------------ clothing */
  item('hoodie', 'Grey Hoodie', 'clothing', 3200, '🧥', 'Neighbourhood uniform.', { giftValue: 12, effects: { mood: 6 } }),
  item('cap', 'Canvas Cap', 'clothing', 1800, '🧢', 'Faded in exactly the right way.', { giftValue: 10 }),
  item('scarf', 'Knit Scarf', 'clothing', 2400, '🧣', 'Someone made this by hand.', { giftValue: 13 }),
  item('sneakers', 'Running Sneakers', 'clothing', 5400, '👟', 'Light. Fast. Loud on wet pavement.', {
    giftValue: 15,
    effects: { statXp: { speed: 6 } },
  }),
  item('jacket', 'Spring Jacket', 'clothing', 6800, '🥼', 'Cuts the wind off the river.', { giftValue: 16 }),

  /* ----------------------------------------------------------- furniture */
  item('floor_lamp', 'Floor Lamp', 'furniture', 3400, '🛋️', 'Warm bulb. Makes the room forgive you.', {
    effects: { mood: 6 },
  }),
  item('bookshelf', 'Bookshelf', 'furniture', 5200, '📚', 'Study at home for a bigger bonus.', {
    effects: { statXp: { intelligence: 3 } },
  }),
  item('rug', 'Woven Rug', 'furniture', 2800, '🟫', 'Hides the floor. Improves the day.', { effects: { mood: 5 } }),
  item('poster', 'Band Poster', 'furniture', 900, '🖼️', 'Taped up slightly crooked forever.', { effects: { mood: 4 } }),
  item('plant_pot', 'Potted Monstera', 'furniture', 2100, '🪴', 'Needs less than you think.', { effects: { mood: 6 } }),
  item('arcade_cabinet', 'Home Arcade Cabinet', 'furniture', 24000, '🕹️', 'Play the reflex game at home.', {
    effects: { mood: 14 },
  }),

  /* --------------------------------------------------------- collectible */
  item('crucian_carp', 'Crucian Carp', 'collectible', 260, '🐠', 'Common in the park pond.', { giftValue: 4 }),
  item('catfish', 'Catfish', 'collectible', 780, '🐡', 'Whiskered, grumpy, heavy.', { giftValue: 8 }),
  item('koi_fish', 'Koi', 'collectible', 1900, '🎏', 'Orange and white, absurdly calm.', { giftValue: 14 }),
  item('golden_koi', 'Golden Koi', 'collectible', 7500, '🥇', 'The river only offers one now and then.', { giftValue: 25 }),
  item('old_coin', 'Old Coin', 'collectible', 2600, '🪙', 'Square hole in the middle. Nobody knows how old.', {
    giftValue: 18,
  }),
  item('shrine_omamori', 'Omamori', 'collectible', 1200, '🎴', 'A small cloth promise.', {
    giftValue: 15,
    effects: { statXp: { luck: 3 }, mood: 6 },
  }),

  /* ---------------------------------------------------------- consumable */
  item('arcade_token', 'Arcade Token', 'consumable', 100, '🎰', 'One play at Neon Alley.', { giftValue: 2 }),
  item('fishing_bait', 'Fishing Bait', 'consumable', 90, '🪱', 'Improves your odds at the water.', { giftValue: 1 }),
  item('first_aid', 'First Aid Kit', 'consumable', 900, '🩹', 'Patches you up after a rough match.', {
    effects: { mood: 4 },
    giftValue: 6,
  }),

  /* --------------------------------------------------------------- misc */
  item('umbrella', 'Clear Umbrella', 'misc', 700, '☂️', 'Keeps your mood dry in the rain.', { giftValue: 6 }),
  item('scrap_metal', 'Scrap Metal', 'misc', 60, '🔩', 'Found on the construction site.', { giftValue: 0 }),
  item('empty_can', 'Empty Can', 'misc', 20, '🥫', 'Recycle it. Or gift it, if you are like that.', { giftValue: 0 }),
  item('bike_key', 'Bicycle Key', 'misc', 400, '🚲', 'Unlocks the bike rack near the plaza.', { giftValue: 2 }),
];

export const ITEM_MAP: Record<string, ItemDefinition> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): ItemDefinition | undefined {
  return ITEM_MAP[id];
}

export function requireItem(id: string): ItemDefinition {
  const it = ITEM_MAP[id];
  if (!it) throw new Error(`Unknown item: ${id}`);
  return it;
}
