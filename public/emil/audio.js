import { STYLES } from './engine.js';

const SAMPLES = {
  relay: { wave: 'square', pitch: 840, end: 260, length: .07, volume: .05 },
  motor: { wave: 'sawtooth', pitch: 130, end: 58, length: .21, volume: .08 },
  metal: { wave: 'sine', pitch: 1050, end: 1040, length: .19, volume: .09 },
  coffee: { wave: 'triangle', pitch: 320, end: 96, length: .27, volume: .10 },
  bowl: { wave: 'sine', pitch: 690, end: 540, length: .32, volume: .13 },
  bell: { wave: 'sine', pitch: 740, end: 720, length: .34, volume: .11 },
  hit: { wave: 'triangle', pitch: 175, end: 76, length: .16, volume: .10 },
  kick: { wave: 'sine', pitch: 160, end: 42, length: .25, volume: .23 },
  snare: { wave: 'triangle', pitch: 460, end: 160, length: .075, volume: .11 },
  hat: { wave: 'square', pitch: 3290, end: 850, length: .035, volume: .024 },
};

export const beatStepDuration = style => 30 / STYLES[style].bpm;
export const BEAT_STEPS = 16;

export class EmilAudio {
  constructor(muted = false) {
    this.muted = muted;
    this.context = null;
    this.beatVoices = new Set();
  }
  async unlock() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio || this.muted) return;
      this.context ??= new Audio();
      if (this.context.state !== 'running') await this.context.resume();
    } catch { /* The game also works without sound. */ }
  }
  setMuted(muted) {
    this.muted = muted;
    if (muted) this.stopBeat();
  }
  voice({ wave, pitch, end, length, volume }, delay = 0, tracked = false) {
    const ctx = this.context;
    if (this.muted || !ctx || ctx.state !== 'running') return;
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(pitch, start);
    oscillator.frequency.exponentialRampToValueAtTime(end, start + length);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, start + length);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    if (tracked) this.beatVoices.add(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      this.beatVoices.delete(oscillator);
    };
    oscillator.start(start);
    oscillator.stop(start + length);
  }
  sample(name, delay = 0, tracked = false) {
    if (Object.hasOwn(SAMPLES, name)) this.voice(SAMPLES[name], delay, tracked);
  }
  stopBeat() {
    for (const voice of this.beatVoices) {
      try { voice.stop(); } catch { /* It may have just ended. */ }
    }
    this.beatVoices.clear();
  }
  beat(style, accents) {
    this.stopBeat();
    const house = style === 'house';
    const stepDuration = beatStepDuration(style);
    for (let step = 0; step < BEAT_STEPS; step++) {
      const slot = step % 8;
      const time = step * stepDuration;
      if ((house ? [0, 2, 4, 6] : [0, 3, 6]).includes(slot)) this.sample('kick', time, true);
      if ((house ? [2, 6] : [4]).includes(slot)) this.sample('snare', time, true);
      if (house ? slot % 2 === 1 : slot !== 4) this.sample('hat', time + (house ? .012 : 0), true);
      if (!house && slot === 7) this.sample('hat', time + stepDuration * .5, true);
      if (accents[slot]) this.sample(accents[slot], time, true);
    }
  }
}
