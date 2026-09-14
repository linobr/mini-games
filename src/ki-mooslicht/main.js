import { Adventure, FixedClock, readSave, writeSave } from './game.js';
import { WorldView } from './renderer.js';
import { Controls } from './input.js';
import { Soundscape } from './audio.js';
import {fallOpacity,skyStage} from './atmosphere.js';
import {MAP_DATA,mapPoint} from './map.js';
import { ISLANDS, SHRINES, BRIDGES, TREE, CHECKPOINTS } from './world.js';

const $=id=>document.getElementById(id),canvas=$('world');
const fallVeil=document.createElement('div');fallVeil.className='fall-veil';fallVeil.setAttribute('aria-hidden','true');$('adventure').appendChild(fallVeil);
let storage;try{storage=window.localStorage;}catch{storage=null;}
let preferences={};try{preferences=JSON.parse(storage?.getItem('minigames.mooslicht.settings')||'{}')||{};}catch{}
const settings={quality:['auto','low','medium','high'].includes(preferences.quality)?preferences.quality:'auto',
  volume:Number.isFinite(preferences.volume)?Math.max(0,Math.min(1,preferences.volume)):.45,
  sound:preferences.sound!==false,motion:typeof preferences.motion==='boolean'?preferences.motion:matchMedia('(prefers-reduced-motion:reduce)').matches};
let game=new Adventure(readSave(storage)),view;
try{view=new WorldView(canvas,settings);}catch(error){$('error').hidden=false;$('intro').hidden=true;throw error;}
const clock=new FixedClock(),sound=new Soundscape(settings.volume,settings.sound);
let started=false,last=performance.now(),uiTime=0,savedOnce=false,savePending=false,saveDeadline=0;
let toastTimer,areaTimer,damageTimer,winTimer,restartTimer,restarting=false,winning=false,arriving=false;
const controls=new Controls(canvas,view,()=>openPause());
const coarse=matchMedia('(pointer:coarse)');

function save(){
  const ok=writeSave(storage,game.snapshot());
  if(!ok&&!savedOnce){toast('Speichern ist hier nicht verfügbar. Diese Runde bleibt bis zum Schliessen offen.');savedOnce=true;}
  savePending=false;
}
function saveSettings(){try{storage?.setItem('minigames.mooslicht.settings',JSON.stringify(settings));}catch{}}
function requestSave(){savePending=true;saveDeadline=performance.now()+350;}
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),5200);}
function anyDialog(){return !!document.querySelector('dialog[open]');}
function pauseGame(){game.pause();controls.setActive(false);clock.reset();sound.playing=false;save();}
function resumeGame(){
  if(!started||winning||arriving||anyDialog()||document.hidden||!$('error').hidden)return;
  game.start();controls.setActive(true);clock.reset();last=performance.now();canvas.focus({preventScroll:true});
  sound.unlock();sound.playing=true;
}
function openPause(){if(!started||winning||arriving||anyDialog())return;pauseGame();$('pause-dialog').showModal();}
function start(){
  started=true;document.body.dataset.screen='play';$('intro').hidden=true;$('hud').hidden=false;$('controls-hint').hidden=false;$('touch-controls').hidden=!coarse.matches;
  sound.unlock();
  if(game.elapsed<3&&!settings.motion){arriving=true;view.beginCinematic('arrival');$('cinema').hidden=false;game.pause();sound.playing=true;}
  else resumeGame();
  toast(game.lights===3?'Der Herzbaum wartet am weissen Steinkreis.':'Folge den Steinplatten. Lumi wartet gleich neben dir.');
  $('area-title').textContent='Ein Garten. Eine ganze Welt.';$('area-title').classList.add('visible');areaTimer=setTimeout(()=>$('area-title').classList.remove('visible'),3200);
}
$('start-label').textContent=game.elapsed>3||game.lights>0?'Abenteuer fortsetzen':'Abenteuer starten';$('start').disabled=false;
$('start').addEventListener('click',start);
$('pause').addEventListener('click',openPause);
$('resume').addEventListener('click',()=>$('pause-dialog').close());
$('intro-help').addEventListener('click',()=>$('help-dialog').showModal());
$('help').addEventListener('click',()=>$('help-dialog').showModal());
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('close',()=>{if(!anyDialog())resumeGame();});
$('reset-position').addEventListener('click',()=>{game.respawn();$('pause-dialog').close();});
$('restart').addEventListener('click',()=>{
  if(!restarting){restarting=true;$('restart').textContent='Nochmals klicken: Fortschritt zurücksetzen';restartTimer=setTimeout(()=>{restarting=false;$('restart').textContent='Neues Abenteuer beginnen';},5000);return;}
  clearTimeout(restartTimer);clearTimeout(winTimer);restarting=false;$('restart').textContent='Neues Abenteuer beginnen';
  game=new Adventure();view.resetCamera();view.target.set(CHECKPOINTS.home.x,1,CHECKPOINTS.home.z);save();$('pause-dialog').close();updateUI();toast('Ein neues Abenteuer beginnt.');
});
$('quality').value=settings.quality;$('motion').checked=settings.motion;$('volume').value=Math.round(settings.volume*100);
$('quality').addEventListener('change',e=>{settings.quality=e.target.value;view.quality=settings.quality;view.autoLow=false;view.applyQuality();saveSettings();});
$('motion').addEventListener('change',e=>{settings.motion=e.target.checked;view.motion=settings.motion;saveSettings();});
$('volume').addEventListener('input',e=>{settings.volume=Number(e.target.value)/100;sound.setVolume(settings.volume);saveSettings();});
function soundUI(){const on=settings.sound;$('sound').setAttribute('aria-pressed',String(on));$('sound').setAttribute('aria-label',on?'Ton ausschalten':'Ton einschalten');$('sound').title=on?'Ton ausschalten':'Ton einschalten';}
soundUI();
$('sound').addEventListener('click',()=>{settings.sound=!settings.sound;sound.setEnabled(settings.sound);sound.unlock();soundUI();saveSettings();if(controls.active)canvas.focus({preventScroll:true});});
if(!document.fullscreenEnabled)$('fullscreen').hidden=true;
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('adventure').requestFullscreen();}catch{toast('Vollbild ist in diesem Browser nicht verfügbar.');}if(controls.active)canvas.focus({preventScroll:true});});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Vollbild beenden':'Vollbild');});
$('explore').addEventListener('click',()=>$('win-dialog').close());
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(started&&!anyDialog())openPause();controls.clear();save();sound.suspend();}else{last=performance.now();clock.reset();}});
window.addEventListener('pagehide',()=>{if(started)save();sound.suspend();});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();pauseGame();$('error').hidden=false;$('error-text').textContent='Die Grafikverbindung wurde unterbrochen. Lade die Seite neu, um weiterzuspielen.';});
new ResizeObserver(()=>view.resize()).observe($('adventure'));
coarse.addEventListener('change',()=>{if(started)$('touch-controls').hidden=!coarse.matches;view.applyQuality();});

