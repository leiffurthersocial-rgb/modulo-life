import type { RelationshipTier, StatKey, Weather } from '@/game/types';

export type DialogueTopic =
  | 'greet'
  | 'askDay'
  | 'compliment'
  | 'joke'
  | 'giftLoved'
  | 'giftLiked'
  | 'giftNeutral'
  | 'giftDisliked'
  | 'challengeAccept'
  | 'challengeDecline'
  | 'fightWin'
  | 'fightLose'
  | 'trade'
  | 'invite'
  | 'farewell'
  | 'idle'
  | 'rumor';

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

export interface DialogueCondition {
  tier?: RelationshipTier[];
  minScore?: number;
  maxScore?: number;
  time?: TimeOfDay[];
  weather?: Weather[];
  location?: string[];
  /** Player mood band. */
  mood?: 'low' | 'high';
  /** NPC energy band. */
  energy?: 'low' | 'high';
  minStat?: Partial<Record<StatKey, number>>;
  /** Requires a save flag to be set / unset. */
  flag?: string;
  notFlag?: string;
  weekend?: boolean;
}

export interface DialogueLine {
  speaker: string;
  topic: DialogueTopic;
  text: string;
  when?: DialogueCondition;
  weight?: number;
}

const D = (
  speaker: string,
  topic: DialogueTopic,
  text: string,
  when?: DialogueCondition,
  weight = 1,
): DialogueLine => ({ speaker, topic, text, when, weight });

/* ------------------------------------------------------------------ robin */
const robin: DialogueLine[] = [
  D('robin', 'greet', 'Hey! I was hoping I would run into someone. Morning is too quiet on its own.', { time: ['morning'] }),
  D('robin', 'greet', 'Oh good, a familiar face. I have been talking to a vending machine for ten minutes.', { time: ['day'] }),
  D('robin', 'greet', 'Evening! The light down Main Street right now is unreasonably nice.', { time: ['evening'] }),
  D('robin', 'greet', 'You are out late too? Respect. The street feels different after midnight.', { time: ['night'] }),
  D('robin', 'greet', 'There you are. I genuinely tell people about you now.', { tier: ['closeFriend', 'bestFriend'] }, 2),
  D('robin', 'greet', 'Hi. Have we... okay, no, we have definitely met. Sorry.', { tier: ['stranger'] }),
  D('robin', 'greet', 'Ugh. You.', { maxScore: -30 }, 3),
  D('robin', 'askDay', 'Four hours on the register and one guy bought forty onigiri. Forty. I asked. He would not say why.', { location: ['konbini'] }, 2),
  D('robin', 'askDay', 'Good so far! I walked the long way round the park and I regret nothing.'),
  D('robin', 'askDay', 'Rain day. I have decided to be a person who likes rain. Working on it.', { weather: ['rain'] }, 3),
  D('robin', 'compliment', 'Oh — stop. No, keep going. No, stop. Thank you.'),
  D('robin', 'joke', 'Why did I get a job at the konbini? Because the light in there makes everyone look like they have a plan.'),
  D('robin', 'giftLoved', 'Melon bread?! You remembered. Okay, you are officially my favourite person on this street.'),
  D('robin', 'giftLiked', 'Aw, thank you. Genuinely. I will use this.'),
  D('robin', 'giftNeutral', 'Huh. Okay! I will find a use for this. Probably.'),
  D('robin', 'giftDisliked', 'You are... giving me litter. As a present. Bold.'),
  D('robin', 'challengeAccept', 'Fight? Me? I mean — fine, but I want it on record that you started it.', { minScore: -100 }),
  D('robin', 'challengeDecline', 'Absolutely not. I have a shift and a face I like.'),
  D('robin', 'fightWin', 'Wait. Did I win? I won! Nobody is going to believe me.'),
  D('robin', 'fightLose', 'Okay, that is fair. That is entirely fair. Ow.'),
  D('robin', 'trade', 'Ooh, let me see what you have got.'),
  D('robin', 'invite', 'Yes. Whatever it is, yes. Where are we going?'),
  D('robin', 'rumor', 'Erim has been buying an absurd amount of coffee lately. Somebody down there is not sleeping.'),
  D('robin', 'idle', 'I should go. I have three things to do and I have forgotten two of them.'),
];

