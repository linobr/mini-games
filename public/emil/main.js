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
let draftIndex = null;
let preview = null;
let dragging = false;
const input = { left: false, right: false, up: false, down: false };
const movement = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', a:'left', d:'right', w:'up', s:'down' };
const sections = ['market', 'studio', 'edit'];
const chapters = [
  ['STARRAG-WERKSTATT', 'Feierabend bei Starrag', 'Sammle Relais, Motor und Metall und weiche den Werkzeugwagen aus.'],
  ['NEUMARKT', 'Kaffee oder Poke Bowl?', 'Rücke in der Schlange auf und nimm einen Sound mit.'],
  ['HEIMSTUDIO', 'House oder Trap?', 'Ein kleines Heimstudio reicht. Baue aus deinen Werkstatt-Sounds einen Klingelton.'],
  ['VIDEOSCHNITT', 'Drei Szenen zum Beat', 'Mach aus dem Material einen Clip für die Projektwoche.'],
  ['NACH DEM AUFTRITT', 'Eine Nachricht nach dem Clip', 'Entscheide, wem Emil schreibt. Du kannst den Entwurf vor dem Abschicken ändern.'],
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
  draftIndex = null;
  paused = false;
  confirming = false;
  last = performance.now();
  $('overlay').hidden = true;
  feedback('Mechatronik am Tag, Beats am Abend. Nimm die leuchtenden Sounds mit.');
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
    feedback('Kleines Heimstudio, null Budget für neue Samples. Gut, dass du welche mitgebracht hast.');
    updateStudio();
  } else if (state.phase === 'edit') {
    feedback('Erster Schnitt für die Projektwoche. Zeit für die Frage: erst die Werkstatt oder gleich ans Meer?');
    updateEdit();
  } else if (state.phase === 'meet') {
    persist();
    overlay('NACH DEM AUFTRITT', 'Wer hört mit?', 'Emil hat den Clip gezeigt. Jetzt kommt der Teil ohne Schnittprogramm: jemanden ansprechen.', CONTACTS.map(person =>
      button(person.name + ' kennenlernen', () => { draftIndex = null; chooseContact(state, person.id); enterPhase(); }, false, person.interest)
    ));
  } else if (state.phase === 'chat') {
    openConversation();
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
function openConversation() {
  const person = CONTACTS.find(contact => contact.id === state.contact);
  const dialogue = conversation(state);
  if (draftIndex === null) {
    overlay('NACHRICHT VON ' + person.name.toUpperCase(), person.name, dialogue.question,
      dialogue.options.map((option, index) => button(option.text, () => {
        draftIndex = index;
        openConversation();
        updateHUD();
      }, index > 0)));
    return;
  }
  overlay('ENTWURF', 'An ' + person.name, dialogue.options[draftIndex].text, [
    button('Nachricht abschicken', () => {
      answerContact(state, draftIndex);
      draftIndex = null;
      enterPhase();
    }),
    button('Umformulieren', () => { draftIndex = null; openConversation(); updateHUD(); }, true),
  ]);
}
function updateStageProgress() {
  let label = 'Samples';
  let progress = state.samples + ' / ' + TARGET;
  switch (state.phase) {
    case 'market':
      label = 'Schlange';
      progress = state.order ? state.queueMoves + ' / ' + ORDERS[state.order].moves : '–';
      break;
    case 'studio':
      label = 'Soundspur';
      progress = state.accents.filter(Boolean).length + ' / ' + state.accents.length;
      break;
    case 'edit':
      label = 'Schnitt';
      progress = state.clips.length + ' / 3';
      break;
    case 'meet':
    case 'chat':
    case 'done':
      label = 'Chat';
      progress = state.phase === 'done' ? 'Gesendet' : draftIndex === null ? 'Offen' : 'Entwurf';
      break;
  }
  $('progress-label').textContent = label;
  $('samples').textContent = progress;
}
function updateHUD() {
  updateStageProgress();
  $('score').textContent = state.score.toLocaleString('de-CH');
  $('best').textContent = Math.max(record.best, state.score).toLocaleString('de-CH');
  $('energy').hidden = state.chapter !== 0;
  $('energy').parentElement.dataset.hasEnergy = String(state.chapter === 0);
  $('lives').setAttribute('aria-label', state.lives + ' von 3 Energie');
  Array.from($('lives').children).forEach((bar, index) => bar.classList.toggle('full', index < state.lives));
  const chapter = ['meet', 'chat', 'done'].includes(state.phase) ? 5
    : state.phase === 'edit' ? 4
    : state.phase === 'studio' ? 3
    : state.chapter + 1;
  Array.from($('chapter-trail').children).forEach((step, index) => {
    const position = index + 1;
    if (position === chapter) step.setAttribute('aria-current', 'step');
    else step.removeAttribute('aria-current');
    step.dataset.passed = String(position < chapter);
  });
  $('chapter-place').textContent = chapters[chapter - 1][0];
  $('chapter-title').textContent = chapters[chapter - 1][1];
  $('mission').textContent = chapters[chapter - 1][2];
  $('workshop-controls').hidden = state.chapter !== 0;
  $('workshop-controls').inert = state.phase !== 'run' || paused;
  for (const id of sections) {
    $(id).hidden = state.phase !== id;
    $(id).inert = paused || confirming;
  }
  $('pause').disabled = confirming || !canPause();
  const pauseLabel = paused ? 'Weiter' : 'Pause';
  $('pause').setAttribute('aria-label', pauseLabel);
  $('pause').title = pauseLabel;
  $('pause-label').textContent = pauseLabel;
  $('pause-icon').textContent = paused ? '▶' : 'Ⅱ';
  updateBell();
  $('sound').textContent = audio.muted ? 'Ton aus' : 'Ton an';
  $('sound').setAttribute('aria-pressed', String(!audio.muted));
  $('inventory').hidden = !['ready', 'run', 'chapter', 'market', 'over'].includes(state.phase);
  for (const element of $('sample-track').children) {
    element.dataset.captured = String(state.bank.includes(element.dataset.sound));
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
  updateStageProgress();
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
  updateStageProgress();
}
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

overlay('EMIL KLINGEL', 'Ab uf Feierabend.', 'Sammle acht Sounds bei Starrag. Über den Neumarkt geht es ins Heimstudio und zum ersten Clip.', [button('Feierabend starten →', newRun)], false);
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
