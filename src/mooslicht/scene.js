import * as T from 'three';
import { ISLANDS, BRIDGES, STONES, FLOWERS, SHRINES, WIND_ORBS, OBSTACLES, SEEDS, TREE, GUIDE, CHEST, GUARDS, edgeRadius, onIsland, random, TAU } from './world.js';

const C = { grass: '#93b969', moss: '#557957', bark: '#9d7451', rock: '#99a69a', cream: '#fff1cf', gold: '#ffce73', green: '#396e58', dark: '#264e4b' };
const geo = {
  ball: new T.IcosahedronGeometry(1, 2), pebble: new T.IcosahedronGeometry(1, 1),
  box: new T.BoxGeometry(1,1,1), cylinder: new T.CylinderGeometry(1,1,1,10),
  cone: new T.ConeGeometry(1,1,8), ring: new T.TorusGeometry(1,.075,6,32),
  disk: new T.CylinderGeometry(1,1,1,32), petal: new T.SphereGeometry(1,12,8),
};
const standard = new T.MeshStandardMaterial({ color: '#ffffff', roughness: .88, metalness: 0 });
const noShadow = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: T.DoubleSide });
const tmp = new T.Object3D(), white = new T.Color('#ffffff'), up = new T.Vector3(0,1,0);
function material(color, emissive = 0) { return new T.MeshStandardMaterial({ color, roughness: .72, emissive: color, emissiveIntensity: emissive }); }
function mesh(shape, color, scale, position, parent, emissive = 0) {
  const m = new T.Mesh(geo[shape], material(color, emissive));
  m.scale.set(...scale); m.position.set(...position); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
class Batch {
  constructor(parent) { this.parent = parent; this.items = new Map(); }
  add(shape, color, pos, scale, rot = [0,0,0], shadow = true) {
    tmp.position.set(...pos); tmp.scale.set(...scale); tmp.rotation.set(rot[0] || 0,rot[1] || 0,rot[2] || 0); tmp.updateMatrix();
    const key = shape + (shadow ? '-lit' : '-soft');
    if (!this.items.has(key)) this.items.set(key, { shape, shadow, matrices: [], colors: [] });
    const b = this.items.get(key); b.matrices.push(tmp.matrix.clone()); b.colors.push(new T.Color(color));
  }
  beam(a, b, radius, color, shadow = true) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b), d = end.clone().sub(start);
    tmp.position.copy(start).add(end).multiplyScalar(.5); tmp.scale.set(radius,d.length(),radius);
    tmp.quaternion.setFromUnitVectors(up,d.normalize()); tmp.updateMatrix();
    const key = 'cylinder' + (shadow ? '-lit' : '-soft');
    if (!this.items.has(key)) this.items.set(key, { shape:'cylinder', shadow, matrices:[], colors:[] });
    const item = this.items.get(key); item.matrices.push(tmp.matrix.clone()); item.colors.push(new T.Color(color));
  }
  finish() {
    for (const b of this.items.values()) {
      const m = new T.InstancedMesh(geo[b.shape], b.shadow ? standard : noShadow, b.matrices.length);
      b.matrices.forEach((matrix, i) => { m.setMatrixAt(i,matrix); m.setColorAt(i,b.colors[i]); });
      m.castShadow = b.shadow; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere(); this.parent.add(m);
    }
  }
}

