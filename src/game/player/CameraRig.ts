import * as THREE from 'three';
import type { InputManager } from '@/game/core/Input';
import type { CollisionWorld } from '@/game/world/collision';

/**
 * Third-person orbit camera with damping, wall avoidance and a shake channel.
 * Damping is deliberately generous - the camera should never snap, because
 * snapping is what makes third-person games nauseating.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly target = new THREE.Vector3();

  yaw = 0;
  pitch = 0.28;
  distance = 7.5;

  private current = new THREE.Vector3();
  private currentTarget = new THREE.Vector3();
  private shake = 0;
  private shakeTime = 0;
  private smoothedDistance = 7.5;
  private initialised = false;

  sensitivity = 1;
  invertY = false;
  reducedMotion = false;
  shakeEnabled = true;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 600);
    this.camera.position.set(0, 4, 8);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Snap immediately, used after teleporting or entering a building. */
  reset(target: THREE.Vector3, yaw: number, pitch = 0.26): void {
    this.target.copy(target);
    this.currentTarget.copy(target);
    this.yaw = yaw;
    this.pitch = pitch;
    this.initialised = false;
  }

  addShake(amount: number): void {
    if (!this.shakeEnabled || this.reducedMotion) return;
    this.shake = Math.min(1, this.shake + amount);
  }

  update(
    dt: number,
    input: InputManager,
    collision: CollisionWorld | null,
    indoors: boolean,
    room: { width: number; depth: number; height: number } | null = null,
  ): void {
    const lookScale = 0.0032 * this.sensitivity;
    this.yaw -= input.look.x * lookScale;
    this.pitch += input.look.y * lookScale * (this.invertY ? -1 : 1);
    this.pitch = Math.max(-0.35, Math.min(1.15, this.pitch));
    input.clearLook();

    // Indoors the camera pulls in so it does not clip through the ceiling.
    const wanted = indoors ? Math.min(this.distance, 4.2) : this.distance;

    const focus = this.target.clone().add(new THREE.Vector3(0, 1.35, 0));
    const smoothing = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 9);
    this.currentTarget.lerp(focus, this.initialised ? smoothing : 1);

    const dir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );

    let allowed = wanted;
    if (collision) {
      // Step along the boom and stop at the first obstruction.
      const steps = 8;
      for (let i = steps; i >= 1; i--) {
        const d = (wanted * i) / steps;
        const p = this.currentTarget.clone().addScaledVector(dir, d);
        if (!collision.blocked(p.x, p.z, 0.45)) {
          allowed = d;
          break;
        }
        allowed = (wanted * (i - 1)) / steps;
      }
      allowed = Math.max(1.6, allowed);
    }

    // Pulling in must be instant, easing out is fine.
    this.smoothedDistance =
      allowed < this.smoothedDistance
        ? allowed
        : this.smoothedDistance + (allowed - this.smoothedDistance) * Math.min(1, dt * 4);

    const desired = this.currentTarget.clone().addScaledVector(dir, this.smoothedDistance);
    desired.y = Math.max(desired.y, this.currentTarget.y - 1.2);

    // Indoors the boom can slip out through a doorway, so the room itself is
    // the final constraint.
    const confine = (v: THREE.Vector3) => {
      if (!room) return;
      const m = 0.75;
      v.x = Math.min(room.width - m, Math.max(-room.width + m, v.x));
      v.z = Math.min(room.depth - m, Math.max(-room.depth + m, v.z));
      v.y = Math.min(room.height - 0.4, Math.max(0.6, v.y));
    };
    confine(desired);

    if (!this.initialised) {
      this.current.copy(desired);
      this.initialised = true;
    } else {
      this.current.lerp(desired, this.reducedMotion ? 1 : 1 - Math.exp(-dt * 11));
    }
    confine(this.current);

    this.camera.position.copy(this.current);

    if (this.shake > 0.001) {
      this.shakeTime += dt * 34;
      const s = this.shake * 0.22;
      this.camera.position.x += Math.sin(this.shakeTime * 1.7) * s;
      this.camera.position.y += Math.cos(this.shakeTime * 2.3) * s;
      this.shake = Math.max(0, this.shake - dt * 2.6);
    }

    this.camera.lookAt(this.currentTarget);
  }

  /** Direction the player should move for "forward" input. */
  forward(): THREE.Vector3 {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
  }

  /** Screen-right on the ground plane: forward crossed with up. */
  right(): THREE.Vector3 {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
  }
}
