import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HOUSE_RETURN,REAR_OUTLINE,LAWN_CURVE,LOUNGE,BALCONY,BALCONY_POSTS,BALCONY_RAILS,BALCONY_SEATS,BALCONY_LOUNGERS} from './garden-layout.js';

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
  // A shallow roof return and side windows give depth without inventing interiors.
  box('#85817b',-38,wall.h,47.5,28,.25,5);
  for(const x of [-46,-34]){
    box(cream,x,23,50.3,6.5,7.5,.2);box('#9caead',x,23,50.43,5.9,6.9,.06);
    box(cream,x,23,50.48,.12,7,.09);box(cream,x,23,50.48,6,.12,.09);
  }
  beam([-22,0,49.6],[-22,wall.h,49.6],.12,'#a6afac');
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
  const roof=new T.Mesh(new T.BoxGeometry(24.3,.25,12.3),new T.MeshStandardMaterial({color:'#d6d8d0',roughness:.9}));
  roof.position.set(-40,16.125,56);roof.castShadow=true;roof.receiveShadow=true;scene.add(roof);
  box('#909b96',-40,16.05,62.28,24.5,.2,.12);
  // Gathered cloth: the width narrows at the tie, with small continuous folds.
  for(const x of [-43.2,-36.8]){
    const vertices=[],indices=[];
    for(let row=0;row<=12;row++)for(let col=0;col<=10;col++){
      const t=row/12,u=col/10,width=.55+1.05*Math.min(1,Math.abs(t-.35)*3);
      vertices.push(x+(u-.5)*width,.15+t*15.4,62.35+Math.sin(u*Math.PI*8)*(.05+.08*Math.abs(t-.35)));
      if(row<12&&col<10){const k=row*11+col;indices.push(k,k+1,k+11,k+1,k+12,k+11);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();curtains.push(g);
    box('#b1a88c',x,5.5,62.48,.65,.12,.18);
  }
  const cloth=new T.Mesh(mergeGeometries(curtains),new T.MeshStandardMaterial({color:'#ece8dc',roughness:1,side:T.DoubleSide}));cloth.receiveShadow=true;scene.add(cloth);curtains.forEach(g=>g.dispose());
  const glass=new T.Mesh(mergeGeometries(panes),new T.MeshStandardMaterial({color:'#c4d7d5',transparent:true,opacity:.13,roughness:.2,metalness:.1,side:T.DoubleSide,depthWrite:false}));
  glass.name='lounge-window-glass';scene.add(glass);panes.forEach(g=>g.dispose());unit.dispose();
  // Low corner sofa; clear central route through the doorway.
  for(const [x,z,w,d] of [[-47,53,8,4],[-49,56.5,4,5]]){
    box('#444b4e',x,.9,z,w,1.3,d);box('#737a7b',x,1.8,z,w-.2,.6,d-.2);
  }
  box('#626b6e',-47,3.1,51.3,8,2.8,.65);box('#626b6e',-50.6,3.1,56, .65,2.8,7);
  for(const [x,z] of [[-49,52.3],[-46.2,52.3],[-49.8,56.5]])add('bud','#b9b6ab',[x,2.7,z],[1,.75,.45],[.15,.2,.15]);
  box('#a69277',-42,2.22,56.5,6,.25,4);
  for(const x of [-44.6,-39.4])for(const z of [54.9,58.1])beam([x,.08,z],[x,2.1,z],.1,dark);
  add('cylinder','#b29d86',[-42,2.65,56.5],[.38,.6,.38]);
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
