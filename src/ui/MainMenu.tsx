import { useEffect, useState } from 'react';
import { loadSaveMeta, type SaveMeta } from '@/game/save/save';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { audio } from '@/game/audio/AudioManager';
import { formatMoney } from '@/game/systems/economy';

/** Animated sakura backdrop for the title screen - CSS only, no WebGL cost. */
function Petals() {
  const petals = Array.from({ length: 26 }, (_, i) => i);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden>
      {petals.map((i) => {
        const left = (i * 37) % 100;
        const delay = (i * 0.7) % 12;
        const duration = 11 + ((i * 5) % 9);
        const size = 6 + (i % 5) * 2;
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: '-6%',
              width: size,
              height: size * 1.3,
              borderRadius: '60% 40% 60% 40%',
              background: i % 3 === 0 ? '#ffd7e4' : '#f2a0bd',
              opacity: 0.55,
              animation: `petalFall ${duration}s linear ${delay}s infinite`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes petalFall {
          0% { transform: translate3d(0,0,0) rotate(0deg); opacity: 0; }
          8% { opacity: 0.6; }
          100% { transform: translate3d(60px, 108vh, 0) rotate(420deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function MainMenu() {
  const setScreen = useUiStore((s) => s.setScreen);
  const openPanel = useUiStore((s) => s.openPanel);
  const continueGame = useGameStore((s) => s.continueGame);
  const [meta, setMeta] = useState<SaveMeta | null>(null);

  useEffect(() => {
    setMeta(loadSaveMeta());
  }, []);

  const start = (fn: () => void) => {
    audio.unlock();
    audio.play('confirm');
    fn();
  };

  return (
    <div className="title-screen">
      <Petals />
      <div className="title-inner">
        <div>
          <h1 className="game-title">MODULO</h1>
          <p className="game-title-jp">L I F E</p>
        </div>
        <p className="title-tagline">
          A spring in Hoshizaki. Eight neighbours, one street, and whatever you decide to do with the afternoon.
        </p>

        <div className="menu-buttons">
          <button className="btn primary" onClick={() => start(() => setScreen('select'))}>
            New Game
          </button>
          <button
            className="btn"
            disabled={!meta}
            onClick={() =>
              start(() => {
                if (continueGame()) setScreen('loading');
                else useUiStore.getState().toast('Save data could not be read', 'bad', '⚠️');
              })
            }
          >
            Continue
          </button>
          {meta && (
            <p className="tiny muted" style={{ margin: '-0.2rem 0 0.4rem', textAlign: 'center' }}>
              {meta.playerName} · Day {meta.day} · {meta.clock} · {formatMoney(meta.money)}
            </p>
          )}
          <button className="btn ghost" onClick={() => start(() => openPanel('settings'))}>
            Settings
          </button>
          <button className="btn ghost" onClick={() => start(() => setScreen('credits'))}>
            Credits
          </button>
        </div>
      </div>
      <span className="version-line">v0.1.0 · early build</span>
    </div>
  );
}
