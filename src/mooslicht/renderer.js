import * as T from 'three';
import { buildScene } from './scene.js';
import { STONES, SEEDS, SHRINES, FLOWERS, ISLANDS, stonePosition, surfaceAt, random, clamp, TAU, TREE, SATELLITES, GUIDE, CHECKPOINTS, cameraFraction } from './world.js';

function radialTexture() {
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const d=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1),i=(y*size+x)*4;
    data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(Math.max(0,1-d)**2*255);
  }
  const t=new T.DataTexture(data,size,size);t.needsUpdate=true;return t;
}
const glowTexture=radialTexture();
export class Effects {
  constructor(scene) {
    this.capacity=180;this.cursor=0;this.random=random(343);
    this.positions=new Float32Array(this.capacity*3).fill(-1000);
    this.colors=new Float32Array(this.capacity*3);this.velocities=new Float32Array(this.capacity*3);
    this.life=new Float32Array(this.capacity);this.total=new Float32Array(this.capacity);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(this.positions,3).setUsage(T.DynamicDrawUsage));g.setAttribute('color',new T.BufferAttribute(this.colors,3).setUsage(T.DynamicDrawUsage));
    this.points=new T.Points(g,new T.PointsMaterial({size:.32,map:glowTexture,transparent:true,depthWrite:false,vertexColors:true,blending:T.AdditiveBlending}));this.points.frustumCulled=false;scene.add(this.points);
  }
  burst(x,y,z,color,count=16,force=2) {
    const c=new T.Color(color);
    for(let j=0;j<count;j++) {
      const i=this.cursor++%(this.activeCapacity||this.capacity),k=i*3,a=this.random()*TAU,v=.5+this.random()*force;
      this.positions.set([x,y,z],k);this.colors.set([c.r,c.g,c.b],k);
      this.velocities.set([Math.cos(a)*v,.8+this.random()*2.5,Math.sin(a)*v],k);
      this.life[i]=this.total[i]=.5+this.random()*.7;
    }
  }
  update(dt) {
    for(let i=0;i<this.capacity;i++)if(this.life[i]>0) {
      const k=i*3;this.life[i]-=dt;
      if(this.life[i]<=0){this.positions[k+1]=-1000;continue;}
      this.velocities[k+1]-=2.4*dt;
      for(let j=0;j<3;j++)this.positions[k+j]+=this.velocities[k+j]*dt;
    }
    this.points.geometry.attributes.position.needsUpdate=true;
    this.points.geometry.attributes.color.needsUpdate=true;
  }
}

