export const TAU = Math.PI * 2;
export const ARENA_RADIUS = 330;
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const distance = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

export class FixedClock {
  constructor(step = 1 / 120, maximum = .1) { this.step = step; this.maximum = maximum; this.accumulator = 0; }
  reset() { this.accumulator = 0; }
  tick(elapsed, update) {
    this.accumulator = Math.min(this.maximum, this.accumulator + clamp(elapsed, 0, this.maximum));
    while (this.accumulator + 1e-10 >= this.step) {
      this.accumulator = Math.max(0, this.accumulator - this.step);
      if (update(this.step) === false) { this.reset(); break; }
    }
  }
}

// Fixed-capacity pools keep long runs and repeated restarts bounded.
export class Pool {
  constructor(size) {
    this.items = Array.from({ length: size }, () => ({ active: false }));
    this.cursor = 0;
  }
  acquire(values) {
    for (let i = 0; i < this.items.length; i++) {
      const index = (this.cursor + i) % this.items.length;
      const item = this.items[index];
      if (!item.active) {
        Object.assign(item, values, { active: true });
        this.cursor = (index + 1) % this.items.length;
        return item;
      }
    }
    return null;
  }
  clear() { for (const item of this.items) item.active = false; this.cursor = 0; }
  get count() { let count = 0; for (const item of this.items) if (item.active) count++; return count; }
}
