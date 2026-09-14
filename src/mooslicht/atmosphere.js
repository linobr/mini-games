import {clamp} from './world.js';
export const SKY_STAGES=['Tag','Später Nachmittag','Goldene Stunde','Dämmerung','Nacht','Mooslicht-Nacht'];
export function skyTarget(lights,finished){return finished?5:[0,1,2.65,4][clamp(Math.floor(lights)||0,0,3)];}
export function nightAmount(phase){return clamp((phase-2.2)/1.8,0,1);}
export function skyStage(phase){return SKY_STAGES[clamp(Math.round(phase),0,5)];}
// null keeps the original story-driven atmosphere. Invalid stored values never
// turn a fresh garden dark; numeric manual values cover all existing sky phases.
export function cleanDayPhase(value){return typeof value==='number'&&Number.isFinite(value)?clamp(value,0,5):null;}
export function dayPhaseFromPosition(position){return clamp(Number.isFinite(position)?position:0,0,1)*5;}
// Manual light previews also work while paused, independently of world physics.
export class AtmosphereState {
  constructor(){this.phase=null;this.manualPhase=null;this.finalAge=0;this.wasFinished=false;}
  setManualPhase(value){this.manualPhase=cleanDayPhase(value);}
  update(game,dt,cinematic=false,motion=false){
    // Finale retains its authored reveal; the chosen light returns in free roam.
    const manual=this.manualPhase!==null&&!(cinematic&&game.finished);
    const target=manual?this.manualPhase:skyTarget(game.lights,game.finished);
    const reset=!manual&&!this.wasManual&&target<(this.target??target);
    if(this.phase===null||reset)this.phase=target;this.target=target;this.wasManual=manual;
    if(!game.finished){this.finalAge=0;this.wasFinished=false;}
    else if(!this.wasFinished){this.finalAge=cinematic?0:12;this.wasFinished=true;}
    if(game.running||cinematic||manual){
      this.phase+=(target-this.phase)*(1-Math.exp(-Math.max(0,dt)*(manual?5:.24)));
      if(game.finished)this.finalAge=Math.min(12,this.finalAge+dt);
    }
    if(motion){this.phase=target;if(game.finished)this.finalAge=12;}
    return this;
  }
}
export function fallOpacity(game){return game.fallTimer>0?clamp(game.fallTimer/.48,0,1):clamp((game.returnFade||0)/.5,0,1);}
