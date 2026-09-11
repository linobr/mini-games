import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, RUN_LENGTH } from '../public/rift-relay/src/engine.js';
import { FixedClock, Pool, ARENA_RADIUS } from '../public/rift-relay/src/math.js';
import { Storage, STORAGE_KEY } from '../public/rift-relay/src/storage.js';

const idle = { x: 0, y: 0, dash: false };
test('standalone navigation preserves the GitHub Pages repository prefix', () => {
  const html = readFileSync(new URL('../public/rift-relay/index.html', import.meta.url), 'utf8');
  const back = html.match(/class="back" href="([^"]+)"/)[1];
  for (const path of ['/mini-games/rift-relay/', '/mini-games/rift-relay/index.html'])
    assert.equal(new URL(back, 'https://example.com' + path).pathname, '/mini-games/');
});
function emptyGame() {
  const g = new Game(); g.enemies.clear(); g.spawnClock = 999; return g;
}
function advance(g, seconds, input = idle) {
  for (let i = 0; i < Math.round(seconds * 120); i++) { g.step(1 / 120, input); g.events.length = 0; }
}

test('fixed clock produces identical simulation at 30, 60, 120 and 144 Hz', () => {
  const states = [];
  for (const fps of [30, 60, 120, 144]) {
    const game = new Game(), timer = new FixedClock();
    game.reset(20260911, 'daily'); game.player.invulnerable = 1000;
    for (let frame = 0; frame < fps * 12; frame++) timer.tick(1 / fps, dt => {
      game.step(dt, { x: Math.cos(game.time), y: Math.sin(game.time), dash: false }); game.events.length = 0;
    });
    states.push(JSON.stringify({ p: game.player, time: game.time, enemies: game.enemies.items, bullets: game.bullets.items }));
  }
  for (const state of states) assert.equal(state, states[0]);
});

test('a long frame is clamped, reset discards pending time, and stopped runs do not catch up', () => {
  const timer = new FixedClock(); let ticks = 0;
  timer.tick(8, () => { ticks++; }); assert.equal(ticks, 12);
  timer.tick(.004, () => ticks++); timer.reset(); timer.tick(.004, () => ticks++); assert.equal(ticks, 12);
  timer.tick(.1, () => { ticks++; return false; }); assert.equal(ticks, 13); assert.equal(timer.accumulator, 0);
});

test('dash captures a fast crossing bullet and prevents damage', () => {
  const g = emptyGame(); g.player.x = 0; g.player.y = 0;
  const b = g.bullet(60, 0, Math.PI, 1800);
  g.step(1 / 30, { x: 1, y: 0, dash: true });
  assert.equal(b.friendly, true); assert.equal(g.player.hp, 3); assert.equal(g.reflected, 1);
  assert.ok(g.score >= 25); assert.ok(g.player.x > 25);
});

test('return projectiles home towards a sender and can destroy it', () => {
  const g = emptyGame();
  const e = g.enemies.acquire({ x: 170, y: 0, type: 'sender', radius: 14, hp: 1, maxHp: 2, age: 2, fire: 999, angle: 0, flash: 0, hitDash: -1 });
  g.bullet(0, 0, Math.PI / 2, 100, true);
  advance(g, 1);
  assert.equal(e.active, false); assert.equal(g.kills, 1); assert.ok(g.score >= 100);
});

test('dash cannot be spammed during cooldown', () => {
  const g = emptyGame();
  assert.equal(g.dash({ x: 1, y: 0 }), true);
  assert.equal(g.dash({ x: 0, y: 1 }), false);
  advance(g, .5); assert.equal(g.dash({ x: 0, y: 1 }), false);
  advance(g, .5); assert.equal(g.dash({ x: 0, y: 1 }), true);
});

test('damage clears combo and grants a real invulnerability window', () => {
  const g = emptyGame(); for (let i = 0; i < 20; i++) g.reward(25, 0, 0);
  assert.equal(g.combo, 5); g.damage(); assert.equal(g.player.hp, 2); assert.equal(g.combo, 1);
  g.damage(); assert.equal(g.player.hp, 2);
  advance(g, 1.8); g.damage(); assert.equal(g.player.hp, 1);
});

