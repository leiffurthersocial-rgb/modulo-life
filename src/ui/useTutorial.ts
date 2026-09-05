import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';

interface Step {
  hint: string;
  /** Advance once this is true. */
  done: (s: NonNullable<ReturnType<typeof useGameStore.getState>['state']>) => boolean;
}

/**
 * A five-beat tutorial that reacts to what the player has actually done rather
 * than gating them behind a scripted sequence. Every hint is dismissible and
 * the whole thing stops for good once the last step is met.
 */
const STEPS: Step[] = [
  {
    hint: 'Move with WASD or the left stick. Drag anywhere to look around.',
    done: (s) => s.player.inside === null,
  },
  {
    hint: 'Walk up to a door, a neighbour or a vending machine and press E to interact.',
    done: (s) => s.counters.conversations > 0 || s.counters.itemsBought > 0,
  },
  {
    hint: 'Your yen, energy, hunger and mood sit top-left. Modulo Mart on Main Street never closes.',
    done: (s) => s.counters.itemsBought > 0 || s.money !== s.counters.earned,
  },
  {
    hint: 'Press M for the map, I for your bag, R for the neighbours, and Q for anything you have agreed to do.',
    done: (s) => s.activitiesDiscovered.length >= 3,
  },
  {
    hint: 'That is everything. Work, train, fish, gamble, spar, or sit on a bench and watch the petals — it is your afternoon.',
    done: () => false,
  },
];

export function useTutorial(): void {
  const state = useGameStore((s) => s.state);
  const revision = useGameStore((s) => s.revision);
  const setHint = useUiStore((s) => s.setTutorialHint);

  useEffect(() => {
    if (!state || state.tutorialDone) return;
    const step = STEPS[state.tutorialStep];
    if (!step) return;

    if (step.done(state)) {
      const next = state.tutorialStep + 1;
      useGameStore.getState().patch((s) => {
        s.tutorialStep = next;
        if (next >= STEPS.length - 1) s.tutorialDone = true;
      });
      setHint(STEPS[next]?.hint ?? null);
      // The closing note is a send-off, not an instruction; let it fade.
      if (next >= STEPS.length - 1) window.setTimeout(() => setHint(null), 9000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, state?.tutorialStep]);
}
