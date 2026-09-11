export class Input {
  constructor(isPlaying) {
    this.held = new Set(); this.pressed = new Set(); this.released = new Set(); this.dashQueued = false;
    this.touchX = 0; this.touchY = 0; this.pointer = null; this.sample = { x: 0, y: 0, dash: false };
    const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'];
    window.addEventListener('keydown', event => {
      if (!isPlaying() || !gameKeys.includes(event.code)) return;
      event.preventDefault();
      if (!this.held.has(event.code)) {
        this.pressed.add(event.code);
        if (['Space', 'ShiftLeft', 'ShiftRight'].includes(event.code)) this.dashQueued = true;
      }
      this.held.add(event.code);
    });
    window.addEventListener('keyup', event => { this.held.delete(event.code); this.released.add(event.code); });
    const stick = document.querySelector('#stick'), knob = document.querySelector('#stick-knob');
    this.knob = knob;
    stick.addEventListener('pointerdown', event => {
      if (!isPlaying() || this.pointer !== null) return;
      event.preventDefault(); this.pointer = event.pointerId; stick.setPointerCapture(event.pointerId);
      const rect = stick.getBoundingClientRect(); this.centerX = rect.left + rect.width / 2; this.centerY = rect.top + rect.height / 2;
      this.moveStick(event);
    });
    stick.addEventListener('pointermove', event => { if (event.pointerId === this.pointer) this.moveStick(event); });
    const release = event => {
      if (event.pointerId !== this.pointer) return;
      this.pointer = null; this.touchX = this.touchY = 0; knob.style.transform = '';
    };
    stick.addEventListener('pointerup', release); stick.addEventListener('pointercancel', release); stick.addEventListener('lostpointercapture', release);
    document.querySelector('#touch-dash').addEventListener('pointerdown', event => {
      if (isPlaying()) { event.preventDefault(); this.dashQueued = true; }
    });
  }
  moveStick(event) {
    const dx = event.clientX - this.centerX, dy = event.clientY - this.centerY;
    const length = Math.hypot(dx, dy), magnitude = Math.min(1, length / 35);
    this.touchX = length > 4 ? dx / length * magnitude : 0;
    this.touchY = length > 4 ? dy / length * magnitude : 0;
    this.knob.style.transform = `translate(${this.touchX * 28}px,${this.touchY * 28}px)`;
  }
  read() {
    const has = code => this.held.has(code);
    this.sample.x = (has('KeyD') || has('ArrowRight') ? 1 : 0) - (has('KeyA') || has('ArrowLeft') ? 1 : 0) + this.touchX;
    this.sample.y = (has('KeyS') || has('ArrowDown') ? 1 : 0) - (has('KeyW') || has('ArrowUp') ? 1 : 0) + this.touchY;
    this.sample.dash = this.dashQueued;
    this.dashQueued = false; this.pressed.clear(); this.released.clear();
    return this.sample;
  }
  clear() {
    this.held.clear(); this.pressed.clear(); this.released.clear(); this.dashQueued = false;
    this.touchX = this.touchY = 0; this.pointer = null; this.knob.style.transform = '';
  }
}
