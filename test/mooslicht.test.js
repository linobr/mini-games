import test from 'node:test';
import assert from 'node:assert/strict';
import { Adventure, FixedClock, STEP, cleanSave, readSave, writeSave } from '../src/mooslicht/game.js';
import { FLOWERS, SHRINES, STONES, WIND_ORBS, SEEDS, CHECKPOINTS, ISLANDS, distance, surfaceAt, stonePosition, onIsland, TREE, CHEST, SECRETS, resolveWalls, cameraFraction } from '../src/mooslicht/world.js';

function fresh(save) { const game=new Adventure(save);game.start();return game; }
function tick(game,seconds,input={}) { for(let t=0;t<seconds-1e-8;t+=STEP){game.update(input,STEP);game.drainEvents();} }
function walk(game,x,z,{jump=false,seconds=7}={}) {
  for(let i=0;i<seconds*60;i++){
    const p=game.player,dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
    if(d<.16&&p.grounded){tick(game,.15);return;}
    const speed=Math.min(1,d*2.2);
    game.update({x:dx/(d||1)*speed,z:dz/(d||1)*speed,jump:jump&&p.grounded},STEP);game.drainEvents();
  }
  assert.fail(`Did not reach ${x},${z}: ${JSON.stringify(game.player)}`);
}
function stand(game,pos){Object.assign(game.player,pos,{vx:0,vz:0,vy:0,grounded:true,invulnerable:0,surface:-1});}