function events(){
  for(const e of game.drainEvents()) {
    view.event(e);sound.event(e);
    if(e.type==='save')requestSave();
    else if(e.type==='message')toast(e.text);
    else if(e.type==='dialogue') {pauseGame();$('speaker').textContent=e.speaker;$('story-text').textContent=e.text;$('story-dialog').showModal();}
    else if(e.type==='hurt'){clearTimeout(damageTimer);$('damage-flash').classList.add('visible');damageTimer=setTimeout(()=>$('damage-flash').classList.remove('visible'),180);}
    else if(e.type==='area'){clearTimeout(areaTimer);$('area-title').textContent=e.name;$('area-title').classList.add('visible');areaTimer=setTimeout(()=>$('area-title').classList.remove('visible'),2800);}
    else if(e.type==='respawn'){view.target.set(game.player.x,game.player.y+1,game.player.z);clock.reset();}
    else if(e.type==='win') {
      winning=true;pauseGame();$('win-time').textContent=formatTime(game.elapsed);$('win-seeds').textContent=game.seeds.size+' / 24';
      sound.playing=true;view.beginCinematic('finale');$('cinema-title').innerHTML='MOOSLICHT<small>Dein Garten lebt.</small>';$('cinema').hidden=false;
      if(settings.motion)view.skipCinematic();
    }
  }
}
function formatTime(t){const s=Math.floor(t);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function updateUI(){
  const p=game.player;$('hearts').innerHTML=Array.from({length:5},(_,i)=>`<span${i>=p.health?' class="empty"':''} aria-hidden="true">♥</span>`).join('');
  $('hearts').setAttribute('aria-label',p.health+' von 5 Herzen');$('seeds').textContent=game.seeds.size;
  $('light-count').textContent=game.lights+' / 3';$('sky-state').textContent=skyStage(view.world.sky.state.phase??0);
  for(const id of ['garden','ruins','wind'])$('quest-'+id).classList.toggle('done',game.quests[id]);
  $('objective').textContent=game.finished?'Der Herzbaum lebt':game.lights===3?'Kehre zum Herzbaum zurück':'Erwecke die drei Lichter';
  const hints={home:'Hütte: Echolicht · Steinkreis: Steinlicht · Palme: Blattlicht.',garden:game.quests.garden?'Die Klangblüten singen wieder.':`Spiele Gelb → Blau → Rosa. (${game.flowerStep}/3)`,
    ruins:game.quests.ruins?'Die Steinwächter haben Ruhe gefunden.':game.guards.some(g=>g.health>0)?`Wächter: ${game.guards.filter(g=>g.health<=0).length}/3 · J: Schwert · Shift: Ausweichen.`:'Berühre den violetten Schrein mit E.',
    wind:game.quests.wind?'Der Wind trägt dein Licht zum Herzbaum.':`Sammle 3 blaue Windfunken (${game.wind.size}/3). Springe zum höheren Funken!`};
  $('area-hint').textContent=game.finished?`Noch ${24-game.seeds.size} Glühlichter verstecken sich im Garten.`:game.lights===3?'Berühre den grossen Baum am weissen Steinkreis mit E.':hints[game.area]||hints.home;
  const item=game.interaction();$('interact-prompt').hidden=!started||!game.running||!item;
  if(item)$('interact-label').textContent=item.label;
  $('touch-interact').style.opacity=item?'1':'.55';drawMap();
}

// A small north-up map gives exploration a clear orientation even after orbiting.
const map=document.createElement('canvas');map.hidden=true;map.width=280;map.height=264;map.className='island-map';map.setAttribute('aria-label','Inselkarte: Garten mit Hütte, Palme und Herzbaum; vier schwebende Nebeninseln.');$('hud').appendChild(map);
const mapContext=map.getContext('2d');
function drawMap(){
  if(map.hidden)return;
  const c=mapContext;if(!c)return;const sx=x=>mapPoint(x,0).x,sz=z=>mapPoint(0,z).y;
  c.clearRect(0,0,280,264);c.fillStyle='#173d35d9';c.beginPath();c.roundRect(2,2,276,260,24);c.fill();
  const outline=points=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(sx(p.x),sz(p.z)):c.moveTo(sx(p.x),sz(p.z)));c.closePath();c.fill();c.stroke();};
  c.fillStyle='#89a97199';c.strokeStyle='#c7d6a177';c.lineWidth=1;outline(MAP_DATA.garden);
  for(const island of MAP_DATA.islands)outline(island.outline);
  c.setLineDash([2,3]);c.strokeStyle='#c9d7bb';for(const r of MAP_DATA.routes){c.beginPath();c.moveTo(sx(r.from[0]),sz(r.from[1]));c.lineTo(sx(r.to[0]),sz(r.to[1]));c.stroke();}c.setLineDash([]);
  c.fillStyle='#f0e6c6aa';c.fillRect(sx(-7),sz(-48),20*2.65,15*1.83);
  c.lineWidth=3;c.strokeStyle='#d2c398';c.beginPath();c.moveTo(sx(-12),sz(12));c.lineTo(sx(-12),sz(-26));c.lineTo(sx(0),sz(-32));c.stroke();
  c.fillStyle='#cbe5a8';for(const [x,z,r] of [[5,1,9],[TREE.x,TREE.z,8]]){c.beginPath();c.arc(sx(x),sz(z),r,0,Math.PI*2);c.fill();}
  c.font='17px Trebuchet MS';c.textAlign='center';c.fillStyle='#fff1ce';c.fillText('N',140,22);
  for(const s of SHRINES){c.fillStyle=game.quests[s.id]?s.color:'#ccd5b9';c.save();c.translate(sx(s.x),sz(s.z));c.rotate(Math.PI/4);c.fillRect(-4,-4,8,8);c.restore();}
  const p=game.player;c.save();c.translate(sx(p.x),sz(p.z));c.rotate(-p.facing);c.fillStyle='#ffe4a1';c.beginPath();c.moveTo(0,9);c.lineTo(-6,-6);c.lineTo(0,-3);c.lineTo(6,-6);c.closePath();c.fill();c.restore();
}
function toggleMap(){if(!started)return;map.hidden=!map.hidden;document.body.classList.toggle('show-hints',!map.hidden);$('map-toggle').setAttribute('aria-pressed',String(!map.hidden));}
function toggleOverview(){if(!started||view.cinematic)return;view.overview=!view.overview;$('overview').setAttribute('aria-pressed',String(view.overview));}
$('map-toggle').addEventListener('click',()=>{toggleMap();canvas.focus();});
$('overview').addEventListener('click',()=>{toggleOverview();canvas.focus();});
$('skip-intro').addEventListener('click',()=>view.skipCinematic());
window.addEventListener('keydown',e=>{if(!started||anyDialog()||e.repeat)return;if(e.code==='KeyM')toggleMap();if(e.code==='KeyV')toggleOverview();if(e.code==='F3'){e.preventDefault();$('performance').hidden=!$('performance').hidden;}});
updateUI();
function frame(now){
  requestAnimationFrame(frame);
  const rawDelta=(now-last)/1000,delta=Math.min(rawDelta,.1);last=now;if(document.hidden)return;
  if(game.running)clock.advance(delta,dt=>{game.update(controls.consume(),dt);});
  events();sound.area=game.area;sound.lights=game.lights;sound.finished=game.finished;sound.night=view.world.sky.night;sound.finale=winning?view.cineTime:null;sound.falling=game.fallTimer>0;sound.tick();view.render(game,rawDelta,!started);fallVeil.style.opacity=fallOpacity(game);
  if(arriving&&!view.cinematic){arriving=false;$('cinema').hidden=true;resumeGame();}
  if(winning&&!view.cinematic){winning=false;sound.playing=false;$('cinema').hidden=true;$('win-dialog').showModal();}
  if(!$('performance').hidden)$('performance').textContent=`${view.fps} FPS · ${view.renderer.info.render.calls} Draw Calls · ${view.renderer.info.render.triangles.toLocaleString()} Dreiecke`;

  uiTime+=delta;if(uiTime>.09){uiTime=0;updateUI();}
  if(savePending&&now>=saveDeadline)save();
}
requestAnimationFrame(frame);
