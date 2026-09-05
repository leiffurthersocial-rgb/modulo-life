import { useState } from 'react';
import { getCharacter } from '@/data/characters';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Panel } from '../common/widgets';
import { formatMoney } from '@/game/systems/economy';
import { getGame } from '../gameRef';
import { audio } from '@/game/audio/AudioManager';
import type { RandomEventChoice } from '@/data/events';
import { STAT_LABELS } from '@/game/types';

export default function EventPanel() {
  const event = useUiStore((s) => s.event);
  const npcId = useUiStore((s) => s.eventNpc);
  const close = useUiStore((s) => s.closePanel);
  const state = useGameStore((s) => s.state);
  const store = useGameStore();
  const [outcome, setOutcome] = useState<string | null>(null);

  if (!event || !state) return null;
  const npcName = npcId ? getCharacter(npcId).name : 'someone';
  const text = event.text.replace(/\{npc\}/g, npcName);

  const finish = () => {
    close();
    getGame()?.setPaused(false);
  };

  const choose = (choice: RandomEventChoice) => {
    let success = true;
    let money = choice.money ?? 0;
    let mood = choice.mood ?? 0;
    let resultText = choice.outcome;

    if (choice.check) {
      success = state.stats[choice.check.stat] >= choice.check.threshold;
      if (!success) {
        resultText = choice.check.failOutcome;
        money = choice.check.failMoney ?? 0;
        mood = choice.check.failMood ?? 0;
      }
    }

    if (money > 0) store.addMoney(money);
    else if (money < 0) store.spendMoney(Math.min(-money, state.money));

    store.adjustNeed({ mood, energy: choice.energy ?? 0 });
    if (success) {
      for (const item of choice.items ?? []) store.give(item.itemId, item.qty);
      if (choice.relationship && npcId) {
        store.relationship(npcId, { score: choice.relationship, ignoreDiminish: true, note: event.title });
      }
    }
    if (choice.check) store.grantStatXp({ [choice.check.stat]: success ? 6 : 3 });

    setOutcome(resultText.replace(/\{npc\}/g, npcName));
    audio.play(success ? 'confirm' : 'cancel');
  };

  return (
    <div className="overlay">
      <Panel
        title={event.title}
        icon="✨"
        width="narrow"
        footer={outcome ? <button className="btn primary" onClick={finish}>Carry on</button> : undefined}
      >
        <p style={{ marginTop: 0, lineHeight: 1.65 }}>{outcome ?? text}</p>

        {!outcome && (
          <div className="col" style={{ marginTop: '1rem' }}>
            {event.choices.map((c, i) => {
              const affordable = !c.money || c.money >= 0 || state.money >= -c.money;
              return (
                <button
                  key={i}
                  className="btn block"
                  disabled={!affordable}
                  onClick={() => choose(c)}
                  style={{ textAlign: 'left' }}
                >
                  {c.label}
                  {c.check && (
                    <span className="muted tiny">
                      {' '}
                      · {STAT_LABELS[c.check.stat]} {c.check.threshold}+ (you have {state.stats[c.check.stat]})
                    </span>
                  )}
                  {c.money !== undefined && c.money < 0 && (
                    <span className="muted tiny"> · {formatMoney(-c.money)}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
