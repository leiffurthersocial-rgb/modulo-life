import * as THREE from 'three';
import type { InputManager } from '@/game/core/Input';
import type { CameraRig } from './CameraRig';
import type { CollisionWorld } from '@/game/world/collision';
import type { CharacterModel } from '@/game/characters/CharacterModel';

const WALK_SPEED = 3.2;
const SPRINT_SPEED = 5.9;
const GRAVITY = -24;
const JUMP_VELOCITY = 7.0;
const RADIUS = 0.38;

export interface PlayerControllerOptions {
  onFootstep?: (running: boolean) => void;
  onJump?: () => void;
  onLand?: (fallSpeed: number) => void;
}

/**
 * Camera-relative third-person movement with gravity, collision and a
 * procedural walk cycle driven from the actual travelled speed.
 */
export class PlayerController {
  readonly position = new THREE.Vector3();
  facing = 0;

  private velocityY = 0;
  private grounded = true;
  private lastStepPhase = 0;
  private speed = 0;
  private locked = false;
  private options: PlayerControllerOptions;

  /** Multiplier from the speed stat and current energy. */
  speedMultiplier = 1;
  /** Set false indoors so the player cannot jump onto furniture. */
  jumpEnabled = true;

  constructor(
    private model: CharacterModel,
    options: PlayerControllerOptions = {},
  ) {
    this.options = options;
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
    if (locked) this.speed = 0;
  }

  teleport(x: number, z: number, facing = this.facing): void {
    this.position.set(x, 0, z);
    this.facing = facing;
    this.velocityY = 0;
    this.grounded = true;
    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = facing;
  }

  get isGrounded(): boolean {
    return this.grounded;
  }

  get currentSpeed(): number {
    return this.speed;
  }

  update(dt: number, input: InputManager, camera: CameraRig, collision: CollisionWorld, indoors: boolean): void {
    if (this.locked) {
      this.model.update(dt, 0);
      return;
    }

    const forward = camera.forward();
    const right = camera.right();
    const wish = new THREE.Vector3()
      .addScaledVector(forward, -input.move.y)
      .addScaledVector(right, input.move.x);

    const wishLen = wish.length();
    if (wishLen > 0.001) wish.divideScalar(wishLen);

    const sprinting = input.isHeld('sprint') && wishLen > 0.4 && !indoors;
    const baseSpeed = (sprinting ? SPRINT_SPEED : WALK_SPEED) * this.speedMultiplier * (indoors ? 0.8 : 1);
    const targetSpeed = baseSpeed * Math.min(1, wishLen);

    // Ease into and out of full speed rather than snapping.
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * (targetSpeed > this.speed ? 12 : 16));
    if (this.speed < 0.02) this.speed = 0;

    if (wishLen > 0.001) {
      const wanted = Math.atan2(wish.x, wish.z);
      let delta = wanted - this.facing;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.facing += delta * Math.min(1, dt * 13);
    }

    const dir = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
    const step = this.speed * dt;
    const resolved = collision.move(this.position.x, this.position.z, dir.x * step, dir.z * step, RADIUS);
    this.position.x = resolved.x;
    this.position.z = resolved.z;

    if (this.jumpEnabled && !indoors && this.grounded && input.consume('jump')) {
      this.velocityY = JUMP_VELOCITY;
      this.grounded = false;
      this.options.onJump?.();
    }

    if (!this.grounded || this.position.y > 0) {
      this.velocityY += GRAVITY * dt;
      this.position.y += this.velocityY * dt;
      if (this.position.y <= 0) {
        const fall = this.velocityY;
        this.position.y = 0;
        this.velocityY = 0;
        if (!this.grounded) this.options.onLand?.(Math.abs(fall));
        this.grounded = true;
      }
    }

    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = this.facing;

    if (!this.grounded) this.model.setState('jump');
    else if (this.speed > WALK_SPEED * 1.15) this.model.setState('run');
    else if (this.speed > 0.25) this.model.setState('walk');
    else this.model.setState('idle');

    this.model.update(dt, this.speed);

    // Footsteps fire on each half stride so the audio matches the legs.
    if (this.grounded && this.speed > 0.3) {
      const phase = this.model.stridePhase;
      if (Math.floor(phase / Math.PI) !== Math.floor(this.lastStepPhase / Math.PI)) {
        this.options.onFootstep?.(this.speed > WALK_SPEED * 1.15);
      }
      this.lastStepPhase = phase;
    }
  }

  /** Plays a one-off animation (used by interactions and combat). */
  playAnimation(state: Parameters<CharacterModel['setState']>[0]): void {
    this.model.setState(state);
  }
}

export const PLAYER_RADIUS = RADIUS;