test('a near miss scores at most once for each hostile bullet', () => {
  const g = emptyGame(); const p = g.player;
  g.bullet(p.x + 22, p.y - 60, Math.PI / 2, 100);
  advance(g, 1.5); assert.equal(g.nearMisses, 1); assert.equal(g.score, 15);
  assert.equal(p.hp, 3);
});

test('incoming hits and stationary close bullets do not count as near misses', () => {
  const g = emptyGame();
  g.bullet(g.player.x + 22, g.player.y, 0, 0);
  advance(g, .5); assert.equal(g.nearMisses, 0);
  g.bullet(g.player.x, g.player.y - 70, Math.PI / 2, 200);
  advance(g, .5); assert.equal(g.nearMisses, 0); assert.equal(g.player.hp, 2);
});

test('combo expires and hiding grants no passive score', () => {
  const g = emptyGame(); for (let i = 0; i < 30; i++) g.reward(25, 0, 0);
  const score = g.score; advance(g, 5);
  assert.equal(g.combo, 1); assert.equal(g.chain, 0); assert.equal(g.score, score);
});

test('diagonal movement is normalized and the arena clamps dash movement', () => {
  const horizontal = emptyGame(), diagonal = emptyGame();
  advance(horizontal, .4, { x: 1, y: 0, dash: false });
  advance(diagonal, .4, { x: 1, y: 1, dash: false });
  const a = Math.hypot(horizontal.player.x, horizontal.player.y - 100);
  const b = Math.hypot(diagonal.player.x, diagonal.player.y - 100);
  assert.ok(Math.abs(a - b) < 1e-8);
  horizontal.player.x = ARENA_RADIUS - 16; horizontal.player.y = 0;
  advance(horizontal, .4, { x: 1, y: 0, dash: true });
  assert.ok(Math.hypot(horizontal.player.x, horizontal.player.y) <= ARENA_RADIUS - 13 + 1e-8);
});

test('rift transitions clear hostile bullets, protect the player and spawn a core', () => {
  const g = emptyGame(); g.time = 60 - 1 / 240; g.bullet(10, 10, 0, 100);
  g.step(1 / 120, idle);
  assert.equal(g.phase, 1); assert.equal(g.bullets.count, 0); assert.ok(g.player.invulnerable > 2);
  assert.equal(g.enemies.items.filter(e => e.active && e.type === 'core').length, 1);
  g.time = 120 - 1 / 240; g.step(1 / 120, idle);
  assert.equal(g.phase, 2); assert.equal(g.enemies.items.filter(e => e.active && e.type === 'core').length, 1);
});

test('pulse-ring gap is safe; outside it a dash scores or a hit damages', () => {
  function waveCase(angle, dash) {
    const g = emptyGame(); g.player.x = Math.cos(angle) * 100; g.player.y = Math.sin(angle) * 100;
    g.waves.acquire({ radius: 95, previous: 95, warning: 0, gap: 0, scored: false, hit: false });
    g.step(1 / 120, { x: Math.cos(angle), y: Math.sin(angle), dash }); return g;
  }
  assert.equal(waveCase(0, false).player.hp, 3);
  assert.equal(waveCase(Math.PI, false).player.hp, 2);
  const dash = waveCase(Math.PI, true); assert.equal(dash.player.hp, 3); assert.equal(dash.score, 150);
});

test('a core destruction repairs the hull and converts remaining energy', () => {
  const g = emptyGame(); g.phase = 1; g.spawnEnemy(true); g.player.hp = 1;
  const b = g.bullet(100, 100, 0, 50);
  const core = g.enemies.items.find(e => e.active); g.destroy(core);
  assert.equal(g.player.hp, 2); assert.equal(b.friendly, true); assert.equal(g.coreDefeated, 1);
});

