import { ARENA_RADIUS as R, TAU, clamp, Pool, seededRandom } from './math.js';

const ORANGE = '#ff865f', CYAN = '#83f9e0';
const palette = [CYAN, ORANGE, '#eef3e9', '#f6dc85'];

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.settings = settings;
    if (!this.ctx) throw new Error('Canvas 2D unavailable');
    this.particles = new Pool(360); this.rings = new Pool(18); this.labels = new Pool(16);
    this.trail = new Float32Array(72); this.trailCount = 0; this.trailCursor = 0; this.trailClock = 0;
    this.shake = 0; this.flash = 0; this.kick = 0; this.autoLevel = 2; this.slowTime = 0; this.smoothTime = 0;
    this.skin = CYAN; this.visualTime = 0; this.bgStars = [];
    const random = seededRandom(98765);
    for (let i = 0; i < 100; i++) this.bgStars.push({ x: random(), y: random(), size: random() * 1.1 + .3, alpha: random() * .36 + .05 });
    this.glows = palette.map(color => this.createGlow(color));
    this.floor = this.createFloor(); this.resize();
  }
  get level() { return this.settings.quality === 'auto' ? this.autoLevel : { low: 0, medium: 1, high: 2 }[this.settings.quality]; }
  get budget() { return this.settings.particles ? [50, 150, 300][this.level] : 0; }
  createGlow(color) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96;
    const c = canvas.getContext('2d'), grad = c.createRadialGradient(48, 48, 0, 48, 48, 48);
    grad.addColorStop(0, color + '90'); grad.addColorStop(.2, color + '37'); grad.addColorStop(1, color + '00');
    c.fillStyle = grad; c.fillRect(0, 0, 96, 96); return canvas;
  }
  createFloor() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 768;
    const c = canvas.getContext('2d'); c.translate(384, 384); c.scale(1.08, 1.08);
    const fill = c.createRadialGradient(-70, -90, 30, 0, 0, 360);
    fill.addColorStop(0, '#12262d'); fill.addColorStop(.6, '#0d1d26'); fill.addColorStop(1, '#0b151e');
    c.fillStyle = fill; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.save(); c.clip();
    c.lineWidth = .7; c.strokeStyle = '#526d7320'; c.beginPath();
    for (let i = -352; i <= 352; i += 32) { c.moveTo(i, -352); c.lineTo(i, 352); c.moveTo(-352, i); c.lineTo(352, i); }
    c.stroke(); c.strokeStyle = '#789a9a19'; c.lineWidth = 1;
    for (const radius of [80, 160, 240, 309]) { c.beginPath(); c.arc(0, 0, radius, 0, TAU); c.stroke(); }
    c.setLineDash([4, 9]); c.strokeStyle = '#b0d0d02a'; c.beginPath(); c.arc(0, 0, 283, 0, TAU); c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#aec9bf25'; c.beginPath(); c.moveTo(-340, 0); c.lineTo(340, 0); c.moveTo(0, -340); c.lineTo(0, 340); c.stroke();
    c.font = '9px monospace'; c.fillStyle = '#78939b55'; c.textAlign = 'center';
    for (let i = 0; i < 8; i++) { const angle = i * TAU / 8; c.save(); c.translate(Math.cos(angle) * 296, Math.sin(angle) * 296); c.rotate(angle + Math.PI / 2); c.fillText(String(i + 1).padStart(2, '0'), 0, 3); c.restore(); }
    c.restore(); return canvas;
  }
  resize() {
    this.width = window.innerWidth; this.height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.level === 0 ? 1.25 : 1.75);
    this.dpr = dpr; this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr);
  }
  reset() { this.particles.clear(); this.rings.clear(); this.labels.clear(); this.trailCount = 0; this.trailCursor = 0; this.flash = 0; this.shake = 0; }
  adapt(frameTime, active) {
    if (!active || this.settings.quality !== 'auto') return;
    if (frameTime > .025) { this.slowTime += Math.min(frameTime, .1); this.smoothTime = 0; }
    else { this.slowTime = Math.max(0, this.slowTime - frameTime * .35); this.smoothTime += frameTime; }
    if (this.slowTime > 3 && this.autoLevel > 0) { this.autoLevel--; this.slowTime = 0; this.resize(); }
    if (this.smoothTime > 16 && this.autoLevel < 2) { this.autoLevel++; this.smoothTime = 0; this.resize(); }
  }
  burst(x, y, colorIndex, count, force = 1) {
    if (!this.settings.particles) return;
    const max = this.budget, amount = this.settings.reducedMotion ? Math.ceil(count / 3) : count;
    for (let i = 0; i < amount && this.particles.count < max; i++) {
      const angle = Math.random() * TAU, speed = (30 + Math.random() * 150) * force;
      const life = .2 + Math.random() * .55;
      this.particles.acquire({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, size: 1 + Math.random() * 2.3, color: colorIndex });
    }
  }
  ring(x, y, color = 0, radius = 15, max = 85) { this.rings.acquire({ x, y, color, radius, max, life: .5 }); }
  events(events, quiet = false) {
    for (const ev of events) {
      const { type, x, y, value } = ev;
      if (type === 'dash') { this.burst(x, y, 0, 14); this.ring(x, y, 0, 8, 55); }
      if (type === 'reflect') { this.burst(x, y, 0, 7, .7); this.ring(x, y, 0, 5, 30); this.shake = Math.max(this.shake, 1.3); }
      if (type === 'impact') this.burst(x, y, 2, 5, .5);
      if (type === 'kill') {
        this.burst(x, y, 1, 26); this.burst(x, y, 2, 8); this.ring(x, y, 1, 8, 72); this.shake = Math.max(this.shake, 4);
        this.labels.acquire({ x, y: y - 24, text: '+' + value, life: .8 });
      }
      if (type === 'hit') { this.burst(x, y, 1, 26); this.shake = 9; this.flash = .22; }
      if (type === 'pickup') this.burst(x, y, value ? 3 : 0, 8, .6);
      if (type === 'near') this.labels.acquire({ x, y: y - 20, text: 'KNAPP!', life: .6 });
      if (type === 'waveDash') { this.burst(x, y, 0, 20); this.labels.acquire({ x, y: y - 25, text: 'PULSBRUCH +' + value, life: 1 }); }
      if (type === 'rift' || type === 'coreKill') { this.shake = 8; this.kick = 1; this.ring(0, 0, 0, 40, 500); this.ring(0, 0, 2, 30, 430); this.burst(0, 0, 0, 55, 2); }
      if (type === 'end' && !value) { this.shake = 11; this.burst(x, y, 2, 55, 1.5); this.ring(x, y, 1, 15, 220); }
    }
    if (quiet) this.shake = this.flash = 0;
  }
  update(dt, game, active) {
    if (!this.settings.reducedMotion) this.visualTime += dt;
    this.shake = Math.max(0, this.shake - dt * 22); this.flash = Math.max(0, this.flash - dt); this.kick = Math.max(0, this.kick - dt * .8);
    for (const p of this.particles.items) {
      if (!p.active) continue;
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-dt * 4); p.vy *= Math.exp(-dt * 4);
      if (p.life <= 0) p.active = false;
    }
    for (const r of this.rings.items) { if (!r.active) continue; r.life -= dt; r.radius += (r.max - r.radius) * dt * 7; if (r.life <= 0) r.active = false; }
    for (const l of this.labels.items) { if (!l.active) continue; l.life -= dt; l.y -= dt * 24; if (l.life <= 0) l.active = false; }
    if (active && !this.settings.reducedMotion) {
      this.trailClock += dt;
      if (this.trailClock >= .016) {
        this.trailClock = 0; this.trail[this.trailCursor * 2] = game.player.x; this.trail[this.trailCursor * 2 + 1] = game.player.y;
        this.trailCursor = (this.trailCursor + 1) % 36; this.trailCount = Math.min(36, this.trailCount + 1);
      }
    }
  }
  glow(x, y, size, color = 0, alpha = 1) {
    if (this.level === 0) return;
    const c = this.ctx; c.globalAlpha = alpha; c.drawImage(this.glows[color], x - size / 2, y - size / 2, size, size); c.globalAlpha = 1;
  }
  polygon(x, y, radius, sides, angle) {
    const c = this.ctx; c.beginPath();
    for (let i = 0; i <= sides; i++) { const a = angle + i * TAU / sides; const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius; if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); }
    c.closePath();
  }
  stage(phase, menu) {
    const c = this.ctx, time = this.visualTime;
    c.save(); c.translate(0, 16); c.strokeStyle = '#02080e'; c.lineWidth = 39; c.beginPath(); c.arc(0, 0, R + 17, 0, TAU); c.stroke(); c.restore();
    c.drawImage(this.floor, -355.56, -355.56, 711.12, 711.12);
    const segments = 48;
    for (let i = 0; i < segments; i++) {
      const a = i * TAU / segments, gap = phase ? .018 : .008;
      const offset = phase ? (Math.sin(i * 3) + 1) * 5 : 0;
      c.beginPath(); c.arc(0, 0, R + 24 + offset, a + gap, a + TAU / segments - gap); c.arc(0, 0, R + 6 + offset, a + TAU / segments - gap, a + gap, true); c.closePath();
      c.fillStyle = i % 4 === 0 ? '#263c46' : '#172c37'; c.fill(); c.strokeStyle = '#4c69734b'; c.lineWidth = .8; c.stroke();
      if (i % 4 === 0 || phase) {
        c.strokeStyle = phase && i % 4 !== 0 ? '#b897c840' : '#83f9e065'; c.lineWidth = 2;
        c.beginPath(); c.arc(0, 0, R + 20 + offset, a + .025, a + .10); c.stroke();
      }
    }
    c.strokeStyle = '#72979f80'; c.lineWidth = .9; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
    c.strokeStyle = '#74939324'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, R + 47, 0, TAU); c.stroke();
    for (let i = 0; i < 80; i++) {
      const a = i * TAU / 80, radius = R + 49;
      c.strokeStyle = i % 10 === 0 ? '#9cbecb80' : '#72919e35'; c.beginPath();
      c.moveTo(Math.cos(a) * radius, Math.sin(a) * radius); c.lineTo(Math.cos(a) * (radius + (i % 10 === 0 ? 10 : 4)), Math.sin(a) * (radius + (i % 10 === 0 ? 10 : 4))); c.stroke();
    }
    if (phase || menu) {
      this.glow(0, 0, 370, 0, .4);
      const r = menu ? 75 : 57;
      c.fillStyle = '#050c13'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      for (let i = 0; i < 5; i++) {
        c.save(); c.rotate(time * (.08 + i * .035) * (i % 2 ? 1 : -1));
        c.scale(1, .36 + i * .11); c.strokeStyle = i % 2 ? '#83f9e075' : '#b8d5e042'; c.lineWidth = i === 0 ? 3 : 1;
        c.beginPath(); c.arc(0, 0, r + 22 + i * 7, .22, Math.PI * 1.87); c.stroke(); c.restore();
      }
      this.glow(0, 0, 96, 0, .7); c.fillStyle = '#a5fff2'; this.polygon(0, 0, 6, 4, time * .5); c.fill();
    } else {
      c.strokeStyle = '#83f9e029'; c.lineWidth = 1; this.polygon(0, 0, 42, 6, Math.PI / 6); c.stroke();
      c.strokeStyle = '#8eada634'; c.beginPath(); c.moveTo(-9, 0); c.lineTo(9, 0); c.moveTo(0, -9); c.lineTo(0, 9); c.stroke();
    }
    c.fillStyle = '#75909d50'; c.font = '8px monospace'; c.textAlign = 'center'; c.fillText('R / R    —    FIELD 07', 0, R + 85);
  }
  enemy(e) {
    const c = this.ctx, core = e.type === 'core', size = e.radius;
    const appearance = clamp(e.age / .8, 0, 1);
    c.save(); c.translate(e.x, e.y);
    if (e.age < 1) {
      c.strokeStyle = '#ff865f80'; c.setLineDash([3, 5]); c.lineWidth = 1; c.beginPath(); c.arc(0, 0, size + 20 * (1 - appearance), 0, TAU); c.stroke(); c.setLineDash([]);
    }
    c.scale(.5 + appearance * .5, .5 + appearance * .5);
    this.glow(0, 0, core ? 170 : 86, 1, e.flash > 0 ? .8 : .4);
    c.fillStyle = '#04080b'; this.polygon(0, 6, size + 3, e.type === 'hunter' ? 3 : core ? 6 : 4, e.angle); c.fill();
    c.fillStyle = e.flash > 0 ? '#ffeac9' : '#312224'; c.strokeStyle = ORANGE; c.lineWidth = core ? 2 : 1.4;
    this.polygon(0, 0, size, e.type === 'hunter' ? 3 : core ? 6 : 4, e.angle); c.fill(); c.stroke();
    c.strokeStyle = '#ffc19a70'; c.lineWidth = 1; this.polygon(0, 0, size * .6, core ? 6 : 4, -e.angle); c.stroke();
    c.fillStyle = '#ffba91'; this.polygon(0, 0, core ? 8 : 4, 4, Math.PI / 4); c.fill();
    if (e.fire < .65 && e.age > 1) {
      const a = Math.atan2(this.game.player.y - e.y, this.game.player.x - e.x);
      c.strokeStyle = '#ffad6e75'; c.lineWidth = 1; c.setLineDash([3, 5]); c.beginPath(); c.moveTo(Math.cos(a) * (size + 4), Math.sin(a) * (size + 4)); c.lineTo(Math.cos(a) * 90, Math.sin(a) * 90); c.stroke(); c.setLineDash([]);
      c.strokeStyle = '#ffce96'; c.beginPath(); c.arc(0, 0, size + 6, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - e.fire / .65)); c.stroke();
    }
    if (e.hp < e.maxHp || core) {
      c.fillStyle = '#604039'; c.fillRect(-size, -size - 12, size * 2, 2); c.fillStyle = ORANGE; c.fillRect(-size, -size - 12, size * 2 * e.hp / e.maxHp, 2);
    }
    c.restore();
  }
  player(p, alive) {
    const c = this.ctx;
    if (!alive) return;
    if (!this.settings.reducedMotion && this.trailCount > 1) {
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (let i = 1; i < this.trailCount; i++) {
        const a = (this.trailCursor - this.trailCount + i - 1 + 36) % 36, b = (a + 1) % 36, alpha = i / this.trailCount;
        c.globalAlpha = alpha * .38; c.strokeStyle = this.skin; c.lineWidth = alpha * (p.dash > 0 ? 10 : 4);
        c.beginPath(); c.moveTo(this.trail[a * 2], this.trail[a * 2 + 1]); c.lineTo(this.trail[b * 2], this.trail[b * 2 + 1]); c.stroke();
      }
      c.globalAlpha = 1;
    }
    c.save(); c.translate(p.x, p.y);
    if (p.dash > 0) {
      this.glow(0, 0, 125, 0, .8); c.strokeStyle = '#a1ffebbb'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 52, 0, TAU); c.stroke();
      c.strokeStyle = '#a1ffeb25'; c.lineWidth = 11; c.beginPath(); c.arc(0, 0, 46, 0, TAU); c.stroke();
    } else this.glow(0, 0, 67, 0, .65);
    if (p.invulnerable > 0) { c.strokeStyle = '#e6fff99c'; c.lineWidth = 1; c.setLineDash([4, 5]); c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.stroke(); c.setLineDash([]); }
    c.rotate(Math.atan2(p.dy, p.dx) + Math.PI / 2);
    c.fillStyle = '#071110'; c.strokeStyle = this.skin; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -15); c.lineTo(11, 11); c.lineTo(0, 6); c.lineTo(-11, 11); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f1fff7'; c.beginPath(); c.moveTo(0, -8); c.lineTo(3, 3); c.lineTo(-3, 3); c.closePath(); c.fill();
    c.fillStyle = this.skin; c.beginPath(); c.moveTo(-3, 11); c.lineTo(3, 11); c.lineTo(0, p.dash > 0 ? 33 : 16 + Math.sin(this.visualTime * 33) * 3); c.closePath(); c.fill(); c.restore();
  }
  draw(game, mode = 'play') {
    this.game = game;
    const c = this.ctx, w = this.width, h = this.height, menu = mode === 'menu', mobile = w <= 760;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#080e15'; c.fillRect(0, 0, w, h);
    const cx = menu ? (mobile ? w * .6 : w * .725) : w * .5;
    const cy = menu ? (mobile ? h * .24 : h * .50) : h * (mobile ? .46 : .53);
    const scale = menu ? (mobile ? Math.min(w / 680, h / 990) : Math.min(w / 1420, h / 865)) : Math.min(w / (mobile ? 790 : 930), h / (mobile ? 1080 : 920));
    const background = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .62);
    background.addColorStop(0, game.phase === 2 ? '#213144' : '#16373a'); background.addColorStop(.45, '#0c1822'); background.addColorStop(1, '#080d14');
    c.fillStyle = background; c.fillRect(0, 0, w, h);
    if (this.level > 0) for (const star of this.bgStars) { c.globalAlpha = star.alpha; c.fillStyle = '#bce6f7'; c.fillRect(star.x * w, (star.y * h + this.visualTime * star.size * 1.5) % h, star.size, star.size); }
    c.globalAlpha = 1;
    c.strokeStyle = '#52687714'; c.lineWidth = 1;
    for (let x = w % 120; x < w; x += 120) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = h % 120; y < h; y += 120) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    const shake = this.settings.reducedMotion || menu ? 0 : this.shake * this.settings.shake / 100;
    c.translate(cx + (Math.random() - .5) * shake, cy + (Math.random() - .5) * shake);
    const zoom = this.settings.reducedMotion ? 1 : 1 - this.kick * .055;
    c.scale(scale * zoom, scale * zoom * (menu ? .79 : .88));
    if (menu && !mobile) c.rotate(-.12);
    this.stage(game.phase, menu);
    for (const wave of game.waves.items) {
      if (!wave.active) continue;
      const warning = wave.warning > 0;
      c.lineWidth = warning ? 1 : 5; c.strokeStyle = warning ? '#ffb5856a' : ORANGE;
      if (warning) c.setLineDash([7, 11]);
      c.beginPath(); c.arc(0, 0, warning ? 42 + (1.8 - wave.warning) * 20 : wave.radius, wave.gap + .62, wave.gap + TAU - .62); c.stroke(); c.setLineDash([]);
      if (!warning) { c.strokeStyle = '#ffae6750'; c.lineWidth = 12; c.beginPath(); c.arc(0, 0, wave.radius, wave.gap + .62, wave.gap + TAU - .62); c.stroke(); }
    }
    for (const drop of game.pickups.items) {
      if (!drop.active) continue;
      const bob = this.settings.reducedMotion ? 0 : Math.sin(drop.age * 5) * 2;
      this.glow(drop.x, drop.y, 36, drop.heal ? 3 : 0, .7);
      c.strokeStyle = drop.heal ? '#f6dc85' : this.skin; c.fillStyle = '#132e2d'; c.lineWidth = 1.5;
      if (drop.heal) { c.beginPath(); c.moveTo(drop.x - 6, drop.y + bob); c.lineTo(drop.x + 6, drop.y + bob); c.moveTo(drop.x, drop.y - 6 + bob); c.lineTo(drop.x, drop.y + 6 + bob); c.stroke(); }
      else { this.polygon(drop.x, drop.y + bob, 5, 4, this.visualTime); c.fill(); c.stroke(); }
    }
    for (const e of game.enemies.items) if (e.active) this.enemy(e);
    c.lineCap = 'round';
    for (const b of game.bullets.items) {
      if (!b.active) continue;
      const color = b.friendly ? this.skin : ORANGE;
      this.glow(b.x, b.y, b.friendly ? 25 : 31, b.friendly ? 0 : 1, .8);
      c.strokeStyle = color; c.lineWidth = b.friendly ? 3 : 2; c.globalAlpha = .48;
      c.beginPath(); c.moveTo(b.x - b.vx * .045, b.y - b.vy * .045); c.lineTo(b.x, b.y); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = b.friendly ? '#d9fff5' : '#ffba93';
      if (b.friendly) { this.polygon(b.x, b.y, 4, 4, Math.atan2(b.vy, b.vx)); c.fill(); }
      else { c.beginPath(); c.arc(b.x, b.y, 4.1, 0, TAU); c.fill(); c.strokeStyle = '#ed835a'; c.lineWidth = .8; c.beginPath(); c.arc(b.x, b.y, 6.3, 0, TAU); c.stroke(); }
    }
    this.player(game.player, game.alive);
    let rendered = 0;
    for (const p of this.particles.items) {
      if (!p.active || rendered++ >= this.budget) continue;
      c.globalAlpha = clamp(p.life / p.maxLife, 0, 1); c.fillStyle = palette[p.color];
      c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    c.globalAlpha = 1;
    for (const r of this.rings.items) {
      if (!r.active) continue;
      c.globalAlpha = r.life * 1.1; c.strokeStyle = palette[r.color]; c.lineWidth = 1.5;
      c.beginPath(); c.arc(r.x, r.y, r.radius, 0, TAU); c.stroke();
    }
    c.globalAlpha = 1; c.textAlign = 'center'; c.font = 'bold 12px monospace'; c.fillStyle = '#e6fff0';
    if (!menu) for (const l of this.labels.items) { if (l.active) { c.globalAlpha = clamp(l.life * 2, 0, 1); c.fillText(l.text, l.x, l.y); } }
    c.globalAlpha = 1; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.flash > 0 && !this.settings.reducedMotion) { c.fillStyle = '#ff8c66'; c.globalAlpha = this.flash * .25; c.fillRect(0, 0, w, h); c.globalAlpha = 1; }
    if (menu) {
      const shade = c.createLinearGradient(0, 0, mobile ? 0 : w * .62, mobile ? h * .83 : 0);
      if (mobile) { shade.addColorStop(0, '#080e1500'); shade.addColorStop(.38, '#080e1500'); shade.addColorStop(.68, '#080e15e0'); shade.addColorStop(1, '#080e15'); }
      else { shade.addColorStop(0, '#080e15'); shade.addColorStop(.6, '#080e15c0'); shade.addColorStop(1, '#080e1500'); }
      c.fillStyle = shade; c.fillRect(0, 0, w, h);
    }
  }
}
