import { ISLANDS, STONES, FLOWERS, SHRINES, WIND_ORBS, GUARDS, TREE, GUIDE, CHEST, CHECKPOINTS, OBSTACLES, SEEDS, SECRETS, SATELLITES, resolveWalls, clamp, distance, onIsland, stonePosition, surfaceAt } from './world.js';
import {GardenBall} from './ball.js';
import {cleanAppearance} from './appearance.js';

export const SAVE_KEY = 'minigames.ki-mooslicht.v1';
export const STEP = 1 / 60;
export function cleanSave(value) {
  const s = value && typeof value === 'object' ? value : {};
  const ids = (a, max) => Array.isArray(a) ? [...new Set(a.filter(n => Number.isInteger(n) && n >= 0 && n < max))] : [];
  const quests = Object.fromEntries(['garden', 'ruins', 'wind'].map(k => [k, s.quests?.[k] === true]));
  return { version: 1, appearance:cleanAppearance(s.appearance), quests, seeds: ids(s.seeds, SEEDS.length), wind: ids(s.wind, 3), secrets: ids(s.secrets, SECRETS.length),
    lastLight: ['garden','ruins','wind'].includes(s.lastLight)&&quests[s.lastLight]?s.lastLight:['wind','ruins','garden'].find(id=>quests[id])||null,
    visited: Array.isArray(s.visited)?[...new Set(s.visited.filter(id=>SATELLITES.some(i=>i.id===id)))]:[],
    checkpoint: Object.hasOwn(CHECKPOINTS, s.checkpoint) ? s.checkpoint : 'home',
    elapsed: Number.isFinite(s.elapsed) ? clamp(s.elapsed, 0, 86400) : 0,
    chest: s.chest === true, finished: s.finished === true && Object.values(quests).every(Boolean) };
}
export function readSave(storage) { try { const s = storage.getItem(SAVE_KEY); return s ? cleanSave(JSON.parse(s)) : null; } catch { return null; } }
export function writeSave(storage, save) { try { storage.setItem(SAVE_KEY, JSON.stringify(cleanSave(save))); return true; } catch { return false; } }

