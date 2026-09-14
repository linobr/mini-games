import test from 'node:test';
import assert from 'node:assert/strict';
import {Adventure,STEP} from '../src/mooslicht/game.js';
import {surfaceAt,cameraFraction,resolveWalls,insideOutline,GARDEN_OUTLINE,SOLIDS,SATELLITES,PALM} from '../src/mooslicht/world.js';
import {TERRACE_OUTLINE,GRAVEL_OUTLINE,TABLE_LEGS,LOUNGERS} from '../src/mooslicht/garden-layout.js';
import {GardenBall,BALL_SPAWN,BALL_MAX_SPEED} from '../src/mooslicht/ball.js';

function walk(g,x,z){
  for(let i=0;i<1000;i++){const p=g.player,dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.16&&p.grounded)return;g.update({x:dx/(d||1)*Math.min(1,d*2),z:dz/(d||1)*Math.min(1,d*2)},STEP);}
  assert.fail(`Cannot reach ${x},${z} from ${g.player.x},${g.player.z}`);
}
test('Mooslicht: terrace and curved gravel sit wholly on the continuous main island',()=>{
  for(const polygon of [TERRACE_OUTLINE,GRAVEL_OUTLINE])for(const p of polygon){assert.ok(insideOutline(GARDEN_OUTLINE,p.x,p.z));assert.equal(surfaceAt(p.x,p.z,0,.2).height,0);}
  assert.ok(!insideOutline(GRAVEL_OUTLINE,2,49));assert.ok(insideOutline(GRAVEL_OUTLINE,14,51));
  for(const island of SATELLITES)for(const p of island.outline)assert.ok(!insideOutline(GARDEN_OUTLINE,p.x,p.z));
});
test('Mooslicht: player walks from old garden under table to second lawn and rounded seating corner',()=>{
  const g=new Adventure();g.start();
  for(const [x,z] of [[-10,5],[-6,5],[-1,9],[-1,17],[-1,29],[-5,36],[-5,45],[0,50],[6,52],[11,52],[11,55]])walk(g,x,z);
  assert.equal(g.player.health,5);assert.equal(g.fallTimer,0);assert.equal(g.player.y,0);
  assert.equal(surfaceAt(-1,17,0,1).height,0);assert.equal(surfaceAt(-1,17,0,9).height,8);
});
test('Mooslicht: table legs, recliner back and tabletop protect camera while under-table corridor stays open',()=>{
  assert.equal(cameraFraction({x:-1,y:1.65,z:17},{x:-1,y:3,z:23}),1);
  assert.ok(cameraFraction({x:-1,y:2,z:17},{x:-1,y:12,z:17})<.65);
  for(const leg of TABLE_LEGS){const p={x:leg.x,z:leg.z,y:0,vx:1,vz:1};resolveWalls(p);assert.ok(Math.hypot(p.x-leg.x,p.z-leg.z)>.4);assert.ok(cameraFraction({x:leg.x-2,y:2,z:leg.z},{x:leg.x+2,y:2,z:leg.z})<1);}
  for(const l of LOUNGERS)assert.ok(cameraFraction({x:l.x+3.3,y:4.12,z:l.z-4},{x:l.x+3.3,y:4.12,z:l.z+4})<1);
});
test('Mooslicht: football kicks roll with bounded speed and reflect from walls, trunks and table legs',()=>{
  const b=new GardenBall(),p={x:-3,z:39,y:0,vx:0,vz:6,facing:0};b.update(p,STEP);assert.ok(b.vz>3);const start=b.z;
  for(let i=0;i<120;i++)b.update({...p,x:-15,z:40},STEP);assert.ok(b.z>start+2);assert.ok(b.vz<1.5);assert.notEqual(b.rx,0);
  for(const pos of [{x:-21.2,z:40,vx:-9,vz:0},{x:PALM.x+1.9,z:PALM.z,vx:-9,vz:0},{x:TABLE_LEGS[0].x+.99,z:TABLE_LEGS[0].z,vx:-9,vz:0}]){
    Object.assign(b,pos,{y:.75,vy:0,resetIn:0});b.update({x:0,z:40,y:0,vx:0,vz:0},STEP);assert.ok(b.vx>0);assert.ok(Math.hypot(b.vx,b.vz)<=BALL_MAX_SPEED);
  }
  Object.assign(b,{x:0,z:40,vx:1000,vz:1000});b.update({x:-10,z:40,y:0,vx:0,vz:0},STEP);assert.ok(Math.hypot(b.vx,b.vz)<=BALL_MAX_SPEED);
});
test('Mooslicht: lost football returns, pause freezes it and old saves remain unchanged',()=>{
  const g=new Adventure({quests:{garden:true},secrets:[5]});g.start();Object.assign(g.ball,{x:90,z:60,y:-6});g.update();assert.ok(g.ball.resetIn>0);g.pause();const delay=g.ball.resetIn;for(let i=0;i<180;i++)g.update();assert.equal(g.ball.resetIn,delay);
  g.start();for(let i=0;i<120;i++)g.update();assert.equal(g.ball.x,BALL_SPAWN.x);assert.equal(g.ball.z,BALL_SPAWN.z);assert.equal(g.ball.y,BALL_SPAWN.y);
  assert.deepEqual(new Adventure(g.snapshot()).snapshot(),g.snapshot());assert.ok(!('ball' in g.snapshot()));
  assert.ok(SOLIDS.length<100);
});
