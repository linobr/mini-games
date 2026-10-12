import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
function worker() {
  const events = {}, removed = [], fetched = [], added = [];
  const cache = { addAll: async urls => added.push(...urls), match: async url => ({ cached: url }) };
  const context = vm.createContext({ URL, self: { location: { href: 'https://example.test/mini-games/sw.js' }, addEventListener: (n, f) => { events[n] = f; } }, caches: { open: async () => cache, keys: async () => ['unrelated', 'mini-games-build-old', 'mini-games-build-test'], delete: async k => removed.push(k) }, fetch: async r => fetched.push(r) });
  vm.runInContext(readFileSync(new URL('../scripts/sw-template.js', import.meta.url), 'utf8').replace('__BUILD_VERSION__', 'test').replace('__PRECACHE_URLS__', '["index.html","berggarten/index.html","assets/app.js"]'), context);
  return { events, removed, fetched, added };
}
test('PWA precache stays inside Pages base and only removes its own obsolete caches', async () => {
  const w = worker(); let pending;
  w.events.install({ waitUntil: p => { pending = p; } }); await pending;
  assert.ok(w.added.every(url => url.startsWith('https://example.test/mini-games/')));
  assert.equal(w.added.length, 3);
  w.events.activate({ waitUntil: p => { pending = p; } }); await pending;
  assert.deepEqual(w.removed, ['mini-games-build-old']);
});
test('PWA serves one build, accepts invitation queries and ignores external/API/POST traffic', async () => {
  const w = worker(); let response;
  w.events.fetch({ request: { method: 'GET', url: 'https://example.test/mini-games/?room=ABC123' }, respondWith: p => { response = p; } });
  assert.equal((await response).cached, 'https://example.test/mini-games/index.html');
  for (const [method, url] of [['POST', 'https://example.test/mini-games/'], ['GET', 'https://peerjs.example/signal'], ['GET', 'https://example.test/other/'], ['GET', 'https://example.test/mini-games/unknown']]) {
    w.events.fetch({ request: { method, url }, respondWith() { assert.fail('Unrelated request intercepted'); } });
  }
  assert.deepEqual(w.fetched, []);
});
test('manifest has relative Pages scope and locally available installation icons', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url)));
  assert.equal(manifest.start_url, './'); assert.equal(manifest.scope, './');
  for (const icon of manifest.icons) assert.ok(readFileSync(new URL('../public/' + icon.src, import.meta.url)).length > 0);
});