/* ------------------------------------------------------------------- leif */
const leif: DialogueLine[] = [
  D('leif', 'greet', 'Up early. Good. Most people are not.', { time: ['morning'] }),
  D('leif', 'greet', 'You look like you have been sitting down all day.', { time: ['day'] }),
  D('leif', 'greet', 'Second session tonight. You can come if you can keep up.', { time: ['evening'] }),
  D('leif', 'greet', 'Late. Fine. I do my best thinking at this hour.', { time: ['night'] }),
  D('leif', 'greet', 'Hey. Seriously — good to see you.', { tier: ['closeFriend', 'bestFriend'] }, 2),
  D('leif', 'greet', 'Do not stand there. Say something or move.', { maxScore: -20 }, 3),
  D('leif', 'askDay', 'Site work. Twelve tonnes of gravel and a foreman who cannot read a level. Fine day.', { location: ['construction'] }, 2),
  D('leif', 'askDay', 'Trained. Ate. Trained again. Do not overthink it.'),
  D('leif', 'askDay', 'Rain makes the scaffolding a problem. Everything takes twice as long.', { weather: ['rain'] }, 3),
  D('leif', 'compliment', 'I know. But say it again.'),
  D('leif', 'joke', 'Leonidas tried to spot me last week. He is shorter than the bar.'),
  D('leif', 'giftLoved', 'Protein. You get it. Most people do not get it.'),
  D('leif', 'giftLiked', 'Useful. Thanks. I mean that.'),
  D('leif', 'giftNeutral', 'Right. Sure. I will put it somewhere.'),
  D('leif', 'giftDisliked', 'What am I supposed to do with this. Genuinely asking.'),
  D('leif', 'challengeAccept', 'Finally. Hands up. Do not embarrass yourself.'),
  D('leif', 'challengeDecline', 'Not today. My shoulder is wrecked and I do not fight at half.', { energy: 'low' }),
  D('leif', 'fightWin', 'That is what I thought. Rematch whenever you have trained.'),
  D('leif', 'fightLose', 'Huh. Okay. That one is yours. It will not happen twice.'),
  D('leif', 'trade', 'Show me. Quickly.'),
  D('leif', 'invite', 'Fine. But we are walking fast.'),
  D('leif', 'rumor', 'Tusya has been logging her gym times. She is coming for my numbers and she knows it.'),
  D('leif', 'idle', 'I have got sets to finish.'),
];

/* ------------------------------------------------------------------ jovan */
const jovan: DialogueLine[] = [
  D('jovan', 'greet', 'Morning. The train was on time, which I take as a good sign.', { time: ['morning'] }),
  D('jovan', 'greet', 'Hello. I was just thinking about something and now I have lost it. That is fine.', { time: ['day'] }),
  D('jovan', 'greet', 'Evening. I am heading up to the shrine. It is quiet at this hour.', { time: ['evening'] }),
  D('jovan', 'greet', 'You are up. So am I, apparently.', { time: ['night'] }),
  D('jovan', 'greet', 'Good. I have been meaning to talk to you properly.', { tier: ['friend', 'closeFriend', 'bestFriend'] }, 2),
  D('jovan', 'greet', 'Hello.', { tier: ['stranger', 'acquaintance'] }),
  D('jovan', 'askDay', 'Spreadsheets. Then a lunch I did not taste. Then more spreadsheets. It pays for the quiet evenings.', { location: ['office'] }, 2),
  D('jovan', 'askDay', 'Steady. I prefer steady.'),
  D('jovan', 'askDay', 'I like the rain. Everything slows down to a speed I can actually keep up with.', { weather: ['rain'] }, 3),
  D('jovan', 'compliment', 'That is kind. I will probably think about it later than I should.'),
  D('jovan', 'joke', 'A colleague asked if I was tall enough to see the future. I said no, only the top shelf.'),
  D('jovan', 'giftLoved', 'Green tea. Properly good green tea. Thank you, genuinely.'),
  D('jovan', 'giftLiked', 'That is thoughtful. I will keep it on the desk.'),
  D('jovan', 'giftNeutral', 'Thank you. I will find it a place.'),
  D('jovan', 'giftDisliked', 'I appreciate the thought more than the object. Is that rude? That was rude.'),
  D('jovan', 'challengeAccept', 'If you want to. I will not enjoy it, but I will not lose politely either.'),
  D('jovan', 'challengeDecline', 'No. There is nothing either of us learns from that.'),
  D('jovan', 'fightWin', 'That is enough. Sit down for a moment, you went pale.'),
  D('jovan', 'fightLose', 'Well fought. I mean it. I underestimated the angle you were working.'),
  D('jovan', 'trade', 'Let us see. I am reasonable about prices.'),
  D('jovan', 'invite', 'All right. I have an hour.'),
  D('jovan', 'rumor', 'Lenni has a notebook with every fish anyone has caught this spring. He will deny it. He has it.'),
  D('jovan', 'idle', 'I should get back.'),
];

