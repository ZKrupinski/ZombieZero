'use strict';
const vm=require('node:vm'),fs=require('node:fs');
const noop=()=>{},els={},ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
const src=fs.readFileSync('dist/game.js','utf8');
vm.runInContext(src+`
function check(v,m){if(!v)throw Error(m)}
{
 // Deterministic eligibility/choice. A normal wave has no diagonal anim.
 Math.random=()=>.5;
 start();serve();wave=1;rack();
 check(waveInitialRegulars===27,'initial density denominator');
 check(foes.every(z=>z.moveDir===undefined),'zombies initially face front');
 clock=breakoutNextCheck+1;
 for(let j=0;j<250;j++){clock+=.04;march(.04)}
 check(foes.every(z=>z.moveDir===0&&!Number.isFinite(z.breakoutTime)),
       'full formation never uses fake diagonal or random lateral drift');

 // A few dead zombies still do not authorize breakouts.
 foes.splice(0,5);clock=breakoutNextCheck+.01;march(.016);
 check(foes.every(z=>z.moveDir===0),'five casualties not sufficient');

 // Wave still has five columns' worth of large gaps: a rogue can
 // actually move toward a VACANT column, not just play side-steps.
 rack();foes=foes.filter(z=>z.row>0&&[0,4,8].includes(z.col));
 check(foes.length===6&&waveInitialRegulars===27,'sparse horde');
 clock=breakoutNextCheck+.01;
 const initial=foes.map(z=>({z,x:z.x,col:z.col,row:z.row}));
 march(.04);
 let dashing=foes.filter(z=>Number.isFinite(z.breakoutTime));
 check(dashing.length===1,'one rogue enters short diagonal action');
 const rogue=dashing[0];
 check(!rogue.boss,'never a boss');
 check(rogue.row>0,'front or middle rank only');
 check(Math.abs(rogue.moveDir)===1,'actual lateral motion switches animation');
 check(rogue.x!==initial.find(e=>e.z===rogue).x,'position really moved');
 const dx=rogue.breakoutVX,vy=rogue.breakoutVY;
 check(Math.abs(dx)>60&&vy>45,'fast short diagonal, not a fake turn');
 const columnBefore=initial.find(e=>e.z===rogue).col;
 const dest=rogue.breakoutTargetCol;
 check(Math.abs(dest-columnBefore)===1,'dashes into adjacent vacant lane');
 for(let k=0;k<20;k++){clock+=.04;march(.04)}
 check(!Number.isFinite(rogue.breakoutTime),'breakout animation is bounded');
 check(rogue.col===dest,'column metadata follows real position');
 check(Math.abs(rogue.x-(ENEMY_LEFT_X+dest*ENEMY_PITCH))<.001,'aligned to new empty lane');
 check(rogue.breakoutCooldownUntil>clock,'per-zombie cooldown');
 march(.016);check(rogue.moveDir===0,'front-facing resumes immediately');
 check(foes.filter(z=>Number.isFinite(z.breakoutTime)).length<=BREAKOUT_MAX_ACTIVE,
   'at most two exceptional rogues');

 // Too close to defense line is a hard no-dash condition.
 rack();foes=foes.filter(z=>z.row>0&&[0,4,8].includes(z.col));
 for(const z of foes)z.y=DEFENSE_Y-95;
 clock=breakoutNextCheck+.01;march(.016);
 check(foes.every(z=>!Number.isFinite(z.breakoutTime)),
   'no unfair diagonal bursts immediately before defense line');

 // At very low density, rare two-rank action is allowed, never
 // two in the same row or more than two simultaneous.
 rack();foes=foes.filter(z=>z.row>0&&[0,4,8].includes(z.col));
 Math.random=()=>0;
 clock=breakoutNextCheck+.01;march(.016);
 dashing=foes.filter(z=>Number.isFinite(z.breakoutTime));
 check(dashing.length===2,'rare second front-row rogue when severely sparse');
 check(dashing[0].row!==dashing[1].row,'no two rogues in the same row');
 check(foes.every(z=>z.x>=20&&z.x+z.w<=W-20),'stay inside road');

 // The previous random oscillation is removed from the normal marcher.
 check(!src.includes('Math.sin(clock*1.4+(z.seed||0))*radius'),
   'no perpetual sinusoidal diagonal posing');
 console.log('PASS: full density front-only, sparse trigger, actual fast diagonal, vacancy targeting, timed return, cooldown, fairness and two-roguemax');
}
`,{...sandbox,src});
