import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildScene} from '../src/mooslicht/scene.js';
import {WorldView,Effects} from '../src/mooslicht/renderer.js';
import {Adventure} from '../src/mooslicht/game.js';
import {LOUNGE_VIEWS} from '../src/mooslicht/lounge-views.js';
import {CHECKPOINTS} from '../src/mooslicht/world.js';

// This exercises the real animation / camera path without claiming a GPU render.
test('Mooslicht: real scene animation and cinematics remain finite through every quest stage',()=>{
  const world=buildScene(),game=new Adventure(),view=Object.create(WorldView.prototype);
  let submitted=0;
  Object.assign(view,{world,scene:world.scene,clock:0,started:false,transition:0,motion:false,quality:'high',autoLow:false,samples:0,sampleTime:0,
    camera:new T.PerspectiveCamera(50,16/9,.1,200),target:new T.Vector3(-10,1,10),desired:new T.Vector3(),look:new T.Vector3(),temp:new T.Object3D(),
    yaw:0,pitch:.3,distance:7.4,shake:0,cinematic:null,cineTime:0,overview:false,fps:0,fpsFrames:0,fpsTime:0,
    shadow:new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial()),lampGlow:new T.Sprite(),effects:new Effects(world.scene),renderer:{render(){submitted++;}}});
  view.makeFireflies();
  for(const id of ['home','garden','ruins','wind']){
    Object.assign(game.player,CHECKPOINTS[id]);if(id!=='home')game.quests[id]=true;
    for(let i=0;i<120;i++)view.render(game,1/60,false);
    for(const value of [...view.camera.position.toArray(),...view.camera.quaternion.toArray()])assert.ok(Number.isFinite(value));
  }
  view.beginCinematic('arrival');for(let i=0;i<610;i++)view.render(game,1/60);assert.equal(view.cinematic,null);
  game.finished=true;view.beginCinematic('finale');for(let i=0;i<670;i++)view.render(game,1/60);assert.equal(view.cinematic,null);assert.equal(world.garden.roots.visible,true);
  view.motion=true;view.overview=true;view.camera.aspect=.55;view.render(game,1/60);assert.ok(submitted>1500);
  // Restart clears the finale growth without rebuilding or leaking scene nodes.
  const count=world.scene.children.length;view.render(new Adventure(),1/60);assert.equal(world.garden.roots.visible,false);assert.equal(world.scene.children.length,count);
  // Inspection uses the real camera path, leaves the paused player/save untouched,
  // and restores the normal follow camera without allocating another scene.
  const inspected=new Adventure();inspected.start();inspected.pause();const saved=inspected.snapshot(),player={...inspected.player};
  view.overview=false;
  for(const shot of Object.keys(LOUNGE_VIEWS)){
    view.lounge=shot;
    for(const aspect of [16/9,.55]){
      view.camera.aspect=aspect;view.render(inspected,1/60);
      assert.ok(view.camera.position.y>.08&&view.camera.position.y<16);
      assert.ok(view.camera.position.x>-52&&view.camera.position.x<-28);
      assert.ok(view.camera.position.z>50&&view.camera.position.z<62);
      for(const n of [...view.camera.projectionMatrix.elements,...view.camera.quaternion.toArray()])assert.ok(Number.isFinite(n));
    }
  }
  assert.deepEqual(inspected.snapshot(),saved);assert.deepEqual(inspected.player,player);
  assert.equal(world.scene.children.length,count);
  view.resetCamera();assert.equal(view.lounge,null);view.render(inspected,1/60);assert.equal(view.camera.fov,58);

});
test('Mooslicht: quality settings reduce grass while preserving landmarks and traversal geometry',()=>{
  const w=buildScene(),platformCount=w.stones.length;
  w.garden.quality(false,true);assert.equal(w.garden.grass.count,11000);
  w.garden.quality(false,false);assert.equal(w.garden.grass.count,6500);
  w.garden.quality(true,false);assert.equal(w.garden.grass.count,3000);
  assert.equal(w.stones.length,platformCount);assert.ok(w.garden.leaves.count===7000);
  let triangles=0;w.scene.traverse(o=>{if(o.isMesh){const g=o.geometry;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});
  assert.ok(triangles<320000,`Geometry budget exceeded: ${triangles}`);
});
