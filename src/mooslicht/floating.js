import * as T from 'three';
import {GARDEN_OUTLINE,SATELLITES,SHRINES,TREE,PALM,edgeRadius,random,TAU} from './world.js';

// One coloured mesh per island, four faceted strata; the top uses the collision outline.
export function islandGeometry(outline,cx,cz,y,depth){
  const positions=[],colors=[],indices=[],rng=random(Math.round(cx*33+cz*14+733)),c=new T.Color();
  const layers=[{s:1,y:0,c:'#557748'},{s:1.01,y:-.65,c:'#776f4a'},{s:.86,y:-depth*.36,c:'#6a6b66'},{s:.49,y:-depth*.8,c:'#5f666c'},{s:.13,y:-depth,c:'#555e65'}];
  positions.push(cx,y,cz);c.set('#557748');colors.push(c.r,c.g,c.b);
  layers.forEach((layer,l)=>outline.forEach((p,i)=>{
    positions.push(cx+(p.x-cx)*layer.s,y+layer.y+(l>1?Math.sin(i*2.1)*depth*.07:0),cz+(p.z-cz)*layer.s);
    c.set(layer.c).offsetHSL((rng()-.5)*(l?.025:.004),0,(rng()-.5)*(l?.055:.008));colors.push(c.r,c.g,c.b);
  }));
  const n=outline.length;
  // Ear clipping also supports the concave garden return; a centre fan would
  // fill the bay outside the house and disagree with the walking surface.
  for(const [a,b,d] of T.ShapeUtils.triangulateShape(outline.map(p=>new T.Vector2(p.x,p.z)),[]))indices.push(1+d,1+b,1+a);
  for(let i=0;i<n;i++){const j=(i+1)%n;for(let l=0;l<layers.length-1;l++){const a=1+l*n+i,b=1+l*n+j;indices.push(a,b,b+n,a,b+n,a+n);}}
  // Closed tapered bottom, unlike an open cylinder seen from below.
  positions.push(cx,y-depth*1.08,cz);c.set('#50585e');colors.push(c.r,c.g,c.b);
  for(let i=0;i<n;i++)indices.push(positions.length/3-1,1+(layers.length-1)*n+i,1+(layers.length-1)*n+(i+1)%n);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function satelliteOutline(s){return s.outline;}
export function buildFloating(scene,batch,mesh){
  const rng=random(90024),material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}),islands=[],crystals=[];
  // Fine turf variation avoids the huge radial colour wedges of the island's coarse top mesh.
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 turfPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nturfPosition=position;');
    shader.fragmentShader='varying vec3 turfPosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float topFace=1.-smoothstep(.02,.35,abs(turfPosition.y));
      float turfPatch=sin(turfPosition.x*.63+sin(turfPosition.z*.27))*sin(turfPosition.z*.71);
      float fine=sin(turfPosition.x*31.)*sin(turfPosition.z*37.);
      float detail=1.-smoothstep(.04,.16,max(fwidth(turfPosition.x),fwidth(turfPosition.z)));
      diffuseColor.rgb*=1.+topFace*(turfPatch*.035+fine*.04*detail);
    `);
  };
  const make=(outline,x,z,y,depth)=>{const m=new T.Mesh(islandGeometry(outline,x,z,y,depth),material);m.receiveShadow=true;scene.add(m);islands.push(m);return m;};
  make(GARDEN_OUTLINE,0,7,0,27);
  // Broken turf lips, hanging roots and small rock shelves live on the same edge.
  for(let i=0;i<GARDEN_OUTLINE.length;i++){
    const p=GARDEN_OUTLINE[i],inward=new T.Vector3(-p.x,0,7-p.z).normalize();
    batch.add('pebble',i%3?'#788954':'#919b78',[p.x+inward.x*.4,-.36,p.z+inward.z*.4],[.9,.45,1.2],[0,i,0],false);
    if(i%3===0){
      const end=[p.x*.86,-7-rng()*7,7+(p.z-7)*.87];batch.beam([p.x-.2,-.3,p.z],end,.09,'#655d42',false);
      batch.beam(end,[end[0]-.8,end[1]-2,end[2]+.6],.045,'#887b51',false);
    }
    if(i%8===0){const c=mesh('cone',i%2?'#b6caa0':'#a2c4c1',[.4,2.6,.45],[p.x*.94,-3.3,7+(p.z-7)*.94],scene,.2);c.rotation.z=.35;crystals.push(c);}
  }
  for(const s of SATELLITES){
    make(satelliteOutline(s),s.x,s.z,s.y,7+s.r*.5);
    for(let j=0;j<18;j++){
      const a=rng()*TAU,r=1+rng()*(s.r-2),x=s.x+Math.cos(a)*r,z=s.z+Math.sin(a)*r;
      if(s.kind==='pebble')batch.add('pebble',['#d6d4bf','#aeb7a1','#ece5c9'][j%3],[x,s.y+.25,z],[.4+rng()*.4,.35,.5],[rng(),a,0],false);
      else if(s.kind==='echo'){
        if(j<8)batch.add('cylinder','#a19368',[x,s.y+.24,z],[.25,1.8,.25],[Math.PI/2,a,0],false);
      }else{
        batch.add('petal',s.kind==='bloom'?['#ecc3b7','#eac778','#c0b7d7'][j%3]:'#92b365',[x,s.y+.35,z],[.45,.27,.45],[0,a,0],false);
        batch.beam([x,s.y,z],[x,s.y+.4,z],.035,'#72884e',false);
      }
    }
    const ring=mesh('ring','#c4d6a1',[1.05,1.05,1.05],[s.x,s.y+.025,s.z],scene,.18);ring.rotation.x=-Math.PI/2;crystals.push(ring);
    if(s.kind==='pebble'){
      for(const dx of [-1.6,1.6])batch.add('pebble','#a1afa2',[s.x+dx,s.y+1.4,s.z],[.5,1.5,.55],[0,dx,.1],false);
      batch.add('pebble','#bdc7ab',[s.x,s.y+2.9,s.z],[2,.45,.6],[0,0,.08],false);
    }
    if(s.kind==='echo'){
      batch.beam([s.x,s.y,s.z],[s.x+.25,s.y+4,s.z],.2,'#88724e',false);
      batch.beam([s.x-1.5,s.y+3.5,s.z],[s.x+1.5,s.y+3.6,s.z],.12,'#88724e',false);
      for(let j=0;j<4;j++)batch.add('cylinder','#bfb78b',[s.x-1+j*.7,s.y+2.5,s.z],[.08,.8+j*.2,.08],[],false);
    }
  }
  // One instance batch for all far fragments; no colliders, shadows or per-frame allocation.
  const distant=new T.Group();scene.add(distant);
  const farRock=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#7e9aa0',roughness:1,flatShading:true}),28);
  const obj=new T.Object3D();
  for(let i=0;i<28;i++){const a=i/28*TAU,r=135+rng()*65;obj.position.set(Math.cos(a)*r,-4+rng()*34,7+Math.sin(a)*r);obj.scale.set(4+rng()*8,5+rng()*15,4+rng()*8);obj.rotation.set(rng()*.3,a,rng()*.5);obj.updateMatrix();farRock.setMatrixAt(i,obj.matrix);}
  farRock.computeBoundingSphere();distant.add(farRock);
  // A tree silhouette and rock arch make the horizon more than scattered stones.
  for(const [x,z] of [[-87,-79],[84,-99]]){
    batch.add('pebble','#7e9aa0',[x,0,z],[14,8,12],[],false);batch.add('disk','#789285',[x,6,z],[13,.5,11],[],false);
    batch.beam([x,6,z],[x,28,z],1,'#718d90',false);
    for(let i=0;i<4;i++)batch.add('pebble','#809e96',[x+Math.sin(i*2.4)*6,27+i,z+Math.cos(i*2.4)*5],[8,3,7],[],false);
  }
  for(const x of [88,106])batch.add('pebble','#7f989e',[x,6,38],[4,12,5],[0,0,x===88?-.2:.2],false);
  batch.add('pebble','#8ca1a7',[97,17,38],[12,3,5],[0,0,.08],false);
  const clouds=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:'#f0e4d2',roughness:1,flatShading:false}),46);
  for(let i=0;i<46;i++){const a=i*2.4,r=20+rng()*130;obj.position.set(Math.cos(a)*r,-31-rng()*20,7+Math.sin(a)*r);obj.scale.set(12+rng()*15,2+rng()*4,6+rng()*10);obj.rotation.set(0,a,0);obj.updateMatrix();clouds.setMatrixAt(i,obj.matrix);}
  clouds.computeBoundingSphere();scene.add(clouds);
  // Luminescent veins are merged into a single mesh, revealed with the lights.
  const veinPositions=[];
  for(let i=0;i<GARDEN_OUTLINE.length;i+=4){
    const p=GARDEN_OUTLINE[i],points=[new T.Vector3(p.x,-.9,p.z),new T.Vector3(p.x*.96,-4,7+(p.z-7)*.96),new T.Vector3(p.x*.75,-10,7+(p.z-7)*.75)];
    const g=new T.TubeGeometry(new T.CatmullRomCurve3(points),8,.045,3,false).toNonIndexed();veinPositions.push(...g.attributes.position.array);g.dispose();
  }
  const vg=new T.BufferGeometry();vg.setAttribute('position',new T.Float32BufferAttribute(veinPositions,3));vg.computeVertexNormals();
  const veins=new T.Mesh(vg,new T.MeshBasicMaterial({color:'#9bc4a6',transparent:true,opacity:0,depthWrite:false}));scene.add(veins);
  // One travelling ribbon: last shrine -> stepping-stone path -> palm -> heart tree.
  const path=new T.Group();scene.add(path);const ribbons=[];
  for(const shrine of SHRINES){
    const points=[new T.Vector3(shrine.x,shrine.y+.4,shrine.z),new T.Vector3(-6,.22,-29),new T.Vector3(-12,.18,-17),new T.Vector3(-10,.18,-3),new T.Vector3(PALM.x,.4,PALM.z),new T.Vector3(12,.3,-11),new T.Vector3(TREE.x,.25,TREE.z)];
    const curve=new T.CatmullRomCurve3(points),g=new T.TubeGeometry(curve,110,.075,4,false);
    const m=new T.Mesh(g,new T.MeshBasicMaterial({color:'#e6cf89',transparent:true,opacity:.85,depthWrite:false}));path.add(m);ribbons.push(m);
  }
  path.visible=false;
  const pulse=new T.Mesh(new T.CylinderGeometry(.15,1.7,34,16,1,true),new T.MeshBasicMaterial({color:'#d6e6b1',transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));pulse.position.set(TREE.x,17,TREE.z);scene.add(pulse);
  const canopy=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshBasicMaterial({color:'#d6dda1'}),42);
  for(let i=0;i<42;i++){const a=i*2.4;obj.position.set(TREE.x+Math.cos(a)*(2+i%4),21+(i%5)*.7,TREE.z+Math.sin(a)*(2+i%4));obj.scale.setScalar(.06+(i%3)*.025);obj.updateMatrix();canopy.setMatrixAt(i,obj.matrix);}canopy.computeBoundingSphere();canopy.visible=false;scene.add(canopy);
  return {islands,clouds,farRock,veins,crystals,ribbons,pulse,canopy,
    update(time,game,night,finale,motion){
      clouds.position.x=motion?0:Math.sin(time*.012)*3;
      veins.material.opacity=.02+game.energy*.28+(game.finished?.22:0);
      crystals.forEach(c=>c.material.emissiveIntensity=.12+game.energy*.35+night*.18);
      path.visible=game.finished;const active=SHRINES.findIndex(s=>s.id===game.lastLight);
      ribbons.forEach((m,i)=>{m.visible=i===(active<0?2:active);m.geometry.setDrawRange(0,Math.floor(Math.min(1,Math.max(0,(finale-1)/3))*110)*24);m.material.opacity=finale>7?.26:.85;});
      canopy.visible=game.finished&&finale>4;
      pulse.material.opacity=game.finished&&!motion?Math.max(0,1-Math.abs(finale-6.8)/1.5)*.19:0;
    },
    quality(low,high){farRock.count=low?10:high?28:18;clouds.count=low?18:high?46:30;canopy.count=low?20:42;}
  };
}
