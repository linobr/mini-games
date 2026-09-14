import {cleanDayPhase,dayPhaseFromPosition,skyStage} from './atmosphere.js';

// Native pointer capture supports mouse, pen and touch without a second loop.
export class DayControl {
  constructor(root,{state,value,onChange,onFocus}){
    this.root=root;this.state=state;this.value=cleanDayPhase(value);this.onChange=onChange;
    this.slider=root.querySelector('[role="slider"]');this.sun=root.querySelector('.day-sun');this.label=root.querySelector('.day-label');this.auto=root.querySelector('button');
    state.setManualPhase(this.value);
    const setFromPointer=e=>{const r=this.slider.getBoundingClientRect();this.set(dayPhaseFromPosition(((e.clientX-r.left)/r.width-.08)/.84));};
    this.slider.addEventListener('focus',()=>onFocus());
    this.slider.addEventListener('pointerdown',e=>{
      if(e.button!==0||this.pointer!==undefined)return;e.preventDefault();this.slider.focus();this.pointer=e.pointerId;this.slider.setPointerCapture(e.pointerId);setFromPointer(e);
    });
    this.slider.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer)setFromPointer(e);});
    const release=()=>{this.pointer=undefined;this.onChange(this.value,true);};
    for(const event of ['pointerup','pointercancel','lostpointercapture'])this.slider.addEventListener(event,()=>{if(this.pointer!==undefined)release();});
    this.slider.addEventListener('keydown',e=>{
      if(e.key==='Escape'){this.slider.blur();return;}
      e.stopPropagation();
      const current=this.value??this.state.phase??0;
      const delta={ArrowRight:.1,ArrowUp:.1,ArrowLeft:-.1,ArrowDown:-.1,PageUp:.5,PageDown:-.5}[e.key];
      if(delta!==undefined||e.key==='Home'||e.key==='End'){e.preventDefault();this.set(e.key==='Home'?0:e.key==='End'?5:current+delta,true);}
    });
    this.auto.addEventListener('click',()=>{onFocus();this.set(null,true);});
    this.refresh();
  }
  set(value,commit=false){this.value=cleanDayPhase(value);this.state.setManualPhase(this.value);this.onChange(this.value,commit);this.refresh();}
  refresh(){
    const phase=this.value??this.state.phase??0,u=phase/5;
    this.sun.style.left=`${8+u*84}%`;this.sun.style.top=`${36-Math.sin(u*Math.PI)*21}px`;
    this.slider.setAttribute('aria-valuenow',phase.toFixed(2));this.slider.setAttribute('aria-valuetext',`${skyStage(phase)}${this.value===null?' · automatisch':''}`);
    this.label.textContent=this.value===null?'Tagesverlauf':skyStage(phase);
    this.auto.setAttribute('aria-pressed',String(this.value===null));
  }
}
