export class GardenAudio{
 constructor(){this.ctx=null;this.muted=false;}
 start(){try{if(!this.ctx){const A=window.AudioContext||window.webkitAudioContext;if(A)this.ctx=new A();}this.ctx?.resume().catch(()=>{});}catch{}}
 tone(f,d,type='sine',volume=.075,delay=0,end=f){if(!this.ctx||this.muted)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+d);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+d+.02);}
 noise(type){if(!this.ctx||this.muted)return;const d=type==='bush'?.12:.085,b=this.ctx.createBuffer(1,this.ctx.sampleRate*d,this.ctx.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length)**2;const src=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();src.buffer=b;f.type='lowpass';f.frequency.value=type==='bush'?2600:1000;g.gain.value=.13;src.connect(f).connect(g).connect(this.ctx.destination);src.start();}
 hit(type,broken,streak=0){this.noise(type);if(type==='crystal'){this.tone(850+(streak%6)*55,.2,'sine',.09);this.tone(1350,.35,'sine',.045,.03);}else this.tone(type==='bush'?130:220,.12,'triangle',.12,0,50);if(broken)[523,659,784].forEach((f,i)=>this.tone(f,.16,'sine',.05,i*.04));}
 chime(){[523,659,784,1047].forEach((f,i)=>this.tone(f,.25,'sine',.065,i*.06));}
}
