import {makeHero} from './hero.js';
export {makeHero} from './hero.js';
import * as T from 'three';
import {buildGarden} from './garden.js';
import {buildFloating} from './floating.js';
import {buildSky} from './sky.js';
import {BALL_RADIUS} from './ball.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import { ISLANDS, BRIDGES, STONES, FLOWERS, SHRINES, WIND_ORBS, OBSTACLES, SEEDS, TREE, GUIDE, CHEST, GUARDS, edgeRadius, onIsland, random, TAU } from './world.js';

const C = { grass: '#93b969', moss: '#557957', bark: '#9d7451', rock: '#99a69a', cream: '#fff1cf', gold: '#ffce73', green: '#396e58', dark: '#264e4b' };
const geo = {
  ball: new T.IcosahedronGeometry(1, 2), pebble: new T.IcosahedronGeometry(1, 1),
  grit: new T.IcosahedronGeometry(1,0), bud: new T.SphereGeometry(1,8,5),
  box: new T.BoxGeometry(1,1,1), cylinder: new T.CylinderGeometry(1,1,1,8),
  cone: new T.ConeGeometry(1,1,8), ring: new T.TorusGeometry(1,.075,5,24),
  disk: new T.CylinderGeometry(1,1,1,16), petal: new T.SphereGeometry(1,12,8),
};
const standard = new T.MeshStandardMaterial({ color: '#ffffff', roughness: .88, metalness: 0 });
const noShadow = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: T.DoubleSide });
const tmp = new T.Object3D(), white = new T.Color('#ffffff'), up = new T.Vector3(0,1,0);
function material(color, emissive = 0) { return new T.MeshStandardMaterial({ color, roughness: .72, emissive: color, emissiveIntensity: emissive }); }
function mesh(shape, color, scale, position, parent, emissive = 0) {
  const m = new T.Mesh(geo[shape], material(color, emissive));
  m.scale.set(...scale); m.position.set(...position); m.castShadow = false; m.receiveShadow = true;
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
  const hemi=new T.HemisphereLight('#eff8e4','#698a82',2.1);scene.add(hemi);
  const sun=new T.DirectionalLight('#fff0ce',3.3);sun.position.set(10,50,10);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-55,right:55,top:85,bottom:-85,near:.5,far:200});
  sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00025;sun.shadow.normalBias=.055;sun.shadow.radius=3;
  sun.target.position.set(0,0,7);scene.add(sun,sun.target);
  const rim=new T.DirectionalLight('#b8e9eb',.9);rim.position.set(20,15,-35);scene.add(rim);
  const batch=new Batch(scene),rng=random(61922);
  const garden=buildGarden(scene,batch,mesh);
  const floating=buildFloating(scene,batch,mesh),sky=buildSky(scene,sun,hemi,rim);
  const stones=STONES.map((s,i)=>{
    const group=new T.Group();group.position.set(s.x,s.y,s.z);
    const top=s.kind==='wood'?'#ae9267':'#bec6a6',bottom=s.kind==='wood'?'#78664b':'#8baba0';
    if(s.move){mesh('disk',top,[s.r,.28,s.r],[0,-.14,0],group);mesh('pebble',bottom,[s.r*.8,.7,s.r*.8],[0,-.6,0],group);}
    else {batch.add('disk',top,[s.x,s.y-.14,s.z],[s.r,.28,s.r],[],false);batch.add('pebble',bottom,[s.x,s.y-.6,s.z],[s.r*.8,.7,s.r*.8],[],false);}
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
  const hero=makeHero();scene.add(hero.root);hero.body.children[0].castShadow=true;
  const ball=new T.Group();ball.name='garden-football';scene.add(ball);
  mesh('ball','#e9e5cd',[BALL_RADIUS,BALL_RADIUS,BALL_RADIUS],[0,0,0],ball);
  const patches=[],icosa=new T.IcosahedronGeometry(1,0),seen=new Set(),normal=new T.Vector3(),rotation=new T.Quaternion(),forward=new T.Vector3(0,0,1);
  for(let i=0;i<icosa.attributes.position.count;i++){
    normal.fromBufferAttribute(icosa.attributes.position,i).normalize();const key=normal.toArray().map(n=>n.toFixed(4)).join(',');if(seen.has(key))continue;seen.add(key);
    rotation.setFromUnitVectors(forward,normal);const g=new T.CircleGeometry(.24,5);g.applyQuaternion(rotation);g.translate(normal.x*.753,normal.y*.753,normal.z*.753);patches.push(g);
  }
  const markings=new T.Mesh(mergeGeometries(patches),new T.MeshStandardMaterial({color:'#344c49',roughness:.9,side:T.DoubleSide}));ball.add(markings);icosa.dispose();patches.forEach(g=>g.dispose());
  batch.finish();
  return { scene,sun,sky,floating,garden,hero,ball,stones,flowers,shrines,seeds,windOrbs,guide,chest,lid,heart,heartCore,guardians };
}
