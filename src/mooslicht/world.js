// Garden coordinates: photo viewpoint looks north (-Z), house left, hedge right.
// Quest IDs and save key remain compatible with the original adventure.
export const TAU = Math.PI * 2;
export const GARDEN = { minX:-22, maxX:22, minZ:-53, maxZ:18 };
export const PALM = { x:5, z:1, y:0, height:20 };
export const SHED = { x:3, z:-41, w:20, d:15, height:14, doorX:0 };
export const TREE = { x:14, y:0, z:-19 };
export const ISLANDS = [
  { id:'home', name:'Ein Garten. Eine ganze Welt.', x:0,z:-15,y:0,r:36,w:44,d:66,seed:4 },
  { id:'garden', name:'Das Haus der Echos', x:3,z:-41,y:.6,r:10,w:20,d:15,seed:8 },
  { id:'ruins', name:'Steinkreis des Flüsterns', x:14,z:-19,y:0,r:7,seed:12 },
  { id:'wind', name:'Die Krone der Palme', x:5,z:1,y:10.4,r:6,seed:18 },
];
export const BRIDGES = [
  {ax:0,az:-29,ay:0,bx:0,bz:-34,by:.6,width:4},
  // A fallen timber leads from the firewood climb to the shed roof.
  {ax:-16,az:-24,ay:0,bx:-16,bz:-27,by:.8,width:2},
  {ax:1,az:-34,ay:17.6,bx:1,bz:-32,by:17,width:1.3},
  {ax:1,az:-32,ay:17,bx:9,bz:16,by:23,width:1.3},
];
export const STONES = [
  ...Array.from({length:13},(_,i)=>{
    const a=-Math.PI/2+i*.48;return {x:5+Math.cos(a)*4.5,z:1+Math.sin(a)*4.5,y:.8*(i+1),r:1.65,move:i===4?.3:0,kind:'palm'};
  }),
  ...Array.from({length:11},(_,i)=>({x:-16+(i%2)*2.2,z:-27-i*1.5,y:.8*(i+1),r:1.65,move:0,kind:'wood'})),
  {x:-13.7,z:-42.5,y:9.6,r:1.65,move:0,kind:'wood'},
  {x:-11.4,z:-43,y:10.4,r:1.65,move:0,kind:'wood'},
  {x:-9,z:-44,y:11.2,r:1.65,move:0,kind:'wood'},
  {x:-9,z:-41,y:12.4,r:1.65,move:0,kind:'wood'},
  {x:-9,z:-38,y:13.6,r:1.65,move:0,kind:'wood'},
  {x:-6.5,z:-38,y:14.4,r:1.65,move:0,kind:'wood'},
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
  {x:-18,z:-17,y:0,r:1.8,height:3.5},
  {x:-18,z:-31,y:0,r:1.25,height:3},
];
// Simple shared colliders, also used by the camera. The open shed doorway is 4 units wide.
export const WALLS = [
  {x:-23,z:-16,w:2,d:72,y:0,h:30},
  {x:23,z:-16,w:2,d:72,y:0,h:15},
  {x:0,z:-54,w:48,d:2,y:0,h:15},
  {x:0,z:19,w:48,d:2,y:0,h:12},
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
  if(x>=GARDEN.minX&&x<=GARDEN.maxX&&z>=GARDEN.minZ&&z<=GARDEN.maxZ){
    consider(0,onIsland(ISLANDS[2],x,z)?'ruins':'home');
  }
  if(onIsland(ISLANDS[1],x,z)){consider(.6,'garden');consider(18.5-Math.abs(x-3)*.45,'roof');}
  if(Math.hypot(x-9,z-16)<1.2)consider(23,'sail');
  // Terrace furniture platform, with space to walk beneath it.
  if(x>1&&x<14&&z>10&&z<17)consider(8,'table');
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
  for(const b of WALLS){
    if(p.y+1.8<=b.y||p.y>=b.y+b.h)continue;
    const left=b.x-b.w/2-radius,right=b.x+b.w/2+radius,near=b.z-b.d/2-radius,far=b.z+b.d/2+radius;
    if(p.x<=left||p.x>=right||p.z<=near||p.z>=far)continue;
    const amounts=[p.x-left,right-p.x,p.z-near,far-p.z],side=amounts.indexOf(Math.min(...amounts));
    if(side===0){p.x=left;p.vx=Math.min(0,p.vx);}else if(side===1){p.x=right;p.vx=Math.max(0,p.vx);}
    else if(side===2){p.z=near;p.vz=Math.min(0,p.vz);}else{p.z=far;p.vz=Math.max(0,p.vz);}
  }
}

const CAMERA_BOXES=WALLS.concat(OBSTACLES.map(o=>({x:o.x,z:o.z,w:o.r*2,d:o.r*2,y:o.y,h:o.height||3})));
// Earliest intersection along camera segment. Inflated boxes protect the near plane.
export function cameraFraction(from,to) {
  let fraction=1;
  for(const b of CAMERA_BOXES){
    let enter=0,leave=1;
    for(const [axis,min,max] of [['x',b.x-b.w/2-.22,b.x+b.w/2+.22],['y',b.y-.22,b.y+b.h+.22],['z',b.z-b.d/2-.22,b.z+b.d/2+.22]]){
      const delta=to[axis]-from[axis];
      if(Math.abs(delta)<1e-8){if(from[axis]<min||from[axis]>max){enter=2;break;}}
      else {const a=(min-from[axis])/delta,c=(max-from[axis])/delta;enter=Math.max(enter,Math.min(a,c));leave=Math.min(leave,Math.max(a,c));}
    }
    if(enter<=leave&&enter>0&&enter<fraction)fraction=Math.max(.04,enter-.035);
  }
  return fraction;
}