/* ------------------------------------------------------------------ lenni */
const lenni: DialogueLine[] = [
  D('lenni', 'greet', 'Oh! Morning. I have been up since five, I am not sure that was correct.', { time: ['morning'] }),
  D('lenni', 'greet', 'Hi. Sorry — one second, I am forty pages into something.', { time: ['day'] }),
  D('lenni', 'greet', 'Evening. The café at this hour is the single best place in this neighbourhood.', { time: ['evening'] }),
  D('lenni', 'greet', 'You should be asleep. I say that as someone who is also not asleep.', { time: ['night'] }),
  D('lenni', 'greet', 'Ah, good, you. I have three things to tell you and one is actually interesting.', { tier: ['friend', 'closeFriend', 'bestFriend'] }, 2),
  D('lenni', 'greet', 'Hello. Sorry. Hello.', { tier: ['stranger'] }),
  D('lenni', 'askDay', 'Reconciled a column of numbers that had been wrong since March. Nobody noticed. I noticed.', { location: ['office'] }, 2),
  D('lenni', 'askDay', 'Productive. I catalogued things. You did not ask which things and I respect that.'),
  D('lenni', 'askDay', 'Rain is good for reading and terrible for my glasses. Net positive.', { weather: ['rain'] }, 3),
  D('lenni', 'compliment', 'Oh. Thank you. I did not have a response prepared for that.'),
  D('lenni', 'joke', 'I tried Erim’s dice game once. I calculated the odds and then left. That is the joke.'),
  D('lenni', 'giftLoved', 'A puzzle cube — wait, this is the good kind, the corners turn properly. Thank you.'),
  D('lenni', 'giftLiked', 'That is genuinely well chosen. I am noting that you are good at this.'),
  D('lenni', 'giftNeutral', 'Thank you. I will catalogue it.'),
  D('lenni', 'giftDisliked', 'I am going to be honest, because I think you would want me to be: no.'),
  D('lenni', 'challengeAccept', 'Statistically I should decline. Fine. Let us gather data.', { minScore: 10 }),
  D('lenni', 'challengeDecline', 'No. I have run the numbers and the numbers say absolutely not.', { maxScore: 40 }, 3),
  D('lenni', 'fightWin', 'I won? I want that written down. By a notary.'),
  D('lenni', 'fightLose', 'Yes. That matched my model. Small comfort.'),
  D('lenni', 'trade', 'I know the market price of everything you are holding. Fair warning.'),
  D('lenni', 'invite', 'All right, but I am back by ten.'),
  D('lenni', 'rumor', 'The golden koi in the river is real. I have two sightings logged. Neither is mine, which is upsetting.'),
  D('lenni', 'idle', 'I have left something open on my desk. Metaphorically and literally.'),
];

