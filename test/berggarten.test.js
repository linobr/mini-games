import {test} from 'node:test';import assert from 'node:assert/strict';
import { buildValley, tradeBlueprint, valleySite, collectValleySite, rollMarble } from '../src/berggarten/valley.js';
import { equipGear } from '../src/berggarten/equipment.js';
import {fresh,hit,sell,buy,count,capacity,restore,TYPES,TAL_FINDS,deposit,sendCable,craft,tick,fulfill,order,claim,sellStock,findPath,findHarvestRoute} from '../src/berggarten/engine.js';
test('harvest rewards once, bag full blocks damage, cooldown regrows',()=>{const s=fresh(),n=s.nodes.find(n=>n.type==='bush'&&n.zone===0);hit(s,n.id,1000);hit(s,n.id,1100);assert.equal(hit(s,n.id,1200).broken,true);assert.equal(count(s),1);assert.equal(hit(s,n.id,1300).ok,false);assert.equal(hit(s,n.id,40000).ok,true);s.inventory.bush=capacity(s);const hp=n.hp;assert.equal(hit(s,n.id,40001).reason,'full');assert.equal(n.hp,hp);assert.equal(sell(s),60);assert.equal(sell(s),0);});
test('purchases require money, respect caps and unlock regions',()=>{const s=fresh(),n=s.nodes.find(n=>n.zone===1);assert.equal(buy(s,'tool'),false);assert.equal(hit(s,n.id).ok,false);s.coins=1e6;assert.equal(buy(s,'zone'),true);assert.equal(hit(s,n.id).ok,true);s.tool=8;s.bag=6;s.zones=5;s.projects=3;s.workers=3;s.workshop=3;const c=s.coins;for(const k of ['tool','bag','zone','project','worker','workshop'])assert.equal(buy(s,k),false);assert.equal(s.coins,c);});
test('deposit transfers exact quantities, crafts consume inputs once and finish once',()=>{const s=fresh();s.inventory.bush=6;assert.equal(deposit(s),6);assert.equal(deposit(s),0);assert.equal(count(s),0);assert.equal(craft(s,'plank'),false);s.workshop=1;assert.equal(craft(s,'plank'),true);assert.equal(s.stock.bush,3);assert.equal(craft(s,'plank'),false);tick(s,4);assert.equal(s.stock.plank,0);assert.equal(tick(s,1).crafted,'plank');assert.equal(s.stock.plank,1);tick(s,10);assert.equal(s.stock.plank,1);assert.equal(sellStock(s),27);assert.equal(sellStock(s),0);});
test('workers provide zone appropriate stock, garden earns income, offline capped',()=>{const s=fresh();s.workers=3;s.zones=3;s.projects=2;const r=tick(s,10000);assert.equal(r.produced,90);assert.deepEqual([s.stock.bush,s.stock.rock,s.stock.crystal],[30,30,30]);assert.equal(r.passive,80);assert.equal(s.coins,80);});
test('worker intervals preserve fractions and do not create prehire production',()=>{const s=fresh();tick(s,100);s.workers=1;tick(s,9);assert.equal(s.stock.bush,0);tick(s,1);assert.equal(s.stock.bush,1);});
test('orders and milestones cannot be rewarded twice without requirements',()=>{const s=fresh();assert.equal(fulfill(s),false);const o=order(s);s.stock[o.kind]=o.amount;assert.equal(fulfill(s),35);assert.equal(s.orders,1);assert.equal(fulfill(s),false);s.broken=5;assert.equal(claim(s,'first'),20);assert.equal(claim(s,'first'),0);assert.equal(claim(s,'master'),0);});
test('v1 saves migrate preserving money, upgrades and garden',()=>{const old={version:1,coins:123,tool:4,bag:2,projects:1,zones:2,broken:12,inventory:{bush:5,rock:1,crystal:0},nodes:[]};const s=restore(JSON.stringify(old));assert.equal(s.version,3);assert.equal(s.coins,123);assert.equal(s.tool,4);assert.equal(s.xp,36);assert.equal(s.projects,1);assert.equal(s.workers,0);assert.equal(count(s),6);});
test('corrupt saves and malicious inventories are bounded',()=>{assert.equal(restore('bad').coins,0);assert.equal(restore('null').coins,0);const s=restore(JSON.stringify({version:2,tool:500,coins:-3,stock:{gem:1e15},inventory:{bush:1000,rock:1000},job:{kind:'unknown'},nodes:{},claimed:{}}));assert.equal(s.tool,8);assert.equal(s.coins,0);assert.equal(s.stock.gem,5000);assert.equal(count(s),capacity(s));assert.equal(s.job,null);});
test('navigation stays in open regions and reaches resource neighbours',()=>{const s=fresh(),n=s.nodes.find(n=>n.x===4&&n.y===5);const p=findPath(s,{x:4,y:7},n,n.id);assert.ok(p);assert.deepEqual(p.at(-1),{x:4,y:6});assert.equal(findPath(s,{x:4,y:7},{x:8,y:7}),null);for(const cell of p)assert.ok(cell.x<6);});
test('production save restoration continues unfinished jobs without duplicating inputs',()=>{const s=fresh();s.workshop=2;s.stock.bush=3;craft(s,'plank');tick(s,1);const r=restore(JSON.stringify(s));assert.equal(r.stock.bush,0);tick(r,1.5);assert.equal(r.stock.plank,1);assert.equal(r.job,null);});
test('a complete early economy is reachable without grinding dead ends',()=>{const s=fresh();for(let i=0;i<20;i++){const n=s.nodes.find(n=>n.zone===0);n.ready=0;n.hp=1;hit(s,n.id,i*1000);}assert.equal(count(s),20);sell(s);s.broken=20;claim(s,'first');assert.ok(s.coins>=35);assert.equal(buy(s,'tool'),true);s.coins=500;assert.equal(buy(s,'workshop'),true);assert.equal(buy(s,'worker'),true);tick(s,80);assert.equal(s.stock.bush,8);assert.equal(fulfill(s),35);tick(s,30);assert.equal(craft(s,'plank'),true);tick(s,5);assert.equal(s.stock.plank,1);});
test('production fractions survive saves and long absences are bounded',()=>{const s=fresh();s.workers=1;s.projects=1;tick(s,9);const r=restore(JSON.stringify(s));tick(r,1);assert.equal(r.stock.bush,1);tick(r,5);assert.equal(r.coins,2);});
test('cleared resources open routes and inaccessible inner resources reject paths',()=>{const s=fresh(),n=s.nodes.find(n=>n.x===1&&n.y===1);assert.equal(findPath(s,{x:4,y:7},n,n.id,1000),null);for(const node of s.nodes)if(node.x===1||node.y===5)node.ready=50000;assert.ok(findPath(s,{x:4,y:7},n,n.id,1000));});

