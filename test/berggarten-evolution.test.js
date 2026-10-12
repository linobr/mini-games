import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fresh, restore, tick, buy, deposit, capacity, count, findPath, exportSave, importSave, RECIPES, craft, nodes } from '../src/berggarten/engine.js';
import { placeBuilding, upgradeBuilding, startProduction, claimQuest, PLOTS, buildingAt } from '../src/berggarten/evolution.js';
import { loadGarden, SAVE_KEY, BACKUP_KEY } from '../src/berggarten/storage.js';
const funded = () => { const s = fresh(); s.coins = 10000; for (const k in s.stock) s.stock[k] = 100; return s; };
test('building placement respects region, occupied plots and exact costs', () => {
  const s = funded(); assert.equal(placeBuilding(s, 'sawmill', 'forest'), false);
  assert.equal(placeBuilding(s, 'stoneworks', 'home'), false); assert.equal(placeBuilding(s, '__proto__', 'home'), false);
  assert.equal(placeBuilding(s, 'sawmill', 'home'), true); assert.equal(s.coins, 9880); assert.equal(s.stock.bush, 92); assert.equal(s.stock.rock, 96);
  const saved = JSON.stringify(s); assert.equal(placeBuilding(s, 'sawmill', 'home'), false); assert.equal(JSON.stringify(s), saved);
  assert.equal(buildingAt(s, 1, 13), true); assert.equal(findPath(s, { x: 4, y: 7 }, { x: 1, y: 13 }), null);
});
test('production deducts inputs once and resumes interrupted jobs exactly once', () => {
  const s = funded(); placeBuilding(s, 'sawmill', 'home'); assert.equal(startProduction(s, 'home', RECIPES), true);
  assert.equal(s.stock.bush, 89); assert.equal(startProduction(s, 'home', RECIPES), false);
  assert.equal(upgradeBuilding(s, 'home'), false); tick(s, 2);
  const r = restore(JSON.stringify(s)); tick(r, 3); assert.equal(r.stock.plank, 101); assert.equal(r.buildings[0].job, null); tick(r, 30); assert.equal(r.stock.plank, 101);
});
test('automatic production consumes finite resources, cannot create infinite output', () => {
  const s = funded(); placeBuilding(s, 'sawmill', 'home'); s.stock.bush = 9; s.stock.plank = 0; s.buildings[0].auto = true;
  tick(s, 10000); assert.equal(s.stock.bush, 0); assert.equal(s.stock.plank, 3); assert.equal(s.crafted, 3); assert.equal(s.buildings[0].job, null);
  tick(s, Infinity); tick(s, NaN); tick(s, -100); assert.equal(s.stock.plank, 3); assert.ok(Number.isFinite(s.dayClock));
});
test('full warehouse pauses output without losing input or duplicating products', () => {
  const s = funded(); placeBuilding(s, 'sawmill', 'home'); startProduction(s, 'home', RECIPES); s.stock.plank = 5000;
  tick(s, 30); assert.equal(s.stock.plank, 5000); assert.equal(s.buildings[0].job.remaining, 0);
  s.stock.plank--; tick(s, 1); assert.equal(s.stock.plank, 5000); assert.equal(s.buildings[0].job, null);
  s.inventory.bush = 10; s.stock.bush = 4997; assert.equal(deposit(s), 3); assert.equal(s.stock.bush, 5000); assert.equal(s.inventory.bush, 7);
});
test('upgrades cap at three, quests grant a reward once after actual progress', () => {
  const s = funded(); assert.equal(claimQuest(s, 'builder'), 0); placeBuilding(s, 'sawmill', 'home');
  assert.equal(claimQuest(s, 'builder'), 60); assert.equal(claimQuest(s, 'builder'), 0);
  assert.equal(upgradeBuilding(s, 'home'), true); assert.equal(s.buildings[0].level, 2); assert.equal(claimQuest(s, 'upgrade'), 80);
  upgradeBuilding(s, 'home'); assert.equal(upgradeBuilding(s, 'home'), false);
  const r = restore(JSON.stringify(s)); assert.equal(claimQuest(r, 'builder'), 0); assert.equal(claimQuest(r, 'upgrade'), 0);
});
test('extended regions preserve old node IDs, connect paths and unlock useful recipes', () => {
  const s = funded(); for (let i = 0; i < 4; i++) assert.equal(buy(s, 'zone'), true);
  assert.equal(buy(s, 'zone'), false); assert.ok(findPath(s, { x: 4, y: 7 }, { x: 28, y: 7 }));
  assert.ok(s.nodes.some(n => n.zone === 3 && n.type === 'bush')); assert.ok(s.nodes.some(n => n.zone === 4 && n.type === 'crystal'));
  for (const n of s.nodes.filter(n => n.x < 18)) assert.equal(n.id, n.y * 18 + n.x);
  assert.equal(new Set(s.nodes.map(n => n.id)).size, s.nodes.length);
  // The original garden keeps its old resource at the entrance; harvest it to open the route.
  s.nodes.find(n => n.x === 9 && n.y === 5).ready = Date.now() + 30000;
  for (const p of PLOTS) assert.ok(findPath(s, { x: 4, y: 7 }, p));
  assert.equal(placeBuilding(s, 'alpineworks', 'alpine'), true); const before = s.stock.plank;
  startProduction(s, 'alpine', RECIPES); tick(s, 20); assert.equal(s.stock.plank, before - 2); assert.equal(s.stock.kit, 101);
});
test('migration preserves legacy contents and backups; malformed entries cannot reset whole save', () => {
  const old = { version: 2, coins: 345, inventory: { bush: 3 }, stock: { gem: 12 }, nodes: [null, { id: 0, hp: 1 }], claimed: ['first'] };
  const r = restore(JSON.stringify(old)); assert.equal(r.coins, 345); assert.equal(r.stock.gem, 12); assert.equal(r.nodes[0].hp, 1); assert.deepEqual(r.buildings, []);
  const map = new Map([[SAVE_KEY, JSON.stringify(old)]]), storage = { getItem: k => map.get(k), setItem: (k, v) => map.set(k, v) };
  assert.equal(loadGarden(storage).writable, true); assert.equal(map.get(BACKUP_KEY), JSON.stringify(old));
  map.set(SAVE_KEY, '{bad'); assert.equal(loadGarden(storage).writable, false);
  map.set(SAVE_KEY, '{"version":99}'); assert.equal(loadGarden(storage).writable, false);
});
test('corrupt inventories, duplicate plots, unsafe job times and prototype keys are rejected', () => {
  const s = fresh(); s.workshop = 1; s.job = { kind: '__proto__', remaining: -4 }; s.inventory = { bush: 1e9, rock: 1e9 }; s.nodes = [null];
  s.buildings = [{ kind: 'sawmill', plot: 'home', level: 9, auto: 'yes', job: { kind: 'plank', remaining: '0' } }, { kind: 'sawmill', plot: 'home' }, { kind: '__proto__', plot: 'garden' }];
  const r = restore(JSON.stringify(s)); assert.equal(count(r), capacity(r)); assert.equal(r.job, null); assert.equal(r.buildings.length, 1); assert.equal(r.buildings[0].level, 3); assert.equal(r.buildings[0].auto, false); assert.equal(r.buildings[0].job.remaining, 5 / 3);
});
test('export/import validates format, preserves rewards and does not replay offline progress', () => {
  const s = funded(); placeBuilding(s, 'sawmill', 'home'); claimQuest(s, 'builder'); s.lastSeen = 1;
  const r = importSave(exportSave(s)); assert.equal(r.coins, s.coins); assert.deepEqual(r.buildings, s.buildings); assert.deepEqual(r.quests, s.quests); assert.ok(r.lastSeen > 1);
  for (const text of ['null', '{}', '{bad', JSON.stringify({ format: 'berggarten-save', version: 1, state: { version: 99 } })]) assert.throws(() => importSave(text));
});
test('save lock writes before release and prevents stale cached pages from writing again', async () => {
  const { acquireSaveLock, hasSaveLock } = await import('../src/berggarten/storage.js');
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const target = new EventTarget(); let releaseTask;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: target });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request(_name, _options, fn) { releaseTask = fn({}); return releaseTask; } } } });
  try {
    let savedWhileOwned = false;
    target.addEventListener('berggarten-before-unlock', () => { savedWhileOwned = hasSaveLock(); });
    assert.equal(await acquireSaveLock(), true); assert.equal(hasSaveLock(), true);
    target.dispatchEvent(new Event('pagehide')); await releaseTask;
    assert.equal(savedWhileOwned, true); assert.equal(hasSaveLock(), false);
  } finally {
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator); else delete globalThis.navigator;
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else delete globalThis.window;
  }
});