/* ------------------------------------------------------------------- erim */
const erim: DialogueLine[] = [
  D('erim', 'greet', 'You are up early. Suspicious. What did you do.', { time: ['morning'] }),
  D('erim', 'greet', 'Afternoon. Daylight. Bold choice for both of us.', { time: ['day'] }),
  D('erim', 'greet', 'Evening. Door is open downstairs, if you have money you are bored of.', { time: ['evening'] }),
  D('erim', 'greet', 'Now we are talking. Nothing good happens before midnight.', { time: ['night'] }, 2),
  D('erim', 'greet', 'Ah, my favourite variable.', { tier: ['closeFriend', 'bestFriend'] }, 2),
  D('erim', 'greet', 'I know your face. I do not know your name. Yet.', { tier: ['stranger'] }),
  D('erim', 'askDay', 'Made coffee for people who did not deserve it. Took their money. Balanced day.', { location: ['cafe'] }, 2),
  D('erim', 'askDay', 'The house had a good night. The house usually does. That is sort of the point.', { location: ['basement'] }, 3),
  D('erim', 'askDay', 'Rain keeps everyone indoors and indoors is where my table is. Excellent weather.', { weather: ['rain'] }, 3),
  D('erim', 'compliment', 'Flattery. Bold, transparent, and working. Continue.'),
  D('erim', 'joke', 'Leonidas asked me to explain odds. I said the odds of that are low. He agreed enthusiastically.'),
  D('erim', 'giftLoved', 'An old coin. With the square hole. Where — no. Do not tell me. Thank you.'),
  D('erim', 'giftLiked', 'Hm. That is actually good. I am annoyed about it.'),
  D('erim', 'giftNeutral', 'Sure. I accept all tribute.'),
  D('erim', 'giftDisliked', 'You brought me flowers. To a basement. Read the room.'),
  D('erim', 'challengeAccept', 'Fists? I would rather take your money at a table. But fine, if you insist on the slow method.'),
  D('erim', 'challengeDecline', 'I do not fight. I take a percentage of people who do.'),
  D('erim', 'fightWin', 'See, this is why I set the odds instead of taking them.'),
  D('erim', 'fightLose', 'Fine. Fine! Put it on my tab.'),
  D('erim', 'trade', 'Everything is negotiable. Especially with you.'),
  D('erim', 'invite', 'Depends. Is there money involved? There is now.'),
  D('erim', 'rumor', 'Somebody has been feeding the carp in the park. They are enormous and they have opinions.'),
  D('erim', 'idle', 'The table does not run itself. Well. It does, but badly.'),
];

/* ------------------------------------------------------------------- till */
const till: DialogueLine[] = [
  D('till', 'greet', 'Morning! I have been awake for eleven minutes and this is already the best part.', { time: ['morning'] }),
  D('till', 'greet', 'Heyyy. Where are you going? Can I come?', { time: ['day'] }),
  D('till', 'greet', 'Golden hour. Bench by the pond. You are invited, obviously.', { time: ['evening'] }, 2),
  D('till', 'greet', 'Night walk? Night walk. Come on.', { time: ['night'] }),
  D('till', 'greet', 'THERE you are. I have been telling a story and you are the good part.', { tier: ['closeFriend', 'bestFriend'] }, 2),
  D('till', 'greet', 'Hi! Sorry, do I know — no? Okay, well, now you do.', { tier: ['stranger'] }),
  D('till', 'askDay', 'Deliveries. I know a shortcut behind the gym that saves four minutes and one traffic light.'),
  D('till', 'askDay', 'Nothing! Gloriously nothing. I sat on a bench and watched a cat make bad decisions.'),
  D('till', 'askDay', 'Rain! Best day. The whole street smells like the river.', { weather: ['rain'] }, 3),
  D('till', 'compliment', 'Okay you have to stop, I am going to get emotional in public.'),
  D('till', 'joke', 'I told Leif I could beat him at anything. He said "name it." I said "napping." He is still angry.'),
  D('till', 'giftLoved', 'TAIYAKI. From the good stand? You went to the good stand. I love you.'),
  D('till', 'giftLiked', 'Ohhh nice. Thank you! I am going to use this immediately.'),
  D('till', 'giftNeutral', 'Cool, cool. Thanks!'),
  D('till', 'giftDisliked', 'Hm. It is the thought. It is definitely only the thought.'),
  D('till', 'challengeAccept', 'A fight? Sure! I am mostly going to run away very fast, fair warning.'),
  D('till', 'challengeDecline', 'Nah. I like you too much and I bruise like fruit.'),
  D('till', 'fightWin', 'I did not think that would work! Are you okay? Sorry! That was great!'),
  D('till', 'fightLose', 'Yep. Yep, that was a good one. I am going to lie down here for a bit.'),
  D('till', 'trade', 'Ooh, swap? I love a swap.'),
  D('till', 'invite', 'Obviously yes. I was already coming.'),
  D('till', 'rumor', 'The arcade puts new prizes in the crane on the first of the month. Tusya knows. Tusya always knows.'),
  D('till', 'idle', 'I am going to go find somebody else to bother. Affectionately.'),
];

