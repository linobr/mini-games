export const WIDTH = 900;
export const HEIGHT = 600;
export const TARGET = 8;
export const MELODY = [0, 1, 2, 1, 0, 2, 1, 0];
export const CHAPTERS = [
  { name: 'Feierabend bei Starrag', place: 'STARRAG-WERKSTATT', goal: '8 Samples aufnehmen. Werkzeugwagen ausweichen.', note: 'Maschinen werden zum Beat.', pace: 132 },
  { name: 'Ab uf Neumarkt', place: 'NEUMARKT', goal: '8 Sounds sammeln. An den Warteschlangen vorbei.', note: 'Neumarkt. Der andere Markt.', pace: 166 },
];
export const CONTACTS = [
  { id: 'lea', name: 'Lea', interest: 'Macht Musik und mag kleine Live-Konzerte.', question: 'Der Klingelton bleibt im Kopf. Wie ist der entstanden?',
    options: [
      { text: 'Aus Werkstatt-Sounds. Willst du mal zusammen einen Beat bauen?', line: 'Lea grinst. «Ja! Nächsten Mittwoch im Studio?»', match: true },
      { text: 'Ich tüftle noch dran. Magst du ihn trotzdem hören?', line: '«Klar. Schick mir die nächste Version.» Ein guter Anfang.', match: false },
    ] },
  { id: 'mia', name: 'Mia', interest: 'Mag gutes Essen und entdeckt gern neue Cafés.', question: 'Du kennst den Neumarkt? Wo gibt es etwas Gutes?',
    options: [
      { text: 'Poke Bowl und danach ein Kaffee? Wenn du Lust hast.', line: '«Deal. Aber diesmal stellen wir uns in die richtige Schlange.»', match: true },
      { text: 'Ich zeig dir meinen Lieblingsplatz beim nächsten Mal.', line: '«Gern. Heute muss ich weiter, wir sehen uns.»', match: false },
    ] },
];
export function freshRun() {
  return {
    phase: 'ready', chapter: 0, x: WIDTH / 2, y: 470,
    lives: 3, score: 0, samples: 0, clock: 0, spawnClock: 0,
    invincible: 0, cooldown: 0, pulse: 0, entities: [], id: 0,
    studioIndex: 0, studioMistakes: 0, studioFlash: -1, flashTime: 0,
    ending: null, contact: null,
  };
}
export function startRun() {
  const state = freshRun();
  state.phase = 'run';
  return state;
}
export function nextChapter(state) {
  if (state.phase !== 'chapter') return false;
  state.chapter = 1;
  state.samples = 0;
  state.x = WIDTH / 2;
  state.y = 470;
  state.entities = [];
  state.clock = 0;
  state.spawnClock = 0;
  state.invincible = 0;
  state.cooldown = 0;
  state.lives = Math.min(3, state.lives + 1);
  state.phase = 'run';
  return true;
}
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function setPosition(state, x, y) {
  if (state.phase !== 'run' || !Number.isFinite(x) || !Number.isFinite(y)) return;
  state.x = clamp(x, 200, 700);
  state.y = clamp(y, 205, 520);
}
export function ringBell(state) {
  if (state.phase !== 'run' || state.cooldown > 0) return false;
  const before = state.entities.length;
  state.entities = state.entities.filter(item => item.kind === 'note' || Math.hypot(item.x - state.x, item.y - state.y) > 158);
  state.score += (before - state.entities.length) * 15;
  state.cooldown = 4.5;
  state.pulse = .55;
  return true;
}
function spawn(state, random) {
  const lanes = [270, 390, 510, 630];
  const note = state.id % 3 !== 2;
  const lane = Math.min(3, Math.max(0, Math.floor(random() * 4)));
  const speed = CHAPTERS[state.chapter].pace + state.samples * 3;
  state.entities.push({
    id: state.id++, x: lanes[lane], y: 137,
    kind: note ? 'note' : 'obstacle', tone: state.id % 3,
    speed: note ? speed : speed * .92,
  });
}
export function tickRun(state, seconds, input = {}, random = Math.random) {
  if (state.phase !== 'run') return [];
  const dt = Number.isFinite(seconds) ? clamp(seconds, 0, .05) : 0;
  const events = [];
  state.clock += dt;
  state.invincible = Math.max(0, state.invincible - dt);
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.pulse = Math.max(0, state.pulse - dt);
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const length = Math.hypot(dx, dy) || 1;
  setPosition(state, state.x + dx / length * 335 * dt, state.y + dy / length * 335 * dt);
  state.spawnClock -= dt;
  if (state.spawnClock <= 0) {
    spawn(state, random);
    state.spawnClock = state.chapter ? .64 : .78;
  }
  for (const item of state.entities) {
    item.y += item.speed * dt;
    const touching = Math.hypot(item.x - state.x, item.y - state.y) < (item.kind === 'note' ? 37 : 40);
    if (!touching) continue;
    if (item.kind === 'note') {
      item.gone = true;
      state.samples++;
      state.score += 100;
      events.push({ type: 'sample', tone: item.tone });
      if (state.samples >= TARGET) {
        state.entities = [];
        state.score += state.lives * 50;
        state.phase = state.chapter === 0 ? 'chapter' : 'studio';
        events.push({ type: state.phase });
        return events;
      }
    } else if (state.invincible === 0) {
      item.gone = true;
      state.lives--;
      state.invincible = 1.5;
      events.push({ type: 'hit' });
      if (state.lives <= 0) {
        state.phase = 'over';
        events.push({ type: 'over' });
        return events;
      }
    }
  }
  state.entities = state.entities.filter(item => !item.gone && item.y < 650);
  return events;
}
export function playStudioNote(state, tone) {
  if (state.phase !== 'studio' || ![0, 1, 2].includes(tone)) return null;
  state.studioFlash = tone;
  state.flashTime = .18;
  const correct = tone === MELODY[state.studioIndex];
  if (!correct) {
    state.studioMistakes++;
    return { correct: false, complete: false };
  }
  state.studioIndex++;
  state.score += 75;
  const complete = state.studioIndex === MELODY.length;
  if (complete) {
    state.phase = 'meet';
    state.score += Math.max(0, 150 - state.studioMistakes * 25);
  }
  return { correct: true, complete };
}
export function chooseContact(state, id) {
  if (state.phase !== 'meet') return false;
  const contact = CONTACTS.find(person => person.id === id);
  if (!contact) return false;
  state.contact = id;
  state.phase = 'chat';
  return true;
}
export function answerContact(state, index) {
  if (state.phase !== 'chat' || ![0, 1].includes(index)) return false;
  const contact = CONTACTS.find(person => person.id === state.contact);
  if (!contact) return false;
  const option = contact.options[index];
  state.ending = { name: contact.name, line: option.line, match: option.match };
  state.score += option.match ? 250 : 150;
  state.phase = 'done';
  return true;
}
export const SAVE_KEY = 'mini-games:emil:v1';
export function loadRecord(storage) {
  try {
    const value = JSON.parse(storage.getItem(SAVE_KEY));
    return {
      best: Number.isFinite(value?.best) ? clamp(Math.floor(value.best), 0, 10000000) : 0,
      muted: value?.muted === true,
    };
  } catch { return { best: 0, muted: false }; }
}
export function saveRecord(storage, record) {
  try { storage.setItem(SAVE_KEY, JSON.stringify({ best: record.best, muted: record.muted })); return true; }
  catch { return false; }
}
