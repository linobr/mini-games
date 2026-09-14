import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GARDEN,PALM,SHED,TREE,STONES,WALLS,SECRETS,BRIDGES,LIFTING_PLATES,HEDGE_CLUSTERS,random,TAU} from './world.js';

// Animated vertex displacement is shared: one uniform, no per-blade JS updates.
function windMaterial(color, strength=.12) {
  const time={value:0};
  const material=new T.MeshStandardMaterial({color,roughness:.92,side:T.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.uniforms.gardenTime=time;
    shader.vertexShader='uniform float gardenTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 worldBase = vec4(position,1.0);
      #ifdef USE_INSTANCING
      worldBase = instanceMatrix * worldBase;
      #endif
      worldBase = modelMatrix * worldBase;
      float sway = sin(gardenTime*1.25+worldBase.x*.31+worldBase.z*.19);
      transformed.x += sway * ${strength.toFixed(3)} * max(0.,position.y);
      transformed.z += cos(gardenTime*.8+worldBase.z*.37)*${(strength*.3).toFixed(3)}*max(0.,position.y);`);
  };
  material.customProgramCacheKey=()=>`garden-wind-${strength}`;
  return {material,time};
}
function leafGeometry(){
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.4,.55,0,0,.5,.12,.4,.55,0,0,1.3,0],3));
  g.setIndex([0,1,2,0,2,3,1,4,2,2,4,3]);g.computeVertexNormals();return g;
}
function bladeGeometry(){
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute([-.08,0,0,.08,0,0,-.035,.65,.06,.045,.65,.06,.04,1,.12],3));
  g.setIndex([0,1,2,1,3,2,2,3,4]);g.computeVertexNormals();return g;
}

export function buildGarden(scene,batch,mesh){
  const rng=random(20260914),wind=[],roof=[],magic=[],tmp=new T.Object3D();
  const add=(shape,color,pos,scale,rot=[],shadow=true)=>batch.add(shape,color,pos,scale,rot,shadow);
  // White rendered house on the left, with repeated window bays and rain pipe.
  add('box','#e8e5d6',[-24,15,-16],[4,30,74]);
  add('box','#d6d9cd',[-24,30.12,-16],[4.6,.24,74.5]);
  for(const z of [-42,-23,-4,13]){
    add('box','#f8f4de',[-21.92,17,z],[.22,7.4,5.6]);
    add('box','#829b9b',[-21.75,17,z],[.12,6.7,4.9]);
    add('box','#fff8e6',[-21.6,17,z],[.14,6.8,.16]);
    add('box','#fff8e6',[-21.6,17,z],[.14,.16,5]);
    add('box','#d4d4c5',[-21.4,13.5,z],[1.2,.3,6.3]);
  }
  add('cylinder','#9daaa6',[-21.65,13,-31],[.2,26,.2]);
  // The familiar stone strip and irregular L-shaped stepping-stone path.
  add('box','#bcbaac',[-18,.025,-5],[6,.05,47]);
  for(let i=0;i<720;i++){
    const x=-21+rng()*6,z=-27+rng()*45,s=.15+rng()*.5;
    add('pebble',['#e7e2cf','#a5aaa0','#c8c3b1','#8e998e'][i%4],[x,s*.28,z],[s,s*.45,s*.78],[rng(),rng()*6,rng()],i%6===0);
  }
  const slab=(x,z,w=3.6,d=3.6)=>add('box','#c9c9b6',[x,.04,z],[w,.08,d],[0,(rng()-.5)*.06,0]);
  for(let z=12;z>=-26;z-=4.2)slab(-12,z);
  slab(-8,-28);slab(-4,-30);slab(0,-31.8);
  for(let z=-34;z>-50;z-=3)slab(-8,z,2,2.8);
  // Deck, white plank walls and the asymmetric glazed double door/window.
  add('box','#77634c',[3,.28,-40],[21,.56,18]);
  for(let x=-7.4;x<14;x+=.53)add('box',Math.round(x*10)%2?'#75634f':'#826f57',[x,.575,-40],[.47,.045,18]);
  for(const b of WALLS.slice(1))add('box','#dcded0',[b.x,b.y+b.h/2,b.z],[b.w,b.h,b.d]);
  for(let x=-6.8;x<13;x+=.66){
    if(Math.abs(x)>2.1)add('box','#f1ecda',[x,7.2,-33.17],[.045,13,.06]);
    add('box','#ebe7d7',[x,7.2,-48.19],[.045,13,.06]);
  }
  // Open doors leave the entire entry traversable; glazing echoes the reference.
  for(const side of [-1,1]){
    add('box','#ecebdc',[side*2.25,4.9,-32.2],[.22,8.6,2.8]);
    add('box','#6e918b',[side*2.1,6,-32.2],[.06,4.8,2.25]);
  }
  add('box','#fff6dd',[8.5,8,-33.15],[4.7,4.1,.25]);
  const windowGlow=mesh('box','#85968a',[4.1,3.5,.12],[8.5,8,-32.98],scene,.02);magic.push(windowGlow);
  for(let i=0;i<24;i++){const x=-6+i*.8;add('petal','#839063',[x,13.85,-33.25],[.6,.16,.3],[0,i,0],false);}
  for(const x of [6.5,10.5])add('box','#ece7d4',[x,8,-32.84],[.09,3.5,.08]);
  // Gable front and roof, lower walkable roof plane meets the log climb.
  const gable=new T.BufferGeometry();
  gable.setAttribute('position',new T.Float32BufferAttribute([-7,14,-33.5,13,14,-33.5,3,18.5,-33.5],3));gable.computeVertexNormals();
  const gm=new T.Mesh(gable,new T.MeshStandardMaterial({color:'#d9ddcd',side:T.DoubleSide}));scene.add(gm);
  for(const side of [-1,1]){
    const r=mesh('box','#776a67',[11.65,.38,17],[3+side*5.15,16.2,-41],scene);r.rotation.z=-side*.41;r.castShadow=true;roof.push(r);
    for(let z=-49;z<=-33;z+=1.2){const strip=mesh('box','#958479',[11.65,.035,.065],[3+side*5.15,16.44,z],scene);strip.rotation.z=-side*.41;roof.push(strip);}
  }
  // The flat roof ledge is the actual platform; raised gables are decorative.
  const roofFloor=mesh('box','#88796a',[20,.16,15],[3,13.92,-41],scene);roof.push(roofFloor);
  // Workbench inside the house of echoes and a glowing door lantern.
  add('box','#96704b',[3,2,-47],[13,.4,1.5]);
  for(const x of [-3,9])add('box','#745d45',[x,1,-47],[.3,2,.6]);
  add('box','#e5dfc8',[3,12,-32.8],[1,1.5,.8]);
  const lamp=mesh('ball','#ffc973',[.32,.5,.28],[3,12,-32.32],scene,.15);magic.push(lamp);
  // Dark storage chest and green wheelbarrow on the front decking.
  add('box','#374e47',[9,2.3,-30.9],[6,3.4,3]);
  add('box','#233c35',[9,4.05,-30.9],[6.15,.25,3.15]);
  add('petal','#467455',[-3,1.9,-30.9],[1.6,.8,2]);
  add('disk','#33423a',[-3,.65,-29.1],[.65,.3,.65],[Math.PI/2,0,0]);
  // Firewood wall behind the sail; reachable, staggered log ends double as steps.
  add('box','#5f5746',[-15,5,-48.5],[13,10,2]);
  for(let row=0;row<12;row++)for(let col=0;col<12;col++){
    const x=-20.5+col*1.04+(row%2)*.3,y=.45+row*.79;
    add('cylinder',row%2?'#a48b62':'#b7a17a',[x,y,-47.5],[.45,1.7,.4],[Math.PI/2,0,rng()]);
    add('disk','#685747',[x,y,-46.61],[.14,.022,.14],[Math.PI/2,0,0]);
  }
  // Giant white triangular shade sail (curved membrane rather than a flat triangle).
  const A=new T.Vector3(-21,21,-48),B=new T.Vector3(-21,18,-23),C=new T.Vector3(1,17,-32);
  const sailPos=[],sailIndices=[],N=18;
  const idx=(i,j)=>i*(N+1)-i*(i-1)/2+j;
  for(let i=0;i<=N;i++)for(let j=0;j<=N-i;j++){
    const u=i/N,v=j/N,w=1-u-v,p=A.clone().multiplyScalar(w).addScaledVector(B,u).addScaledVector(C,v);
    p.y-=Math.pow(Math.max(0,27*u*v*w),.7)*2.3;const centre=A.clone().add(B).add(C).multiplyScalar(1/3);p.lerp(centre,Math.sin(Math.PI*u)*Math.sin(Math.PI*v)*Math.sin(Math.PI*w)*.08);sailPos.push(p.x,p.y,p.z);
    if(i<N&&j<N-i){sailIndices.push(idx(i,j),idx(i+1,j),idx(i,j+1));if(j<N-i-1)sailIndices.push(idx(i+1,j),idx(i+1,j+1),idx(i,j+1));}
  }
  const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(sailPos,3));sg.setIndex(sailIndices);sg.computeVertexNormals();
  const sw=windMaterial('#fff6df',.007);wind.push(sw);const sailNight={value:0},sailPulse={value:0},compileSail=sw.material.onBeforeCompile;
  sw.material.onBeforeCompile=shader=>{compileSail(shader);shader.uniforms.sailNight=sailNight;shader.uniforms.sailPulse=sailPulse;shader.vertexShader='varying vec3 sailPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsailPosition=position;');shader.fragmentShader='varying vec3 sailPosition;uniform float sailNight;uniform float sailPulse;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat pattern=pow(.5+.5*sin(sailPosition.x*.7+sailPosition.z*.4-sailPulse*2.),8.);totalEmissiveRadiance+=vec3(.3,.4,.24)*(sailNight*.09+pattern*sailPulse*.035);');};
  const sail=new T.Mesh(sg,sw.material);sail.castShadow=true;sail.receiveShadow=true;scene.add(sail);
  for(const [a,b] of [[A,B],[B,C],[C,A]])batch.beam(a.toArray(),b.toArray(),.045,'#fff7e2');
  batch.beam(C.toArray(),[9,23,16],.045,'#e5e2ce');
  add('box','#e5e2d1',[9,11.5,16],[.65,23,.65]);
  add('disk','#c8c9ac',[9,22.92,16],[1.2,.16,1.2]);
  // A traversable enchanted braid follows the real sail attachment.
  for(const b of BRIDGES.slice(2)){
    batch.beam([b.ax,b.ay-.12,b.az],[b.bx,b.by-.12,b.bz],.24,'#a2b57d');
    const length=Math.hypot(b.bx-b.ax,b.bz-b.az);
    for(let j=0;j<=length;j+=1.25){const t=j/length;add('box','#c3c69b',[b.ax+(b.bx-b.ax)*t,b.ay+(b.by-b.ay)*t-.08,b.az+(b.bz-b.az)*t],[1.3,.12,.7],[0,Math.atan2(b.bx-b.ax,b.bz-b.az),0]);}
  }
  const lifted=LIFTING_PLATES.map(p=>mesh('disk','#bcca9c',[p.r,.18,p.r],[p.x,p.y-.09,p.z],scene));
  // Photo's solitary pruned tree, surrounded by pale pebbles.
  add('disk','#d9d7bd',[TREE.x,.015,TREE.z],[5,.035,5]);
  for(let i=0;i<230;i++){
    const a=rng()*TAU,r=1.7+Math.sqrt(rng())*3,s=.16+rng()*.24;
    add('pebble',i%3?'#eae7d5':'#c9cbbb',[TREE.x+Math.cos(a)*r,.13,TREE.z+Math.sin(a)*r],[s,.16,s*.8],[rng(),rng()*6,0],false);
  }
  for(let i=0;i<22;i++){const a=i/22*TAU;add('pebble','#babda8',[TREE.x+Math.cos(a)*5,.18,TREE.z+Math.sin(a)*5],[.65,.3,.55],[0,a,0]);}
  batch.beam([TREE.x,0,TREE.z],[TREE.x-1,18,TREE.z+.8],.87,'#73614a');
  for(let i=0;i<9;i++){
    const a=i*2.4;batch.beam([TREE.x-.5,12,TREE.z],[TREE.x+Math.cos(a)*4,20+rng()*2,TREE.z+Math.sin(a)*4],.27,'#79694e');
  }
  // Hedge has a dark interior, visible trunks, overlapping clusters and small leaves.
  for(const h of HEDGE_CLUSTERS){
    add('petal','#2b5032',[h.x,h.height*.62,h.z],[h.spread,h.height*.7,2.5],[0,h.z*.1,.08*Math.sin(h.z)],false);
    batch.beam([h.x,0,h.z],[h.x,h.height,h.z],h.r,'#665d3c',false);
    for(const side of [-1,1])batch.beam([h.x,3,h.z],[h.x+side,6,h.z+side],.09,'#6c6447',false);
  }
  for(let x=-20;x<22;x+=3.8){if(Math.abs(x-10)<4)continue;add('petal','#355735',[x,3.5+Math.sin(x),-53.5+Math.sin(x*.3)],[2.8,4.6+Math.cos(x),2.2],[0,x,.1],false);}
  const lw=windMaterial('#ffffff',.13);wind.push(lw);
  const leafCount=18500,leaves=new T.InstancedMesh(leafGeometry(),lw.material,leafCount),color=new T.Color();
  for(let i=0;i<leafCount;i++){
    let x,y,z,scale;
    if(i%4===0){const a=rng()*TAU,r=Math.sqrt(rng())*6;x=TREE.x+Math.cos(a)*r;z=TREE.z+Math.sin(a)*r;y=20+Math.sin(r/6*Math.PI)*2+rng()*3;scale=.65+rng();}
    else if(i%8===1){x=-21+rng()*44;if(Math.abs(x-10)<3.5)x-=7;y=rng()*(7.5+Math.sin(x));z=-53.5+Math.sin(x*.3)+rng()*2;scale=.6+rng()*.7;}
    else {const h=HEDGE_CLUSTERS[i%HEDGE_CLUSTERS.length],a=rng()*TAU,r=Math.sqrt(rng());x=h.x+Math.cos(a)*h.spread*r;z=h.z+Math.sin(a)*2.8*r;y=.7+rng()*h.height*(1.4-r*.3);scale=.5+rng()*.75;}
    tmp.position.set(x,y,z);tmp.rotation.set(rng()*2,rng()*TAU,rng()*TAU);tmp.scale.setScalar(scale);tmp.updateMatrix();leaves.setMatrixAt(i,tmp.matrix);
    color.setHSL(.22+rng()*.08,.3+rng()*.3,.17+rng()*.17);leaves.setColorAt(i,color);
  }
  leaves.computeBoundingSphere();leaves.receiveShadow=true;scene.add(leaves);
  // Thick, fibrous palm trunk and recognisable radial fan leaves.
  batch.beam([5,0,1],[5.3,18,1],.84,'#7e6645');
  for(let i=0;i<40;i++)add('cone',i%2?'#8e734d':'#67573d',[5+i*.007,.3+i*.44,1],[1.05,.65,1.05],[0,i*.8,0]);
  const palmWind=windMaterial('#6d9d40',.01);wind.push(palmWind);const palmFronds=[];
  for(let i=0;i<42;i++){
    const a=i*2.399,length=3.5+rng()*4,start=new T.Vector3(5.2,7+rng()*12,1),end=start.clone().add(new T.Vector3(Math.cos(a)*length,1+rng()*2,Math.sin(a)*length));
    batch.beam(start.toArray(),end.toArray(),.075,'#a1ae58',false);
    const verts=[],indices=[];
    // Each frond has 17 pointed fingers, spanning a fan at the petiole tip.
    for(let j=0;j<17;j++){
      const theta=a+(j/16-.5)*1.8,r=3+rng()*.7,k=verts.length/3;
      const l=theta-.055,h=theta+.055;
      verts.push(end.x,end.y,end.z,
        end.x+Math.cos(l)*r*.65,end.y-.45,end.z+Math.sin(l)*r*.65,
        end.x+Math.cos(h)*r*.65,end.y-.45,end.z+Math.sin(h)*r*.65,
        end.x+Math.cos(theta)*r,end.y-1.2-rng()*.6,end.z+Math.sin(theta)*r);
      indices.push(k,k+1,k+2,k+1,k+3,k+2);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();const frond=new T.Mesh(g,palmWind.material);frond.castShadow=i%6===0;scene.add(frond);palmFronds.push(frond);
  }
  const palmGeometry=mergeGeometries(palmFronds.map(f=>f.geometry));
  for(const f of palmFronds){scene.remove(f);f.geometry.dispose();}
  palmFronds.length=0;const palmCanopy=new T.Mesh(palmGeometry,palmWind.material);palmCanopy.castShadow=true;scene.add(palmCanopy);palmFronds.push(palmCanopy);
  // Pots, succulents and oversized daisies at the house wall.
  for(const [x,z,r] of [[-18,-17,1.8],[-18,-31,1.25],[-19,-35,1.4],[18,8,1.7]]){
    add('cone','#8c8b69',[x,1.6,z],[r,3.2,r],[0,0,Math.PI]);
    add('disk','#4d5631',[x,3.23,z],[r,.12,r]);
    for(let j=0;j<13;j++){
      const a=j*2.4;batch.beam([x,3,z],[x+Math.cos(a)*r,5+rng()*2,z+Math.sin(a)*r],.06,'#658542',false);
      add('petal','#86a660',[x+Math.cos(a)*r,5+rng(),z+Math.sin(a)*r],[.3,.8,.15],[.4,a,.5],false);
    }
  }
  // Front terrace and huge woven garden table, readable from the overhead reveal.
  add('box','#82715b',[1,-.03,15],[42,.06,6]);
  for(let x=-20;x<22;x+=.6)add('box','#a79778',[x,.015,15],[.025,.03,6],[],false);
  add('box','#374a42',[7.5,7.8,13.5],[13,.4,7]);
  add('box','#819b8e',[7.5,8,13.5],[12.5,.05,6.5],[],false);
  for(const x of [1.5,13.5])for(const z of [10.5,16.5])add('box','#34453c',[x,4,z],[.45,8,.45]);
  // Secrets are guided by tiny mushrooms, never enormous labels in the world.
  const secretMarkers=SECRETS.map(s=>{
    const marker=mesh('ball','#f6d88b',[.09,.12,.09],[s.x,s.y+.65,s.z],scene,.6);return marker;
  });
  // Instanced grass: a few triangles per blade, phased GPU wind, no shadow casters.
  const gw=windMaterial('#ffffff',.22);const compileGrass=gw.material.onBeforeCompile;
  gw.material.onBeforeCompile=shader=>{compileGrass(shader);shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`float gardenDistance=length(cameraPosition.xz-worldBase.xz);float lod=(1.-smoothstep(28.,65.,gardenDistance));transformed.y*=lod;\n#include <project_vertex>`);};wind.push(gw);const count=11000,grass=new T.InstancedMesh(bladeGeometry(),gw.material,count);
  for(let i=0;i<count;i++){
    let x,z;do{x=-14+rng()*35;z=-32+rng()*44;}while(Math.abs(x+12)<2.2 || Math.hypot(x-TREE.x,z-TREE.z)<5 || (z<-27&&Math.abs(x)<4));
    tmp.position.set(x,0,z);tmp.rotation.set(0,rng()*TAU,(rng()-.5)*.15);const h=.45+rng()*1.35;tmp.scale.set(.8+rng(),h,1);tmp.updateMatrix();grass.setMatrixAt(i,tmp.matrix);
    color.setHSL(.2+rng()*.08,.38+rng()*.28,.25+rng()*.14);grass.setColorAt(i,color);
  }
  grass.computeBoundingSphere();grass.receiveShadow=true;scene.add(grass);
  // Friendly inhabitants, pooled and animated without creating objects per frame.
  const butterflies=[];
  for(let i=0;i<14;i++){
    const group=new T.Group(),wings=[];group.position.set(-10+rng()*28,2+rng()*3,-29+rng()*38);
    for(const side of [-1,1]){const wing=mesh('petal',['#f3d285','#efb9c5','#a1d4dc'][i%3],[.32,.025,.22],[side*.23,0,0],group);wing.castShadow=false;wings.push(wing);}
    scene.add(group);butterflies.push({group,wings,x:group.position.x,y:group.position.y,z:group.position.z,phase:rng()*TAU});
  }
  for(const [x,z] of [[-11,5],[-9,-27],[18,-8]]){
    add('petal','#8d9971',[x,.17,z],[.65,.17,.28]);add('ball','#bfa57a',[x,.52,z-.1],[.4,.4,.4]);
    for(const side of [-1,1])batch.beam([x+.42,.2,z+side*.12],[x+.6,.55,z+side*.2],.025,'#707e5b',false);
  }
  // A separate glowing root network grows across the existing garden at the finale.
  const roots=new T.Group();scene.add(roots);
  for(let i=0;i<18;i++){
    const a=i/18*TAU,points=[];
    for(let j=0;j<8;j++){const d=j*1.5;points.push(new T.Vector3(Math.cos(a+j*.08)*d,.035,Math.sin(a+j*.08)*d));}
    const curve=new T.CatmullRomCurve3(points),g=new T.TubeGeometry(curve,20,.035,4,false),m=new T.MeshBasicMaterial({color:i%2?'#e6c96a':'#9cddae'});roots.add(new T.Mesh(g,m));
  }
  roots.visible=false;roots.position.set(TREE.x,0,TREE.z);
  // Roof strips share a draw call; both roof materials still hide inside the shed.
  const roofGroups=new Map();for(const r of roof){const key=r.material.color.getHexString()+'-'+r.castShadow;if(!roofGroups.has(key))roofGroups.set(key,[]);roofGroups.get(key).push(r);}
  roof.length=0;for(const parts of roofGroups.values()){const copies=parts.map(r=>{r.updateMatrix();return r.geometry.clone().applyMatrix4(r.matrix);});const merged=new T.Mesh(mergeGeometries(copies),parts[0].material);merged.castShadow=parts[0].castShadow;merged.receiveShadow=true;scene.add(merged);roof.push(merged);copies.forEach(g=>g.dispose());parts.forEach((r,i)=>{scene.remove(r);if(i)r.material.dispose();});}
  return {wind,roof,magic,sail,grass,leaves,butterflies,secretMarkers,roots,palmFronds,
    update(time,game,motion,night=0,finale=12){
      lifted.forEach((m,i)=>{m.position.y=LIFTING_PLATES[i].y-.09+LIFTING_PLATES[i].rise*game.energy;});
      for(const w of wind)w.time.value=motion?0:time;
      const inside=game.player.z<-33.2&&game.player.x>-7.6&&game.player.x<13.6&&game.player.y<13;
      for(const r of roof)r.visible=!inside;
      for(const b of butterflies){const t=motion?0:time;b.group.position.set(b.x+Math.sin(t*.45+b.phase)*1.6,b.y+Math.sin(t+b.phase)*.35,b.z+Math.cos(t*.3+b.phase));for(let i=0;i<2;i++)b.wings[i].rotation.z=Math.sin(t*12+b.phase)*.9*(i?1:-1);}
      secretMarkers.forEach((m,i)=>{m.visible=!game.secrets.has(i);m.position.y=SECRETS[i].y+.7+Math.sin(time*2+i)*.1;});
      for(const m of magic)m.material.emissiveIntensity=.15+game.lights*.3+(game.finished?.8:0);
      roots.visible=game.finished&&finale>3.5;if(game.finished)roots.scale.setScalar(Math.min(1,Math.max(.001,(finale-3.5)*.3)));
      sailNight.value=night;sailPulse.value=game.finished?Math.min(7,Math.max(0,finale-4)):0;
      sail.material.emissive.set('#b8c8a0');sail.material.emissiveIntensity=night*.025;
      leaves.material.emissive.set('#849c7b');leaves.material.emissiveIntensity=game.finished?.08:night*.025;
    },
    quality(low,high){grass.count=low?3000:high?11000:6500;leaves.count=low?7000:high?leafCount:12000;butterflies.forEach((b,i)=>b.group.visible=i<(low?5:14));}
  };
}
