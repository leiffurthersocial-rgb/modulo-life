import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Panel } from '../common/widgets';
import { LOCATIONS, isOpen } from '@/data/locations';
import { hourOf } from '@/game/systems/timeSystem';

interface ActivityInfo {
  icon: string;
  name: string;
  where: string;
  what: string;
  gains: string;
}

const ACTIVITIES: ActivityInfo[] = [
  { icon: '💼', name: 'Work a shift', where: 'Konbini, café, office, building site', what: 'A short minigame decides how well the shift goes.', gains: 'Money, Work Skill, Discipline' },
  { icon: '🏋️', name: 'Train at the gym', where: 'Iron Pine Gym', what: 'Bench press, treadmill or the bag. Costs ¥500 and an hour.', gains: 'Strength, Stamina, Speed' },
  { icon: '📚', name: 'Study', where: 'The desk in your home', what: 'Ninety minutes with a book. A bookshelf at home makes it count for more.', gains: 'Intelligence, Discipline' },
  { icon: '🎣', name: 'Fishing', where: 'Park pond and the Kogawa', what: 'Cast, wait for the bite, then reel inside the window. Bait improves the odds.', gains: 'Fish to sell or gift, Discipline' },
  { icon: '🕹️', name: 'Arcade', where: 'Neon Alley', what: 'Reflex Rush, card duels, dice and the crane.', gains: 'Speed, Luck, prizes' },
  { icon: '🏃', name: 'Park run', where: 'Hinode Park loop', what: 'Hit the checkpoints in rhythm before the timer runs out.', gains: 'Speed, Stamina' },
  { icon: '🎲', name: 'The basement', where: "Erim's basement", what: 'Dice, high/low, cards, coin flip and the wheel. In-game yen only.', gains: 'Money, or the loss of it' },
  { icon: '💬', name: 'Talking to people', where: 'Anywhere', what: 'Greet, ask about their day, compliment, joke, gift, trade or challenge.', gains: 'Social, Charisma, friendships' },
  { icon: '🥊', name: 'Sparring', where: 'Anywhere, if they agree', what: 'A quick arcade-style match. Nobody is ever seriously hurt.', gains: 'Strength, Stamina, Speed, respect' },
  { icon: '⛩️', name: 'Shrine offering', where: 'Hoshizaki Shrine', what: 'A hundred yen and a bow.', gains: 'Luck, Mood' },
  { icon: '🛒', name: 'Shopping', where: 'Modulo Mart, Sakura Foods', what: 'Food, gifts, furniture and clothing. Sakura Foods buys things back.', gains: 'Everything else' },
  { icon: '🪑', name: 'Sitting still', where: 'Benches, cafés, your sofa', what: 'Doing nothing is a legitimate strategy.', gains: 'Mood, Energy' },
];

export default function ActivitiesPanel() {
  const state = useGameStore((s) => s.state);
  const close = useUiStore((s) => s.closePanel);
  if (!state) return null;
  const hour = hourOf(state.time);

  return (
    <div className="overlay">
      <Panel title="Things to do" icon="⭐" onClose={close}>
        <p className="muted" style={{ marginTop: 0 }}>
          There is no correct way to spend a day here. Discovered so far:{' '}
          <strong>{state.activitiesDiscovered.length}</strong>.
        </p>

        <div className="grid-2">
          {ACTIVITIES.map((a) => (
            <div key={a.name} className="item-card" style={{ cursor: 'default' }}>
              <span className="icon" aria-hidden>
                {a.icon}
              </span>
              <span className="meta">
                <span className="title">{a.name}</span>
                <span className="desc">{a.what}</span>
                <span className="desc" style={{ color: 'var(--teal)' }}>
                  {a.gains}
                </span>
                <span className="desc muted">{a.where}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="section-title">Open right now</div>
        <div className="trait-list">
          {LOCATIONS.filter((l) => l.openHours && l.kind !== 'home').map((l) => (
            <span key={l.id} className="chip" style={{ opacity: isOpen(l.id, hour) ? 1 : 0.4 }}>
              {l.mapIcon} {l.name}
              {!isOpen(l.id, hour) && ' · closed'}
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}
