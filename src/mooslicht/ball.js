import {OBSTACLES,SOLIDS,surfaceAt,clamp} from './world.js';

export const BALL_SPAWN={x:-3,z:40,y:.75};
export const BALL_RADIUS=.75;
export const BALL_MAX_SPEED=9;

// Small, deterministic toy: contact kicks, rolling drag and shared garden colliders.
// Deliberately transient: loading an existing save always places it on the lawn.
export class GardenBall {
  constructor(){this.reset();}
  reset(){Object.assign(this,BALL_SPAWN,{vx:0,vz:0,vy:0,rx:0,rz:0,resetIn:0,unattended:0,stuck:0});}
  bounce(nx,nz){const approach=this.vx*nx+this.vz*nz;if(approach<0){this.vx-=approach*nx*1.55;this.vz-=approach*nz*1.55;}}
  update(player,delta,time=0,energy=0){
    const dt=clamp(delta,0,1/60),r=BALL_RADIUS;
    if(this.resetIn>0){this.resetIn-=dt;if(this.resetIn<=0)this.reset();return;}
    if(!Number.isFinite(this.x+this.y+this.z+this.vx+this.vy+this.vz)){this.reset();return;}
    const dx=this.x-player.x,dz=this.z-player.z,d=Math.hypot(dx,dz);
    if(d<r+.36&&Math.abs(this.y-player.y-.8)<1.1){
      const nx=d>.001?dx/d:Math.sin(player.facing),nz=d>.001?dz/d:Math.cos(player.facing);
      const approach=player.vx*nx+player.vz*nz;
      if(approach>.2){const kick=Math.min(BALL_MAX_SPEED,2.4+approach*1.15);this.vx=nx*kick;this.vz=nz*kick;this.x=player.x+nx*(r+.37);this.z=player.z+nz*(r+.37);}
    }
    const speed=Math.hypot(this.vx,this.vz);if(speed>BALL_MAX_SPEED){this.vx*=BALL_MAX_SPEED/speed;this.vz*=BALL_MAX_SPEED/speed;}
    const oldX=this.x,oldZ=this.z,oldY=this.y;
    this.x+=this.vx*dt;this.z+=this.vz*dt;
    for(const o of OBSTACLES){
      if(this.y+r<o.y||this.y-r>o.y+(o.height||3))continue;
      const dx=this.x-o.x,dz=this.z-o.z,d=Math.hypot(dx,dz),size=o.r+r;
      if(d<size){const nx=d>.001?dx/d:1,nz=d>.001?dz/d:0;this.x=o.x+nx*size;this.z=o.z+nz*size;this.bounce(nx,nz);}
    }
    for(const b of SOLIDS){
      if(this.y+r<=b.y||this.y-r>=b.y+b.h)continue;
      const x=clamp(this.x,b.x-b.w/2,b.x+b.w/2),z=clamp(this.z,b.z-b.d/2,b.z+b.d/2),dx=this.x-x,dz=this.z-z,d=Math.hypot(dx,dz);
      if(d>=r)continue;
      if(d>.001){this.x=x+dx/d*r;this.z=z+dz/d*r;this.bounce(dx/d,dz/d);}
      else {
        const left=this.x-(b.x-b.w/2),right=b.x+b.w/2-this.x,near=this.z-(b.z-b.d/2),far=b.z+b.d/2-this.z,min=Math.min(left,right,near,far);
        if(min===left){this.x=b.x-b.w/2-r;this.bounce(-1,0);}else if(min===right){this.x=b.x+b.w/2+r;this.bounce(1,0);}
        else if(min===near){this.z=b.z-b.d/2-r;this.bounce(0,-1);}else{this.z=b.z+b.d/2+r;this.bounce(0,1);}
      }
    }
    this.vy-=18*dt;this.y+=this.vy*dt;
    const ground=surfaceAt(this.x,this.z,time,oldY-r+.22,energy).height;
    const grounded=this.y<=ground+r&&oldY>=ground+r-.22;
    if(grounded){this.y=ground+r;this.vy=0;const drag=Math.exp(-dt*1.05);this.vx*=drag;this.vz*=drag;if(Math.hypot(this.vx,this.vz)<.03)this.vx=this.vz=0;}
    this.rx=(this.rx+(this.z-oldZ)/r)%(Math.PI*2);this.rz=(this.rz-(this.x-oldX)/r)%(Math.PI*2);
    this.stuck=speed>.5&&Math.hypot(this.x-oldX,this.z-oldZ)<dt*.06?this.stuck+dt:0;
    this.unattended=d>38?this.unattended+dt:0;
    if(this.y<-5||this.stuck>3||this.unattended>25)this.resetIn=1.8;
  }
}
