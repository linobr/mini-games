import test from 'node:test';
import assert from 'node:assert/strict';
import {makeHero} from '../src/mooslicht/hero.js';
import {AtmosphereState,cleanDayPhase,dayPhaseFromPosition} from '../src/mooslicht/atmosphere.js';
import {Adventure} from '../src/mooslicht/game.js';

test('Mooslicht: male jacket ends at belt above two separated trouser legs, female shape restores',()=>{
  const hero=makeHero();
  for(const variant of ['feminine','masculine','feminine','masculine']){
    hero.applyAppearance({variant});const jacket=hero.root.getObjectByName('upper-outfit'),back=hero.root.getObjectByName('back-outfit');
    if(variant==='feminine'){assert.equal(jacket.geometry.type,'ConeGeometry');assert.equal(back.geometry.type,'ConeGeometry');assert.equal(jacket.scale.y,.72);}
    else {
      assert.equal(jacket.geometry.type,'BoxGeometry');assert.equal(back.geometry.type,'BoxGeometry');
      assert.ok(jacket.position.y-jacket.scale.y/2>=.8);assert.ok(back.position.y-back.scale.y/2>=.8);
      assert.equal(hero.legs.length,2);assert.ok(hero.legs[0].position.x+.135<hero.legs[1].position.x-.135);
      for(const leg of hero.legs){const trousers=leg.getObjectByName('trouser-leg');assert.ok(leg.position.y+trousers.position.y+trousers.scale.y/2>=.8);}
    }
  }hero.dispose();
});
test('Mooslicht: day selection clamps finite inputs and rejects corrupt stored values',()=>{
  for(const value of [undefined,null,'5',true,{},NaN,Infinity,-Infinity])assert.equal(cleanDayPhase(value),null);
  assert.equal(cleanDayPhase(-20),0);assert.equal(cleanDayPhase(20),5);assert.equal(cleanDayPhase(2.345),2.345);
  assert.equal(dayPhaseFromPosition(-1),0);assert.equal(dayPhaseFromPosition(2),5);assert.equal(dayPhaseFromPosition(.5),2.5);
  const settings=JSON.parse(JSON.stringify({dayPhase:3.75}));const state=new AtmosphereState();state.setManualPhase(cleanDayPhase(settings.dayPhase));state.update(new Adventure(),1/60);assert.equal(state.phase,3.75);
});
test('Mooslicht: manual sky moves smoothly in both directions without changing gameplay or pause',()=>{
  const game=new Adventure(),before=game.snapshot(),state=new AtmosphereState();state.update(game,0);state.setManualPhase(5);state.update(game,1/60);
  assert.ok(state.phase>0&&state.phase<1);for(let i=0;i<180;i++)state.update(game,1/60);assert.ok(state.phase>4.99);
  state.setManualPhase(0);state.update(game,1/60);assert.ok(state.phase>4&&state.phase<5);assert.equal(game.running,false);assert.deepEqual(game.snapshot(),before);
  state.setManualPhase(null);const phase=state.phase;state.update(game,1);assert.equal(state.phase,phase);game.start();state.update(game,1);assert.ok(state.phase<phase);
});
test('Mooslicht: manual light does not replace finale and returns afterwards',()=>{
  const game=new Adventure({quests:{garden:true,ruins:true,wind:true},finished:true}),state=new AtmosphereState();state.setManualPhase(0);state.update(game,0);assert.equal(state.phase,0);
  for(let i=0;i<720;i++)state.update(game,1/60,true);assert.ok(state.phase>4.7);assert.equal(state.finalAge,12);
  game.start();for(let i=0;i<180;i++)state.update(game,1/60);assert.ok(state.phase<.001);assert.equal(game.finished,true);
});
