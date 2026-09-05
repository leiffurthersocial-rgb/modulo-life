import type { Weather } from '@/game/types';

export interface RandomEventChoice {
  label: string;
  /** Outcome text shown after choosing. */
  outcome: string;
  money?: number;
  relationship?: number;
  mood?: number;
  energy?: number;
  items?: Array<{ itemId: string; qty: number }>;
  /** Stat check: succeed if the player's stat beats the threshold. */
  check?: { stat: import('@/game/types').StatKey; threshold: number; failOutcome: string; failMoney?: number; failMood?: number };
}

export interface RandomEventDefinition {
  id: string;
  title: string;
  /** Text shown when the event fires. `{npc}` is replaced with a character name. */
  text: string;
  /** Restrict to a time band, weather, or location. */
  when?: {
    weather?: Weather[];
    hours?: [number, number];
    location?: string[];
    needsNpc?: boolean;
  };
  weight: number;
  choices: RandomEventChoice[];
}

export const RANDOM_EVENTS: RandomEventDefinition[] = [
  {
    id: 'ev_lost_wallet',
    title: 'Something on the Pavement',
    text: 'A slim wallet is lying against the kerb, half under a drain cover. There is money in it and a train pass with a name you recognise.',
    weight: 10,
    choices: [
      {
        label: 'Hand it in at the konbini',
        outcome: 'The clerk logs it and slips you a finder’s share anyway. It feels good all afternoon.',
        money: 900,
        mood: 12,
      },
      {
        label: 'Keep the cash',
        outcome: 'You pocket it and drop the wallet in a postbox. Nobody sees. You still think about it later.',
        money: 3200,
        mood: -14,
      },
      { label: 'Leave it where it is', outcome: 'You walk on. Someone else’s problem, someone else’s luck.', mood: -2 },
    ],
  },
  {
    id: 'ev_street_challenge',
    title: 'Street Challenge',
    text: '{npc} plants themselves in front of you with a grin. "Race you to the corner. Loser buys."',
    when: { needsNpc: true, hours: [7, 22] },
    weight: 12,
    choices: [
      {
        label: 'Race',
        outcome: 'You take it by half a step. {npc} laughs the whole way through paying up.',
        money: 500,
        relationship: 6,
        energy: -8,
        check: {
          stat: 'speed',
          threshold: 62,
          failOutcome: 'They beat you comfortably and are extremely gracious about it, which is worse.',
          failMoney: -500,
          failMood: -4,
        },
      },
      { label: 'Decline politely', outcome: '"Suit yourself." They jog off anyway.', relationship: -2 },
    ],
  },
  {
    id: 'ev_discount',
    title: 'Unexpected Discount',
    text: 'The konbini has mis-labelled an entire shelf. The bento boxes are half price and there are three left.',
    when: { hours: [18, 23] },
    weight: 8,
    choices: [
      { label: 'Take two', outcome: 'You leave with dinner and tomorrow’s lunch for the price of one.', money: -520, items: [{ itemId: 'bento', qty: 2 }], mood: 8 },
      { label: 'Tell the clerk', outcome: 'They fix the label and thank you with a free coffee.', items: [{ itemId: 'canned_coffee', qty: 1 }], mood: 6 },
    ],
  },
  {
    id: 'ev_rain_shelter',
    title: 'Caught in It',
    text: 'The rain turns heavy without warning. There is an awning across the street and someone already under it, shuffling over to make room.',
    when: { weather: ['rain'] },
    weight: 14,
    choices: [
      { label: 'Wait it out', outcome: 'You stand there for ten minutes talking about nothing. It is a good ten minutes.', mood: 10, relationship: 4 },
      { label: 'Run for it', outcome: 'You arrive soaked and slightly triumphant.', energy: -10, mood: -4 },
      { label: 'Buy an umbrella', outcome: 'The vending machine by the corner sells clear ones. Problem solved.', money: -700, items: [{ itemId: 'umbrella', qty: 1 }] },
    ],
  },
  {
    id: 'ev_argument',
    title: 'A Disagreement',
    text: '{npc} is arguing with somebody about a parked bicycle. It is not going well and they have noticed you.',
    when: { needsNpc: true },
    weight: 8,
    choices: [
      {
        label: 'Step in and defuse it',
        outcome: 'You say something sensible. Everyone climbs down. {npc} owes you one.',
        relationship: 10,
        mood: 6,
        check: {
          stat: 'charisma',
          threshold: 60,
          failOutcome: 'You say something that makes it briefly worse before it resolves itself.',
          failMood: -6,
        },
      },
      { label: 'Stay out of it', outcome: 'You keep walking. It sorts itself out within a minute.' },
    ],
  },
  {
    id: 'ev_arcade_tournament',
    title: 'Tournament Night',
    text: 'Neon Alley has chalked a bracket onto the door. Entry is 500 yen and the pot goes to whoever posts the top score.',
    when: { location: ['arcade'], hours: [17, 23] },
    weight: 10,
    choices: [
      { label: 'Enter (¥500)', outcome: 'You pay in and the cabinet lights up. Go.', money: -500 },
      { label: 'Just watch', outcome: 'You watch Tusya post a number that should not be possible.', mood: 4 },
    ],
  },
  {
    id: 'ev_sakura_festival',
    title: 'Petals on Main Street',
    text: 'Lanterns have gone up along the sakura row and someone is selling taiyaki from a folding table. The whole street smells like sugar.',
    when: { hours: [16, 22] },
    weight: 9,
    choices: [
      { label: 'Buy taiyaki and wander', outcome: 'You eat it too fast and walk the row twice.', money: -200, mood: 16, items: [{ itemId: 'taiyaki', qty: 1 }] },
      { label: 'Sit and watch', outcome: 'You find a wall to sit on. The petals do most of the work.', mood: 10, energy: 5 },
    ],
  },
  {
    id: 'ev_helping_hand',
    title: 'A Hand With This',
    text: 'Someone is trying to get a chest of drawers up a narrow staircase and it is clearly a two-person job.',
    weight: 10,
    choices: [
      {
        label: 'Help lift',
        outcome: 'Up in one go. They press money into your hand and will not take no.',
        money: 1200,
        energy: -14,
        mood: 8,
        check: {
          stat: 'strength',
          threshold: 55,
          failOutcome: 'You manage it, eventually, with a lot of shuffling and one bruised shin.',
          failMood: 2,
        },
      },
      { label: 'Apologise and pass', outcome: 'You keep walking and hear the scraping continue behind you.', mood: -4 },
    ],
  },
  {
    id: 'ev_found_coin',
    title: 'Under the Shrine Steps',
    text: 'Something metal glints between two of the stone steps. It has a square hole in the middle.',
    when: { location: ['shrine'] },
    weight: 6,
    choices: [
      { label: 'Take it', outcome: 'An old coin. Erim is going to lose his mind.', items: [{ itemId: 'old_coin', qty: 1 }], mood: 10 },
      { label: 'Leave it for the shrine', outcome: 'You push it back under the step. It feels like the right call.', mood: 6, money: 0 },
    ],
  },
  {
    id: 'ev_stray_cat',
    title: 'Neighbourhood Cat',
    text: 'A very large tabby has taken the exact centre of the pavement and is not moving.',
    weight: 12,
    choices: [
      { label: 'Pet it', outcome: 'It permits this. Then it leaves. You feel chosen.', mood: 14 },
      { label: 'Feed it', outcome: 'It eats, considers you, and follows you for half a block.', money: -140, mood: 18 },
      { label: 'Step around', outcome: 'You go around. It watches you the entire way.', mood: 2 },
    ],
  },
];
