import { Adventure, FixedClock, readSave, writeSave } from './game.js';
import { WorldView } from './renderer.js';
import { Controls } from './input.js';
import { Soundscape } from './audio.js';
import { ISLANDS, SHRINES, BRIDGES } from './world.js';

const $=id=>document.getElementById(id),canvas=$('world');
let storage;try{storage=window.localStorage;}catch{storage=null;}
let preferences={};try{preferences=JSON.parse(storage?.getItem('minigames.mooslicht.settings')||'{}')||{};}catch{}
const settings={quality:['auto','low','high'].includes(preferences.quality)?preferences.quality:'auto',
  volume:Number.isFinite(preferences.volume)?Math.max(0,Math.min(1,preferences.volume)):.45,
  sound:preferences.sound!==false,motion:typeof preferences.motion==='boolean'?preferences.motion:matchMedia('(prefers-reduced-motion:reduce)').matches};
let game=new Adventure(readSave(storage)),view;
try{view=new WorldView(canvas,settings);}catch(error){$('error').hidden=false;$('intro').hidden=true;throw error;}
const clock=new FixedClock(),sound=new Soundscape(settings.volume,settings.sound);
let started=false,last=performance.now(),uiTime=0,savedOnce=false,savePending=false,saveDeadline=0;
let toastTimer,areaTimer,damageTimer,winTimer,restartTimer,restarting=false,winning=false;
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
  if(!started||winning||anyDialog()||document.hidden||!$('error').hidden)return;
  game.start();controls.setActive(true);clock.reset();last=performance.now();canvas.focus({preventScroll:true});
  sound.unlock();sound.playing=true;
}
function openPause(){if(!started||winning||anyDialog())return;pauseGame();$('pause-dialog').showModal();}
function start(){
  started=true;document.body.dataset.screen='play';$('intro').hidden=true;$('hud').hidden=false;$('controls-hint').hidden=false;$('touch-controls').hidden=!coarse.matches;
  sound.unlock();resumeGame();toast(game.lights===3?'Kehre zum Herzbaum zurück oder erkunde die Insel.':'WASD: bewegen · Space: springen · E: entdecken. Sprich mit Lumi!');
  $('area-title').textContent='Das schlafende Herz';$('area-title').classList.add('visible');areaTimer=setTimeout(()=>$('area-title').classList.remove('visible'),3200);
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
  game=new Adventure();view.resetCamera();view.target.set(0,1,5.2);save();$('pause-dialog').close();updateUI();toast('Ein neues Abenteuer beginnt.');
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
      winTimer=setTimeout(()=>{winning=false;$('win-dialog').showModal();},1500);
    }
  }
}
function formatTime(t){const s=Math.floor(t);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function updateUI(){
  const p=game.player;$('hearts').innerHTML=Array.from({length:5},(_,i)=>`<span${i>=p.health?' class="empty"':''} aria-hidden="true">♥</span>`).join('');
  $('hearts').setAttribute('aria-label',p.health+' von 5 Herzen');$('seeds').textContent=game.seeds.size;
  $('light-count').textContent=game.lights+' / 3';
  for(const id of ['garden','ruins','wind'])$('quest-'+id).classList.toggle('done',game.quests[id]);
  $('objective').textContent=game.finished?'Der Herzbaum lebt':game.lights===3?'Kehre zum Herzbaum zurück':'Erwecke die drei Lichter';
  const hints={home:'Westen: Klanggarten · Osten: Ruinen · Norden: Windschrein.',garden:game.quests.garden?'Die Klangblüten singen wieder.':`Spiele Gelb → Blau → Rosa. (${game.flowerStep}/3)`,
    ruins:game.quests.ruins?'Die Steinwächter haben Ruhe gefunden.':game.guards.some(g=>g.health>0)?`Wächter: ${game.guards.filter(g=>g.health<=0).length}/3 · J: Schwert · Shift: Ausweichen.`:'Berühre den violetten Schrein mit E.',
    wind:game.quests.wind?'Der Wind trägt dein Licht zum Herzbaum.':`Sammle 3 blaue Windfunken (${game.wind.size}/3). Springe zum höheren Funken!`};
  $('area-hint').textContent=game.finished?`Noch ${24-game.seeds.size} Glühlichter verstecken sich auf der Insel.`:game.lights===3?'Berühre den grossen Baum auf der mittleren Insel mit E.':hints[game.area]||hints.home;
  const item=game.interaction();$('interact-prompt').hidden=!started||!game.running||!item;
  if(item)$('interact-label').textContent=item.label;
  $('touch-interact').style.opacity=item?'1':'.55';drawMap();
}

// A small north-up map gives exploration a clear orientation even after orbiting.
const map=document.createElement('canvas');map.width=280;map.height=264;map.className='island-map';map.setAttribute('aria-label','Inselkarte: Klang im Westen, Wächter im Osten, Wind im Norden.');$('hud').appendChild(map);
const mapContext=map.getContext('2d');
function drawMap(){
  const c=mapContext;if(!c)return;const sx=x=>140+x*3.7,sz=z=>201+z*4;
  c.clearRect(0,0,280,264);c.fillStyle='#173d35a0';c.beginPath();c.roundRect(2,2,276,260,24);c.fill();
  c.lineWidth=7;c.strokeStyle='#d2c39880';for(const b of BRIDGES){c.beginPath();c.moveTo(sx(b.ax),sz(b.az));c.lineTo(sx(b.bx),sz(b.bz));c.stroke();}
  c.setLineDash([5,6]);c.beginPath();c.moveTo(sx(0),sz(-9));c.lineTo(sx(0),sz(-19));c.stroke();c.setLineDash([]);
  for(const i of ISLANDS){c.fillStyle='#91ac7777';c.beginPath();c.ellipse(sx(i.x),sz(i.z),i.r*3.1,i.r*3.25,0,0,Math.PI*2);c.fill();}
  c.font='24px Trebuchet MS';c.textAlign='center';c.fillStyle='#fff1ce';c.fillText('N',140,34);
  for(const s of SHRINES){c.fillStyle=game.quests[s.id]?s.color:'#ccd5b9';c.save();c.translate(sx(s.x),sz(s.z));c.rotate(Math.PI/4);c.fillRect(-5,-5,10,10);c.restore();}
  const p=game.player;c.save();c.translate(sx(p.x),sz(p.z));c.rotate(-p.facing);c.fillStyle='#ffe4a1';c.beginPath();c.moveTo(0,9);c.lineTo(-6,-6);c.lineTo(0,-3);c.lineTo(6,-6);c.closePath();c.fill();c.restore();
}
updateUI();
function frame(now){
  requestAnimationFrame(frame);
  const delta=Math.min((now-last)/1000,.1);last=now;if(document.hidden)return;
  if(game.running)clock.advance(delta,dt=>{game.update(controls.consume(),dt);});
  events();sound.tick();view.render(game,delta,!started);
  uiTime+=delta;if(uiTime>.09){uiTime=0;updateUI();}
  if(savePending&&now>=saveDeadline)save();
}
requestAnimationFrame(frame);
