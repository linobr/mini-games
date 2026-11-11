import { setupEvolution } from './evolution-ui.js';
import { buildingAt } from './evolution.js';
import { loadGarden, acquireSaveLock, hasSaveLock, SAVE_KEY } from './storage.js';
import { loadProfile } from '../nexus-model.js';
import './style.css';
import {TYPES,ZONES,PROJECTS,RECIPES,GOODS,NAMES,MILESTONES,fresh,restore,hit,sell,buy,count,value,capacity,toolCost,bagCost,workerCost,workshopCost,deposit,sellStock,stockValue,craft,tick,order,fulfill,claim,level,findPath,findHarvestRoute} from './engine.js';
import {GardenWorld} from './world.js';import {CanvasGardenWorld} from './canvas-world.js';import {GardenAudio} from './audio.js';
const exclusive = await acquireSaveLock();
if (!exclusive) { document.getElementById('loading').textContent = 'Berggarten ist bereits in einem anderen Tab geöffnet oder dein Browser unterstützt keine sichere Tab-Sperre. Schliesse den anderen Tab und lade neu.'; }
if (exclusive) {
const $=id=>document.getElementById(id),KEY=SAVE_KEY,canvas=$('game'),audio=new GardenAudio(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let storage;try{storage=localStorage;}catch{}const loaded=loadGarden(storage),raw=loaded.raw,state=loaded.state;let writable=loaded.writable;const elapsed=(Date.now()-state.lastSeen)/1000,offline=tick(state,elapsed);audio.muted=loadProfile(storage).muted;$('sound').setAttribute('aria-pressed',String(!audio.muted));$('sound').textContent=audio.muted?'♪':'♫';
let world,target=null,path=[],hover=null,auto=false,held=false,last=0,lastHit=0,clock=0,streak=0,lastBreak=0,toastTimer,saveTimer,uiClock=0,lastWall=Date.now(),floating=[],blockedTip=0,nextAutoSearch=0;
const gatherButtons = [...document.querySelectorAll('[data-gather]')];
const crystalButton = gatherButtons.find(b => b.dataset.gather === 'crystal');
const player={x:4,y:7,moving:false,facing:0},keys=new Set();
function toast(t){$('toast').textContent=t;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
function save(){if(!hasSaveLock())return;state.lastSeen=Date.now();try{if(!writable)throw Error('read only');storage.setItem(KEY,JSON.stringify(state));$('save-status').textContent='Automatisch auf diesem Gerät gespeichert';}catch{$('save-status').textContent='Speichern nicht verfügbar – nur diese Sitzung';}}
function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(save,250);}
function label(x,y,text,color){const el=document.createElement('span');el.className='drop-label';el.textContent=text;if(color)el.style.color=color;$('labels').append(el);floating.push({el,x,y,life:1.5});}
function button(id,cost,max,text){const el=$(id);el.textContent=max?'Voll ausgebaut ✓':`${text} · ${cost} ●`;el.disabled=max||state.coins<cost;}
const evolution=setupEvolution({state,toast,changed:rebuild=>{target=null;path=[];if(rebuild){if(buildingAt(state,player.x,player.y)){player.x=4;player.y=7;}world?.rebuild();}updateUI();save();},backup:()=>{try{storage.setItem('berggarten-before-import',writable?JSON.stringify(state):(storage.getItem(KEY)||JSON.stringify(state)));return true;}catch{return false;}},replace:next=>{Object.assign(state,next);writable=true;player.x=4;player.y=7;target=null;path=[];world?.rebuild();updateUI();save();}});
const icons={kit:'⌂',bush:'🌿',rock:'◆',crystal:'✦',plank:'▤',brick:'▦',gem:'◇'};
$('inventory').innerHTML=GOODS.map(k=>`<div class="${TYPES[k]?'raw':''}">${icons[k]} ${NAMES[k]} <b id="stock-${k}">0</b></div>`).join('');
$('recipes').innerHTML=Object.entries(RECIPES).filter(([k])=>k!=='kit').map(([k,r])=>`<button id="craft-${k}">${icons[k]} ${r.name}<small>3 ${NAMES[Object.keys(r.input)[0]]} → ${r.price} ●</small></button>`).join('');
function updateUI(saveIt=false){$('coins').textContent=state.coins.toLocaleString('de-CH');$('bag-count').textContent=`${count(state)} / ${capacity(state)}`;$('bag-fill').style.width=`${count(state)/capacity(state)*100}%`;$('bag-fill').style.background=count(state)>=capacity(state)?'#c7985c':'#7d9d54';const lvl=level(state),low=(lvl-1)**2*20,high=lvl**2*20;$('level').textContent=`LV ${lvl}`;$('xp-fill').style.width=`${(state.xp-low)/(high-low)*100}%`;
$('sell-value').textContent=`+${value(state)} ●`;$('sell').disabled=!count(state);$('deposit').disabled=!count(state);$('deposit-count').textContent=`${count(state)} Stück`;$('tool-label').textContent=`${state.tool>=5?'Kristallhacke':state.tool>=3?'Stahlhacke':'Gartenhacke'} · Stufe ${state.tool}`;$('tool-desc').textContent=`${state.tool} → ${Math.min(8,state.tool+1)} Schaden · schnellere Schläge`;$('bag-desc').textContent=`${capacity(state)} → ${capacity(state)+15} Plätze für deine Tour`;
button('buy-tool',toolCost(state),state.tool>=8,'Aufwerten');button('buy-bag',bagCost(state),state.bag>=6,'Vergrössern');button('buy-zone',ZONES[state.zones]?.cost,state.zones>=ZONES.length,'Erschliessen');button('buy-project',PROJECTS[state.projects]?.cost,state.projects>=3,'Restaurieren');button('buy-worker',workerCost(state),state.workers>=3,'Einstellen');button('buy-workshop',workshopCost(state),state.workshop>=3,state.workshop?'Ausbauen':'Bauen');
$('workers').textContent=`${state.workers} / 3`;$('worker-desc').textContent=state.workers?`${state.workers} Ressourcen / 10 Sek. direkt ins Lager`:'Sammelt automatisch Holz, später Stein & Kristall';$('workshop-desc').textContent=state.workshop?`Stufe ${state.workshop} · ${state.workshop}× Produktionstempo`:'Rohstoffe rein. Wertvollere Produkte raus.';
$('next-zone').textContent=ZONES[state.zones]?.name||'Dein ganzes Tal';$('zone-info').textContent=['','Neue Felsen und Stein für deine Helfer.','Kristalle für Schmuck und deinen dritten Helfer.','Waldtal: Holzvorräte und ein weiterer Bauplatz.','Schneegipfel: Kristalle und die Alpenwerkstatt.','Alle fünf Regionen erschlossen.'][state.zones];$('next-project').textContent=PROJECTS[state.projects]?.name||'Ein blühender Alpengarten';$('project-info').textContent=['Blüten und Bänke · +2 ● alle 15 Sek.','Frisches Wasser · weitere +2 ● / 15 Sek.','Dein Ruheplatz · weitere +2 ● / 15 Sek.','Alle Gartenprojekte sind restauriert.'][state.projects];
for(const k of GOODS)$('stock-'+k).textContent=state.stock[k];$('sell-stock').disabled=!stockValue(state);$('sell-stock').textContent=`Alles verkaufen · ${stockValue(state)} ●`;
for(const[k,r]of Object.entries(RECIPES).filter(([k])=>k!=='kit'))$('craft-'+k).disabled=!state.workshop||!!state.job||Object.entries(r.input).some(([k,n])=>state.stock[k]<n)||k==='gem'&&state.zones<3;
$('job-status').textContent=state.job?`${RECIPES[state.job.kind].name} · ${Math.ceil(state.job.remaining)} s`:state.workshop?'Bereit':'Manufaktur bauen';$('job-fill').style.width=state.job?`${(1-state.job.remaining/state.job.total)*100}%`:'0%';
const o=order(state);$('order-title').textContent=o.title;$('order-desc').textContent=`${state.stock[o.kind]} / ${o.amount} ${NAMES[o.kind]} im Lager`;$('order-number').textContent=`#${state.orders+1}`;$('fulfill').textContent=`Liefern · +${o.reward} ● · +20 XP`;$('fulfill').disabled=state.stock[o.kind]<o.amount;
const m=MILESTONES.find(m=>!state.claimed.includes(m.id));if(m){$('quest-title').textContent=`${m.title} · ${Math.min(state[m.stat],m.goal)} / ${m.goal}`;$('quest-fill').style.width=`${Math.min(1,state[m.stat]/m.goal)*100}%`;$('claim').textContent=state[m.stat]>=m.goal?`+${m.reward} ● abholen`:`Belohnung: ${m.reward} ●`;$('claim').disabled=state[m.stat]<m.goal;}else{$('quest-title').textContent='Alle Meilensteine erreicht';$('quest-fill').style.width='100%';$('claim').textContent='Talmeister ✓';$('claim').disabled=true;}
$('business-status').textContent=state.workers||state.projects?`${state.workers} Helfer · ${state.projects*8} ● Besuchereinnahmen / Min.`:`${state.zones} / ${ZONES.length} Regionen erschlossen`;
crystalButton.disabled = state.zones < 3;
$('crystal-availability').textContent = crystalButton.disabled ? 'Ab Kristallhöhen' : '15 Münzen';
updateGatherStatus();
evolution();if(saveIt)queueSave();}
function change(kind){audio.start();if(!buy(state,kind))return;audio.chime();const messages={tool:'Ein kräftigerer Schlag. Deine Hacke wurde aufgewertet.',bag:'Mehr Platz für deine nächste Tour.',worker:'Willkommen im Team! Dein Helfer liefert direkt ins Lager.',workshop:'Die Manufaktur ist bereit. Lagere Rohstoffe ein und starte die Produktion.',zone:'Ein neues Gebiet ist offen. Wege frei machen und weiterbauen!',project:'Dein Garten lockt die ersten Besucher an.'};toast(messages[kind]);if(['zone','project','worker','workshop'].includes(kind))world?.rebuild();updateUI(true);}
for(const k of['tool','bag','worker','workshop','zone','project'])$('buy-'+k).onclick=()=>change(k);
function doSell(){audio.start();const v=sell(state);if(v){audio.chime();toast(`Beute verkauft: +${v} Münzen`);label(player.x,player.y,`+${v} ●`,'#ffe3a0');updateUI(true);}}
function doDeposit(){audio.start();const n=deposit(state);if(n){audio.tone(540,.12);toast(`${n} Rohstoffe eingelagert. Bereit für Produktion und Aufträge.`);updateUI(true);}}
$('sell').onclick=doSell;$('deposit').onclick=doDeposit;$('sell-stock').onclick=()=>{audio.start();const v=sellStock(state);if(v){audio.chime();toast(`Lagerverkauf: +${v} Münzen`);updateUI(true);}};
for(const k of Object.keys(RECIPES).filter(k=>k!=='kit'))$('craft-'+k).onclick=()=>{audio.start();if(craft(state,k)){audio.tone(340,.15,'triangle');updateUI(true);}};
$('fulfill').onclick=()=>{audio.start();const v=fulfill(state);if(v){audio.chime();toast(`Auftrag geliefert: +${v} Münzen, +20 XP`);updateUI(true);}};
$('claim').onclick=()=>{const m=MILESTONES.find(m=>!state.claimed.includes(m.id));if(m){const v=claim(state,m.id);if(v){audio.start();audio.chime();toast(`${m.title}: +${v} Münzen!`);updateUI(true);}}};
const tabs = ['work', 'business', 'world', 'storage'];
function selectTab(selected) {
  for (const name of tabs) {
    const active = name === selected;
    $('tab-' + name).setAttribute('aria-selected', String(active));
    $('tab-' + name).tabIndex = active ? 0 : -1;
    $('panel-' + name).hidden = !active;
  }
}
for (const [index, name] of tabs.entries()) {
  const tab = $('tab-' + name);
  tab.onclick = () => selectTab(name);
  tab.onkeydown = event => {
    const destinations = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    const selected = tabs[destinations[event.key]];
    selectTab(selected);
    $('tab-' + selected).focus();
  };
}
$('open-warehouse').onclick = () => {
  selectTab('storage');
  const tab = $('tab-storage');
  tab.focus({ preventScroll: true });
  const bounds = tab.getBoundingClientRect();
  if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
    $('management').scrollIntoView({ block: 'start' });
  }
};
const dialog = $('help-dialog');
$('help').onclick = () => {
  clearInput();
  dialog.showModal();
};
$('close-help').onclick = $('start-playing').onclick = () => {
  dialog.close();
  audio.start();
  canvas.focus({ preventScroll: true });
};
$('sound').onclick=()=>{audio.start();audio.muted=!audio.muted;try{const p=loadProfile(storage);p.muted=audio.muted;storage.setItem('mini-games:nexus-profile:v1',JSON.stringify(p));}catch{}$('sound').setAttribute('aria-pressed',String(!audio.muted));$('sound').textContent=audio.muted?'♪':'♫';toast(audio.muted?'Sound ausgeschaltet':'Sound eingeschaltet');};
$('reset').onclick=()=>{if(confirm('Alle Ressourcen, Helfer, Upgrades und Gartenprojekte löschen und neu beginnen?')){Object.assign(state,fresh());writable=true;player.x=4;player.y=7;target=null;path=[];world?.rebuild();updateUI();save();toast('Ein neues Tal. Ein neuer Anfang.');}};
function updateGatherStatus() {
  let message = 'Wähle einen Rohstoff oder tippe auf die Karte.';
  if (count(state) >= capacity(state)) {
    message = 'Rucksack voll. Lagere Rohstoffe ein oder verkaufe sie.';
  } else if (target) {
    message = `${path.length ? 'Unterwegs' : 'Abbau'}: ${NAMES[target.type]}`;
  } else if (auto) {
    message = 'Auto sucht erreichbare Rohstoffe.';
  } else if (path.length) {
    message = 'Unterwegs zum gewählten Punkt.';
  }
  const status = $('gather-status');
  if (status.textContent !== message) status.textContent = message;
  $('stop-gathering').disabled = !auto && !target && !path.length;
}
function setAuto(enabled) {
  auto = enabled;
  nextAutoSearch = 0;
  $('auto').setAttribute('aria-pressed', String(auto));
  $('auto').textContent = auto ? '⛏ Auto an' : '⛏ Auto aus';
}
function stopGathering() {
  clearInput();
  target = null;
  path = [];
  setAuto(false);
  updateGatherStatus();
}
$('stop-gathering').onclick = stopGathering;
$('auto').onclick = () => {
  audio.start();
  if (auto) stopGathering();
  else setAuto(true);
  updateGatherStatus();
};
for (const button of gatherButtons) {
  button.onclick = () => {
    if (!world || !hasBagSpace()) return;
    audio.start();
    const type = button.dataset.gather;
    const route = findHarvestRoute(state, player, type);
    if (!route) {
      toast(`Gerade kein ${NAMES[type]} erreichbar. Räume den Weg frei oder warte, bis Rohstoffe zurückkehren.`);
      return;
    }
    target = route.node;
    path = route.path;
    updateGatherStatus();
  };
}
$('rotate-left').onclick=()=>world&&(world.angle-=Math.PI/4);$('rotate-right').onclick=()=>world&&(world.angle+=Math.PI/4);$('zoom-in').onclick=()=>world&&(world.zoom=Math.min(1.9,world.zoom+.15));$('zoom-out').onclick=()=>world&&(world.zoom=Math.max(.7,world.zoom-.15));
function hasBagSpace() {
  if (count(state) < capacity(state)) return true;
  toast('Rucksack voll. Lagere Rohstoffe ein oder verkaufe sie.');
  return false;
}
function go(p) {
  if (!p) return;
  if (p.node?.zone >= state.zones) {
    toast(`${ZONES[p.node.zone].name} im Tab Tal erschliessen.`);
    return;
  }
  if (p.node && !hasBagSpace()) return;
  const dest = {
    x: Math.max(0, Math.min(state.zones * 6 - 1, p.x)),
    y: Math.max(0, Math.min(14, p.y)),
  };
  const route = findPath(state, player, dest, p.node?.id ?? null);
  if (!route) {
    toast('Noch kein freier Weg. Baue zuerst die Ressourcen am Rand ab.');
    return;
  }
  target = p.node || null;
  path = route;
  updateGatherStatus();
}
canvas.onpointerdown=e=>{if(!world)return;e.preventDefault();audio.start();canvas.focus();canvas.setPointerCapture(e.pointerId);go(world.pick(e.clientX,e.clientY));};canvas.onpointermove=e=>{if(world)hover=world.pick(e.clientX,e.clientY)?.node||null;};canvas.onpointerleave=()=>hover=null;
const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright']);
function clearInput() {
  keys.clear();
  held = false;
}
canvas.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (movementKeys.has(key)) {
    event.preventDefault();
    keys.add(key);
  } else if (key === ' ') {
    event.preventDefault();
    audio.start();
    held = true;
  } else if (!event.repeat) {
    if (key === 'r') doDeposit();
    if (key === 'f') doSell();
    if (key === 'escape') stopGathering();
  }
});
canvas.addEventListener('keyup', event => {
  keys.delete(event.key.toLowerCase());
  if (event.key === ' ') held = false;
});
canvas.addEventListener('blur', clearInput);
window.addEventListener('blur', clearInput);
for (const button of document.querySelectorAll('[data-dir]')) {
  const key = { left: 'arrowleft', up: 'arrowup', right: 'arrowright', down: 'arrowdown' }[button.dataset.dir];
  button.onpointerdown = event => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    keys.add(key);
  };
  button.onlostpointercapture = () => keys.delete(key);
}
$('chop').onpointerdown = event => {
  event.preventDefault();
  audio.start();
  $('chop').setPointerCapture(event.pointerId);
  held = true;
};
$('chop').onlostpointercapture = () => { held = false; };
function chop(n){const r=hit(state,n.id);if(!r.ok){if(r.reason==='full'){if(clock-blockedTip>2500){toast('Rucksack voll. Verkaufen oder einlagern.');blockedTip=clock;}target=null;path=[];held=false;}return;}
world.hit(n,r.broken);player.facing=Math.atan2(n.x-player.x,n.y-player.y);world.player.rotation.y=player.facing;audio.hit(n.type,r.broken,streak);if(r.broken){streak=clock-lastBreak<4500?streak+1:1;lastBreak=clock;label(n.x,n.y,`+1 ${NAMES[n.type]}`);target=null;path=[];updateUI(true);}}
function nearby(){return state.nodes.filter(n=>n.zone<state.zones&&n.ready<=Date.now()&&Math.hypot(n.x-player.x,n.y-player.y)<=1.15).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];}
function nextAuto() {
  const route = findHarvestRoute(state, player);
  if (route) {
    target = route.node;
    path = route.path;
  }
}
function free(x,y){return x>=0&&x<=state.zones*6-1&&y>=0&&y<=14&&!buildingAt(state,x,y)&&!state.nodes.some(n=>n.zone<state.zones&&n.ready<=Date.now()&&Math.hypot(n.x-x,n.y-y)<.61);}
function movePlayer(t, dt) {
  player.moving = false;
  if (dialog.open) return;

  const dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  const dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
  if (dx || dy) {
    target = null;
    path = [];
    const length = Math.hypot(dx, dy);
    const angle = world.angle;
    const vx = (dx * Math.cos(angle) + dy * Math.sin(angle)) / length;
    const vy = (-dx * Math.sin(angle) + dy * Math.cos(angle)) / length;
    const step = dt * 3.5;
    const x = player.x + vx * step;
    const y = player.y + vy * step;
    if (free(x, player.y)) player.x = x;
    if (free(player.x, y)) player.y = y;
    player.facing = Math.atan2(vx, vy);
    player.moving = true;
    return;
  }

  if (path.length) {
    const point = path[0];
    const distance = Math.hypot(point.x - player.x, point.y - player.y);
    if (!free(point.x, point.y)) {
      const route = target && findPath(state, player, target, target.id);
      path = route || [];
      if (!route) target = null;
    } else if (distance < .08) {
      player.x = point.x;
      player.y = point.y;
      path.shift();
    } else {
      const step = Math.min(distance, dt * 3.5);
      player.facing = Math.atan2(point.x - player.x, point.y - player.y);
      player.x += (point.x - player.x) / distance * step;
      player.y += (point.y - player.y) / distance * step;
      player.moving = true;
    }
    return;
  }

  const readyToHit = t - lastHit > Math.max(150, 430 - state.tool * 25);
  if (target) {
    if (target.ready > Date.now()) target = null;
    else if (readyToHit) {
      lastHit = t;
      chop(target);
    }
  } else if (held && readyToHit) {
    const node = nearby();
    if (node) {
      lastHit = t;
      chop(node);
    }
  } else if (auto && count(state) < capacity(state) && t >= nextAutoSearch) {
    nextAutoSearch = t + 350;
    nextAuto();
  }
}
function frame(t){clock=t;const dt=Math.min((t-last)/1000,.04)||.016;last=t;movePlayer(t,dt);
const wall=Date.now(),seconds=(wall-lastWall)/1000;lastWall=wall;{const r=tick(state,seconds);if(r.crafted){audio.tone(784,.22);toast(`${NAMES[r.crafted]} fertig – im Lager bereit!`);}if(r.produced||r.passive||r.crafted||r.buildings)queueSave();}
uiClock+=dt;if(uiClock>.3){updateUI();uiClock=0;}$('combo').textContent=streak>1&&t-lastBreak<3500?`${streak} × Sauber!`:'';
const zone=Math.min(state.zones-1,Math.floor(player.x/6));$('area').textContent=ZONES[zone].name;$('area-sub').textContent=['Dein erster kleiner Betrieb','Stein für den nächsten grossen Schritt','Hier funkelt die Zukunft','Holz für deine Produktionsketten','Alpenbausätze für neue Handelsaufträge'][zone];world.render(dt,player,target,hover,reduced);
for(const f of floating){f.life-=dt;const p=world.screen(f.x,f.y,1.6+(1.5-f.life)*.6);f.el.style.left=`${p.x}px`;f.el.style.top=`${p.y}px`;f.el.style.transform='translate(-50%,-100%)';f.el.style.opacity=String(Math.min(1,f.life*2));}floating=floating.filter(f=>{if(f.life<=0){f.el.remove();return false;}return true;});requestAnimationFrame(frame);}
window.addEventListener('berggarten-before-unlock',save);window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden){save();clearInput();}});
updateUI();try{try{world=new GardenWorld(canvas,state);}catch(error){console.warn('WebGL nicht verfügbar, Canvas-Ansicht aktiviert.');world=new CanvasGardenWorld(canvas,state);} new ResizeObserver(()=>world.resize()).observe(canvas);$('loading').hidden=true;$('loading').style.display='none';requestAnimationFrame(frame);if(offline.produced||offline.passive||offline.crafted||offline.buildings){toast(`Willkommen zurück: ${offline.produced} Rohstoffe und ${offline.passive} Münzen gesammelt.`);queueSave();}else if(!raw)dialog.showModal();}catch(error){$('loading').textContent='Dein Browser konnte die Gartenwelt nicht starten. Bitte verwende einen aktuellen Browser.';console.error('Berggarten 3D konnte nicht starten',error);}

if(loaded.warning){$('save-status').textContent=loaded.warning;toast(loaded.warning);}else save();
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
}
