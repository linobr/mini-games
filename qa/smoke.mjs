import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const runtime = process.env.NEXUS_QA_NODE_MODULES;
const { chromium } = await import(runtime ? pathToFileURL(`${runtime}/playwright/index.mjs`).href : 'playwright');
const base = process.argv[2] || 'http://127.0.0.1:4173/mini-games/';
const server = process.env.NEXUS_QA_SERVE ? spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173'], { stdio: 'ignore' }) : null;
process.on('exit', () => server?.kill());
if (server) for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ...(process.env.NEXUS_QA_CHROMIUM ? { executablePath: process.env.NEXUS_QA_CHROMIUM, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
const page = await context.newPage(), errors = [], missing = [];
page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) missing.push(`${r.status()} ${r.url()}`); });
await page.goto(base); await page.locator('#nx-cards .nx-card').first().waitFor();
await page.screenshot({ path: '/tmp/nexus-desktop.png' });
await page.locator('#nx-library').scrollIntoViewIfNeeded(); await page.screenshot({ path: '/tmp/nexus-library.png' });
for (const id of ['turbo', 'color']) { await page.locator(`[data-game="${id}"] .nx-play`).click(); assert.equal(await page.locator('#home-view').isVisible(), false); await page.locator('#brand-button').click(); }
for (const path of ['mooslicht/', 'ki-mooslicht/', 'meteor-run.html', 'neon-defender.html', 'atom-lab.html', 'rift-relay/']) {
  const response = await page.goto(base + path); assert.equal(response.status(), 200);
  await page.locator('canvas').first().waitFor();
  await page.waitForTimeout(900);
  if (path.includes('mooslicht')) assert.equal(await page.locator('#error').isVisible(), false);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  console.log(`${path}: entry and canvas ready`);
}
assert.deepEqual(missing, []); assert.deepEqual(errors, []);
await context.close();
const blocked = await browser.newContext({ viewport: { width: 390, height: 844 } });
await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }); });
const p = await blocked.newPage(); p.on('pageerror', e => errors.push(e.message)); await p.goto(base); await p.locator('#nx-cards .nx-card').first().waitFor();
await p.locator('[data-interface-option="original"]').click(); await p.locator('#open-color-clash').click(); await p.locator('#brand-button').click();
await p.locator('[data-interface-option="nexus"]').click(); await p.locator('[data-game="tictactoe"] .nx-play').click(); await p.locator('#start-local').click();
await p.locator('.cell').first().click(); assert.match(await p.locator('.cell').first().textContent(), /X/);
assert.deepEqual(errors, []); await blocked.close(); await browser.close(); server?.kill(); console.log('Desktop entries, assets and blocked-storage play PASS');
