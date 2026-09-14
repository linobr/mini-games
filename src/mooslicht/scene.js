import * as T from 'three';
import {buildGarden} from './garden.js';
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
  m.scale.set(...scale); m.position.set(...position); m.castShadow = emissive === 0 && shape !== 'ring'; m.receiveShadow = true;
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

export function makeHero() {
  const root=new T.Group(),body=new T.Group();root.add(body);
  const cape=mesh('cone','#487b94',[.49,.7,.42],[0,.94,0],body);cape.rotation.y=Math.PI/8;
  mesh('ball','#e7c293',[.19,.22,.17],[0,1.22,.05],body);
  mesh('petal','#f9dcb4',[.31,.32,.29],[0,1.53,.03],body);
  mesh('ball','#916d47',[.34,.18,.31],[0,1.78,-.04],body);
  for(let i=0;i<13;i++){const a=i*2.4;mesh('ball',i%2?'#aa8256':'#957047',[.1,.105,.11],[Math.cos(a)*.29,1.75+Math.sin(i)*.09,Math.sin(a)*.23],body);}
  const cloak=mesh('cone','#31536f',[.42,.78,.19],[0,.94,-.25],body);cloak.rotation.x=-.15;
  mesh('box','#eac776',[.63,.065,.46],[0,.8,0],body);
  mesh('ball','#f1d885',[.075,.08,.05],[0,1.2,.37],body,.15);
  const leaf=mesh('petal','#a5c777',[.09,.29,.035],[.18,1.99,-.03],body);leaf.rotation.z=-.52;
  for(const x of [-.115,.115]) {
    mesh('petal','#4388bd',[.055,.069,.025],[x,1.55,.292],body);
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
  mesh('cylinder','#487b94',[.10,.31,.1],[0,-.17,0],arm);mesh('ball','#f3d4a7',[.12,.12,.12],[0,-.33,.015],arm);
  const lamp=new T.Group();lamp.position.set(0,-.51,.06);arm.add(lamp);
  mesh('box','#866547',[.21,.27,.21],[0,0,0],lamp);
  const lampCore=mesh('ball','#ffdb83',[.095,.115,.095],[0,0,.083],lamp,1.3);
  const swordArm=new T.Group();swordArm.position.set(.42,1.14,0);body.add(swordArm);
  mesh('cylinder','#487b94',[.1,.31,.1],[0,-.17,0],swordArm);mesh('ball','#f3d4a7',[.12,.12,.12],[0,-.34,0],swordArm);
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
  mesh('petal','#7c9d55',[.52,.18,.41],[0,1.49,0],body);
  for(let i=0;i<4;i++){const a=i*2.4;const sprout=mesh('petal','#98b966',[.07,.24,.03],[Math.cos(a)*.24,1.75,Math.sin(a)*.2],body);sprout.rotation.z=Math.sin(a)*.6;}
  const cap=mesh('petal','#d8a579',[.17,.1,.17],[.27,1.74,.07],body);
  const warning=new T.Mesh(new T.RingGeometry(.68,1.75,40),new T.MeshBasicMaterial({color:'#f0a284',transparent:true,opacity:.25,side:T.DoubleSide,depthWrite:false}));warning.rotation.x=-Math.PI/2;warning.position.y=.025;root.add(warning);warning.visible=false;
  return {id,root,body,warning};
}

export function buildScene() {
  const scene=new T.Scene();scene.background=new T.Color('#a7c9c3');scene.fog=new T.FogExp2('#c9d7b9',.004);
  const sky=new T.Mesh(new T.SphereGeometry(180,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
    uniforms:{top:{value:new T.Color('#70acbf')},bottom:{value:new T.Color('#f3dfb7')}},
    vertexShader:'varying float h; void main(){h=position.y/180.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying float h; uniform vec3 top; uniform vec3 bottom;\nvoid main(){\ngl_FragColor=vec4(mix(bottom,top,smoothstep(-.15,.65,h)),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
  scene.add(sky);
  scene.add(new T.HemisphereLight('#eff8e4','#698a82',2.1));
  const sun=new T.DirectionalLight('#fff0ce',3.3);sun.position.set(10,50,10);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-43,right:43,top:60,bottom:-60,near:.5,far:160});
  sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00025;sun.shadow.normalBias=.055;sun.shadow.radius=3;
  sun.target.position.set(0,0,-20);scene.add(sun,sun.target);
  const rim=new T.DirectionalLight('#b8e9eb',.9);rim.position.set(20,15,-35);scene.add(rim);
  const batch=new Batch(scene),rng=random(61922);
  const garden=buildGarden(scene,batch,mesh);
  const stones=STONES.map((s,i)=>{
    const group=new T.Group();group.position.set(s.x,s.y,s.z);
    mesh('disk',s.kind==='wood'?'#ae9267':'#bec6a6',[s.r,.28,s.r],[0,-.14,0],group);
    mesh('pebble',s.kind==='wood'?'#78664b':'#8baba0',[s.r*.8,.7,s.r*.8],[0,-.6,0],group);
    const ring=mesh('ring',s.kind==='wood'?'#d4c28f':'#bfd0a4',[s.r*.78,s.r*.78,s.r*.78],[0,.014,0],group,.06);ring.rotation.x=-Math.PI/2;group.userData.ring=ring;
    scene.add(group);return group;
  });
  const flowers=FLOWERS.map((f,i)=>{
    const group=new T.Group();group.position.set(f.x,f.y,f.z);
    mesh('cylinder',['#aa8054','#89bdc0','#abb6a8'][i],[.28,.65,.28],[0,.32,0],group);
    mesh('ring',f.color,[.42,.42,.42],[0,.65,0],group,.12).rotation.x=Math.PI/2;
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
  const heart=new T.Group();heart.position.set(TREE.x,2.45,TREE.z+1.45);
  const heartCore=mesh('pebble','#f6d47c',[.24,.4,.24],[0,0,0],heart,.2);
  for(let i=0;i<3;i++){const r=mesh('ring',SHRINES[i].color,[.55+i*.14,.55+i*.14,.55+i*.14],[0,0,0],heart,.1);r.rotation.set(i*.8,i*.6,0);}scene.add(heart);
  const guardians=GUARDS.map((g,i)=>{const v=guardian(i);v.root.position.set(g.x,g.y||0,g.z);scene.add(v.root);return v;});
  const hero=makeHero();scene.add(hero.root);
  batch.finish();
  return { scene,sun,garden,hero,stones,flowers,shrines,seeds,windOrbs,guide,chest,lid,heart,heartCore,guardians };
}
