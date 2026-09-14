import {GARDEN_OUTLINE,SATELLITES,SKY_ROUTES} from './world.js';
// Deliberately contains geography only: secrets and uncollected objects stay hidden.
export const MAP_DATA={garden:GARDEN_OUTLINE,islands:SATELLITES.map(s=>({id:s.id,x:s.x,z:s.z,outline:s.outline})),routes:SKY_ROUTES.map(r=>({from:r.from.slice(0,2),to:r.to.slice(0,2)}))};
export const mapPoint=(x,z)=>({x:112+x*2.65,y:167+z*1.83});
