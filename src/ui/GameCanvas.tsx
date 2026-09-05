import { useEffect, useRef } from 'react';
import { Game } from '@/game/Game';
import { useGameStore } from '@/stores/useGameStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore } from '@/stores/useUiStore';
import { audio } from '@/game/audio/AudioManager';
import { setGame } from './gameRef';

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ui = useUiStore.getState();

    const boot = async () => {
      const state = useGameStore.getState().state;
      const canvas = canvasRef.current;
      if (!state || !canvas) return;

      ui.setLoading(0.08, 'Waking the neighbourhood…');
      await frame();
      if (cancelled) return;

      ui.setLoading(0.25, 'Laying out streets and buildings…');
      await frame();
      await new Promise((r) => setTimeout(r, 16));
      if (cancelled) return;

      // The heavy synchronous work: world geometry, characters and lighting.
      const game = new Game(canvas, state);
      gameRef.current = game;
      setGame(game);
      if (cancelled) {
        game.dispose();
        return;
      }

      ui.setLoading(0.82, 'Waking the neighbours…');
      await frame();
      if (cancelled) return;

      audio.unlock();
      audio.setVolumes(
        useSettingsStore.getState().audio.master,
        useSettingsStore.getState().audio.music,
        useSettingsStore.getState().audio.sfx,
      );
      audio.startMusic();

      ui.setLoading(1, 'Ready');
      await frame();
      if (cancelled) return;
      ui.setScreen('playing');

      const s = useGameStore.getState().state;
      if (s && !s.tutorialDone && s.tutorialStep === 0) {
        ui.setTutorialHint('Move with WASD or the left stick. Drag to look around.');
      }
    };

    void boot();

    return () => {
      cancelled = true;
      gameRef.current?.dispose();
      gameRef.current = null;
      setGame(null);
      audio.stopMusic();
      audio.setAmbience('none');
    };
  }, []);

  // Push settings changes straight through to the engine.
  useEffect(() => {
    const unsub = useSettingsStore.subscribe((s) => {
      gameRef.current?.applySettings({
        graphics: s.graphics,
        performance: s.performance,
        audio: s.audio,
        gameplay: s.gameplay,
        accessibility: s.accessibility,
      });
    });
    return unsub;
  }, []);

  return (
    <div className="canvas-wrap">
      <canvas ref={canvasRef} />
    </div>
  );
}
