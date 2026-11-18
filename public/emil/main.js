import {
  WIDTH, HEIGHT, TARGET, SOUNDS, ORDERS, STYLES, CLIPS, CONTACTS, freshRun, startRun, nextChapter,
  setPosition, ringBell, tickRun, selectOrder, tickQueue, queueProgress, queueReady,
  moveQueue, setStyle, setAccent, finishMix, chooseClip, finishEdit, chooseContact,
  conversation, answerContact, loadRecord, saveRecord,
} from './engine.js';
import { EmilAudio, BEAT_STEPS, beatStepDuration } from './audio.js';
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
let confirming = false;
let last = performance.now();
let selectedSound = null;
let preview = null;
let dragging = false;
const input = { left: false, right: false, up: false, down: false };
const movement = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', a:'left', d:'right', w:'up', s:'down' };
const sections = ['market', 'studio', 'edit'];
const chapters = [
  ['STARRAG-WERKSTATT', 'Feierabend bei Starrag', 'Sammle die leuchtenden Samples und weiche Werkzeugwagen aus.'],
  ['NEUMARKT', 'Kaffee oder Poke Bowl?', 'Rücke in der Schlange auf und nimm einen Sound mit.'],
  ['HEIMSTUDIO', 'House oder Trap?', 'Baue einen Klingelton aus deinen gesammelten Sounds.'],
  ['VIDEOSCHNITT', 'Drei Szenen zum Beat', 'Schneide deinen ersten Clip und zeig ihn weiter.'],
  ['NACH DEM AUFTRITT', 'Ein Gespräch nach dem Clip', 'Entscheide, mit wem Emil ins Gespräch kommt und was er sagt.'],
];
const canPause = () => state.phase === 'run' || (state.phase === 'market' && !!state.order);

