export const TYPES = {
 bush:{name:'Busch',hp:3,value:3,color:'#86c54b'},
 rock:{name:'Felsen',hp:6,value:7,color:'#a4b5c5'},
 crystal:{name:'Kristall',hp:10,value:15,color:'#ad8dfa'}
};
export const ZONES=[{name:'Sonnenwiese',cost:0},{name:'Steinbruch',cost:100},{name:'Kristallhöhen',cost:400}];
export const PROJECTS=[{name:'Blumenweg',cost:60},{name:'Gartenbrunnen',cost:180},{name:'Alpenpavillon',cost:450}];
export const toolCost=s=>Math.round(35*1.85**(s.tool-1));
export const bagCost=s=>Math.round(30*1.8**s.bag);
export const capacity=s=>20+s.bag*15;
export const power=s=>s.tool;
export function nodes(){const out=[];for(let y=0;y<15;y++)for(let x=0;x<18;x++){
 if(y>=6&&y<=8||x<3&&y>8||x>=7&&x<=10&&y<=4)continue;
 const zone=Math.floor(x/6);const n=(x*73+y*137)%11;
 const type=zone===2&&n<6?'crystal':n<5?'bush':'rock';
 out.push({id:y*18+x,x,y,zone,type,hp:TYPES[type].hp,ready:0});
}return out;}
export function fresh(){return {version:1,coins:0,tool:1,bag:0,inventory:{bush:0,rock:0,crystal:0},zones:1,projects:0,broken:0,earned:0,nodes:nodes()};}
export const count=s=>Object.values(s.inventory).reduce((a,b)=>a+b,0);
export const value=s=>Object.entries(s.inventory).reduce((a,[k,v])=>a+TYPES[k].value*v,0);
export function hit(s,id,now=Date.now()){
 const n=s.nodes.find(n=>n.id===id);if(!n||n.zone>=s.zones||n.ready>now)return {ok:false,reason:'locked'};
 if(count(s)>=capacity(s))return {ok:false,reason:'full'};
 if(n.hp<=0)n.hp=TYPES[n.type].hp;
 n.hp=Math.max(0,n.hp-power(s));if(n.hp)return {ok:true,broken:false};
 s.inventory[n.type]++;s.broken++;n.ready=now+45000;return {ok:true,broken:true,type:n.type};
}
export function sell(s){const v=value(s);s.coins+=v;s.earned+=v;for(const k in s.inventory)s.inventory[k]=0;return v;}
export function buy(s,kind){let cost;if(kind==='tool'){if(s.tool>=8)return false;cost=toolCost(s);}else if(kind==='bag'){if(s.bag>=6)return false;cost=bagCost(s);}else if(kind==='zone'){if(s.zones>=3)return false;cost=ZONES[s.zones].cost;}else if(kind==='project'){if(s.projects>=3)return false;cost=PROJECTS[s.projects].cost;}else return false;
 if(s.coins<cost)return false;s.coins-=cost;if(kind==='tool')s.tool++;if(kind==='bag')s.bag++;if(kind==='zone')s.zones++;if(kind==='project')s.projects++;return true;}
export function restore(raw){const base=fresh();try{const r=JSON.parse(raw);if(r.version!==1)return base;
 for(const [k,max] of [['coins',1e9],['tool',8],['bag',6],['zones',3],['projects',3],['broken',1e9],['earned',1e9]])if(Number.isFinite(r[k]))base[k]=Math.max(['tool','zones'].includes(k)?1:0,Math.min(max,Math.floor(r[k])));
 for(const k in base.inventory)if(Number.isFinite(r.inventory?.[k]))base.inventory[k]=Math.max(0,Math.min(capacity(base),Math.floor(r.inventory[k])));
 if(count(base)>capacity(base))base.inventory={bush:0,rock:0,crystal:0};
 for(const n of base.nodes){const saved=r.nodes?.find(v=>v.id===n.id);if(saved){n.hp=Math.max(0,Math.min(TYPES[n.type].hp,Number(saved.hp)||0));n.ready=Math.min(Date.now()+45000,Math.max(0,Number(saved.ready)||0));}}
 }catch{}return base;}