test('Mooslicht: all spawn points are safe and bridge surfaces connect both banks',()=>{
  for(const [id,p] of Object.entries(CHECKPOINTS)){
    assert.equal(surfaceAt(p.x,p.z,0,p.y+.22).id,id);assert.equal(surfaceAt(p.x,p.z,0,p.y+.22).height,p.y);
  }
  for(const x of [-14,-12,-10,10,12,14])assert.ok(Number.isFinite(surfaceAt(x,x<0?-2+(-x-8)/7*-1:-2+(x-8)/7*-1).height));
  assert.equal(surfaceAt(40,40).height,-Infinity);
});
test('Mooslicht: flower puzzle rejects the wrong order and can be recovered without restarting',()=>{
  const g=fresh();for(const i of [0,2,1]){stand(g,FLOWERS[i]);g.interact();}
  assert.equal(g.quests.garden,false);
  for(const i of [0,1,2]){stand(g,FLOWERS[i]);g.interact();}
  assert.equal(g.quests.garden,true);assert.equal(g.lights,1);
  for(const i of [0,1,2]){stand(g,FLOWERS[i]);g.interact();}assert.equal(g.lights,1);
});
test('Mooslicht: the garden path and open shed door are physically traversable',()=>{
  const g=fresh();for(const p of [[-12,5],[-12,-20],[-12,-26],[-8,-28],[0,-31],[0,-36],[-3,-43],[3,-46],[9,-43]])walk(g,...p);
  assert.equal(g.player.health,5);assert.equal(g.checkpoint,'garden');assert.ok(g.seeds.size>0);
});
test('Mooslicht: every wind stepping stone is reachable with the normal jump',()=>{
  const g=fresh();walk(g,-10,-5);walk(g,5,-8);
  for(const s of STONES.slice(0,13)){const pos=stonePosition(s,g.time+.5);walk(g,pos.x,pos.z,{jump:true,seconds:7});}
  assert.equal(g.checkpoint,'wind');assert.equal(g.player.health,5);
  assert.equal(g.wind.size,3);g.interact();assert.equal(g.quests.wind,true);
});
test('Mooslicht: the moving stone carries a standing player instead of leaving them behind',()=>{
  const g=fresh(),s=stonePosition(STONES[4],0);stand(g,s);g.player.surface=4;
  tick(g,.7);const after=stonePosition(STONES[4],g.time);
  assert.ok(Math.abs(g.player.x-after.x)<.03);assert.equal(g.player.grounded,true);
});
test('Mooslicht: guardians telegraph damage and a dodge protects the player',()=>{
  const g=fresh();for(const other of g.guards.slice(1))other.health=0;
  const enemy=g.guards[0];stand(g,{x:enemy.x,z:enemy.z+1,y:0});
  tick(g,.6);assert.equal(g.player.health,5);assert.equal(enemy.state,'windup');
  g.player.roll=.25;assert.equal(g.hurt(enemy),false);assert.equal(g.player.health,5);
  g.player.roll=0;tick(g,.3);assert.equal(g.player.health,4);
  assert.equal(g.hurt(enemy),false);assert.equal(g.player.health,4);
});
test('Mooslicht: sword combat unlocks the ruins shrine, with no damage from defeated guards',()=>{
  const g=fresh();
  for(const enemy of g.guards){
    for(let hit=0;hit<3;hit++){stand(g,{x:enemy.x,z:enemy.z+1.5,y:0});g.slash();tick(g,.46);}
    assert.equal(enemy.health,0);
  }
  stand(g,SHRINES[1]);g.interact();assert.equal(g.quests.ruins,true);
  const hp=g.player.health;tick(g,2);assert.equal(g.player.health,hp);
});
test('Mooslicht: the adventure only finishes with all three earned lights',()=>{
  const g=fresh();stand(g,{x:TREE.x,z:TREE.z+2,y:0});g.interact();assert.equal(g.finished,false);
  const restored=fresh({quests:{garden:true,ruins:true,wind:true},seeds:[0,1,2],elapsed:180});
  stand(restored,{x:TREE.x,z:TREE.z+2,y:0});restored.interact();assert.equal(restored.finished,true);
  const wins=restored.drainEvents().filter(e=>e.type==='win');assert.equal(wins.length,1);
  restored.interact();assert.equal(restored.drainEvents().filter(e=>e.type==='win').length,0);
});
test('Mooslicht: falling and losing all hearts preserve earned quest progress',()=>{
  const g=fresh({quests:{garden:true},seeds:[2,3],checkpoint:'garden'});stand(g,{x:50,z:50,y:-8});g.update({},STEP);assert.ok(g.fallTimer>0);tick(g,.75);
  assert.equal(g.player.health,4);assert.equal(g.quests.garden,true);assert.equal(g.player.x,CHECKPOINTS.garden.x);
  g.player.health=1;g.player.invulnerable=0;g.hurt({x:0,z:0});assert.equal(g.player.health,5);assert.equal(g.seeds.size,2);
});
test('Mooslicht: pause freezes gameplay and large frame gaps cannot fast-forward physics',()=>{
  const g=fresh(),clock=new FixedClock();tick(g,.3);g.pause();const before=JSON.stringify(g.snapshot());tick(g,3,{x:1,jump:true});assert.equal(JSON.stringify(g.snapshot()),before);
  let calls=0;clock.advance(90,()=>calls++);assert.equal(calls,6);
  for(const hz of [30,60,120,144]){const c=new FixedClock();let simulated=0;for(let i=0;i<hz*2;i++)c.advance(1/hz,dt=>simulated+=dt);assert.ok(Math.abs(simulated-2)<1e-8);}
});
test('Mooslicht: saved progress is bounded, validated and safe with blocked storage',()=>{
  const s=cleanSave({quests:{garden:true,ruins:'yes'},seeds:[0,0,23,-1,100,'2'],wind:[0,4],checkpoint:'__proto__',elapsed:Infinity,finished:true});
  assert.deepEqual(s.seeds,[0,23]);assert.equal(s.checkpoint,'home');assert.equal(s.elapsed,0);assert.equal(s.finished,false);
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.equal(readSave(blocked),null);assert.equal(writeSave(blocked,s),false);
  const memory={item:null,getItem(){return this.item;},setItem(k,v){this.item=v;}};
  assert.equal(writeSave(memory,s),true);assert.deepEqual(readSave(memory),s);
  const g=fresh(readSave(memory));assert.equal(g.quests.garden,true);assert.equal(g.seeds.size,2);
});
test('Mooslicht: optional chest requires exploration and never spends collected lights',()=>{
  const g=fresh();stand(g,CHEST);g.interact();assert.equal(g.chest,false);
  g.seeds=new Set(SEEDS.slice(0,8).map(s=>s.id));g.interact();assert.equal(g.chest,true);assert.equal(g.seeds.size,8);
});
test('Mooslicht: a complete adventure can be finished by movement and normal actions only',()=>{
  const g=fresh();let falls=0;const emit=g.emit.bind(g);g.emit=(type,data)=>{if(type==='respawn')falls++;emit(type,data);};
  for(const pos of [[-12,5],[-12,-20],[-12,-26],[-8,-28],[0,-31],[0,-36]])walk(g,...pos);
  for(const f of FLOWERS){walk(g,f.x,f.z);g.interact();g.drainEvents();}
  assert.equal(g.quests.garden,true);
  for(const pos of [[0,-37],[0,-31],[6,-29],[10,-26]])walk(g,...pos);
  for(let frame=0;frame<1800&&g.guards.some(e=>e.health>0);frame++){
    const enemy=g.guards.filter(e=>e.health>0).sort((a,b)=>distance(g.player,a)-distance(g.player,b))[0];
    const dx=enemy.x-g.player.x,dz=enemy.z-g.player.z,d=Math.hypot(dx,dz);
    g.update({x:d>1.8?dx/d:0,z:d>1.8?dz/d:0,attack:true},STEP);g.drainEvents();
  }
  assert.ok(g.guards.every(e=>e.health<=0));walk(g,SHRINES[1].x,SHRINES[1].z);g.interact();g.drainEvents();assert.equal(g.quests.ruins,true);
  for(const pos of [[9,-26],[5,-20],[5,-8]])walk(g,...pos);
  for(const s of STONES.slice(0,13)){const pos=stonePosition(s,g.time+.5);walk(g,pos.x,pos.z,{jump:true});}
  g.interact();g.drainEvents();assert.equal(g.lights,3);
  // Descend on the outside of the palm, then return to the real garden tree.
  walk(g,-2,-8,{jump:true});
  for(const pos of [[5,-10],[12,-13],[14,-16.8]])walk(g,...pos);
  g.interact();assert.equal(g.finished,true);assert.equal(falls,0);
});


