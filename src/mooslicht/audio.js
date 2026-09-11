// Procedural woodland chimes. No downloads and no audio before a user gesture.
export class Soundscape {
  constructor(volume=.45,enabled=true){this.volume=volume;this.enabled=enabled;this.context=null;this.next=0;this.step=0;this.playing=false;this.voices=0;}
  async unlock(){
    try {
      if(!this.context){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;this.context=new Context();this.master=this.context.createGain();this.master.connect(this.context.destination);this.setVolume(this.volume);}
      if(this.context.state==='suspended')await this.context.resume();
    }catch{this.enabled=false;}
  }
  setVolume(value){this.volume=Math.max(0,Math.min(1,value));if(this.master)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.context.currentTime,.06);}
  setEnabled(enabled){this.enabled=enabled;this.setVolume(this.volume);}
  tone(frequency,duration=.45,volume=.16,type='sine',delay=0){
    if(!this.context||!this.enabled||this.context.state!=='running'||this.voices>32)return;
    const t=this.context.currentTime+delay,o=this.context.createOscillator(),g=this.context.createGain();
    o.type=type;o.frequency.setValueAtTime(frequency,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);this.voices++;o.onended=()=>{o.disconnect();g.disconnect();this.voices--;};
  }
  tick(){
    if(!this.playing||!this.context||!this.enabled||this.context.state!=='running')return;
    const t=this.context.currentTime;if(t<this.next)return;this.next=t+.54;
    const notes=[293.66,440,587.33,659.25,440,391.99,329.63,440,293.66,391.99,587.33,440,329.63,293.66,220,293.66];
    this.tone(notes[this.step%notes.length],1.7,.035);
    if(this.step%4===0)this.tone([146.83,130.81,164.81,110][Math.floor(this.step/4)%4],2.4,.035,'sine');
    this.step++;
  }
  event(e){
    const t=e.type;
    if(t==='note')this.tone([523.25,659.25,783.99][e.index],1.05,.22);
    else if(t==='seed'||t==='wind'){this.tone(t==='seed'?987.77:783.99,.4,.10);this.tone(1318.51,.5,.06,'sine',.07);}
    else if(t==='jump')this.tone(440,.13,.055,'triangle');
    else if(t==='land')this.tone(110,.08,.055,'triangle');
    else if(t==='roll')this.tone(196,.15,.04,'triangle');
    else if(t==='slash')this.tone(196,.09,.06,'triangle');
    else if(t==='hit'||t==='stomp')this.tone(t==='hit'?164.81:87.31,.14,.095,'triangle');
    else if(t==='hurt')this.tone(130.81,.27,.14,'triangle');
    else if(t==='defeat'){this.tone(329.63,.35,.12);this.tone(493.88,.6,.1,'sine',.08);}
    else if(t==='light'||t==='chest'||t==='win')for(let i=0;i<5;i++)this.tone([293.66,440,587.33,739.99,880][i],1.8,.12,'sine',i*.13);
  }
  async suspend(){this.playing=false;try{if(this.context?.state==='running')await this.context.suspend();}catch{}}
}
