export const WIDTH = 900;
export const HEIGHT = 600;
export const TARGET = 8;
export const SOUNDS = {
  relay: { name: 'Relais', mark: 'R', color: '#aee5cd' },
  motor: { name: 'Motor', mark: 'M', color: '#e9ce93' },
  metal: { name: 'Metall', mark: 'K', color: '#a8d2f2' },
  coffee: { name: 'Espresso', mark: 'E', color: '#f2c696' },
  bowl: { name: 'Schüssel', mark: 'S', color: '#e7b7e0' },
};
const WORKSHOP_SOUNDS = ['relay', 'motor', 'metal'];
export const ORDERS = {
  coffee: { name: 'Kaffee', moves: 2, score: 160 },
  bowl: { name: 'Poke Bowl', moves: 4, score: 300 },
};
export const MARKET_PERIOD = 1.8;
export const STYLES = {
  house: { name: 'House', bpm: 124 },
  trap: { name: 'Trap', bpm: 88 },
};
export const CLIPS = {
  workshop: { name: 'Werkstatt', caption: 'Feierabend bei Starrag', scene: 0 },
  market: { name: 'Neumarkt', caption: 'Pausenstopp am Neumarkt', scene: 1 },
  solo: { name: 'Solo unterwegs', caption: 'Spontan ans Meer', scene: 3 },
  lino: { name: 'Mit Lino unterwegs', caption: 'Zu zweit ans Meer', scene: 3 },
};
export const CONTACTS = [
  { id: 'lea', name: 'Lea', interest: 'Sie macht Musik und will wissen, wie der Beat entstanden ist.' },
  { id: 'mia', name: 'Mia', interest: 'Sie mag Cafés und will wissen, wo Emil den Clip gedreht hat.' },
];
export function freshRun() {
  return {
    phase: 'ready', chapter: 0, x: WIDTH / 2, y: 470,
    lives: 3, score: 0, samples: 0, clock: 0, spawnClock: 0,
    invincible: 0, cooldown: 0, pulse: 0, entities: [], id: 0,
    bank: [], order: null, queueMoves: 0, queueClock: 0,
    style: 'house', accents: Array(8).fill(null), clips: [],
    ending: null, contact: null, previewClip: null,
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
  state.x = WIDTH / 2;
  state.y = 470;
  state.entities = [];
  state.clock = 0;
  state.spawnClock = 0;
  state.invincible = 0;
  state.cooldown = 0;
  state.lives = Math.min(3, state.lives + 1);
  state.phase = 'market';
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
  const speed = 132 + state.samples * 3;
  const sampleIndex = Math.floor(state.id / 3) * 2 + state.id % 3;
  state.entities.push({
    id: state.id++, x: lanes[lane], y: 137,
    kind: note ? 'note' : 'obstacle', sound: WORKSHOP_SOUNDS[sampleIndex % WORKSHOP_SOUNDS.length],
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
    state.spawnClock = .78;
  }
  for (const item of state.entities) {
    item.y += item.speed * dt;
    const touching = Math.hypot(item.x - state.x, item.y - state.y) < (item.kind === 'note' ? 37 : 40);
    if (!touching) continue;
    if (item.kind === 'note') {
      item.gone = true;
      state.samples++;
      state.score += 100;
      if (!state.bank.includes(item.sound)) state.bank.push(item.sound);
      events.push({ type: 'sample', sound: item.sound });
      if (state.samples >= TARGET) {
        state.entities = [];
        state.score += state.lives * 50;
        state.phase = 'chapter';
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
export function selectOrder(state, order) {
  if (state.phase !== 'market' || state.order || !Object.hasOwn(ORDERS, order)) return false;
  state.order = order;
  state.queueClock = 0;
  return true;
}
export function tickQueue(state, seconds) {
  if (state.phase !== 'market' || !state.order || !Number.isFinite(seconds)) return;
  state.queueClock = (state.queueClock + clamp(seconds, 0, .05)) % MARKET_PERIOD;
}
export function queueProgress(state) {
  return state.queueClock / MARKET_PERIOD;
}
export function queueReady(state) {
  const progress = queueProgress(state);
  return progress >= .32 && progress <= .70;
}
export function moveQueue(state) {
  if (state.phase !== 'market' || !state.order || !queueReady(state)) return false;
  const order = ORDERS[state.order];
  state.queueMoves++;
  state.queueClock = 0;
  if (state.queueMoves === order.moves) {
    state.bank.push(state.order);
    state.accents = [state.bank[0], null, state.bank[1] ?? state.bank[0], null, state.order, null, state.bank[2] ?? state.bank[0], null];
    state.score += order.score;
    state.phase = 'studio';
  }
  return true;
}
export function setStyle(state, style) {
  if (state.phase !== 'studio' || !Object.hasOwn(STYLES, style)) return false;
  state.style = style;
  return true;
}
export function setAccent(state, step, sound) {
  if (state.phase !== 'studio' || !Number.isInteger(step) || step < 0 || step >= state.accents.length) return false;
  if (sound !== null && !state.bank.includes(sound)) return false;
  state.accents[step] = sound;
  return true;
}
export function finishMix(state) {
  if (state.phase !== 'studio' || !state.accents.some(Boolean)) return false;
  state.phase = 'edit';
  state.score += 180 + new Set(state.accents.filter(Boolean)).size * 40;
  return true;
}
export function chooseClip(state, clip) {
  if (state.phase !== 'edit' || !Object.hasOwn(CLIPS, clip) || state.clips.length >= 3 || state.clips.includes(clip)) return false;
  state.clips.push(clip);
  return true;
}
export function finishEdit(state) {
  if (state.phase !== 'edit' || state.clips.length !== 3) return false;
  state.phase = 'meet';
  state.score += 150;
  return true;
}
export function chooseContact(state, id) {
  if (state.phase !== 'meet' || !CONTACTS.some(person => person.id === id)) return false;
  state.contact = id;
  state.phase = 'chat';
  return true;
}
export function conversation(state) {
  if (state.contact === 'lea') {
    return {
      question: 'Wie ist dein ' + STYLES[state.style].name + '-Beat entstanden?',
      options: [
        { text: 'Hier, hör dir meinen Beat an. Wollen wir mal zusammen einen bauen?', line: '«Ja, bring dein Projekt mit. Ich hab einen Basslauf, der dazu passen könnte.»', match: true, play: true },
        { text: 'Ich schicke dir den Clip, sobald ich ihn fertig geschnitten habe.', line: '«Gerne. Schick mir auch den Beat, wenn du magst.»', match: false },
      ],
    };
  }
  const travel = state.clips.find(clip => clip === 'solo' || clip === 'lino');
  const question = travel === 'solo' ? 'Machst du solche Ausflüge öfter allein?' : travel === 'lino' ? 'Wie war der Ausflug mit Lino?' : 'Wo hast du die Szene am Neumarkt gedreht?';
  return {
    question,
    options: [
      { text: 'Erzähl ich dir gern bei ' + (state.order === 'coffee' ? 'einem Kaffee' : 'einer Poke Bowl') + '. Hast du Lust?', line: '«Ja, gerne. Du kennst den Neumarkt ja schon.»', match: true },
      { text: 'Ich schicke dir den Clip. Filmen macht gerade mehr Spass als Flirten.', line: '«Mach das. Auf die nächste Version bin ich gespannt.»', match: false },
    ],
  };
}
export function answerContact(state, index) {
  if (state.phase !== 'chat' || ![0, 1].includes(index)) return false;
  const contact = CONTACTS.find(person => person.id === state.contact);
  const option = conversation(state).options[index];
  state.ending = { name: contact.name, line: option.line, match: option.match, play: option.play === true };
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
