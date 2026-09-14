// Garden coordinates: photo viewpoint looks north (-Z), house left, hedge right.
// Quest IDs and save key remain compatible with the original adventure.
import {FURNITURE,BANANA,TERRACE_POTS,ARCHITECTURE,BALCONY,HOUSE,REAR_DECK,REAR_OUTLINE} from './garden-layout.js';
export const TAU = Math.PI * 2;
export const GARDEN = { minX:-22, maxX:22, minZ:-53, maxZ:68 };
export const PALM = { x:-15, z:1, y:0, height:20 };
export const SHED = { x:3, z:-41, w:20, d:15, height:14, doorX:0 };
export const TREE = { x:14, y:0, z:-19 };
// Shared outline for visible terrain, cliff collision and the map. No enclosing wall.
const coast=[[-26,21],[-30,10],[-31,-8],[-33,-28],[-30,-47],[-24,-57],[-12,-61],[1,-59],[15,-58],[24,-49],[27,-33],[29,-19],[26,-4],[28,10],[27,28],[29,43],[28,58],[24,70],[13,75],[-1,74],[-14,75],[-29,77],[-43,77],[-54,73],[-59,65],[-60,54],[-56,47],[-44,46],[-29,46],[-27,31]];
export const GARDEN_OUTLINE=coast.flatMap((p,i)=>{
  const q=coast[(i+1)%coast.length];return Array.from({length:4},(_,j)=>{
    const t=j/4,dx=q[0]-p[0],dz=q[1]-p[1],r=Math.hypot(dx,dz),b=Math.sin(t*Math.PI)*Math.sin(i*2.7+j)*.85;
    return {x:p[0]+dx*t-dz/r*b,z:p[1]+dz*t+dx/r*b};
  });
});
export function insideOutline(points,x,z){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if(((a.z>z)!==(b.z>z))&&(x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x))inside=!inside;
  }
  return inside;
}
export const SATELLITES=[
  {id:'moss',name:'Die schwebende Mooswiese',x:40,z:-8,y:1.4,r:5.8,seed:23,kind:'moss'},
  {id:'pebble',name:'Kiesel über den Wolken',x:46,z:-27,y:4.2,r:5.5,seed:32,kind:'pebble'},
  {id:'bloom',name:'Der Blütengarten im Wind',x:-5,z:87,y:1.2,r:6.2,seed:42,kind:'bloom'},
  {id:'echo',name:'Das Echo hinter der Hütte',x:10,z:-73,y:3.2,r:6,seed:54,kind:'echo'},
];
for(const s of SATELLITES)s.outline=Array.from({length:64},(_,i)=>{const a=i/64*TAU,r=edgeRadius(s,a);return {x:s.x+Math.cos(a)*r,z:s.z+Math.sin(a)*r};});
export const SKY_ROUTES=[
  {id:'moss',from:[25,-8,0],to:[36,-8,1.4],steps:4},
  {id:'pebble',from:[41,-12,1.4],to:[45,-23,4.2],steps:4},
  {id:'bloom',from:[-5,72,0],to:[-5,83,1.2],steps:4},
  {id:'echo',from:[10,-56,0],to:[10,-69,3.2],steps:5},
];
export const SKY_STONES=SKY_ROUTES.flatMap(route=>Array.from({length:route.steps},(_,i)=>{
  const t=(i+1)/route.steps;return {x:route.from[0]+(route.to[0]-route.from[0])*t,z:route.from[1]+(route.to[1]-route.from[1])*t,y:route.from[2]+(route.to[2]-route.from[2])*t,r:1.48,move:0,kind:'sky'};
}));
export const HEDGE_CLUSTERS=Array.from({length:36},(_,i)=>({x:23+Math.sin(i*2.3)*.7,z:-51+i*3.35,y:0,r:.3,height:7+Math.sin(i)*1.4,spread:1.7+(i%3)*.3})).filter(o=>Math.abs(o.z+8)>3.8);
export const ISLANDS = [
  { id:'home', name:'Ein Garten. Eine ganze Welt.', x:0,z:-15,y:0,r:36,w:44,d:66,seed:4 },
  { id:'garden', name:'Das Haus der Echos', x:3,z:-41,y:.6,r:10,w:20,d:15,seed:8 },
  { id:'ruins', name:'Steinkreis des Flüsterns', x:14,z:-19,y:0,r:7,seed:12 },
  { id:'wind', name:'Die Krone der Palme', x:PALM.x,z:PALM.z,y:10.4,r:6,seed:18 },
];
export const BRIDGES = [
  {ax:0,az:-29,ay:0,bx:0,bz:-34,by:.6,width:4},
  // A fallen timber leads from the firewood climb to the shed roof.
  {ax:-16,az:-24,ay:0,bx:-16,bz:-27,by:.8,width:2},
  {ax:1,az:-34,ay:17.6,bx:1,bz:-32,by:17,width:1.3},
  {ax:1,az:-32,ay:17,bx:9,bz:16,by:23,width:1.3},
  {ax:9,az:16,ay:23,bx:-7,bz:16,by:24,width:2},
  {ax:-7,az:16,ay:24,bx:-9,bz:16,by:24,width:2},
];
export const STONES = [
  ...Array.from({length:13},(_,i)=>{
    const a=-Math.PI/2+i*.48;return {x:PALM.x+Math.cos(a)*4.5,z:PALM.z+Math.sin(a)*4.5,y:.8*(i+1),r:1.65,move:i===4?.3:0,kind:'palm'};
  }),
  ...Array.from({length:11},(_,i)=>({x:-16+(i%2)*2.2,z:-27-i*1.5,y:.8*(i+1),r:1.65,move:0,kind:'wood'})),
  {x:-13.7,z:-42.5,y:9.6,r:1.65,move:0,kind:'wood'},
  {x:-11.4,z:-43,y:10.4,r:1.65,move:0,kind:'wood'},
  {x:-9,z:-44,y:11.2,r:1.65,move:0,kind:'wood'},
  {x:-9,z:-41,y:12.4,r:1.65,move:0,kind:'wood'},
  {x:-9,z:-38,y:13.6,r:1.65,move:0,kind:'wood'},
  {x:-6.5,z:-38,y:14.4,r:1.65,move:0,kind:'wood'},
  ...SKY_STONES,
];
export const FLOWERS = [
  {x:-3,z:-43,y:.6,color:'#ffd66b',name:'Holzklang · Sonne'},
  {x:3,z:-46,y:.6,color:'#72d5ee',name:'Glasklang · Himmel'},
  {x:9,z:-43,y:.6,color:'#f4a5cb',name:'Metallklang · Rose'},
];
export const SHRINES = [
  {id:'garden',x:3,z:-39,y:.6,color:'#f5bd55',name:'Echolicht'},
  {id:'ruins',x:15,z:-24,y:0,color:'#b7a1ff',name:'Steinlicht'},
  {id:'wind',x:STONES[12].x,z:STONES[12].z,y:10.4,color:'#85e6e5',name:'Blattlicht'},
];
export const WIND_ORBS = [4,8,12].map((i,j)=>({x:STONES[i].x,y:STONES[i].y+(j===1?1.6:.75),z:STONES[i].z}));
export const GUARDS = [{x:10,z:-20,y:0},{x:17,z:-16,y:0},{x:17,z:-23,y:0}];
export const GUIDE = {x:-6,y:0,z:8};
export const CHEST = {x:-18,y:0,z:2};
export const CHECKPOINTS = {
  home:{x:-10,z:10,y:0}, garden:{x:0,z:-36,y:.6},
  ruins:{x:10,z:-14,y:0}, wind:{x:STONES[12].x,z:STONES[12].z,y:10.4},
};
export const OBSTACLES = [
  {...TREE,r:1.25,height:24}, {...PALM,r:1.05,height:20},
  {...BANANA,y:0},
  ...TERRACE_POTS.map(p=>({...p,y:0,r:1.15,height:3.2})),
  {x:18,z:50.5,y:0,r:.15,height:13},
  {x:9,z:16,y:0,r:.13,height:23},
  {x:-18,z:-17,y:0,r:1.8,height:3.5},
  {x:-18,z:-31,y:0,r:1.25,height:3},
  ...HEDGE_CLUSTERS,
];
// Simple shared colliders, also used by the camera. The open shed doorway is 4 units wide.
export const WALLS = [
  HOUSE,
  {x:-7,z:-41,w:.5,d:15,y:.6,h:13.4},
  {x:13,z:-41,w:.5,d:15,y:.6,h:13.4},
  {x:3,z:-48.5,w:20,d:.5,y:.6,h:13.4},
  {x:-4.5,z:-33.5,w:5,d:.5,y:.6,h:13.4},
  {x:7.5,z:-33.5,w:11,d:.5,y:.6,h:13.4},
  {x:0,z:-33.5,w:4,d:.5,y:9,h:5},
];
export const SECRETS = [
  {id:0,x:-20,z:4,y:0,name:'Zwischen den Steinen',text:'Was für uns Kies ist, ist für andere ein Gebirge.'},
  {id:1,x:-20,z:-17,y:0,name:'Hinter dem Blumentopf',text:'Hier versteckt Lumi ihren ersten Sonnenstrahl.'},
  {id:2,x:-16,z:-42,y:8.8,name:'Das Gedächtnis des Holzes',text:'Jeder Jahresring bewahrt einen Sommer.'},
  {id:3,x:8,z:-39,y:16.25,name:'Über den Dächern',text:'Von hier sieht selbst die grosse Welt ganz klein aus.'},
  {id:4,x:20,z:-5,y:0,name:'Der Heckenwald',text:'Ein stiller Durchgang. Nur Käfer kennen diesen Weg.'},
  {id:5,x:5,z:13,y:0,name:'Unter der Terrasse',text:'Über dir trinken Riesen Tee. Unter ihnen beginnt dein Abenteuer.'},
];
export const LIFTING_PLATES=[0,1,2,3].map(i=>({x:-7+i*2.5,z:-15-i*1.7,y:.05,r:1.5,rise:1+i*.7}));
export const SEEDS = [
  [-10,8,0],[-12,5,0],[-12,1,0],[-12,-4,0],[-12,-9,0],[-12,-14,0],
  [-12,-20,0],[-12,-25,0],[-8,-28,0],[-4,-30,0],[-3,-38,.6],[9,-38,.6],
  [-3,-46,.6],[9,-46,.6],[9,-14,0],[18,-13,0],[19,-22,0],[11,-25,0],
  ...[1,3,5,7,9,11].map(i=>[STONES[i].x,STONES[i].z,STONES[i].y]),
].map(([x,z,y],id)=>({id,x,z,y:y+.65}));

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function random(seed) {
  let n = seed >>> 0;
  return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function edgeRadius(island, angle) {
  return island.r * (.955 + .028 * Math.sin(angle * 5 + island.seed) + .017 * Math.cos(angle * 9 + island.seed));
}
export function onIsland(island, x, z, margin = 0) {
  if (island.w) return Math.abs(x-island.x)<=island.w/2-margin && Math.abs(z-island.z)<=island.d/2-margin;
  return Math.hypot(x - island.x, z - island.z) <= edgeRadius(island, Math.atan2(z - island.z, x - island.x)) - margin;
}
export function stonePosition(stone, time) {
  return { x: stone.x + Math.sin(time * .9) * stone.move, y: stone.y, z: stone.z };
}
export function surfaceAt(x,z,time=0,maxY=Infinity,energy=0) {
  let height=-Infinity,id=null,stoneIndex=-1;
  const consider=(y,area,index=-1)=>{if(y<=maxY && y>height){height=y;id=area;stoneIndex=index;}};
  if(insideOutline(GARDEN_OUTLINE,x,z)){
    consider(0,onIsland(ISLANDS[2],x,z)?'ruins':'home');
  }
  for(const island of SATELLITES)if(insideOutline(island.outline,x,z))consider(island.y,island.id);
  if(onIsland(ISLANDS[1],x,z)){consider(.6,'garden');consider(18.5-Math.abs(x-3)*.45,'roof');}
  if(Math.hypot(x-9,z-16)<1.2)consider(23,'sail');
  // Terrace furniture platform, with space to walk beneath it.
  for(const b of FURNITURE)if(Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2)consider(b.y+b.h,'table');
  if(Math.abs(x-BALCONY.x)<BALCONY.w/2&&Math.abs(z-BALCONY.z)<BALCONY.d/2)consider(BALCONY.y+BALCONY.h,'balcony');
  if(insideOutline(REAR_OUTLINE,x,z))consider(REAR_DECK.y+REAR_DECK.h,'lounge');
  for(const b of ARCHITECTURE)if(Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2)consider(b.y+b.h,b.y>=23?'balcony':'lounge');
  for(const b of BRIDGES){
    const dx=b.bx-b.ax,dz=b.bz-b.az,l2=dx*dx+dz*dz,t=((x-b.ax)*dx+(z-b.az)*dz)/l2;
    if(t>=0&&t<=1&&Math.hypot(x-b.ax-t*dx,z-b.az-t*dz)<b.width*.49)consider(b.ay+t*(b.by-b.ay),'bridge');
  }
  for(let i=0;i<STONES.length;i++){
    const s=STONES[i],p=stonePosition(s,time);
    if(Math.hypot(x-p.x,z-p.z)<s.r)consider(p.y,i===12?'wind':'stone',i);
  }
  for(const slab of LIFTING_PLATES)if(Math.hypot(x-slab.x,z-slab.z)<slab.r)consider(slab.y+slab.rise*energy,'lift');
  return {height,id,stoneIndex};
}

// Swept circle against axis-aligned walls; substepped movement bounds tunnelling.
export function resolveWalls(p,radius=.3){
  for(const b of SOLIDS){
    if(p.y+1.8<=b.y||p.y>=b.y+b.h)continue;
    const left=b.x-b.w/2-radius,right=b.x+b.w/2+radius,near=b.z-b.d/2-radius,far=b.z+b.d/2+radius;
    if(p.x<=left||p.x>=right||p.z<=near||p.z>=far)continue;
    const amounts=[p.x-left,right-p.x,p.z-near,far-p.z],side=amounts.indexOf(Math.min(...amounts));
    if(side===0){p.x=left;p.vx=Math.min(0,p.vx);}else if(side===1){p.x=right;p.vx=Math.max(0,p.vx);}
    else if(side===2){p.z=near;p.vz=Math.min(0,p.vz);}else{p.z=far;p.vz=Math.max(0,p.vz);}
  }
}

export const SOLIDS=WALLS.concat(FURNITURE,ARCHITECTURE);
const CAMERA_BOXES=SOLIDS.concat(OBSTACLES.map(o=>({x:o.x,z:o.z,w:o.r*2,d:o.r*2,y:o.y,h:o.height||3}))).map(b=>({
  min:[b.x-b.w/2-.22,b.y-.22,b.z-b.d/2-.22],max:[b.x+b.w/2+.22,b.y+b.h+.22,b.z+b.d/2+.22],
}));
const CAMERA_AXES=['x','y','z'];
// Earliest intersection along camera segment. Inflated boxes protect the near plane.
export function cameraFraction(from,to) {
  let fraction=1;
  for(const b of CAMERA_BOXES){
    let enter=0,leave=1;
    for(let i=0;i<3;i++){
      const axis=CAMERA_AXES[i],min=b.min[i],max=b.max[i];
      const delta=to[axis]-from[axis];
      if(Math.abs(delta)<1e-8){if(from[axis]<min||from[axis]>max){enter=2;break;}}
      else {const a=(min-from[axis])/delta,c=(max-from[axis])/delta;enter=Math.max(enter,Math.min(a,c));leave=Math.min(leave,Math.max(a,c));}
    }
    if(enter<=leave&&enter>0&&enter<fraction)fraction=Math.max(.04,enter-.035);
  }
  return fraction;
}