function persist() {
  record.best = Math.max(record.best, state.score);
  if (!saveRecord(storage, record)) $('save-status').textContent = 'Bestmarke nur für diese Sitzung verfügbar.';
}
function clearInput() {
  for (const key of Object.keys(input)) input[key] = false;
  dragging = false;
}
function button(label, action, secondary = false, detail = '') {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  if (secondary) element.className = 'secondary';
  if (detail) {
    const small = document.createElement('small');
    small.textContent = detail;
    element.append(small);
  }
  element.onclick = action;
  return element;
}
function overlay(kicker, title, copy, actions, focus = true) {
  $('overlay-kicker').textContent = kicker;
  $('overlay-title').textContent = title;
  $('overlay-copy').textContent = copy;
  $('overlay-actions').replaceChildren(...actions);
  $('overlay').hidden = false;
  if (focus) {
    $('overlay').scrollIntoView({ block: 'nearest' });
    actions[0]?.focus({ preventScroll: true });
  }
}
function feedback(message) {
  if ($('feedback').textContent !== message) $('feedback').textContent = message;
}
function focusGame() {
  const control = state.phase === 'market'
    ? state.order ? $('queue-tap') : document.querySelector('[data-order]')
    : state.phase === 'studio' ? document.querySelector('[data-style]')
    : state.phase === 'edit' ? $('clip-options').querySelector('button:not(:disabled)')
    : canvas;
  control?.focus({ preventScroll: true });
  control?.scrollIntoView({ block: 'nearest' });
}
function stopPreview() {
  if (!preview) return;
  preview = null;
  audio.stopBeat();
  state.previewClip = null;
  $('clip-caption').hidden = true;
  $('overlay').classList.remove('previewing');
  for (const pad of pads) pad.classList.remove('playing');
  updatePreviewButtons();
}
function updatePreviewButtons() {
  $('listen').textContent = preview ? 'Beat stoppen' : 'Beat anhören';
  $('preview-cut').textContent = preview ? 'Clip stoppen' : 'Clip ansehen';
  const finalPreview = $('ending-preview');
  if (finalPreview) finalPreview.textContent = preview ? 'Vorschau stoppen' : 'Beat und Clip ansehen';
}
async function playPreview(withClip) {
  if (preview) { stopPreview(); return; }
  const playing = { started: performance.now(), step: -1, withClip, stepDuration: beatStepDuration(state.style) };
  preview = playing;
  updatePreviewButtons();
  // Keep the overlay out of the picture when replaying the finished clip.
  if (withClip && state.phase === 'done') $('overlay').classList.add('previewing');
  await audio.unlock();
  if (preview === playing) {
    playing.started = performance.now();
    audio.beat(state.style, state.accents);
  }
}
function updatePreview(now) {
  if (!preview) return;
  const step = Math.floor(Math.max(0, now - preview.started) / 1000 / preview.stepDuration);
  if (step >= BEAT_STEPS) { stopPreview(); return; }
  if (step === preview.step) return;
  preview.step = step;
  if (state.phase === 'studio') {
    for (const [index, pad] of pads.entries()) pad.classList.toggle('playing', index === step % pads.length);
  }
  if (preview.withClip) {
    const clip = state.clips[Math.floor(step * state.clips.length / BEAT_STEPS)];
    if (clip !== state.previewClip) {
      state.previewClip = clip;
      $('clip-caption').textContent = CLIPS[clip].caption;
      $('clip-caption').hidden = false;
    }
  }
}
function newRun() {
  persist();
  stopPreview();
  clearInput();
  void audio.unlock();
  state = startRun();
  paused = false;
  confirming = false;
  last = performance.now();
  $('overlay').hidden = true;
  feedback('Sammle Relais, Motor und Metall für dein Heimstudio.');
  updateHUD();
  focusGame();
}
function setPaused(value) {
  if (confirming || !canPause()) return;
  paused = value;
  clearInput();
  if (paused) {
    overlay('KURZ DURCHATMEN', 'Pause.', 'Emils Feierabend läuft dir nicht davon.', [button('Weiter →', () => setPaused(false))]);
  } else {
    $('overlay').hidden = true;
    last = performance.now();
  }
  updateHUD();
  if (!paused) focusGame();
}
function enterPhase() {
  clearInput();
  stopPreview();
  $('overlay').hidden = true;
  if (state.phase === 'chapter') {
    overlay('FEIERABEND BEI STARRAG', 'Ab uf Neumarkt.', 'Die Werkstatt-Sounds sind im Kasten. Zeit für eine Pause und ein letztes Sample für den Beat.', [
      button('Zum Neumarkt →', () => {
        nextChapter(state);
        feedback('Am Neumarkt ist wieder Schlange. Was holst du dir?');
        enterPhase();
      }),
    ]);
  } else if (state.phase === 'studio') {
    selectedSound = state.bank[0];
    $('sound-bank').replaceChildren(...state.bank.map(sound => button(SOUNDS[sound].name, async () => {
      selectedSound = sound;
      updateStudio();
      if (!preview) {
        await audio.unlock();
        if (!preview && state.phase === 'studio') audio.sample(sound);
      }
    })));
    feedback('Emils Heimstudio ist bereit. Das Startmuster kannst du frei ändern.');
    updateStudio();
  } else if (state.phase === 'edit') {
    feedback('Emils erster Videoschnitt. Ob die Reihenfolge passt, hörst du beim Abspielen.');
    updateEdit();
  } else if (state.phase === 'meet') {
    persist();
    overlay('NACH DEM AUFTRITT', 'Wer hört mit?', 'Emil hat den Clip gezeigt. Jetzt kommt der Teil ohne Schnittprogramm: jemanden ansprechen.', CONTACTS.map(person =>
      button(person.name + ' kennenlernen', () => { chooseContact(state, person.id); enterPhase(); }, false, person.interest)
    ));
  } else if (state.phase === 'chat') {
    const person = CONTACTS.find(contact => contact.id === state.contact);
    const dialogue = conversation(state);
    overlay('NACH DEM AUFTRITT', person.name, dialogue.question, dialogue.options.map((option, index) =>
      button(option.text, () => { answerContact(state, index); enterPhase(); }, index > 0)
    ));
  } else if (state.phase === 'done') {
    persist();
    const replay = button('Beat und Clip ansehen', () => void playPreview(true), true);
    replay.id = 'ending-preview';
    overlay(state.ending.match ? 'EIN NEUER ANFANG' : 'GUTER ABEND',
      state.ending.match ? 'Ein Treffen steht.' : 'Wir hören voneinander.',
      state.ending.line, [button('Noch eine Feierabendrunde →', newRun), replay]);
    feedback(STYLES[state.style].name + '-Beat und drei Szenen. Das war Emils Abend.');
    if (state.ending.play) void playPreview(false);
  } else if (state.phase === 'over') {
    persist();
    overlay('KURZE PAUSE', 'Neuer Versuch?', 'Mit der Klingel schaffst du kurz Platz um Emil.', [button('Noch einmal →', newRun)]);
    feedback('Die Samples warten auf den nächsten Versuch.');
  }
  updateHUD();
  if ($('overlay').hidden) focusGame();
}
function updateHUD() {
  $('samples').textContent = state.chapter ? String(state.bank.length) : state.samples + ' / ' + TARGET;
  $('score').textContent = state.score.toLocaleString('de-CH');
  $('best').textContent = Math.max(record.best, state.score).toLocaleString('de-CH');
  $('lives').textContent = Array.from({ length: 3 }, (_, i) => i < state.lives ? '●' : '○').join(' ');
  $('lives').setAttribute('aria-label', state.lives + ' Energie');
  const chapter = ['meet', 'chat', 'done'].includes(state.phase) ? 5
    : state.phase === 'edit' ? 4
    : state.phase === 'studio' ? 3
    : state.chapter + 1;
  $('chapter-number').textContent = '0' + chapter;
  $('chapter-place').textContent = chapters[chapter - 1][0];
  $('chapter-title').textContent = chapters[chapter - 1][1];
  $('mission').textContent = chapters[chapter - 1][2];
  $('workshop-controls').hidden = state.chapter !== 0;
  $('workshop-controls').inert = state.phase !== 'run' || paused;
  for (const id of sections) {
    $(id).hidden = state.phase !== id;
    $(id).inert = paused || confirming;
  }
  $('sample-track').hidden = state.chapter !== 0;
  $('pause').disabled = confirming || !canPause();
  $('pause').textContent = paused ? 'Weiter' : 'Pause';
  updateBell();
  $('sound').textContent = audio.muted ? 'Ton aus' : 'Ton an';
  $('sound').setAttribute('aria-pressed', String(!audio.muted));
  for (const [index, element] of Array.from($('sample-track').children).entries()) {
    element.classList.toggle('collected', index < state.samples);
  }
  $('orders').hidden = !!state.order;
  $('queue').hidden = !state.order;
  if (state.order) $('queue-status').textContent = state.queueMoves + ' / ' + ORDERS[state.order].moves + ' Schritte';
}
function updateBell() {
  const cooling = state.cooldown > 0;
  $('bell').disabled = state.phase !== 'run' || paused || cooling;
  $('bell-state').textContent = cooling ? Math.ceil(state.cooldown) + ' s' : 'Leertaste';
}
function bell() {
  if (paused || !ringBell(state)) return;
  void audio.unlock();
  audio.sample('bell');
  feedback('Klingel! Kurz Platz gemacht.');
  updateHUD();
}
function updateQueue() {
  const ready = queueReady(state);
  $('queue-meter').style.setProperty('--progress', queueProgress(state) * 100 + '%');
  $('queue-tap').dataset.ready = String(ready);
}
function updateStudio() {
  for (const style of document.querySelectorAll('[data-style]')) {
    style.setAttribute('aria-pressed', String(style.dataset.style === state.style));
  }
  for (const [index, choice] of Array.from($('sound-bank').children).entries()) {
    choice.setAttribute('aria-pressed', String(state.bank[index] === selectedSound));
  }
  for (const [index, pad] of pads.entries()) {
    const sound = SOUNDS[state.accents[index]];
    pad.dataset.filled = String(!!sound);
    pad.setAttribute('aria-label', 'Schritt ' + (index + 1) + ': ' + (sound?.name ?? 'leer'));
    pad.lastChild.textContent = sound?.mark ?? '–';
  }
  $('finish-mix').disabled = !state.accents.some(Boolean);
}
function updateEdit() {
  for (const [index, item] of Array.from($('clip-timeline').children).entries()) {
    item.textContent = CLIPS[state.clips[index]]?.name ?? '';
  }
  for (const [id, choice] of Object.entries(clipButtons)) {
    choice.disabled = state.clips.length === 3 || state.clips.includes(id);
  }
  $('undo-cut').disabled = state.clips.length === 0;
  $('preview-cut').disabled = state.clips.length !== 3;
  $('finish-cut').disabled = state.clips.length !== 3;
}
for (let i = 0; i < TARGET; i++) $('sample-track').append(document.createElement('i'));
const pads = state.accents.map((_, index) => {
  const pad = button(String(index + 1), () => {
    const sound = state.accents[index] === selectedSound ? null : selectedSound;
    if (!setAccent(state, index, sound)) return;
    stopPreview();
    if (sound) void audio.unlock().then(() => audio.sample(sound));
    updateStudio();
  });
  pad.append(document.createElement('small'));
  $('beat-grid').append(pad);
  return pad;
});
const clipButtons = Object.fromEntries(Object.entries(CLIPS).map(([id, clip]) => {
  const choice = button(clip.name, () => {
    if (!chooseClip(state, id)) return;
    updateEdit();
    const next = $('clip-options').querySelector('button:not(:disabled)') ?? $('preview-cut');
    next.focus({ preventScroll: true });
  });
  choice.className = 'choice';
  $('clip-options').append(choice);
  return [id, choice];
}));
for (let i = 1; i <= 3; i++) {
  const tile = document.createElement('li');
  tile.dataset.slot = 'Szene ' + i;
  $('clip-timeline').append(tile);
}
for (const choice of document.querySelectorAll('[data-order]')) {
  choice.onclick = () => {
    if (!selectOrder(state, choice.dataset.order)) return;
    void audio.unlock();
    feedback(ORDERS[state.order].name + ' bestellt. Achte auf die grüne Anzeige.');
    updateHUD();
    updateQueue();
    focusGame();
  };
}
$('queue-tap').onclick = () => {
  if (paused || confirming) return;
  if (!moveQueue(state)) {
    feedback('Warte auf Grün. Du behältst deinen Platz.');
    return;
  }
  if (state.phase === 'studio') {
    audio.sample(state.order);
    enterPhase();
  } else {
    audio.sample('relay');
    feedback('Ein Platz näher.');
    updateHUD();
    updateQueue();
  }
};
for (const choice of document.querySelectorAll('[data-style]')) {
  choice.onclick = () => {
    if (!setStyle(state, choice.dataset.style)) return;
    stopPreview();
    feedback(STYLES[state.style].name + ' eingestellt. Hör dir das Muster an.');
    updateStudio();
  };
}
$('listen').onclick = () => void playPreview(false);
$('finish-mix').onclick = () => { if (finishMix(state)) enterPhase(); };
$('undo-cut').onclick = () => { stopPreview(); state.clips.pop(); updateEdit(); };
$('preview-cut').onclick = () => {
  const starting = !preview;
  void playPreview(true);
  if (starting) canvas.scrollIntoView({ block: 'nearest' });
};
$('finish-cut').onclick = () => { if (finishEdit(state)) enterPhase(); };
$('sound').onclick = () => {
  const muted = !audio.muted;
  audio.setMuted(muted);
  if (!muted) void audio.unlock();
  record.muted = muted;
  saveRecord(storage, record);
  updateHUD();
};
$('bell').onclick = bell;
$('pause').onclick = () => setPaused(!paused);
$('restart').onclick = () => {
  if (['ready','done','over'].includes(state.phase)) { newRun(); return; }
  if (confirming) return;
  const wasPaused = paused;
  confirming = true;
  paused = true;
  clearInput();
  stopPreview();
  overlay('NEUE RUNDE', 'Von vorn starten?', 'Die laufende Runde beginnt wieder in der Werkstatt.', [
    button('Neu starten', newRun),
    button('Zurück zur Runde', () => {
      confirming = false;
      if (wasPaused) setPaused(true);
      else if (['chapter', 'meet', 'chat'].includes(state.phase)) { paused = false; enterPhase(); }
      else {
        paused = false;
        $('overlay').hidden = true;
        last = performance.now();
        updateHUD();
        focusGame();
      }
    }, true),
  ]);
  updateHUD();
};
canvas.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || paused || state.phase !== 'run') return;
  const direction = movement[event.key] || movement[event.key.toLowerCase()];
  if (direction) { event.preventDefault(); input[direction] = true; }
  if (event.key === ' ' && !event.repeat) { event.preventDefault(); bell(); }
});
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && canPause() && !confirming) {
    event.preventDefault();
    setPaused(!paused);
  }
});
window.addEventListener('keyup', event => {
  const direction = movement[event.key] || movement[event.key.toLowerCase()];
  if (direction) input[direction] = false;
});
canvas.addEventListener('blur', clearInput);
for (const control of document.querySelectorAll('[data-direction]')) {
  control.onpointerdown = event => {
    if (state.phase !== 'run' || paused) return;
    event.preventDefault();
    control.setPointerCapture(event.pointerId);
    input[control.dataset.direction] = true;
  };
  control.onlostpointercapture = () => { input[control.dataset.direction] = false; };
}
function pointerPosition(event) {
  if (!dragging || paused) return;
  const bounds = canvas.getBoundingClientRect();
  setPosition(state, (event.clientX - bounds.left) / bounds.width * WIDTH, (event.clientY - bounds.top) / bounds.height * HEIGHT);
}
canvas.onpointerdown = event => {
  if (state.phase !== 'run' || paused) return;
  event.preventDefault();
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(event.pointerId);
  dragging = true;
  pointerPosition(event);
};
canvas.onpointermove = pointerPosition;
canvas.onlostpointercapture = () => { dragging = false; };
function pauseAway() {
  clearInput();
  stopPreview();
  if (!paused) setPaused(true);
}
window.addEventListener('blur', pauseAway);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAway(); });
window.addEventListener('pagehide', persist);

