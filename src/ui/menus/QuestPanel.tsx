import { getCharacter } from '@/data/characters';
import { QUESTS } from '@/data/quests';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Panel } from '../common/widgets';
import { computeProgress, objectiveText, questProgress, questUnlocked } from '@/game/systems/questSystem';
import { formatMoney } from '@/game/systems/economy';

export default function QuestPanel() {
  const state = useGameStore((s) => s.state);
  const close = useUiStore((s) => s.closePanel);
  if (!state) return null;

  const active = QUESTS.filter((q) => questProgress(state, q.id).status === 'active');
  const done = QUESTS.filter((q) => questProgress(state, q.id).status === 'complete');
  const known = QUESTS.filter(
    (q) => questProgress(state, q.id).status === 'available' && questUnlocked(state, q),
  );

  return (
    <div className="overlay">
      <Panel title="Tasks" icon="📋" onClose={close}>
        <div className="section-title">In progress</div>
        {active.length === 0 ? (
          <p className="muted">Nothing on. Talk to people — most tasks start as a favour.</p>
        ) : (
          <div className="scroll-list">
            {active.map((q) => (
              <div key={q.id} className="callout">
                <div className="row spread">
                  <strong>{q.title}</strong>
                  <span className="chip">{getCharacter(q.giver).name}</span>
                </div>
                <div style={{ marginTop: '0.35rem' }}>{objectiveText(q, computeProgress(state, q))}</div>
                <div className="muted tiny" style={{ marginTop: '0.3rem' }}>
                  {q.summary}
                </div>
                <div className="muted tiny" style={{ marginTop: '0.3rem' }}>
                  Reward: {q.rewards.money ? formatMoney(q.rewards.money) : ''}
                  {q.rewards.relationship ? ` · +${q.rewards.relationship} friendship` : ''}
                  {q.rewards.items?.length ? ` · ${q.rewards.items.map((i) => i.itemId.replace(/_/g, ' ')).join(', ')}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        {known.length > 0 && (
          <>
            <div className="section-title">Available if you ask</div>
            <div className="scroll-list">
              {known.map((q) => (
                <div key={q.id} className="callout warn">
                  <div className="row spread">
                    <strong>{q.title}</strong>
                    <span className="chip">{getCharacter(q.giver).name}</span>
                  </div>
                  <div className="muted tiny" style={{ marginTop: '0.3rem' }}>
                    {q.summary}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="section-title">Finished</div>
        {done.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <div className="trait-list">
            {done.map((q) => (
              <span key={q.id} className="chip">
                ✅ {q.title}
              </span>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
