export class Controls {
  constructor(canvas,view,onPause) {
    this.canvas=canvas;this.view=view;this.onPause=onPause;this.keys=new Set();this.edges=new Set();this.stick={x:0,y:0};this.active=false;
    this.pointer=null;this.stickPointer=null;this.joystick=document.getElementById('joystick');this.knob=document.getElementById('joystick-knob');
    const movement=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
    const actions={Space:'jump',KeyE:'interact',KeyJ:'attack',ShiftLeft:'roll',ShiftRight:'roll'};
    window.addEventListener('keydown',e=>{
      if(e.code==='Escape' && this.active){e.preventDefault();this.onPause();return;}
      if(!this.active || /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))return;
      if(movement.includes(e.code)||actions[e.code]||e.code==='KeyC')e.preventDefault();
      this.keys.add(e.code);
      if(!e.repeat && actions[e.code])this.edges.add(actions[e.code]);
      if(e.code==='KeyC')view.resetCamera();
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>{this.clear();if(this.active)this.onPause();});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('pointerdown',e=>{
      if(!this.active||this.pointer)return;canvas.focus({preventScroll:true});
      this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,button:e.button,type:e.pointerType};
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove',e=>{
      if(!this.active||this.pointer?.id!==e.pointerId)return;
      view.orbit(e.clientX-this.pointer.x,e.clientY-this.pointer.y);this.pointer.x=e.clientX;this.pointer.y=e.clientY;
    });
    canvas.addEventListener('pointerup',e=>{
      if(this.pointer?.id!==e.pointerId)return;
      if(this.active&&this.pointer.button===0&&this.pointer.type==='mouse'&&Math.hypot(e.clientX-this.pointer.startX,e.clientY-this.pointer.startY)<5)this.edges.add('attack');
      this.pointer=null;
    });
    canvas.addEventListener('pointercancel',()=>{this.pointer=null;});
    canvas.addEventListener('wheel',e=>{if(this.active){e.preventDefault();view.zoom(e.deltaY);}},{passive:false});
    this.joystick.addEventListener('pointerdown',e=>{if(!this.active||this.stickPointer!==null)return;e.preventDefault();this.stickPointer=e.pointerId;this.joystick.setPointerCapture(e.pointerId);this.moveStick(e);});
    this.joystick.addEventListener('pointermove',e=>{if(this.stickPointer===e.pointerId)this.moveStick(e);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])this.joystick.addEventListener(event,e=>{if(this.stickPointer===e.pointerId)this.resetStick();});
    for(const action of ['jump','attack','interact','roll']) {
      const button=document.getElementById('touch-'+action);
      button.addEventListener('pointerdown',e=>{if(!this.active)return;e.preventDefault();this.edges.add(action);button.classList.add('pressed');button.setPointerCapture(e.pointerId);});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>button.classList.remove('pressed'));
    }
  }
  moveStick(e) {
    const r=this.joystick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
    const radius=r.width*.34,d=Math.hypot(dx,dy),scale=d>radius?radius/d:1;
    this.stick.x=dx*scale/radius;this.stick.y=dy*scale/radius;this.knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
  }
  resetStick(){this.stickPointer=null;this.stick.x=this.stick.y=0;this.knob.style.transform='';}
  clear(){this.keys.clear();this.edges.clear();this.pointer=null;this.resetStick();document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
  setActive(active){this.active=active;this.clear();}
  consume() {
    if(!this.active)return {};
    const k=this.keys;let x=Number(k.has('KeyD')||k.has('ArrowRight'))-Number(k.has('KeyA')||k.has('ArrowLeft'))+this.stick.x;
    let forward=Number(k.has('KeyW')||k.has('ArrowUp'))-Number(k.has('KeyS')||k.has('ArrowDown'))-this.stick.y;
    if(Math.abs(x)<.12)x=0;if(Math.abs(forward)<.12)forward=0;
    const c=Math.cos(this.view.yaw),s=Math.sin(this.view.yaw),result={x:x*c-forward*s,z:-x*s-forward*c};
    for(const action of this.edges)result[action]=true;this.edges.clear();return result;
  }
}
