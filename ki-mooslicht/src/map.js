import {GARDEN_OUTLINE,SATELLITES,SKY_ROUTES} from './world.js';
// Deliberately contains geography only: secrets and uncollected objects stay hidden.
export const MAP_DATA={garden:GARDEN_OUTLINE,islands:SATELLITES.map(s=>({id:s.id,x:s.x,z:s.z,outline:s.outline})),routes:SKY_ROUTES.map(r=>({from:r.from.slice(0,2),to:r.to.slice(0,2)}))};
const points=[...GARDEN_OUTLINE,...SATELLITES.flatMap(s=>s.outline)];
const bounds={minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))};
export const mapPoint=(x,z)=>({x:12+(x-bounds.minX)/(bounds.maxX-bounds.minX)*256,y:12+(z-bounds.minZ)/(bounds.maxZ-bounds.minZ)*240});