overlay('EMIL KLINGEL', 'Ab uf Feierabend.', 'Sammle acht Sounds bei Starrag. Über den Neumarkt geht es ins Heimstudio, wo du einen Beat und deinen ersten Clip baust.', [button('Feierabend starten →', newRun)], false);
updateHUD();
let lastBellLabelUpdate = 0;
function frame(now) {
  const dt = Math.min(Math.max(0, (now - last) / 1000), .05);
  last = now;
  if (!paused) {
    if (state.phase === 'run') {
      for (const event of tickRun(state, dt, input)) {
        if (event.type === 'sample') {
          audio.sample(event.sound);
          feedback(SOUNDS[event.sound].name + ' aufgenommen.');
          updateHUD();
        } else if (event.type === 'hit') {
          audio.sample('hit');
          feedback('Kurz durchatmen. Du bist einen Moment geschützt.');
          updateHUD();
        } else {
          enterPhase();
        }
      }
      if (now - lastBellLabelUpdate > 100) {
        updateBell();
        lastBellLabelUpdate = now;
      }
    } else if (state.phase === 'market' && state.order) {
      tickQueue(state, dt);
      updateQueue();
    }
  }
  updatePreview(now);
  renderer.render(state, now / 1000, !paused && (dragging || Object.values(input).some(Boolean)), reduced.matches);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
