import type { QuestDefinition } from '@/game/types';

export const QUESTS: QuestDefinition[] = [
  {
    id: 'q_robin_drink',
    title: 'One Cold Melon Soda',
    giver: 'robin',
    summary: 'Robin is stuck on shift and desperately wants a melon soda from the cooler.',
    objective: { kind: 'deliver', target: 'soda', count: 1 },
    rewards: { money: 600, relationship: 8, statXp: { social: 6 } },
    dialogue: {
      offer:
        'Okay this is embarrassing. I am ON SHIFT, in a shop, full of drinks, and I cannot leave the register. Melon soda. Please. I will pay you more than it costs.',
      accepted: 'You are a legend. Cold one, if there is a cold one.',
      progress: 'Still parched over here. Melon soda. The green one.',
      complete: 'THANK you. Here, take this, it is more than it cost and I do not care.',
    },
  },
  {
    id: 'q_leif_protein',
    title: 'Fuel',
    giver: 'leif',
    summary: 'Leif ran out of protein bars mid-session and refuses to stop training.',
    requires: { minRelationship: 5 },
    objective: { kind: 'deliver', target: 'protein_bar', count: 2 },
    rewards: { money: 900, relationship: 10, statXp: { strength: 8 } },
    dialogue: {
      offer:
        'Two protein bars. I am not stopping this session and I am not walking to the shop mid-set. Bring them and I will make it worth your time.',
      accepted: 'Two. Not one. Go.',
      progress: 'Two bars. I am still here. I will be here for a while.',
      complete: 'Good. That is what a favour looks like. Take the money, do not argue.',
    },
  },
  {
    id: 'q_lenni_carp',
    title: 'For the Records',
    giver: 'lenni',
    summary: 'Lenni wants a crucian carp measured properly for his notebook.',
    requires: { minRelationship: 10 },
    objective: { kind: 'collect', target: 'crucian_carp', count: 2 },
    rewards: { money: 1200, relationship: 12, statXp: { intelligence: 8, luck: 4 } },
    dialogue: {
      offer:
        'I need two crucian carp. Not to keep — to measure. My spring dataset has a gap and it is bothering me at night. The park pond is your best bet.',
      accepted: 'Two carp. I will have the callipers ready.',
      progress: 'Two carp. From the pond, ideally, so the sample stays consistent.',
      complete: 'Excellent. Look at that — well within the expected range. You have no idea how good that feels.',
    },
  },
  {
    id: 'q_till_bench',
    title: 'The Bench Situation',
    giver: 'till',
    summary: 'Till wants company at the park bench at least once. That is the whole quest.',
    objective: { kind: 'visit', target: 'park', count: 1 },
    rewards: { money: 300, relationship: 12, statXp: { social: 10, charisma: 5 } },
    dialogue: {
      offer:
        'Okay this is not a real errand. I just want someone to come sit at the pond bench with me. That is it. That is the ask.',
      accepted: 'Great! The bench facing the water. You will know it.',
      progress: 'Bench. Pond. Any time.',
      complete: 'See? Best spot in the neighbourhood. Here, take this, I feel weird accepting company for free.',
    },
  },
  {
    id: 'q_erim_stake',
    title: 'House Money',
    giver: 'erim',
    summary: 'Erim wants to see whether you can win at his own table.',
    requires: { minRelationship: 15 },
    objective: { kind: 'win', target: 'dice', count: 3 },
    rewards: { money: 2500, relationship: 12, statXp: { luck: 10 } },
    dialogue: {
      offer:
        'Proposition. Win three rounds of dice downstairs. Not in a row — I am not a monster. Do that and I will pay you out of my own pocket, which I hate doing.',
      accepted: 'Three wins. The house is watching.',
      progress: 'Three wins at the dice table. You are not there yet.',
      complete: 'Three. Fine. FINE. Take it. And do not tell anyone I paid out.',
    },
  },
  {
    id: 'q_jovan_incense',
    title: 'Something for the Shrine',
    giver: 'jovan',
    summary: 'Jovan would like incense brought up to the shrine, but cannot get away from his desk.',
    requires: { minRelationship: 10 },
    objective: { kind: 'deliver', target: 'incense', count: 1 },
    rewards: { money: 1000, relationship: 14, statXp: { intelligence: 6, discipline: 6 } },
    dialogue: {
      offer:
        'A small thing. I keep meaning to bring incense up to the shrine and I keep not leaving this building. Would you get some? I will pay for it and then some.',
      accepted: 'Cedar, if they have it. Thank you.',
      progress: 'Incense, when you have a moment.',
      complete: 'Thank you. That has been sitting on my mind for two weeks. Genuinely — thank you.',
    },
  },
  {
    id: 'q_tusya_score',
    title: 'Take the Board',
    giver: 'tusya',
    summary: 'Tusya wants you to prove yourself at the arcade before she trains with you.',
    requires: { minRelationship: 10 },
    objective: { kind: 'win', target: 'arcade', count: 2 },
    rewards: { money: 1400, relationship: 12, statXp: { speed: 10, luck: 4 } },
    dialogue: {
      offer:
        'Rule of mine: I do not train with people who cannot handle Reflex Rush. Clear it twice. Then we talk.',
      accepted: 'Two clears. Go on.',
      progress: 'Two clears on Reflex Rush. I am counting.',
      complete: 'All right. All right! You are in. Come find me at the gym and bring water.',
    },
  },
  {
    id: 'q_leonidas_rival',
    title: 'A Worthy Opponent',
    giver: 'leonidas',
    summary: 'Leonidas will not rest until someone fights him properly.',
    requires: { minRelationship: -20 },
    objective: { kind: 'win', target: 'fight_leonidas', count: 1 },
    rewards: { money: 3000, relationship: 20, statXp: { strength: 14, stamina: 10 } },
    dialogue: {
      offer:
        'I have a problem and you are the solution. NOBODY here will fight me properly. Beat me. Truly beat me. I will reward it like a king.',
      accepted: 'Come at me when you are ready. Not before. I want the real version of you.',
      progress: 'You have not beaten me yet. This is not a criticism. It is a schedule.',
      complete: 'AT LAST. Take the money. Take it! I have been waiting for this since spring began.',
    },
  },
  {
    id: 'q_robin_rounds',
    title: 'Neighbourhood Rounds',
    giver: 'robin',
    summary: 'Robin bets you cannot talk to four different people in one day.',
    requires: { minRelationship: 20, questsDone: ['q_robin_drink'] },
    objective: { kind: 'talk', target: 'any', count: 4 },
    rewards: { money: 1600, relationship: 10, statXp: { social: 14, charisma: 8 } },
    dialogue: {
      offer:
        'Bet. Four different people, today. Actual conversations, not nodding at Leif from across the street. I will pay you if you manage it.',
      accepted: 'Four. Different. People. Go be sociable.',
      progress: 'Keep going! Four different people.',
      complete: 'You did it. I genuinely thought I had you. Worth every yen.',
    },
  },
  {
    id: 'q_till_fish',
    title: 'River Rumour',
    giver: 'till',
    summary: 'Till heard something enormous lives in the Kogawa and wants proof.',
    requires: { minRelationship: 25 },
    objective: { kind: 'collect', target: 'koi_fish', count: 1 },
    rewards: { money: 2200, relationship: 15, items: [{ itemId: 'sakura_charm', qty: 1 }] },
    dialogue: {
      offer:
        'So there is a koi in the river. A big one. Lenni has it in his notebook, which means it is real. Catch one and I will believe anything you ever tell me.',
      accepted: 'Riverside. Bait helps. Good luck!',
      progress: 'One koi. From the river. I believe in you.',
      complete: 'THAT IS ENORMOUS. Okay. Okay! Take this, my grandmother gave it to me and she would approve.',
    },
  },
  {
    id: 'q_erim_earn',
    title: 'Prove You Can Earn',
    giver: 'erim',
    summary: 'Erim only respects people who can make their own money.',
    requires: { minRelationship: 30 },
    objective: { kind: 'earn', target: 'money', count: 20000 },
    rewards: { money: 5000, relationship: 14, statXp: { workSkill: 12, discipline: 8 } },
    dialogue: {
      offer:
        'Earn twenty thousand yen. However you like — shifts, fish, my table, I do not care. I want to see whether you are a person who makes money or a person who has it.',
      accepted: 'Twenty thousand. Off you go.',
      progress: 'Twenty thousand yen earned. I am tracking it, obviously.',
      complete: 'There it is. That is the difference between luck and habit. Well done.',
    },
  },
  {
    id: 'q_lenni_study',
    title: 'Study Group of Two',
    giver: 'lenni',
    summary: 'Lenni wants you to actually sit down and study for once.',
    requires: { minRelationship: 20 },
    objective: { kind: 'visit', target: 'study', count: 3 },
    rewards: { money: 1800, relationship: 12, items: [{ itemId: 'puzzle_cube', qty: 1 }] },
    dialogue: {
      offer:
        'Three study sessions. At your desk, at home. I am not asking you to enjoy it. I am asking you to do it three times.',
      accepted: 'Three sessions. Your desk exists. Use it.',
      progress: 'Three study sessions. You will feel superior afterwards, I promise.',
      complete: 'There. Was that so bad? Here — this is the good cube. Do not lose it.',
    },
  },
];

export const QUEST_MAP: Record<string, QuestDefinition> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export function questsFrom(giver: string): QuestDefinition[] {
  return QUESTS.filter((q) => q.giver === giver);
}
