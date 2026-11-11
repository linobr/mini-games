import { WORLD_WIDTH, PLOTS, BUILDINGS } from './evolution.js';
import { ZONES } from './engine.js';
import * as THREE from 'three';
import { meadowColors, trailColor, woodColors, crystalColors, trailCenter, eveningLight, cameraFocus, paintAlpineBackdrop, meadowArch, meadowSpur, meadowBank, berghausBench } from './scenery.js';
const C = { roof: 0x426858 };
const skyDay = new THREE.Color(0xa8c1bc), skyEvening = new THREE.Color(0x667886);
const sunDay = new THREE.Color(0xffe0ac), sunEvening = new THREE.Color(0xffbf94);
const ambientDay = new THREE.Color(0xc9dfdf), ambientEvening = new THREE.Color(0xa0b4d2);
const carvingGlow = new THREE.MeshStandardMaterial({ color: 0xb8b8a0, emissive: 0x86b9b0, emissiveIntensity: 0 });
const bankMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
const windowGlow = new THREE.MeshStandardMaterial({ color: 0xffcf7c, emissive: 0xffa444, emissiveIntensity: .24 });
const mats=new Map();function material(c){if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,flatShading:true,roughness:.9}));return mats.get(c);}
const boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.IcosahedronGeometry(1,0),leafGeo=new THREE.IcosahedronGeometry(1,1),cylinderGeo=new THREE.CylinderGeometry(1,1,1,8),coneGeo=new THREE.ConeGeometry(1,1,6), playerRingGeo=new THREE.RingGeometry(.48,.58,32);
function mesh(g,geo,c,x,y,z,sx=1,sy=1,sz=1,shadow=false){const m=new THREE.Mesh(geo,material(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=shadow;m.receiveShadow=true;g.add(m);return m;}
const box=(g,c,x,y,z,sx,sy,sz,shadow=false)=>mesh(g,boxGeo,c,x,y,z,sx,sy,sz,shadow);
const ball=(g,c,x,y,z,r,geo=sphereGeo)=>mesh(g,geo,c,x,y,z,r,r,r,true);
const wx=x=>(x-8.5)*1.7,wz=y=>(y-7)*1.7;
export class GardenWorld{
 constructor(canvas,state){this.state=state;this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.setClearColor(skyDay);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.02;
 this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(skyDay,48,115);this.camera=new THREE.OrthographicCamera(-24,24,16,-16,.1,180);this.angle=Math.PI/4;this.zoom=1;this.cameraTarget=new THREE.Vector3();this.focusPoint=new THREE.Vector3();this.skyColor=new THREE.Color();this.ambient=new THREE.HemisphereLight(ambientDay,0x617761,1.7);this.scene.add(this.ambient);const sun=new THREE.DirectionalLight(sunDay,2.8);sun.position.set(-19,24,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;sun.shadow.camera.far=80;sun.shadow.normalBias=.07;this.scene.add(sun,sun.target);this.sun=sun;
 this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);this.resources=new Map();this.decor=new THREE.Group();this.scene.add(this.decor);this.effects=[];this.workers=[];this.time=0;this.createTerrain();this.createResources();this.player=this.makePerson(0xd26a3d);
 const ring=new THREE.Mesh(playerRingGeo,new THREE.MeshBasicMaterial({color:0xffedbc}));
 ring.rotation.x=-Math.PI/2;ring.position.y=.035;this.player.add(ring);this.scene.add(this.player);this.rebuild();this.resize();}
 resize(){const r=this.canvas.getBoundingClientRect();this.W=r.width;this.H=r.height;this.renderer.setSize(r.width,r.height,false);const aspect=r.width/r.height,extent=r.width<650?10.2:11.8;this.camera.left=-extent*aspect;this.camera.right=extent*aspect;this.camera.top=extent;this.camera.bottom=-extent;this.camera.zoom=this.zoom;this.camera.updateProjectionMatrix();}
 trailRibbon(halfWidth, height, color) {
  const points = [], faces = [];
  const segments = WORLD_WIDTH * 4;
  for (let i = 0; i <= segments; i++) {
   const x = i / 4 - .5, y = trailCenter(x);
   points.push(wx(x), height, wz(y - halfWidth), wx(x), height, wz(y + halfWidth));
   if (i < segments) {
    const a = i * 2;
    faces.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
   }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  const trail = new THREE.Mesh(geometry, material(color));
  trail.receiveShadow = true;
  this.terrain.add(trail);
 }

 meadowFootpath() {
  const points = [], faces = [];
  for (const [i, [x, y]] of meadowSpur.entries()) {
   const width = i === 0 ? .34 : .28;
   points.push(wx(x - width), .037, wz(y), wx(x + width), .037, wz(y));
   if (i === meadowSpur.length - 1) continue;
   const a = i * 2;
   faces.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  const path = new THREE.Mesh(geometry, material(0xb8aa7a));
  path.receiveShadow = true;
  this.terrain.add(path);
 }

 meadowSlope() {
  const positions = [], colors = [];
  const levels = [
   { fraction: 0, height: -.025, color: 0x829954 },
   { fraction: .41, height: -.94, color: 0x667951 },
   { fraction: .75, height: -2.32, color: 0x69796e },
   { fraction: 1, height: -3.12, color: 0x83978e },
  ];
  const corner = (edge, level) => {
   const [x, y, outerX, outerY] = meadowBank[edge];
   const { fraction, height } = levels[level];
   const spread = Math.hypot(x - outerX, y - outerY);
   return [
    wx(x + (outerX - x) * fraction),
    height * Math.min(1, spread),
    wz(y + (outerY - y) * fraction),
   ];
  };
  const color = new THREE.Color();
  for (let edge = 0; edge < meadowBank.length - 1; edge++) {
   for (let level = 0; level < levels.length - 1; level++) {
    const triangles = [
     [[edge, level], [edge + 1, level], [edge, level + 1]],
     [[edge + 1, level], [edge + 1, level + 1], [edge, level + 1]],
    ];
    for (const [triangle, vertices] of triangles.entries()) {
     for (const [point, band] of vertices) {
      positions.push(...corner(point, band));
      color.setHex(levels[band].color).multiplyScalar(.94 + (edge * 7 + level * 3 + triangle) % 7 * .022);
      colors.push(color.r, color.g, color.b);
     }
    }
   }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const slope = new THREE.Mesh(geometry, bankMaterial);
  slope.receiveShadow = true;
  this.terrain.add(slope);

  const mistCanvas = document.createElement('canvas');
  mistCanvas.width = 128;
  mistCanvas.height = 128;
  const ctx = mistCanvas.getContext('2d');
  const fade = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  fade.addColorStop(0, 'rgba(172,198,191,.38)');
  fade.addColorStop(.45, 'rgba(172,198,191,.25)');
  fade.addColorStop(1, 'rgba(172,198,191,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(mistCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const veil = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: .52 });
  for (const [x, y, width, length] of [[-2.6, 6, 6.5, 17], [-1.75, 15.6, 10, 6]]) {
   const mist = new THREE.Mesh(new THREE.PlaneGeometry(width, length), veil);
   mist.rotation.x = -Math.PI / 2;
   mist.position.set(wx(x), -2.65, wz(y));
   this.terrain.add(mist);
  }
 }

 stoneArch() {
  const x = wx(meadowArch.x), z = wz(meadowArch.y), radius = meadowArch.radius * 1.7;
  const spring = 1.48;
  const blocks = [0x788077, 0x929389, 0x717b71, 0x848778];
  for (const side of [-1, 1]) {
   for (let i = 0; i < 4; i++) {
    const width = i === 0 ? .57 : .42;
    const stone = box(this.terrain, blocks[(i + side + 4) % 4], x, .19 + i * .35, z + side * radius, .59, .35, width, true);
    stone.rotation.y = Math.sin(i + side) * .15;
   }
  }
  for (let i = 0; i <= 10; i++) {
   const angle = i * Math.PI / 10;
   const center = i === 5;
   const stone = box(this.terrain, blocks[i % 4], x, spring + Math.sin(angle) * radius,
    z + Math.cos(angle) * radius, center ? .67 : .59, center ? .49 : .43, .47, true);
   stone.rotation.x = Math.PI / 2 - angle;
  }
  for (let i = 0; i < 5; i++) {
   const angle = i * Math.PI * 2 / 5;
   const petal = new THREE.Mesh(sphereGeo, carvingGlow);
   petal.position.set(x + .345, spring + radius + Math.sin(angle) * .086, z + Math.cos(angle) * .086);
   petal.scale.set(.014, .051, .043);
   this.terrain.add(petal);
  }
 }

 spruce(group, x, z, size, shade) {
  box(group, 0x564737, x, .36 * size, z, .18 * size, .72 * size, .18 * size, true);
  for (let layer = 0; layer < 3; layer++) {
   const width = size * (1.08 - layer * .21);
   const tree = mesh(group, coneGeo, shade[layer], x, size * (.73 + layer * .43), z, width, size * 1.16, width, true);
   tree.rotation.y = x + layer * .36;
  }
 }

 createTerrain() {
  this.terrain = new THREE.Group();
  this.scene.add(this.terrain);
  const edgeColors = [0x66754d, 0x747460, 0x617970, 0x4f694a, 0x8a9d9f];
  for (let zone = 0; zone < ZONES.length; zone++) {
   const center = wx(zone * 6 + 2.5);
   box(this.terrain, meadowColors[zone], center, -.37, 0, 10.2, .74, 25.5);
   box(this.terrain, edgeColors[zone], center, -.95, 0, 10.2, .45, 25.5);
   for (let i = 0; i < 25; i++) {
    const x = zone * 6 + (i * 1.73) % 5.7 - .25, y = (i * 3.79) % 14;
    if (Math.abs(y - trailCenter(x)) < 1.2) continue;
    const colors = zone === 4 ? [0xbcc9c6, 0xa9bdba] : [0x778c51, 0x91a363];
    const tuft = mesh(this.terrain, sphereGeo, colors[i % 2], wx(x), .015, wz(y), .25 + (i % 3) * .12, .035, .19);
    tuft.rotation.y = i;
   }
  }
  this.meadowSlope();
  this.trailRibbon(1.05, .015, 0xa49d66);
  this.trailRibbon(.84, .026, trailColor);
  this.meadowFootpath();
  this.stoneArch();
  for (let i = 0; i < 35; i++) {
   const x = (i * 2.37) % (WORLD_WIDTH - 1);
   const pebble = mesh(this.terrain, sphereGeo, i % 3 ? 0xac9a75 : 0xe0cda0, wx(x), .04, wz(trailCenter(x) + (i % 2 ? .68 : -.7)), .18, .025, .11);
   pebble.rotation.y = i;
  }

  const pines = [
   [-.63, 3.8, 1.68], [-.94, 4.9, 1.02], [-.7, 6, .82], [-.68, 9.8, 1.07],
   [-.8, 11.4, 1.64], [-.46, 12.7, .88], [.6, 14.9, 1.12], [1.7, 15.04, .8], [3.05, 14.91, 1.32],
  ];
  for (const [x, y, size] of pines) this.spruce(this.terrain, wx(x), wz(y), size, [0x31554b, 0x3a6450, 0x50785a]);

  const landmark = mesh(this.terrain, leafGeo, 0x667875, wx(-.63), .32, wz(8.36), .47, .74, .38, true);
  landmark.rotation.set(.2, .45, -.2);
  const moss = mesh(this.terrain, sphereGeo, 0x7e965b, wx(-.65), .85, wz(8.37), .31, .10, .24);
  moss.rotation.y = -.25;
  for (let i = 0; i < 11; i++) this.flower(this.terrain, wx(.35 + (i * .73) % 2.25), wz(12 + (i * .47) % 2.15), i % 2 ? 0xd2bf77 : 0xe1d7ad);

  this.backdrop = document.createElement('canvas');
  this.backdropTexture = new THREE.CanvasTexture(this.backdrop);
  this.backdropTexture.colorSpace = THREE.SRGBColorSpace;
  this.scene.background = this.backdropTexture;
 }

 updateBackdrop(dusk) {
  const tone = Math.round(dusk * 36);
  const width = Math.min(1280, Math.max(1, Math.round(this.W)));
  const height = Math.min(720, Math.max(1, Math.round(this.H)));
  if (tone === this.backdropTone && width === this.backdrop.width && height === this.backdrop.height) return;
  this.backdropTone = tone;
  this.backdrop.width = width;
  this.backdrop.height = height;
  paintAlpineBackdrop(this.backdrop.getContext('2d'), width, height, tone / 36);
  this.backdropTexture.needsUpdate = true;
 }

 createResources(){for(const n of this.state.nodes){const g=new THREE.Group();const r=(n.id*17)%10/10;g.position.set(wx(n.x)+(r-.45)*.43,0,wz(n.y)+((n.id*29)%13/12-.5)*.4);g.userData.node=n;
 if(n.type==='bush'){box(g,0x70553b,0,.36,0,.13,.72,.13);ball(g,woodColors[n.id%4],-.31,.62+r*.14,.05,.49+r*.08,leafGeo);ball(g,woodColors[(n.id+1)%4],.29,.66,0,.47+r*.1,leafGeo);ball(g,woodColors[(n.id+2)%4],r*.18-.08,.97+r*.28,-.06,.57+r*.1,leafGeo);for(let j=0;j<3;j++)ball(g,[0xeee3a3,0xecc3a2,0xd4e5a4][n.id%3],Math.sin(j*2+n.id)*.4,1+Math.cos(j)*.2,Math.cos(j*2+n.id)*.4,.08);}
 else if(n.type==='rock'){const m=mesh(g,leafGeo,0x718691,0,.49,0,.58+r*.13,.58+r*.32,.56+r*.1,true);m.rotation.set(.12,r*4,.15);const top=mesh(g,sphereGeo,0x9baaae,-.12,.76+r*.19,-.1,.35,.24,.37,true);top.rotation.y=r*2;ball(g,0x7e9c62,.45,.08,.3,.15);}
 else{for(let j=0;j<3;j++){const crystal=mesh(g,new THREE.CylinderGeometry(.03,.21,1.4+j*.35,5),crystalColors[j],(j-1)*.28,.65+j*.14,(j%2)*.18,.95,1,.95,true);crystal.rotation.z=(j-1)*-.22;}}
 g.rotation.y=r*2;const marker=mesh(g,new THREE.RingGeometry(.6,.68,24),0xffe8a4,0,.03,0);marker.rotation.x=-Math.PI/2;marker.visible=false;g.userData.marker=marker;const bar=box(g,0xf3c973,0,1.85,0,.8,.05,.06);bar.visible=false;g.userData.bar=bar;g.userData.seed=r;this.resources.set(n.id,g);this.scene.add(g);}}
 makePerson(color){const g=new THREE.Group();box(g,0x3d5458,-.12,.18,0,.16,.35,.2);box(g,0x3d5458,.12,.18,0,.16,.35,.2);const body=mesh(g,cylinderGeo,color,0,.56,0,.25,.45,.22,true);ball(g,0xffd3a4,0,.96,0,.22,leafGeo);mesh(g,cylinderGeo,0x4e7959,0,1.15,0,.33,.06,.33,true);mesh(g,cylinderGeo,0x759967,0,1.2,0,.23,.12,.23,true);box(g,0x9c6d46,0,.65,-.23,.33,.36,.14);const arm=new THREE.Group();arm.position.set(.3,.7,0);box(arm,color,0,-.05,0,.13,.32,.13);box(arm,0x996b44,.04,.1,.12,.055,.6,.055);box(arm,0xd1dad8,.04,.38,.12,.4,.075,.11);g.add(arm);g.userData.arm=arm;g.userData.body=body;return g;}
 roof(g,x,y,z,color,sx=2.5,sz=1.7){const shape=new THREE.Shape();shape.moveTo(-sx/2,0);shape.lineTo(0,.8);shape.lineTo(sx/2,0);shape.closePath();const roof=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:sz,bevelEnabled:false}),material(color));roof.position.set(x,y,z-sz/2);roof.castShadow=true;g.add(roof);}
 house(g,x,z,color=C.roof){box(g,0xf1deb4,x,.7,z,2.3,1.4,1.5,true);this.roof(g,x,1.4,z,color);box(g,0x936b43,x,.5,z+.76,.4,1,.05);for(const dx of [-.72,.72])box(g,0xa4c7c2,x+dx,.95,z+.77,.37,.37,.03);}
 chalet(group, x, z) {
  const timber = 0x5d4536;
  box(group, 0x778074, x, .21, z, 2.62, .42, 1.82, true);
  box(group, 0xddbf96, x, .92, z, 2.49, 1.18, 1.7, true);
  for (const dx of [-1.14, 0, 1.14]) box(group, timber, x + dx, .97, z + .87, .12, 1.1, .09, true);
  for (const height of [.46, 1.43]) box(group, timber, x, height, z + .88, 2.53, .11, .1, true);
  this.roof(group, x, 1.52, z, 0x705045, 3.02, 2.15);
  box(group, 0x665853, x - .65, 1.96, z - .39, .29, .83, .31, true);
  box(group, 0x876d5a, x - .65, 2.36, z - .39, .38, .09, .4, true);
  box(group, timber, x, .79, z + .91, .42, .79, .08, true);
  box(group, 0x9d947b, x, .11, z + 1, .74, .22, .39, true);

  for (const dx of [-.72, .72]) {
   box(group, timber, x + dx, 1.03, z + .925, .5, .43, .065);
   const pane = new THREE.Mesh(boxGeo, windowGlow);
   pane.position.set(x + dx, 1.03, z + .966);
   pane.scale.set(.37, .31, .025);
   group.add(pane);
   box(group, timber, x + dx, 1.03, z + .987, .033, .32, .03);
   box(group, timber, x + dx, 1.03, z + .987, .38, .032, .03);
  }
  box(group, timber, x + .43, 1.25, z + .98, .09, .06, .2);
  const lantern = new THREE.Mesh(boxGeo, windowGlow);
  lantern.position.set(x + .43, 1.13, z + 1.075);
  lantern.scale.set(.11, .17, .11);
  group.add(lantern);
  this.chaletLight = new THREE.PointLight(0xffbc6b, .9, 4);
  this.chaletLight.position.set(x + .43, 1.15, z + 1.22);
  group.add(this.chaletLight);
 }
 marketBench() {
  const x = wx(berghausBench.x), z = wz(berghausBench.y);
  const wood = 0xaa7950, frame = 0x604e40;
  for (const side of [-1, 1]) {
   box(this.decor, frame, x + side * .43, .17, z, .1, .34, .41, true);
   box(this.decor, frame, x + side * .43, .44, z - .21, .09, .56, .08, true);
  }
  for (let i = -1; i <= 1; i++) box(this.decor, wood, x, .35, z + i * .13, 1.06, .075, .11, true);
  for (let i = 0; i < 2; i++) box(this.decor, wood, x, .54 + i * .12, z - .205, 1.06, .09, .07, true);

  const traveler = new THREE.Group();
  traveler.position.set(x + .14, 0, z);
  const cloak = 0x597993;
  box(traveler, cloak, 0, .57, -.08, .28, .34, .22, true);
  ball(traveler, 0xe8ba91, 0, .84, -.064, .145, leafGeo);
  mesh(traveler, cylinderGeo, 0x835742, 0, .958, -.07, .22, .038, .19, true);
  mesh(traveler, cylinderGeo, 0x9a6c4f, 0, .99, -.075, .143, .083, .14, true);
  for (const side of [-1, 1]) {
   const x = side * .09;
   box(traveler, 0x51554f, x, .405, .07, .12, .1, .27, true);
   box(traveler, 0x51554f, x, .27, .189, .11, .27, .105, true);
   box(traveler, 0x654b38, x, .115, .219, .13, .08, .17, true);
  }
  this.decor.add(traveler);
 }
 flower(g,x,z,c=0xe8ae9c){const f=ball(g,c,x,.22,z,.13);box(g,0x7ba259,x,.1,z,.035,.2,.035);f.castShadow=false;}
 rebuild(){for(const n of this.state.nodes){const g=this.resources.get(n.id);if(g)g.userData.node=n;}while(this.decor.children.length){const child=this.decor.children.pop();child.traverse(o=>{if(o.geometry&&!([boxGeo,sphereGeo,leafGeo,cylinderGeo,coneGeo].includes(o.geometry)))o.geometry.dispose();});child.parent=null;}
 for(const w of this.workers)this.scene.remove(w);this.workers=[];
 // Market hub, log piles and an animated workshop.
 this.chalet(this.decor,wx(1),wz(11));for(let i=0;i<4;i++){const log=mesh(this.decor,cylinderGeo,0x916a49,wx(1.92)+i%2*.21,.16+Math.floor(i/2)*.18,wz(11.28),.17,.82,.17,true);log.rotation.x=Math.PI/2;}
 if(this.state.orders > 0) this.marketBench();
 if(this.state.workshop){this.house(this.decor,wx(1),wz(9),0x58899a);box(this.decor,0x8a6744,wx(1.8),.15,wz(9),.9,.3,1.7);this.wheel=mesh(this.decor,new THREE.TorusGeometry(.47,.08,6,12),0x8d7151,wx(2.2),.75,wz(9.2));this.wheel.rotation.y=Math.PI/2;box(this.decor,0x78968c,wx(.2),1.75,wz(8.9),.3,1.1,.3,true);}else this.wheel=null;
 for(let i=0;i<this.state.workers;i++){const w=this.makePerson([0x96b7cc,0xd5b77c,0xb49fcd][i]);const cargo=mesh(w,cylinderGeo,[0xb48c59,0xa4b6be,0xc4a3ee][i],0,.67,.28,.14,.65,.14);cargo.rotation.z=Math.PI/2;w.userData.cargo=cargo;this.workers.push(w);this.scene.add(w);}
 for(let z=this.state.zones;z<ZONES.length;z++){const x=wx(z*6)-.8;for(let j=-1;j<=1;j++){box(this.decor,0xa58e68,x,.35,j*1.5,.12,.7,.12);box(this.decor,0xc8b384,x,.58,j*1.5,.14,.1,1.6);}const sign=box(this.decor,0x68816b,x+.5,.8,0,.9,.6,.12,true);sign.rotation.y=Math.PI/2;}
 for(const b of this.state.buildings){const p=PLOTS.find(p=>p.id===b.plot),g=new THREE.Group();this.house(g,0,0,{sawmill:0x9e774b,stoneworks:0x728c9c,gemworks:0xa48cb5,alpineworks:0x547f80}[b.kind]);g.scale.setScalar(.6);g.position.set(wx(p.x),0,wz(p.y));this.decor.add(g);}
 const gardenX=wx(9),gardenZ=wz(2);if(this.state.projects>=1){for(let i=0;i<3;i++){box(this.decor,0xb89a6c,gardenX+(i-1)*1.3,.12,gardenZ+2,1.1,.25,1.1);for(let j=0;j<7;j++)this.flower(this.decor,gardenX+(i-1)*1.3+Math.sin(j*3)*.35,gardenZ+2+Math.cos(j*3)*.35,[0xeaaeb3,0xf4dc95,0xece8d1][i]);}for(const dx of [-2.5,2.5]){box(this.decor,0xa78554,gardenX+dx,.38,gardenZ,1,.12,.5);box(this.decor,0xa78554,gardenX+dx,.65,gardenZ-.23,1,.42,.08);}}
 if(this.state.projects>=2){mesh(this.decor,cylinderGeo,0xc2cbc0,gardenX,.18,gardenZ,1.15,.35,1.15,true);mesh(this.decor,cylinderGeo,0x8fcacc,gardenX,.38,gardenZ,.93,.06,.93);mesh(this.decor,cylinderGeo,0xd7dccc,gardenX,.78,gardenZ,.15,.8,.15,true);mesh(this.decor,new THREE.SphereGeometry(.25,8,6),0xd4e9d7,gardenX,1.25,gardenZ);this.fountain=new THREE.Group();for(let i=0;i<8;i++)ball(this.fountain,0xc6e9e5,gardenX+Math.sin(i)*.6,1.2,gardenZ+Math.cos(i)*.6,.05);this.decor.add(this.fountain);}else this.fountain=null;
 if(this.state.projects>=3){const x=wx(9),z=wz(.3);box(this.decor,0xd8bc8f,x,.1,z,3.8,.2,3);for(const dx of[-1.4,1.4])for(const dz of[-1.1,1.1])box(this.decor,0xe4d4ae,x+dx,1.15,z+dz,.13,2.3,.13,true);this.roof(this.decor,x,2.3,z,0x6c9170,4.2,3.4);}
 for(let i=0;i<10;i++){const x=wx(7+i%4),z=wz(1+Math.floor(i/4));if(this.state.projects===0)this.flower(this.decor,x,z,0xc4d38c);}
 }
 pick(clientX,clientY){const r=this.canvas.getBoundingClientRect();this.pointer.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const visible=[...this.resources.values()].filter(g=>g.visible);const intersections=this.ray.intersectObjects(visible,true);for(const i of intersections){let g=i.object;while(g&&!g.userData.node)g=g.parent;if(g?.userData.node)return {node:g.userData.node,x:g.userData.node.x,y:g.userData.node.y};}const p=new THREE.Vector3();if(this.ray.ray.intersectPlane(this.groundPlane,p))return {x:p.x/1.7+8.5,y:p.z/1.7+7};return null;}
 burst(n,color,amount=14){for(let i=0;i<amount;i++){const m=mesh(this.scene,sphereGeo,color,wx(n.x),.6,wz(n.y),.045+Math.random()*.05,.06,.06);this.effects.push({m,v:new THREE.Vector3((Math.random()-.5)*3,2+Math.random()*2,(Math.random()-.5)*3),life:.5+Math.random()*.4});}}
 emberTrail(node) {
  const from = this.player.position;
  for (let i = 1; i <= 7; i++) {
   const step = i / 8;
   const x = THREE.MathUtils.lerp(from.x, wx(node.x), step);
   const z = THREE.MathUtils.lerp(from.z, wz(node.y), step);
   const ember = mesh(this.scene, sphereGeo, i % 2 ? 0xffa33c : 0xffdf7e,
    x, .72 + Math.sin(step * Math.PI) * .29, z, .12, .12, .12);
   this.effects.push({ m: ember, v: new THREE.Vector3(0, .65, 0), life: .2 + step * .12 });
  }
 }

 hit(node, broken, gear = 'pick', reduced = false) {
  const group = this.resources.get(node.id);
  group.userData.hit = 1;
  this.player.userData.swing = 1;
  if (reduced) return;
  if (gear === 'ember') {
   this.emberTrail(node);
   this.burst(node, 0xf7b053, 9);
  } else if (gear === 'machine') {
   this.burst(node, 0xc2d7da, 12);
  } else if (broken) {
   this.burst(node, node.type === 'bush' ? 0xa8ca6d : node.type === 'rock' ? 0xb3c4c8 : 0xace8ce);
  }
 }
 screen(x,y,height=1.5){const v=new THREE.Vector3(wx(x),height,wz(y));v.project(this.camera);return {x:(v.x*.5+.5)*this.W,y:(-v.y*.5+.5)*this.H};}
 updateView(dt, player, reduced) {
  const focus = cameraFocus(player);
  this.focusPoint.set(wx(focus.x), .3, wz(focus.y));
  if (!this.framed || reduced) this.cameraTarget.copy(this.focusPoint);
  else this.cameraTarget.lerp(this.focusPoint, 1 - Math.exp(-dt * 5.5));
  this.framed = true;
  const sideX = Math.sin(this.angle), sideZ = Math.cos(this.angle);
  this.camera.position.set(this.cameraTarget.x + sideX * 39, this.cameraTarget.y + 33, this.cameraTarget.z + sideZ * 39);
  this.camera.lookAt(this.cameraTarget);
  this.camera.zoom = this.zoom;
  this.camera.updateProjectionMatrix();
 }

 updateLight() {
  const dusk = eveningLight(this.state.dayClock);
  this.skyColor.copy(skyDay).lerp(skyEvening, dusk);
  this.renderer.setClearColor(this.skyColor);
  this.scene.fog.color.copy(this.skyColor);
  this.scene.fog.far = 115 - dusk * 16;
  this.ambient.color.copy(ambientDay).lerp(ambientEvening, dusk);
  this.ambient.intensity = 1.72 - dusk * .23;
  this.sun.color.copy(sunDay).lerp(sunEvening, dusk);
  this.sun.intensity = 2.6 - dusk * 1.14;
  this.updateBackdrop(dusk);
  this.sun.target.position.set(this.cameraTarget.x, 0, this.cameraTarget.z);
  this.sun.position.set(this.cameraTarget.x - 19, 24, this.cameraTarget.z + 12);
  windowGlow.emissiveIntensity = .25 + dusk * 1.65;
  carvingGlow.emissiveIntensity = dusk * 1.08;
  this.chaletLight.intensity = 1.4 + dusk * 9;
 }

 render(dt,p,selected,hover,reduced){this.time+=dt;const t=this.time;
 this.updateView(dt,p,reduced);
 this.updateLight();
 const wall=Date.now();for(const n of this.state.nodes){const g=this.resources.get(n.id),visible=n.ready<=wall&&n.zone<=this.state.zones;g.visible=visible;const locked=n.zone>=this.state.zones;g.scale.setScalar(locked?.75:1);g.userData.marker.visible=visible&&(selected?.id===n.id||hover?.id===n.id)&&!locked;g.userData.bar.visible=visible&&n.hp>0&&n.hp<(n.type==='bush'?3:n.type==='rock'?6:10)&&!locked;g.userData.bar.scale.x=.8*n.hp/(n.type==='bush'?3:n.type==='rock'?6:10);if(g.userData.hit){g.userData.hit=Math.max(0,g.userData.hit-dt*6);g.rotation.z=reduced?0:Math.sin(g.userData.hit*12)*.1*g.userData.hit;}else g.rotation.z=0;}
 this.player.position.set(wx(p.x),0,wz(p.y));if(p.moving)this.player.rotation.y=p.facing;this.player.userData.body.position.y=.56+(p.moving&&!reduced?Math.sin(t*18)*.03:0);let swing=this.player.userData.swing||0;swing=Math.max(0,swing-dt*6);this.player.userData.swing=swing;this.player.userData.arm.rotation.x=reduced?0:Math.sin(swing*Math.PI)*-1.5;
 this.workers.forEach((w,i)=>{const phase=((t+i*3.3)%10)/10,u=phase<.5?phase*2:(1-phase)*2,x=1.8+(Math.min(this.state.zones*6-1,3+i*5)-1.8)*u,y=8.9-3.2*u;w.position.set(wx(x),0,wz(y));w.rotation.y=phase<.5?1.7:-1.4;w.userData.arm.rotation.x=phase>.38&&phase<.55?Math.sin(t*9+i)*.8:0;w.userData.cargo.visible=phase>.52;});
 if(this.wheel&&!reduced)this.wheel.rotation.z=t*(this.state.job?2:.3);if(this.fountain&&!reduced)this.fountain.children.forEach((m,i)=>{m.position.y=.6+(Math.sin(t*3+i)*.5+.5)*.8;});for(const e of this.effects){e.life-=dt;e.v.y-=dt*8;e.m.position.addScaledVector(e.v,dt);e.m.scale.multiplyScalar(.985);}this.effects=this.effects.filter(e=>{if(e.life<=0){this.scene.remove(e.m);return false;}return true;});this.renderer.render(this.scene,this.camera);}
}
