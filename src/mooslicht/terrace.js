import {buildHouseGarden} from './house-garden.js';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {TERRACE_OUTLINE,GRAVEL_OUTLINE,TABLE,TABLE_LEGS,LOUNGERS,DINING_CHAIRS,GRAVEL_SEATS,BANANA,TERRACE_POTS,chairPoint,BALCONY,BALCONY_POSTS} from './garden-layout.js';
import {random,insideOutline} from './world.js';

function ground(scene,outline,color,name){
  const shape=new T.Shape(outline.map(p=>new T.Vector2(p.x,-p.z)));
  const geometry=new T.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);
  const material=new T.MeshStandardMaterial({color,roughness:.92});
  // Polygon offset also protects distant overview views; physical floor stays flush.
  material.polygonOffset=true;material.polygonOffsetFactor=-2;material.polygonOffsetUnits=-2;
  const mesh=new T.Mesh(geometry,material);mesh.position.y=.035;mesh.receiveShadow=true;mesh.name=name;scene.add(mesh);return mesh;
}
function patterned(material,kind){
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 gardenSurface;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngardenSurface=position;');
    shader.fragmentShader='varying vec3 gardenSurface;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      ${kind==='wood'?`
      float board=floor(gardenSurface.x/0.72);
      float variation=fract(sin(board*127.1)*43758.5453);
      float across=fract(gardenSurface.x/0.72);
      float aa=max(fwidth(across),0.008);
      float joint=1.-smoothstep(0.016,0.016+aa,min(across,1.-across));
      float end=fract((gardenSurface.z+mod(board,3.)*3.7)/11.);
      float crossJoint=1.-smoothstep(.003,.003+fwidth(end),min(end,1.-end));
      float grain=sin(gardenSurface.x*78.+sin(gardenSurface.z*.7+board)*.6);
      float detail=1.-smoothstep(.025,.12,fwidth(gardenSurface.x));
      diffuseColor.rgb*=.96+variation*.08-joint*.32-crossJoint*.12+grain*.025*detail;
      `:kind==='gravel'?`
      vec2 cell=floor(gardenSurface.xz*18.);
      float stone=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
      float detail=1.-smoothstep(.08,.4,max(fwidth(gardenSurface.x),fwidth(gardenSurface.z)));
      diffuseColor.rgb*=.96+(stone-.5)*.26*detail;
      `:`
      vec2 weave=vec2(gardenSurface.x+gardenSurface.y,gardenSurface.z)*15.;
      float detail=1.-smoothstep(.4,1.4,max(fwidth(weave.x),fwidth(weave.y)));
      float thread=sin(weave.x*6.283)*sin(weave.y*6.283);
      diffuseColor.rgb*=.95+thread*.16*detail;
      `}
    `);
  };
  material.customProgramCacheKey=()=>`garden-surface-${kind}`;
}
export function buildTerrace(scene,batch){
  const rng=random(48376),add=(shape,color,pos,scale,rot=[],shadow=false)=>batch.add(shape,color,pos,scale,rot,shadow);
  const deck=ground(scene,TERRACE_OUTLINE,'#554f4a','terrace-deck');patterned(deck.material,'wood');
  const gravel=ground(scene,GRAVEL_OUTLINE,'#c6c6bd','rounded-gravel');patterned(gravel.material,'gravel');
  const panels=[],box=new T.BoxGeometry(1,1,1),matrix=new T.Object3D();
  const panel=(x,y,z,w,h,d,tilt=0,yaw=0)=>{matrix.position.set(x,y,z);matrix.rotation.set(0,yaw,tilt);matrix.scale.set(w,h,d);matrix.updateMatrix();panels.push(box.clone().applyMatrix4(matrix.matrix));};
  const rail=(a,b,r=.1)=>batch.beam(a,b,r,'#383e3d',false);
  // Dark woven frame with a single opaque, glossy inset: no extra reflection pass.
  panel(TABLE.x,7.8,TABLE.z,TABLE.w,.4,TABLE.d);
  const glass=new T.Mesh(new T.BoxGeometry(TABLE.w-.5,.055,TABLE.d-.5),new T.MeshStandardMaterial({color:'#536365',roughness:.19,metalness:.42}));
  glass.position.set(TABLE.x,8.028,TABLE.z);glass.receiveShadow=true;scene.add(glass);
  glass.material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      vec3 eye=normalize(vViewPosition);
      float sheen=pow(1.-abs(dot(normal,eye)),3.);
      totalEmissiveRadiance+=vec3(.08,.12,.13)*sheen;
    `);
  };
  for(const p of TABLE_LEGS){add('box','#343d37',[p.x,p.h/2,p.z],[p.w,p.h,p.d],[],true);add('box','#88928a',[p.x,.15,p.z],[.56,.3,.56]);}
  for(const z of [TABLE.z-TABLE.d/2+.25,TABLE.z+TABLE.d/2-.25])panel(TABLE.x,7.46,z,TABLE.w,.28,.18);
  // Small tea lights and a shallow bowl give scale without obscuring the glass.
  for(const [x,z] of [[-.4,14],[.8,14]]){
    add('cylinder','#b99f64',[x,8.38,z],[.42,.62,.42]);add('disk','#f2d69c',[x,8.7,z],[.29,.035,.29]);
  }
  add('petal','#c4cab9',[3,8.35,18],[1.15,.28,.7]);
  for(const l of LOUNGERS){
    panel(l.x-2,2.44,l.z,7,.28,4.1);
    panel(l.x+3.3,4.12,l.z,5,.28,4.1,.76);
    for(const dz of [-1.95,1.95]){
      rail([l.x-5.5,2.45,l.z+dz],[l.x+1.5,2.45,l.z+dz],.13);
      rail([l.x+1.5,2.45,l.z+dz],[l.x+5.1,5.9,l.z+dz],.13);
      rail([l.x-4.8,2.4,l.z+dz],[l.x-4.8,.22,l.z+dz],.13);
      rail([l.x+3.4,4.25,l.z+dz],[l.x+3.4,.22,l.z+dz],.13);
      rail([l.x-4.8,.22,l.z+dz],[l.x+3.4,.22,l.z+dz],.13);
    }
    // Head bolster, inclined with the back; softly rounded instead of a cube.
    add('petal','#aaa997',[l.x+4.2,5.28,l.z],[.45,.22,1.6],[0,0,.76]);
  }
  for(const c of DINING_CHAIRS){
    const back=chairPoint(c,0,1.5),point=(x,y,z)=>{const p=chairPoint(c,x,z);return [p.x,y,p.z];};
    panel(c.x,3.85,c.z,3.4,.3,3.4,0,c.yaw);panel(back.x,5.8,back.z,3.4,3.6,.25,0,c.yaw);
    for(const dx of [-1.35,1.35])for(const dz of [-1.35,1.35])rail(point(dx,0,dz),point(dx,3.7,dz),.11);
    for(const dx of [-1.7,1.7]){rail(point(dx,5,-1.5),point(dx,5,1.5));rail(point(dx,3.8,-1.5),point(dx,5,-1.5));}
  }
  // Continuous shallow fascia, including the notch around the palm-side lawn.
  for(let i=0;i<TERRACE_OUTLINE.length;i++){
    const a=TERRACE_OUTLINE[i],b=TERRACE_OUTLINE[(i+1)%TERRACE_OUTLINE.length];
    batch.beam([a.x,-.06,a.z],[b.x,-.06,b.z],.10,'#564e40',false);
  }
  // Pale aggregate with individually readable stones near the rounded edging.
  for(let i=0;i<700;i++){
    let x,z;do{x=1+rng()*21;z=48+rng()*20;}while(!insideOutline(GRAVEL_OUTLINE,x,z));
    const s=.055+rng()*.10;add('grit',['#d4d3cb','#b2b5ae','#e2dfd5','#9ca39e'][i%4],[x,.055,z],[s,.04+rng()*.05,s*.8],[rng(),rng()*6,rng()]);
  }
  for(let i=0;i<GRAVEL_OUTLINE.length;i++){
    const a=GRAVEL_OUTLINE[i],b=GRAVEL_OUTLINE[(i+1)%GRAVEL_OUTLINE.length],length=Math.hypot(b.x-a.x,b.z-a.z);
    if(length>.001)add('box','#858d89',[(a.x+b.x)/2,.075,(a.z+b.z)/2],[.19,.15,length+.025],[0,Math.atan2(b.x-a.x,b.z-a.z),0]);
  }
  for(const c of GRAVEL_SEATS){panel(c.x,.9,c.z,5,1.8,5.5);panel(c.x+2.3,3.2,c.z,.4,2.8,5.5);add('box','#454d4f',[c.x-.15,1.92,c.z],[4.7,.24,5.2]);}
  for(let x=8.6;x<13.6;x+=.7)add('box','#92917c',[x,2.25,60],[.64,.3,7]);
  for(const x of [9,13])for(const z of [57.2,62.8])rail([x,0,z],[x,2.1,z],.13);
  add('cylinder','#a98789',[11,2.65,60],[.4,.5,.4]);
  // Closed ivory umbrella, as seen from the opposite end of the lawn.
  add('disk','#858d83',[18,.18,50.5],[1.8,.25,1.8]);rail([18,0,50.5],[18,13,50.5],.13);
  add('cone','#d6d4bd',[18,10.3,50.5],[.78,6,.78]);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;batch.beam([18,13.25,50.5],[18+Math.cos(a)*.7,7.3,50.5+Math.sin(a)*.7],.04,'#b4b69d',false);}
  const woven=new T.MeshStandardMaterial({color:'#343a39',roughness:.85});patterned(woven,'woven');
  const furniture=new T.Mesh(mergeGeometries(panels),woven);furniture.name='woven-garden-furniture';furniture.castShadow=true;furniture.receiveShadow=true;scene.add(furniture);panels.forEach(g=>g.dispose());box.dispose();
  // The broad banana leaves distinguish the second lawn from the fan palm garden.
  const bananaParts=[],leafColor=new T.Color();
  add('disk','#696451',[BANANA.x,.025,BANANA.z],[3.6,.05,3.6]);
  for(let i=0;i<40;i++){
    const a=i/40*Math.PI*2,b=(i+1)/40*Math.PI*2;
    batch.beam([BANANA.x+Math.cos(a)*3.6,.08,BANANA.z+Math.sin(a)*3.6],[BANANA.x+Math.cos(b)*3.6,.08,BANANA.z+Math.sin(b)*3.6],.075,'#89908a',false);
  }
  // Uneven pseudostems carry overlapping leaves at several heights, including basal suckers.
  for(let stem=0;stem<8;stem++){
    const a=stem*2.4,x=BANANA.x+Math.sin(a)*(stem%3)*.85,z=BANANA.z+Math.cos(a)*(stem%3)*.8,h=[14,11,17,8,15,6,12,4][stem];
    batch.beam([x,0,z],[x+.35,h,z],stem<5?.42:.28,stem%2?'#6f8450':'#7b8953',false);
    for(let sheath=0;sheath<3;sheath++)batch.beam([x+.18*Math.cos(a+sheath*2),.2,z+.18*Math.sin(a+sheath*2)],[x+.35,h*(.45+sheath*.14),z],.08,'#9a9870',false);
    for(let leaf=0;leaf<6;leaf++){
      const angle=a+leaf*2.07+rng()*.55,young=leaf===5,base=h*(.28+leaf*.135),len=young?4+rng()*2:5.5+rng()*3.5;
      const widthMax=young?.65:1.6+rng()*.55,lift=young?len*.93:3.3+rng()*1.7,droop=young?0:2.8+(5-leaf)*.65;
      const verts=[],colors=[],indices=[];
      leafColor.set(['#477747','#527f43','#668c4e','#3f7147'][stem%4]);
      for(let j=0;j<=16;j++){
        const t=j/16,r=t*len*(young?.25:1),y=base+Math.sin(t*Math.PI*.72)*lift-t*t*droop;
        const width=Math.pow(Math.sin(t*Math.PI),.72)*widthMax;
        const cx=x+.35+Math.cos(angle)*r,cz=z+Math.sin(angle)*r;
        for(const side of [-1,-.025,0,.025,1]){
          // Occasional narrow tears interrupt the edge without repeating a sawtooth silhouette.
          const tear=!young&&j>5&&j<15&&(j+leaf*3+stem)%7===0?.42:1;
          const edge=width*side*(Math.abs(side)===1?tear:1),fold=Math.abs(side)*width*.13;
          verts.push(cx+Math.sin(angle)*edge,y-fold+(side===0?.04:0)+Math.sin(t*8+stem)*Math.abs(side)*.12,cz-Math.cos(angle)*edge);
          const shade=Math.abs(side)<.03?1.22:side===-1?.91:1;
          colors.push(leafColor.r*shade,leafColor.g*shade,leafColor.b*shade);
        }
        if(j<16)for(let k=0;k<4;k++){const n=j*5+k;indices.push(n,n+5,n+1,n+1,n+5,n+6);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();bananaParts.push(g);
    }
  }
  const banana=new T.Mesh(mergeGeometries(bananaParts),new T.MeshStandardMaterial({vertexColors:true,roughness:.85,side:T.DoubleSide}));banana.castShadow=true;banana.receiveShadow=true;banana.name='banana-clump';scene.add(banana);bananaParts.forEach(g=>g.dispose());
  // White flowering shrub at the change of garden rooms; open sightline above it.
  for(let i=0;i<130;i++){
    const a=i*2.4,r=Math.sqrt(rng())*2.6,x=21+Math.cos(a)*r,z=35+rng()*13,y=2+Math.sin(i*.9)*1.2+rng()*5;
    if(i%3)add('bud','#3e6847',[x,y,z],[1,.9,1],[rng(),a,0]);
  }
  // Small five-petal white flowers sit on the garden-facing surface, not buried in the hedge.
  const flowerVertices=[],flowerColors=[],flowerIndices=[],white=new T.Color('#f1eee6'),gold=new T.Color('#c9b36b');
  for(let petal=0;petal<5;petal++){
    const a=petal*Math.PI*2/5,base=flowerVertices.length/3;
    flowerVertices.push(-.035,Math.cos(a)*.17,Math.sin(a)*.17);flowerColors.push(white.r,white.g,white.b);
    for(let j=0;j<=8;j++){
      const theta=j/8*Math.PI*2,along=.17+Math.cos(theta)*.22,across=Math.sin(theta)*.13;
      flowerVertices.push(Math.abs(across)*.25,Math.cos(a)*along-Math.sin(a)*across,Math.sin(a)*along+Math.cos(a)*across);flowerColors.push(white.r,white.g,white.b);
      if(j)flowerIndices.push(base,base+j,base+j+1);
    }
  }
  const centre=flowerVertices.length/3;flowerVertices.push(-.06,0,0);flowerColors.push(gold.r,gold.g,gold.b);
  for(let j=0;j<=8;j++){const a=j/8*Math.PI*2;flowerVertices.push(-.055,Math.cos(a)*.075,Math.sin(a)*.075);flowerColors.push(gold.r,gold.g,gold.b);if(j)flowerIndices.push(centre,centre+j,centre+j+1);}
  const flowerGeometry=new T.BufferGeometry();flowerGeometry.setAttribute('position',new T.Float32BufferAttribute(flowerVertices,3));flowerGeometry.setAttribute('color',new T.Float32BufferAttribute(flowerColors,3));flowerGeometry.setIndex(flowerIndices);flowerGeometry.computeVertexNormals();
  const blossoms=new T.InstancedMesh(flowerGeometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.95,side:T.DoubleSide}),64),flowerPose=new T.Object3D();
  for(let i=0;i<64;i++){
    flowerPose.position.set(18.5+rng()*.9,3.8+rng()*4.1,35+rng()*13);flowerPose.rotation.set(rng()*6,(rng()-.5)*.9,(rng()-.5)*.6);flowerPose.scale.setScalar(.65+rng()*.45);flowerPose.updateMatrix();blossoms.setMatrixAt(i,flowerPose.matrix);
  }
  blossoms.name='white-five-petal-blossoms';blossoms.computeBoundingSphere();scene.add(blossoms);
  for(const {x,z} of TERRACE_POTS){
    add('cone','#93987a',[x,1.55,z],[1.15,3.1,1.15],[0,0,Math.PI]);add('disk','#495539',[x,3.1,z],[1.1,.08,1.1]);
    for(let i=0;i<18;i++){const a=i*2.4;add('bud',i%4?'#698563':'#b8b2d0',[x+Math.cos(a)*rng(),3.4+rng()*1.6,z+Math.sin(a)*rng()],[.13,.65,.13],[.2,a,.2]);}
  }
  buildHouseGarden(scene,batch,{ground,patterned});
  return {deck,gravel,furniture,glass,banana};
}
