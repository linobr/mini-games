import * as T from 'three';
import {AtmosphereState,nightAmount} from './atmosphere.js';
import {random,TAU} from './world.js';
const palettes=[
  ['#78b7cc','#eee2bb','#d0ddc9','#fff0ce',2.1,3.3],
  ['#80aec7','#f5cd9a','#ddd6ad','#ffd39a',2.0,2.8],
  ['#828faa','#f4b580','#d8bdab','#ffc17f',1.8,2.2],
  ['#4f557e','#c894a1','#9299b0','#dbb4ba',1.5,1.3],
  ['#101a39','#526888','#6a8193','#aabfe0',1.35,.85],
  ['#141b38','#5a7483','#718b92','#b9d8d8',1.45,1.0],
];
export function buildSky(scene,sun,hemi,rim){
  const state=new AtmosphereState(),top=new T.Color(),bottom=new T.Color(),fog=new T.Color(),light=new T.Color();
  const uniforms={top:{value:new T.Color(palettes[0][0])},bottom:{value:new T.Color(palettes[0][1])},night:{value:0},galaxy:{value:0},time:{value:0}};
  const sky=new T.Mesh(new T.SphereGeometry(290,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms,
    vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 direction;uniform vec3 top,bottom;uniform float night,galaxy,time;
    float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.3,.7));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    void main(){vec3 d=normalize(direction);vec3 col=mix(bottom,top,smoothstep(-.13,.7,d.y));
      float n=noise(d*7.+vec3(time*.002,0,0))*.6+noise(d*19.)*.28+noise(d*43.)*.12;
      float across=(dot(d,normalize(vec3(.38,.68,.62)))+.07*sin(d.x*5.))/.19;float band=exp(-across*across);
      float horizon=smoothstep(-.03,.2,d.y);
      vec3 nebula=mix(vec3(.22,.13,.32),vec3(.17,.35,.36),n);
      col+=nebula*band*(.18+galaxy*.95)*night*horizon*(.4+n);
      float laneAxis=(dot(d,normalize(vec3(.38,.68,.62)))+.025)/.028;float lane=exp(-laneAxis*laneAxis);col*=1.-lane*n*.32*night;
      col+=vec3(.52,.43,.29)*pow(n,4.)*band*galaxy*horizon*.65;
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`}));sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
  const rng=random(67384),positions=[],sizes=[],colors=[],c=new T.Color();
  for(let i=0;i<1600;i++){const y=.03+rng()*.96,a=rng()*TAU,r=Math.sqrt(1-y*y);positions.push(Math.cos(a)*r*270,y*270,Math.sin(a)*r*270);sizes.push(i%39===0?2.3:.6+rng()*1.2);c.set(['#e4d9be','#ccd8ed','#d5c8e5','#e6be92'][i%4]);colors.push(c.r,c.g,c.b);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('starSize',new T.Float32BufferAttribute(sizes,1));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const stars=new T.Points(g,new T.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,uniforms:{night:{value:0},time:{value:0},ratio:{value:1}},
    vertexShader:'attribute float starSize;uniform float ratio;uniform float time;varying vec3 tint;varying float flicker;void main(){tint=color;flicker=.82+.18*sin(time*.7+position.x);gl_PointSize=starSize*ratio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float night;varying vec3 tint;varying float flicker;void main(){float d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(tint,max(0.,1.-d*d)*night*flicker);\n#include <colorspace_fragment>\n}'}));stars.frustumCulled=false;stars.renderOrder=-9;scene.add(stars);
  const moon=new T.Mesh(new T.SphereGeometry(3.5,16,12),new T.MeshBasicMaterial({color:'#e5ddc2',transparent:true,opacity:0}));moon.position.set(-95,155,-150);scene.add(moon);
  return {state,sky,stars,moon,night:0,
    update(game,dt,time,cinematic,motion){
      state.update(game,dt,cinematic,motion);const a=Math.floor(state.phase),b=Math.min(5,a+1),k=state.phase-a,p=palettes[a],q=palettes[b];
      top.set(p[0]).lerp(newColor.set(q[0]),k);bottom.set(p[1]).lerp(newColor.set(q[1]),k);fog.set(p[2]).lerp(newColor.set(q[2]),k);light.set(p[3]).lerp(newColor.set(q[3]),k);
      uniforms.top.value.copy(top);uniforms.bottom.value.copy(bottom);scene.fog.color.copy(fog);scene.background.copy(bottom);sun.color.copy(light);
      hemi.intensity=T.MathUtils.lerp(p[4],q[4],k);sun.intensity=T.MathUtils.lerp(p[5],q[5],k);rim.intensity=.65+nightAmount(state.phase)*.45;
      const n=this.night=nightAmount(state.phase);hemi.color.set('#eff8e4').lerp(newColor.set('#b8cbe2'),n);hemi.groundColor.set('#61796e');
      sun.position.set(10+state.phase*8,50-state.phase*6,10);uniforms.night.value=n;uniforms.galaxy.value=Math.max(0,state.phase-4);uniforms.time.value=motion?0:time;
      stars.material.uniforms.night.value=n;stars.material.uniforms.time.value=motion?0:time;moon.material.opacity=n*.85;stars.visible=n>.01;moon.visible=n>.01;
    },
    quality(low,high,ratio=1){stars.geometry.setDrawRange(0,low?500:high?1600:1000);stars.material.uniforms.ratio.value=ratio;}
  };
}
const newColor=new T.Color();