test('harvest routing skips blocked resources and selects the shortest reachable path', () => {
  const s = fresh();
  s.nodes = [
    { id: 1, x: 2, y: 2, zone: 0, type: 'bush', ready: 0 },
    { id: 2, x: 1, y: 2, zone: 0, type: 'rock', ready: 0 },
    { id: 3, x: 2, y: 1, zone: 0, type: 'rock', ready: 0 },
    { id: 4, x: 3, y: 2, zone: 0, type: 'rock', ready: 0 },
    { id: 5, x: 2, y: 3, zone: 0, type: 'rock', ready: 0 },
    { id: 6, x: 0, y: 7, zone: 0, type: 'bush', ready: 0 },
    { id: 7, x: 0, y: 3, zone: 0, type: 'bush', ready: 5000 },
    { id: 8, x: 6, y: 3, zone: 1, type: 'bush', ready: 0 },
  ];
  const player = { x: 0, y: 2 };
  const route = findHarvestRoute(s, player, 'bush', 1000);
  assert.equal(route.node.id, 6);
  assert.equal(route.path.length, 4);
  assert.deepEqual(route.path.at(-1), { x: 0, y: 6 });
  assert.deepEqual(findHarvestRoute(s, player, null, 1000), { node: s.nodes[1], path: [] });
  assert.equal(findHarvestRoute(s, player, 'bush', 5000).node.id, 7);
  assert.equal(findHarvestRoute(s, player, 'crystal', 1000), null);
});

test('special gear unlocks at the required tool level and boosts only matching resources', () => {
  const s = fresh();
  s.coins = 500;
  assert.equal(equipGear(s, 'ember'), false);
  assert.equal(s.coins, 500);
  s.tool = 2;
  assert.equal(equipGear(s, 'ember'), true);
  assert.equal(s.coins, 415);
  const bush = s.nodes.find(node => node.zone === 0 && node.type === 'bush');
  const rock = s.nodes.find(node => node.zone === 0 && node.type === 'rock');
  const woodHit = hit(s, bush.id, 1000);
  assert.equal(woodHit.broken, true);
  assert.equal(woodHit.gear, 'ember');
  assert.equal(hit(s, rock.id, 1001).gear, 'pick');
  assert.equal(rock.hp, 4);
  assert.equal(equipGear(s, 'machine'), false);
  s.tool = 4;
  assert.equal(equipGear(s, 'machine'), true);
  assert.equal(s.coins, 175);
  const restored = restore(JSON.stringify(s));
  assert.equal(restored.equipped, 'machine');
  assert.equal(hit(restored, rock.id, 1002).gear, 'machine');
  assert.equal(restore(JSON.stringify({ version: 3, tool: 1, gear: ['machine'], equipped: 'machine' })).equipped, 'pick');
  assert.equal(equipGear(s, 'pick'), true);
  assert.equal(equipGear(s, 'ember'), true);
  assert.equal(s.coins, 175);
});

