import test from 'node:test';
import assert from 'node:assert/strict';
import {Adventure,STEP,cleanSave,readSave,writeSave} from '../src/mooslicht/game.js';
import {AppearanceDraft,DEFAULT_APPEARANCE,cleanAppearance} from '../src/mooslicht/appearance.js';
import {makeHero} from '../src/mooslicht/hero.js';
import {GARDEN_OUTLINE,insideOutline,surfaceAt,resolveWalls,cameraFraction,BRIDGES,CHECKPOINTS} from '../src/mooslicht/world.js';
import {islandGeometry} from '../src/mooslicht/floating.js';
import {BALCONY,REAR_OUTLINE} from '../src/mooslicht/garden-layout.js';
import {GardenBall,BALL_SPAWN} from '../src/mooslicht/ball.js';
function walk(g,x,z){for(let i=0;i<1200;i++){const p=g.player,dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.1&&p.grounded)return;const speed=Math.min(1,d*2);g.update({x:dx/(d||1)*speed,z:dz/(d||1)*speed},STEP);}assert.fail(`Unreachable ${x},${z}`);}

test('Mooslicht: new lawn wraps the actual house corner, enters lounge and returns on foot',()=>{
  const g=new Adventure();g.start();const path=[[-12,20],[-12,34],[-6,48],[-16,51],[-20,57],[-25,62],[-31,65],[-40,65],[-40,60],[-38.3,58.5]];
  for(const [x,z] of path)walk(g,x,z);assert.equal(surfaceAt(g.player.x,g.player.z,0,.5).id,'lounge');
  for(const [x,z] of path.reverse())walk(g,x,z);assert.equal(g.player.health,5);assert.equal(g.fallTimer,0);
  for(const p of REAR_OUTLINE)assert.ok(insideOutline(GARDEN_OUTLINE,p.x,p.z));
});
test('Mooslicht: concave visible top covers exactly the collision polygon',()=>{
  const g=islandGeometry(GARDEN_OUTLINE,0,7,0,27),p=g.attributes.position,index=g.index;
  const triangles=[];for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];if(ids.every(j=>p.getY(j)===0))triangles.push(ids.map(j=>({x:p.getX(j),z:p.getZ(j)})));}
  for(let x=-62;x<=30;x+=2.13)for(let z=-62;z<=78;z+=2.19)assert.equal(triangles.some(t=>insideOutline(t,x,z)),insideOutline(GARDEN_OUTLINE,x,z),`top mismatch at ${x},${z}`);
  g.dispose();
});
test('Mooslicht: balcony connector and railing opening allow both directions',()=>{
  const g=new Adventure();Object.assign(g.player,{x:9,z:16,y:23,grounded:true});g.start();walk(g,-9,16);walk(g,-16,18);assert.equal(g.player.y,24);
  walk(g,-9,16);walk(g,9,16);assert.ok(Math.abs(g.player.y-23)<.1);assert.equal(g.player.health,5);
  const a={x:-8.3,z:24,y:24,vx:1,vz:0};resolveWalls(a);assert.notEqual(a.x,-8.3);
  assert.ok(cameraFraction({x:-12,y:26,z:22},{x:0,y:26,z:22})<1);
  assert.equal(surfaceAt(BALCONY.x,18,0,24.1).height,24);
  const b=BRIDGES.at(-1);assert.ok(Math.abs(surfaceAt(-8.5,16,0,24.1).height-b.by)<.1);
});
test('Mooslicht: new room blocks glass and rear wall while its open door admits camera',()=>{
  assert.equal(cameraFraction({x:-40,y:3,z:65},{x:-40,y:3,z:59}),1);
  assert.ok(cameraFraction({x:-46,y:3,z:65},{x:-46,y:3,z:59})<1);
  const wall={x:-37,z:50,y:0,vx:0,vz:-1};resolveWalls(wall);assert.notEqual(wall.z,50);
  assert.equal(surfaceAt(-42,56.5,0,3).height,2.35);assert.equal(surfaceAt(-42,56.5,0,1).height,.08);
});
test('Mooslicht: projecting gable blocks its wall and roof while the lowered house end opens the sky',()=>{
  assert.ok(cameraFraction({x:-18,y:12,z:42},{x:-25,y:12,z:42})<1);
  assert.ok(cameraFraction({x:-18,y:30,z:42},{x:-25,y:30,z:42})<1);
  assert.equal(cameraFraction({x:-18,y:34,z:49},{x:-28,y:34,z:49}),1);
  assert.equal(cameraFraction({x:-45,y:32,z:54},{x:-45,y:32,z:46}),1);
  const p={x:-21,z:42,y:0,vx:-1,vz:0};resolveWalls(p);assert.ok(p.x>-20.8);
});
test('Mooslicht: football rests on the new rear deck and returns after its new cliff',()=>{
  const ball=new GardenBall(),player={x:-40,z:67,y:.08,vx:0,vz:0,facing:0};Object.assign(ball,{x:-40,z:65,y:.83});
  for(let i=0;i<120;i++)ball.update(player,STEP);assert.equal(ball.y,.83);assert.equal(ball.resetIn,0);
  Object.assign(ball,{x:-64,z:66,y:.75,vx:-3});let scheduled=false;for(let i=0;i<240;i++){ball.update(player,STEP);scheduled ||= ball.resetIn>0;}
  assert.equal(scheduled,true);assert.equal(ball.x,BALL_SPAWN.x);assert.equal(ball.z,BALL_SPAWN.z);
});
test('Mooslicht: old and malformed appearance saves retain story and safe checkpoint',()=>{
  const old={quests:{garden:true,ruins:true},seeds:[2,7],checkpoint:'ruins',position:{x:-24,z:50},appearance:{variant:'unknown',hair:'__proto__',eyes:'blue',skin:3}};
  const s=cleanSave(old);assert.deepEqual(s.appearance,DEFAULT_APPEARANCE);const g=new Adventure(s);
  assert.deepEqual(g.quests,s.quests);assert.deepEqual([...g.seeds],[2,7]);assert.equal(g.player.x,CHECKPOINTS.ruins.x);
  const memory={getItem(){return this.data;},setItem(k,v){this.data=v;}};writeSave(memory,g.snapshot());assert.deepEqual(readSave(memory),s);
});
test('Mooslicht: draft selection and reset are reversible, confirmation is isolated and persistent',()=>{
  const g=new Adventure({quests:{garden:true},appearance:{variant:'feminine',hair:'long'}}),before=g.snapshot(),draft=new AppearanceDraft(g.appearance);
  draft.choose('hair','short');draft.choose('eyes','green');draft.reset();assert.deepEqual(g.snapshot(),before);assert.deepEqual(draft.cancel(),before.appearance);
  draft.choose('variant','feminine');draft.choose('hair','long');draft.choose('eyes','blue');const confirmed=draft.confirm();g.appearance=confirmed;
  draft.choose('hair','short');assert.equal(g.appearance.hair,'long');g.respawn();assert.deepEqual(new Adventure(g.snapshot()).appearance,confirmed);assert.equal(g.quests.garden,true);
  assert.deepEqual(cleanAppearance(null),DEFAULT_APPEARANCE);
});
test('Mooslicht: variants share movement, model changes reuse bounded geometry and update occlusion aid',()=>{
  const hero=makeHero(),geometries=new Set(),materials=new Set();
  // Mirror the renderer's child overlays; a hairstyle swap must update the
  // existing overlay rather than leaving the previous silhouette behind.
  const parts=[];hero.body.traverse(o=>{if(o.isMesh)parts.push(o);});
  for(const part of parts){const overlay=part.clone(false);part.add(overlay);}
  for(let cycle=0;cycle<3;cycle++)for(const variant of ['masculine','feminine'])for(const hair of ['curly','short','long']){
    hero.applyAppearance({variant,hair});hero.root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);assert.ok(o.position.toArray().every(Number.isFinite));}});
    for(const part of parts)assert.equal(part.children[0].geometry,part.geometry);
  }
  const size=[geometries.size,materials.size];for(const hair of ['long','curly','short']){hero.applyAppearance({hair});hero.root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});}assert.deepEqual([geometries.size,materials.size],size);
  const a=new Adventure({appearance:{variant:'masculine'}}),b=new Adventure({appearance:{variant:'feminine'}});a.start();b.start();for(let i=0;i<60;i++){a.update({x:1,jump:i===0},STEP);b.update({x:1,jump:i===0},STEP);}assert.deepEqual(a.player,b.player);hero.dispose();
});
