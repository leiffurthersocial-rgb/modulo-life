import { useCallback, useEffect, useRef, useState } from 'react';
import { MinigameShell } from './shell';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { audio } from '@/game/audio/AudioManager';
import { formatMoney } from '@/game/systems/economy';
import { getItem } from '@/data/items';
import {
  arcadeReward,
  pickFish,
  reelWindow,
  runningReward,
  strengthReward,
  type ScoreReward,
} from '@/game/systems/minigames';
import { clamp } from '@/game/systems/rng';

function useSkillGame(id: string) {
  const store = useGameStore();
  const ui = useUiStore();

  const award = useCallback(
    (reward: ScoreReward, title: string, extra: string[] = []) => {
      store.recordMinigame(id, reward.won, Math.round(reward.money));
      if (reward.money > 0) store.addMoney(reward.money, 'Prize');
      store.grantStatXp(reward.statXp);
      store.advanceTime(20, 1.3);
      store.adjustNeed({ energy: -8, mood: reward.won ? 8 : -2 });
      audio.play(reward.won ? 'win' : 'lose');
      ui.showResult({
        title,
        lines: [
          `Grade ${reward.grade}.`,
          ...extra,
          reward.money > 0 ? `Prize: ${formatMoney(reward.money)}.` : 'No prize this time.',
          `Stat experience: ${Object.entries(reward.statXp)
            .map(([k, v]) => `${k} +${v}`)
            .join(', ')}.`,
        ],
        tone: reward.won ? 'good' : 'info',
      });
    },
    [id, store, ui],
  );

  return award;
}

/* ------------------------------------------------------------- arcade */

interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  born: number;
  life: number;
}

