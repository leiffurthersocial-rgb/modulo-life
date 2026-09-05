import { getCharacter } from '@/data/characters';
import { getJob } from '@/data/jobs';
import { requireLocation } from '@/data/locations';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Bar, Panel } from '../common/widgets';
import { STAT_KEYS, STAT_LABELS } from '@/game/types';
import { formatMoney } from '@/game/systems/economy';
import { effectiveStats } from '@/game/systems/stats';
import { maxHpFor, maxStaminaFor } from '@/game/systems/combat';
import { band } from '@/game/systems/needs';
import { dateLabel } from '@/game/systems/timeSystem';

export default function CharacterPanel() {
  const state = useGameStore((s) => s.state);
  const close = useUiStore((s) => s.closePanel);
  if (!state) return null;

  const me = getCharacter(state.playerId);
  const effective = effectiveStats(state.stats, state.needs);
  const job = state.jobId ? getJob(state.jobId) : null;

  return (
    <div className="overlay">
      <Panel title={me.name} icon="🧍" onClose={close}>
        <div className="grid-2">
          <div>
            <div className="row" style={{ gap: '0.8rem', marginBottom: '0.8rem' }}>
              <span
                className="avatar"
                style={{ background: me.themeColor, width: '3.2em', height: '3.2em', fontSize: '1.2em' }}
                aria-hidden
              >
                {me.name.charAt(0)}
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.1em' }}>{me.name}</div>
                <div className="muted tiny">{me.tagline}</div>
              </div>
            </div>

            <div className="trait-list" style={{ marginBottom: '0.8rem' }}>
              {me.personality.traits.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>

            <dl className="kv">
              <dt>Money</dt>
              <dd>{formatMoney(state.money)}</dd>
              <dt>Home</dt>
              <dd>{requireLocation(me.home).name}</dd>
              <dt>Job</dt>
              <dd>{job ? job.name : 'Between jobs'}</dd>
              <dt>Today</dt>
              <dd>{dateLabel(state.time)}</dd>
              <dt>Shifts today</dt>
              <dd>{state.shiftsToday}/2</dd>
              <dt>Fight health</dt>
              <dd>{maxHpFor(state.stats)}</dd>
              <dt>Fight stamina</dt>
              <dd>{maxStaminaFor(state.stats)}</dd>
            </dl>

            <div className="section-title">Condition</div>
            <div className="needs">
              {(
                [
                  ['⚡', 'Energy', state.needs.energy],
                  ['🍙', 'Hunger', state.needs.hunger],
                  ['🙂', 'Mood', state.needs.mood],
                  ['❤️', 'Health', state.needs.health],
                ] as const
              ).map(([icon, label, value]) => (
                <div className="need" key={label} style={{ gridTemplateColumns: '1.4em 1fr auto' }}>
                  <span aria-hidden title={label}>
                    {icon}
                  </span>
                  <Bar
                    value={value}
                    color={
                      band(value) === 'critical'
                        ? 'var(--danger)'
                        : band(value) === 'low'
                          ? 'var(--gold)'
                          : band(value) === 'ok'
                            ? 'var(--blue)'
                            : 'var(--good)'
                    }
                  />
                  <span className="mono muted tiny">{Math.round(value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="section-title">Stats</div>
            <p className="muted tiny" style={{ marginTop: 0 }}>
              The lighter number is what you can actually bring to bear right now — being tired or hungry costs
              you real performance.
            </p>
            <div className="stat-rows">
              {STAT_KEYS.map((k) => {
                const base = state.stats[k];
                const now = effective[k];
                const grown = base - me.baseStats[k];
                return (
                  <div key={k} className="stat-row" style={{ gridTemplateColumns: '7.4em 1fr 4.6em' }}>
                    <span>{STAT_LABELS[k]}</span>
                    <Bar value={now} color={me.themeColor} />
                    <span className="value">
                      {now}
                      <span className="muted">/{base}</span>
                      {grown > 0 && <span style={{ color: 'var(--good)' }}> +{grown}</span>}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="section-title">Record</div>
            <dl className="kv">
              <dt>Days lived</dt>
              <dd>{state.counters.daysPlayed}</dd>
              <dt>Earned</dt>
              <dd>{formatMoney(state.counters.earned)}</dd>
              <dt>Spent</dt>
              <dd>{formatMoney(state.counters.spent)}</dd>
              <dt>Shifts worked</dt>
              <dd>{state.counters.shiftsWorked}</dd>
              <dt>Fights</dt>
              <dd>
                {state.counters.fightWins}W / {state.counters.fightLosses}L
              </dd>
              <dt>Conversations</dt>
              <dd>{state.counters.conversations}</dd>
              <dt>Fish caught</dt>
              <dd>{state.counters.fishCaught}</dd>
              <dt>Study sessions</dt>
              <dd>{state.counters.studySessions}</dd>
            </dl>
          </div>
        </div>
      </Panel>
    </div>
  );
}
