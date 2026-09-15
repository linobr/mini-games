import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HOUSE_RETURN,HOUSE_GABLE,REAR_OUTLINE,LAWN_CURVE,LOUNGE,LOUNGE_CHAIRS,BALCONY,BALCONY_POSTS,BALCONY_RAILS,BALCONY_SEATS,BALCONY_LOUNGERS} from './garden-layout.js';

// Architecture shares its footprint with movement, the camera and the map.
export function buildHouseGarden(scene,batch,{ground,patterned}){
  const add=(shape,color,pos,scale,rot=[])=>batch.add(shape,color,pos,scale,rot,false);
  const beam=(a,b,r=.07,color='#ccd0ca')=>batch.beam(a,b,r,color,false);
  const box=(color,x,y,z,w,h,d)=>add('box',color,[x,y,z],[w,h,d]);
  const cream='#e6e3da',metal='#cbd1cf',dark='#353d3e';
  const wall=HOUSE_RETURN;
  batch.add('box',cream,[wall.x,wall.h/2,wall.z],[wall.w,wall.h,wall.d],[],true);
  box('#b3b5ad',wall.x,.45,50.2,wall.w,.9,.18);
  box('#d0d3cd',wall.x,wall.h+.1,50,wall.w+.3,.25,.8);
  // Joined roof planes replace the old flat, full-height end wall. All custom
  // roof/gable faces share one vertex-coloured mesh with the lounge canopy.
  const roofParts=[];
  const face=(points,color)=>{
    const g=new T.BufferGeometry(),c=new T.Color(color);
    g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));
    g.setAttribute('color',new T.Float32BufferAttribute(points.flatMap(()=>[c.r,c.g,c.b]),3));
    g.setIndex(points.length===3?[0,1,2]:[0,1,2,0,2,3]);g.computeVertexNormals();
    if(g.attributes.normal.getY(0)<-.1){g.setIndex([0,2,1,0,3,2]);g.computeVertexNormals();}
    roofParts.push(g);
  };
  const wing=HOUSE_GABLE,mid=(wing.minZ+wing.maxZ)/2;
  batch.add('box',cream,[(wing.frontX+wing.backX)/2,12,mid],[wing.frontX-wing.backX,24,wing.maxZ-wing.minZ],[],true);
  face([[wing.frontX,24,wing.minZ],[wing.frontX,24,wing.maxZ],[wing.frontX,36,mid]],cream);
  for(const edge of [wing.minZ-.5,wing.maxZ+.6]){
    face([[-27,36.3,mid],[-20.2,36.3,mid],[-20.2,23.8,edge],[-27,23.8,edge]],'#74665c');
    beam([-20.15,36.25,mid],[-20.15,23.8,edge],.16,cream);
    beam([-27,23.7,edge],[-20.1,23.7,edge],.14,metal);
  }
  // Lower connecting roof recedes behind the projecting gable, with skylight.
  face([[-52.5,29,44],[-26,29,44],[-26,22.3,50.6],[-52.5,22.3,50.6]],'#807065');
  face([[-52.5,29,44],[-52.5,22.3,50.6],[-52.5,22.3,44]],cream);
  beam([-52.5,22.25,50.65],[-22,22.25,50.65],.16,metal);
  beam([-52.3,0,50.65],[-52.3,22.2,50.65],.11,metal);
  const roofY=z=>29-(z-44)*6.7/6.6;
  const skylight=(xa,xb,za,zb,lift,color)=>face([[xa,roofY(za)+lift,za],[xb,roofY(za)+lift,za],[xb,roofY(zb)+lift,zb],[xa,roofY(zb)+lift,zb]],color);
  skylight(-43,-36,45,48.8,.17,'#454b4a');skylight(-42.65,-36.35,45.35,48.45,.22,'#a9bec1');
  beam([-42.6,roofY(46.2)+.24,46.2],[-36.4,roofY(46.2)+.24,46.2],.07,metal);
  for(let z=44.5;z<50.6;z+=.8)beam([-52.45,roofY(z)+.025,z],[-26,roofY(z)+.025,z],.035,'#9a8676');
  // Recessed shutter bay and a slim rainwater pipe on the projecting facade.
  box('#adb0a8',-20.7,1,mid,.15,2,15.4);
  box('#657373',-20.65,8,40.6,.12,12,7);
  for(let y=2.3;y<14;y+=.5)box('#a8aeaa',-20.53,y,40.6,.17,.2,7);
  beam([-20.4,.4,49.5],[-20.4,23.7,49.5],.11,metal);
  const deck=ground(scene,REAR_OUTLINE,'#514c48','rear-lounge-deck');deck.position.y=.08;patterned(deck.material,'wood');
  // The narrow pale strip follows the lawn around the corner, then the lounge.
  const curb=LAWN_CURVE;
  const strip=curb.concat([...curb].reverse().map(p=>({x:p.x-.7,z:p.z-.7})));
  const gravel=ground(scene,strip,'#c9c9c2','corner-gravel-strip');patterned(gravel.material,'gravel');
  for(let i=1;i<curb.length;i++)beam([curb[i-1].x,.075,curb[i-1].z],[curb[i].x,.075,curb[i].z],.075,'#939a97');
  // A handful of flush stepping stones makes the bend legible at walking height.
  for(const [x,z] of [[-16,51],[-20,57],[-25,62],[-31,65],[-37,65]])box('#a9afaa',x,.045,z,2.5,.09,2.7);
  const panes=[],curtains=[],unit=new T.BoxGeometry(1,1,1),transform=new T.Object3D();
  const pane=(x,y,z,w,h,d)=>{transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.rotation.set(0,0,0);transform.updateMatrix();panes.push(unit.clone().applyMatrix4(transform.matrix));};
  // Three sides, a broad open entrance in the front; glass has no extra reflection pass.
  for(const x of [LOUNGE.minX,LOUNGE.maxX]){
    pane(x,8,56,.035,15.7,11.7);
    for(const z of [50,54,58,62])box(cream,x,8,z,.24,16,.24);
    for(const y of [.18,5.5,15.8])box(cream,x,y,56,.22,.22,12);
  }
  for(const [x,w] of [[-47.5,9],[-32.5,9]]){
    pane(x,8,62,w-.2,15.7,.035);
    for(const dx of [-w/2,0,w/2])box(cream,x+dx,8,62,.2,16,.24);
    for(const y of [.18,5.5,15.8])box(cream,x,y,62,w,.2,.24);
  }
  for(const z of [50,62])box(cream,-40,16,z,24.6,.3,.4);
  face([[-52.3,16.3,49.9],[-27.7,16.3,49.9],[-27.7,16,62.4],[-52.3,16,62.4]],'#d6d8d0');
  const roof=new T.Mesh(mergeGeometries(roofParts),new T.MeshStandardMaterial({vertexColors:true,roughness:.9,side:T.DoubleSide}));
  roof.material.shadowSide=T.FrontSide;
  roof.name='house-gables-and-lounge-canopy';roof.castShadow=true;roof.receiveShadow=true;scene.add(roof);roofParts.forEach(g=>g.dispose());
  box('#909b96',-40,16.05,62.28,24.5,.2,.12);
  // Gathered cloth: the width narrows at the tie, with small continuous folds.
  for(const [x,z,height] of [[-43.2,62.35,15.4],[-36.8,62.35,15.4],[-51.6,60.8,15.4],[-28.4,60.8,15.4]]){
    const vertices=[],indices=[];
    for(let row=0;row<=12;row++)for(let col=0;col<=10;col++){
      const t=row/12,u=col/10,width=.55+1.05*Math.min(1,Math.abs(t-.35)*3);
      vertices.push(x+(u-.5)*width,.15+t*height,z+Math.sin(u*Math.PI*8)*(.05+.08*Math.abs(t-.35)));
      if(row<12&&col<10){const k=row*11+col;indices.push(k,k+1,k+11,k+1,k+12,k+11);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();curtains.push(g);
    box('#b1a88c',x,5.5,z+.13,.65,.12,.18);
  }
  // Soft ivory throws fall over the seat fronts; share the curtain draw call.
  for(const x of [-48.7,-44.7]){
    const g=new T.BufferGeometry(),vertices=[],indices=[];
    for(let row=0;row<4;row++)for(let col=0;col<7;col++){
      vertices.push(x+(col/6-.5)*1.9,[3.7,2.3,2.3,1.1][row]+Math.sin(col*2.8)*.05,[51.7,52.3,54.85,55][row]);
      if(row<3&&col<6){const k=row*7+col;indices.push(k,k+1,k+7,k+1,k+8,k+7);}
    }
    g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();curtains.push(g);
  }
  const cloth=new T.Mesh(mergeGeometries(curtains),new T.MeshStandardMaterial({color:'#ece8dc',roughness:1,side:T.DoubleSide}));cloth.receiveShadow=true;scene.add(cloth);curtains.forEach(g=>g.dispose());
  const glass=new T.Mesh(mergeGeometries(panes),new T.MeshStandardMaterial({color:'#c4d7d5',transparent:true,opacity:.13,roughness:.2,metalness:.1,side:T.DoubleSide,depthWrite:false}));
  glass.name='lounge-window-glass';scene.add(glass);panes.forEach(g=>g.dispose());unit.dispose();
  // IMG_4280/4281: stacked pale stone, a framed house window and gilt mirror.
  // Thin, staggered stones stay on the existing solid wall, outside the route.
  for(let row=0;row<22;row++)for(let col=0;col<10;col++){
    const x=-50.8+col*2.25+(row%2)*.9,y=.4+row*.68;
    if(x>-28.6||(x<-43&&y<4)||(x>-39.8&&x<-32.2&&y>5.2&&y<13.5))continue;
    box(['#d7d2c5','#e6e0d4','#c8c5bb'][(row*7+col)%3],x,y,50.32,2.16,.61,.10+(row+col)%3*.025);
  }
  box('#dedbd1',-36,9.4,50.65,7.6,8.4,.28);box('#708585',-36,9.4,50.83,6.9,7.7,.1);
  for(const x of [-39.5,-36,-32.5])box(cream,x,9.4,50.94,.14,7.8,.12);
  box(cream,-36,9.4,50.94,7,.13,.12);box('#c5c3b8',-36,5.2,50.85,8,.25,.65);
  box('#aa8846',-46.7,10.5,50.7,4.7,6.3,.22);box('#d0b370',-46.7,10.5,50.86,4.35,5.95,.12);
  box('#aab8b4',-46.7,10.5,50.95,3.7,5.3,.06);
  for(const x of [-48.85,-44.55])for(const y of [7.6,8.8,10.5,12.2,13.4])add('grit','#bc9a53',[x,y,51.04],[.22,.3,.12]);
  // Two irregular hide outlines, one mesh and a procedural brown/ivory pattern.
  const hide=[[-.7,-1],[-.25,-.87],[.15,-.91],[.75,-1],[.66,-.55],[.94,-.3],[.76,.12],[.98,.7],[.64,.62],[.35,.95],[0,.82],[-.38,.97],[-.66,.62],[-.98,.7],[-.78,.12],[-.95,-.28],[-.64,-.57]];
  const rugParts=[];
  for(const [x,z,sx,sz,angle] of [[-43.5,57.3,4.4,3.4,-.12],[-40.2,59,3.8,3.3,.22]]){
    const shape=new T.Shape(hide.map(([a,b])=>new T.Vector2(a*sx,-b*sz))),g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);g.rotateY(angle);g.translate(x,.105+rugParts.length*.012,z);rugParts.push(g);
  }
  const rugMaterial=new T.MeshStandardMaterial({color:'#e3ded0',roughness:1});
  rugMaterial.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 hidePosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nhidePosition=position;');
    shader.fragmentShader='varying vec3 hidePosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 p=hidePosition.xz;
      float mottling=sin(p.x*2.1+sin(p.y*3.7)*.8)*sin(p.y*2.8+sin(p.x*4.3)*.7);
      float edge=max(fwidth(mottling),.03);
      float spot=smoothstep(.10-edge,.10+edge,mottling+.17*sin(p.x*8.+p.y*9.));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.11,.066,.037),spot);
    `);
  };
  rugMaterial.customProgramCacheKey=()=> 'lounge-hide';
  const rug=new T.Mesh(mergeGeometries(rugParts),rugMaterial);rug.name='lounge-hide-rugs';rug.receiveShadow=true;scene.add(rug);rugParts.forEach(g=>g.dispose());
  // Low corner sofa; clear central route through the doorway.
  for(const [x,z,w,d] of [[-47,53,8,4],[-49,56.5,4,5]]){
    box('#353d3e',x,.9,z,w,1.3,d);box('#565d5e',x,1.8,z,w-.2,.6,d-.2);
  }
  box('#444b4e',-47,3.1,51.3,8,2.8,.65);box('#444b4e',-50.6,3.1,56, .65,2.8,7);
  for(const [x,z,w,d] of [[-48.8,53,3.8,3.7],[-44.9,53,3.7,3.7],[-49,56.3,3.7,2],[-49,58.4,3.7,1.8]])box('#62696a',x,2.12,z,w,.24,d);
  for(const [x,z,yaw,color] of [[-49,52.2,0,'#e1ddd1'],[-47,52.2,.2,'#bbb9af'],[-44.6,52.2,-.1,'#dad5c8'],[-49.7,55.4,1.4,'#dfddd4'],[-49.7,58,1.5,'#92948f']]){
    add('bud',color,[x,3,z],[.95,.9,.35],[-.16,yaw,.06]);
  }
  // Narrow oak boards, grain and dark sled legs match the rectangular low table.
  for(let i=0;i<4;i++)box(['#ac9473','#b6a080','#ad9578','#baa383'][i],-44.25+i*1.5,2.22,56.5,1.48,.25,4);
  for(const x of [-44.6,-39.4]){
    for(const z of [54.9,58.1])box(dark,x,1.13,z,.14,2.1,.14);
    box(dark,x,.13,56.5,.14,.14,3.35);
  }
  for(let i=0;i<3;i++)box('#948063',-43.8+i*1.5,2.351,56.4,.014,.003,3.5-i*.3);
  add('grit','#767775',[-42,2.57,56.5],[.48,.25,.34]);
  // Shag-covered chairs sit against the house, leaving the central doorway clear.
  for(const c of LOUNGE_CHAIRS){
    for(const dx of [-.9,.9])for(const dz of [-.9,.9])beam([c.x+dx,.1,c.z+dz],[c.x+dx*.8,1.5,c.z+dz*.8],.1,'#b6a080');
    add('bud','#dedbd0',[c.x,1.6,c.z],[1.3,.45,1.35]);add('bud','#dedbd0',[c.x,2.65,c.z-1],[1.3,1.1,.4],[-.2,0,0]);
  }
  // Tall silver candleholders at the glazing, as in the interior garden view.
  for(const x of [-50.8,-29.5]){
    add('disk',metal,[x,.22,61],[.55,.18,.55]);beam([x,.3,61],[x,5.2,61],.085,metal);
    for(const dx of [-.65,0,.65]){beam([x,3.5,61],[x+dx,4.25,61],.055,metal);beam([x+dx,4.25,61],[x+dx,5.05,61],.055,metal);box('#ede3cd',x+dx,5.35,61,.14,.6,.14);}
  }
  // A light ceiling lamp and a plant mark the room without cluttering the exit.
  add('cone','#e3dcc8',[-40,13.5,56],[.7,.75,.7]);beam([-40,14,56],[-40,16,56],.035,dark);
  add('cylinder','#93998c',[-30,1,52],[.75,2,.75]);
  for(let i=0;i<7;i++)add('bud',i%2?'#59735a':'#718565',[-30+Math.sin(i*2.4)*.4,2.5+i%3*.65,52+Math.cos(i*2.4)*.4],[.25,1.1,.3],[.2,i,.2]);
  // Upper balcony floor, facade openings and separate lower terrace shade.
  batch.add('box','#b3b5af',[BALCONY.x,23.8,BALCONY.z],[BALCONY.w,.4,BALCONY.d],[],true);
  for(const p of BALCONY_POSTS)batch.add('box',cream,[p.x,p.h/2,p.z],[p.w,p.h,p.d],[],true);
  for(const z of [18,27]){
    box('#98acab',-21.78,7,z,.12,13,7.2);
    for(const dz of [-3.6,0,3.6])box(cream,-21.64,7,z+dz,.17,13,.15);
    for(const y of [.5,13.5])box(cream,-21.61,y,z,.3,.2,7.4);
    box('#889e9f',-21.78,27.5,z,.13,7,6);
    for(const dz of [-3,0,3])box(cream,-21.64,27.5,z+dz,.16,7,.12);
    for(const y of [24.1,31])box(cream,-21.6,y,z,.22,.16,6.2);
    for(let y=11;y<13.5;y+=.35)box('#aaaead',-21.55,y,z,.16,.13,7.1);
  }
  for(const r of BALCONY_RAILS){
    const alongZ=r.d>r.w,length=alongZ?r.d:r.w;
    const point=(t,y)=>[r.x+(alongZ?0:t),y,r.z+(alongZ?t:0)];
    beam(point(-length/2,28),point(length/2,28),.08,metal);
    beam(point(-length/2,24.4),point(length/2,24.4),.05,metal);
    for(let t=-length/2;t<=length/2;t+=.85)beam(point(t,24),point(t,28),.045,metal);
  }
  // Rounded wicker chair backs have open fronts and thin curved ribs.
  for(const c of BALCONY_SEATS){
    add('disk',dark,[c.x,25.2,c.z],[2.1,.22,2.1]);
    for(const dx of [-1.3,1.3])for(const dz of [-1.3,1.3])beam([c.x+dx,24,c.z+dz],[c.x+dx,25.3,c.z+dz],.09,dark);
    for(let j=0;j<=20;j++){
      const a=Math.PI+j/20*Math.PI,x=c.x+Math.cos(a)*2.1,z=c.z+Math.sin(a)*2.1;
      beam([x,25.2,z],[x,27.5,z],.055,dark);
      if(j){const b=Math.PI+(j-1)/20*Math.PI;for(const y of [25.3,26.3,27.5])beam([c.x+Math.cos(b)*2.1,y,c.z+Math.sin(b)*2.1],[x,y,z],.075,dark);}
    }
  }
  add('disk','#637476',[-15.4,26.2,13],[1.2,.12,1.2]);add('cylinder',dark,[-15.4,25,13],[.55,2,.55]);
  for(const c of BALCONY_LOUNGERS){
    box(dark,c.x,25.2,c.z-1,3.5,.18,6);
    add('box',dark,[c.x,26.05,c.z+3.3],[3.5,.18,3.4],[-.65,0,0]);
    for(const dx of [-1.5,1.5])for(const dz of [-3.2,2.8])beam([c.x+dx,24,c.z+dz],[c.x+dx,25.3,c.z+dz],.07,dark);
  }
  for(const z of [20.5,25.5,30.5]){
    box('#c3c6b9',-9.2,25,z,1.4,2,4.8);box('#4d5745',-9.2,26.03,z,1.2,.08,4.6);
    for(let i=0;i<8;i++){
      const h=2+(i%3)*.9;add('bud',['#557055','#687c56','#7a805e'][i%3],[-9.2+Math.sin(i*2.4)*.3,26+h/2,z-2+i*.55],[.45,h/2,.55],[0,i,.13]);
    }
  }
  const fabric=(name,xa,xb,ya,yb,za,zb)=>{
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([xa,ya,za,xb,yb,za,xa,ya,zb,xb,yb,zb],3));g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();
    const m=new T.Mesh(g,new T.MeshStandardMaterial({color:'#e7e2d5',roughness:.95,side:T.DoubleSide}));m.name=name;m.castShadow=true;m.receiveShadow=true;scene.add(m);
    beam([xa,ya,za],[xa,ya,zb],.1);beam([xb,yb,za],[xb,yb,zb],.08);
    for(const z of [za+.4,zb-.4]){beam([xa,ya-.2,z],[(xa+xb)/2,(ya+yb)/2-.25,z+.25]);beam([(xa+xb)/2,(ya+yb)/2-.25,z+.25],[xb,yb,z]);}
  };
  fabric('upper-balcony-awning',-21.7,-9,34,31.8,11,30);
  fabric('lower-terrace-awning',-8.3,-3,23.25,21.8,11,32.5);
}
