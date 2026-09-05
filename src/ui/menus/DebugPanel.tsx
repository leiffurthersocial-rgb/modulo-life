import { useState } from 'react';
import { CHARACTERS } from '@/data/characters';
import { LOCATIONS } from '@/data/locations';
import { ITEMS } from '@/data/items';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Panel } from '../common/widgets';
import { getGame } from '../gameRef';
import { STAT_KEYS, STAT_LABELS, type MinigameId, type Weather } from '@/game/types';
import { advanceMinutes } from '@/game/systems/timeSystem';

const MINIGAMES: MinigameId[] = [
  'dice',
  'highlow',
  'cards',
  'coinflip',
  'wheel',
  'arcade',
  'fishing',
  'running',
  'strength',
];

/**
 * Developer tools. Reachable from the pause menu, and deliberately labelled as
 * such so nobody mistakes it for a normal part of the game.
 */
export default function DebugPanel() {
  const state = useGameStore((s) => s.state);
  const store = useGameStore();
  const ui = useUiStore();
  const [stats, setStats] = useState(getGame()?.renderStats ?? { fps: 0, calls: 0, tris: 0 });

  if (!state) return null;

  return (
    <div className="overlay">
      <Panel title="Developer tools" icon="🛠️" onClose={() => ui.closePanel()} width="wide">
        <div className="callout warn" style={{ marginBottom: '1rem' }}>
          These shortcuts exist for testing. Using them will happily break the pacing of a normal playthrough.
        </div>

        <div className="section-title">Renderer</div>
        <dl className="kv" style={{ maxWidth: 320 }}>
          <dt>FPS</dt>
          <dd>{stats.fps.toFixed(0)}</dd>
          <dt>Draw calls</dt>
          <dd>{stats.calls}</dd>
          <dt>Triangles</dt>
          <dd>{stats.tris.toLocaleString('en-US')}</dd>
        </dl>
        <button className="btn small" onClick={() => setStats(getGame()?.renderStats ?? stats)}>
          Refresh
        </button>

        <div className="section-title">Money</div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {[1000, 10000, 100000].map((n) => (
            <button key={n} className="btn small" onClick={() => store.addMoney(n, 'Debug')}>
              +¥{n.toLocaleString('en-US')}
            </button>
          ))}
          <button className="btn small danger" onClick={() => store.patch((s) => void (s.money = 0))}>
            Zero it
          </button>
        </div>

        <div className="section-title">Time and weather</div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {[1, 3, 6].map((h) => (
            <button key={h} className="btn small" onClick={() => store.advanceTime(h * 60)}>
              +{h}h
            </button>
          ))}
          <button
            className="btn small"
            onClick={() => store.patch((s) => void (s.time = advanceMinutes(s.time, 1440 - s.time.minutes + 420)))}
          >
            Next morning
          </button>
          {(['sunny', 'cloudy', 'rain', 'petals'] as Weather[]).map((w) => (
            <button key={w} className="btn small" onClick={() => store.setWeather(w)}>
              {w}
            </button>
          ))}
        </div>

        <div className="section-title">Needs</div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn small" onClick={() => store.adjustNeed({ energy: 100, hunger: 100, mood: 100, health: 100 })}>
            Restore all
          </button>
          <button className="btn small" onClick={() => store.adjustNeed({ energy: -60, hunger: -60, mood: -60 })}>
            Drain
          </button>
        </div>

        <div className="section-title">Stats</div>
        <div className="debug-grid">
          {STAT_KEYS.map((k) => (
            <button key={k} className="btn small" onClick={() => store.grantStatXp({ [k]: 400 })}>
              +{STAT_LABELS[k]}
            </button>
          ))}
        </div>

        <div className="section-title">Relationships</div>
        <div className="debug-grid">
          {CHARACTERS.filter((c) => c.id !== state.playerId).map((c) => (
            <div key={c.id} className="row" style={{ gap: '0.3rem' }}>
              <span className="tiny grow">{c.name}</span>
              <button className="btn small" onClick={() => store.relationship(c.id, { score: 25, ignoreDiminish: true })}>
                +25
              </button>
              <button className="btn small" onClick={() => store.relationship(c.id, { score: -25, ignoreDiminish: true })}>
                −25
              </button>
            </div>
          ))}
        </div>

        <div className="section-title">Teleport</div>
        <div className="debug-grid">
          {LOCATIONS.map((l) => (
            <button
              key={l.id}
              className="btn small"
              onClick={() => {
                ui.closePanel();
                getGame()?.teleportTo(l.id);
              }}
            >
              {l.mapIcon} {l.name}
            </button>
          ))}
        </div>

        <div className="section-title">Start a minigame</div>
        <div className="debug-grid">
          {MINIGAMES.map((m) => (
            <button key={m} className="btn small" onClick={() => ui.openMinigame(m, { spot: 'river' })}>
              {m}
            </button>
          ))}
        </div>

        <div className="section-title">Start a fight</div>
        <div className="debug-grid">
          {CHARACTERS.filter((c) => c.id !== state.playerId).map((c) => (
            <button key={c.id} className="btn small" onClick={() => ui.openCombat(c.id)}>
              vs {c.name}
            </button>
          ))}
        </div>

        <div className="section-title">Items</div>
        <div className="debug-grid" style={{ maxHeight: 200, overflowY: 'auto' }}>
          {ITEMS.map((i) => (
            <button key={i.id} className="btn small" onClick={() => store.give(i.id, 5)}>
              {i.icon} {i.name}
            </button>
          ))}
        </div>

        <div className="section-title">NPCs</div>
        <button className="btn small" onClick={() => getGame()?.refreshNpcSchedules()}>
          Snap everyone to their schedule
        </button>
      </Panel>
    </div>
  );
}
