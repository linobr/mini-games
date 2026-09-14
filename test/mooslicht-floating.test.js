import test from 'node:test';
import assert from 'node:assert/strict';
import {Adventure,STEP,cleanSave} from '../src/mooslicht/game.js';
import {GARDEN_OUTLINE,SATELLITES,SKY_ROUTES,SKY_STONES,STONES,SECRETS,CHECKPOINTS,insideOutline,surfaceAt,resolveWalls,TREE,SHED} from '../src/mooslicht/world.js';
import {AtmosphereState,skyTarget,nightAmount,fallOpacity,skyStage} from '../src/mooslicht/atmosphere.js';
import {MAP_DATA,mapPoint} from '../src/mooslicht/map.js';
import {buildScene} from '../src/mooslicht/scene.js';
import {islandGeometry} from '../src/mooslicht/floating.js';
function step(g,n,input={}){for(let i=0;i<n;i++)g.update(input,STEP);}
function walk(g,x,z,jump=false){
  for(let i=0;i<900;i++){const p=g.player,dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.14&&p.grounded){step(g,10);return;}const speed=Math.min(1,d*2.2);g.update({x:dx/(d||1)*speed,z:dz/(d||1)*speed,jump:jump&&p.grounded},STEP);}
  assert.fail(`Unreachable ${x},${z}: ${JSON.stringify(g.player)}`);
}
test('Mooslicht: visible organic top and collision share every edge, with open cliffs',()=>{
  const geo=islandGeometry(GARDEN_OUTLINE,0,-17,0,24),p=geo.attributes.position;
  GARDEN_OUTLINE.forEach((v,i)=>{assert.ok(Math.abs(p.getX(i+1)-v.x)<1e-5);assert.ok(Math.abs(p.getZ(i+1)-v.z)<1e-5);assert.equal(p.getY(i+1),0);});
  for(const v of GARDEN_OUTLINE){const dx=v.x,dz=v.z+17,len=Math.hypot(dx,dz);const x=v.x+dx/len*2,z=v.z+dz/len*2;assert.equal(insideOutline(GARDEN_OUTLINE,x,z),false);}
  assert.equal(surfaceAt(31,15).height,-Infinity);
  const avatar={x:24,z:18,y:0,vx:1,vz:0};resolveWalls(avatar);assert.equal(avatar.x,24);
  for(const s of SECRETS.filter(s=>s.y===0))assert.ok(insideOutline(GARDEN_OUTLINE,s.x,s.z));
});
test('Mooslicht: all four floating islands can be visited by normal movement and jumps',()=>{
  const g=new Adventure();g.start();walk(g,-7,-8);walk(g,20,-8);walk(g,25,-8);
  for(const s of SKY_STONES.slice(0,4))walk(g,s.x,s.z,true);walk(g,40,-8,true);
  assert.equal(g.visited.has('moss'),true);walk(g,41,-12);
  for(const s of SKY_STONES.slice(4,8))walk(g,s.x,s.z,true);walk(g,46,-27,true);assert.equal(g.visited.has('pebble'),true);
  for(const s of [...SKY_STONES.slice(4,8)].reverse())walk(g,s.x,s.z,true);walk(g,40,-8,true);
  for(const s of [...SKY_STONES.slice(0,4)].reverse())walk(g,s.x,s.z,true);walk(g,25,-8,true);walk(g,20,-8);walk(g,-5,-8);walk(g,-5,24);
  for(const s of SKY_STONES.slice(8,12))walk(g,s.x,s.z,true);walk(g,-5,39,true);assert.ok(g.visited.has('bloom'));
  for(const s of [...SKY_STONES.slice(8,12)].reverse())walk(g,s.x,s.z,true);walk(g,-5,24,true);walk(g,-12,20);walk(g,-12,-52);walk(g,-4,-56);walk(g,10,-56);
  for(const s of SKY_STONES.slice(12))walk(g,s.x,s.z,true);walk(g,10,-73,true);
  assert.equal(g.visited.size,4);assert.equal(g.player.health,5);assert.equal(g.fallTimer,0);
});
test('Mooslicht: a fall has a visible fade, pauses safely, and returns to the last garden checkpoint',()=>{
  const g=new Adventure({quests:{garden:true},seeds:[0,3],secrets:[2],checkpoint:'garden'});g.start();Object.assign(g.player,{x:80,z:0,y:-4.1,grounded:false});g.update();
  assert.ok(g.fallTimer>0);assert.equal(g.player.health,5);step(g,29);assert.equal(fallOpacity(g),1);const before=g.player.y;g.pause();step(g,100);assert.equal(g.player.y,before);
  g.start();step(g,15);assert.equal(g.player.x,CHECKPOINTS.garden.x);assert.equal(g.player.health,4);assert.ok(g.returnFade>0);assert.deepEqual([...g.secrets],[2]);step(g,32);assert.equal(fallOpacity(g),0);
});
test('Mooslicht: sky advances in light order, interpolates smoothly and freezes on pause',()=>{
  const g=new Adventure(),a=new AtmosphereState();g.start();a.update(g,STEP);assert.equal(a.phase,0);
  for(const id of ['wind','garden','ruins']){const before=a.phase;g.activateLight(id);a.update(g,STEP);assert.ok(a.phase>before&&a.phase<skyTarget(g.lights,false));for(let i=0;i<1800;i++)a.update(g,STEP);assert.ok(Math.abs(a.phase-skyTarget(g.lights,false))<.01);}
  assert.equal(skyStage(a.phase),'Nacht');assert.ok(nightAmount(a.phase)>.99);g.pause();const before=a.phase;a.update(g,3);assert.equal(a.phase,before);
});
test('Mooslicht: finale and reduced motion reach a stable galaxy; restarting restores day',()=>{
  const g=new Adventure({quests:{garden:true,wind:true,ruins:true}}),a=new AtmosphereState();a.update(g,STEP);g.finished=true;a.update(g,STEP,true);assert.ok(a.finalAge<.1);
  for(let i=0;i<660;i++)a.update(g,STEP,true);assert.ok(a.phase>4.9);assert.ok(a.finalAge>10);
  a.update(g,STEP,false,true);assert.equal(a.phase,5);assert.equal(a.finalAge,12);a.update(new Adventure(),STEP);assert.equal(a.phase,0);assert.equal(a.finalAge,0);
});
test('Mooslicht: old saves and new exploration fields validate without losing quests or secrets',()=>{
  const old=new Adventure({quests:{garden:true,ruins:true},secrets:[0,5],seeds:[23],checkpoint:'ruins'});assert.equal(skyTarget(old.lights,old.finished),2.65);assert.equal(old.secrets.size,2);
  const valid=cleanSave({...old.snapshot(),lastLight:'garden',visited:['moss','moss','echo','__proto__',8]});assert.deepEqual(valid.visited,['moss','echo']);assert.equal(valid.lastLight,'garden');
  const restored=new Adventure(valid);assert.deepEqual(restored.snapshot(),valid);assert.equal(cleanSave({lastLight:'wind'}).lastLight,null);
});
test('Mooslicht: map includes all geography inside its canvas and never reveals secrets',()=>{
  assert.equal(MAP_DATA.islands.length,4);assert.equal(MAP_DATA.routes.length,4);assert.equal(MAP_DATA.garden,GARDEN_OUTLINE);
  for(const p of [...MAP_DATA.garden,...MAP_DATA.islands.flatMap(i=>i.outline)]){const v=mapPoint(p.x,p.z);assert.ok(v.x>5&&v.x<275&&v.y>5&&v.y<259);}
  assert.equal('secrets' in MAP_DATA,false);for(const i of MAP_DATA.islands)assert.equal('name' in i,false);
});
test('Mooslicht: high and low graphics retain gameplay with bounded geometry, particles and shadows',()=>{
  const w=buildScene();for(const high of [true,false]){
    w.garden.quality(!high,high);w.floating.quality(!high,high);w.sky.quality(!high,high);let triangles=0,shadows=0,meshes=0;
    w.scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);if(o.castShadow)shadows++;}});
    assert.ok(triangles<(high?350000:280000));assert.ok(shadows<=20);assert.ok(meshes<340,`${meshes} meshes`);assert.equal(w.stones.length,STONES.length);assert.equal(w.floating.islands.length,5);assert.equal(w.sky.stars.geometry.drawRange.count,high?1600:500);
    assert.equal(w.sky.stars.material.depthWrite,false);
  }
});
test('Mooslicht: finale ribbon begins at the last earned shrine and replay clears effects',()=>{
  const w=buildScene(),g=new Adventure({quests:{garden:true,wind:true,ruins:true},lastLight:'garden',finished:true});
  w.sky.update(g,STEP,0,false,false);w.floating.update(0,g,1,12,false);assert.equal(w.floating.ribbons[0].visible,true);assert.equal(w.floating.ribbons[1].visible,false);assert.equal(w.floating.canopy.visible,true);
  w.floating.update(1,new Adventure(),0,0,false);assert.equal(w.floating.canopy.visible,false);assert.equal(w.floating.pulse.material.opacity,0);
});
