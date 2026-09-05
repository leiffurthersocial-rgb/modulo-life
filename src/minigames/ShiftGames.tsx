import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MinigameShell } from './shell';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { audio } from '@/game/audio/AudioManager';
import { getJob } from '@/data/jobs';
import { resolveShift, shiftAvailable, meetsRequirements } from '@/game/systems/jobs';
import { shiftScore } from '@/game/systems/minigames';
import { formatMoney } from '@/game/systems/economy';
import { STAT_LABELS } from '@/game/types';
import { clamp } from '@/game/systems/rng';
import { hourOf } from '@/game/systems/timeSystem';

const ROUNDS = 10;

type Variant = 'konbini' | 'cafe' | 'delivery' | 'office' | 'construction';

const VARIANT_FOR_JOB: Record<string, Variant> = {
  konbini_clerk: 'konbini',
  cafe_barista: 'cafe',
  delivery_rider: 'delivery',
  office_analyst: 'office',
  construction_hand: 'construction',
};

interface Round {
  prompt: string;
  detail: string;
  options: string[];
  answer: string;
  /** Seconds allowed for this round. */
  limit: number;
}

const KONBINI_ITEMS: Array<[string, string, string]> = [
  ['🍙', 'Onigiri', 'Food'],
  ['🍱', 'Bento', 'Food'],
  ['🥫', 'Canned coffee', 'Drink'],
  ['🧋', 'Milk tea', 'Drink'],
  ['📕', 'Magazine', 'Other'],
  ['🍫', 'Chocolate', 'Food'],
  ['☂️', 'Umbrella', 'Other'],
  ['🥤', 'Melon soda', 'Drink'],
  ['🔋', 'Batteries', 'Other'],
  ['🍞', 'Melon bread', 'Food'],
  ['🫧', 'Ramune', 'Drink'],
  ['🩹', 'Plasters', 'Other'],
];

const CAFE_TOKENS = ['☕', '🥛', '🍫', '🍵', '🧊'];
const DIRECTIONS = ['↑ North', '→ East', '↓ South', '← West'];

function makeRound(variant: Variant, index: number): Round {
  // Rounds tighten up as the shift goes on.
  const limit = clamp(3.4 - index * 0.18, 1.5, 3.4);
  switch (variant) {
    case 'konbini': {
      const [icon, name, category] = KONBINI_ITEMS[Math.floor(Math.random() * KONBINI_ITEMS.length)];
      return { prompt: `${icon} ${name}`, detail: 'Which shelf does it ring up under?', options: ['Food', 'Drink', 'Other'], answer: category, limit };
    }
    case 'cafe': {
      const order = Array.from({ length: 2 + (index > 5 ? 1 : 0) }, () => CAFE_TOKENS[Math.floor(Math.random() * CAFE_TOKENS.length)]);
      return { prompt: order.join(' '), detail: 'Press the ingredients in order.', options: CAFE_TOKENS, answer: order.join(''), limit: limit + 1.2 };
    }
    case 'delivery': {
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      return { prompt: dir, detail: 'Take the turning.', options: DIRECTIONS, answer: dir, limit };
    }
    case 'office': {
      const a = 10 + Math.floor(Math.random() * 90);
      const b = 10 + Math.floor(Math.random() * 90);
      const correct = Math.random() < 0.5;
      const shown = correct ? a + b : a + b + (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 9));
      return {
        prompt: `${a} + ${b} = ${shown}`,
        detail: 'Does the ledger balance?',
        options: ['Balanced', 'Wrong'],
        answer: correct ? 'Balanced' : 'Wrong',
        limit: limit + 0.6,
      };
    }
    case 'construction': {
      return { prompt: 'Lift', detail: 'Release inside the band.', options: [], answer: '', limit: 2.6 };
    }
  }
}

