import * as T from 'three';
import {makeHero} from './hero.js';
import {APPEARANCE_OPTIONS,AppearanceDraft} from './appearance.js';

export class AppearanceMenu {
  constructor(dialog,{getAppearance,onOpen,onApply,onClose}){
    this.dialog=dialog;this.callbacks={getAppearance,onOpen,onApply,onClose};this.canvas=dialog.querySelector('canvas');this.opened=false;
    const names={variant:'Grundvariante',hair:'Frisur',hairColor:'Haarfarbe',skin:'Hautton',eyes:'Augenfarbe',outfit:'Outfitfarbe'};
    const fields=dialog.querySelector('.appearance-fields');
    for(const [key,options] of Object.entries(APPEARANCE_OPTIONS)){
      const group=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=names[key];group.append(legend);
      for(const [value,label,color] of options){
        const wrap=document.createElement('label'),input=document.createElement('input'),caption=document.createElement('span');
        input.type='radio';input.name=key;input.value=value;caption.textContent=label;
        if(color){const swatch=document.createElement('i');swatch.style.backgroundColor=color;swatch.setAttribute('aria-hidden','true');wrap.append(swatch);}
        wrap.append(input,caption);group.append(wrap);
        input.addEventListener('change',()=>{if(input.checked&&this.draft){this.draft.choose(key,value);this.refresh();}});
      }
      fields.append(group);
    }
    dialog.querySelector('[data-appearance="apply"]').addEventListener('click',()=>this.close(true));
    dialog.querySelector('[data-appearance="cancel"]').addEventListener('click',()=>this.close(false));
    dialog.querySelector('[data-appearance="reset"]').addEventListener('click',()=>{this.draft.reset();this.refresh();});
    dialog.querySelector('[data-appearance="camera"]').addEventListener('click',()=>this.resetView());
    dialog.querySelector('[data-appearance="left"]').addEventListener('click',()=>this.yaw-=.35);
    dialog.querySelector('[data-appearance="right"]').addEventListener('click',()=>this.yaw+=.35);
    dialog.querySelector('[data-appearance="closer"]').addEventListener('click',()=>this.zoom(-.35));
    dialog.querySelector('[data-appearance="farther"]').addEventListener('click',()=>this.zoom(.35));
    dialog.addEventListener('cancel',e=>{e.preventDefault();this.close(false);});
    this.canvas.addEventListener('pointerdown',e=>{this.canvas.focus();this.pointer={id:e.pointerId,x:e.clientX};this.canvas.setPointerCapture(e.pointerId);});
    this.canvas.addEventListener('pointermove',e=>{if(this.pointer?.id===e.pointerId){this.yaw+=(e.clientX-this.pointer.x)*.012;this.pointer.x=e.clientX;}});
    const release=()=>{this.pointer=null;};this.canvas.addEventListener('pointerup',release);this.canvas.addEventListener('pointercancel',release);this.canvas.addEventListener('lostpointercapture',release);
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom(e.deltaY*.004);},{passive:false});
    this.canvas.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-'].includes(e.key)){
        e.preventDefault();e.stopPropagation();
        if(e.key==='ArrowLeft')this.yaw-=.18;else if(e.key==='ArrowRight')this.yaw+=.18;
        else if(e.key==='Home')this.resetView();else this.zoom(['ArrowUp','+'].includes(e.key)?-.2:.2);
      }
    });
  }
  init(){
    if(this.renderer)return;
    this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.scene=new T.Scene();this.scene.background=new T.Color('#d8e0df');
    this.scene.add(new T.HemisphereLight('#ffffff','#899397',2.5));
    const key=new T.DirectionalLight('#fff7ec',2.5);key.position.set(-3,5,5);this.scene.add(key);
    const rim=new T.DirectionalLight('#dbe9ff',1.8);rim.position.set(3,3,-3);this.scene.add(rim);
    this.camera=new T.PerspectiveCamera(34,1,.1,30);this.hero=makeHero();this.scene.add(this.hero.root);
  }
  resetView(){this.yaw=-.18;this.distance=4.4;}
  zoom(delta){this.distance=Math.max(2.4,Math.min(5.6,this.distance+delta));}
  open(){
    if(this.opened)return;
    this.init();this.restore=this.callbacks.onOpen();this.draft=new AppearanceDraft(this.callbacks.getAppearance());
    this.resetView();this.opened=true;this.refresh();this.dialog.showModal();
  }
  refresh(){
    this.hero.applyAppearance(this.draft.value);
    for(const input of this.dialog.querySelectorAll('input[type="radio"]'))input.checked=this.draft.value[input.name]===input.value;
  }
  close(apply){
    if(!this.opened)return;
    if(apply)this.callbacks.onApply(this.draft.confirm());else this.draft.cancel();
    this.pointer=null;this.draft=null;this.opened=false;this.dialog.close();this.callbacks.onClose(this.restore);
  }
  // Called by the existing single application frame loop only while the dialog
  // is open. No extra animation loop or per-option WebGL contexts are created.
  render(){
    if(!this.opened)return;
    const width=this.canvas.clientWidth,height=this.canvas.clientHeight;
    if(width!==this.width||height!==this.height){this.width=width;this.height=height;this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
    this.hero.root.rotation.y=this.yaw;
    this.camera.position.set(0,1.5,this.distance);this.camera.lookAt(0,this.distance<3?1.4:1.08,0);this.renderer.render(this.scene,this.camera);
  }
  dispose(){if(this.opened)this.close(false);this.hero?.dispose();this.renderer?.dispose();this.hero=null;this.renderer=null;this.width=this.height=0;}
}