test('Mooslicht: garden walls block movement while the shed doorway stays open',()=>{
  const p={x:-22.8,z:0,y:0,vx:-5,vz:0};resolveWalls(p);assert.ok(p.x>=-21.7);
  const door={x:0,z:-33.5,y:.6,vx:0,vz:-5};resolveWalls(door);assert.equal(door.z,-33.5);
  const wall={x:8,z:-33.5,y:.6,vx:0,vz:-5};resolveWalls(wall);assert.notEqual(wall.z,-33.5);
});
test('Mooslicht: floors below roofs and high platforms remain walkable',()=>{
  assert.equal(surfaceAt(3,-41,0,1).height,.6);
  assert.equal(surfaceAt(3,-41,0,19).height,18.5);
  assert.equal(surfaceAt(5,13,0,1).height,0);
  assert.equal(surfaceAt(5,13,0,9).height,8);
});
test('Mooslicht: camera clips its follow ray at walls and trunks',()=>{
  assert.ok(cameraFraction({x:-20,y:2,z:0},{x:-26,y:4,z:0})<.4);
  assert.equal(cameraFraction({x:0,y:3,z:-30},{x:0,y:3,z:-36}),1);
  assert.ok(cameraFraction({x:14,y:3,z:-16},{x:14,y:3,z:-23})<1);
});
test('Mooslicht: secrets persist uniquely and malformed secret saves are rejected',()=>{
  const g=fresh();stand(g,SECRETS[4]);g.interact();assert.equal(g.secrets.size,1);
  g.interact();assert.equal(g.secrets.size,1);
  const restored=fresh(g.snapshot());assert.deepEqual([...restored.secrets],[4]);
  assert.deepEqual(cleanSave({secrets:[0,0,5,6,-1,'2']}).secrets,[0,5]);
});
test('Mooslicht: firewood ascent reaches the shed roof without teleporting',()=>{
  const g=fresh();walk(g,-12,-24);walk(g,-16,-24);
  for(const s of STONES.filter(s=>s.kind==='wood')){walk(g,s.x,s.z,{jump:true});}
  walk(g,8,-39,{jump:true});assert.ok(g.player.y>=16);assert.equal(g.player.health,5);
  g.interact();assert.ok(g.secrets.has(3));
});
test('Mooslicht: combat combo resets and hit-stop preserves the attack recovery',()=>{
  const g=fresh();g.slash();assert.equal(g.combo,1);tick(g,.46);g.slash();assert.equal(g.combo,2);
  tick(g,.46);g.slash();assert.equal(g.combo,3);tick(g,1.3);g.slash();assert.equal(g.combo,1);
});
test('Mooslicht: the roof connects to the sail attachment and its high rope walk',()=>{
  const g=fresh();stand(g,{x:8,z:-39,y:16.25});
  walk(g,1,-35,{jump:true});walk(g,1,-32,{jump:true});walk(g,9,16,{seconds:15});
  assert.ok(Math.abs(g.player.y-23)<.1);assert.equal(g.player.health,5);
});
test('Mooslicht: awakening plates stay synchronized with their collision surface',()=>{
  const g=fresh();stand(g,{x:-7,z:-15,y:.05});g.quests.garden=true;
  tick(g,4);assert.ok(g.energy>.3);assert.ok(g.player.y>.35);assert.equal(g.player.grounded,true);
});
