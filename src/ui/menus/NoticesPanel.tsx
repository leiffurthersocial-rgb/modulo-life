import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Panel } from '../common/widgets';
import { JOBS } from '@/data/jobs';
import { QUESTS } from '@/data/quests';
import { getCharacter } from '@/data/characters';
import { formatMoney } from '@/game/systems/economy';
import { offerableQuests, questProgress } from '@/game/systems/questSystem';
import { LOCATIONS } from '@/data/locations';

export default function NoticesPanel() {
  const state = useGameStore((s) => s.state);
  const close = useUiStore((s) => s.closePanel);
  if (!state) return null;

  const rumoured = QUESTS.filter((q) => {
    const p = questProgress(state, q.id);
    return p.status === 'available' && offerableQuests(state, q.giver).some((o) => o.id === q.id);
  }).slice(0, 4);

  const best = Object.entries(state.minigames)
    .filter(([, r]) => r.plays > 0)
    .sort((a, b) => b[1].best - a[1].best)
    .slice(0, 6);

  return (
    <div className="overlay">
      <Panel title="Neighbourhood notice board" icon="📌" onClose={close}>
        <div className="section-title">Work available</div>
        <div className="grid-2">
          {JOBS.map((j) => (
            <div key={j.id} className="item-card" style={{ cursor: 'default' }}>
              <span className="icon" aria-hidden>
                💼
              </span>
              <span className="meta">
                <span className="title">
                  {j.name} <span className="price">{formatMoney(j.basePay)}</span>
                </span>
                <span className="desc">
                  {j.description} Shifts run {j.openHours[0]}:00–{j.openHours[1]}:00 at{' '}
                  {LOCATIONS.find((l) => l.id === j.location)?.name}.
                </span>
              </span>
            </div>
          ))}
        </div>

        {rumoured.length > 0 && (
          <>
            <div className="section-title">People looking for a hand</div>
            <div className="scroll-list">
              {rumoured.map((q) => (
                <div key={q.id} className="callout">
                  <strong>{getCharacter(q.giver).name}</strong> — {q.summary}
                  <div className="muted tiny" style={{ marginTop: '0.2rem' }}>
                    Go and talk to them about it.
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="section-title">Your best scores</div>
        {best.length === 0 ? (
          <p className="muted">Nothing recorded yet. The arcade is on Main Street.</p>
        ) : (
          <dl className="kv">
            {best.map(([id, rec]) => (
              <div key={id} style={{ display: 'contents' }}>
                <dt>{id.replace(/[-_]/g, ' ')}</dt>
                <dd>
                  {rec.best} · {rec.wins}/{rec.plays} won
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Panel>
    </div>
  );
}