function terrain(island, scene) {
  const n = 64, randomValue = random(island.seed), positions = [], colors = [], indices = [];
  const rings = [0,.18,.35,.5,.65,.78,.9,1]; const green = new T.Color('#83ab62');
  for (const r of rings) for (let j=0;j<=n;j++) {
    const a = j/n*TAU, radius = edgeRadius(island,a)*r;
    const x=island.x+Math.cos(a)*radius,z=island.z+Math.sin(a)*radius;
    positions.push(x,island.y,z);
    const variation=Math.sin(x*.6+island.seed)*Math.cos(z*.55)*.024+Math.sin(x*1.4+z*.8)*.008;
    const c = green.clone().offsetHSL(variation*.3,variation*.4,variation);
    if (r === 1) c.multiplyScalar(.85); colors.push(c.r,c.g,c.b);
  }
  for(let r=0;r<rings.length-1;r++) for(let j=0;j<n;j++) {
    const a=r*(n+1)+j,b=a+n+1; indices.push(a,b+1,b,a,a+1,b+1);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3)); g.setIndex(indices); g.computeVertexNormals();
  const top = new T.Mesh(g,new T.MeshStandardMaterial({ vertexColors:true,roughness:1 })); top.receiveShadow=true; scene.add(top);
  const sideP=[],sideC=[],sideI=[],rock=new T.Color('#b3a381');
  const levels=[[1,0],[1.01,-.35],[.95,-1],[.83,-2.6],[.58,-4.1],[.16,-5.2]];
  for(let l=0;l<levels.length;l++) for(let j=0;j<=n;j++) {
    const a=j/n*TAU,r=edgeRadius(island,a)*levels[l][0];
    sideP.push(island.x+Math.cos(a)*r,island.y+levels[l][1]*(island.r/10)*1.15,island.z+Math.sin(a)*r);
    const c = l===0 ? new T.Color('#648454') : rock.clone().offsetHSL(.018*l,.01,-.035*l+(randomValue()-.5)*.075);
    sideC.push(c.r,c.g,c.b);
  }
  for(let l=0;l<levels.length-1;l++) for(let j=0;j<n;j++) {const a=l*(n+1)+j,b=a+n+1;sideI.push(a,a+1,b,b,a+1,b+1);}
  const sg=new T.BufferGeometry(); sg.setAttribute('position',new T.Float32BufferAttribute(sideP,3)); sg.setAttribute('color',new T.Float32BufferAttribute(sideC,3)); sg.setIndex(sideI); sg.computeVertexNormals();
  const side=new T.Mesh(sg,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true})); side.receiveShadow=true; side.castShadow=true; scene.add(side);
}

function tree(batch,x,y,z,size=1,hero=false) {
  const rng=random(Math.round((x+50)*13+(z+50)*18)),h=(hero?5.3:3.8)*size;
  const bark=hero?'#ab8358':'#8e7755';
  batch.beam([x,y-.06,z],[x+.17*size,y+h*.72,z],(hero?.72:.37)*size,bark);
  batch.beam([x+.17*size,y+h*.5,z],[x-.6*size,y+h,z+.2*size],.24*size,bark);
  for(let k=0;k<5;k++) {
    const a=k/5*TAU+.7;
    batch.beam([x,y+.23,z],[x+Math.cos(a)*1.35*size,y+.04,z+Math.sin(a)*1.35*size],.16*size,bark);
    const bx=x+Math.cos(a)*(hero?1.8:1.1)*size,bz=z+Math.sin(a)*(hero?1.8:1.1)*size;
    batch.beam([x,y+h*.52,z],[bx,y+h*.88,bz],.18*size,bark);
  }
  for(let k=0;k<(hero?13:7);k++) {
    const a=k*2.4,r=k===0?0:(hero?2.2:1.3)*size*(.7+rng()*.3);
    const color=new T.Color(hero?'#b3c86a':'#75a56e').offsetHSL((rng()-.5)*.07,.03,(rng()-.5)*.14);
    batch.add('ball',color,[x+Math.cos(a)*r,y+h+(rng()-.3)*size,z+Math.sin(a)*r],[1.55*size,(.9+rng()*.45)*size,1.25*size],[rng()*.5,rng()*3,0]);
  }
}
function mushroom(batch,x,y,z,scale,color) {
  batch.add('cylinder','#efdbb5',[x,y+.38*scale,z],[.11*scale,.8*scale,.11*scale]);
  batch.add('petal',color,[x,y+.8*scale,z],[.62*scale,.27*scale,.62*scale]);
  for(let j=0;j<3;j++){const a=j*2.4;batch.add('ball','#fff2d2',[x+Math.cos(a)*.28*scale,y+1.02*scale,z+Math.sin(a)*.28*scale],[.08*scale,.025*scale,.08*scale],[],false);}
}
function path(batch,ax,az,bx,bz,y,rng) {
  const d=Math.hypot(bx-ax,bz-az),n=Math.ceil(d/1.2);
  for(let i=0;i<=n;i++){const t=i/n;batch.add('pebble','#d2cb9c',[ax+(bx-ax)*t+(rng()-.5)*.25,y+.02,az+(bz-az)*t+(rng()-.5)*.25],[.56,.045,.45],[0,rng()*3,0],false);}
}
function bridge(batch,b) {
  const dx=b.bx-b.ax,dz=b.bz-b.az,length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),px=dz/length,pz=-dx/length,n=Math.ceil(length/.48);
  for(let i=0;i<=n;i++) {
    const t=i/n,x=b.ax+dx*t,z=b.az+dz*t,y=b.ay+(b.by-b.ay)*t;
    batch.add('box',i%3?'#b69062':'#c6a77b',[x,y-.09,z],[b.width,.18,.41],[0,angle,0]);
  }
  for(const side of [-1,1]) {
    let last=null;
    for(let i=0;i<=12;i++) {
      const t=i/12,x=b.ax+dx*t+px*b.width*.47*side,z=b.az+dz*t+pz*b.width*.47*side,y=b.ay+(b.by-b.ay)*t+.9-Math.sin(t*Math.PI)*.22;
      if(last) batch.beam(last,[x,y,z],.034,'#dec28e'); last=[x,y,z];
      if(i%4===0) batch.add('cylinder','#846b4b',[x,y-.39,z],[.07,.95,.07]);
    }
  }
}

