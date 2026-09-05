/**
 * Axis-aligned collision for the walkable world. Characters are treated as
 * circles and pushed out of boxes along the axis of least penetration, which
 * is cheap, stable, and enough for a walk-around game.
 */

export interface BoxCollider {
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  /** Optional label, useful when debugging. */
  id?: string;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class CollisionWorld {
  private boxes: BoxCollider[] = [];
  private bounds: Bounds = { minX: -1e6, maxX: 1e6, minZ: -1e6, maxZ: 1e6 };
  /** Uniform grid so we only test nearby colliders. */
  private grid = new Map<string, BoxCollider[]>();
  private cell = 16;

  setBounds(b: Bounds): void {
    this.bounds = b;
  }

  add(box: BoxCollider): void {
    this.boxes.push(box);
    const minCx = Math.floor((box.x - box.halfW) / this.cell);
    const maxCx = Math.floor((box.x + box.halfW) / this.cell);
    const minCz = Math.floor((box.z - box.halfD) / this.cell);
    const maxCz = Math.floor((box.z + box.halfD) / this.cell);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = `${cx},${cz}`;
        const list = this.grid.get(key);
        if (list) list.push(box);
        else this.grid.set(key, [box]);
      }
    }
  }

  clear(): void {
    this.boxes = [];
    this.grid.clear();
  }

  get count(): number {
    return this.boxes.length;
  }

  private near(x: number, z: number, r: number): BoxCollider[] {
    const out: BoxCollider[] = [];
    const minCx = Math.floor((x - r) / this.cell);
    const maxCx = Math.floor((x + r) / this.cell);
    const minCz = Math.floor((z - r) / this.cell);
    const maxCz = Math.floor((z + r) / this.cell);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const list = this.grid.get(`${cx},${cz}`);
        if (!list) continue;
        for (const b of list) if (!out.includes(b)) out.push(b);
      }
    }
    return out;
  }

  /**
   * Moves a circle from its current position by (dx, dz), sliding along walls.
   * Returns the resolved position.
   */
  move(x: number, z: number, dx: number, dz: number, radius: number): { x: number; z: number; hit: boolean } {
    let nx = x + dx;
    let nz = z + dz;
    let hit = false;

    // Two relaxation passes settle corners without a full physics solver.
    for (let pass = 0; pass < 2; pass++) {
      for (const b of this.near(nx, nz, radius + 2)) {
        const px = b.halfW + radius - Math.abs(nx - b.x);
        if (px <= 0) continue;
        const pz = b.halfD + radius - Math.abs(nz - b.z);
        if (pz <= 0) continue;
        hit = true;
        if (px < pz) nx += nx < b.x ? -px : px;
        else nz += nz < b.z ? -pz : pz;
      }
    }

    nx = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, nx));
    nz = Math.min(this.bounds.maxZ, Math.max(this.bounds.minZ, nz));
    return { x: nx, z: nz, hit };
  }

  /** True when a circle at this position overlaps anything. */
  blocked(x: number, z: number, radius: number): boolean {
    for (const b of this.near(x, z, radius + 1)) {
      if (Math.abs(x - b.x) < b.halfW + radius && Math.abs(z - b.z) < b.halfD + radius) return true;
    }
    return false;
  }

  /** Nudges a point to the nearest free spot, used when loading a save. */
  findFreeSpot(x: number, z: number, radius: number): { x: number; z: number } {
    if (!this.blocked(x, z, radius)) return { x, z };
    for (let r = 1; r <= 12; r++) {
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        const tx = x + Math.cos(ang) * r * 1.5;
        const tz = z + Math.sin(ang) * r * 1.5;
        if (!this.blocked(tx, tz, radius)) return { x: tx, z: tz };
      }
    }
    return { x, z };
  }
}
