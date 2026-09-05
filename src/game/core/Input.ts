export type ActionName = 'interact' | 'jump' | 'sprint' | 'menu' | 'map' | 'cancel' | 'attack' | 'block' | 'dodge';

/**
 * Single source of truth for player input across keyboard, mouse, touch and
 * gamepad. The React layer pushes touch state in through `setTouch*`, so the
 * engine never has to know which device it is being driven by.
 */
export class InputManager {
  /** Normalised movement vector, -1..1 on each axis. */
  readonly move = { x: 0, y: 0 };
  /** Look delta accumulated since the last frame, in pixels. */
  readonly look = { x: 0, y: 0 };

  private keys = new Set<string>();
  private pressed = new Set<ActionName>();
  private held = new Set<ActionName>();
  private touchMove = { x: 0, y: 0 };
  private touchLook = { x: 0, y: 0 };
  private touchButtons = new Set<ActionName>();
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private element: HTMLElement | null = null;
  private enabled = true;
  private gamepadIndex: number | null = null;
  private prevGamepadButtons: boolean[] = [];

  private readonly bindings: Record<string, ActionName> = {
    KeyE: 'interact',
    Enter: 'interact',
    Space: 'jump',
    ShiftLeft: 'sprint',
    ShiftRight: 'sprint',
    Escape: 'menu',
    KeyP: 'menu',
    KeyM: 'map',
    Backspace: 'cancel',
    KeyJ: 'attack',
    KeyK: 'block',
    KeyL: 'dodge',
  };

  attach(element: HTMLElement): void {
    this.element = element;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    element.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('gamepadconnected', this.onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    element.addEventListener('contextmenu', this.onContextMenu);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.element?.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('gamepadconnected', this.onGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    this.element?.removeEventListener('contextmenu', this.onContextMenu);
    this.element = null;
  }

  /** Disabled while a menu is open so WASD does not move the player. */
  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v) {
      this.keys.clear();
      this.held.clear();
      this.dragging = false;
      this.move.x = 0;
      this.move.y = 0;
      this.touchMove.x = 0;
      this.touchMove.y = 0;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private onContextMenu = (e: Event) => e.preventDefault();

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    // Menu and pause keys must work even while gameplay input is suspended.
    const action = this.bindings[e.code];
    if (action === 'menu' || action === 'cancel') {
      if (!e.repeat) this.pressed.add(action);
      e.preventDefault();
      return;
    }
    if (!this.enabled) return;
    this.keys.add(e.code);
    if (action && !e.repeat) this.pressed.add(action);
    if (action) this.held.add(action);
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    const action = this.bindings[e.code];
    if (action) this.held.delete(action);
  };

  private onBlur = () => {
    this.keys.clear();
    this.held.clear();
    this.dragging = false;
  };

  private onPointerDown = (e: PointerEvent) => {
    if (!this.enabled) return;
    if (e.pointerType === 'touch') return; // touch look is routed through setTouchLook
    this.dragging = true;
    this.lastPointer.x = e.clientX;
    this.lastPointer.y = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging || !this.enabled) return;
    this.look.x += e.clientX - this.lastPointer.x;
    this.look.y += e.clientY - this.lastPointer.y;
    this.lastPointer.x = e.clientX;
    this.lastPointer.y = e.clientY;
  };

  private onPointerUp = () => {
    this.dragging = false;
  };

  private onGamepadConnected = (e: GamepadEvent) => {
    this.gamepadIndex = e.gamepad.index;
  };

  private onGamepadDisconnected = () => {
    this.gamepadIndex = null;
  };

  /* ------------------------------------------------------------- touch */

  setTouchMove(x: number, y: number): void {
    this.touchMove.x = x;
    this.touchMove.y = y;
  }

  addTouchLook(dx: number, dy: number): void {
    this.touchLook.x += dx;
    this.touchLook.y += dy;
  }

  setTouchButton(action: ActionName, down: boolean): void {
    if (down) {
      if (!this.touchButtons.has(action)) this.pressed.add(action);
      this.touchButtons.add(action);
      this.held.add(action);
    } else {
      this.touchButtons.delete(action);
      this.held.delete(action);
    }
  }

  /** Lets UI buttons trigger a one-off action (used by on-screen prompts). */
  trigger(action: ActionName): void {
    this.pressed.add(action);
  }

  /* ------------------------------------------------------------ queries */

  /** Consumes the press: returns true once per key-down. */
  consume(action: ActionName): boolean {
    if (this.pressed.has(action)) {
      this.pressed.delete(action);
      return true;
    }
    return false;
  }

  isHeld(action: ActionName): boolean {
    return this.held.has(action);
  }

  /** Called once per frame before the movement systems read `move`/`look`. */
  update(): void {
    let mx = 0;
    let my = 0;
    if (this.enabled) {
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my += 1;
    }

    mx += this.touchMove.x;
    my += this.touchMove.y;

    this.look.x += this.touchLook.x;
    this.look.y += this.touchLook.y;
    this.touchLook.x = 0;
    this.touchLook.y = 0;

    if (this.gamepadIndex !== null && typeof navigator !== 'undefined' && navigator.getGamepads) {
      const pad = navigator.getGamepads()[this.gamepadIndex];
      if (pad) {
        const dead = 0.18;
        const ax = pad.axes[0] ?? 0;
        const ay = pad.axes[1] ?? 0;
        if (Math.abs(ax) > dead) mx += ax;
        if (Math.abs(ay) > dead) my += ay;
        const lx = pad.axes[2] ?? 0;
        const ly = pad.axes[3] ?? 0;
        if (Math.abs(lx) > dead) this.look.x += lx * 18;
        if (Math.abs(ly) > dead) this.look.y += ly * 12;

        const map: Array<[number, ActionName]> = [
          [0, 'jump'],
          [2, 'interact'],
          [1, 'cancel'],
          [9, 'menu'],
          [3, 'map'],
          [5, 'sprint'],
          [7, 'attack'],
          [6, 'block'],
          [4, 'dodge'],
        ];
        for (const [idx, action] of map) {
          const down = pad.buttons[idx]?.pressed ?? false;
          if (down && !this.prevGamepadButtons[idx]) this.pressed.add(action);
          if (down) this.held.add(action);
          else if (!this.touchButtons.has(action) && !this.keyHeldFor(action)) this.held.delete(action);
          this.prevGamepadButtons[idx] = down;
        }
      }
    }

    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    this.move.x = mx;
    this.move.y = my;
  }

  private keyHeldFor(action: ActionName): boolean {
    for (const [code, a] of Object.entries(this.bindings)) {
      if (a === action && this.keys.has(code)) return true;
    }
    return false;
  }

  /** Clears look accumulation once the camera has consumed it. */
  clearLook(): void {
    this.look.x = 0;
    this.look.y = 0;
  }

  hasGamepad(): boolean {
    return this.gamepadIndex !== null;
  }

  vibrate(strength = 0.4, ms = 120): void {
    if (this.gamepadIndex === null || typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pad = navigator.getGamepads()[this.gamepadIndex] as (Gamepad & { vibrationActuator?: { playEffect: (t: string, o: object) => void } }) | null;
    pad?.vibrationActuator?.playEffect('dual-rumble', {
      duration: ms,
      strongMagnitude: strength,
      weakMagnitude: strength * 0.6,
    });
  }
}
