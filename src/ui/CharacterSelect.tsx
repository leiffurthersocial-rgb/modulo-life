import { useState } from 'react';
import { CHARACTERS } from '@/data/characters';
import { STAT_KEYS, STAT_LABELS } from '@/game/types';
import { requireLocation } from '@/data/locations';
import { formatMoney } from '@/game/systems/economy';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { audio } from '@/game/audio/AudioManager';
import { Bar } from './common/widgets';
import { maxHpFor } from '@/game/systems/combat';

export default function CharacterSelect() {
  const [selected, setSelected] = useState(CHARACTERS[0].id);
  const setScreen = useUiStore((s) => s.setScreen);
  const newGame = useGameStore((s) => s.newGame);
  const character = CHARACTERS.find((c) => c.id === selected)!;

  const begin = () => {
    audio.unlock();
    audio.play('confirm');
    newGame(selected);
    setScreen('loading');
  };

  return (
    <div className="select-screen">
      <div className="select-head">
        <h1>Choose your resident</h1>
        <p className="muted tiny">
          Whoever you pick becomes you. The other seven get on with their own lives regardless.
        </p>
      </div>

      <div className="select-body">
        <div className="char-grid">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              className={`tile ${c.id === selected ? 'selected' : ''}`}
              onClick={() => {
                setSelected(c.id);
                audio.play('ui');
              }}
              aria-pressed={c.id === selected}
            >
              <span className="swatch" style={{ background: c.themeColor }} aria-hidden />
              <span className="name">{c.name}</span>
              <span className="tagline">{c.tagline}</span>
              <span className="row tiny muted" style={{ gap: '0.5rem', marginTop: '0.2rem' }}>
                <span>💪 {c.baseStats.strength}</span>
                <span>🧠 {c.baseStats.intelligence}</span>
                <span>✨ {c.baseStats.charisma}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="detail-card">
          <div className="row spread">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem' }}>{character.name}</h2>
              <p className="muted tiny" style={{ margin: '0.15rem 0 0' }}>
                {character.tagline}
              </p>
            </div>
            <span
              className="avatar"
              style={{ background: character.themeColor, width: '2.8em', height: '2.8em', fontSize: '1.1em' }}
              aria-hidden
            >
              {character.name.charAt(0)}
            </span>
          </div>

          <p style={{ margin: 0, lineHeight: 1.6, fontSize: '0.94em' }}>{character.bio}</p>

          <div className="trait-list">
            {character.personality.traits.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>

          <div className="divider" />

          <div className="stat-rows">
            {STAT_KEYS.map((k) => (
              <div key={k} className="stat-row">
                <span>{STAT_LABELS[k]}</span>
                <Bar value={character.baseStats[k]} color={character.themeColor} />
                <span className="value">{character.baseStats[k]}</span>
              </div>
            ))}
          </div>

          <div className="divider" />

          <dl className="kv">
            <dt>Starting money</dt>
            <dd>{formatMoney(character.startingMoney)}</dd>
            <dt>Home</dt>
            <dd>{requireLocation(character.home).name}</dd>
            <dt>Day job</dt>
            <dd>{character.job.replace(/_/g, ' ')}</dd>
            <dt>Fight health</dt>
            <dd>{maxHpFor(character.baseStats)}</dd>
          </dl>
        </div>
      </div>

      <div className="panel-foot" style={{ borderTop: '1px solid var(--line)' }}>
        <button className="btn ghost" onClick={() => setScreen('menu')}>
          Back
        </button>
        <button className="btn primary" onClick={begin}>
          Start as {character.name}
        </button>
      </div>
    </div>
  );
}
