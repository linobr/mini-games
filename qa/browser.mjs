// Run against the production preview: node qa/browser.mjs [base URL]
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { fresh, exportSave } from '../src/berggarten/engine.js';
const runtime = process.env.NEXUS_QA_NODE_MODULES;
const { chromium, webkit, devices } = await import(runtime ? pathToFileURL(`${runtime}/playwright/index.mjs`).href : 'playwright');
const base = process.argv[2] || 'http://127.0.0.1:4173/mini-games/';
let server;
if (process.env.NEXUS_QA_SERVE) {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
  process.on('exit', () => server.kill());
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
}
const results = [];
for (const engine of (process.env.NEXUS_QA_ENGINES === 'chromium' ? [chromium] : [chromium, webkit])) {
  const options = { headless: true, ...(engine === chromium ? { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {}) };
  if (engine === chromium && process.env.NEXUS_QA_CHROMIUM) { options.executablePath = process.env.NEXUS_QA_CHROMIUM; options.args = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']; }
  const browser = await engine.launch(options);
  const context = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base); await page.locator('#nx-cards .nx-card').first().waitFor();
  assert.equal(await page.locator('#nx-cards .nx-card').count(), 10);console.log(engine.name()+': launcher loaded');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.locator('#nx-search').fill('Berggarten'); assert.equal(await page.locator('#nx-cards .nx-card').count(), 1);
  await page.locator('.nx-favorite').first().click();
  await page.locator('#nx-search').fill(''); await page.locator('#nx-favorites').click(); assert.equal(await page.locator('#nx-cards .nx-card').count(), 1);
  await page.reload(); await page.locator('#nx-favorites').click(); assert.equal(await page.locator('#nx-cards .nx-card').count(), 1);
  await page.locator('#nx-favorites').click();
  await page.locator('#nx-category').selectOption('Lernen'); assert.equal(await page.locator('#nx-cards .nx-card').count(), 1);
  await page.locator('#nx-category').selectOption('');
  await page.locator('[data-game="tictactoe"] .nx-more').click(); assert.equal(await page.locator('#nx-detail').evaluate(d => d.open), true);
  await page.locator('#nx-detail .nx-primary').click(); await page.locator('#start-local').click(); await page.locator('.cell').first().click(); assert.match(await page.locator('.cell').first().textContent(), /X/);
  await page.locator('#brand-button').click();
  await page.locator('[data-interface-option="original"]').click(); assert.equal(await page.locator('#game-grid').isVisible(), true);
  await page.reload(); assert.equal(await page.locator('html').getAttribute('data-interface'), 'original');
  await page.locator('#open-color-clash').click(); await page.locator('#brand-button').click();
  await page.locator('[data-interface-option="nexus"]').click();
  await page.locator('#nx-profile-open').click(); await page.locator('#nx-name').fill('Lino Test'); await page.locator('#nx-avatar').selectOption('⛰'); await page.locator('#nx-muted').check(); await page.locator('#nx-profile-form button').click();
  await page.locator('#nx-profile .nx-close').click(); await page.reload(); assert.match(await page.locator('#nx-greeting').textContent(), /Lino Test/);
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('mini-games:nexus-profile:v1'))); assert.equal(profile.muted, true); assert.equal(profile.stats.tictactoe.opens, 1);
  await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `/tmp/nexus-${engine.name()}-mobile.png` });
  console.log(engine.name()+': launcher interactions passed');
  // Use a real v2 save and confirm migration, playable input, production, import and tab exclusion.
  const old = fresh(); old.version = 2; old.coins = 10000; old.zones = 3; old.workshop = 1; old.stock.bush = 30; old.stock.rock = 30;
  delete old.buildings; delete old.quests;
  await page.evaluate(s => localStorage.setItem('berggarten-save-v1', JSON.stringify(s)), old);
  await page.goto(`${base}berggarten/`); await page.locator('#loading').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('berggarten-save-v1')).version), 3);
  assert.ok(await page.evaluate(() => localStorage.getItem('berggarten-save-before-evolution')));
  console.log(engine.name()+': migration passed');
  await page.locator('#build-place').click(); await page.locator('[data-auto]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('berggarten-save-v1')).stock.plank >= 1, { timeout: 15000 });
  await page.locator('[data-auto]').click();
  await page.locator('#tab-world').click(); await page.locator('#buy-zone').click(); await page.locator('#buy-zone').click();
  await page.locator('#game').click({ position: { x: 180, y: 230 } }); await page.keyboard.press('ArrowRight');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const second = await context.newPage(); await second.goto(`${base}berggarten/`); await second.waitForFunction(() => document.getElementById('loading').textContent.includes('anderen Tab')); await second.close();
  await page.screenshot({ path: `/tmp/berggarten-${engine.name()}-mobile.png`, fullPage: true });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('berggarten-save-v1'))); assert.equal(saved.zones, 5); assert.equal(saved.buildings.length, 1);
  console.log(engine.name()+': production passed');
  await page.reload(); await page.locator('#loading').waitFor({ state: 'hidden' }); assert.equal(await page.locator('.building-item').count(), 1);
  await page.locator('summary').filter({ hasText: 'Spielstand sichern' }).click();
  const downloadPromise = page.waitForEvent('download'); await page.locator('#export-save').click(); assert.equal((await downloadPromise).suggestedFilename(), 'berggarten-spielstand.json');
  page.once('dialog', d => d.accept());
  await page.locator('#import-save').setInputFiles({ name: 'save.json', mimeType: 'application/json', buffer: Buffer.from(exportSave(saved)) });
  await page.waitForFunction(() => document.getElementById('toast').textContent.includes('importiert'));
  await page.locator('header .back').click(); await page.locator('#nx-cards').waitFor();
  assert.deepEqual(errors, []);
  results.push(`${engine.name()}: mobile launcher, original, profile, local round, v2 migration, production, five regions, export/import, tab exclusion PASS`);
  await context.close();
  if (engine === chromium) {
    // Force Canvas fallback independently of the browser's GPU configuration.
    const fallback = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
    await fallback.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return kind.includes('webgl') ? null : original.call(this, kind, ...args); }; });
    const p = await fallback.newPage(); p.on('pageerror', e => errors.push(e.message)); await p.goto(`${base}berggarten/`); await p.locator('#loading').waitFor({ state: 'hidden' }); await p.locator('#start-playing').click(); await p.locator('#game').click({ position: { x: 350, y: 200 } });
    await p.screenshot({ path: '/tmp/berggarten-canvas.png' }); assert.deepEqual(errors, []); await fallback.close(); results.push('Canvas fallback PASS');
    const offline = await browser.newContext(); const pwa = await offline.newPage(); await pwa.goto(base); await pwa.evaluate(() => navigator.serviceWorker.ready); await pwa.reload(); await pwa.waitForFunction(() => !!navigator.serviceWorker.controller); await offline.setOffline(true); await pwa.reload(); await pwa.locator('#nx-cards .nx-card').first().waitFor(); await pwa.goto(`${base}berggarten/`); await pwa.locator('#loading').waitFor({ state: 'hidden' }); await offline.close(); results.push('PWA precache, offline reload and offline Berggarten PASS');
  }
  await browser.close();
}
console.log(results.join('\n'));

server?.kill();