export function ArcadeGame({ onClose }: { onClose: () => void }) {
  const award = useSkillGame('arcade');
  const speedStat = useGameStore((s) => s.state?.stats.speed ?? 50);
  const [running, setRunning] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const nextId = useRef(0);
  const spawnRef = useRef(0);

  const TOTAL = 30;
  const lifetime = clamp(1.5 - speedStat / 260, 0.62, 1.5);

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = (now - last) / 1000;
      last = now;

      setTimeLeft((t) => {
        const next = t - dt;
        if (next <= 0) {
          setRunning(false);
          return 0;
        }
        return next;
      });

      spawnRef.current -= dt;
      if (spawnRef.current <= 0) {
        spawnRef.current = 0.62;
        setTargets((ts) => [
          ...ts,
          {
            id: ++nextId.current,
            x: 8 + Math.random() * 80,
            y: 10 + Math.random() * 72,
            size: 34 + Math.random() * 22,
            born: now,
            life: lifetime * 1000,
          },
        ]);
      }

      setTargets((ts) => {
        const alive = ts.filter((t) => now - t.born < t.life);
        if (alive.length !== ts.length) setMisses((m) => m + (ts.length - alive.length));
        return alive;
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, lifetime]);

  useEffect(() => {
    if (running || timeLeft > 0 || hits + misses === 0) return;
    const score = clamp(hits / Math.max(1, hits + misses) - misses * 0.01, 0, 1);
    award(arcadeReward(score), 'Reflex Rush', [`${hits} hits, ${misses} missed.`]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const start = () => {
    setHits(0);
    setMisses(0);
    setTargets([]);
    setTimeLeft(TOTAL);
    spawnRef.current = 0;
    setRunning(true);
    audio.play('confirm');
  };

  return (
    <MinigameShell
      title="Reflex Rush"
      icon="🕹️"
      help="Tap every target before it fades. A higher Speed stat keeps them on screen longer. Thirty seconds."
      onClose={onClose}
      footer={
        !running && (
          <button className="btn primary" onClick={start}>
            {hits + misses > 0 ? 'Play again' : 'Start'}
          </button>
        )
      }
    >
      <div className="row spread" style={{ marginBottom: '0.6rem' }}>
        <span className="chip">Hits {hits}</span>
        <span className="chip">Missed {misses}</span>
        <span className="chip mono">{timeLeft.toFixed(1)}s</span>
      </div>
      <div className="mg-stage" style={{ minHeight: 280 }}>
        {!running && hits + misses === 0 && <span className="muted">Press start.</span>}
        {targets.map((t) => (
          <button
            key={t.id}
            className="target-dot"
            style={{ left: `${t.x}%`, top: `${t.y}%`, width: t.size, height: t.size }}
            onPointerDown={() => {
              setTargets((ts) => ts.filter((x) => x.id !== t.id));
              setHits((h) => h + 1);
              audio.play('blip');
            }}
            aria-label="Target"
          />
        ))}
      </div>
    </MinigameShell>
  );
}

/* ------------------------------------------------------------- running */

export function RunningGame({ onClose }: { onClose: () => void }) {
  const award = useSkillGame('running');
  const stats = useGameStore((s) => s.state?.stats);
  const [pos, setPos] = useState(0);
  const [gate, setGate] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [running, setRunning] = useState(false);
  const GATES = 12;

  const speed = 24 + (stats?.speed ?? 50) * 0.22;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = (now - last) / 1000;
      last = now;
      setPos((p) => {
        const next = p + speed * dt;
        if (next >= 100) {
          setRunning(false);
          return 100;
        }
        return next;
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, speed]);

  useEffect(() => {
    const gatePos = ((gate + 1) / (GATES + 1)) * 100;
    if (pos > gatePos + 6 && gate < GATES) {
      setMisses((m) => m + 1);
      setGate((g) => g + 1);
      audio.play('error');
    }
  }, [pos, gate]);

  useEffect(() => {
    if (running || hits + misses === 0 || pos < 100) return;
    const score = clamp(hits / GATES, 0, 1);
    award(runningReward(score), 'Park Loop', [`${hits} of ${GATES} checkpoints hit cleanly.`]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const tap = () => {
    if (!running || gate >= GATES) return;
    const gatePos = ((gate + 1) / (GATES + 1)) * 100;
    if (Math.abs(pos - gatePos) < 6) {
      setHits((h) => h + 1);
      audio.play('stepRun');
    } else {
      setMisses((m) => m + 1);
      audio.play('error');
    }
    setGate((g) => g + 1);
  };

  const start = () => {
    setPos(0);
    setGate(0);
    setHits(0);
    setMisses(0);
    setRunning(true);
    audio.play('confirm');
  };

  return (
    <MinigameShell
      title="Park Loop"
      icon="🏃"
      help="Tap as you reach each checkpoint. A higher Speed stat makes the run faster, which means less time to react — the trade-off is the point."
      onClose={onClose}
      footer={
        running ? (
          <button className="btn primary" onClick={tap}>
            Checkpoint (Space)
          </button>
        ) : (
          <button className="btn primary" onClick={start}>
            {hits + misses > 0 ? 'Run again' : 'Start running'}
          </button>
        )
      }
    >
      <div className="row spread" style={{ marginBottom: '0.6rem' }}>
        <span className="chip">Clean {hits}</span>
        <span className="chip">Missed {misses}</span>
        <span className="chip mono">{Math.round(pos)}%</span>
      </div>
      <div className="track" onPointerDown={tap} role="presentation">
        {Array.from({ length: GATES }, (_, i) => (
          <span
            key={i}
            className="gate"
            style={{ left: `${((i + 1) / (GATES + 1)) * 100}%`, opacity: i < gate ? 0.25 : 0.8 }}
          />
        ))}
        <span className="runner" style={{ left: `calc(${pos}% - 12px)` }}>
          🏃
        </span>
      </div>
      <p className="muted tiny" style={{ textAlign: 'center' }}>
        Tap the track or the button as the runner crosses each marker.
      </p>
    </MinigameShell>
  );
}

/* ------------------------------------------------------------ strength */

export function StrengthGame({ onClose }: { onClose: () => void }) {
  const award = useSkillGame('strength');
  const strength = useGameStore((s) => s.state?.stats.strength ?? 50);
  const [needle, setNeedle] = useState(0);
  const [dir, setDir] = useState(1);
  const [running, setRunning] = useState(false);
  const [attempts, setAttempts] = useState<number[]>([]);

  const zoneStart = clamp(58 + strength * 0.12, 55, 78);
  const zoneWidth = clamp(20 - strength * 0.06, 9, 20);
  const speed = 78 + strength * 0.25;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = (now - last) / 1000;
      last = now;
      setNeedle((n) => {
        let next = n + dir * speed * dt;
        if (next >= 100) {
          next = 100;
          setDir(-1);
        } else if (next <= 0) {
          next = 0;
          setDir(1);
        }
        return next;
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, dir, speed]);

  const strike = () => {
    if (!running) return;
    const inZone = needle >= zoneStart && needle <= zoneStart + zoneWidth;
    const quality = inZone ? 1 : clamp(1 - Math.abs(needle - (zoneStart + zoneWidth / 2)) / 60, 0, 0.7);
    const next = [...attempts, quality];
    setAttempts(next);
    audio.play(inZone ? 'heavy' : 'error');
    if (next.length >= 3) {
      setRunning(false);
      const score = next.reduce((a, b) => a + b, 0) / next.length;
      award(strengthReward(score), 'Power Meter', [`Three lifts averaging ${Math.round(score * 100)}%.`]);
    }
  };

  const start = () => {
    setAttempts([]);
    setNeedle(0);
    setDir(1);
    setRunning(true);
    audio.play('confirm');
  };

  return (
    <MinigameShell
      title="Power Meter"
      icon="💪"
      help="Stop the needle inside the bright band, three times. A higher Strength stat widens the band but speeds the needle up."
      onClose={onClose}
      footer={
        running ? (
          <button className="btn primary" onClick={strike}>
            Lift ({3 - attempts.length} left)
          </button>
        ) : (
          <button className="btn primary" onClick={start}>
            {attempts.length ? 'Try again' : 'Step up'}
          </button>
        )
      }
    >
      <div className="mg-stage" style={{ padding: '1.4rem' }}>
        <div style={{ width: '100%' }}>
          <div className="meter">
            <span className="zone" style={{ left: `${zoneStart}%`, width: `${zoneWidth}%` }} />
            <span className="needle" style={{ left: `${needle}%` }} />
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: '0.9rem', gap: '0.4rem' }}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="chip">
                {attempts[i] === undefined ? '—' : `${Math.round(attempts[i] * 100)}%`}
              </span>
            ))}
          </div>
        </div>
      </div>
    </MinigameShell>
  );
}

/* -------------------------------------------------------------- fishing */

type FishPhase = 'idle' | 'waiting' | 'bite' | 'reeling' | 'done';

export function FishingGame({ spot, onClose }: { spot: string; onClose: () => void }) {
  const store = useGameStore();
  const ui = useUiStore();
  const state = useGameStore((s) => s.state);
  const [phase, setPhase] = useState<FishPhase>('idle');
  const [message, setMessage] = useState('Cast the line and wait for the float to dip.');
  const [cursor, setCursor] = useState(0);
  const [safeZone, setSafeZone] = useState({ start: 40, width: 20 });
  const timers = useRef<number[]>([]);
  const fishRef = useRef<ReturnType<typeof pickFish> | null>(null);
  const deadline = useRef(0);

  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
    },
    [],
  );

  useEffect(() => {
    if (phase !== 'reeling') return;
    let raf = 0;
    let last = performance.now();
    let dir = 1;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = (now - last) / 1000;
      last = now;
      setCursor((c) => {
        let next = c + dir * 95 * dt;
        if (next > 100) {
          next = 100;
          dir = -1;
        } else if (next < 0) {
          next = 0;
          dir = 1;
        }
        return next;
      });
      if (now > deadline.current) {
        cancelAnimationFrame(raf);
        fail('The line goes slack. Whatever it was, it is gone.');
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!state) return null;
  const hasBait = state.inventory.some((s) => s.itemId === 'fishing_bait');

  const fail = (text: string) => {
    setPhase('done');
    setMessage(text);
    store.advanceTime(15, 0.9);
    audio.play('lose');
  };

  const cast = () => {
    const baited = hasBait;
    if (baited) store.take('fishing_bait', 1);
    fishRef.current = pickFish(spot, state.stats.luck, baited, Math.random);
    setPhase('waiting');
    setMessage(baited ? 'Baited and cast. Now wait.' : 'Cast. No bait, so this could be a while.');
    audio.play('splash');

    const wait = 1200 + Math.random() * (baited ? 3200 : 5200);
    timers.current.push(
      window.setTimeout(() => {
        setPhase('bite');
        setMessage('The float dips — strike!');
        audio.play('blip');
        timers.current.push(
          window.setTimeout(() => {
            setPhase((p) => {
              if (p === 'bite') {
                fail('Too slow. The float bobs back up, empty.');
                return 'done';
              }
              return p;
            });
          }, 1100),
        );
      }, wait),
    );
  };

  const strike = () => {
    if (phase !== 'bite') {
      if (phase === 'waiting') fail('You yank at nothing. The fish scatter.');
      return;
    }
    const fish = fishRef.current;
    if (!fish) return;
    const window_ = reelWindow(fish.difficulty, state.stats);
    const width = clamp(34 - fish.difficulty * 22 + state.stats.discipline * 0.06, 8, 34);
    setSafeZone({ start: 50 - width / 2 + (Math.random() - 0.5) * 24, width });
    deadline.current = performance.now() + window_ * 1000 + 1400;
    setPhase('reeling');
    setMessage('Keep the tension — land the marker in the band.');
    audio.play('reel');
  };

  const hook = () => {
    if (phase !== 'reeling') return;
    const fish = fishRef.current;
    if (!fish) return;
    const inZone = cursor >= safeZone.start && cursor <= safeZone.start + safeZone.width;
    if (!inZone) {
      fail('The line snaps taut and then goes limp. Lost it.');
      return;
    }
    const def = getItem(fish.itemId);
    store.give(fish.itemId, 1);
    store.grantStatXp({ discipline: 8, luck: 5, intelligence: 3 });
    store.advanceTime(18, 0.9);
    store.adjustNeed({ mood: 6, energy: -5 });
    store.recordMinigame('fishing', true, Math.round((def?.sellValue ?? 0) / 10));
    store.patch((s) => {
      s.counters = { ...s.counters, fishCaught: s.counters.fishCaught + 1 };
    });
    store.discoverActivity('fishing');
    setPhase('done');
    setMessage(`Landed it — ${def?.name ?? fish.itemId}!`);
    audio.play('win');
    ui.toast(`Caught ${def?.name}`, 'good', def?.icon);
  };

  return (
    <MinigameShell
      title={spot === 'river' ? 'Kogawa Riverside' : 'Hinode Pond'}
      icon="🎣"
      help="Cast, wait for the bite, strike, then stop the marker inside the band. Bait shortens the wait and improves what you hook. Luck and Discipline both help."
      onClose={onClose}
      footer={
        phase === 'idle' || phase === 'done' ? (
          <button className="btn primary" onClick={cast}>
            {hasBait ? 'Cast with bait' : 'Cast'}
          </button>
        ) : phase === 'reeling' ? (
          <button className="btn primary" onClick={hook}>
            Land it
          </button>
        ) : (
          <button className="btn primary" onClick={strike}>
            Strike
          </button>
        )
      }
    >
      <div className="mg-stage" style={{ flexDirection: 'column', gap: '1rem', padding: '1.2rem' }}>
        <span className="mg-big">{phase === 'bite' ? '❗' : phase === 'reeling' ? '🐟' : '🎣'}</span>
        {phase === 'reeling' && (
          <div className="fish-bar">
            <span className="safe" style={{ left: `${safeZone.start}%`, width: `${safeZone.width}%` }} />
            <span className="cursor" style={{ left: `${cursor}%` }} />
          </div>
        )}
      </div>
      <p style={{ textAlign: 'center' }}>{message}</p>
      <p className="muted tiny" style={{ textAlign: 'center' }}>
        Bait in bag: {state.inventory.find((s) => s.itemId === 'fishing_bait')?.qty ?? 0}
      </p>
    </MinigameShell>
  );
}
