// One shared world definition for rendering, collisions and the adventure.
export const TAU = Math.PI * 2;
export const ISLANDS = [
  { id: 'home', name: 'Das schlafende Herz', x: 0, z: 0, y: 0, r: 10.5, seed: 4 },
  { id: 'garden', name: 'Garten der Klänge', x: -20, z: -3, y: .6, r: 6.6, seed: 8 },
  { id: 'ruins', name: 'Die alten Wächter', x: 20, z: -3, y: .4, r: 6.7, seed: 12 },
  { id: 'wind', name: 'Über den Wolken', x: 0, z: -25, y: 1.8, r: 7.8, seed: 18 },
];
export const BRIDGES = [
  { ax: -8, az: -2, ay: 0, bx: -15, bz: -3, by: .6, width: 2.5 },
  { ax: 8, az: -2, ay: 0, bx: 15, bz: -3, by: .4, width: 2.5 },
];
export const STONES = [
  { x: -.4, z: -11.5, y: .3, r: 1.45, move: 0 },
  { x: .5, z: -14.5, y: .8, r: 1.45, move: 1.1 },
  { x: -.5, z: -17.5, y: 1.3, r: 1.5, move: 0 },
];
export const FLOWERS = [
  { x: -22.5, z: -4.6, y: .6, color: '#ffd66b', name: 'Sonnenblüte' },
  { x: -17.7, z: -5.4, y: .6, color: '#72d5ee', name: 'Himmelsblüte' },
  { x: -20, z: .6, y: .6, color: '#f4a5cb', name: 'Rosenblüte' },
];
export const SHRINES = [
  { id: 'garden', x: -20, z: -3, y: .6, color: '#f5bd55', name: 'Klanglicht' },
  { id: 'ruins', x: 22, z: -5, y: .4, color: '#b7a1ff', name: 'Wächterlicht' },
  { id: 'wind', x: 0, z: -28.4, y: 1.8, color: '#85e6e5', name: 'Windlicht' },
];
export const WIND_ORBS = [
  { x: -3.7, y: 2.55, z: -24.5 },
  { x: .2, y: 3.65, z: -25.7 },
  { x: 3.8, y: 2.55, z: -25.2 },
];
export const GUARDS = [
  { x: 17.9, z: -2.2 }, { x: 22, z: -1.2 }, { x: 20.5, z: -5.2 },
];
export const TREE = { x: 0, y: 0, z: -4 };
export const GUIDE = { x: 2.8, y: 0, z: 4.8 };
export const CHEST = { x: -5.4, y: 0, z: 5.5 };
export const CHECKPOINTS = {
  home: { x: 0, z: 5.2, y: 0 }, garden: { x: -16.3, z: -2.8, y: .6 },
  ruins: { x: 15.8, z: -2.4, y: .4 }, wind: { x: 0, z: -20.4, y: 1.8 },
};
export const OBSTACLES = [
  { x: 0, z: -4, y: 0, r: 1.1 },
  { x: -5.7, z: -.7, y: 0, r: .72 }, { x: 5.9, z: 1.3, y: 0, r: .65 },
  { x: -5.2, z: -5.7, y: 0, r: .65 }, { x: 5.6, z: -5.8, y: 0, r: .72 },
  { x: -23.1, z: -1, y: .6, r: .55 }, { x: -21, z: -7.4, y: .6, r: .55 },
  { x: 17.3, z: -6.8, y: .4, r: .58 }, { x: 24.1, z: -6.8, y: .4, r: .58 },
  { x: -4.3, z: -28.7, y: 1.8, r: .6 }, { x: 4.7, z: -22.5, y: 1.8, r: .6 },
];
export const SEEDS = [
  [-2,3,0],[-3,1,0],[-4,-2,0],[3,-2,0],[4,3,0],[-4.8,5,0],
  [-6.2,5.6,0],[6,-1,0],[-8,-2,0],[8,-2,0],[-17,-.1,.6],[-22,1.2,.6],
  [-23,-3,.6],[-19,-7,.6],[16,0,.4],[23,1,.4],[24,-5,.4],[19,-7,.4],
  [-2,-22,1.8],[3,-22.3,1.8],[-4,-26,1.8],[4,-27,1.8],[2,-30,1.8],[-2,-30,1.8],
].map(([x,z,y], id) => ({ id, x, z, y: y + .65 }));

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function random(seed) {
  let n = seed >>> 0;
  return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function edgeRadius(island, angle) {
  return island.r * (.955 + .028 * Math.sin(angle * 5 + island.seed) + .017 * Math.cos(angle * 9 + island.seed));
}
export function onIsland(island, x, z, margin = 0) {
  return Math.hypot(x - island.x, z - island.z) <= edgeRadius(island, Math.atan2(z - island.z, x - island.x)) - margin;
}
export function stonePosition(stone, time) {
  return { x: stone.x + Math.sin(time * .9) * stone.move, y: stone.y, z: stone.z };
}
export function surfaceAt(x, z, time = 0) {
  let height = -Infinity, id = null, stoneIndex = -1;
  for (const island of ISLANDS) if (onIsland(island, x, z)) { height = island.y; id = island.id; }
  for (const b of BRIDGES) {
    const dx = b.bx - b.ax, dz = b.bz - b.az, l2 = dx * dx + dz * dz;
    const t = ((x - b.ax) * dx + (z - b.az) * dz) / l2;
    if (t >= 0 && t <= 1 && Math.hypot(x - b.ax - t * dx, z - b.az - t * dz) < b.width * .49) {
      const y = b.ay + t * (b.by - b.ay);
      if (y >= height) { height = y; id = 'bridge'; }
    }
  }
  for (let i = 0; i < STONES.length; i++) {
    const s = STONES[i], p = stonePosition(s, time);
    if (Math.hypot(x - p.x, z - p.z) < s.r && p.y > height) { height = p.y; id = 'stone'; stoneIndex = i; }
  }
  return { height, id, stoneIndex };
}
