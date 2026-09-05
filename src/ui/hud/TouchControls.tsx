import { useEffect, useRef, useState } from 'react';
import { getGame } from '../gameRef';
import { useUiStore } from '@/stores/useUiStore';

const STICK_RADIUS = 52;

/**
 * Touch controls for tablets and phones: a left analogue stick, a right-side
 * look area, and action buttons. Values are pushed straight into the engine's
 * InputManager so the rest of the game is device-agnostic.
 */
export default function TouchControls() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const stickRef = useRef<HTMLDivElement>(null);
  const stickTouch = useRef<number | null>(null);
  const lookTouch = useRef<{ id: number; x: number; y: number } | null>(null);
  const panel = useUiStore((s) => s.panel);

  useEffect(() => {
    // Releasing everything when a panel opens avoids a stuck-forward bug.
    const game = getGame();
    if (panel) {
      game?.inputManager.setTouchMove(0, 0);
      setKnob({ x: 0, y: 0 });
      stickTouch.current = null;
      lookTouch.current = null;
    }
  }, [panel]);

  if (panel) return null;

  const updateStick = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > STICK_RADIUS) {
      dx = (dx / len) * STICK_RADIUS;
      dy = (dy / len) * STICK_RADIUS;
    }
    setKnob({ x: dx, y: dy });
    getGame()?.inputManager.setTouchMove(dx / STICK_RADIUS, dy / STICK_RADIUS);
  };

  const release = () => {
    stickTouch.current = null;
    setKnob({ x: 0, y: 0 });
    getGame()?.inputManager.setTouchMove(0, 0);
  };

  const button = (label: string, action: 'interact' | 'jump' | 'sprint', icon: string, wide = false) => (
    <button
      className={`touch-btn ${wide ? 'wide' : ''}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        getGame()?.inputManager.setTouchButton(action, true);
      }}
      onPointerUp={() => getGame()?.inputManager.setTouchButton(action, false)}
      onPointerCancel={() => getGame()?.inputManager.setTouchButton(action, false)}
      onPointerLeave={() => getGame()?.inputManager.setTouchButton(action, false)}
    >
      <span aria-hidden style={{ fontSize: '1.3em' }}>
        {icon}
      </span>
    </button>
  );

  return (
    <div className="touch-layer">
      <div
        className="touch-look"
        onPointerDown={(e) => {
          if (lookTouch.current) return;
          lookTouch.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const t = lookTouch.current;
          if (!t || t.id !== e.pointerId) return;
          getGame()?.inputManager.addTouchLook(e.clientX - t.x, e.clientY - t.y);
          t.x = e.clientX;
          t.y = e.clientY;
        }}
        onPointerUp={() => {
          lookTouch.current = null;
        }}
        onPointerCancel={() => {
          lookTouch.current = null;
        }}
      />

      <div
        ref={stickRef}
        className="touch-stick"
        onPointerDown={(e) => {
          e.preventDefault();
          stickTouch.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (stickTouch.current !== e.pointerId) return;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        role="application"
        aria-label="Movement stick"
      >
        <span className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>

      <div className="touch-buttons">
        {button('Sprint', 'sprint', '»')}
        {button('Jump', 'jump', '⤴')}
        {button('Interact', 'interact', '✋', true)}
      </div>
    </div>
  );
}
