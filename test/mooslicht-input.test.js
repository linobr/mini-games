import test from 'node:test';
import assert from 'node:assert/strict';
import {Controls} from '../src/mooslicht/input.js';
class Element {
  constructor(){this.listeners={};this.style={};this.tagName='CANVAS';this.classList={add(){},remove(){}};}
  addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
  send(name,data={}){for(const fn of this.listeners[name]||[])fn({target:this,preventDefault(){},...data});}
  setPointerCapture(){} focus(){} getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
}
function fixture(){
  const oldWindow=globalThis.window,oldDocument=globalThis.document,window=new Element(),canvas=new Element(),elements={};
  const document={getElementById(id){return elements[id]??=new Element();},querySelectorAll(){return [];}};
  globalThis.window=window;globalThis.document=document;
  let pauses=0;const view={yaw:0,orbit(){},resetCamera(){},zoom(){}};
  return {window,canvas,elements,view,controls:new Controls(canvas,view,()=>pauses++),pauses:()=>pauses,restore(){globalThis.window=oldWindow;globalThis.document=oldDocument;}};
}
test('Mooslicht: keyboard actions fire once, camera-relative movement works and pause clears keys',()=>{
  const f=fixture();try{
    const c=f.controls;c.setActive(true);f.window.send('keydown',{code:'KeyW'});f.window.send('keydown',{code:'Space'});
    assert.deepEqual(c.consume(),{x:0,z:-1,jump:true});assert.equal(c.consume().jump,undefined);
    f.view.yaw=Math.PI/2;assert.ok(c.consume().x<-.99);
    f.window.send('keydown',{code:'Escape'});assert.equal(f.pauses(),1);c.setActive(false);assert.deepEqual(c.consume(),{});
    c.setActive(true);assert.equal(Math.abs(c.consume().z),0);
  }finally{f.restore();}
});
test('Mooslicht: touch stick and action button coexist and pointer cancellation releases movement',()=>{
  const f=fixture();try{
    f.controls.setActive(true);f.elements.joystick.send('pointerdown',{pointerId:1,clientX:84,clientY:50});
    f.elements['touch-jump'].send('pointerdown',{pointerId:2});const input=f.controls.consume();assert.equal(input.x,1);assert.equal(input.jump,true);
    f.elements.joystick.send('pointercancel',{pointerId:1});assert.equal(f.controls.consume().x,0);
  }finally{f.restore();}
});
