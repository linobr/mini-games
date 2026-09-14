// Reconstructed from the local garden photographs (no photo assets are shipped).
// -Z: shed garden; +Z: terrace, second lawn, rounded gravel seating corner.
export const TERRACE = {minX:-21.8,maxX:21.5,minZ:10,maxZ:34};
export const TERRACE_OUTLINE = [[-21.8,10],[-1,10],[1,12],[9,12],[11,10],[21.5,10],[21.5,34],[-21.8,34]].map(([x,z])=>({x,z}));
export const TABLE = {x:1,z:17,w:9,d:14,y:7.6,h:.4};
// Two woven loungers face the house, side by side along the hedge.
export const LOUNGERS = [{x:15,z:19},{x:15,z:28}];
export const DINING_CHAIRS = [{x:-5.6,z:14,yaw:-Math.PI/2},{x:-5.6,z:21,yaw:-Math.PI/2},{x:7.6,z:13,yaw:Math.PI/2},{x:1,z:27,yaw:0}];
export function chairPoint(c,x,z){return {x:c.x+x*Math.cos(c.yaw)+z*Math.sin(c.yaw),z:c.z-x*Math.sin(c.yaw)+z*Math.cos(c.yaw)};}
// The balcony is attached to the facade; its two slender front columns leave the lawn route open.
export const BALCONY = {x:-15,z:22,w:13.5,d:25,y:23.6,h:.4};
export const BALCONY_POSTS = [10.3,33.7].map(z=>({x:-8.4,z,w:.3,d:.3,y:0,h:23.6}));
// Looking from the banana lawn toward the shed, left is -X. Beyond the
// house's south end the lawn turns west into the sheltered sitting garden.
export const HOUSE = {x:-24,z:-1.5,w:4,d:103,y:0,h:36};
export const HOUSE_RETURN = {x:-37,z:50,w:30,d:.5,y:0,h:36};
export const REAR_DECK = {x:-40,z:59,w:24,d:18,y:0,h:.08};
export const REAR_OUTLINE = [[-52,50],[-28,50],[-28,66],[-30,68],[-50,68],[-52,66]].map(([x,z])=>({x,z}));
export const LOUNGE = {minX:-52,maxX:-28,minZ:50,maxZ:62,height:16};
export const LAWN_CURVE = Array.from({length:25},(_,i)=>{
  const a=i/24*Math.PI/2;return {x:-28+Math.cos(a)*10,z:50+Math.sin(a)*20};
}).concat([{x:-39,z:70},{x:-51,z:70}]);
export const BALCONY_RAILS = [
  {x:-8.3,z:11.65,w:.16,d:4.3,y:24,h:4},
  {x:-8.3,z:26.25,w:.16,d:16.5,y:24,h:4},
  ...[9.5,34.5].map(z=>({x:-15,z,w:13.5,d:.16,y:24,h:4})),
];
export const BALCONY_SEATS = [{x:-18.4,z:12.6},{x:-12.3,z:12.6}];
export const BALCONY_LOUNGERS = [{x:-17.8,z:27.5},{x:-12.2,z:27.5}];
export const LOUNGE_SOLIDS = [
  HOUSE_RETURN,
  {x:-52,z:56,w:.25,d:12,y:0,h:16},
  {x:-28,z:56,w:.25,d:12,y:0,h:16},
  // Open front: one window bay on either side of a broad six-unit doorway.
  {x:-47.5,z:62,w:9,d:.25,y:0,h:16},
  {x:-32.5,z:62,w:9,d:.25,y:0,h:16},
  {x:-40,z:56,w:24,d:12,y:16,h:.25},
  {x:-47,z:53,w:8,d:4,y:0,h:4.5},
  {x:-49,z:56.5,w:4,d:5,y:0,h:4.5},
  {x:-42,z:56.5,w:6,d:4,y:2.1,h:.25},
];
export const ARCHITECTURE = [BALCONY,...BALCONY_POSTS,...BALCONY_RAILS,...LOUNGE_SOLIDS,
  ...BALCONY_SEATS.map(c=>({...c,w:4.5,d:4.5,y:24,h:3.5})),
  ...BALCONY_LOUNGERS.map(c=>({...c,w:3.5,d:9,y:24,h:2.8})),
  {x:-15.4,z:13,w:2.4,d:2.4,y:24,h:2.2},
  {x:-9.2,z:25.5,w:1.4,d:15,y:24,h:2},
];
export const TERRACE_POTS=[{x:20,z:12},{x:20,z:35},{x:-18,z:29}];
export const GRAVEL_SEATS = [{x:18,z:56},{x:18,z:64}];
export const BANANA = {x:-14,z:42,r:3.2,height:22};
// Rounded inner corner between the gravel seat and the lawn, not an ellipse decal.
export const GRAVEL_OUTLINE = [
  {x:22,z:48},{x:22,z:68},{x:1,z:68},{x:1,z:60},
  ...Array.from({length:21},(_,i)=>{const a=Math.PI+i/20*Math.PI/2;return {x:13+Math.cos(a)*12,z:60+Math.sin(a)*12};}),
];
export const TABLE_LEGS = [-1,1].flatMap(sx=>[-1,1].map(sz=>({x:TABLE.x+sx*(TABLE.w/2-1.7),z:TABLE.z+sz*(TABLE.d/2-.7),w:.5,d:.5,y:0,h:7.6})));
// The reclined back is a set of close-fitting slices shared by movement and camera.
export const FURNITURE = [
  {...TABLE}, ...TABLE_LEGS,
  ...LOUNGERS.flatMap(l=>[
    {x:l.x-2,z:l.z,w:7,d:4.1,y:2.3,h:.28},
    ...Array.from({length:8},(_,i)=>({x:l.x+1.75+i*.45,z:l.z,w:.47,d:4.1,y:2.4+i*.43,h:.68})),
    ...[-4.8,3.4].flatMap(dx=>[-1.7,1.7].map(dz=>({x:l.x+dx,z:l.z+dz,w:.3,d:.3,y:0,h:dx>0?4.4:2.4}))),
  ]),
  ...DINING_CHAIRS.flatMap(c=>[
    {x:c.x,z:c.z,w:3.4,d:3.4,y:3.7,h:.3},
    {...chairPoint(c,0,1.5),w:c.yaw? .25:3.4,d:c.yaw?3.4:.25,y:4,h:3.6},
    ...[-1.35,1.35].flatMap(dx=>[-1.35,1.35].map(dz=>({...chairPoint(c,dx,dz),w:.22,d:.22,y:0,h:3.7}))),
  ]),
  ...GRAVEL_SEATS.flatMap(c=>[{x:c.x,z:c.z,w:5,d:5.5,y:0,h:1.8},{x:c.x+2.3,z:c.z,w:.4,d:5.5,y:1.8,h:2.8}]),
  {x:11,z:60,w:5,d:7,y:2.1,h:.3},
];
