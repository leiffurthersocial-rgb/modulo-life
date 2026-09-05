import type { JobDefinition } from '@/game/types';

export const JOBS: JobDefinition[] = [
  {
    id: 'konbini_clerk',
    name: 'Konbini Clerk',
    location: 'konbini',
    description:
      'Four hours on the register at Modulo Mart. Ring up customers before they lose patience.',
    basePay: 3400,
    hours: 4,
    energyCost: 22,
    performanceStats: { workSkill: 0.4, charisma: 0.3, speed: 0.3 },
    statXp: { workSkill: 12, charisma: 6, discipline: 5 },
    minigame: 'shift-konbini',
    openHours: [6, 24],
  },
  {
    id: 'cafe_barista',
    name: 'Café Barista',
    location: 'cafe',
    description:
      'Pull shots and read the room at Kotori. Charisma keeps the tips coming.',
    basePay: 3900,
    hours: 4,
    energyCost: 20,
    performanceStats: { charisma: 0.45, workSkill: 0.3, intelligence: 0.25 },
    statXp: { workSkill: 10, charisma: 12, social: 6 },
    requirements: { charisma: 45 },
    minigame: 'shift-cafe',
    openHours: [7, 20],
  },
  {
    id: 'delivery_rider',
    name: 'Delivery Rider',
    location: 'konbini',
    description:
      'Bicycle deliveries across the neighbourhood. Fast legs, faster route planning.',
    basePay: 3100,
    hours: 3,
    energyCost: 26,
    performanceStats: { speed: 0.45, stamina: 0.35, luck: 0.2 },
    statXp: { speed: 14, stamina: 10, workSkill: 6 },
    minigame: 'shift-delivery',
    openHours: [8, 22],
  },
  {
    id: 'construction_hand',
    name: 'Construction Hand',
    location: 'construction',
    description:
      'Hauling and lifting at the Kita Block site. Pays well if your back holds up.',
    basePay: 5200,
    hours: 6,
    energyCost: 42,
    performanceStats: { strength: 0.5, stamina: 0.35, discipline: 0.15 },
    statXp: { strength: 16, stamina: 14, discipline: 8, workSkill: 6 },
    requirements: { strength: 45 },
    minigame: 'shift-construction',
    openHours: [7, 17],
  },
  {
    id: 'office_analyst',
    name: 'Office Analyst',
    location: 'office',
    description:
      'Reconciling numbers at Modulo Works. Dull, air-conditioned, and lucrative.',
    basePay: 6400,
    hours: 6,
    energyCost: 30,
    performanceStats: { intelligence: 0.5, discipline: 0.3, workSkill: 0.2 },
    statXp: { intelligence: 14, workSkill: 16, discipline: 10 },
    requirements: { intelligence: 55 },
    minigame: 'shift-office',
    openHours: [8, 19],
  },
];

export const JOB_MAP: Record<string, JobDefinition> = Object.fromEntries(JOBS.map((j) => [j.id, j]));

export function getJob(id: string): JobDefinition | undefined {
  return JOB_MAP[id];
}

/** Jobs that can be started at a given location id. */
export function jobsAt(locationId: string): JobDefinition[] {
  return JOBS.filter((j) => j.location === locationId);
}
