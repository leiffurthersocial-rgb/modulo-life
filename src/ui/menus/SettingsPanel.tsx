import { useState } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore } from '@/stores/useUiStore';
import { useGameStore } from '@/stores/useGameStore';
import { Panel, Segmented, Slider, Toggle } from '../common/widgets';
import { audio } from '@/game/audio/AudioManager';

type Tab = 'graphics' | 'performance' | 'audio' | 'gameplay' | 'accessibility' | 'data';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'graphics', label: 'Graphics' },
  { id: 'performance', label: 'Performance' },
  { id: 'audio', label: 'Audio' },
  { id: 'gameplay', label: 'Gameplay' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'data', label: 'Data' },
];

export default function SettingsPanel() {
  const [tab, setTab] = useState<Tab>('graphics');
  const s = useSettingsStore();
  const ui = useUiStore();
  const game = useGameStore();

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div className="overlay">
      <Panel
        title="Settings"
        icon="⚙️"
        onClose={() => ui.closePanel()}
        tabs={
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? 'on' : ''}
                onClick={() => {
                  audio.play('ui');
                  setTab(t.id);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
        footer={
          <>
            <button className="btn ghost" onClick={() => s.reset()}>
              Reset to defaults
            </button>
            <button className="btn primary" onClick={() => ui.closePanel()}>
              Done
            </button>
          </>
        }
      >
        {tab === 'graphics' && (
          <>
            <Segmented
              label="Quality preset"
              value={s.graphics.quality}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
              onChange={(v) => s.setQuality(v)}
              hint="Presets set every option below. Change anything and you are on a custom mix."
            />
            <Toggle label="Shadows" on={s.graphics.shadows} onChange={(v) => s.setGraphics({ shadows: v })} />
            <Segmented
              label="Shadow detail"
              value={s.graphics.shadowMapSize}
              options={[
                { value: 512, label: 'Low' },
                { value: 1024, label: 'Medium' },
                { value: 2048, label: 'High' },
              ]}
              onChange={(v) => s.setGraphics({ shadowMapSize: v })}
            />
            <Toggle
              label="Effects (particles, water, glow)"
              on={s.graphics.effects}
              onChange={(v) => s.setGraphics({ effects: v })}
            />
            <Slider
              label="View distance"
              value={s.graphics.viewDistance}
              min={80}
              max={360}
              step={10}
              format={(v) => `${v} m`}
              onChange={(v) => s.setGraphics({ viewDistance: v })}
            />
            <Slider
              label="Resolution scale"
              value={s.graphics.resolutionScale}
              min={0.5}
              max={1}
              step={0.05}
              format={pct}
              onChange={(v) => s.setGraphics({ resolutionScale: v })}
              hint="The single biggest frame-rate lever on a laptop or tablet."
            />
          </>
        )}

        {tab === 'performance' && (
          <>
            <Toggle
              label="Battery saver"
              on={s.performance.batterySaver}
              onChange={(v) => s.setPerformance({ batterySaver: v })}
            />
            <div className="callout" style={{ marginBottom: '1rem' }}>
              Battery saver genuinely reduces work rather than just dimming things: shadows and post effects are
              switched off, render resolution is capped at 65%, draw distance drops to 110m, particle counts are
              cut by two thirds, the frame target moves to 30fps, and NPC simulation slows from 10 to 4 ticks a
              second.
            </div>
            <Segmented
              label="Frame rate target"
              value={s.graphics.fpsTarget}
              options={[
                { value: 30, label: '30' },
                { value: 60, label: '60' },
                { value: 120, label: 'Uncapped' },
              ]}
              onChange={(v) => s.setGraphics({ fpsTarget: v })}
            />
            <Toggle
              label="Reduced particles"
              on={s.performance.reducedParticles}
              onChange={(v) => s.setPerformance({ reducedParticles: v })}
            />
            <Slider
              label="NPC simulation rate"
              value={s.performance.npcSimRate}
              min={2}
              max={20}
              step={1}
              format={(v) => `${v} Hz`}
              onChange={(v) => s.setPerformance({ npcSimRate: v })}
              hint="Lower means neighbours think less often. They still get where they are going."
            />
            <div className="divider" />
            <dl className="kv">
              <dt>Current frame rate</dt>
              <dd>{ui.fps} fps</dd>
            </dl>
          </>
        )}

        {tab === 'audio' && (
          <>
            <Slider label="Master volume" value={s.audio.master} min={0} max={1} step={0.05} format={pct} onChange={(v) => s.setAudio({ master: v })} />
            <Slider label="Music" value={s.audio.music} min={0} max={1} step={0.05} format={pct} onChange={(v) => s.setAudio({ music: v })} />
            <Slider label="Sound effects" value={s.audio.sfx} min={0} max={1} step={0.05} format={pct} onChange={(v) => s.setAudio({ sfx: v })} />
            <button
              className="btn small"
              onClick={() => {
                audio.unlock();
                audio.play('confirm');
              }}
            >
              Test sound
            </button>
          </>
        )}

        {tab === 'gameplay' && (
          <>
            <Slider
              label="Camera sensitivity"
              value={s.gameplay.cameraSensitivity}
              min={0.3}
              max={2.5}
              step={0.1}
              format={(v) => `${v.toFixed(1)}×`}
              onChange={(v) => s.setGameplay({ cameraSensitivity: v })}
            />
            <Slider
              label="Camera distance"
              value={s.gameplay.cameraDistance}
              min={4}
              max={12}
              step={0.5}
              format={(v) => `${v.toFixed(1)} m`}
              onChange={(v) => s.setGameplay({ cameraDistance: v })}
            />
            <Toggle label="Invert vertical look" on={s.gameplay.invertY} onChange={(v) => s.setGameplay({ invertY: v })} />
            <Toggle label="Controller vibration" on={s.gameplay.vibration} onChange={(v) => s.setGameplay({ vibration: v })} />
            <Toggle label="Autosave" on={s.gameplay.autosave} onChange={(v) => s.setGameplay({ autosave: v })} />
          </>
        )}

        {tab === 'accessibility' && (
          <>
            <Slider
              label="Text size"
              value={s.accessibility.textScale}
              min={0.85}
              max={1.5}
              step={0.05}
              format={pct}
              onChange={(v) => s.setAccessibility({ textScale: v })}
            />
            <Slider
              label="Interface scale"
              value={s.accessibility.uiScale}
              min={0.8}
              max={1.4}
              step={0.05}
              format={pct}
              onChange={(v) => s.setAccessibility({ uiScale: v })}
            />
            <Toggle
              label="Reduced motion"
              on={s.accessibility.reducedMotion}
              onChange={(v) => s.setAccessibility({ reducedMotion: v })}
            />
            <Toggle
              label="Screen shake"
              on={s.accessibility.screenShake}
              onChange={(v) => s.setAccessibility({ screenShake: v })}
            />
            <Toggle
              label="Subtitles and speaker names"
              on={s.accessibility.subtitles}
              onChange={(v) => s.setAccessibility({ subtitles: v })}
            />
            <Toggle
              label="High contrast interface"
              on={s.accessibility.highContrast}
              onChange={(v) => s.setAccessibility({ highContrast: v })}
            />
            <div className="callout">
              Every status bar in the game is labelled with a number and an icon as well as a colour, so nothing
              depends on telling red from green.
            </div>
          </>
        )}

        {tab === 'data' && (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Progress is stored in this browser only. Nothing is uploaded anywhere.
            </p>
            <div className="col">
              <button className="btn" onClick={() => game.save()} disabled={!game.state}>
                Save now
              </button>
              <button
                className="btn danger"
                onClick={() =>
                  ui.askConfirm({
                    title: 'Delete save data?',
                    body: 'This permanently removes your saved neighbourhood. It cannot be undone.',
                    confirmLabel: 'Delete it',
                    tone: 'bad',
                    onConfirm: () => {
                      game.clearSave();
                      game.quit();
                      ui.setScreen('menu');
                    },
                  })
                }
              >
                Reset save data
              </button>
            </div>
            <div className="section-title">Controls</div>
            <dl className="kv">
              <dt>Move</dt>
              <dd>W A S D / arrows / left stick</dd>
              <dt>Look</dt>
              <dd>Drag / right stick</dd>
              <dt>Sprint</dt>
              <dd>Shift</dd>
              <dt>Jump</dt>
              <dd>Space</dd>
              <dt>Interact</dt>
              <dd>E</dd>
              <dt>Pause</dt>
              <dd>Esc or P</dd>
              <dt>Panels</dt>
              <dd>I · C · R · M · Q</dd>
            </dl>
          </>
        )}
      </Panel>
    </div>
  );
}
