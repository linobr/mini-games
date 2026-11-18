import {
  WIDTH, HEIGHT, TARGET, MELODY, CHAPTERS, CONTACTS, freshRun, startRun, nextChapter,
  setPosition, ringBell, tickRun, playStudioNote, chooseContact, answerContact,
  loadRecord, saveRecord,
} from './engine.js';
import { EmilAudio } from './audio.js';
import { EmilRenderer } from './renderer.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
let storage;
try { storage = localStorage; } catch {}
const record = loadRecord(storage);
const audio = new EmilAudio(record.muted);
const renderer = new EmilRenderer(canvas);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let state = freshRun();
let paused = false;
let last = performance.now();
let hudClock = 0;
let moving = false;
let demoTimer;
let demoPlaying = false;
const input = { left: false, right: false, up: false, down: false };
const movement = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', a:'left', d:'right', w:'up', s:'down' };

function persist() {
  record.best = Math.max(record.best, state.score);
  if (!saveRecord(storage, record)) $('save-status').textContent = 'Bestmarke nur für diese Sitzung verfügbar.';
}
function clearInput() { for (const key of Object.keys(input)) input[key] = false; moving = false; }
function stopDemo() {
  clearTimeout(demoTimer);
  demoPlaying = false;
  $('listen').disabled = false;
}
function button(text, action, secondary = false, detail = '') {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = text;
  if (secondary) element.className = 'secondary';
  if (detail) { const small = document.createElement('small'); small.textContent = detail; element.append(small); }
  element.onclick = action;
  return element;
}
function overlay(kicker, title, copy, actions) {
  $('overlay-kicker').textContent = kicker;
  $('overlay-title').textContent = title;
  $('overlay-copy').textContent = copy;
  $('overlay-actions').replaceChildren(...actions);
  $('overlay').hidden = false;
}
function feedback(message) { if ($('feedback').textContent !== message) $('feedback').textContent = message; }
function newRun() {
  persist();
  stopDemo();
  clearInput();
  audio.unlock();
  state = startRun();
  paused = false;
  last = performance.now();
  $('overlay').hidden = true;
  feedback('Die Werkstatt liefert den Beat. Sammle die leuchtenden Noten.');
  updateHUD();
  canvas.focus({ preventScroll: true });
}
function setPaused(value) {
  if (!['run', 'studio'].includes(state.phase)) return;
  paused = value;
  clearInput();
  if (paused) {
    stopDemo();
    overlay('KURZ DURCHATMEN', 'Pause.', 'Emils Feierabend läuft dir nicht davon.', [button('Weiter →', () => {
      setPaused(false);
      if (state.phase === 'run') canvas.focus({ preventScroll: true });
      else document.querySelector('[data-tone="0"]').focus({ preventScroll: true });
    })]);
  } else { $('overlay').hidden = true; last = performance.now(); }
  updateHUD();
}
function onPhase() {
  clearInput();
  stopDemo();
  if (state.phase === 'chapter') {
    overlay('FEIERABEND GESCHAFFT', 'Ab uf Neumarkt.', 'Die ersten acht Samples sitzen. Jetzt Mittagessen auftreiben und den zweiten Teil des Klingeltons sammeln. Ein Energiepunkt kommt zurück.', [
      button('Zum Neumarkt →', () => {
        nextChapter(state); $('overlay').hidden = true;
        feedback('Die Schlange isch amigs max lang. Klingeln schafft Platz.');
        last = performance.now(); updateHUD(); canvas.focus({ preventScroll: true });
      }),
    ]);
  } else if (state.phase === 'studio') {
    $('overlay').hidden = true;
    feedback('Deine Sounds sind im Studio. Spiele den Klingelton mit den drei Tasten.');
    updateHUD();
    $('studio').scrollIntoView({ block: 'nearest' });
    document.querySelector('[data-tone="0"]').focus({ preventScroll: true });
  } else if (state.phase === 'meet') {
    persist();
    audio.melody(MELODY);
    overlay('DER KLINGELTON STEHT', 'Wer hört mit?', 'Nach dem kleinen Auftritt bleibt Zeit für ein Gespräch.', CONTACTS.map(person =>
      button(person.name + ' kennenlernen', () => { chooseContact(state, person.id); onPhase(); updateHUD(); }, false, person.interest)
    ));
  } else if (state.phase === 'chat') {
    const person = CONTACTS.find(contact => contact.id === state.contact);
    overlay('NACH DEM AUFTRITT', person.name, person.question, person.options.map((option, index) =>
      button(option.text, () => { answerContact(state, index); onPhase(); updateHUD(); }, index > 0)
    ));
  } else if (state.phase === 'done') {
    persist();
    overlay(state.ending.match ? 'EIN NEUER ANFANG' : 'GUTER ABEND', state.ending.match ? 'Ein Date steht.' : 'Wir hören voneinander.', state.ending.line, [
      button('Noch eine Feierabendrunde →', newRun),
      button('Deinen Klingelton anhören', () => { audio.unlock(); audio.melody(MELODY); }, true),
    ]);
    feedback('Werkstatt, Neumarkt, Klingelton. Das war Emils Abend.');
  } else if (state.phase === 'over') {
    persist();
    overlay('KURZE PAUSE', 'Neuer Versuch?', 'Der Feierabend war voller Hindernisse. Mit der Klingel schaffst du Platz um Emil. Sie ist nach wenigen Sekunden wieder bereit.', [button('Noch einmal →', newRun)]);
    feedback('Nächste Runde. Die Samples warten.');
  }
  updateHUD();
  if (!$('overlay').hidden) {
    $('overlay').scrollIntoView({ block:'nearest' });
    $('overlay-actions').querySelector('button')?.focus({ preventScroll:true });
  }
}
function studioNote(tone) {
  if (paused || demoPlaying) return;
  audio.unlock();
  const result = playStudioNote(state, tone);
  if (!result) return;
  audio.tone(tone);
  feedback(result.correct ? 'Sitzt. Nächste Note.' : 'Fast. Die leuchtende Note ist als Nächstes dran.');
  if (result.complete) onPhase();
  updateHUD();
}
function bell() {
  audio.unlock();
  if (paused || !ringBell(state)) return;
  audio.tone(2);
  audio.tone(0, .11);
  feedback('Klingel! Kurz Platz gemacht.');
  updateHUD();
}
function updateHUD() {
  $('samples').textContent = `${Math.min(TARGET, state.samples)} / ${TARGET}`;
  $('score').textContent = state.score.toLocaleString('de-CH');
  $('best').textContent = Math.max(record.best, state.score).toLocaleString('de-CH');
  $('lives').textContent = Array.from({ length:3 }, (_, i) => i < state.lives ? '●' : '○').join(' ');
  $('lives').setAttribute('aria-label', `${state.lives} Energie`);
  const studio = ['studio','meet','chat','done'].includes(state.phase);
  $('chapter-number').textContent = studio ? '03' : `0${state.chapter+1}`;
  $('chapter-place').textContent = studio ? 'KLINGELTON-STUDIO' : CHAPTERS[state.chapter].place;
  $('chapter-title').textContent = studio ? 'Dein Sound. Dein Abend.' : CHAPTERS[state.chapter].name;
  $('mission').textContent = studio ? 'Spiele die acht Noten und lerne jemanden kennen.' : CHAPTERS[state.chapter].goal;
  $('studio').hidden = state.phase !== 'studio';
  $('pause').disabled = !['run','studio'].includes(state.phase);
  $('pause').textContent = paused ? 'Weiter' : 'Pause';
  $('bell').disabled = state.phase !== 'run' || paused || state.cooldown > 0;
  $('bell-state').textContent = state.cooldown > 0 ? `${Math.ceil(state.cooldown)} s` : 'Leertaste';
  $('sound').textContent = audio.muted ? 'Ton aus' : 'Ton an';
  $('sound').setAttribute('aria-pressed', String(!audio.muted));
  const activeCount = studio ? state.studioIndex : state.samples;
  [...$('sample-track').children].forEach((element,index) => element.classList.toggle('collected', index < activeCount));
  [...$('melody').children].forEach((element,index) => {
    element.classList.toggle('done', index < state.studioIndex);
    element.classList.toggle('active', index === state.studioIndex);
    if (index === state.studioIndex) element.setAttribute('aria-current', 'step');
    else element.removeAttribute('aria-current');
  });
}
for (let i = 0; i < TARGET; i++) $('sample-track').append(document.createElement('i'));
MELODY.forEach(tone => { const element = document.createElement('span'); element.textContent = ['G','H','D'][tone]; $('melody').append(element); });
for (const element of document.querySelectorAll('[data-tone]')) element.onclick = () => studioNote(Number(element.dataset.tone));
$('listen').onclick = () => {
  if (state.phase !== 'studio' || paused || demoPlaying) return;
  audio.unlock();
  audio.melody(MELODY);
  demoPlaying = true;
  $('listen').disabled = true;
  demoTimer = setTimeout(stopDemo, MELODY.length * 280 + 100);
};
$('sound').onclick = () => { audio.unlock(); audio.muted = !audio.muted; record.muted = audio.muted; saveRecord(storage, record); updateHUD(); };
$('bell').onclick = bell;
$('pause').onclick = () => setPaused(!paused);
$('restart').onclick = () => {
  if (['ready','done','over'].includes(state.phase)) { newRun(); return; }
  const wasPaused = paused;
  paused = true; clearInput(); stopDemo();
  overlay('NEUE RUNDE', 'Von vorn starten?', 'Die laufende Runde beginnt wieder in der Werkstatt.', [
    button('Neu starten', newRun), button('Zurück zur Runde', () => {
      paused = wasPaused;
      if (wasPaused) setPaused(true);
      else {
        $('overlay').hidden = true; last = performance.now();
        (state.phase === 'studio' ? document.querySelector('[data-tone="0"]') : canvas).focus({ preventScroll:true });
      }
      updateHUD();
    }, true),
  ]);
};
canvas.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'Escape') { event.preventDefault(); setPaused(!paused); return; }
  const direction = movement[event.key] || movement[event.key.toLowerCase()];
  if (direction) { event.preventDefault(); input[direction] = true; }
  if (event.key === ' ' && !event.repeat) { event.preventDefault(); bell(); }
});
window.addEventListener('keyup', event => {
  const direction = movement[event.key] || movement[event.key.toLowerCase()];
  if (direction) input[direction] = false;
});
$('studio').addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  const tone = { a:0, s:1, d:2 }[event.key.toLowerCase()];
  if (tone !== undefined) { event.preventDefault(); studioNote(tone); }
});
canvas.addEventListener('blur', clearInput);
for (const element of document.querySelectorAll('[data-direction]')) {
  element.onpointerdown = event => {
    if (state.phase !== 'run' || paused) return;
    event.preventDefault(); element.setPointerCapture(event.pointerId);
    audio.unlock(); input[element.dataset.direction] = true;
  };
  element.onlostpointercapture = () => { input[element.dataset.direction] = false; };
}
let dragging = false;
function pointerPosition(event) {
  if (!dragging || paused) return;
  const bounds = canvas.getBoundingClientRect();
  setPosition(state, (event.clientX-bounds.left)/bounds.width*WIDTH, (event.clientY-bounds.top)/bounds.height*HEIGHT);
}
canvas.onpointerdown = event => {
  if (state.phase !== 'run' || paused) return;
  event.preventDefault(); canvas.focus({ preventScroll:true }); canvas.setPointerCapture(event.pointerId);
  audio.unlock(); dragging = true; pointerPosition(event);
};
canvas.onpointermove = pointerPosition;
canvas.onlostpointercapture = () => { dragging = false; };
function pauseAway() { clearInput(); dragging = false; if (!paused) setPaused(true); }
window.addEventListener('blur', pauseAway);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAway(); });
window.addEventListener('pagehide', persist);

overlay('EMIL KLINGEL', 'Ab uf Feierabend.', 'Acht Samples pro Strecke. Weiche den Wagen und Warteschlangen aus. Am Ende baust du daraus deinen Klingelton und triffst jemanden.', [button('Feierabend starten →', newRun)]);
updateHUD();
function frame(now) {
  const dt = Math.min(Math.max(0, (now-last)/1000), .05); last = now;
  if (!paused) {
    moving = Object.values(input).some(Boolean);
    const events = tickRun(state, dt, input);
    state.flashTime = Math.max(0, state.flashTime-dt);
    for (const event of events) {
      if (event.type === 'sample') { audio.tone(event.tone); feedback('Sample aufgenommen. Das wird ein Klingelton.'); }
      if (event.type === 'hit') { audio.tone(9, 0, .12); feedback('Kurz durchatmen. Du bist einen Moment geschützt.'); }
      if (['chapter','studio','meet','over'].includes(event.type)) onPhase();
    }
  }
  hudClock += dt;
  if (hudClock > .1) { updateHUD(); hudClock = 0; }
  renderer.render(state, now/1000, moving && !paused, reduced.matches);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