export function makeHero() {
  const root=new T.Group(),body=new T.Group();root.add(body);
  const cape=mesh('cone','#d67c47',[.49,.7,.42],[0,.94,0],body);cape.rotation.y=Math.PI/8;
  mesh('ball','#e7c293',[.19,.22,.17],[0,1.22,.05],body);
  mesh('petal','#f9dcb4',[.31,.32,.29],[0,1.53,.03],body);
  mesh('ball','#284d53',[.36,.16,.33],[-.025,1.79,-.02],body);
  const leaf=mesh('petal','#a5c777',[.09,.29,.035],[.18,1.99,-.03],body);leaf.rotation.z=-.52;
  for(const x of [-.115,.115]) {
    mesh('petal','#243e45',[.046,.06,.025],[x,1.55,.292],body);
    mesh('ball','#fff5df',[.013,.015,.013],[x-.011,1.57,.31],body,.2);
  }
  mesh('petal','#dcab84',[.055,.042,.04],[0,1.47,.32],body);
  mesh('box','#5b7862',[.4,.45,.21],[0,1.05,-.35],body);
  mesh('box','#d8b981',[.055,.5,.035],[-.16,1.05,-.47],body);
  mesh('box','#d8b981',[.055,.5,.035],[.16,1.05,-.47],body);
  const legs=[];
  for(const x of [-.18,.18]) {
    const pivot=new T.Group();pivot.position.set(x,.65,0);body.add(pivot);
    mesh('cylinder','#f0dfba',[.10,.35,.10],[0,-.2,0],pivot);
    mesh('petal','#345855',[.15,.14,.23],[0,-.51,.06],pivot);legs.push(pivot);
  }
  const arm=new T.Group();arm.position.set(-.41,1.15,0);body.add(arm);
  mesh('cylinder','#b7633c',[.10,.31,.1],[0,-.17,0],arm);mesh('ball','#f3d4a7',[.12,.12,.12],[0,-.33,.015],arm);
  const lamp=new T.Group();lamp.position.set(0,-.51,.06);arm.add(lamp);
  mesh('box','#866547',[.21,.27,.21],[0,0,0],lamp);
  const lampCore=mesh('ball','#ffdb83',[.095,.115,.095],[0,0,.083],lamp,1.3);
  const swordArm=new T.Group();swordArm.position.set(.42,1.14,0);body.add(swordArm);
  mesh('cylinder','#bc693e',[.1,.31,.1],[0,-.17,0],swordArm);mesh('ball','#f3d4a7',[.12,.12,.12],[0,-.34,0],swordArm);
  const sword=mesh('box','#dce7d6',[.105,.70,.07],[0,-.76,.06],swordArm);sword.rotation.z=-.1;
  mesh('box','#e5bc6c',[.34,.09,.13],[0,-.41,.06],swordArm);
  const slash=new T.Mesh(new T.RingGeometry(.8,2.15,32,1,0,2),new T.MeshBasicMaterial({color:'#fff4c2',transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}));
  slash.rotation.x=-Math.PI/2;slash.position.y=1;root.add(slash);slash.visible=false;
  return { root,body,legs,arm,swordArm,slash,lampCore };
}

