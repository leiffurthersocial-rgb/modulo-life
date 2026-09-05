import { useMemo } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { formatMoney } from '@/game/systems/economy';
import { band, needsWarning } from '@/game/systems/needs';
import { dateLabel, formatClock } from '@/game/systems/timeSystem';
import { activeQuests, computeProgress, objectiveText } from '@/game/systems/questSystem';
import { Bar } from '../common/widgets';
import { getGame } from '../gameRef';
import { audio } from '@/game/audio/AudioManager';

const NEED_COLORS: Record<string, string> = {
  critical: '#e5757b',
  low: '#f0c96a',
  ok: '#8fb8e8',
  good: '#82d79c',
};

const WEATHER_ICON: Record<string, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rain: '🌧️',
  petals: '🌸',
};

export default function Hud() {
  const state = useGameStore((s) => s.state);
  useGameStore((s) => s.revision);
  const prompt = useUiStore((s) => s.prompt);
  const toasts = useUiStore((s) => s.toasts);
  const hint = useUiStore((s) => s.tutorialHint);
  const isTouch = useUiStore((s) => s.isTouch);
  const togglePanel = useUiStore((s) => s.togglePanel);
  const panel = useUiStore((s) => s.panel);

  const quests = useMemo(() => (state ? activeQuests(state).slice(0, 3) : []), [state]);
  if (!state) return null;

  const warning = needsWarning(state.needs);

  const needRow = (icon: string, label: string, value: number) => (
    <div className="need" key={label}>
      <span aria-hidden>{icon}</span>
      <Bar value={value} color={NEED_COLORS[band(value)]} />
      <span className="mono muted tiny" aria-label={`${label} ${Math.round(value)} percent`}>
        {Math.round(value)}
      </span>
    </div>
  );

  const btn = (icon: string, key: string, panel: Parameters<typeof togglePanel>[0], label: string) => (
    <button
      className="hud-btn"
      onClick={() => {
        audio.play('ui');
        togglePanel(panel);
      }}
      aria-label={label}
      title={`${label} (${key})`}
    >
      <span aria-hidden>{icon}</span>
      {!isTouch && <span className="key">{key}</span>}
    </button>
  );

  return (
    <div className="hud">
      <div className="hud-top-left">
        <div className="hud-card">
          <div className="clock">
            <span className="time">{formatClock(state.time)}</span>
            <span className="date">{dateLabel(state.time)}</span>
            <span aria-label={state.weather}>{WEATHER_ICON[state.weather] ?? '🌸'}</span>
          </div>
          <div className="money-line" style={{ marginTop: '0.3rem' }}>
            <span aria-hidden>💴</span>
            <span className="mono">{formatMoney(state.money)}</span>
          </div>
        </div>

        <div className="hud-card needs">
          {needRow('⚡', 'Energy', state.needs.energy)}
          {needRow('🍙', 'Hunger', state.needs.hunger)}
          {needRow('🙂', 'Mood', state.needs.mood)}
          {warning && (
            <span className="tiny" style={{ color: 'var(--gold)' }}>
              {warning}
            </span>
          )}
        </div>
      </div>

      <div className="hud-top-right">
        {btn('🎒', 'I', 'inventory', 'Inventory')}
        {btn('🧍', 'C', 'character', 'Character')}
        {btn('💬', 'R', 'social', 'Relationships')}
        {btn('🗺️', 'M', 'map', 'Map')}
        {btn('📋', 'Q', 'quests', 'Tasks')}
        {btn('☰', 'Esc', 'pause', 'Pause menu')}
      </div>

      {quests.length > 0 && (
        <div className="quest-tracker">
          <div className="section-title" style={{ margin: '0 0 0.35rem' }}>
            Tasks
          </div>
          {quests.map((q) => (
            <div key={q.id} style={{ marginBottom: '0.35rem' }}>
              <div style={{ fontWeight: 600 }}>{q.title}</div>
              <div className="muted tiny">{objectiveText(q, computeProgress(state, q))}</div>
            </div>
          ))}
        </div>
      )}

      {prompt && !panel && (
        <div className="prompt">
          <span aria-hidden>{prompt.icon}</span>
          <span>{prompt.label}</span>
          {!isTouch && <span className="keycap">E</span>}
          {isTouch && (
            <button
              className="btn small primary"
              onClick={() => getGame()?.inputManager.trigger('interact')}
            >
              Do it
            </button>
          )}
        </div>
      )}

      {hint && (
        <div className="tutorial">
          <div className="row spread" style={{ alignItems: 'flex-start', gap: '0.5rem' }}>
            <span>{hint}</span>
            <button
              className="close-x"
              style={{ width: '1.6em', height: '1.6em' }}
              aria-label="Dismiss hint"
              onClick={() => useUiStore.getState().setTutorialHint(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            {t.icon && <span aria-hidden>{t.icon}</span>}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
