import type { LocationDefinition } from '@/game/types';

/**
 * Hoshizaki neighbourhood layout.
 *
 * Coordinate system: +X east, +Z south, Y up. One unit = one metre.
 * `facing` is a yaw in radians where 0 points along +Z.
 *
 * Road grid:
 *   east-west roads at z = -55, 0 (Main Street), 55
 *   north-south roads at x = -58, 0 (Center Street), 58
 * A roundabout with the clock tower sits at the origin.
 */

export const LOCATIONS: LocationDefinition[] = [
  {
    id: 'plaza',
    name: 'Hoshizaki Crossing',
    kind: 'plaza',
    x: 0,
    z: 0,
    mapIcon: '🕰️',
    description: 'The clock tower roundabout where Main Street meets Center Street.',
  },

  /* ------------------------------------------------------------ commerce */
  {
    id: 'konbini',
    name: 'Modulo Mart',
    kind: 'konbini',
    x: -40,
    z: -16,
    door: { x: -40, z: -9.2, facing: 0 },
    interior: 'int_konbini',
    openHours: [0, 24],
    mapIcon: '🏪',
    description: 'Open every hour of every day. Warm light, cold drinks.',
  },
  {
    id: 'cafe',
    name: 'Kotori Café',
    kind: 'cafe',
    x: -17,
    z: -16.5,
    door: { x: -17, z: -9.7, facing: 0 },
    interior: 'int_cafe',
    openHours: [7, 20],
    mapIcon: '☕',
    description: 'Six tables, one very serious espresso machine.',
  },
  {
    id: 'arcade',
    name: 'Neon Alley',
    kind: 'arcade',
    x: 18,
    z: -17,
    door: { x: 18, z: -9.2, facing: 0 },
    interior: 'int_arcade',
    openHours: [10, 24],
    mapIcon: '🕹️',
    description: 'Cabinets, tokens, and the high score board everybody argues about.',
  },
  {
    id: 'supermarket',
    name: 'Sakura Foods',
    kind: 'supermarket',
    x: 40,
    z: 19,
    door: { x: 40, z: 9.2, facing: Math.PI },
    interior: 'int_supermarket',
    openHours: [8, 22],
    mapIcon: '🛒',
    description: 'Everything the konbini has, plus produce and better prices.',
  },
  {
    id: 'restaurant',
    name: 'Ramen Ichiya',
    kind: 'restaurant',
    x: -40,
    z: 16,
    door: { x: -40, z: 9.2, facing: Math.PI },
    interior: 'int_restaurant',
    openHours: [11, 23],
    mapIcon: '🍜',
    description: 'Nine seats at the counter. The broth takes two days.',
  },
  {
    id: 'gym',
    name: 'Iron Pine Gym',
    kind: 'gym',
    x: 18,
    z: 18,
    door: { x: 18, z: 9.7, facing: Math.PI },
    interior: 'int_gym',
    openHours: [5, 23],
    mapIcon: '🏋️',
    description: 'Chalk, rubber flooring, and a bench with your name on it.',
  },
  {
    id: 'office',
    name: 'Modulo Works',
    kind: 'office',
    x: 21,
    z: -36,
    door: { x: 8.2, z: -36, facing: -Math.PI / 2 },
    interior: 'int_office',
    openHours: [8, 19],
    mapIcon: '🏢',
    description: 'Three floors of desks. Somebody in there is definitely on hold.',
  },
  {
    id: 'construction',
    name: 'Kita Block Site',
    kind: 'office',
    x: -39,
    z: -38,
    openHours: [7, 17],
    mapIcon: '🚧',
    description: 'Scaffolding, a crane, and steady work if you can lift.',
  },

  /* ---------------------------------------------------------- open space */
  {
    id: 'park',
    name: 'Hinode Park',
    kind: 'park',
    x: -16,
    z: 32,
    openHours: [0, 24],
    mapIcon: '🌳',
    description: 'Sakura, a pond full of carp, and a jogging loop.',
  },
  {
    id: 'shrine',
    name: 'Hoshizaki Shrine',
    kind: 'shrine',
    x: 100,
    z: 22,
    openHours: [0, 24],
    mapIcon: '⛩️',
    description: 'Up eleven stone steps. The noise of the street stops at the torii.',
  },
  {
    id: 'river',
    name: 'Kogawa Riverside',
    kind: 'river',
    x: 6,
    z: 92,
    openHours: [0, 24],
    mapIcon: '🌊',
    description: 'Slow green water and the best fishing in the neighbourhood.',
  },

  /* ------------------------------------------------------------- private */
  {
    id: 'basement',
    name: "Erim's Basement",
    kind: 'basement',
    x: 26,
    z: -66,
    door: { x: 26, z: -63, facing: 0 },
    interior: 'int_basement',
    openHours: [0, 24],
    owner: 'erim',
    mapIcon: '🎲',
    description: 'A door under the stairs, a felt table, and a lot of opinions about odds.',
  },

  /* --------------------------------------------------------------- homes */
  home('home_robin', 'Robin', 'robin', -74, -34, 'east'),
  home('home_leif', 'Leif', 'leif', -74, -16, 'east'),
  home('home_jovan', 'Jovan', 'jovan', -74, 22, 'east'),
  home('home_lenni', 'Lenni', 'lenni', -30, -70, 'south'),
  home('home_erim', 'Erim', 'erim', 16, -70, 'south'),
  home('home_till', 'Till', 'till', 34, -70, 'south'),
  home('home_tusya', 'Tusya', 'tusya', -20, 70, 'north'),
  home('home_leonidas', 'Leonidas', 'leonidas', 16, 70, 'north'),
];