function guardian(id) {
  const root=new T.Group(),body=new T.Group();root.add(body);
  mesh('pebble','#8c91a0',[.63,.53,.46],[0,.69,0],body);
  mesh('pebble','#afb6b0',[.48,.37,.39],[0,1.17,0],body);
  for(const x of [-.54,.54]) mesh('pebble','#929a9b',[.2,.35,.23],[x,.58,0],body);
  for(const x of [-.28,.28]) mesh('pebble','#727d82',[.22,.17,.26],[x,.16,.04],body);
  for(const x of [-.17,.17]) mesh('ball','#edb0e4',[.06,.07,.035],[x,1.19,.36],body,.8);
  mesh('pebble','#8ca374',[.46,.11,.36],[0,1.49,0],body);
  const warning=new T.Mesh(new T.RingGeometry(.68,1.75,40),new T.MeshBasicMaterial({color:'#f0a284',transparent:true,opacity:.25,side:T.DoubleSide,depthWrite:false}));warning.rotation.x=-Math.PI/2;warning.position.y=.025;root.add(warning);warning.visible=false;
  return {id,root,body,warning};
}

export function buildScene() {
  const scene=new T.Scene();scene.background=new T.Color('#a7c9c3');scene.fog=new T.FogExp2('#b1cdbe',.0095);
  const sky=new T.Mesh(new T.SphereGeometry(180,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
    uniforms:{top:{value:new T.Color('#70acbf')},bottom:{value:new T.Color('#f3dfb7')}},
    vertexShader:'varying float h; void main(){h=position.y/180.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying float h; uniform vec3 top; uniform vec3 bottom;\nvoid main(){\ngl_FragColor=vec4(mix(bottom,top,smoothstep(-.15,.65,h)),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
  scene.add(sky);
  scene.add(new T.HemisphereLight('#eff8e4','#698a82',2.1));
  const sun=new T.DirectionalLight('#fff0ce',3.3);sun.position.set(-22,38,15);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-43,right:43,top:42,bottom:-42,near:.5,far:110});
  sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00025;sun.shadow.normalBias=.055;sun.shadow.radius=3;
  sun.target.position.set(0,0,-10);scene.add(sun,sun.target);
  const rim=new T.DirectionalLight('#b8e9eb',.9);rim.position.set(20,15,-35);scene.add(rim);
  const batch=new Batch(scene),rng=random(61922);
  for(const island of ISLANDS) {
    terrain(island,scene);
    // Undercut stones, hanging moss and small crystal roots give the islands depth.
    for(let j=0;j<32;j++) {
      const a=j/32*TAU,r=edgeRadius(island,a)*.98,x=island.x+Math.cos(a)*r,z=island.z+Math.sin(a)*r;
      batch.add('pebble',j%3?'#b3ad8e':'#a9b087',[x,island.y-.48-rng()*.45,z],[.35+rng()*.5,.45+rng()*.45,.35+rng()*.5],[rng(),rng()*4,rng()]);
      if(j%2===0) {
        const len=.7+rng()*2;batch.add('cylinder','#608f65',[x,island.y-len*.5,z],[.045,len,.045],[],false);
        for(let k=0;k<3;k++)batch.add('pebble','#739f69',[x+(rng()-.5)*.17,island.y-k*len/3,z],[.18,.11,.09],[0,a,.4],false);
      }
    }
    for(let j=0;j<110;j++) {
      const a=rng()*TAU,r=Math.sqrt(rng())*(island.r-.7),x=island.x+Math.cos(a)*r,z=island.z+Math.sin(a)*r;
      if(Math.abs(x-island.x)<1.1 && Math.abs(z-island.z)<4)continue;
      const h=.12+rng()*.25;
      batch.add('cone',j%3?'#76a560':'#b9ce7b',[x,island.y+h*.5,z],[.065,h,.065],[0,rng()*TAU,(rng()-.5)*.45],false);
      if(j%5===0) {
        batch.add('ball',['#f3d985','#e4e2bd','#d9afcd'][j%3],[x,island.y+.16,z],[.075,.055,.075],[],false);
        batch.add('ball','#e8cc82',[x+.13,island.y+.1,z+.1],[.055,.04,.055],[],false);
      }
    }
  }
  BRIDGES.forEach(b=>bridge(batch,b));
  path(batch,0,6,0,-2.7,0,rng);path(batch,-1,0,-8,-2,0,rng);path(batch,1,0,8,-2,0,rng);
  path(batch,-15,-3,-19,-3,.6,rng);path(batch,15,-3,21,-4,.4,rng);path(batch,0,-20,0,-27,1.8,rng);
  for(const o of OBSTACLES.slice(1)) {
    if(o.y===.4) {
      for(let j=0;j<4;j++) batch.add('box',j%2?'#a8b1a0':'#c0c4ad',[o.x,o.y+.28+j*.56,o.z],[.9,.52,.88],[0,j*.035,0]);
      batch.add('box','#698b66',[o.x,o.y+2.38,o.z],[1.03,.16,1.02]);
    } else tree(batch,o.x,o.y,o.z,o.y===1.8?.75:.72);
  }
  tree(batch,TREE.x,TREE.y,TREE.z,1.15,true);
  // Ruined arch: two collidable pillars and a weathered lintel.
  batch.add('box','#b9beaa',[20.7,2.85,-6.8],[6.8,.45,.9],[0,0,.04]);
  for(let k=0;k<5;k++)mushroom(batch,-7.1+k*.42,0,3.5+Math.sin(k)*.5,.5+rng()*.7,k%2?'#da9972':'#d5b780');
  for(let k=0;k<5;k++)mushroom(batch,-24.1+k*.43,.6,-5.2+Math.sin(k),.5+rng()*.5,'#b694c2');
  const stones=STONES.map((s,i)=>{
    const group=new T.Group();group.position.set(s.x,s.y,s.z);
    mesh('disk','#bfc6aa',[s.r,.28,s.r],[0,-.14,0],group);
    mesh('pebble','#8baba0',[s.r*.8,.7,s.r*.8],[0,-.6,0],group);
    const ring=mesh('ring','#a2e1d4',[s.r*.78,s.r*.78,s.r*.78],[0,.014,0],group,.5);ring.rotation.x=-Math.PI/2;
    scene.add(group);return group;
  });
  const flowers=FLOWERS.map((f,i)=>{
    const group=new T.Group();group.position.set(f.x,f.y,f.z);
    mesh('cylinder','#669467',[.075,.75,.075],[0,.37,0],group);
    const head=new T.Group();head.position.y=.88;group.add(head);
    for(let j=0;j<6;j++) {
      const a=j/6*TAU,p=mesh('petal',f.color,[.29,.115,.52],[Math.sin(a)*.36,0,Math.cos(a)*.36],head,.13);p.rotation.y=a;
    }
    mesh('ball','#fff1b0',[.23,.19,.23],[0,.1,0],head,.3);
    const leaf=mesh('petal','#82a973',[.13,.045,.4],[.22,.3,0],group);leaf.rotation.y=1;
    scene.add(group);return {group,head};
  });
  const shrines=SHRINES.map(s=>{
    const group=new T.Group();group.position.set(s.x,s.y,s.z);
    mesh('disk','#c1c8ac',[.85,.18,.85],[0,.09,0],group);
    mesh('cylinder','#9da993',[.44,.5,.44],[0,.4,0],group);
    const crystal=mesh('pebble',s.color,[.24,.46,.24],[0,1.4,0],group,.65);
    const ring=mesh('ring',s.color,[.78,.78,.78],[0,1.4,0],group,.35);
    const beam=new T.Mesh(new T.CylinderGeometry(.13,.44,9,20,1,true),new T.MeshBasicMaterial({color:s.color,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));beam.position.y=5;group.add(beam);
    scene.add(group);return {group,crystal,ring,beam};
  });
  const seeds=new T.InstancedMesh(geo.pebble,new T.MeshStandardMaterial({color:'#ffe399',emissive:'#edbf61',emissiveIntensity:.65,roughness:.5}),SEEDS.length);seeds.instanceMatrix.setUsage(T.DynamicDrawUsage);seeds.frustumCulled=false;scene.add(seeds);
  const windOrbs=WIND_ORBS.map(o=>{
    const group=new T.Group();group.position.set(o.x,o.y,o.z);
    mesh('pebble','#acf6ed',[.2,.3,.2],[0,0,0],group,1);
    const ring=mesh('ring','#8fe4e4',[.42,.42,.42],[0,0,0],group,.6);ring.rotation.x=.5;scene.add(group);return group;
  });
  // Lumi is a tiny woodland spirit with a leaf-shaped ear and warm lantern.
  const guide=new T.Group();guide.position.set(GUIDE.x,GUIDE.y,GUIDE.z);
  mesh('petal','#f4dfb8',[.38,.45,.32],[0,.53,0],guide);
  mesh('ball','#fff0ce',[.36,.31,.3],[0,1.02,.05],guide);
  for(const x of [-.23,.23]) {
    const ear=mesh('cone','#e6bc83',[.16,.46,.13],[x,1.39,.02],guide);ear.rotation.z=-x*1.3;
    mesh('ball','#36565a',[.04,.058,.025],[x*.48,1.05,.325],guide);
  }
  const tail=mesh('petal','#eac487',[.25,.5,.22],[.33,.5,-.27],guide);tail.rotation.z=-.7;
  scene.add(guide);
  const chest=new T.Group();chest.position.set(CHEST.x,CHEST.y,CHEST.z);chest.rotation.y=.5;
  mesh('box','#9c7550',[.95,.48,.66],[0,.27,0],chest);
  const lid=new T.Group();lid.position.set(0,.51,-.32);chest.add(lid);
  mesh('petal','#bc9563',[.51,.22,.34],[0,0,.32],lid);
  for(const x of [-.34,.34]) mesh('box','#e2c282',[.08,.45,.69],[x,.28,0],chest);
  mesh('box','#ffdc8b',[.16,.19,.055],[0,.39,.35],chest,.2);scene.add(chest);
  const heart=new T.Group();heart.position.set(TREE.x,2.45,TREE.z+1);
  const heartCore=mesh('pebble','#f6d47c',[.24,.4,.24],[0,0,0],heart,.2);
  for(let i=0;i<3;i++){const r=mesh('ring',SHRINES[i].color,[.55+i*.14,.55+i*.14,.55+i*.14],[0,0,0],heart,.1);r.rotation.set(i*.8,i*.6,0);}scene.add(heart);
  const guardians=GUARDS.map((g,i)=>{const v=guardian(i);v.root.position.set(g.x,.4,g.z);scene.add(v.root);return v;});
  const hero=makeHero();scene.add(hero.root);
  // Distant clouds use the same inexpensive instanced geometry as the landscape.
  for(let i=0;i<28;i++) {
    const a=i/28*TAU,r=30+rng()*33,cx=Math.cos(a)*r,cz=-9+Math.sin(a)*r,cy=-7-rng()*10;
    for(let j=0;j<4;j++)batch.add('ball',j%2?'#e4e6d8':'#eff0df',[cx+j*2.2,cy+rng(),cz+rng()*2],[4+rng()*2,1.3+rng(),2.5+rng()*2],[0,rng()*4,0],false);
  }
  for(let i=0;i<6;i++){
    const a=i/6*TAU,x=Math.cos(a)*55,z=-15+Math.sin(a)*50;
    batch.add('pebble','#89afa8',[x,-4-rng()*6,z],[4+rng()*5,4+rng()*6,4+rng()*4],[0,rng()*4,.15],false);
  }
  batch.finish();
  return { scene,sun,hero,stones,flowers,shrines,seeds,windOrbs,guide,chest,lid,heart,heartCore,guardians };
}
