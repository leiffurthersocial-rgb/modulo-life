import { useState } from 'react';
import { MinigameShell, StakePicker } from './shell';
import { useGameStore } from '@/stores/useGameStore';
import { audio } from '@/game/audio/AudioManager';
import { createRng } from '@/game/systems/rng';
import { formatMoney } from '@/game/systems/economy';
import { getCharacter } from '@/data/characters';
import {
  COIN_PAYOUT,
  DICE_ODDS,
  HIGHLOW_MULTIPLIER,
  SUIT_GLYPH,
  WHEEL,
  cardPayout,
  dealerShouldHit,
  flipCoin,
  handValue,
  highLowChance,
  makeDeck,
  newHighLow,
  playHighLow,
  resolveCards,
  resolveDice,
  spinWheel,
  type Card,
  type DiceBet,
  type HighLowState,
} from '@/game/systems/minigames';
import { shuffle } from '@/game/systems/rng';

const rng = () => Math.random();

function useGambling(gameId: string) {
  const store = useGameStore();
  const record = useGameStore((s) => s.recordMinigame);
  const money = useGameStore((s) => s.state?.money ?? 0);

  const settle = (stake: number, returned: number, won: boolean, score = 0) => {
    const net = returned - stake;
    if (net > 0) store.addMoney(net);
    else if (net < 0) store.spendMoney(-net);
    record(gameId, won, score);
    if (won) store.grantStatXp({ luck: 5, intelligence: 2 });
    else store.grantStatXp({ luck: 2 });
    store.advanceTime(6, 0.6);
    return net;
  };

  return { settle, money, store };
}

/* ----------------------------------------------------------------- dice */

