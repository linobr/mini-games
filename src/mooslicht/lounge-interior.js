import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {LOUNGE_CHAIRS} from './garden-layout.js';

// Static, merged furniture: softer silhouettes without extra draw calls or fur particles.
export function buildLoungeInterior(scene,batch,curtains){
  const parts=[];
  function part(g,color,surface=0){
    const geometry=g.index?g.toNonIndexed():g;
    if(geometry!==g)g.dispose();
    const count=geometry.attributes.position.count,c=new T.Color(color),colors=new Float32Array(count*3);
    for(let i=0;i<count;i++)colors.set([c.r,c.g,c.b],i*3);
    geometry.setAttribute('color',new T.BufferAttribute(colors,3));
    geometry.setAttribute('surface',new T.Float32BufferAttribute(new Float32Array(count).fill(surface),1));
    // Every merged piece needs the same attribute set; materials use world position.
    geometry.deleteAttribute('uv');parts.push(geometry);
  }
  function cushion(color,x,y,z,w,h,d,rotation=[0,0,0],surface=1){
    const g=new RoundedBoxGeometry(w,h,d,1,Math.min(h,w,d)*.24);
    g.rotateX(rotation[0]);g.rotateY(rotation[1]);g.rotateZ(rotation[2]);g.translate(x,y,z);part(g,color,surface);
  }
  const box=(color,x,y,z,w,h,d,surface=0)=>{const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);part(g,color,surface);};
  const beam=(a,b,r,color)=>batch.beam(a,b,r,color,false);
  for(const g of curtains)part(g,'#eee9df',1);
  // Front faces replace hundreds of closed stone boxes hidden inside the house wall.
  for(let row=0;row<22;row++)for(let col=0;col<10;col++){
    const x=-50.8+col*2.25+(row%2)*.9,y=.4+row*.68;
    if(x>-28.6||(x<-43&&y<4)||(x>-39.8&&x<-32.2&&y>5.2&&y<13.5))continue;
    const g=new T.PlaneGeometry(2.16,.61);g.translate(x,y,50.39+(row+col)%3*.015);
    part(g,['#d7d2c5','#e6e0d4','#c8c5bb'][(row*7+col)%3],3);
  }
  // A continuous scalloped valance beneath the white canopy.
  const valance=new T.Shape();valance.moveTo(-52,15.9);valance.lineTo(-28,15.9);valance.lineTo(-28,15.35);
  for(let x=-28;x>-52;x-=1.2)valance.quadraticCurveTo(x-.6,14.98,x-1.2,15.35);
  valance.closePath();const vg=new T.ShapeGeometry(valance,3);vg.translate(0,0,62.42);part(vg,'#eee9df',1);
  // L-shaped grey sofa: recessed feet, substantial cushions and separate back pillows.
  for(const [x,z,w,d] of [[-47,53,8,4],[-49,56.5,4,5]]){
    box('#343c3d',x,.76,z,w,1.05,d);
    for(const dx of [-w/2+.3,w/2-.3])for(const dz of [-d/2+.3,d/2-.3])box('#242b2c',x+dx,.22,z+dz,.18,.28,.18);
  }
  cushion('#51595a',-47,3.05,51.4,8,2.65,.75);
  cushion('#51595a',-50.6,3.05,56,.75,2.65,7);
  for(const [x,z,w,d] of [[-48.8,53.2,3.75,3.4],[-44.9,53.2,3.7,3.4],[-49,56.3,3.35,2],[-49,58.3,3.35,1.85]]){
    cushion('#707677',x,1.85,z,w,.8,d);
    box('#90938e',x,2.16,z+d/2-.045,w-.24,.035,.035);
  }
  for(const [x,z,yaw,color] of [[-49,52.1,0,'#e8e2d5'],[-46.9,52.1,.14,'#aaa99f'],[-44.7,52.1,-.12,'#d6cfc0'],[-49.7,55.4,1.5,'#e7e2d7'],[-49.7,57.9,1.5,'#97998f']])
    cushion(color,x,3.05,z,1.65,1.65,.52,[-.17,yaw,.04]);
  // Pale oak boards with dark sled supports, maintaining the playable 2.35 top.
  for(let i=0;i<4;i++)box(['#c2aa84','#c8b18c','#baa27e','#c4ac86'][i],-44.25+i*1.5,2.225,56.5,1.48,.25,4,2);
  for(const x of [-44.6,-39.4]){
    for(const z of [54.9,58.1])box('#343b3a',x,1.13,z,.14,2.1,.14);
    box('#343b3a',x,.15,56.5,.14,.14,3.35);
  }
  batch.add('grit','#767775',[-42,2.57,56.5],[.48,.25,.34],[],false);
  // Open bucket seats with enveloping backs and arms, rather than two ellipsoids.
  for(const c of LOUNGE_CHAIRS){
    for(const dx of [-.98,.98])for(const dz of [-1,1])beam([c.x+dx,.1,c.z+dz],[c.x+dx*.67,1.5,c.z+dz*.67],.11,'#c1a582');
    cushion('#e5dece',c.x,1.65,c.z,2.45,.64,2.45);
    const vertices=[],indices=[];
    for(let row=0;row<=3;row++)for(let col=0;col<=12;col++){
      const a=Math.PI*.04+col/12*Math.PI*.92,t=row/3,r=1.04+t*.2;
      const back=Math.sin(a),height=2.45+back*1.1;
      vertices.push(c.x+Math.cos(a)*r,1.6+t*(height-1.6),c.z-Math.sin(a)*r+.12);
      if(row<3&&col<12){const k=row*13+col;indices.push(k,k+13,k+1,k+1,k+13,k+14);}
    }
    const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(vertices,3));shell.setIndex(indices);shell.computeVertexNormals();part(shell,'#e8e1d3',1);
    // Continuous padded rim: a soft edge, without a necklace of separate balls.
    const rim=[];
    for(let i=0;i<=16;i++){
      const a=Math.PI*.04+i/16*Math.PI*.92;
      rim.push(new T.Vector3(c.x+Math.cos(a)*1.22,2.45+Math.sin(a)*1.1,c.z-Math.sin(a)*1.24+.12));
    }
    const edging=new T.TubeGeometry(new T.CatmullRomCurve3(rim),20,.13,5,false);
    part(edging,'#e8e1d3',1);
  }
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.96,side:T.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float surface; varying float loungeSurface; varying vec3 loungePoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nloungeSurface=surface; loungePoint=position;');
    shader.fragmentShader='varying float loungeSurface; varying vec3 loungePoint;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      if(loungeSurface>.5 && loungeSurface<1.5){
        float fibres=sin(loungePoint.x*133.+sin(loungePoint.z*79.))*sin((loungePoint.y+loungePoint.z)*117.);
        float fade=1.-smoothstep(.025,.11,length(fwidth(loungePoint)));
        diffuseColor.rgb*=1.-.13*fade*(.5+.5*fibres);
      }else if(loungeSurface>1.5 && loungeSurface<2.5){
        float grain=sin(loungePoint.x*39.+sin(loungePoint.z*.9+loungePoint.x)*2.);
        float fade=1.-smoothstep(.025,.13,length(fwidth(loungePoint)));
        diffuseColor.rgb*=.98+.02*grain*fade;
      }else if(loungeSurface>2.5){
        diffuseColor.rgb*=.95+.05*sin(loungePoint.x*14.+sin(loungePoint.y*23.));
      }
    `);
  };
  material.customProgramCacheKey=()=> 'lounge-furnishings-v1';
  const furnishings=new T.Mesh(mergeGeometries(parts),material);furnishings.name='lounge-furnishings';furnishings.receiveShadow=true;scene.add(furnishings);parts.forEach(g=>g.dispose());
  buildHides(scene);
}

// Hide-shaped edges and non-repeating, broad chocolate patches with cream margins.
function buildHides(scene){
  const outline=[[-.35,-.85],[-.67,-1],[-.79,-.83],[-.55,-.49],[-.76,-.2],[-.73,.19],[-.97,.64],[-.79,.76],[-.44,.56],[-.29,.87],[.02,1],[.29,.84],[.39,.59],[.79,.79],[.98,.61],[.72,.17],[.75,-.2],[.53,-.53],[.78,-.87],[.6,-1],[.29,-.86],[0,-.96]];
  const parts=[];
  for(const [x,z,sx,sz,angle] of [[-44.2,57.4,4.5,3.6,-.12],[-39.7,58.8,3.6,3.05,.23]]){
    const shape=new T.Shape();const prev=outline.at(-1),first=outline[0];shape.moveTo((prev[0]+first[0])/2*sx,-(prev[1]+first[1])/2*sz);
    outline.forEach(([a,b],i)=>{const next=outline[(i+1)%outline.length];shape.quadraticCurveTo(a*sx,-b*sz,(a+next[0])/2*sx,-(b+next[1])/2*sz);});
    const g=new T.ShapeGeometry(shape,3);g.rotateX(-Math.PI/2);g.rotateY(angle);g.translate(x,.11+parts.length*.014,z);parts.push(g);
  }
  const material=new T.MeshStandardMaterial({color:'#ebe2cc',roughness:1});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 hidePoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nhidePoint=position;');
    shader.fragmentShader=`varying vec3 hidePoint;
      float hideHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float hideNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hideHash(i),hideHash(i+vec2(1,0)),f.x),mix(hideHash(i+vec2(0,1)),hideHash(i+vec2(1,1)),f.x),f.y);}
      `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 p=hidePoint.xz;
      float patches=hideNoise(p*.72)*.68+hideNoise(p*2.4)*.22+hideNoise(p*7.)*.10;
      float aa=max(fwidth(patches),.009);
      float brown=smoothstep(.49-aa,.49+aa,patches);
      vec3 chocolate=mix(vec3(.045,.019,.009),vec3(.16,.072,.028),hideNoise(p*3.));
      diffuseColor.rgb=mix(diffuseColor.rgb,chocolate,brown);
    `);
  };
  material.customProgramCacheKey=()=> 'lounge-hide-v2';
  const mesh=new T.Mesh(mergeGeometries(parts),material);mesh.name='lounge-hide-rugs';mesh.receiveShadow=true;scene.add(mesh);parts.forEach(g=>g.dispose());
}