test('regional discoveries pay once and preserve partial progress across saves', () => {
  let s = fresh();
  s.tool = 8;
  const bush = s.nodes.find(node => node.zone === 0 && node.type === 'bush');
  const found = TAL_FINDS[0];
  const locked = s.nodes.find(node => node.zone === 1);
  assert.equal(hit(s, locked.id, 0).reason, 'locked');
  for (let i = 0; i < found.goal - 1; i++) assert.equal(hit(s, bush.id, i * 31000).find, null);
  assert.equal(s.coins, 0);
  s = restore(JSON.stringify(s));
  assert.equal(s.findProgress[0], found.goal - 1);
  assert.equal(hit(s, bush.id, found.goal * 31000).find.name, found.name);
  assert.equal(s.coins, found.reward);
  s = restore(JSON.stringify(s));
  assert.equal(hit(s, bush.id, (found.goal + 1) * 31000).find, null);
  assert.equal(s.findProgress[0], found.goal);
  assert.equal(s.coins, found.reward);
  assert.equal(s.findProgress[1], 0);
});

test('material cable fills available storage from the heights only when the bag is full', () => {
  const s = fresh();
  s.coins = 200;
  s.stock.plank = 3;
  assert.equal(buildValley(s, 'cable'), false);
  s.zones = 3;
  assert.equal(buildValley(s, 'cable'), true);
  assert.equal(s.stock.plank, 0);
  assert.equal(s.coins, 40);
  assert.equal(buildValley(s, 'cable'), false);
  s.inventory.bush = capacity(s) - 1;
  assert.equal(sendCable(s, 2), 0);
  s.inventory.rock = 1;
  s.stock.bush = 5000;
  assert.equal(sendCable(s, 1), 0);
  assert.equal(sendCable(s, 2), 1);
  assert.equal(s.stock.rock, 1);
  assert.equal(s.inventory.bush, capacity(s) - 1);
});

test('forecast and lantern discoveries follow the clock and cannot be collected twice', () => {
  const s = fresh();
  s.zones = 3;
  s.coins = 200;
  s.stock.crystal = 1;
  s.stock.rock = 4;
  assert.equal(buildValley(s, 'lantern'), true);
  assert.equal(buildValley(s, 'weather'), true);
  assert.equal(valleySite(s), null);
  tick(s, 300);
  const crystal = valleySite(s);
  assert.equal(crystal.name, 'Sternkristall');
  assert.equal(collectValleySite(s, { x: 4, y: 7 }), null);
  assert.equal(collectValleySite(s, crystal).name, 'Sternkristall');
  assert.equal(collectValleySite(restore(JSON.stringify(s)), crystal), null);
  tick(s, 300);
  assert.equal(s.valley.day, 1);
  const flower = valleySite(s);
  assert.equal(flower.name, 'Alpenblume');
  assert.equal(collectValleySite(s, flower).name, 'Alpenblume');
  assert.equal(s.coins, 102);
});

test('the night market trades one blueprint and the marble track saves the best run', () => {
  const s = fresh();
  s.zones = 2;
  s.coins = 100;
  s.stock.plank = 6;
  s.stock.brick = 1;
  s.stock.rock = 2;
  assert.equal(tradeBlueprint(s), false);
  assert.equal(buildValley(s, 'marble'), false);
  assert.equal(rollMarble(s, 74), null);
  s.dayClock = 315;
  assert.equal(tradeBlueprint(s), true);
  assert.equal(tradeBlueprint(s), false);
  assert.equal(s.stock.brick, 0);
  assert.equal(buildValley(s, 'marble'), true);
  assert.equal(s.stock.plank, 0);
  assert.equal(rollMarble(s, 74), 42);
  assert.ok(rollMarble(s, 25) < 42);
  assert.equal(restore(JSON.stringify(s)).valley.bestRoll, 42);
});