/* ------------------------------------------------------------------ tusya */
const tusya: DialogueLine[] = [
  D('tusya', 'greet', 'Morning run done. What is your excuse?', { time: ['morning'] }),
  D('tusya', 'greet', 'Hey! Perfect timing, I need someone to lose to me at something.', { time: ['day'] }),
  D('tusya', 'greet', 'Evening. Arcade later? Do not answer, you are coming.', { time: ['evening'] }),
  D('tusya', 'greet', 'Still up? Same. Second wind is a real thing.', { time: ['night'] }),
  D('tusya', 'greet', 'Hey you. I saved you a spot on the leaderboard. Second place.', { tier: ['closeFriend', 'bestFriend'] }, 2),
  D('tusya', 'greet', 'Hi — Tusya. Now you know. Now you have no excuse.', { tier: ['stranger'] }),
  D('tusya', 'askDay', 'Opened the café, ran the counter, out-poured Erim two to one. Do not tell him. Tell him.', { location: ['cafe'] }, 2),
  D('tusya', 'askDay', 'Good. Ran the park loop under nine minutes. Chasing eight.'),
  D('tusya', 'askDay', 'Rain does not cancel a run, it just makes it count double.', { weather: ['rain'] }, 3),
  D('tusya', 'compliment', 'Correct. Thank you for noticing.'),
  D('tusya', 'joke', 'Leonidas asked me to spot him. I said sure. He asked me to spot him from a chair.'),
  D('tusya', 'giftLoved', 'Sports drink — the blue one? You are alarmingly good at this.'),
  D('tusya', 'giftLiked', 'Nice. Thank you! Adding you to the good list.'),
  D('tusya', 'giftNeutral', 'Sure, I will take it. Thanks.'),
  D('tusya', 'giftDisliked', 'You are giving me garbage. Is this a strategy? Is it working? No.'),
  D('tusya', 'challengeAccept', 'Now we are talking. Come on, hands up.'),
  D('tusya', 'challengeDecline', 'Not while I am on shift. Find me after seven.'),
  D('tusya', 'fightWin', 'Good match! Seriously. Come train with me and it will be closer next time.'),
  D('tusya', 'fightLose', 'Okay. OKAY. Fine. That is going on the board and I am taking it back.'),
  D('tusya', 'trade', 'Deal me in. What have you got?'),
  D('tusya', 'invite', 'Yes. And I am picking the activity.'),
  D('tusya', 'rumor', 'Robin has beaten my arcade score twice and pretended it was luck both times.'),
  D('tusya', 'idle', 'Right — going. Things to win.'),
];

