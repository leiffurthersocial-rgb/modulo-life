import { useUiStore } from '@/stores/useUiStore';
import { getGame } from '@/ui/gameRef';
import { CardsGame, CoinFlipGame, DiceGame, HighLowGame, WheelGame } from './GamblingGames';
import { ArcadeGame, FishingGame, RunningGame, StrengthGame } from './SkillGames';
import { ShiftGame } from './ShiftGames';

/** Routes the active minigame id to its component. */
export default function MinigameHost() {
  const id = useUiStore((s) => s.minigame);
  const context = useUiStore((s) => s.minigameContext);
  const close = useUiStore((s) => s.closePanel);

  if (!id) return null;

  const onClose = () => {
    close();
    getGame()?.setLockedTo(null);
  };

  const vs = typeof context?.vs === 'string' ? context.vs : undefined;
  const spot = typeof context?.spot === 'string' ? context.spot : 'pond';
  const job = typeof context?.job === 'string' ? context.job : 'konbini_clerk';

  switch (id) {
    case 'dice':
      return <DiceGame vs={vs} onClose={onClose} />;
    case 'highlow':
      return <HighLowGame onClose={onClose} />;
    case 'cards':
      return <CardsGame onClose={onClose} />;
    case 'coinflip':
      return <CoinFlipGame onClose={onClose} />;
    case 'wheel':
      return <WheelGame onClose={onClose} />;
    case 'arcade':
      return <ArcadeGame onClose={onClose} />;
    case 'running':
      return <RunningGame onClose={onClose} />;
    case 'strength':
      return <StrengthGame onClose={onClose} />;
    case 'fishing':
      return <FishingGame spot={spot} onClose={onClose} />;
    case 'shift-konbini':
    case 'shift-cafe':
    case 'shift-delivery':
    case 'shift-office':
    case 'shift-construction':
      return <ShiftGame jobId={job} onClose={onClose} />;
    default:
      return null;
  }
}
