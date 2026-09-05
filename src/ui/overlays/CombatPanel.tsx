import { useEffect, useRef, useState } from 'react';
import { getCharacter } from '@/data/characters';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Bar } from '../common/widgets';
import { getGame } from '../gameRef';
import { audio } from '@/game/audio/AudioManager';
import {
  ACTION_COST,
  canAct,
  combatXp,
  commitAction,
  createCombat,
  createFighter,
  releaseBlock,
  tickCombat,
  type CombatAction,
  type CombatEvent,
  type CombatState,
} from '@/game/systems/combat';
import { fightAftermath } from '@/game/systems/relationships';
import { effectiveStats } from '@/game/systems/stats';
import { formatMoney } from '@/game/systems/economy';
import type { AnimState } from '@/game/characters/CharacterModel';

interface Floater {
  id: number;
  text: string;
  color: string;
  left: number;
  top: number;
}

const ACTION_ANIM: Record<string, AnimState> = {
  attack: 'attack',
  heavy: 'heavy',
  dodge: 'dodge',
  block: 'block',
  retreat: 'dodge',
  idle: 'idle',
  stagger: 'hit',
  down: 'defeat',
};

let floaterId = 0;

export default function CombatPanel() {
  const foeId = useUiStore((s) => s.combatFoe);
  const ui = useUiStore();
  const state = useGameStore((s) => s.state);
  const store = useGameStore();

  const combatRef = useRef<CombatState | null>(null);
  const rafRef = useRef(0);
  const seenEvents = useRef(0);
  const finished = useRef(false);
  const [, force] = useState(0);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [banner, setBanner] = useState('');

  useEffect(() => {
    if (!state || !foeId) return;
    const game = getGame();
    const me = getCharacter(state.playerId);
    const foeDef = getCharacter(foeId);

    const playerFighter = createFighter(
      me.id,
      me.name,
      me.themeColor,
      effectiveStats(state.stats, state.needs),
      me.personality,
    );
    const foeFighter = createFighter(foeDef.id, foeDef.name, foeDef.themeColor, foeDef.baseStats, foeDef.personality);
    const combat = createCombat(playerFighter, foeFighter);
    combatRef.current = combat;
    seenEvents.current = 0;
    finished.current = false;

    game?.beginCombat(foeId);
    audio.play('heavy');
    setBanner('Fight!');
    window.setTimeout(() => setBanner(''), 900);

    let last = performance.now();
    let uiAccum = 0;
    let prevPlayerAction = '';
    let prevFoeAction = '';

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const c = combatRef.current;
      if (!c || finished.current) return;

      tickCombat(c, dt);

      // Push each fighter's committed action onto their 3D model.
      const pAction = c.player.blocking ? 'block' : c.player.action;
      if (pAction !== prevPlayerAction) {
        game?.combatAnim('player', ACTION_ANIM[pAction] ?? 'idle');
        prevPlayerAction = pAction;
      }
      const fAction = c.foe.blocking ? 'block' : c.foe.action;
      if (fAction !== prevFoeAction) {
        game?.combatAnim('foe', ACTION_ANIM[fAction] ?? 'idle');
        prevFoeAction = fAction;
      }

      while (seenEvents.current < c.events.length) {
        handleEvent(c.events[seenEvents.current]);
        seenEvents.current++;
      }

      uiAccum += dt;
      if (uiAccum > 0.06) {
        uiAccum = 0;
        force((n) => n + 1);
      }

      if (c.over) {
        finished.current = true;
        window.setTimeout(() => conclude(c), 900);
      }
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      getGame()?.endCombat();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foeId]);

  const addFloater = (text: string, color: string, side: 'left' | 'right') => {
    const id = ++floaterId;
    setFloaters((f) => [
      ...f.slice(-6),
      { id, text, color, left: side === 'left' ? 30 + Math.random() * 8 : 60 + Math.random() * 8, top: 42 + Math.random() * 8 },
    ]);
    window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1000);
  };

  const handleEvent = (e: CombatEvent) => {
    const side = e.by === 'player' ? 'right' : 'left';
    switch (e.kind) {
      case 'hit':
        audio.play('hit');
        addFloater(`−${e.amount}`, e.by === 'player' ? '#f2a0bd' : '#e5757b', side);
        if (e.by === 'foe') getGame()?.shakeCamera(0.25);
        break;
      case 'crit':
        audio.play('heavy');
        addFloater(`−${e.amount}!`, '#f0c96a', side);
        getGame()?.shakeCamera(0.4);
        break;
      case 'block':
        audio.play('block');
        addFloater('block', '#8fb8e8', side);
        break;
      case 'dodge':
        audio.play('dodge');
        addFloater('miss', '#a49ebb', side);
        break;
      case 'miss':
        addFloater('miss', '#6f6a85', side);
        break;
      case 'knockdown':
        audio.play('heavy');
        setBanner(e.text);
        getGame()?.shakeCamera(0.55);
        window.setTimeout(() => setBanner(''), 1100);
        break;
      case 'stamina':
        setBanner(e.text);
        window.setTimeout(() => setBanner(''), 900);
        break;
      default:
        break;
    }
  };

  const conclude = (c: CombatState) => {
    if (!state || !foeId) return;
    const foeDef = getCharacter(foeId);
    const rounds = Math.round(c.t);
    const won = c.outcome === 'player';
    const fled = c.outcome === 'fled';

    const lines: string[] = [];
    if (fled) {
      lines.push('You broke off before anyone got hurt properly.');
      store.adjustNeed({ energy: -12, mood: -6 });
    } else {
      const xp = combatXp(won, rounds);
      store.grantStatXp(xp);
      const after = fightAftermath(foeId, won);
      store.relationship(foeId, { score: after.score, respect: after.respect, ignoreDiminish: true, note: after.note });

      if (won) {
        const purse = 400 + Math.round(foeDef.baseStats.strength * 12);
        store.addMoney(purse, 'Match purse');
        lines.push(`${foeDef.name} is beaten, and impressed about it.`);
        lines.push(`Purse: ${formatMoney(purse)}.`);
        audio.play('win');
      } else {
        lines.push(`${foeDef.name} takes the match. You will feel that tomorrow.`);
        audio.play('lose');
      }
      lines.push(`Respect ${after.respect >= 0 ? '+' : ''}${after.respect}, friendship ${after.score >= 0 ? '+' : ''}${after.score}.`);
      lines.push(
        `Stat experience: ${Object.entries(xp)
          .map(([k, v]) => `${k} +${v}`)
          .join(', ')}.`,
      );

      store.adjustNeed({ energy: -22, mood: won ? 12 : -10, health: won ? -6 : -16 });
      store.patch((s) => {
        s.counters = {
          ...s.counters,
          fights: s.counters.fights + 1,
          fightWins: s.counters.fightWins + (won ? 1 : 0),
          fightLosses: s.counters.fightLosses + (won ? 0 : 1),
        };
        const npc = s.npcs[foeId];
        if (npc) {
          s.npcs = { ...s.npcs, [foeId]: { ...npc, losses: npc.losses + (won ? 1 : 0), wins: npc.wins + (won ? 0 : 1) } };
        }
      });

      // Quests that ask you to beat a specific person read this counter.
      if (won) {
        const key = `fightwin:${foeId}`;
        store.setFlag(key, (useGameStore.getState().state?.flags[key] ?? 0) + 1);
      }
    }

    store.advanceTime(35, 1.4);
    getGame()?.endCombat();
    ui.showResult({
      title: fled ? 'You disengaged' : won ? 'You win' : 'You lose',
      lines,
      tone: fled ? 'info' : won ? 'good' : 'bad',
    });
  };

  const c = combatRef.current;
  if (!c || !state || !foeId) return null;

  const act = (action: CombatAction) => {
    if (action === 'block') {
      c.player.blocking = !c.player.blocking;
      if (!c.player.blocking) releaseBlock(c, 'player');
      audio.play('ui');
      return;
    }
    if (commitAction(c, 'player', action)) {
      audio.play(action === 'heavy' ? 'heavy' : action === 'dodge' ? 'dodge' : 'ui');
    } else {
      audio.play('error');
    }
  };

  const bar = (f: typeof c.player, right = false) => (
    <div className={`fighter-panel ${right ? 'right' : ''}`}>
      <div className="row spread">
        <strong>{f.name}</strong>
        <span className="mono tiny muted">
          {Math.ceil(f.hp)}/{f.maxHp}
        </span>
      </div>
      <Bar value={f.hp} max={f.maxHp} color={f.hp / f.maxHp < 0.3 ? 'var(--danger)' : f.color} thick />
      <div style={{ marginTop: '0.32rem' }}>
        <Bar value={f.stamina} max={f.maxStamina} color="var(--teal)" />
      </div>
      <div className="tiny muted" style={{ marginTop: '0.22rem' }}>
        {f.blocking ? 'Guarding' : f.action === 'down' ? 'Down' : f.action === 'stagger' ? 'Staggered' : f.action}
      </div>
    </div>
  );

  const actionBtn = (action: CombatAction, label: string, key: string) => (
    <button
      className={`btn ${action === 'block' && c.player.blocking ? 'primary' : ''}`}
      disabled={action !== 'block' && !canAct(c.player, action)}
      onClick={() => act(action)}
    >
      <span>{label}</span>
      <span className="cost">
        {ACTION_COST[action] ? `${ACTION_COST[action]} stam` : 'hold'} · {key}
      </span>
    </button>
  );

  return (
    <div className="combat-hud">
      <div className="fighter-bars">
        {bar(c.player)}
        <div style={{ textAlign: 'center', paddingTop: '0.4rem' }}>
          <div className="mono muted tiny">{c.t.toFixed(1)}s</div>
        </div>
        {bar(c.foe, true)}
      </div>

      {banner && <div className="combat-log">{banner}</div>}

      {floaters.map((f) => (
        <span key={f.id} className="floating-number" style={{ left: `${f.left}%`, top: `${f.top}%`, color: f.color }}>
          {f.text}
        </span>
      ))}

      <div className="combat-actions">
        {actionBtn('attack', 'Attack', 'J')}
        {actionBtn('heavy', 'Heavy', 'K')}
        {actionBtn('block', 'Block', 'L')}
        {actionBtn('dodge', 'Dodge', 'Space')}
        {actionBtn('retreat', 'Retreat', 'Esc')}
      </div>
    </div>
  );
}