test('full three-minute stress run stays finite and within all fixed capacities', () => {
  const g = new Game(); g.reset(20260911); g.player.invulnerable = 1000;
  const maximum = { bullets: 0, enemies: 0, waves: 0 };
  for (let i = 0; i < 21610 && g.alive; i++) {
    const t = g.time;
    g.player.invulnerable = 1000;
    g.step(1 / 120, { x: Math.cos(t * .5), y: Math.sin(t * .7), dash: i % 130 === 0 });
    assert.ok(Number.isFinite(g.score + g.player.x + g.player.y));
    for (const key of Object.keys(maximum)) maximum[key] = Math.max(maximum[key], g[key].count);
    assert.ok(g.events.length <= 96); g.events.length = 0;
  }
  assert.equal(g.won, true); assert.equal(g.time, RUN_LENGTH); assert.equal(g.phase, 2);
  assert.ok(maximum.bullets <= 260); assert.ok(maximum.enemies <= 18); assert.ok(maximum.waves <= 4);
  assert.ok(g.score > 3000); assert.ok(g.reflected > 0);
});

test('same daily seed and inputs replay identically through multiple resets', () => {
  const g = new Game(); let expected;
  const references = [g.bullets.items, g.enemies.items, g.pickups.items];
  for (let run = 0; run < 12; run++) {
    g.reset(20260911, 'daily'); g.player.invulnerable = 100;
    for (let i = 0; i < 2400; i++) {
      g.step(1 / 120, { x: Math.cos(i / 300), y: Math.sin(i / 300), dash: i % 140 === 0 }); g.events.length = 0;
    }
    const snapshot = JSON.stringify({ p: g.player, score: g.score, kills: g.kills, time: g.time, bullets: g.bullets.items, enemies: g.enemies.items });
    if (run === 0) expected = snapshot; else assert.equal(snapshot, expected);
    assert.equal(g.bullets.items, references[0]); assert.equal(g.enemies.items, references[1]); assert.equal(g.pickups.items, references[2]);
  }
});

test('pool saturation drops new objects and reuses released slots', () => {
  const pool = new Pool(2); const first = pool.acquire({ x: 1 }); pool.acquire({ x: 2 });
  assert.equal(pool.acquire({ x: 3 }), null); assert.equal(pool.count, 2);
  first.active = false; assert.equal(pool.acquire({ x: 4 }), first); pool.clear(); assert.equal(pool.count, 0);
});

test('blocked or corrupt localStorage does not break play or session records', () => {
  const broken = new Storage({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
  assert.equal(broken.available, false);
  const g = emptyGame(); g.time = 50; g.score = 1200; g.firstHitTime = 46;
  broken.record(g, '2026-09-11'); assert.equal(broken.data.best, 1200); assert.equal(broken.data.runs, 1);
  const corrupt = new Storage({ getItem: () => '{broken', setItem() {} }); assert.equal(corrupt.data.best, 0);
});

test('stored values are validated; settings, unlocks and daily best persist', () => {
  const values = new Map([[STORAGE_KEY, JSON.stringify({ best: -300, skin: 'frost', achievements: ['invented'], settings: { master: 400, music: 'bad', quality: 'ultra', muted: 'yes' } })]]);
  const backing = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const s = new Storage(backing); assert.equal(s.data.best, 0); assert.equal(s.data.settings.master, 100);
  assert.equal(s.data.skin, 'ion'); assert.equal(s.data.settings.quality, 'auto'); assert.equal(s.data.settings.muted, false);
  const g = emptyGame(); g.time = 180; g.score = 15000; g.bestCombo = 9; g.reflected = 25; g.firstHitTime = 80; g.won = true; g.mode = 'daily';
  const result = s.record(g, '2026-09-11'); assert.equal(result.highscore, true);
  const reopened = new Storage(backing); assert.equal(reopened.data.best, 15000); assert.equal(reopened.data.daily['2026-09-11'], 15000);
  assert.ok(reopened.data.achievements.includes('complete')); assert.ok(reopened.data.achievements.includes('clean'));
});
