export const TYPES={bush:{name:'Holz',hp:3,value:3,color:0x74aa44},rock:{name:'Stein',hp:6,value:7,color:0x99aebb},crystal:{name:'Kristall',hp:10,value:15,color:0xb397ed}};
export const ZONES=[{name:'Sonnenwiese',cost:0},{name:'Steinbruch',cost:180},{name:'Kristallhöhen',cost:650}];
export const PROJECTS=[{name:'Blumengarten',cost:100},{name:'Gartenbrunnen',cost:300},{name:'Alpenpavillon',cost:800}];
export const RECIPES={plank:{name:'Bretter',input:{bush:3},price:18,time:5},brick:{name:'Bausteine',input:{rock:3},price:42,time:8},gem:{name:'Schmucksteine',input:{crystal:3},price:95,time:12}};
export const GOODS=['bush','rock','crystal','plank','brick','gem'];
export const NAMES={...Object.fromEntries(Object.entries(TYPES).map(([k,v])=>[k,v.name])),...Object.fromEntries(Object.entries(RECIPES).map(([k,v])=>[k,v.name]))};
export const toolCost=s=>Math.round(35*1.72**(s.tool-1));export const bagCost=s=>Math.round(30*1.7**s.bag);export const capacity=s=>20+s.bag*15;export const power=s=>s.tool;
export const workerCost=s=>Math.round(120*2**s.workers);export const workshopCost=s=>s.workshop?Math.round(220*2**(s.workshop-1)):90;
const empty=()=>Object.fromEntries(GOODS.map(k=>[k,0]));
export function nodes(){const out=[];for(let y=0;y<15;y++)for(let x=0;x<18;x++){if(y>=6&&y<=8||x<3&&y>8||x>=7&&x<=10&&y<=4)continue;const zone=Math.floor(x/6),n=(x*73+y*137)%11;const type=zone===2&&n<6?'crystal':n<5?'bush':'rock';out.push({id:y*18+x,x,y,zone,type,hp:TYPES[type].hp,ready:0});}return out;}
export function fresh(){return {version:2,coins:0,tool:1,bag:0,inventory:{bush:0,rock:0,crystal:0},stock:empty(),zones:1,projects:0,broken:0,earned:0,xp:0,workers:0,workshop:0,job:null,orders:0,claimed:[],workerClock:0,gardenClock:0,lastSeen:Date.now(),nodes:nodes()};}
export const count=s=>Object.values(s.inventory).reduce((a,b)=>a+b,0);
export const value=s=>Object.entries(s.inventory).reduce((a,[k,v])=>a+TYPES[k].value*v,0);
export const level=s=>1+Math.floor(Math.sqrt(s.xp/20));
export function hit(s,id,now=Date.now()){const n=s.nodes.find(n=>n.id===id);if(!n||n.zone>=s.zones||n.ready>now)return {ok:false,reason:'locked'};if(count(s)>=capacity(s))return {ok:false,reason:'full'};if(n.hp<=0)n.hp=TYPES[n.type].hp;n.hp=Math.max(0,n.hp-power(s));if(n.hp)return {ok:true,broken:false};s.inventory[n.type]++;s.broken++;s.xp+=3;n.ready=now+30000;return {ok:true,broken:true,type:n.type};}
export function sell(s){const v=value(s);s.coins+=v;s.earned+=v;for(const k in s.inventory)s.inventory[k]=0;return v;}
export function deposit(s){const n=count(s);for(const k in s.inventory){s.stock[k]+=s.inventory[k];s.inventory[k]=0;}return n;}
export function stockValue(s){return GOODS.reduce((a,k)=>a+s.stock[k]*(TYPES[k]?.value??RECIPES[k].price),0);}
export function sellStock(s){const v=stockValue(s);s.coins+=v;s.earned+=v;s.stock=empty();return v;}
export function buy(s,kind){let cost,max;switch(kind){case'tool':cost=toolCost(s);max=s.tool>=8;break;case'bag':cost=bagCost(s);max=s.bag>=6;break;case'zone':cost=ZONES[s.zones]?.cost;max=s.zones>=3;break;case'project':cost=PROJECTS[s.projects]?.cost;max=s.projects>=3;break;case'worker':cost=workerCost(s);max=s.workers>=3;break;case'workshop':cost=workshopCost(s);max=s.workshop>=3;break;default:return false;}
if(max||s.coins<cost)return false;s.coins-=cost;if(kind==='tool')s.tool++;if(kind==='bag')s.bag++;if(kind==='zone')s.zones++;if(kind==='project')s.projects++;if(kind==='worker')s.workers++;if(kind==='workshop')s.workshop++;s.xp+=10;return true;}
export function craft(s,kind){const r=RECIPES[kind];if(!r||!s.workshop||s.job||kind==='gem'&&s.zones<3)return false;if(Object.entries(r.input).some(([k,n])=>s.stock[k]<n))return false;for(const[k,n]of Object.entries(r.input))s.stock[k]-=n;s.job={kind,remaining:r.time/s.workshop,total:r.time/s.workshop};return true;}
export function tick(s,seconds){seconds=Math.max(0,Math.min(300,seconds));const result={produced:0,passive:0,crafted:null};if(s.job){s.job.remaining-=seconds;if(s.job.remaining<=0){s.stock[s.job.kind]++;s.xp+=4;result.crafted=s.job.kind;s.job=null;}}
s.workerClock+=seconds;if(s.workers){const batches=Math.floor(s.workerClock/10);s.workerClock%=10;const maxStock=5000;for(let b=0;b<batches;b++)for(let i=0;i<s.workers;i++){const k=i===2&&s.zones===3?'crystal':i>=1&&s.zones>=2?'rock':'bush';if(s.stock[k]<maxStock){s.stock[k]++;result.produced++;}}}else s.workerClock=0;
s.gardenClock+=seconds;if(s.projects){const cycles=Math.floor(s.gardenClock/15);s.gardenClock%=15;result.passive=cycles*s.projects*2;s.coins+=result.passive;s.earned+=result.passive;}else s.gardenClock=0;return result;}
export function order(s){const all=[{kind:'bush',amount:8,reward:35,title:'Holz fürs Berghaus'},{kind:'rock',amount:6,reward:65,title:'Ein Weg durch das Tal'},{kind:'plank',amount:3,reward:95,title:'Eine neue Gartenbank'},{kind:'brick',amount:3,reward:210,title:'Mauern für die Gärtnerei'},{kind:'gem',amount:2,reward:300,title:'Funkeln für den Markt'}];const options=all.filter(o=>(!RECIPES[o.kind]||s.workshop)&&(!(o.kind==='gem')||s.zones===3));return options[s.orders%options.length];}
export function fulfill(s){const o=order(s);if(s.stock[o.kind]<o.amount)return false;s.stock[o.kind]-=o.amount;s.coins+=o.reward;s.earned+=o.reward;s.xp+=20;s.orders++;return o.reward;}
export const MILESTONES=[{id:'first',title:'Die ersten 5 Ressourcen',goal:5,reward:20,stat:'broken'},{id:'twenty',title:'Ein fleissiger Anfang',goal:25,reward:50,stat:'broken'},{id:'trader',title:'Drei zufriedene Kunden',goal:3,reward:100,stat:'orders'},{id:'garden',title:'Ein blühendes Tal',goal:3,reward:250,stat:'projects'},{id:'master',title:'Meister des Steinbruchs',goal:150,reward:300,stat:'broken'}];
export function claim(s,id){const m=MILESTONES.find(m=>m.id===id);if(!m||s.claimed.includes(id)||s[m.stat]<m.goal)return 0;s.claimed.push(id);s.coins+=m.reward;s.earned+=m.reward;s.xp+=15;return m.reward;}
export function restore(raw){const s=fresh();try{const r=JSON.parse(raw);if(!r||![1,2].includes(r.version))return s;
for(const[k,max]of[['coins',1e9],['tool',8],['bag',6],['zones',3],['projects',3],['broken',1e9],['earned',1e9],['xp',1e9],['workers',3],['workshop',3],['orders',1e9]])if(Number.isFinite(r[k]))s[k]=Math.max(['tool','zones'].includes(k)?1:0,Math.min(max,Math.floor(r[k])));
for(const k in s.inventory)if(Number.isFinite(r.inventory?.[k]))s.inventory[k]=Math.max(0,Math.min(capacity(s),Math.floor(r.inventory[k])));if(count(s)>capacity(s))s.inventory={bush:0,rock:0,crystal:0};for(const k of GOODS)if(Number.isFinite(r.stock?.[k]))s.stock[k]=Math.max(0,Math.min(5000,Math.floor(r.stock[k])));
if(Array.isArray(r.claimed))s.claimed=r.claimed.filter(id=>MILESTONES.some(m=>m.id===id));if(r.job&&RECIPES[r.job.kind]&&s.workshop){const total=RECIPES[r.job.kind].time/s.workshop;s.job={kind:r.job.kind,remaining:Math.min(total,Math.max(.01,Number(r.job.remaining)||.01)),total};}
if(Array.isArray(r.nodes)){const map=new Map(r.nodes.map(n=>[n.id,n]));for(const n of s.nodes){const saved=map.get(n.id);if(saved){n.hp=Math.max(0,Math.min(TYPES[n.type].hp,Number(saved.hp)||0));n.ready=Math.min(Date.now()+30000,Math.max(0,Number(saved.ready)||0));}}}
for(const k of ['workerClock','gardenClock'])if(Number.isFinite(r[k]))s[k]=Math.max(0,Math.min(k==='workerClock'?9.999:14.999,r[k]));
s.lastSeen=Number.isFinite(r.lastSeen)?Math.min(Date.now(),Math.max(0,r.lastSeen)):Date.now();if(r.version===1)s.xp=s.broken*3;
}catch{}return s;}
// Walk to a free neighbouring tile, preserving cleared routes through the garden.
export function findPath(s,from,to,nodeId=null,now=Date.now()){
const start={x:Math.max(0,Math.min(s.zones*6-1,Math.round(from.x))),y:Math.max(0,Math.min(14,Math.round(from.y)))};
const blocked=new Set(s.nodes.filter(n=>n.zone<s.zones&&n.ready<=now).map(n=>n.id));blocked.delete(start.y*18+start.x);
const goals=[];if(nodeId!==null){for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])goals.push({x:to.x+dx,y:to.y+dy});}else goals.push({x:Math.round(to.x),y:Math.round(to.y)});
const valid=p=>p.x>=0&&p.x<s.zones*6&&p.y>=0&&p.y<15&&!blocked.has(p.y*18+p.x);const goalSet=new Set(goals.filter(valid).map(p=>p.y*18+p.x));if(!goalSet.size)return null;
const queue=[start],prev=new Map([[start.y*18+start.x,null]]);for(let i=0;i<queue.length;i++){const p=queue[i],id=p.y*18+p.x;if(goalSet.has(id)){const path=[];let k=id;while(prev.get(k)!==null){path.unshift({x:k%18,y:Math.floor(k/18)});k=prev.get(k);}return path;}
for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const next={x:p.x+dx,y:p.y+dy},key=next.y*18+next.x;if(valid(next)&&!prev.has(key)){prev.set(key,id);queue.push(next);}}}return null;}