export function ShiftGame({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const store = useGameStore();
  const ui = useUiStore();
  const state = useGameStore((s) => s.state);
  const job = getJob(jobId);
  const variant = VARIANT_FOR_JOB[jobId] ?? 'konbini';

  const [phase, setPhase] = useState<'brief' | 'play' | 'done'>('brief');
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sequence, setSequence] = useState('');
  const [needle, setNeedle] = useState(0);
  const dirRef = useRef(1);
  const [feedback, setFeedback] = useState('');

  const availability = useMemo(
    () => (state && job ? shiftAvailable(jobId, hourOf(state.time), state.shiftsToday) : { ok: false, reason: 'No such job' }),
    [state, job, jobId],
  );
  const requirements = useMemo(
    () => (state && job ? meetsRequirements(job, state.stats) : { ok: true, missing: [] }),
    [state, job],
  );

  const nextRound = useCallback(
    (i: number) => {
      if (i >= ROUNDS) {
        setPhase('done');
        return;
      }
      const r = makeRound(variant, i);
      setRound(r);
      setTimeLeft(r.limit);
      setSequence('');
      setNeedle(0);
      dirRef.current = 1;
      setIndex(i);
    },
    [variant],
  );

  // Round timer / construction needle.
  useEffect(() => {
    if (phase !== 'play' || !round) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = (now - last) / 1000;
      last = now;
      if (variant === 'construction') {
        setNeedle((n) => {
          let next = n + dirRef.current * 88 * dt;
          if (next >= 100) {
            next = 100;
            dirRef.current = -1;
          } else if (next <= 0) {
            next = 0;
            dirRef.current = 1;
          }
          return next;
        });
      }
      setTimeLeft((t) => {
        const next = t - dt;
        if (next <= 0) {
          cancelAnimationFrame(raf);
          setMistakes((m) => m + 1);
          setFeedback('Too slow.');
          audio.play('error');
          nextRound(index + 1);
          return 0;
        }
        return next;
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, round, index, nextRound, variant]);

  // Wrap up the shift once every round is played.
  useEffect(() => {
    if (phase !== 'done' || !state || !job) return;
    const score = shiftScore(correct, ROUNDS, mistakes);
    const outcome = resolveShift(jobId, state.stats, score, state.needs.energy);
    if (!outcome) return;

    store.addMoney(outcome.pay + outcome.bonus, 'Shift pay');
    store.grantStatXp(outcome.statXp);
    store.advanceTime(outcome.hours * 60, 1.2);
    store.adjustNeed({ energy: -outcome.energyCost, hunger: -outcome.hours * 4, mood: score > 0.6 ? 4 : -6 });
    store.patch((s) => {
      s.shiftsToday += 1;
      s.lastShiftDay = s.time.day;
      s.counters = { ...s.counters, shiftsWorked: s.counters.shiftsWorked + 1 };
      if (!s.jobsUnlocked.includes(jobId)) s.jobsUnlocked = [...s.jobsUnlocked, jobId];
      s.jobId = jobId;
    });
    store.recordMinigame(`shift-${variant}`, score > 0.5, Math.round(score * 100));
    store.discoverActivity(job.name);
    audio.play(score > 0.6 ? 'win' : 'lose');

    ui.showResult({
      title: `${job.name} — shift over`,
      lines: [
        outcome.summary,
        `${correct} of ${ROUNDS} handled well, ${mistakes} slip-ups.`,
        `Performance ${Math.round(outcome.performance * 100)}%.`,
        `Pay ${formatMoney(outcome.pay)}${outcome.bonus ? ` plus a ${formatMoney(outcome.bonus)} bonus` : ''}.`,
        `Stat experience: ${Object.entries(outcome.statXp)
          .map(([k, v]) => `${k} +${v}`)
          .join(', ')}.`,
      ],
      tone: score > 0.5 ? 'good' : 'info',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!state || !job) return null;

  const answer = (choice: string) => {
    if (!round || phase !== 'play') return;
    if (variant === 'cafe') {
      const next = sequence + choice;
      if (!round.answer.startsWith(next)) {
        setMistakes((m) => m + 1);
        setFeedback('Wrong order — start again.');
        audio.play('error');
        nextRound(index + 1);
        return;
      }
      setSequence(next);
      audio.play('blip');
      if (next === round.answer) {
        setCorrect((c) => c + 1);
        setFeedback('Order up.');
        audio.play('confirm');
        nextRound(index + 1);
      }
      return;
    }

    if (choice === round.answer) {
      setCorrect((c) => c + 1);
      setFeedback('Good.');
      audio.play('confirm');
    } else {
      setMistakes((m) => m + 1);
      setFeedback('Not quite.');
      audio.play('error');
    }
    nextRound(index + 1);
  };

  const lift = () => {
    if (phase !== 'play') return;
    const inZone = needle >= 42 && needle <= 62;
    if (inZone) {
      setCorrect((c) => c + 1);
      setFeedback('Clean lift.');
      audio.play('heavy');
    } else {
      setMistakes((m) => m + 1);
      setFeedback('Bad form.');
      audio.play('error');
    }
    nextRound(index + 1);
  };

  const blocked = !availability.ok || !requirements.ok;

  return (
    <MinigameShell
      title={job.name}
      icon="💼"
      help={
        phase === 'brief'
          ? `${job.description} Your ${Object.keys(job.performanceStats)
              .map((k) => STAT_LABELS[k as keyof typeof STAT_LABELS])
              .join(', ')} decide how far a good run carries you.`
          : undefined
      }
      onClose={onClose}
      footer={
        phase === 'brief' ? (
          <button
            className="btn primary"
            disabled={blocked}
            onClick={() => {
              setPhase('play');
              setCorrect(0);
              setMistakes(0);
              nextRound(0);
              audio.play('confirm');
            }}
          >
            Clock in
          </button>
        ) : phase === 'play' && variant === 'construction' ? (
          <button className="btn primary" onClick={lift}>
            Lift
          </button>
        ) : undefined
      }
    >
      {phase === 'brief' && (
        <>
          <dl className="kv" style={{ marginBottom: '0.9rem' }}>
            <dt>Base pay</dt>
            <dd>{formatMoney(job.basePay)}</dd>
            <dt>Length</dt>
            <dd>{job.hours} hours</dd>
            <dt>Energy cost</dt>
            <dd>{job.energyCost}</dd>
            <dt>Shifts today</dt>
            <dd>{state.shiftsToday}/2</dd>
          </dl>
          {!availability.ok && <div className="callout bad">{availability.reason}</div>}
          {!requirements.ok && (
            <div className="callout bad">
              They will not take you on yet. You need{' '}
              {requirements.missing.map((m) => `${STAT_LABELS[m]} ${job.requirements?.[m]}`).join(' and ')}.
            </div>
          )}
          {state.needs.energy < 25 && (
            <div className="callout warn">You are running on empty. Expect the shift to go badly.</div>
          )}
        </>
      )}

      {phase !== 'brief' && (
        <>
          <div className="row spread" style={{ marginBottom: '0.6rem' }}>
            <span className="chip">
              Round {Math.min(index + 1, ROUNDS)}/{ROUNDS}
            </span>
            <span className="chip">Good {correct}</span>
            <span className="chip">Slips {mistakes}</span>
          </div>

          <div className="mg-stage" style={{ flexDirection: 'column', gap: '0.8rem', padding: '1.2rem' }}>
            {round && (
              <>
                <span className="mg-big" style={{ fontSize: variant === 'cafe' ? '2.6rem' : '1.9rem' }}>
                  {round.prompt}
                </span>
                <span className="muted tiny">{round.detail}</span>
                {variant === 'construction' && (
                  <div className="meter" style={{ width: '80%' }}>
                    <span className="zone" style={{ left: '42%', width: '20%' }} />
                    <span className="needle" style={{ left: `${needle}%` }} />
                  </div>
                )}
                <div className="bar" style={{ width: '80%' }}>
                  <span
                    style={{
                      width: `${(timeLeft / round.limit) * 100}%`,
                      background: timeLeft < round.limit * 0.3 ? 'var(--danger)' : 'var(--teal)',
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {round && variant !== 'construction' && (
            <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', marginTop: '0.8rem' }}>
              {round.options.map((o) => (
                <button key={o} className="btn" onClick={() => answer(o)}>
                  {o}
                </button>
              ))}
            </div>
          )}

          {feedback && (
            <p className="muted tiny" style={{ textAlign: 'center', marginBottom: 0 }}>
              {feedback}
            </p>
          )}
        </>
      )}
    </MinigameShell>
  );
}