export class WorldView {
  constructor(canvas,settings={}) {
    this.canvas=canvas;
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.02;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.world=buildScene();this.scene=this.world.scene;
    this.camera=new T.PerspectiveCamera(50,1,.1,360);
    this.yaw=0;this.pitch=.30;this.distance=7.4;this.target=new T.Vector3(-10,1,10);
    this.shake=0;this.cinematic=null;this.cineTime=0;this.overview=false;this.fpsFrames=0;this.fpsTime=0;this.fps=0;
    this.desired=new T.Vector3();this.look=new T.Vector3();this.temp=new T.Object3D();
    this.camera.position.set(36,80,64);this.camera.lookAt(0,0,-20);
    this.effects=new Effects(this.scene);this.clock=0;this.started=false;this.transition=0;
    this.motion=!!settings.motion;this.quality=settings.quality||'auto';this.autoLow=false;this.samples=0;this.sampleTime=0;
    const contactMaterial=new T.MeshBasicMaterial({color:'#173e3b',map:glowTexture,transparent:true,opacity:.42,depthWrite:false});
    this.shadow=new T.Mesh(new T.PlaneGeometry(1.8,1.8),contactMaterial);this.shadow.rotation.x=-Math.PI/2;this.scene.add(this.shadow);
    this.lampGlow=new T.Sprite(new T.SpriteMaterial({color:'#ffde91',map:glowTexture,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));this.lampGlow.scale.set(1.3,1.3,1.3);this.world.hero.root.add(this.lampGlow);this.lampGlow.position.set(-.43,.63,.11);
    // A translucent silhouette keeps the tiny hero visible behind a canopy.
    const silhouette=new T.MeshBasicMaterial({color:'#f7df9b',transparent:true,opacity:.32,depthFunc:T.GreaterDepth,depthWrite:false});
    const parts=[];this.world.hero.body.traverse(o=>{if(o.isMesh)parts.push(o);});
    for(const part of parts){const s=new T.Mesh(part.geometry,silhouette);s.scale.setScalar(1.015);s.renderOrder=5;part.add(s);}
    this.makeFireflies();this.applyQuality();this.resize();
  }
  makeFireflies() {
    const rng=random(749),count=80,positions=new Float32Array(count*3),phases=new Float32Array(count);
    for(let i=0;i<count;i++){
      const a=rng()*TAU,r=Math.sqrt(rng()),s=SATELLITES[i%SATELLITES.length];let x,y,z;
      if(i%4===0){x=TREE.x+Math.sin(a)*r*6;z=TREE.z+Math.cos(a)*r*6;y=1+rng()*5;}
      else if(i%4===1){x=-10+rng()*27;z=-28+rng()*40;y=.5+rng()*3;}
      else if(i%4===2){x=-5+rng()*16;z=-45+rng()*9;y=1.5+rng()*3;}
      else {x=s.x+Math.sin(a)*r*4;z=s.z+Math.cos(a)*r*4;y=s.y+.6+rng()*2;}
      positions.set([x,y,z],i*3);phases[i]=rng()*TAU;
    }

    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('phase',new T.BufferAttribute(phases,1));
    const m=new T.ShaderMaterial({uniforms:{time:{value:0},pixelRatio:{value:1},strength:{value:1},awake:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      vertexShader:'attribute float phase;uniform float awake;uniform float time;uniform float pixelRatio;varying float glow;void main(){vec3 p=position;p.y+=awake*mod(phase,2.)*.5;p.x+=sin(time*.45+phase)*.35;p.y+=sin(time*.75+phase)*.2;vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(42./max(1.,-v.z),1.,4.)*pixelRatio;glow=.4+.6*pow(sin(time*.9+phase)*.5+.5,2.);}',
      fragmentShader:'uniform float strength;varying float glow;void main(){float d=length(gl_PointCoord-.5)*2.;float a=max(0.,1.-d);gl_FragColor=vec4(1.,.85,.47,a*a*glow*strength);}' });
    this.fireflies=new T.Points(g,m);this.fireflies.frustumCulled=false;this.scene.add(this.fireflies);
  }
  resize() {
    const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;
    this.camera.aspect=w/h;this.camera.fov=w/h<.75?58:50;this.camera.updateProjectionMatrix();
    this.renderer.setSize(w,h,false);this.applyQuality();
  }
  applyQuality() {
    const low=this.quality==='low'||(this.quality==='auto'&&(this.autoLow||matchMedia('(pointer:coarse)').matches));
    const ratio=Math.min(devicePixelRatio||1,low?1:this.quality==='high'?2:1.5);
    this.renderer.setPixelRatio(ratio);this.renderer.shadowMap.enabled=!low;
    this.world.garden.quality(low,this.quality==='high');this.world.floating.quality(low,this.quality==='high');this.world.sky.quality(low,this.quality==='high',ratio);
    this.fireflies.geometry.setDrawRange(0,low?35:this.quality==='high'?80:55);
    this.effects.activeCapacity=low?72:this.quality==='high'?180:120;this.effects.points.geometry.setDrawRange(0,this.effects.activeCapacity);
    this.world.sun.castShadow=!low;this.fireflies.material.uniforms.pixelRatio.value=ratio;
  }
  orbit(dx,dy) { this.yaw-=dx*.006;this.pitch=clamp(this.pitch+dy*.003,-.10,1.15); }
  resetCamera() { this.yaw=0;this.pitch=.30;this.distance=7.4;this.overview=false; }
  zoom(delta) { this.distance=clamp(this.distance+delta*.012,4.5,14); }
  beginCinematic(kind){this.cinematic=kind;this.cineTime=0;}
  skipCinematic(){if(this.cinematic==='finale'){this.world.sky.state.finalAge=12;this.world.sky.state.phase=5;}this.cinematic=null;this.cineTime=0;this.started=false;this.transition=0;}
  event(e) {
    if(e.type==='hit'||e.type==='defeat')this.shake=.11;
    if(e.type==='hurt')this.shake=.18;
    const colors={seed:'#ffda76',wind:'#92f2ed',hit:'#d6c6f9',defeat:'#e4c9ed',light:e.color||'#ffe1a0',land:'#e6d6a4',chest:'#ffda76',hurt:'#eeae8a',note:FLOWERS[e.index||0].color};
    if(colors[e.type])this.effects.burst(e.x,e.y+.25,e.z,colors[e.type],e.type==='light'?64:e.type==='defeat'?28:e.type==='land'?8:14,e.type==='light'?3.2:1.5);
  }
  render(game,dt,intro=false) {
    const rawDt=clamp(dt,0,2);dt=clamp(dt,0,.1);this.clock+=dt;
    const w=this.world,p=game.player,time=this.clock;
    w.hero.root.position.set(p.x,p.y,p.z);w.hero.root.rotation.y+=Math.atan2(Math.sin(p.facing-w.hero.root.rotation.y),Math.cos(p.facing-w.hero.root.rotation.y))*(1-Math.exp(-dt*18));
    w.hero.root.visible=!(p.invulnerable>0&&Math.floor(time*12)%3===0);
    const walking=Math.min(1,Math.hypot(p.vx,p.vz)/4),cycle=p.walk*2.6;
    w.hero.legs[0].rotation.x=Math.sin(cycle)*.6*walking;
    w.hero.legs[1].rotation.x=-Math.sin(cycle)*.6*walking;
    w.hero.body.position.y=p.grounded?Math.sin(cycle*2)*.035*walking:0;
    w.hero.body.rotation.x=p.roll>0?(1-p.roll/.3)*TAU:0;
    w.hero.body.rotation.z=Math.sin(cycle)*.035*walking;
    w.hero.arm.rotation.x=-Math.sin(cycle)*.35*walking;
    w.hero.swordArm.rotation.x=p.attack>0?-1.6+Math.sin((1-p.attack/.32)*Math.PI)*2.2:Math.sin(cycle)*.22*walking;
    w.hero.swordArm.rotation.z=p.attack>0?-.7:0;
    w.hero.swordArm.rotation.y=p.attack>0?(1-p.attack/.32)*3.7-1.8:0;
    w.hero.slash.visible=p.attack>.06;w.hero.slash.rotation.z=-(1-p.attack/.32)*2.8+.4;
    w.hero.slash.material.opacity=p.attack/.32*.52;
    this.lampGlow.material.opacity=.6+Math.sin(time*4)*.12;
    const surface=surfaceAt(p.x,p.z,game.time,p.y+.2,game.energy);this.shadow.visible=Number.isFinite(surface.height)&&p.y>surface.height-.3;
    if(this.shadow.visible){this.shadow.position.set(p.x,surface.height+.028,p.z);this.shadow.material.opacity=clamp(.45-(p.y-surface.height)*.12,.06,.45);}
    for(let i=0;i<STONES.length;i++){const pos=stonePosition(STONES[i],game.time);w.stones[i].position.set(pos.x,pos.y,pos.z);w.stones[i].userData.ring.material.emissiveIntensity=.06+game.energy*.5;}
    for(let i=0;i<FLOWERS.length;i++) {
      const f=w.flowers[i],flash=game.flowerFlash[i];f.head.rotation.y=time*.13;f.head.rotation.z=Math.sin(time*1.4+i)*.06;
      f.head.scale.setScalar(1+flash*.3);f.head.position.y=.88+Math.sin(time*1.8+i)*.035;
    }
    SHRINES.forEach((s,i)=>{
      const v=w.shrines[i],awake=game.quests[s.id];v.crystal.position.y=1.4+Math.sin(time*2+i)*.12;v.crystal.rotation.y=time*.6;
      v.crystal.material.emissiveIntensity=awake?1.25:.45;v.ring.rotation.y=Math.sin(time*.25+i)*.35;v.ring.rotation.z=time*.08;
      v.beam.material.opacity=awake?.055+Math.sin(time*1.5)*.012:0;
    });
    SEEDS.forEach((s,i)=>{
      this.temp.position.set(s.x,s.y+Math.sin(time*2+i)*.09,s.z);this.temp.rotation.set(0,time*.8+i,.2);
      this.temp.scale.setScalar(game.seeds.has(i)?0:.12);this.temp.updateMatrix();w.seeds.setMatrixAt(i,this.temp.matrix);
    });w.seeds.instanceMatrix.needsUpdate=true;
    w.windOrbs.forEach((o,i)=>{o.visible=!game.wind.has(i);o.rotation.y=time*.8;});
    w.guide.position.y=GUIDE.y+Math.sin(time*2)*.045;w.guide.rotation.y=Math.atan2(p.x-w.guide.position.x,p.z-w.guide.position.z)*.65;
    w.lid.rotation.x=T.MathUtils.damp(w.lid.rotation.x,game.chest?-1.4:0,5,dt);
    w.heart.rotation.y=Math.sin(time*.3)*.2;w.heart.position.y=2.45+Math.sin(time*1.6)*.1;
    w.heartCore.material.emissiveIntensity=game.finished?2:.2+game.lights*.25;
    w.heart.scale.setScalar(game.finished?1.4:1);
    if(game.finished && !this.motion && Math.random()<dt*8)this.effects.burst(TREE.x+Math.sin(time)*3,5,TREE.z+Math.cos(time)*3,'#f6d47c',2,.7);
    if(game.chest&&walking>.4&&p.grounded&&Math.random()<dt*15)this.effects.burst(p.x,p.y+.5,p.z,'#ffe399',1,.2);
    for(const v of w.guardians) {
      const g=game.guards[v.id];v.root.visible=g.health>0;if(!v.root.visible)continue;
      v.root.position.set(g.x,g.y,g.z);v.root.rotation.y=g.facing;
      v.body.position.y=g.state==='windup'?Math.sin(time*30)*.045:Math.sin(time*3+g.id)*.03;
      v.body.scale.set(1+(g.hit>0?.1:0),g.state==='windup'?.83:g.hit>0?.88:1,1);
      v.warning.visible=g.state==='windup';v.warning.material.opacity=.12+(1-g.timer/.8)*.42;
    }
    w.sky.update(game,dt,time,!!this.cinematic,this.motion);
    const finalAge=w.sky.state.finalAge;
    w.garden.update(time,game,this.motion,w.sky.night,finalAge);w.floating.update(time,game,w.sky.night,finalAge,this.motion);
    this.fireflies.material.uniforms.strength.value=.12+game.energy*.25+w.sky.night*.6;
    this.fireflies.material.uniforms.awake.value=game.finished?Math.max(0,finalAge-4):0;
    this.fireflies.material.uniforms.time.value=this.motion?0:time;this.effects.update(dt);
    this.shake=Math.max(0,this.shake-dt);
    if(this.cinematic){
      this.cineTime+=dt;const t=this.cineTime;
      if(this.cinematic==='arrival'){
        // Grass first, then the familiar landmarks, finally the floating edge.
        const k=T.MathUtils.smoothstep(t,0,3.5),reveal=T.MathUtils.smoothstep(t,3.5,9.5);
        this.camera.position.set(-11+5*k+50*reveal,1.2+4*k+26*reveal,15-2*k+42*reveal);
        this.camera.lookAt(-2+2*reveal,3+3*k-3*reveal,-24+7*reveal);
        if(t>=10)this.skipCinematic();
      } else {
        const k=T.MathUtils.smoothstep(t,5,10.5);
        this.camera.position.set(21+15*k,14+66*k,-7+71*k);
        this.camera.lookAt(TREE.x*(1-k),10*(1-k)+k,-19);
        if(t>=11)this.skipCinematic();
      }
    } else if(intro || this.overview) {
      this.camera.position.set(36,80,64);this.camera.lookAt(0,0,-20);
      if(this.camera.aspect<.75){this.camera.position.set(25,112,92);this.camera.lookAt(0,0,-20);}
    } else {
      if(!this.started){this.started=true;this.target.set(p.x,p.y+1.65,p.z);}
      this.transition=Math.min(1,this.transition+dt);
      const alpha=1-Math.exp(-dt*(this.motion?14:8));
      this.target.lerp(this.look.set(p.x,p.y+1.65,p.z),alpha);
      const d=(this.distance+walking*.35)*(this.camera.aspect<.75?1.1:1);
      this.desired.set(this.target.x+Math.sin(this.yaw)*d,this.target.y+d*this.pitch,this.target.z+Math.cos(this.yaw)*d);
      const fraction=cameraFraction(this.target,this.desired);
      this.desired.lerpVectors(this.target,this.desired,fraction);
      this.camera.position.lerp(this.desired,1-Math.exp(-dt*(this.transition<1?5:12)));
      // Apply collision again after smoothing to avoid crossing a corner on an orbit.
      const actual=cameraFraction(this.target,this.camera.position);
      if(actual<1)this.camera.position.lerpVectors(this.target,this.camera.position,actual);
      if(!this.motion&&this.shake>0){this.camera.position.x+=Math.sin(time*101)*this.shake*.25;this.camera.position.y+=Math.cos(time*93)*this.shake*.17;}
      this.camera.lookAt(this.target);
    }
    // Sky follows the eye: no parallax or clipping at high garden viewpoints.
    w.sky.sky.position.copy(this.camera.position);w.sky.stars.position.copy(this.camera.position);w.sky.moon.position.copy(this.camera.position).add(this.look.set(-95,155,-150));
    this.renderer.render(this.scene,this.camera);
    this.fpsFrames++;this.fpsTime+=rawDt;if(this.fpsTime>=1){this.fps=Math.round(this.fpsFrames/this.fpsTime);this.fpsFrames=0;this.fpsTime=0;}

    if(!intro&&game.running&&this.transition>=1&&this.quality==='auto'&&!this.autoLow) {
      this.sampleTime+=rawDt;this.samples++;
      if(this.sampleTime>4){if(this.samples/this.sampleTime<40){this.autoLow=true;this.applyQuality();}this.sampleTime=0;this.samples=0;}
    }
  }
  dispose() {
    const geometries=new Set(),materials=new Set();this.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.renderer.dispose();
  }
}