/* --------------------------------------------------------------- leonidas */
const leonidas: DialogueLine[] = [
  D('leonidas', 'greet', 'THE SUN IS UP AND SO AM I. Join me. Do not join me. Either way I am going.', { time: ['morning'] }),
  D('leonidas', 'greet', 'You approach! Excellent. State your business.', { time: ['day'] }),
  D('leonidas', 'greet', 'Evening! The finest hour. The bench outside the gym is MINE at this hour.', { time: ['evening'] }),
  D('leonidas', 'greet', 'The neighbourhood sleeps. I patrol. It is a service. You are welcome.', { time: ['night'] }),
  D('leonidas', 'greet', 'MY FRIEND. Come here. No, closer. There.', { tier: ['closeFriend', 'bestFriend'] }, 2),
  D('leonidas', 'greet', 'I do not know you. I already respect you slightly. Do not waste it.', { tier: ['stranger'] }),
  D('leonidas', 'askDay', 'I carried a beam. Two men were assigned. One was needed. That one was me.', { location: ['construction'] }, 2),
  D('leonidas', 'askDay', 'MAGNIFICENT. I lifted a number I will not say aloud because you would not believe it.'),
  D('leonidas', 'askDay', 'Rain is simply the sky testing me. I passed.', { weather: ['rain'] }, 3),
  D('leonidas', 'compliment', 'Yes. Yes! Say more. This is good for the neighbourhood.'),
  D('leonidas', 'joke', 'They said I was short. I said I am CONCENTRATED. Nobody has recovered.'),
  D('leonidas', 'giftLoved', 'KATSU CURRY. You honour me. I will eat this in one sitting and think of you.'),
  D('leonidas', 'giftLiked', 'A worthy gift! Accepted with great ceremony.'),
  D('leonidas', 'giftNeutral', 'It is small. So am I. I accept it.'),
  D('leonidas', 'giftDisliked', 'What IS this. Take it back. Take it back gently, I am not angry, I am disappointed.'),
  D('leonidas', 'challengeAccept', 'AT LAST. Someone with courage. Try not to enjoy this too much.', {}, 3),
  D('leonidas', 'challengeDecline', 'I am eating. Come back when I am not eating. That is the only rule.', { energy: 'low' }),
  D('leonidas', 'fightWin', 'HA! A noble effort. Truly. Train, and return, and I will fight you again with joy.'),
  D('leonidas', 'fightLose', 'You... you actually. Hm. HM! Good. GOOD. I have found a rival.'),
  D('leonidas', 'trade', 'Show me your wares, merchant.'),
  D('leonidas', 'invite', 'I will come. I will also carry anything heavy. That is my role.'),
  D('leonidas', 'rumor', 'Erim runs a game under his house. I do not gamble. I have watched. That is different.'),
  D('leonidas', 'idle', 'The weights are calling. They call in my voice. It is unsettling.'),
];

/* ---------------------------------------------------------------- generic */
const generic: DialogueLine[] = [
  D('*', 'greet', 'Hey there.'),
  D('*', 'askDay', 'Same as usual, really.'),
  D('*', 'compliment', 'Thanks. That is nice to hear.'),
  D('*', 'joke', 'Ha! Not bad.'),
  D('*', 'giftLoved', 'This is perfect. Thank you.'),
  D('*', 'giftLiked', 'Thank you, that is thoughtful.'),
  D('*', 'giftNeutral', 'Thanks, I suppose.'),
  D('*', 'giftDisliked', 'Ah. Well. Thanks anyway.'),
  D('*', 'challengeAccept', 'All right. Let us do this.'),
  D('*', 'challengeDecline', 'Not right now.'),
  D('*', 'fightWin', 'Good match.'),
  D('*', 'fightLose', 'You got me.'),
  D('*', 'trade', 'Let us see what you have.'),
  D('*', 'invite', 'Sure, why not.'),
  D('*', 'farewell', 'See you around.'),
  D('*', 'idle', 'Right, I should get on.'),
  D('*', 'rumor', 'Nothing much going on that I know of.'),
];

export const DIALOGUE: DialogueLine[] = [
  ...robin,
  ...leif,
  ...jovan,
  ...lenni,
  ...erim,
  ...till,
  ...tusya,
  ...leonidas,
  ...generic,
];
