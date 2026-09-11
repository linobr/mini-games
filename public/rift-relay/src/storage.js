import { clamp } from './math.js';

export const STORAGE_KEY = 'mini-games.rift-relay.v1';
export const ACHIEVEMENTS = [
  ['first', 'Erster Kontakt', 'Beende deinen ersten Run.'],
  ['reflect', 'Retour an Absender', 'Wandle 10 Kugeln in einem Run um.'],
  ['relay', 'Kettenreaktion', 'Wandle 5 Kugeln mit einem Dash um.'],
  ['thirty', 'Eingespielt', 'Überlebe 30 Sekunden.'],
  ['rift', 'Auf der anderen Seite', 'Erreiche den Riss nach 60 Sekunden.'],
  ['clean', 'Unberührbar', 'Überlebe 45 Sekunden ohne Treffer.'],
  ['combo', 'Hochspannung', 'Erreiche einen Multiplikator von ×8.'],
  ['risk', 'Haarscharf', 'Schaffe 15 knappe Ausweichmanöver.'],
  ['hunter', 'Stillgelegt', 'Zerstöre 30 Sender in einem Run.'],
  ['score', 'Fünfstellig', 'Erreiche 10 000 Punkte.'],
  ['daily', 'Tagesschicht', 'Beende einen Daily Run.'],
  ['complete', 'Signal empfangen', 'Überlebe den kompletten 180-Sekunden-Run.'],
];
export const SKINS = [
  { id: 'ion', name: 'ION', color: '#83f9e0', requires: null },
  { id: 'solar', name: 'SOLAR', color: '#f6dc85', requires: 'rift' },
  { id: 'frost', name: 'FROST', color: '#b9bfff', requires: 'score' },
];

export class Storage {
  constructor(storage, reducedMotion = false) {
    this.storage = storage;
    this.available = true;
    this.data = {
      best: 0, bestCombo: 1, runs: 0, time: 0, kills: 0, daily: {}, achievements: [], skin: 'ion',
      settings: { master: 65, music: 30, sfx: 70, shake: 65, particles: true, quality: 'auto', reducedMotion, fps: false, muted: false },
    };
    try {
      const raw = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (const key of ['best', 'bestCombo', 'runs', 'time', 'kills'])
          if (Number.isFinite(raw[key])) this.data[key] = clamp(raw[key], 0, 1e12);
        if (Array.isArray(raw.achievements)) this.data.achievements = ACHIEVEMENTS.map(a => a[0]).filter(id => raw.achievements.includes(id));
        if (SKINS.some(s => s.id === raw.skin && (!s.requires || this.data.achievements.includes(s.requires)))) this.data.skin = raw.skin;
        if (raw.daily && typeof raw.daily === 'object' && !Array.isArray(raw.daily))
          for (const [key, value] of Object.entries(raw.daily).slice(-14))
            if (/^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(value)) this.data.daily[key] = clamp(value, 0, 1e12);
        const settings = raw.settings || {};
        for (const key of ['master', 'music', 'sfx', 'shake'])
          if (Number.isFinite(settings[key])) this.data.settings[key] = clamp(settings[key], 0, 100);
        for (const key of ['particles', 'reducedMotion', 'fps', 'muted'])
          if (typeof settings[key] === 'boolean') this.data.settings[key] = settings[key];
        if (['auto', 'low', 'medium', 'high'].includes(settings.quality)) this.data.settings.quality = settings.quality;
      }
      if (!storage) this.available = false;
    } catch { this.available = false; }
  }
  save() {
    if (!this.storage) { this.available = false; return; }
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data)); this.available = true; }
    catch { this.available = false; }
  }
  record(game, date) {
    const d = this.data, score = Math.floor(game.score);
    const highscore = score > d.best;
    d.best = Math.max(d.best, score); d.bestCombo = Math.max(d.bestCombo, game.bestCombo);
    d.runs++; d.time += Math.floor(game.time); d.kills += game.kills;
    if (game.mode === 'daily') {
      d.daily[date] = Math.max(d.daily[date] || 0, score);
      for (const key of Object.keys(d.daily).sort().slice(0, -14)) delete d.daily[key];
    }
    const earned = {
      first: true, reflect: game.reflected >= 10, relay: game.bestRelay >= 5,
      thirty: game.time >= 30, rift: game.time >= 60, clean: game.firstHitTime >= 45,
      combo: game.bestCombo >= 8, risk: game.nearMisses >= 15, hunter: game.kills >= 30,
      score: score >= 10000, daily: game.mode === 'daily', complete: game.won,
    };
    const unlocked = [];
    for (const [id] of ACHIEVEMENTS) if (earned[id] && !d.achievements.includes(id)) { d.achievements.push(id); unlocked.push(id); }
    this.save();
    return { highscore, unlocked };
  }
}
