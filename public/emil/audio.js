// The oscillator and gain envelope follow the existing Mini Games Web Audio pattern.
export class EmilAudio {
  constructor(muted = false) { this.muted = muted; this.context = null; }
  unlock() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.context ??= new Audio();
      this.context.resume().catch(() => {});
    } catch { this.context = null; }
  }
  tone(note = 0, delay = 0, length = .22) {
    if (this.muted || this.context?.state !== 'running') return;
    try {
      const ctx = this.context;
      const start = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = [392, 493.88, 587.33][note] ?? 196;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.1, start + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, start + length);
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.start(start); oscillator.stop(start + length + .02);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Audio remains optional on interrupted devices. */ }
  }
  melody(notes) { notes.forEach((note, index) => this.tone(note, index * .28)); }
}
