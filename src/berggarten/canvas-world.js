import { WORLD_WIDTH, PLOTS, BUILDINGS } from './evolution.js';
import { ZONES } from './engine.js';
import { meadowColors, trailColor, woodColors, crystalColors, trailCenter, eveningLight, cameraFocus, paintAlpineBackdrop, meadowArch, meadowSpur, meadowBank } from './scenery.js';
const cssColor = value => `#${value.toString(16).padStart(6, '0')}`;
const meadow = meadowColors.map(cssColor);
const bushes = woodColors.map(cssColor);
const crystals = crystalColors.map(cssColor);
// The same tycoon stays playable on devices where WebGL is unavailable.
export class CanvasGardenWorld{
constructor(canvas,state){this.canvas=canvas;this.state=state;this.ctx=canvas.getContext('2d');if(!this.ctx)throw Error('Canvas unavailable');this.angle=Math.PI/4;this.zoom=1;this.player={rotation:{y:0},userData:{swing:0}};this.time=0;this.effects=[];this.hitTimes=new Map();this.resize();}
resize(){const r=this.canvas.getBoundingClientRect();this.W=r.width;this.H=r.height;const d=Math.min(devicePixelRatio||1,2);this.canvas.width=this.W*d;this.canvas.height=this.H*d;this.ctx.setTransform(d,0,0,d,0,0);this.scale=this.H/(this.W<650?335:390)*this.zoom;}
rebuild(){}
project(x,y,h=0){const c=Math.cos(this.angle),s=Math.sin(this.angle);return{x:this.ox+((x-8.5)*c-(y-7)*s)*43*this.scale,y:this.oy+((x-8.5)*s+(y-7)*c)*24*this.scale-h*28*this.scale};}
pick(clientX,clientY){const r=this.canvas.getBoundingClientRect(),x=clientX-r.left,y=clientY-r.top;const candidates=this.state.nodes.filter(n=>n.zone<=this.state.zones&&n.ready<=Date.now()).map(n=>{const p=this.project(n.x,n.y);return{n,p};}).sort((a,b)=>b.p.y-a.p.y);for(const{n,p}of candidates){const h=n.type==='crystal'?55:n.type==='bush'?38:32;if(Math.abs(x-p.x)<23*this.scale&&y<p.y+9*this.scale&&y>p.y-h*this.scale)return{node:n,x:n.x,y:n.y};}
const a=(x-this.ox)/(43*this.scale),b=(y-this.oy)/(24*this.scale),c=Math.cos(this.angle),s=Math.sin(this.angle);return{x:a*c+b*s+8.5,y:-a*s+b*c+7};}
screen(x,y,height=1.5){return this.project(x,y,height);}
poly(pts,c){const ctx=this.ctx;ctx.fillStyle=c;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();}
ell(x,y,rx,ry,c){const ctx=this.ctx;ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
line(pts,c,w=2){const ctx=this.ctx;ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}
text(t,x,y,size,c='#fef8dc'){this.ctx.fillStyle=c;this.ctx.font=`600 ${size}px system-ui`;this.ctx.textAlign='center';this.ctx.fillText(t,x,y);}
flower(x,y,c){this.ell(x,y,4,4,c);this.ell(x,y,1.3,1.3,'#efd67d');}
node(n,selected,hover,reduced){const p=this.project(n.x,n.y),s=this.scale,ctx=this.ctx;ctx.save();ctx.translate(p.x,p.y);ctx.scale(s,s);this.ell(0,3,20,9,'#47663527');if(n.ready>Date.now()){this.ell(0,1,7,3,n.type==='bush'?'#83a85e':'#9cab95');ctx.restore();return;}if(n.zone>=this.state.zones)ctx.globalAlpha=.6;const h=this.hitTimes.get(n.id)||0;if(h>0&&!reduced)ctx.translate(Math.sin(h*25)*2,0);
if(n.type==='bush'){this.line([{x:0,y:0},{x:0,y:-19}],'#927148',5);this.ell(-10,-14,13,11,bushes[n.id%4]);this.ell(10,-16,14,12,bushes[(n.id+1)%4]);this.ell(0,-24-n.id%5,15,12,bushes[(n.id+2)%4]);this.ell(-4,-28,7,5,'#99aa6a');for(let i=0;i<3;i++)this.flower(Math.sin(i*2+n.id)*12,-17-i*4,['#f3de9e','#efcbbb','#e7e9b6'][n.id%3]);}
else if(n.type==='rock'){this.poly([{x:-21,y:0},{x:-17,y:-24},{x:-2,y:-34},{x:17,y:-24},{x:23,y:-4},{x:8,y:7}], '#718691');this.poly([{x:-17,y:-24},{x:-2,y:-34},{x:17,y:-24},{x:5,y:-11},{x:-8,y:-10}],'#a5b5bb');this.poly([{x:5,y:-11},{x:17,y:-24},{x:23,y:-4},{x:8,y:7}],'#8b9fa4');this.ell(-12,2,6,3,'#8aa364');}
else{for(let i=0;i<3;i++){const x=(i-1)*12,top=-35-i*8;this.poly([{x:x-7,y:2},{x:x-8,y:top+12},{x,y:top},{x:x+8,y:top+12},{x:x+6,y:3}],crystals[i]);this.poly([{x,y:top},{x:x+8,y:top+12},{x:x+6,y:3},{x:x+1,y:top+19}],'#c5f0de');}this.text('✧',8,-30,14);}
const hp={bush:3,rock:6,crystal:10}[n.type];if(n.hp<hp){ctx.fillStyle='#3d5b43';ctx.fillRect(-16,9,32,4);ctx.fillStyle='#ecd189';ctx.fillRect(-16,9,32*n.hp/hp,4);}if((selected?.id===n.id||hover?.id===n.id)&&n.zone<this.state.zones){ctx.strokeStyle='#fff0b6';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,3,25,11,0,0,Math.PI*2);ctx.stroke();}ctx.restore();}
person(x,y,color,moving=false,worker=false){const p=this.project(x,y),s=this.scale,ctx=this.ctx;ctx.save();ctx.translate(p.x,p.y);ctx.scale(s,s);this.ell(0,3,11,5,'#3b584932');if(!worker){this.ell(0,2,16,7,'#ffe9b5');this.ell(0,2,13,5.5,'#466b48');}const bob=moving?Math.sin(this.time*14)*1.5:0;ctx.translate(0,bob);this.line([{x:-4,y:-9},{x:-4,y:0}],'#41565a',5);this.line([{x:4,y:-9},{x:4,y:0}],'#41565a',5);this.ell(0,-17,9,11,color);this.ell(0,-30,8,8,'#ffd6ab');this.ell(0,-37,13,3,'#577c5a');this.poly([{x:-7,y:-41},{x:7,y:-41},{x:8,y:-36},{x:-8,y:-36}],'#7d9c6c');this.ell(3,-30,1,1.3,'#486046');const swing=worker?Math.sin(this.time*4)*4:Math.sin((this.player.userData.swing||0)*Math.PI)*15;this.line([{x:7,y:-14},{x:14,y:-27-swing}],'#a17a48',3);this.line([{x:7,y:-28-swing},{x:21,y:-24-swing}],'#c7d5d3',4);ctx.restore();}
house(x,y,name,roof,size=1){const p=this.project(x,y),s=this.scale*size,ctx=this.ctx;ctx.save();ctx.translate(p.x,p.y);ctx.scale(s,s);this.ell(0,8,40,18,'#3f68462a');this.poly([{x:-30,y:-9},{x:0,y:5},{x:0,y:-35},{x:-30,y:-48}],'#c4a778');this.poly([{x:0,y:5},{x:30,y:-10},{x:30,y:-48},{x:0,y:-35}],'#f0dcb4');this.poly([{x:-38,y:-45},{x:-1,y:-68},{x:38,y:-46},{x:0,y:-23}],roof);this.poly([{x:-38,y:-45},{x:-1,y:-68},{x:0,y:-50},{x:-22,y:-36}],'#ffffff22');ctx.fillStyle='#9d7952';ctx.fillRect(5,-19,10,20);ctx.fillStyle='#5d4536';ctx.fillRect(-24,-31,15,14);ctx.fillStyle='#f6bf6a';ctx.fillRect(-22,-29,11,10);ctx.fillStyle='#6d5341';ctx.fillRect(-17,-29,1,10);this.text(name,0,24,9,'#43633f');ctx.restore();}
garden(){const p=this.project(9,2),s=this.scale;if(this.state.projects>=1){for(let i=0;i<3;i++){const q=this.project(7.5+i,3.4);this.ell(q.x,q.y,20*s,10*s,'#ac986e');for(let j=0;j<5;j++)this.flower(q.x+Math.sin(j*3)*13*s,q.y+Math.cos(j*3)*4*s,['#eebdc1','#f0d58f','#f6efce'][i]);}}
if(this.state.projects>=2){this.ell(p.x,p.y,32*s,16*s,'#b3c1b2');this.ell(p.x,p.y-5*s,28*s,14*s,'#d9dfd0');this.ell(p.x,p.y-7*s,21*s,10*s,'#96cfd0');this.line([{x:p.x,y:p.y-8*s},{x:p.x,y:p.y-35*s}],'#d8eee0',4*s);for(let i=0;i<4;i++)this.ell(p.x+Math.sin(this.time*3+i)*9*s,p.y-(14+i*7)*s,2*s,3*s,'#d9f1e5');}if(this.state.projects>=3)this.house(9,.2,'PAVILLON','#73926c');}
hit(n,broken){this.hitTimes.set(n.id,.35);this.player.userData.swing=1;if(broken)for(let i=0;i<15;i++)this.effects.push({x:n.x,y:n.y,h:.8,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2,vh:1+Math.random()*2,life:.7,color:n.type==='bush'?'#bad581':n.type==='rock'?'#c6d3d4':'#ace8ce'});}
drawTerrain() {
  for (let i = 1; i < meadowBank.length; i++) {
    const [x1, y1, outerX1, outerY1] = meadowBank[i - 1];
    const [x2, y2, outerX2, outerY2] = meadowBank[i];
    const top1 = this.project(x1, y1), top2 = this.project(x2, y2);
    const bottom1 = this.project(outerX1, outerY1, -Math.min(1.7, Math.hypot(x1 - outerX1, y1 - outerY1)));
    const bottom2 = this.project(outerX2, outerY2, -Math.min(1.7, Math.hypot(x2 - outerX2, y2 - outerY2)));
    this.poly([top1, top2, bottom2], i % 2 ? '#708565' : '#7a8b68');
    this.poly([top1, bottom2, bottom1], i % 2 ? '#82968a' : '#8da097');
  }
  for (let zone = 0; zone < ZONES.length; zone++) {
    const start = zone * 6 - .5, end = start + 6;
    const corners = [this.project(start, -.5), this.project(end, -.5), this.project(end, 14.5), this.project(start, 14.5)];
    this.poly(corners, zone >= this.state.zones ? '#819487' : meadow[zone]);
    for (let i = 0; i < 25; i++) {
      const x = start + .25 + (i * 1.73) % 5.7, y = (i * 3.79) % 14;
      if (Math.abs(y - trailCenter(x)) < 1.2) continue;
      const point = this.project(x, y);
      this.ell(point.x, point.y, 4.5 * this.scale, 2 * this.scale, zone === 4 ? '#a8bdba' : '#9fb27b');
    }
  }
  this.line(meadowSpur.map(([x, y]) => this.project(x, y)), '#b8aa7a', 14 * this.scale);
  for (const [halfWidth, color] of [[1.05, '#a49d66'], [.84, cssColor(trailColor)]]) {
    const near = [], far = [];
    for (let i = 0; i <= WORLD_WIDTH * 4; i++) {
      const x = i / 4 - .5, y = trailCenter(x);
      near.push(this.project(x, y - halfWidth));
      far.push(this.project(x, y + halfWidth));
    }
    this.poly([...near, ...far.reverse()], color);
  }
}
spruce(x, y, size) {
  const p = this.project(x, y), s = this.scale * size;
  this.line([{ x: p.x, y: p.y }, { x: p.x, y: p.y - 31 * s }], '#564737', 4 * s);
  for (let i = 0; i < 3; i++) {
    const radius = (21 - i * 4) * s, base = p.y - (7 + i * 12) * s;
    this.poly([{ x: p.x - radius, y: base }, { x: p.x, y: base - 30 * s }, { x: p.x + radius, y: base }], ['#31554b', '#3a6450', '#50785a'][i]);
  }
}
drawArch(dusk) {
  const { x, y, radius } = meadowArch;
  const spring = .8;
  const ring = [];
  for (let i = 0; i <= 12; i++) {
    const angle = i * Math.PI / 12;
    ring.push(this.project(x, y + Math.cos(angle) * radius, spring + Math.sin(angle) * 1.12));
  }
  for (const side of [-1, 1]) {
    this.line([this.project(x, y + side * radius), this.project(x, y + side * radius, spring)], '#747f76', 10 * this.scale);
  }
  this.line(ring, '#929789', 11 * this.scale);
  for (let i = 1; i < ring.length - 1; i += 2) {
    this.line([ring[i], { x: ring[i].x, y: ring[i].y + 4 * this.scale }], '#6f786e', this.scale);
  }
  const mark = ring[6], radiusPx = this.scale * 1.65;
  const glow = `rgba(158,231,214,${.42 + dusk * .54})`;
  for (let i = 0; i < 5; i++) {
    const angle = i / 5 * Math.PI * 2;
    this.ell(mark.x + Math.cos(angle) * radiusPx, mark.y + Math.sin(angle) * radiusPx, radiusPx * .61, radiusPx * .61, glow);
  }
}
render(dt,p,selected,hover,reduced){
this.time+=reduced?0:dt;
this.scale=this.H/(this.W<650?335:390)*this.zoom;
this.ox=0;this.oy=0;
const focus=cameraFocus(p),target=this.project(focus.x,focus.y);
this.ox=this.W*.5-target.x;
this.oy=this.H*.54-target.y;
const ctx=this.ctx;
const dusk=eveningLight(this.state.dayClock);
paintAlpineBackdrop(ctx,this.W,this.H,dusk);
this.drawTerrain();
// Painter ordering also follows camera rotation.
const actors=this.state.nodes.filter(n=>{const q=this.project(n.x,n.y);return n.zone<=this.state.zones&&q.x>-80&&q.x<this.W+80&&q.y>-80&&q.y<this.H+120;}).map(n=>({depth:this.project(n.x,n.y).y,draw:()=>this.node(n,selected,hover,reduced)}));actors.push({depth:this.project(p.x,p.y).y,draw:()=>this.person(p.x,p.y,'#d26a3d',p.moving)});actors.push({depth:this.project(1,11).y,draw:()=>this.house(1,11,'BERGHAUS','#705045')});if(this.state.workshop)actors.push({depth:this.project(1,9).y,draw:()=>this.house(1,9,'MANUFAKTUR','#6b96a3')});actors.push({depth:this.project(9,2).y,draw:()=>this.garden()});for(let i=0;i<this.state.workers;i++){const x=Math.min(this.state.zones*6-1,2+i*3)+Math.sin(this.time*.4+i)*1.2,y=5.8+Math.cos(this.time*.4+i)*.4;actors.push({depth:this.project(x,y).y,draw:()=>this.person(x,y,['#9cbec9','#d5be85','#b3a1cc'][i],true,true)});}for(const b of this.state.buildings){const p=PLOTS.find(p=>p.id===b.plot);actors.push({depth:this.project(p.x,p.y).y,draw:()=>{this.house(p.x,p.y,BUILDINGS[b.kind].name,'#749b94',.6);}});}
for(const [x,y,size] of [[-.65,4,1.05],[-.85,5,.84],[-.7,10,1.12],[-.77,11.7,1.2],[.6,14.9,1.1],[2,15,.93]]) {
  actors.push({depth:this.project(x,y).y,draw:()=>this.spruce(x,y,size)});
}
actors.push({depth:this.project(meadowArch.x,meadowArch.y).y,draw:()=>this.drawArch(dusk)});
actors.sort((a,b)=>a.depth-b.depth).forEach(a=>a.draw());for(let z=this.state.zones;z<ZONES.length;z++){const q=this.project(z*6+2,7);ctx.fillStyle='#4c6b56df';ctx.beginPath();ctx.roundRect(q.x-58*this.scale,q.y-26*this.scale,116*this.scale,34*this.scale,7);ctx.fill();this.text('🔒 '+ZONES[z].name,q.x,q.y-11*this.scale,10*this.scale);this.text(ZONES[z].cost+' Münzen',q.x,q.y+2*this.scale,8*this.scale,'#f0d594');}
for(const e of this.effects){e.life-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.h+=e.vh*dt;e.vh-=5*dt;const q=this.project(e.x,e.y,e.h);ctx.globalAlpha=Math.min(1,e.life*3);this.ell(q.x,q.y,3*this.scale,2*this.scale,e.color);}ctx.globalAlpha=1;ctx.fillStyle=`rgba(22,28,70,${.17*dusk})`;ctx.fillRect(0,0,this.W,this.H);this.effects=this.effects.filter(e=>e.life>0);for(const[k,t]of this.hitTimes)this.hitTimes.set(k,Math.max(0,t-dt));this.player.userData.swing=Math.max(0,(this.player.userData.swing||0)-dt*6);}
}