export function DiceGame({ vs, onClose }: { vs?: string; onClose: () => void }) {
  const { settle, money } = useGambling('dice');
  const store = useGameStore();
  const [stake, setStake] = useState(100);
  const [bet, setBet] = useState<DiceBet>('high');
  const [exact, setExact] = useState(7);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState(
    vs ? `${getCharacter(vs).name} shakes the cup. "Call it."` : 'Call it and the dice decide.',
  );

  const roll = () => {
    if (rolling || money < stake) return;
    setRolling(true);
    audio.play('dice');
    const spin = window.setInterval(() => setDice([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]), 70);
    window.setTimeout(() => {
      window.clearInterval(spin);
      const outcome = resolveDice(bet, stake, createRng(Date.now() & 0xffff), exact);
      setDice(outcome.dice);
      const net = settle(stake, Math.round(stake * outcome.payout), outcome.won, outcome.total);
      setMessage(`${outcome.message} ${net >= 0 ? '+' : ''}${formatMoney(net)}`);
      audio.play(outcome.won ? 'win' : 'lose');
      if (vs) {
        store.relationship(vs, { score: outcome.won ? 1 : 3, note: `Played dice with ${getCharacter(vs).name}.` });
      }
      setRolling(false);
    }, 900);
  };

  return (
    <MinigameShell
      title={vs ? `Dice with ${getCharacter(vs).name}` : 'Dice Corner'}
      icon="🎲"
      help="Two dice. Low is 2–6, high is 8–12. Every payout below is the full return on your stake, so 2.2× means you get your stake back plus 1.2×."
      onClose={onClose}
      footer={
        <button className="btn primary" disabled={rolling || money < stake} onClick={roll}>
          {rolling ? 'Rolling…' : `Roll for ${formatMoney(stake)}`}
        </button>
      }
    >
      <div className="mg-stage" style={{ gap: '1rem', display: 'flex' }}>
        {dice.map((d, i) => (
          <span key={i} className={`die ${rolling ? 'rolling' : ''}`}>
            {d}
          </span>
        ))}
      </div>

      <p style={{ textAlign: 'center' }}>{message}</p>

      <StakePicker stake={stake} setStake={setStake} money={money} disabled={rolling} />

      <div className="field">
        <label>
          <span>Your call</span>
        </label>
        <div className="grid-2">
          {(Object.keys(DICE_ODDS) as DiceBet[]).map((b) => (
            <button
              key={b}
              className={`item-card ${bet === b ? 'selected' : ''}`}
              onClick={() => setBet(b)}
              disabled={rolling}
            >
              <span className="meta">
                <span className="title">
                  <span>{DICE_ODDS[b].label}</span>
                  <span className="price">{DICE_ODDS[b].pays}</span>
                </span>
                <span className="desc">Chance {DICE_ODDS[b].chance}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {bet === 'exact' && (
        <div className="field">
          <label>
            <span>Which number?</span>
            <span className="muted mono">{exact}</span>
          </label>
          <input
            type="range"
            min={2}
            max={12}
            value={exact}
            onChange={(e) => setExact(parseInt(e.target.value, 10))}
            disabled={rolling}
            aria-label="Called number"
          />
        </div>
      )}
    </MinigameShell>
  );
}

/* -------------------------------------------------------------- high/low */

export function HighLowGame({ onClose }: { onClose: () => void }) {
  const { settle, money } = useGambling('highlow');
  const [stake, setStake] = useState(500);
  const [game, setGame] = useState<HighLowState | null>(null);
  const [message, setMessage] = useState('Pick a stake and draw the first card.');
  const [drawn, setDrawn] = useState<number | null>(null);

  const start = () => {
    if (money < stake) return;
    setGame(newHighLow(stake, rng));
    setDrawn(null);
    setMessage('Higher or lower than that?');
    audio.play('ui');
  };

  const guess = (dir: 'higher' | 'lower') => {
    if (!game) return;
    const next = playHighLow(game, dir, rng);
    setDrawn(next.drawn);
    if (next.over) {
      settle(stake, 0, false, game.streak);
      setMessage(`It was ${next.drawn}. The run ends there — ${formatMoney(-stake)}.`);
      audio.play('lose');
      setGame(null);
    } else {
      setGame(next);
      setMessage(`${next.drawn}. Pot is now ${formatMoney(next.pot)}. Keep going or take it?`);
      audio.play('blip');
    }
  };

  const cashOut = () => {
    if (!game) return;
    settle(stake, game.pot, true, game.streak);
    audio.play('win');
    setMessage(`You walk with ${formatMoney(game.pot)} after ${game.streak} correct calls.`);
    setGame(null);
  };

  return (
    <MinigameShell
      title="High / Low"
      icon="🃏"
      help={`Cards run 1 to 13. Each correct call multiplies the pot by ${HIGHLOW_MULTIPLIER}×. A tie goes to the house, which is where its edge comes from. Cash out whenever you like.`}
      onClose={onClose}
      footer={
        game ? (
          <button className="btn" onClick={cashOut}>
            Take {formatMoney(game.pot)}
          </button>
        ) : (
          <button className="btn primary" disabled={money < stake} onClick={start}>
            Deal for {formatMoney(stake)}
          </button>
        )
      }
    >
      <div className="mg-stage" style={{ flexDirection: 'column', gap: '0.8rem' }}>
        <div className="card-row">
          <span className="playing-card">
            <span>{game?.current ?? drawn ?? '?'}</span>
            <span style={{ alignSelf: 'flex-end' }}>🌸</span>
          </span>
        </div>
        {game && (
          <span className="muted tiny">
            Streak {game.streak} · pot {formatMoney(game.pot)}
          </span>
        )}
      </div>

      <p style={{ textAlign: 'center' }}>{message}</p>

      {!game && <StakePicker stake={stake} setStake={setStake} money={money} />}

      {game && (
        <div className="row" style={{ justifyContent: 'center', gap: '0.6rem' }}>
          <button className="btn" onClick={() => guess('higher')}>
            Higher ({Math.round(highLowChance(game.current, 'higher') * 100)}%)
          </button>
          <button className="btn" onClick={() => guess('lower')}>
            Lower ({Math.round(highLowChance(game.current, 'lower') * 100)}%)
          </button>
        </div>
      )}
    </MinigameShell>
  );
}

/* ---------------------------------------------------------------- cards */

function CardFace({ card, hidden }: { card: Card; hidden?: boolean }) {
  return (
    <span className={`playing-card ${hidden ? 'back' : ''}`}>
      <span>{card.rank}</span>
      <span style={{ alignSelf: 'flex-end' }}>{SUIT_GLYPH[card.suit]}</span>
    </span>
  );
}

export function CardsGame({ onClose }: { onClose: () => void }) {
  const { settle, money } = useGambling('cards');
  const [stake, setStake] = useState(500);
  const [deck, setDeck] = useState<Card[]>([]);
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [phase, setPhase] = useState<'bet' | 'play' | 'done'>('bet');
  const [message, setMessage] = useState('Get closer to 21 than the dealer without going over.');

  const deal = () => {
    if (money < stake) return;
    const d = shuffle(rng, makeDeck());
    const p = [d.pop()!, d.pop()!];
    const dl = [d.pop()!, d.pop()!];
    setDeck(d);
    setPlayer(p);
    setDealer(dl);
    setPhase('play');
    setMessage(`You have ${handValue(p)}. Hit or stand?`);
    audio.play('ui');
  };

  const hit = () => {
    const d = deck.slice();
    const card = d.pop();
    if (!card) return;
    const p = [...player, card];
    setDeck(d);
    setPlayer(p);
    audio.play('blip');
    if (handValue(p) > 21) finish(p, dealer, d);
    else setMessage(`You have ${handValue(p)}.`);
  };

  const stand = () => {
    const d = deck.slice();
    const dl = dealer.slice();
    while (dealerShouldHit(dl)) {
      const card = d.pop();
      if (!card) break;
      dl.push(card);
    }
    setDeck(d);
    setDealer(dl);
    finish(player, dl, d);
  };

  const finish = (p: Card[], dl: Card[], _d: Card[]) => {
    const result = resolveCards(p, dl);
    const payout = cardPayout(result);
    const net = settle(stake, Math.round(stake * payout), result === 'win' || result === 'blackjack', handValue(p));
    setPhase('done');
    const label =
      result === 'blackjack'
        ? 'Twenty-one on the deal.'
        : result === 'win'
          ? 'You take it.'
          : result === 'push'
            ? 'A push. Stake returned.'
            : handValue(p) > 21
              ? 'Bust.'
              : 'The dealer takes it.';
    setMessage(`${label} You ${handValue(p)}, dealer ${handValue(dl)}. ${net >= 0 ? '+' : ''}${formatMoney(net)}`);
    audio.play(payout > 1 ? 'win' : payout === 1 ? 'ui' : 'lose');
  };

  return (
    <MinigameShell
      title="Card Duel"
      icon="🂡"
      help="Beat the dealer's hand without passing 21. Aces count as 11 until that would bust you. The dealer must draw to 17 and stand there. A win pays 2×, an opening 21 pays 2.5×, a tie returns your stake."
      onClose={onClose}
      footer={
        phase === 'play' ? (
          <>
            <button className="btn" onClick={hit}>
              Hit
            </button>
            <button className="btn primary" onClick={stand}>
              Stand
            </button>
          </>
        ) : (
          <button className="btn primary" disabled={money < stake} onClick={deal}>
            Deal for {formatMoney(stake)}
          </button>
        )
      }
    >
      <div className="mg-stage" style={{ flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <div>
          <div className="muted tiny" style={{ textAlign: 'center', marginBottom: '0.35rem' }}>
            Dealer {phase === 'play' ? '' : `· ${handValue(dealer)}`}
          </div>
          <div className="card-row">
            {dealer.map((c, i) => (
              <CardFace key={i} card={c} hidden={phase === 'play' && i > 0} />
            ))}
            {dealer.length === 0 && <span className="playing-card back">?</span>}
          </div>
        </div>
        <div>
          <div className="muted tiny" style={{ textAlign: 'center', marginBottom: '0.35rem' }}>
            You {player.length > 0 ? `· ${handValue(player)}` : ''}
          </div>
          <div className="card-row">
            {player.map((c, i) => (
              <CardFace key={i} card={c} />
            ))}
            {player.length === 0 && <span className="playing-card back">?</span>}
          </div>
        </div>
      </div>

      <p style={{ textAlign: 'center' }}>{message}</p>
      {phase !== 'play' && <StakePicker stake={stake} setStake={setStake} money={money} />}
    </MinigameShell>
  );
}

/* ------------------------------------------------------------ coin flip */

export function CoinFlipGame({ onClose }: { onClose: () => void }) {
  const { settle, money } = useGambling('coinflip');
  const [stake, setStake] = useState(500);
  const [call, setCall] = useState<'heads' | 'tails'>('heads');
  const [face, setFace] = useState<'heads' | 'tails'>('heads');
  const [flipping, setFlipping] = useState(false);
  const [message, setMessage] = useState(`Call it. A win pays ${COIN_PAYOUT}×.`);

  const flip = () => {
    if (flipping || money < stake) return;
    setFlipping(true);
    audio.play('coin');
    const spin = window.setInterval(() => setFace((f) => (f === 'heads' ? 'tails' : 'heads')), 90);
    window.setTimeout(() => {
      window.clearInterval(spin);
      const result = flipCoin(rng);
      setFace(result);
      const won = result === call;
      const net = settle(stake, won ? Math.round(stake * COIN_PAYOUT) : 0, won);
      setMessage(`${result === 'heads' ? 'Heads' : 'Tails'}. ${net >= 0 ? '+' : ''}${formatMoney(net)}`);
      audio.play(won ? 'win' : 'lose');
      setFlipping(false);
    }, 800);
  };

  return (
    <MinigameShell
      title="Coin Flip"
      icon="🪙"
      help={`An even chance either way. The payout is ${COIN_PAYOUT}× rather than 2×, which is the house's cut.`}
      onClose={onClose}
      footer={
        <button className="btn primary" disabled={flipping || money < stake} onClick={flip}>
          {flipping ? 'Spinning…' : `Flip for ${formatMoney(stake)}`}
        </button>
      }
    >
      <div className="mg-stage">
        <span className="mg-big" style={{ fontSize: '4rem' }}>
          {face === 'heads' ? '🌸' : '🏮'}
        </span>
      </div>
      <p style={{ textAlign: 'center' }}>{message}</p>
      <StakePicker stake={stake} setStake={setStake} money={money} disabled={flipping} />
      <div className="row" style={{ justifyContent: 'center', gap: '0.6rem' }}>
        <button className={`btn ${call === 'heads' ? 'primary' : ''}`} onClick={() => setCall('heads')} disabled={flipping}>
          🌸 Blossom
        </button>
        <button className={`btn ${call === 'tails' ? 'primary' : ''}`} onClick={() => setCall('tails')} disabled={flipping}>
          🏮 Lantern
        </button>
      </div>
    </MinigameShell>
  );
}

/* ---------------------------------------------------------------- wheel */

export function WheelGame({ onClose }: { onClose: () => void }) {
  const { settle, money } = useGambling('wheel');
  const luck = useGameStore((s) => s.state?.stats.luck ?? 50);
  const [stake, setStake] = useState(500);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState('Twelve segments. Most of them are not kind.');

  const seg = 360 / WHEEL.length;
  const gradient = WHEEL.map((s, i) => `${s.color} ${i * seg}deg ${(i + 1) * seg}deg`).join(', ');

  const spin = () => {
    if (spinning || money < stake) return;
    setSpinning(true);
    audio.play('reel');
    const index = spinWheel(rng, luck);
    const target = 360 * 5 + (360 - (index * seg + seg / 2));
    setAngle((a) => a + target);
    window.setTimeout(() => {
      const s = WHEEL[index];
      const net = settle(stake, Math.round(stake * s.multiplier), s.multiplier >= 1, Math.round(s.multiplier * 10));
      setMessage(`${s.label}. ${net >= 0 ? '+' : ''}${formatMoney(net)}`);
      audio.play(s.multiplier >= 1 ? 'win' : 'lose');
      setSpinning(false);
    }, 3700);
  };

  return (
    <MinigameShell
      title="Fortune Wheel"
      icon="🎡"
      help="Each segment is the multiplier on your stake, so 0.5× means you get half of it back. Five of the twelve pay nothing at all. The wheel keeps about 8% over time."
      onClose={onClose}
      footer={
        <button className="btn primary" disabled={spinning || money < stake} onClick={spin}>
          {spinning ? 'Spinning…' : `Spin for ${formatMoney(stake)}`}
        </button>
      }
    >
      <div className="mg-stage">
        <div className="wheel-wrap">
          <span className="wheel-pointer">▼</span>
          <div
            className="wheel-disc"
            style={{ background: `conic-gradient(${gradient})`, transform: `rotate(${angle}deg)` }}
          />
        </div>
      </div>
      <p style={{ textAlign: 'center' }}>{message}</p>
      <StakePicker stake={stake} setStake={setStake} money={money} disabled={spinning} />
      <div className="trait-list" style={{ justifyContent: 'center' }}>
        {WHEEL.map((s, i) => (
          <span key={i} className="chip" style={{ borderColor: s.color }}>
            {s.label}
          </span>
        ))}
      </div>
    </MinigameShell>
  );
}
