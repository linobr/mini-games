import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfile, recordOpen, toggleFavorite, progress, selectGames, recommendedGames, loadProfile, persistProfile } from '../src/nexus-model.js';
import { normalizeInterface, PREFERENCE_KEY } from '../src/interface-switch.js';
import { injectLiveGame } from '../scripts/inject-live-game.mjs';
import { readFileSync } from 'node:fs';
test('interface preference validates values without changing its existing key', () => {
  assert.equal(PREFERENCE_KEY, 'mini-games:interface');
  for (const x of ['nexus', null, 'bad', {}]) assert.equal(normalizeInterface(x), 'nexus');
  assert.equal(normalizeInterface('original'), 'original');
});
test('profile normalizes corrupt storage, limits values, ignores unknown games', () => {
  const p = normalizeProfile({ name: '<script>'.repeat(20), avatar: 'invalid', stats: { bad: { opens: 4 }, berggarten: { opens: -1 }, meteor: { opens: 4.7, lastOpened: Infinity } }, favorites: ['meteor', 'meteor', 'unknown', '__proto__'] });
  assert.equal(p.name.length, 24); assert.deepEqual(p.favorites, ['meteor']); assert.deepEqual(p.stats, { meteor: { opens: 4, lastOpened: 0 } });
  const blocked = { getItem() { throw Error(); }, setItem() { throw Error(); } };
  assert.equal(loadProfile(blocked).name, 'Spieler'); assert.equal(persistProfile(blocked, p), false);
});
test('favorites and actual opening history survive storage round trips', () => {
  let value; const storage = { getItem: () => value, setItem: (_, v) => { value = v; } };
  let p = recordOpen(normalizeProfile(null), 'meteor', 1000); p = toggleFavorite(p, 'meteor');
  assert.equal(persistProfile(storage, p), true); assert.deepEqual(loadProfile(storage), p);
  assert.deepEqual(toggleFavorite(p, 'meteor').favorites, []); assert.deepEqual(toggleFavorite(p, 'unknown'), p);
});
test('XP is earned once per distinct opening, no fabricated time or wins', () => {
  let p = normalizeProfile(null); assert.equal(progress(p).xp, 0);
  for (let i = 0; i < 20; i++) p = recordOpen(p, 'meteor', 1000 + i);
  assert.equal(progress(p).xp, 25); assert.equal(progress(p).opens, 20);
  p = recordOpen(p, 'berggarten', 2000); assert.equal(progress(p).xp, 50);
  assert.deepEqual(recordOpen(p, '__proto__'), p);
  assert.equal(progress(p).achievements[2].value, 2);
});
const games = [
  { id: 'meteor', title: 'Meteor Run', description: 'Ausweichen', category: 'Arcade' },
  { id: 'berggarten', title: 'Berggarten', description: 'Alpental', category: 'Aufbau' },
  { id: 'neon', title: 'Neon Defender', description: 'Survival', category: 'Arcade' },
];
test('search, categories, favorites and sorting compose without mutating catalog', () => {
  const p = toggleFavorite(recordOpen(normalizeProfile(null), 'meteor', 1000), 'neon');
  assert.deepEqual(selectGames(games, p, { query: '  ALPEN ' }).map(g => g.id), ['berggarten']);
  assert.deepEqual(selectGames(games, p, { category: 'Arcade', favorites: true }).map(g => g.id), ['neon']);
  assert.equal(selectGames(games, p, { sort: 'title' })[0].id, 'berggarten');
  assert.equal(selectGames(games, p, { sort: 'recent' })[0].id, 'meteor');
  assert.equal(games[0].id, 'meteor'); assert.equal(recommendedGames(games, p)[0].id, 'neon');
});
test('live injection accepts reordered attributes and extra classes; is idempotent', () => {
  const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const html = source.replace('class="game-grid" id="game-grid"', 'data-test="x" id="game-grid" class="game-grid extra"');
  const injected = injectLiveGame(html); assert.match(injected, /href="\.\/ki-mooslicht\/"/);
  assert.equal(injectLiveGame(injected), injected);
  assert.throws(() => injectLiveGame(source.replace('id="game-grid"', 'id="missing"')), /grid not found/);
  assert.throws(() => injectLiveGame(source.replaceAll('mooslicht-card', 'missing')), /Mooslicht card not found/);
});
