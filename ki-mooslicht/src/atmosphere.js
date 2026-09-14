import {clamp} from './world.js';
export const SKY_STAGES=['Tag','Später Nachmittag','Goldene Stunde','Dämmerung','Nacht','Mooslicht-Nacht'];
export function skyTarget(lights,finished){return finished?5:[0,1,2.65,4][clamp(Math.floor(lights)||0,0,3)];}
export function nightAmount(phase){return clamp((phase-2.2)/1.8,0,1);}
export function skyStage(phase){return SKY_STAGES[clamp(Math.round(phase),0,5)];}
// Visual time is separate from physics, but only advances while playing or in cinematics.
export class AtmosphereState {
  constructor(){this.phase=null;this.finalAge=0;this.wasFinished=false;}
  update(game,dt,cinematic=false,motion=false){
    const target=skyTarget(game.lights,game.finished);
    if(this.phase===null||target<(this.target??target))this.phase=target;this.target=target;
    if(!game.finished){this.finalAge=0;this.wasFinished=false;}
    else if(!this.wasFinished){this.finalAge=cinematic?0:12;this.wasFinished=true;}
    if(game.running||cinematic){
      this.phase+=(target-this.phase)*(1-Math.exp(-Math.max(0,dt)*.24));
      if(game.finished)this.finalAge=Math.min(12,this.finalAge+dt);
    }
    if(motion){this.phase=target;if(game.finished)this.finalAge=12;}
    return this;
  }
}
export function fallOpacity(game){return game.fallTimer>0?clamp(game.fallTimer/.48,0,1):clamp((game.returnFade||0)/.5,0,1);}
