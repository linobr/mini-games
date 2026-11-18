import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export async function testEmil(context, base) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // A single workshop sample accelerates the browser flow. Unit tests cover the eight-sample rules.
  const engine = (await readFile(new URL('../public/emil/engine.js', import.meta.url), 'utf8')).replace('export const TARGET = 8;', 'export const TARGET = 1;');
  await page.route('**/emil/engine.js', route => route.fulfill({contentType:'text/javascript',body:engine}));
  await page.addInitScript(() => { Math.random = () => .25; });
  await page.goto(base + 'emil/');
  await page.getByRole('button',{name:'Feierabend starten'}).click();
  await page.locator('#game').focus();
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(160);
  await page.keyboard.up('ArrowLeft');
  await page.locator('#pause').click();
  assert.equal(await page.locator('#overlay-title').textContent(),'Pause.');
  await page.getByRole('button',{name:'Weiter →'}).click();
  const bounds = await page.locator('#game').boundingBox();
  const position = {x:bounds.width * 390 / 900,y:bounds.height * 280 / 600};
  await page.locator('#game').click({position});
  await page.getByRole('button',{name:'Zum Neumarkt'}).waitFor();
  await page.getByRole('button',{name:'Zum Neumarkt'}).click();
  await page.getByRole('button',{name:/^Kaffee/}).click();
  const queueTap = page.getByRole('button',{name:'Aufrücken'});
  for (let move = 0; move < 2; move++) {
    await page.waitForFunction(() => document.querySelector('#queue-tap').dataset.ready === 'true');
    await queueTap.click();
  }
  await page.locator('#studio').waitFor({state:'visible'});
  await page.getByRole('button',{name:/^Trap/}).click();
  assert.equal(await page.getByRole('button',{name:/^Trap/}).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button',{name:'Espresso',exact:true}).click();
  await page.getByRole('button',{name:'Schritt 2: leer'}).click();
  await page.getByRole('button',{name:'Schritt 2: Espresso'}).waitFor();
  await page.getByRole('button',{name:'Beat anhören'}).click();
  await page.locator('#beat-grid .playing').first().waitFor();
  await page.getByRole('button',{name:'Zum Videoschnitt'}).click();
  for (const clip of ['Solo unterwegs','Werkstatt','Neumarkt']) await page.getByRole('button',{name:clip,exact:true}).click();
  await page.getByRole('button',{name:'Clip ansehen'}).click();
  await page.getByText('Spontan ans Meer',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Clip zeigen'}).click();
  await page.getByRole('button',{name:'Mia kennenlernen'}).click();
  assert.match(await page.locator('#overlay-copy').textContent(),/allein/);
  await page.getByRole('button',{name:/bei einem Kaffee/}).click();
  assert.equal(await page.locator('#overlay-title').textContent(),'Ein Treffen steht.');
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('mini-games:emil:v1')).best > 0));
  const sound = await page.locator('#sound').getAttribute('aria-pressed');
  await page.locator('#sound').click();
  await page.reload();
  assert.notEqual(await page.locator('#sound').getAttribute('aria-pressed'),sound);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.getByRole('button',{name:'Feierabend starten'}).click();
  await page.locator('#bell').click();
  assert.match(await page.locator('#feedback').textContent(), /Klingel/);
  await page.locator('#restart').click();
  await page.getByRole('button',{name:'Zurück zur Runde'}).click();
  assert.equal(await page.locator('#overlay').isHidden(),true);
  await page.screenshot({path:`/tmp/emil-${context.browser().browserType().name()}-mobile.png`});
  assert.deepEqual(errors,[]);
  await page.close();
}
