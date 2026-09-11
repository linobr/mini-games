import { Game, DASH_COOLDOWN, RUN_LENGTH } from './engine.js';
import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { Storage, ACHIEVEMENTS, SKINS } from './storage.js';
import { FixedClock } from './math.js';

function initialize() {
const $ = selector => document.querySelector(selector);
const format = n => Math.floor(n).toLocaleString('de-CH');
const clock = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const dateUTC = () => new Date().toISOString().slice(0, 10);
let backingStore;
try { backingStore = window.localStorage; } catch { /* Session-only fallback. */ }
const storage = new Storage(backingStore, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const settings = storage.data.settings;
const sound = new Sound(settings);
const game = new Game(), demo = new Game();
demo.reset(72431); demo.time = 61; demo.transition(1); demo.events.length = 0;
let renderer;
try { renderer = new Renderer($('#arena'), settings); }
catch {
  $('.menu-intro').textContent = 'Dein Browser unterstützt das Spielfeld nicht. Bitte öffne das Spiel in einem aktuellen Browser.';
  $('#play').disabled = true; $('#daily-play').disabled = true;
  return;
}
const simulationClock = new FixedClock();
let state = 'menu', last = performance.now(), uiClock = 0, endClock = 0, hitstop = 0;
let bannerUntil = 0, toastUntil = 0, hudMessage = '', currentDate = dateUTC(), resultRecorded = false;
let fpsAverage = 60, fpsClock = 0, touch = matchMedia('(pointer: coarse)').matches;
const debug = new URLSearchParams(location.search).get('debug') === '1';
const input = new Input(() => state === 'playing' && !$('dialog[open]'));
const ui = Object.fromEntries(['score', 'timer', 'health', 'combo', 'combo-fill', 'combo-block', 'dash-fill', 'dash-label', 'timeline-fill', 'phase-label', 'tutorial', 'event-banner'].map(id => [id, $('#' + id)]));

function toast(message) { $('#toast').textContent = message; toastUntil = performance.now() + 3500; }
function banner(title, subtitle, seconds = 2.5) {
  ui['event-banner'].replaceChildren(document.createTextNode(title));
  if (subtitle) { const small = document.createElement('small'); small.textContent = subtitle; ui['event-banner'].append(small); }
  bannerUntil = game.time + seconds;
}
function updateMenu() {
  $('#menu-best').textContent = format(storage.data.best).padStart(7, '0');
  $('#menu-combo').textContent = '×' + storage.data.bestCombo;
  $('#best-label').textContent = 'BEST ' + format(storage.data.best);
}
function applySettings() {
  document.body.classList.toggle('reduced-motion', settings.reducedMotion);
  $('#mute').setAttribute('aria-pressed', String(settings.muted));
  $('#mute').setAttribute('aria-label', settings.muted ? 'Ton einschalten' : 'Ton ausschalten');
  $('#mute').title = settings.muted ? 'Ton einschalten (M)' : 'Ton ausschalten (M)';
  for (const key of ['master', 'music', 'sfx', 'shake']) $('#' + key + '-value').textContent = settings[key] + '%';
  const skin = SKINS.find(s => s.id === storage.data.skin) || SKINS[0];
  renderer.skin = skin.color; document.documentElement.style.setProperty('--signal', skin.color);
  sound.apply(); renderer.resize();
}
function openDialog(id) { sound.unlock(); sound.play('ui'); $('#' + id).showModal(); }
function closeDialogs() { for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close(); }
function start(mode = 'standard') {
  sound.unlock(); sound.play('ui'); closeDialogs();
  currentDate = dateUTC();
  const seed = mode === 'daily' ? Number(currentDate.replaceAll('-', '')) : (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;
  game.reset(seed, mode); renderer.reset(); input.clear(); simulationClock.reset(); hitstop = 0;
  resultRecorded = false; state = 'playing'; last = performance.now(); uiClock = 0;
  $('#menu').hidden = true; $('#results').hidden = true; $('#hud').hidden = false;
  $('#pause-button').hidden = false; $('#touch-controls').hidden = false;
  ui['event-banner'].textContent = ''; hudMessage = ''; bannerUntil = 0;
  $('.chrome').classList.add('in-run'); updateHUD();
}
function menu() {
  closeDialogs(); state = 'menu'; input.clear(); renderer.reset(); simulationClock.reset();
  $('#menu').hidden = false; $('#hud').hidden = true; $('#results').hidden = true;
  $('#pause-button').hidden = true; $('#touch-controls').hidden = true;
  ui['event-banner'].textContent = ''; updateMenu(); $('#play').focus({ preventScroll: true });
}
function pause() {
  if (state !== 'playing') return;
  state = 'paused'; input.clear(); simulationClock.reset(); $('#touch-controls').hidden = true;
  $('#pause-dialog').showModal();
}
function resume() {
  if (state !== 'paused') return;
  closeDialogs(); input.clear(); state = 'playing'; simulationClock.reset(); last = performance.now();
  $('#touch-controls').hidden = false; sound.unlock();
}
function showResults() {
  state = 'results'; $('#hud').hidden = true; $('#results').hidden = false; $('#touch-controls').hidden = true;
  $('#pause-button').hidden = true;
  const record = resultRecorded ? { highscore: false, unlocked: [] } : storage.record(game, currentDate);
  resultRecorded = true;
  $('#result-kicker').textContent = game.won ? 'SIGNAL EMPFANGEN' : 'SIGNAL VERLOREN';
  $('#result-title').innerHTML = game.won ? 'RELAIS<br>GESICHERT.' : 'NOCH EIN<br>VERSUCH?';
  $('#result-score').textContent = format(game.score);
  $('#highscore-note').textContent = record.highscore ? 'NEUER PERSÖNLICHER REKORD' : game.mode === 'daily' ? 'DAILY RUN · ' + currentDate : 'REKORD ' + format(storage.data.best);
  $('#result-time').textContent = clock(game.time); $('#result-combo').textContent = '×' + game.bestCombo;
  $('#result-reflected').textContent = game.reflected;
  $('#result-detail').textContent = `${game.kills} Sender zerstört · ${game.nearMisses} knappe Manöver · ${game.bestRelay} Kugeln im besten Dash`;
  $('#unlocks').textContent = record.unlocked.length ? 'FREIGESCHALTET: ' + record.unlocked.map(id => ACHIEVEMENTS.find(a => a[0] === id)[1]).join(' / ') : '';
  $('#restart').focus({ preventScroll: true }); updateMenu();
  if (!storage.available) toast('Speichern ist blockiert. Deine Rekorde gelten für diese Sitzung.');
}
function updateHUD() {
  const p = game.player;
  ui.score.textContent = format(game.score).padStart(7, '0');
  ui.timer.innerHTML = `${clock(game.time)} <small>/ 03:00</small>`;
  ui.health.setAttribute('aria-label', `${p.hp} von 3 Trefferpunkten`);
  for (let i = 0; i < 3; i++) ui.health.children[i].classList.toggle('lost', i >= p.hp);
  ui.combo.textContent = '×' + game.combo;
  ui['combo-fill'].style.width = game.comboTime / 4.2 * 100 + '%';
  ui['combo-block'].style.opacity = game.combo > 1 ? '1' : '.65';
  ui['dash-fill'].style.transform = `scaleX(${1 - p.cooldown / DASH_COOLDOWN})`;
  ui['dash-label'].textContent = p.cooldown > 0 ? 'LÄDT ' + p.cooldown.toFixed(1) + 's' : 'DASH BEREIT';
  ui['dash-fill'].style.opacity = p.cooldown > 0 ? '.4' : '1';
  ui['timeline-fill'].style.width = game.time / RUN_LENGTH * 100 + '%';
  ui['phase-label'].textContent = ['01 / KONTAKT', '02 / DER RISS', '03 / ÜBERLAST'][game.phase];
  let message = '';
  if (game.time < 3) message = touch ? 'Linken Joystick ziehen: <strong>Bewegen</strong>' : '<kbd>W A S D</kbd> oder <kbd>↑ ← ↓ →</kbd> <strong>Bewegen</strong>';
  else if (game.time < 8 && game.reflected === 0) message = touch ? '<strong>DASH</strong> in orange Kugeln → sie werden zu deinen Geschossen.' : '<kbd>SPACE</kbd> in orange Kugeln → <strong>Angriff zurückschicken.</strong>';
  else if (game.time < 11 && game.reflected > 0) message = '<strong>Genau so!</strong> Halte die Kette für mehr Punkte.';
  if (message !== hudMessage) { hudMessage = message; ui.tutorial.innerHTML = message; }
  if (game.time >= bannerUntil && ui['event-banner'].textContent) ui['event-banner'].textContent = '';
}
function handleEvents() {
  renderer.events(game.events);
  let reflectedSound = 0, killSound = false;
  for (const e of game.events) {
    if (e.type === 'reflect') reflectedSound = Math.max(reflectedSound, e.value);
    else if (e.type === 'kill') killSound = true;
    else if (['dash', 'hit', 'near', 'pickup', 'rift', 'end'].includes(e.type)) sound.play(e.type, e.value);
    if (e.type === 'rift') banner(e.value === 1 ? 'DER RISS IST OFFEN.' : 'ÜBERLAST.', e.value === 1 ? 'ZERSTÖRE DEN KERN. ÄNDERE DEN AUSGANG.' : 'LETZTE MINUTE. HALTE DAS SIGNAL.', 3);
    if (e.type === 'coreKill') { banner('KERN GEBROCHEN.', 'HÜLLE REPARIERT · ENERGIE ZURÜCKGEWONNEN', 2.5); sound.play('rift'); }
    if (e.type === 'wave') banner('PULSRING', 'DASH HINDURCH ODER NUTZE DIE LÜCKE.', 1.7);
    if (e.type === 'pickup' && e.value) toast('Hülle repariert +1');
    if (e.type === 'hit') hitstop = .045;
    if (e.type === 'end') { state = 'ending'; endClock = .6; input.clear(); $('#touch-controls').hidden = true; }
  }
  if (reflectedSound) sound.play('reflect', reflectedSound);
  if (killSound) { sound.play('kill'); hitstop = Math.max(hitstop, .024); }
  game.events.length = 0;
}

$('#play').addEventListener('click', () => start());
$('#restart').addEventListener('click', () => start(game.mode));
$('#pause-restart').addEventListener('click', () => start(game.mode));
$('#result-menu').addEventListener('click', menu); $('#pause-menu').addEventListener('click', menu);
$('#pause-button').addEventListener('click', pause); $('#resume').addEventListener('click', resume);
$('#settings-open').addEventListener('click', () => openDialog('settings-dialog'));
$('#pause-settings').addEventListener('click', () => openDialog('settings-dialog'));
$('#help-open').addEventListener('click', () => openDialog('help-dialog'));
$('#daily-open').addEventListener('click', () => {
  $('#daily-date').textContent = dateUTC(); $('#daily-best').textContent = format(storage.data.daily[dateUTC()] || 0); openDialog('daily-dialog');
});
$('#daily-play').addEventListener('click', () => start('daily'));
$('#archive-open').addEventListener('click', () => { renderArchive(); openDialog('archive-dialog'); });

function renderArchive() {
  const d = storage.data;
  $('#archive-stats').innerHTML = `<div><span>RUNS</span><strong>${format(d.runs)}</strong></div><div><span>SPIELZEIT</span><strong>${Math.floor(d.time / 60)} min</strong></div><div><span>SENDER ZERSTÖRT</span><strong>${format(d.kills)}</strong></div>`;
  $('#achievement-count').textContent = `${d.achievements.length} / ${ACHIEVEMENTS.length}`;
  $('#achievements').replaceChildren();
  for (const [id, title, description] of ACHIEVEMENTS) {
    const el = document.createElement('div'); el.className = 'achievement' + (d.achievements.includes(id) ? ' earned' : '');
    const strong = document.createElement('strong'), p = document.createElement('p');
    strong.textContent = (d.achievements.includes(id) ? '✓ ' : '') + title; p.textContent = description; el.append(strong, p); $('#achievements').append(el);
  }
  $('#skins').replaceChildren();
  for (const skin of SKINS) {
    const unlocked = !skin.requires || d.achievements.includes(skin.requires);
    const button = document.createElement('button'); button.className = 'skin' + (d.skin === skin.id ? ' active' : '');
    button.style.setProperty('--skin', skin.color); button.disabled = !unlocked;
    button.setAttribute('aria-pressed', String(d.skin === skin.id));
    const hint = unlocked ? d.skin === skin.id ? 'Ausgewählt' : 'Auswählen' : skin.id === 'solar' ? 'Erreiche 60 Sekunden' : 'Erreiche 10 000 Punkte';
    button.innerHTML = `<i></i>${skin.name}<small>${hint}</small>`;
    button.addEventListener('click', () => { storage.data.skin = skin.id; storage.save(); applySettings(); renderArchive(); sound.play('ui'); });
    $('#skins').append(button);
  }
}
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => button.closest('dialog').close());
$('#pause-dialog').addEventListener('cancel', event => { event.preventDefault(); resume(); });
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('close', () => { input.clear(); });
const settingsForm = $('#settings-form');
for (const [key, value] of Object.entries(settings)) {
  const el = settingsForm.elements.namedItem(key); if (!el) continue;
  if (el.type === 'checkbox') el.checked = value; else el.value = value;
}
settingsForm.addEventListener('input', event => {
  const el = event.target; if (!Object.hasOwn(settings, el.name)) return;
  settings[el.name] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
  storage.save(); sound.unlock(); applySettings();
});
function mute() {
  settings.muted = !settings.muted; settingsForm.elements.namedItem('muted').checked = settings.muted;
  sound.unlock(); storage.save(); applySettings();
}
$('#mute').addEventListener('click', mute);
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else toast('Vollbild wird von diesem Browser nicht unterstützt.');
  } catch { toast('Vollbild ist hier nicht verfügbar.'); }
}
$('#fullscreen').addEventListener('click', fullscreen);
document.addEventListener('fullscreenchange', () => {
  $('#fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Vollbild verlassen' : 'Vollbild'); renderer.resize();
});
$('#copy-result').addEventListener('click', async () => {
  const text = `RIFT//RELAY${game.mode === 'daily' ? ' · Daily ' + currentDate : ''}\n${format(game.score)} Punkte · Kombo ×${game.bestCombo} · ${clock(game.time)}\n${game.reflected} Kugeln zurückgeschickt. Dein Zug.\n${location.href.split('?')[0].split('#')[0]}`;
  try { await navigator.clipboard.writeText(text); toast('Ergebnis kopiert.'); }
  catch { toast('Kopieren ist hier blockiert.'); }
});
window.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if ($('dialog[open]')) return;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (event.code === 'Enter' && ['BUTTON', 'A'].includes(event.target.tagName) && !['play', 'restart'].includes(event.target.id)) return;
  if (event.code === 'Escape' && state === 'playing') { event.preventDefault(); pause(); }
  if (event.code === 'KeyM') mute();
  if (event.code === 'KeyF') fullscreen();
  if ((event.code === 'Enter' && ['menu', 'results'].includes(state)) || (event.code === 'KeyR' && ['playing', 'results', 'ending'].includes(state))) {
    event.preventDefault(); start(state === 'menu' ? 'standard' : game.mode);
  }
});
window.addEventListener('blur', () => { input.clear(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { input.clear(); pause(); } last = performance.now(); simulationClock.reset(); });
window.addEventListener('resize', () => { renderer.resize(); input.clear(); });

function frame(now) {
  const elapsed = Math.max(0, (now - last) / 1000), dt = Math.min(elapsed, .1); last = now;
  fpsAverage += ((elapsed > 0 ? 1 / elapsed : 60) - fpsAverage) * .04;
  renderer.adapt(elapsed, state === 'playing');
  if (state === 'playing') {
    if (hitstop > 0) hitstop -= dt;
    else {
      simulationClock.tick(dt, step => { game.step(step, input.read()); return game.alive; });
      handleEvents();
    }
    renderer.update(dt, game, true);
    uiClock += dt; if (uiClock > .05) { updateHUD(); uiClock = 0; }
  } else if (state === 'menu') {
    if (!settings.reducedMotion && !document.hidden && !$('dialog[open]')) {
      demo.player.invulnerable = 100;
      const t = demo.time;
      demo.step(Math.min(dt, 1 / 30), { x: Math.cos(t * .6), y: Math.sin(t * .71), dash: Math.sin(t * 1.5) > .96 });
      if (!demo.alive || demo.time > 116) { demo.reset(72431); demo.time = 61; demo.transition(1); }
      renderer.events(demo.events, true); demo.events.length = 0;
      renderer.update(dt, demo, true);
    }
  } else if (state === 'ending') { endClock -= dt; renderer.update(dt * .5, game, false); if (endClock <= 0) showResults(); }
  sound.tick(dt, state === 'playing', game.combo, game.phase);
  renderer.draw(state === 'menu' ? demo : game, state === 'menu' ? 'menu' : 'play');
  if (toastUntil && now >= toastUntil) { $('#toast').textContent = ''; toastUntil = 0; }
  fpsClock += dt;
  if (fpsClock >= .35) {
    const show = settings.fps || debug; $('#fps').hidden = !show;
    if (show) {
      const activeGame = state === 'menu' ? demo : game;
      $('#fps').textContent = `${Math.round(fpsAverage)} FPS` + (debug ? `\n${state} · Q${renderer.level} · ${(elapsed * 1000).toFixed(1)}ms\n${activeGame.enemies.count} Sender · ${activeGame.bullets.count} Kugeln · ${renderer.particles.count} Partikel\nPosition ${Math.round(activeGame.player.x)}, ${Math.round(activeGame.player.y)}` : '');
    }
    fpsClock = 0;
  }
  requestAnimationFrame(frame);
}
updateMenu(); applySettings(); requestAnimationFrame(frame);
}
initialize();
