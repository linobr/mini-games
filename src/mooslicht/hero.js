import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cleanAppearance,appearanceColor} from './appearance.js';

// Both the garden and neutral preview instantiate this exact model. Geometry is
// owned by each instance, prebuilt once and bounded across appearance changes.
export function makeHero(appearance){
  const root=new T.Group(),body=new T.Group();root.add(body);
  const geometries={sphere:new T.SphereGeometry(1,12,8),curl:new T.SphereGeometry(1,8,6),box:new T.BoxGeometry(1,1,1),cone:new T.ConeGeometry(1,1,10),cylinder:new T.CylinderGeometry(1,1,1,8)};
  const materials={};
  for(const [key,color] of Object.entries({skin:'#ecc29c',hair:'#846044',eye:'#3988cd',outfit:'#477e9d',cloak:'#35546b',gold:'#e0bd74',boots:'#344848',white:'#fff9ee',pupil:'#183540',nose:'#deb390',pack:'#58785f',wood:'#866547',light:'#ffdb83',steel:'#dce7d6',leaf:'#9bbf76'}))materials[key]=new T.MeshStandardMaterial({color,roughness:.76});
  materials.light.emissive.set('#ffdb83');materials.light.emissiveIntensity=1.1;
  const mesh=(shape,role,scale,pos,parent=body)=>{const m=new T.Mesh(geometries[shape],materials[role]);m.scale.set(...scale);m.position.set(...pos);m.receiveShadow=true;parent.add(m);return m;};
  const tunic=mesh('cone','outfit',[.48,.72,.4],[0,.93,0]);tunic.rotation.y=Math.PI/10;
  const shoulders=mesh('sphere','outfit',[.36,.22,.23],[0,1.13,0]);
  const cloak=mesh('cone','cloak',[.42,.78,.19],[0,.94,-.24]);cloak.rotation.x=-.15;
  mesh('sphere','skin',[.18,.2,.16],[0,1.23,.03]);
  const head=mesh('sphere','skin',[.31,.32,.29],[0,1.53,.03]);
  mesh('box','gold',[.63,.065,.45],[0,.8,0]);mesh('box','gold',[.1,.13,.025],[0,.82,.25]);
  mesh('sphere','gold',[.06,.075,.035],[0,1.19,.24]);
  const leaf=mesh('sphere','leaf',[.065,.19,.025],[.22,1.94,-.015]);leaf.rotation.z=-.52;
  for(const x of [-.115,.115]){
    mesh('sphere','white',[.066,.078,.028],[x,1.55,.287]);
    mesh('sphere','eye',[.05,.064,.018],[x,1.55,.311]);
    mesh('sphere','pupil',[.021,.041,.01],[x,1.55,.326]);
    mesh('sphere','white',[.012,.016,.008],[x-.013,1.575,.334]);
    const brow=mesh('sphere','hair',[.06,.013,.016],[x,1.65,.283]);brow.rotation.z=x<0?.12:-.12;
    mesh('sphere','skin',[.059,.079,.065],[Math.sign(x)*.30,1.53,.01]);
  }
  mesh('sphere','nose',[.042,.033,.038],[0,1.475,.318]);
  mesh('sphere','nose',[.055,.012,.013],[0,1.417,.293]);
  mesh('box','pack',[.39,.44,.20],[0,1.03,-.36]);
  for(const x of [-.15,.15])mesh('box','gold',[.045,.46,.025],[x,1.03,-.47]);
  const hairGeometries={};
  for(const style of ['curly','short','long']){
    const parts=[],tmp=new T.Object3D();
    const part=(pos,scale,curl=false)=>{tmp.position.set(...pos);tmp.scale.set(...scale);tmp.rotation.set(0,0,0);tmp.updateMatrix();parts.push(geometries[curl?'curl':'sphere'].clone().applyMatrix4(tmp.matrix));};
    part([0,1.79,-.055],[.325,.17,.29]);
    if(style==='curly')for(let i=0;i<20;i++){
      const a=i*2.4,r=i<13?.27:.16;part([Math.cos(a)*r,1.78+Math.sin(i*1.7)*.047+(i>=13?.11:0),-.04+Math.sin(a)*r*.86],[.103,.105,.102],true);
    }
    if(style==='short')for(const [x,y,z] of [[-.14,1.84,.04],[.03,1.86,.08],[.19,1.81,.10]])part([x,y,z],[.13,.1,.17]);
    if(style==='long'){
      part([0,1.48,-.19],[.32,.43,.18]);
      for(const side of [-1,1])for(let i=0;i<3;i++)part([side*(.265-i*.026),1.46+i*.07,-.08-i*.09],[.085,.31,.095]);
      part([-.15,1.78,.13],[.2,.12,.13]);
    }
    hairGeometries[style]=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  }
  const hair=new T.Mesh(hairGeometries.curly,materials.hair);hair.receiveShadow=true;body.add(hair);
  const legs=[];
  for(const x of [-.18,.18]){
    const pivot=new T.Group();pivot.position.set(x,.65,0);body.add(pivot);
    mesh('cylinder','cloak',[.10,.35,.10],[0,-.2,0],pivot);mesh('sphere','boots',[.15,.14,.23],[0,-.51,.06],pivot);legs.push(pivot);
  }
  const arm=new T.Group();arm.position.set(-.41,1.15,0);body.add(arm);
  const swordArm=new T.Group();swordArm.position.set(.42,1.14,0);body.add(swordArm);
  for(const a of [arm,swordArm]){mesh('cylinder','outfit',[.12,.31,.12],[0,-.17,0],a);mesh('cylinder','gold',[.124,.045,.124],[0,-.3,0],a);mesh('sphere','skin',[.115,.115,.115],[0,-.34,.015],a);}
  const lamp=new T.Group();lamp.position.set(0,-.51,.06);arm.add(lamp);mesh('box','wood',[.21,.27,.21],[0,0,0],lamp);
  const lampCore=mesh('sphere','light',[.095,.115,.095],[0,0,.083],lamp);
  const sword=mesh('box','steel',[.105,.70,.07],[0,-.76,.06],swordArm);sword.rotation.z=-.1;
  mesh('box','gold',[.34,.09,.13],[0,-.41,.06],swordArm);
  const slash=new T.Mesh(new T.RingGeometry(.8,2.15,32,1,0,2),new T.MeshBasicMaterial({color:'#fff4c2',transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}));
  slash.rotation.x=-Math.PI/2;slash.position.y=1;root.add(slash);slash.visible=false;
  function applyAppearance(value){
    const a=cleanAppearance(value),female=a.variant==='feminine';
    for(const [role,key] of [['skin','skin'],['hair','hairColor'],['eye','eyes'],['outfit','outfit']])materials[role].color.set(appearanceColor(key,a[key]));
    materials.cloak.color.copy(materials.outfit.color).multiplyScalar(.62);materials.nose.color.copy(materials.skin.color).multiplyScalar(.85);
    head.scale.set(female?.292:.31,female?.327:.32,.29);tunic.scale.x=female?.45:.48;
    shoulders.scale.x=female?.33:.36;
    arm.position.x=female?-.38:-.41;swordArm.position.x=female?.39:.42;
    hair.geometry=hairGeometries[a.hair];
    // The existing stencil aid is a child of each part and must follow hairstyle swaps.
    for(const overlay of hair.children)if(overlay.isMesh)overlay.geometry=hair.geometry;
  }
  applyAppearance(appearance);
  return {root,body,legs,arm,swordArm,slash,lampCore,applyAppearance,
    dispose(){Object.values(geometries).forEach(g=>g.dispose());Object.values(hairGeometries).forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());slash.geometry.dispose();slash.material.dispose();},
  };
}
