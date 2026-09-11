export class Sound {
  constructor(settings) { this.settings = settings; this.context = null; this.beat = 0; this.clock = 0; this.failed = false; }
  unlock() {
    if (this.failed) return;
    try {
      if (!this.context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) { this.failed = true; return; }
        this.context = new Audio();
        this.master = this.context.createGain(); this.master.connect(this.context.destination);
        this.music = this.context.createGain(); this.music.connect(this.master);
        this.sfx = this.context.createGain(); this.sfx.connect(this.master);
        const noise = this.context.createBuffer(1, this.context.sampleRate * .18, this.context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
        this.noise = noise;
      }
      this.context.resume().catch(() => {}); this.apply();
    } catch { this.failed = true; }
  }
  apply() {
    if (!this.context) return;
    const now = this.context.currentTime, s = this.settings;
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.master / 100, now, .03);
    this.music.gain.setTargetAtTime(s.music / 100, now, .03);
    this.sfx.gain.setTargetAtTime(s.sfx / 100, now, .03);
  }
  tone(freq, end, duration, volume = .1, type = 'sine', bus = 'sfx') {
    if (!this.context || this.context.state !== 'running' || this.settings.muted) return;
    try {
      const ctx = this.context, now = ctx.currentTime;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
      gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      osc.connect(gain); gain.connect(this[bus]); osc.start(now); osc.stop(now + duration + .01);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch { /* A device/audio interruption must never interrupt gameplay. */ }
  }
  hat(volume = .045) {
    if (!this.context || this.context.state !== 'running' || this.settings.muted) return;
    try {
    const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.value = 7000; gain.gain.value = volume;
    source.connect(filter); filter.connect(gain); gain.connect(this.music); source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    } catch { /* Audio-device interruptions are optional, not fatal. */ }
  }
  play(name, amount = 1) {
    if (name === 'dash') this.tone(210, 1050, .15, .1, 'triangle');
    if (name === 'reflect') this.tone(580 + Math.min(amount, 8) * 65, 1250, .14, .075, 'sine');
    if (name === 'kill') { this.tone(130, 30, .18, .16, 'sawtooth'); this.tone(620, 180, .1, .065); }
    if (name === 'hit') this.tone(90, 25, .32, .24, 'sawtooth');
    if (name === 'near') this.tone(900, 1600, .06, .035);
    if (name === 'pickup') this.tone(760, 1240, .18, .1, 'triangle');
    if (name === 'rift') { this.tone(55, 230, 1.2, .14, 'sawtooth'); this.tone(440, 880, .9, .1); }
    if (name === 'end') this.tone(180, 30, .65, .15, 'triangle');
    if (name === 'ui') this.tone(440, 640, .06, .065, 'triangle');
  }
  tick(dt, active, combo, phase) {
    if (!active || !this.context || this.context.state !== 'running') { this.clock = 0; return; }
    this.clock -= dt;
    if (this.clock > 0) return;
    this.clock = 60 / (phase ? 126 : 112) / 4;
    const b = this.beat++ % 32;
    if (b % 4 === 0) this.tone(145, 42, .19, .24, 'sine', 'music');
    if (b % 8 === 4) this.tone(185, 105, .1, .09, 'triangle', 'music');
    if (b % 2 === 0 || combo >= 4) this.hat(b % 4 === 2 ? .05 : .02);
    const bass = [55, 55, 65.41, 49][Math.floor(b / 8)];
    if (b % 4 === 2) this.tone(bass, bass, .22, .13, 'triangle', 'music');
    if (combo >= 2 && b % 2 === 0) {
      const arp = [1, 1.5, 2, 2.5, 2, 1.5, 3, 2][b / 2 % 8];
      this.tone(bass * arp * 4, bass * arp * 4, .23, .045, 'sine', 'music');
    }
  }
}
