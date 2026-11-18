import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TARGET, MELODY, startRun, nextChapter, setPosition, ringBell, tickRun,
  playStudioNote, chooseContact, answerContact, loadRecord, saveRecord,
} from '../public/emil/engine.js';

function sample(state, count = 1) {
  state.spawnClock = 100;
  state.entities = Array.from({length:count}, (_, id) => ({id,kind:'note',x:state.x,y:state.y,tone:0,speed:0}));
  return tickRun(state, .016);
}
test('samples advance both chapters exactly once before the studio', () => {
  const state = startRun();
  sample(state, TARGET);
  assert.equal(state.phase, 'chapter');
  assert.equal(state.samples, TARGET);
  assert.equal(state.score, 950);
  assert.deepEqual(tickRun(state, .04), []);
  assert.equal(nextChapter(state), true);
  assert.equal(nextChapter(state), false);
  assert.equal(state.chapter, 1);
  assert.equal(state.samples, 0);
  sample(state, TARGET);
  assert.equal(state.phase, 'studio');
  assert.equal(state.score, 1900);
});
test('collisions consume energy with invulnerability and stop the run at zero', () => {
  const state = startRun();
  state.spawnClock = 100;
  const obstacle = () => ({kind:'obstacle',x:state.x,y:state.y,speed:0});
  state.entities = [obstacle(), obstacle()];
  tickRun(state, .016);
  assert.equal(state.lives, 2);
  state.entities = [obstacle()];
  tickRun(state, .016);
  assert.equal(state.lives, 2);
  for (let hit = 0; hit < 2; hit++) {
    state.invincible = 0;
    state.entities = [obstacle()];
    tickRun(state, .016);
  }
  assert.equal(state.phase, 'over');
  assert.equal(state.lives, 0);
  assert.equal(ringBell(state), false);
});
test('bell clears nearby obstacles and keeps samples and distant carts', () => {
  const state = startRun();
  state.entities = [
    {kind:'note',x:state.x,y:state.y},
    {kind:'obstacle',x:state.x+25,y:state.y},
    {kind:'obstacle',x:state.x+300,y:state.y},
  ];
  assert.equal(ringBell(state), true);
  assert.equal(state.entities.length, 2);
  assert.equal(state.score, 15);
  assert.equal(ringBell(state), false);
  assert.equal(state.entities[0].kind, 'note');
});
test('position, frame time and chapter transitions stay bounded', () => {
  const state = startRun();
  setPosition(state, -100, 10000);
  assert.deepEqual([state.x,state.y], [200,520]);
  setPosition(state, NaN, 20);
  assert.equal(state.x, 200);
  tickRun(state, Infinity, {left:true}, () => 1);
  assert.ok(Number.isFinite(state.clock));
  tickRun(state, 100000, {left:true,down:true}, () => 1);
  assert.equal(state.clock, .05);
  assert.equal(state.x, 200);
  assert.equal(state.y, 520);
  state.phase = 'chapter';
  setPosition(state, 400,400);
  assert.equal(state.x, 200);
  nextChapter(state);
  assert.deepEqual([state.x,state.y], [450,470]);
});
test('a wrong studio note stays on the same step and completing the tune opens a conversation', () => {
  const state = startRun();
  state.phase = 'studio';
  assert.deepEqual(playStudioNote(state,2), {correct:false,complete:false});
  assert.equal(state.studioIndex,0);
  assert.equal(playStudioNote(state,9),null);
  for (const tone of MELODY) assert.equal(playStudioNote(state,tone).correct,true);
  assert.equal(state.phase,'meet');
  assert.equal(playStudioNote(state,0),null);
  assert.equal(chooseContact(state,'unknown'),false);
  assert.equal(chooseContact(state,'lea'),true);
  assert.equal(answerContact(state,4),false);
  assert.equal(answerContact(state,0),true);
  assert.equal(state.phase,'done');
  assert.equal(state.ending.match,true);
  const score = state.score;
  assert.equal(answerContact(state,0),false);
  assert.equal(state.score,score);
});
test('alternate meeting ending is reachable and blocked storage keeps the game usable', () => {
  const state = startRun();
  state.phase = 'meet';
  chooseContact(state,'mia');
  answerContact(state,1);
  assert.equal(state.ending.name,'Mia');
  assert.equal(state.ending.match,false);
  const blocked = {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.deepEqual(loadRecord(blocked),{best:0,muted:false});
  assert.equal(saveRecord(blocked,{best:900,muted:true}),false);
  assert.deepEqual(loadRecord({getItem:()=>'{bad'}),{best:0,muted:false});
  assert.deepEqual(loadRecord({getItem:()=>'{"best":-4,"muted":true}'}),{best:0,muted:true});
});