export class Adventure {
  constructor(save) {
    const s = cleanSave(save);
    this.appearance=s.appearance;
    this.ball=new GardenBall();
    this.quests = s.quests; this.seeds = new Set(s.seeds); this.wind = new Set(s.wind);
    this.secrets = new Set(s.secrets); this.combo = 0; this.comboWindow = 0; this.hitStop = 0;
    this.checkpoint = s.checkpoint; this.elapsed = s.elapsed; this.chest = s.chest;
    this.energy = Object.values(s.quests).filter(Boolean).length/3;
    this.lastLight=s.lastLight;this.visited=new Set(s.visited);this.fallTimer=0;this.returnFade=0;
    this.finished = s.finished; this.time = 0; this.running = false; this.events = [];
    this.flowerStep = 0; this.flowerFlash = [0,0,0]; this.area = this.checkpoint;
    this.player = { ...CHECKPOINTS[this.checkpoint], vx: 0, vz: 0, vy: 0, facing: Math.PI,
      grounded: true, surface: -1, health: 5, invulnerable: 0, roll: 0, rollCooldown: 0,
      attack: 0, attackCooldown: 0, coyote: .1, jumpBuffer: 0, walk: 0 };
    this.guards = GUARDS.map((g, id) => ({ ...g, id, y: g.y || 0, homeX: g.x, homeZ: g.z,
      health: this.quests.ruins ? 0 : 3, state: 'idle', timer: 0, facing: 0, hit: 0 }));
  }
  get lights() { return Object.values(this.quests).filter(Boolean).length; }
  snapshot() { return { version: 1, appearance:{...this.appearance}, lastLight:this.lastLight,visited:[...this.visited], quests: { ...this.quests }, seeds: [...this.seeds], wind: [...this.wind], secrets: [...this.secrets], checkpoint: this.checkpoint, elapsed: this.elapsed, chest: this.chest, finished: this.finished }; }
  emit(type, data = {}) { if (this.events.length < 80) this.events.push({ type, ...data }); }
  drainEvents() { const events = this.events; this.events = []; return events; }
  start() { this.running = true; }
  pause() { this.running = false; }
  respawn(fall = false) {
    const p = this.player;this.fallTimer=0;this.returnFade=fall?.5:0;
    if (fall) p.health--;
    const exhausted = p.health <= 0;
    Object.assign(p, CHECKPOINTS[this.checkpoint], { vx: 0, vz: 0, vy: 0, grounded: true,
      surface: -1, roll: 0, attack: 0, jumpBuffer: 0, invulnerable: 2, coyote: .1, health: exhausted ? 5 : p.health });
    this.emit('respawn');
    this.emit('message', { text: exhausted ? 'Kurz durchatmen. Deine Lichter bleiben erhalten.' : 'Wieder festen Boden unter den Füssen.' });
  }
  hurt(source) {
    const p = this.player;
    if (p.invulnerable > 0 || p.roll > 0) return false;
    p.health--; p.invulnerable = 1.2;
    const dx = p.x - source.x, dz = p.z - source.z, d = Math.hypot(dx, dz) || 1;
    p.vx += dx / d * 6; p.vz += dz / d * 6;
    this.emit('hurt', { x: p.x, y: p.y + .7, z: p.z });
    if (p.health <= 0) this.respawn();
    return true;
  }
  slash() {
    const p = this.player;
    if (p.attackCooldown > 0 || p.roll > 0) return;
    this.combo = this.comboWindow > 0 ? this.combo % 3 + 1 : 1; this.comboWindow = 1.2;
    p.attack = .32; p.attackCooldown = .44;
    // A small assist makes keyboard and touch swordplay forgiving.
    const target = this.guards.filter(g => g.health > 0 && distance(p, g) < 2.7)
      .sort((a, b) => distance(p, a) - distance(p, b))[0];
    if (target) p.facing = Math.atan2(target.x - p.x, target.z - p.z);
    this.emit('slash', { x: p.x, y: p.y + .7, z: p.z });
    for (const g of this.guards) {
      const d = distance(p, g);
      const dot = (Math.sin(p.facing) * (g.x - p.x) + Math.cos(p.facing) * (g.z - p.z)) / (d || 1);
      if (g.health > 0 && d < 2.5 && dot > -.1 && Math.abs(p.y - g.y) < 1.6) {
        g.health = Math.max(0,g.health-(this.combo===3?2:1)); this.hitStop = .045; g.hit = .26; g.state = 'recover'; g.timer = .65;
        this.emit(g.health ? 'hit' : 'defeat', { x: g.x, y: g.y + .7, z: g.z });
        if (!g.health && this.guards.every(enemy => enemy.health <= 0)) {
          this.emit('message', { text: 'Die Wächter ruhen. Hole das Licht am violetten Schrein.' });
        }
      }
    }
  }
  interaction() {
    const p = this.player, candidates = [
      { ...GUIDE, kind: 'guide', label: 'Mit Lumi sprechen' },
      { ...TREE, kind: 'tree', label: this.lights === 3 ? 'Den Herzbaum erwecken' : 'Den Herzbaum berühren' },
      ...SATELLITES.map(s=>({...s,kind:'vista',label:'Einen Moment verweilen'})),
      ...FLOWERS.map((f, id) => ({ ...f, id, kind: 'flower', label: f.name + ' spielen' })),
      ...SHRINES.map((s, id) => ({ ...s, id, kind: 'shrine', label: this.quests[s.id] ? s.name + ' berühren' : s.name + ' wecken' })),
    ];
    for (const secret of SECRETS) if(!this.secrets.has(secret.id)) candidates.push({...secret,kind:'secret',label:secret.name});
    if (!this.chest) candidates.push({ ...CHEST, kind: 'chest', label: 'Lichttruhe öffnen' });
    return candidates.filter(c => distance(c, p) < (c.kind === 'tree' ? 2.8 : 2.15) && Math.abs(p.y - c.y) < 1.25)
      .sort((a, b) => distance(a, p) - distance(b, p))[0] || null;
  }
  activateLight(id) {
    if (this.quests[id]) return;
    this.quests[id] = true;this.lastLight=id;
    this.player.health = Math.min(5, this.player.health + 2);
    const shrine = SHRINES.find(s => s.id === id);
    this.emit('light', { ...shrine }); this.emit('save');
    this.emit('message', { text: this.lights === 3 ? 'Alle drei Lichter! Kehre zum grossen Herzbaum zurück.' : `${shrine.name} erwacht. ${this.lights} von 3 Lichtern gefunden.` });
  }
  interact() {
    const item = this.interaction(); if (!item) return;
    if(item.kind==='vista'){
      this.emit('dialogue',{speaker:item.name,text:{moss:'Ein Stück Wiese, das dem Himmel entgegenwächst. Hinter dir liegen die Palme, das weisse Segel und dein ganzer Garten. V öffnet die Gartenansicht.',pebble:'Die grossen Kiesel schweben so still, als hätten sie das Fallen vergessen. Durch den Steinbogen leuchtet der Herzbaum.',bloom:'Diese Blüten haben sich vom Beet gelöst. Sie drehen sich im Wind, weit über den Wolken.',echo:'Die Hölzer singen dieselbe Melodie wie die Hütte. Vielleicht hat der Garten sie einst geträumt.'}[item.id]});
      if(item.id==='echo')for(let i=0;i<3;i++)this.emit('note',{index:i,x:item.x,y:item.y,z:item.z});
    } else if (item.kind === 'secret') {
      this.secrets.add(item.id); this.emit('save'); this.emit('chest',item);
      this.emit('dialogue',{speaker:item.name+' · '+this.secrets.size+'/'+SECRETS.length,text:item.text});
    } else if (item.kind === 'guide') {
      this.emit('dialogue', { speaker: 'Lumi · Hüterin des Gartens', text: this.lights === 3
        ? 'Du hast es geschafft! Bring die drei Lichter zum grossen Baum. Ich glaube, er träumt schon vom Frühling.'
        : 'Dieser Garten war einmal voller Licht. Folge den Platten zum Haus der Echos: Holz, Glas und Metall bewahren eine Melodie. Am weissen Steinkreis warten Mooswächter. Die schwebenden Trittsteine führen in die Krone der Palme. Dort tanzen drei Windfunken. Sammle unterwegs goldene Glühlichter – acht davon öffnen meine alte Truhe.' });
    } else if (item.kind === 'tree') {
      if (this.lights === 3 && !this.finished) {
        this.finished = true; this.emit('win'); this.emit('save');
      } else this.emit('dialogue', { speaker: 'Der Herzbaum', text: this.finished
        ? 'Der Garten atmet wieder. Danke, kleiner Wanderer. Hier gibt es immer noch etwas zu entdecken.'
        : `Ein warmes Flüstern im Holz. Noch ${3 - this.lights} ${this.lights === 2 ? 'Licht fehlt' : 'Lichter fehlen'}, um den Baum zu erwecken.` });
    } else if (item.kind === 'flower') {
      const i = item.id; this.flowerFlash[i] = .9;
      this.emit('note', { index: i, x: item.x, y: item.y + 1, z: item.z });
      if (this.quests.garden) return;
      if (i === this.flowerStep) this.flowerStep++;
      else { this.flowerStep = i === 0 ? 1 : 0; this.emit('message', { text: 'Hör auf die Melodie: Gelb → Blau → Rosa.' }); }
      if (this.flowerStep === 3) this.activateLight('garden');
    } else if (item.kind === 'shrine') {
      const id = SHRINES[item.id].id;
      if (this.quests[id]) this.emit('message', { text: 'Dieses Licht begleitet dich bereits.' });
      else if (id === 'garden') this.emit('dialogue', { speaker: 'Eine Melodie im Moos', text: 'Erst die Sonne, dann der Himmel, zuletzt die Rose. Spiele die drei Klangobjekte: Gelb → Blau → Rosa.' });
      else if (id === 'ruins' && this.guards.every(g => g.health <= 0)) this.activateLight(id);
      else if (id === 'wind' && this.wind.size === 3) this.activateLight(id);
      else this.emit('message', { text: id === 'ruins' ? 'Besiege zuerst die drei Steinwächter. J: Schwert · Shift: Ausweichen.' : `Fange die drei blauen Windfunken. Einer schwebt höher – springe! (${this.wind.size}/3)` });
    } else if (item.kind === 'chest') {
      if (this.seeds.size < 8) this.emit('message', { text: `Die Truhe braucht acht Glühlichter. Du hast ${this.seeds.size}/8.` });
      else { this.chest = true; this.player.health = 5; this.emit('chest', { ...CHEST }); this.emit('save'); this.emit('message', { text: 'Ein Sternenschweif! Deine Laterne funkelt jetzt beim Laufen.' }); }
    }
  }
  update(input = {}, dt = STEP) {
    if (!this.running) return;
    dt = clamp(dt, 0, STEP * 1.01);
    this.energy += (this.lights/3-this.energy)*Math.min(1,dt*.8);
    this.time += dt; if (!this.finished) this.elapsed += dt;
    const p = this.player;
    this.returnFade=Math.max(0,this.returnFade-dt);
    this.ball.update(p,dt,this.time,this.energy);
    if(this.fallTimer>0){this.fallTimer+=dt;p.vy-=10*dt;p.y+=p.vy*dt;if(this.fallTimer>=.72)this.respawn(true);return;}
    this.comboWindow=Math.max(0,this.comboWindow-dt);
    for (const key of ['invulnerable', 'roll', 'rollCooldown', 'attack', 'attackCooldown', 'jumpBuffer', 'coyote']) p[key] = Math.max(0, p[key] - dt);
    if(this.hitStop>0){this.hitStop=Math.max(0,this.hitStop-dt);return;}
    this.flowerFlash = this.flowerFlash.map(t => Math.max(0, t - dt));
    if (input.jump) p.jumpBuffer = .15;
    if (p.grounded) p.coyote = .11;
    if (p.grounded && p.surface >= 0) {
      const s = STONES[p.surface];
      p.x += stonePosition(s, this.time).x - stonePosition(s, this.time - dt).x;
    }
    let x = input.x || 0, z = input.z || 0;
    const magnitude = Math.hypot(x, z); if (magnitude > 1) { x /= magnitude; z /= magnitude; }
    if (input.roll && p.rollCooldown <= 0 && p.grounded) {
      if (magnitude > .1) p.facing = Math.atan2(x, z);
      p.roll = .3; p.rollCooldown = .78; this.emit('roll');
    }
    if (p.jumpBuffer > 0 && p.coyote > 0 && p.roll <= 0) {
      p.vy = 8.2; p.grounded = false; p.coyote = 0; p.jumpBuffer = 0; this.emit('jump');
    }
    if (input.attack) this.slash();
    const speed = p.attack > 0 ? 2.7 : 5.7;
    const response = 1 - Math.exp(-dt * (p.grounded ? 16 : 7));
    p.vx += (x * speed - p.vx) * response; p.vz += (z * speed - p.vz) * response;
    if (p.roll > 0) { p.vx = Math.sin(p.facing) * 10; p.vz = Math.cos(p.facing) * 10; }
    else if (magnitude > .1 && p.attack <= 0) p.facing = Math.atan2(x, z);
    p.x += p.vx * dt; p.z += p.vz * dt;
    for (const o of OBSTACLES) {
      const d = distance(p, o), r = o.r + .3;
      if (d < r && p.y < o.y + (o.height || 2.5) && p.y > o.y - .8) {
        const dx = d > .0001 ? (p.x - o.x) / d : 1, dz = d > .0001 ? (p.z - o.z) / d : 0;
        p.x = o.x + dx * r; p.z = o.z + dz * r;
      }
    }
    resolveWalls(p);
    const previousY = p.y;
    p.vy -= 22 * dt; p.y += p.vy * dt;
    const ground = surfaceAt(p.x, p.z, this.time, previousY + .22, this.energy);
    if (p.vy <= 0 && previousY >= ground.height - .22 && p.y <= ground.height) {
      if (!p.grounded && p.vy < -3) this.emit('land', { x: p.x, y: ground.height, z: p.z });
      p.y = ground.height; p.vy = 0; p.grounded = true; p.surface = ground.stoneIndex;
    } else { p.grounded = false; p.surface = -1; }
    p.walk += Math.hypot(p.vx, p.vz) * dt;
    if (p.y < -4) { this.fallTimer=dt;this.emit('fall'); return; }
    if(p.grounded&&SATELLITES.some(s=>s.id===ground.id)){
      const island=SATELLITES.find(s=>s.id===ground.id);
      if(this.area!==island.id){this.area=island.id;this.emit('area',{name:island.name});}
      if(!this.visited.has(island.id)){this.visited.add(island.id);this.emit('save');this.emit('message',{text:`${island.name} entdeckt · ${this.visited.size}/4 Himmelsorte`});}
    }
    if (ground.id && Object.hasOwn(CHECKPOINTS, ground.id) && p.grounded) {
      if (this.area !== ground.id) { this.area = ground.id; this.emit('area', { name: ISLANDS.find(i => i.id === ground.id).name }); }
      const island = ISLANDS.find(i => i.id === ground.id);
      if (this.checkpoint !== ground.id && (ground.id==='wind'||onIsland(island, p.x, p.z, .8))) { this.checkpoint = ground.id; this.emit('save'); }
    }
    for (const seed of SEEDS) if (!this.seeds.has(seed.id) && Math.hypot(p.x - seed.x, p.z - seed.z, p.y + .75 - seed.y) < .95) {
      this.seeds.add(seed.id); this.emit('seed', seed); this.emit('save');
    }
    for (let i = 0; i < WIND_ORBS.length; i++) {
      const orb = WIND_ORBS[i];
      if (!this.wind.has(i) && Math.hypot(p.x - orb.x, p.z - orb.z, p.y + .75 - orb.y) < .72) {
        this.wind.add(i); this.emit('wind', orb); this.emit('save');
        if (this.wind.size === 3 && !this.quests.wind) this.emit('message', { text: 'Alle Windfunken gesammelt! Berühre den blauen Schrein.' });
      }
    }
    this.updateGuards(dt);
    if (input.interact) this.interact();
  }
  updateGuards(dt) {
    const p = this.player, island = ISLANDS[2];
    for (const g of this.guards) {
      if (g.health <= 0) continue;
      g.hit = Math.max(0, g.hit - dt); g.timer -= dt;
      const d = distance(p, g), nearby = onIsland(island, p.x, p.z) && Math.abs(p.y - g.y) < 2.3;
      if (g.state === 'windup') {
        if (g.timer <= 0) {
          if (d < 1.9 && Math.abs(p.y - g.y) < 1.05) this.hurt(g);
          this.emit('stomp', { x: g.x, y: g.y, z: g.z }); g.state = 'recover'; g.timer = .9;
        }
      } else if (g.state === 'recover') { if (g.timer <= 0) g.state = 'idle'; }
      else if (nearby && d < 8) {
        g.facing = Math.atan2(p.x - g.x, p.z - g.z);
        if (d < 1.7) { g.state = 'windup'; g.timer = .8; }
        else { g.x += Math.sin(g.facing) * 1.5 * dt; g.z += Math.cos(g.facing) * 1.5 * dt; }
      } else {
        const tx = g.homeX + Math.sin(this.time * .45 + g.id * 2) * .6;
        const tz = g.homeZ + Math.cos(this.time * .45 + g.id * 2) * .6;
        g.facing = Math.atan2(tx - g.x, tz - g.z); g.x += (tx - g.x) * dt; g.z += (tz - g.z) * dt;
      }
      // Keep enemies out of trunks and separate their contact zones.
      for (const o of OBSTACLES) {
        const d2 = distance(g, o), min = o.r + .6;
        if (Math.abs(g.y - o.y) < .1 && d2 < min) { g.x = o.x + (g.x - o.x || .01) / (d2 || .01) * min; g.z = o.z + (g.z - o.z) / (d2 || .01) * min; }
      }
      for (const other of this.guards) if (other.id < g.id && other.health > 0) {
        const dd = distance(g, other); if (dd < 1.15) { const dx = (g.x - other.x || .01) / (dd || .01), dz = (g.z - other.z) / (dd || .01); g.x += dx * .025; g.z += dz * .025; }
      }
    }
  }
}

export class FixedClock {
  constructor() { this.accumulator = 0; }
  advance(delta, callback) {
    this.accumulator += clamp(Number.isFinite(delta) ? delta : 0, 0, .1);
    let steps = 0;
    while (this.accumulator + 1e-9 >= STEP && steps < 6) { callback(STEP, steps++); this.accumulator -= STEP; }
    return steps;
  }
  reset() { this.accumulator = 0; }
}
