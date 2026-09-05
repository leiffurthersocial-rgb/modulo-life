import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore, type Panel as PanelId } from '@/stores/useUiStore';
import { getGame } from '@/ui/gameRef';
import { audio } from '@/game/audio/AudioManager';
import { useTutorial } from '@/ui/useTutorial';

import GameCanvas from '@/ui/GameCanvas';
import MainMenu from '@/ui/MainMenu';
import CharacterSelect from '@/ui/CharacterSelect';
import LoadingScreen from '@/ui/LoadingScreen';
import Credits from '@/ui/Credits';
import Hud from '@/ui/hud/Hud';
import TouchControls from '@/ui/hud/TouchControls';

import PausePanel from '@/ui/menus/PausePanel';
import SettingsPanel from '@/ui/menus/SettingsPanel';
import InventoryPanel from '@/ui/menus/InventoryPanel';
import CharacterPanel from '@/ui/menus/CharacterPanel';
import SocialPanel from '@/ui/menus/SocialPanel';
import MapPanel from '@/ui/menus/MapPanel';
import QuestPanel from '@/ui/menus/QuestPanel';
import ActivitiesPanel from '@/ui/menus/ActivitiesPanel';
import StoragePanel from '@/ui/menus/StoragePanel';
import FastTravelPanel from '@/ui/menus/FastTravelPanel';
import NoticesPanel from '@/ui/menus/NoticesPanel';
import DebugPanel from '@/ui/menus/DebugPanel';

import ShopPanel from '@/ui/overlays/ShopPanel';
import DialoguePanel from '@/ui/overlays/DialoguePanel';
import EventPanel from '@/ui/overlays/EventPanel';
import ResultPanel from '@/ui/overlays/ResultPanel';
import ConfirmPanel from '@/ui/overlays/ConfirmPanel';
import CombatPanel from '@/ui/overlays/CombatPanel';
import MinigameHost from '@/minigames/MinigameHost';

/** Panels that should not pause the world underneath them. */
const NON_PAUSING: PanelId[] = ['dialogue'];

const HOTKEYS: Record<string, PanelId> = {
  KeyI: 'inventory',
  KeyC: 'character',
  KeyR: 'social',
  KeyM: 'map',
  KeyQ: 'quests',
};

function useAccessibilityVars() {
  const a11y = useSettingsStore((s) => s.accessibility);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--text-scale', String(a11y.textScale));
    root.style.setProperty('--ui-scale', String(a11y.uiScale));
    root.classList.toggle('reduced-motion', a11y.reducedMotion);
    root.classList.toggle('high-contrast', a11y.highContrast);
  }, [a11y]);
}

function useHotkeys() {
  const screen = useUiStore((s) => s.screen);
  useEffect(() => {
    if (screen !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const ui = useUiStore.getState();

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        audio.play('ui');
        // Combat and events must be finished rather than dismissed with Esc.
        if (ui.panel === 'combat') return;
        if (ui.panel) ui.closePanel();
        else ui.openPanel('pause');
        return;
      }

      const panel = HOTKEYS[e.code];
      if (panel && !e.repeat) {
        e.preventDefault();
        audio.play('ui');
        ui.togglePanel(panel);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen]);
}

/** Keeps engine pause state in sync with whatever the UI is showing. */
function usePauseSync() {
  const panel = useUiStore((s) => s.panel);
  const screen = useUiStore((s) => s.screen);
  useEffect(() => {
    const game = getGame();
    if (!game) return;
    const shouldPause = screen !== 'playing' || (panel !== null && !NON_PAUSING.includes(panel));
    game.setPaused(shouldPause);
    if (panel === null) game.setLockedTo(null);
  }, [panel, screen]);
}

function ActivePanel() {
  const panel = useUiStore((s) => s.panel);
  switch (panel) {
    case 'pause':
      return <PausePanel />;
    case 'settings':
      return <SettingsPanel />;
    case 'inventory':
      return <InventoryPanel />;
    case 'character':
      return <CharacterPanel />;
    case 'social':
      return <SocialPanel />;
    case 'map':
      return <MapPanel />;
    case 'quests':
      return <QuestPanel />;
    case 'activities':
      return <ActivitiesPanel />;
    case 'storage':
      return <StoragePanel />;
    case 'fasttravel':
      return <FastTravelPanel />;
    case 'notices':
      return <NoticesPanel />;
    case 'debug':
      return <DebugPanel />;
    case 'shop':
      return <ShopPanel />;
    case 'dialogue':
      return <DialoguePanel />;
    case 'event':
      return <EventPanel />;
    case 'result':
      return <ResultPanel />;
    case 'confirm':
      return <ConfirmPanel />;
    case 'combat':
      return <CombatPanel />;
    case 'minigame':
      return <MinigameHost />;
    default:
      return null;
  }
}

export default function App() {
  const screen = useUiStore((s) => s.screen);
  const setScreen = useUiStore((s) => s.setScreen);
  const panel = useUiStore((s) => s.panel);
  const isTouch = useUiStore((s) => s.isTouch);
  const hasState = useGameStore((s) => s.state !== null);

  useAccessibilityVars();
  useHotkeys();
  usePauseSync();
  useTutorial();

  // The boot screen exists only so the first paint is instant.
  useEffect(() => {
    if (screen === 'boot') {
      const id = window.setTimeout(() => setScreen('menu'), 60);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [screen, setScreen]);

  const inWorld = screen === 'loading' || screen === 'playing';

  return (
    <div className="app">
      {inWorld && hasState && <GameCanvas />}

      <div className="ui-root">
        {screen === 'boot' && <div className="title-screen" />}
        {screen === 'menu' && <MainMenu />}
        {screen === 'select' && <CharacterSelect />}
        {screen === 'credits' && <Credits />}
        {screen === 'loading' && <LoadingScreen />}
        {screen === 'playing' && (
          <>
            {panel !== 'combat' && <Hud />}
            {isTouch && panel === null && <TouchControls />}
          </>
        )}
        <ActivePanel />
      </div>
    </div>
  );
}