type DoorSide = 'north' | 'south' | 'east' | 'west';

function home(
  id: string,
  who: string,
  owner: string,
  x: number,
  z: number,
  side: DoorSide,
): LocationDefinition {
  const offsets: Record<DoorSide, { dx: number; dz: number; facing: number }> = {
    // A door on the south wall faces +Z.
    south: { dx: 0, dz: 8, facing: 0 },
    north: { dx: 0, dz: -8, facing: Math.PI },
    east: { dx: 8, dz: 0, facing: Math.PI / 2 },
    west: { dx: -8, dz: 0, facing: -Math.PI / 2 },
  };
  const o = offsets[side];
  return {
    id,
    name: `${who}'s House`,
    kind: 'home',
    x,
    z,
    door: { x: x + o.dx, z: z + o.dz, facing: o.facing },
    interior: `int_${id}`,
    openHours: [0, 24],
    owner,
    mapIcon: '🏠',
    description: `Where ${who} lives.`,
  };
}

export const LOCATION_MAP: Record<string, LocationDefinition> = Object.fromEntries(
  LOCATIONS.map((l) => [l.id, l]),
);

export function getLocation(id: string): LocationDefinition | undefined {
  return LOCATION_MAP[id];
}

export function requireLocation(id: string): LocationDefinition {
  const l = LOCATION_MAP[id];
  if (!l) throw new Error(`Unknown location: ${id}`);
  return l;
}

/** Is a location accepting visitors at the given in-game hour? */
export function isOpen(id: string, hour: number): boolean {
  const loc = LOCATION_MAP[id];
  if (!loc || !loc.openHours) return true;
  const [from, to] = loc.openHours;
  if (from === 0 && to === 24) return true;
  if (from <= to) return hour >= from && hour < to;
  return hour >= from || hour < to;
}

/** Where an NPC or the player should stand outside a location. */
export function approachPoint(id: string): { x: number; z: number } {
  const loc = LOCATION_MAP[id];
  if (!loc) return { x: 0, z: 0 };
  if (loc.door) {
    // Two metres out: clear of the wall, still inside the door's prompt radius.
    return { x: loc.door.x + Math.sin(loc.door.facing) * 2, z: loc.door.z + Math.cos(loc.door.facing) * 2 };
  }
  return { x: loc.x, z: loc.z };
}
