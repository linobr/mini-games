import { ARENA_RADIUS, TAU, clamp, distance, segmentDistance, seededRandom, Pool } from './math.js';

export const RUN_LENGTH = 180;
export const DASH_COOLDOWN = .92;

export class Game {
  constructor() {
    this.bullets = new Pool(260); this.enemies = new Pool(18); this.pickups = new Pool(24);
    this.events = []; this.waves = new Pool(4);
    this.reset(1, 'standard');
  }
  reset(seed, mode = 'standard') {
    this.seed = seed; this.random = seededRandom(seed); this.mode = mode;
    this.bullets.clear(); this.enemies.clear(); this.pickups.clear(); this.waves.clear(); this.events.length = 0;
    this.player = { x: 0, y: 100, px: 0, py: 100, vx: 0, vy: 0, dx: 0, dy: -1, dash: 0, cooldown: 0, invulnerable: 0, dashId: 0, relay: 0, hp: 3 };
    this.time = 0; this.score = 0; this.combo = 1; this.chain = 0; this.comboTime = 0; this.bestCombo = 1;
    this.kills = 0; this.reflected = 0; this.nearMisses = 0; this.bestRelay = 0;
    this.firstHitTime = Infinity; this.alive = true; this.won = false; this.phase = 0;
    this.spawnClock = .7; this.waveClock = 75; this.coreDefeated = 0; this.damageTaken = 0;
    this.spawnEnemy(); this.spawnEnemy();
  }
  emit(type, x = 0, y = 0, value = 0) {
    if (this.events.length < 96) this.events.push({ type, x, y, value });
  }
  reward(base, x, y, event = '') {
    this.chain++; this.comboTime = 4.2; this.combo = Math.min(16, 1 + Math.floor(this.chain / 5));
    this.bestCombo = Math.max(this.bestCombo, this.combo); this.score += base * this.combo;
    if (event) this.emit(event, x, y, base * this.combo);
  }
  spawnEnemy(core = false) {
    const p = this.player;
    let x = 0, y = 0, angle = 0, valid = core;
    for (let attempt = 0; attempt < 24 && !valid; attempt++) {
      angle = this.random() * TAU;
      const radius = 230 + this.random() * 58;
      x = Math.cos(angle) * radius; y = Math.sin(angle) * radius;
      valid = distance(x, y, p.x, p.y) > 130;
      for (const e of this.enemies.items) if (e.active && distance(x, y, e.x, e.y) < 65) valid = false;
    }
    if (!valid) return;
    const type = core ? 'core' : this.time > 20 && this.random() < .4 ? 'prism' : this.time > 35 && this.random() < .4 ? 'hunter' : 'sender';
    const hp = core ? 32 + this.phase * 8 : type === 'prism' ? 4 : 2;
    this.enemies.acquire({ x, y, type, hp, maxHp: hp, angle, age: 0, fire: core ? 2.5 : 2.4 + this.random(), flash: 0, hitDash: -1, radius: core ? 30 : type === 'prism' ? 17 : 14 });
  }
  bullet(x, y, angle, speed, friendly = false) {
    return this.bullets.acquire({ x, y, px: x, py: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      friendly, life: friendly ? 3 : 9, age: 0, near: false, closest: Infinity, radius: friendly ? 3 : 5 });
  }
  shoot(e) {
    const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
    const speed = 105 + Math.min(95, this.time * .47);
    if (e.type === 'core') {
      const count = this.phase === 2 ? 16 : 12;
      for (let i = 0; i < count; i++) this.bullet(e.x, e.y, e.angle + i * TAU / count, speed * .9);
      e.fire = this.phase === 2 ? 1.45 : 1.95;
    } else if (e.type === 'prism') {
      for (let i = -1; i <= 1; i++) this.bullet(e.x, e.y, angle + i * .22, speed);
      e.fire = 2.6 - Math.min(.7, this.time / 200);
    } else {
      this.bullet(e.x, e.y, angle, speed * (e.type === 'hunter' ? 1.12 : 1));
      e.fire = 2.55 - Math.min(1.1, this.time / 130);
    }
    this.emit('shot', e.x, e.y);
  }
  dash(input) {
    const p = this.player;
    if (p.cooldown > 0 || p.dash > 0) return false;
    const length = Math.hypot(input.x, input.y);
    if (length > .1) { p.dx = input.x / length; p.dy = input.y / length; }
    p.dash = .17; p.cooldown = DASH_COOLDOWN; p.dashId++; p.relay = 0;
    p.vx = p.dx * 880; p.vy = p.dy * 880;
    this.emit('dash', p.x, p.y); return true;
  }
  damage() {
    const p = this.player;
    if (p.invulnerable > 0 || p.dash > 0 || !this.alive) return;
    p.hp--; p.invulnerable = 1.7; this.damageTaken++;
    this.firstHitTime = Math.min(this.firstHitTime, this.time);
    this.chain = 0; this.combo = 1; this.comboTime = 0;
    this.emit('hit', p.x, p.y);
    // A local clear and invulnerability prevent unavoidable repeated hits.
    for (const b of this.bullets.items) if (b.active && !b.friendly && distance(b.x, b.y, p.x, p.y) < 85) b.active = false;
    if (p.hp <= 0) this.finish(false);
  }
  destroy(e) {
    e.active = false; this.kills++;
    this.reward(e.type === 'core' ? 1200 : e.type === 'prism' ? 160 : 100, e.x, e.y, 'kill');
    this.player.cooldown = Math.max(0, this.player.cooldown - .12);
    if (e.type === 'core') {
      this.coreDefeated++; this.player.hp = Math.min(3, this.player.hp + 1);
      for (const b of this.bullets.items) if (b.active && !b.friendly) this.convert(b);
      this.emit('coreKill', e.x, e.y);
    } else {
      this.pickups.acquire({ x: e.x, y: e.y, life: 10, age: 0, heal: this.kills % 9 === 0 });
    }
  }
  convert(b) {
    b.friendly = true; b.life = 3; b.age = 0; b.vx *= -3; b.vy *= -3; b.radius = 3;
    this.reflected++; this.player.relay++; this.bestRelay = Math.max(this.bestRelay, this.player.relay);
    this.reward(25, b.x, b.y);
    this.emit('reflect', b.x, b.y, this.player.relay);
  }
  transition(phase) {
    this.phase = phase; this.player.invulnerable = 2.5; this.player.cooldown = 0;
    this.bullets.clear(); this.waves.clear();
    this.emit('rift', 0, 0, phase);
    for (const e of this.enemies.items) if (e.active && e.type === 'core') e.active = false;
    this.spawnEnemy(true);
  }
  finish(won) {
    if (!this.alive) return;
    this.alive = false; this.won = won;
    if (won) this.score += 3000 + this.player.hp * 1000;
    this.emit('end', this.player.x, this.player.y, won ? 1 : 0);
  }
  step(dt, input) {
    if (!this.alive) return;
    dt = clamp(dt, 0, 1 / 30);
    this.time = Math.min(RUN_LENGTH, this.time + dt);
    if (this.time >= RUN_LENGTH) { this.finish(true); return; }
    if (this.time >= 120 && this.phase < 2) this.transition(2);
    else if (this.time >= 60 && this.phase < 1) this.transition(1);
    this.comboTime = Math.max(0, this.comboTime - dt);
    if (this.comboTime === 0) { this.combo = 1; this.chain = 0; }
    const p = this.player;
    p.cooldown = Math.max(0, p.cooldown - dt); p.invulnerable = Math.max(0, p.invulnerable - dt);
    if (input.dash) this.dash(input);
    p.px = p.x; p.py = p.y;
    const dashing = p.dash > 0;
    if (dashing) { p.vx = p.dx * 880; p.vy = p.dy * 880; }
    else {
      const length = Math.hypot(input.x, input.y), magnitude = Math.min(1, length);
      const nx = length ? input.x / length : 0, ny = length ? input.y / length : 0;
      if (length > .1) { p.dx = nx; p.dy = ny; }
      const response = 1 - Math.exp(-30 * dt);
      p.vx += (nx * 220 * magnitude - p.vx) * response;
      p.vy += (ny * 220 * magnitude - p.vy) * response;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    const radial = Math.hypot(p.x, p.y), maxRadius = ARENA_RADIUS - 13;
    if (radial > maxRadius) { p.x *= maxRadius / radial; p.y *= maxRadius / radial; }

    this.spawnClock -= dt;
    if (this.spawnClock <= 0) {
      if (this.enemies.count < Math.min(13, 3 + Math.floor(this.time / 12))) this.spawnEnemy();
      this.spawnClock = this.time < 12 ? 2.3 : 1.2;
    }
    for (const e of this.enemies.items) {
      if (!e.active) continue;
      e.age += dt; e.flash = Math.max(0, e.flash - dt); e.fire -= dt;
      e.angle += dt * (e.type === 'core' ? .45 : .12);
      if (e.type === 'hunter' && e.age > 1) {
        const dist = distance(e.x, e.y, p.x, p.y);
        if (dist > 90) { e.x += (p.x - e.x) / dist * 32 * dt; e.y += (p.y - e.y) / dist * 32 * dt; }
      }
      if (e.fire <= 0 && e.age > 1) this.shoot(e);
      if (e.age > 1 && segmentDistance(e.x, e.y, p.px, p.py, p.x, p.y) < e.radius + (dashing ? 23 : 8)) {
        if (dashing && e.hitDash !== p.dashId) {
          e.hitDash = p.dashId; e.hp -= 3; e.flash = .15;
          this.emit('impact', e.x, e.y);
          if (e.hp <= 0) this.destroy(e);
        } else if (!dashing) this.damage();
      }
    }

    for (const b of this.bullets.items) {
      if (!b.active) continue;
      b.age += dt; b.life -= dt;
      if (b.life <= 0 || Math.hypot(b.x, b.y) > ARENA_RADIUS + 25) { b.active = false; continue; }
      b.px = b.x; b.py = b.y;
      if (b.friendly) {
        let nearest = null, best = Infinity;
        for (const e of this.enemies.items) {
          if (!e.active || e.age < .6) continue;
          const dist = distance(b.x, b.y, e.x, e.y);
          if (dist < best) { nearest = e; best = dist; }
        }
        if (nearest && best > 0) {
          const response = Math.min(1, dt * 14);
          b.vx += ((nearest.x - b.x) / best * 490 - b.vx) * response;
          b.vy += ((nearest.y - b.y) / best * 490 - b.vy) * response;
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (!b.friendly) {
        // Relative swept collision handles a dash crossing a moving bullet between ticks.
        const gap = segmentDistance(0, 0, b.px - p.px, b.py - p.py, b.x - p.x, b.y - p.y);
        if (dashing && gap < 52) { this.convert(b); continue; }
        b.closest = Math.min(b.closest, gap);
        if (gap < 12) { this.damage(); b.active = false; }
        else if (b.closest < 31 && !b.near && p.invulnerable === 0 &&
          distance(b.x, b.y, p.x, p.y) > distance(b.px, b.py, p.px, p.py) + .01) {
          b.near = true; this.nearMisses++; this.reward(15, p.x, p.y); this.emit('near', p.x, p.y);
        }
      } else {
        for (const e of this.enemies.items) {
          if (!e.active || e.age < .6) continue;
          if (segmentDistance(e.x, e.y, b.px, b.py, b.x, b.y) < e.radius + b.radius) {
            b.active = false; e.hp--; e.flash = .13; this.emit('impact', b.x, b.y);
            if (e.hp <= 0) this.destroy(e);
            break;
          }
        }
      }
    }
    for (const drop of this.pickups.items) {
      if (!drop.active) continue;
      drop.life -= dt; drop.age += dt;
      const dist = distance(drop.x, drop.y, p.x, p.y);
      if (dist < 95 && dist > 0) { drop.x += (p.x - drop.x) / dist * 240 * dt; drop.y += (p.y - drop.y) / dist * 240 * dt; }
      if (dist < 20) {
        drop.active = false; this.reward(40, drop.x, drop.y); this.emit('pickup', drop.x, drop.y, drop.heal ? 1 : 0);
        if (drop.heal) p.hp = Math.min(3, p.hp + 1);
        p.cooldown = Math.max(0, p.cooldown - .15);
      } else if (drop.life <= 0) drop.active = false;
    }
    if (this.phase > 0) {
      this.waveClock -= dt;
      if (this.waveClock <= 0) {
        this.waveClock = this.phase === 2 ? 9 : 13;
        this.waves.acquire({ radius: 0, previous: 0, warning: 1.8, gap: this.random() * TAU, scored: false, hit: false });
        this.emit('wave', 0, 0);
      }
    } else this.waveClock = 7;
    for (const wave of this.waves.items) {
      if (!wave.active) continue;
      wave.warning -= dt;
      if (wave.warning > 0) continue;
      wave.previous = wave.radius; wave.radius += dt * 115;
      const r = Math.hypot(p.x, p.y), angle = Math.atan2(p.y, p.x);
      const gapAngle = Math.abs(Math.atan2(Math.sin(angle - wave.gap), Math.cos(angle - wave.gap)));
      const prevRadial = Math.hypot(p.px, p.py) - wave.previous, currentRadial = r - wave.radius;
      const crossing = Math.min(prevRadial, currentRadial) < 12 && Math.max(prevRadial, currentRadial) > -12;
      if (gapAngle > .62 && crossing) {
        if (dashing && !wave.scored) { wave.scored = true; this.reward(150, p.x, p.y, 'waveDash'); }
        else if (!dashing && !wave.scored && !wave.hit) { wave.hit = true; this.damage(); }
      }
      if (wave.radius > ARENA_RADIUS + 20) wave.active = false;
    }
    p.dash = Math.max(0, p.dash - dt);
  }
}
