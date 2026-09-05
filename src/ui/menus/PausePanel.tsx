import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Panel } from '../common/widgets';
import { audio } from '@/game/audio/AudioManager';
import { dateLabel, formatClock } from '@/game/systems/timeSystem';
import { formatMoney } from '@/game/systems/economy';
import { getCharacter } from '@/data/characters';

export default function PausePanel() {
  const state = useGameStore((s) => s.state);
  const save = useGameStore((s) => s.save);
  const quit = useGameStore((s) => s.quit);
  const ui = useUiStore();

  if (!state) return null;
  const me = getCharacter(state.playerId);

  return (
    <div className="overlay">
      <Panel title="Paused" icon="⏸" width="narrow" onClose={() => ui.closePanel()}>
        <div className="callout" style={{ marginBottom: '1rem' }}>
          <strong>{me.name}</strong> · {dateLabel(state.time)} · {formatClock(state.time)}
          <br />
          <span className="muted">{formatMoney(state.money)} in hand</span>
        </div>

        <div className="col">
          <button className="btn primary block" onClick={() => ui.closePanel()}>
            Resume
          </button>
          <button
            className="btn block"
            onClick={() => {
              audio.play('confirm');
              save();
            }}
          >
            Save game
          </button>
          <button className="btn block" onClick={() => ui.openPanel('settings')}>
            Settings
          </button>
          <button className="btn block" onClick={() => ui.openPanel('activities')}>
            What can I do?
          </button>
          <button className="btn block" onClick={() => ui.openPanel('debug')}>
            Developer tools
          </button>
          <div className="divider" />
          <button
            className="btn danger block"
            onClick={() => {
              ui.askConfirm({
                title: 'Quit to main menu?',
                body: 'Your progress will be saved first.',
                confirmLabel: 'Save and quit',
                tone: 'bad',
                onConfirm: () => {
                  save();
                  quit();
                  ui.setScreen('menu');
                },
              });
            }}
          >
            Quit to menu
          </button>
        </div>
      </Panel>
    </div>
  );
}
