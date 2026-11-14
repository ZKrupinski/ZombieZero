'use strict';
const fs=require('node:fs'),vm=require('node:vm');
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
vm.runInContext(fs.readFileSync('dist/game.js','utf8')+`
function check(value,message){if(!value)throw Error(message)}
Math.random=()=>0;
start();serve();clock=100;wave=3;rack();
const corpse={x:120,y:100,w:33,h:44,max:6,boss:false};
items=[{x:120,y:120,k:'dual',phase:0},{x:192,y:120,k:'triple',phase:0}];
stageLootCount=2; // two already on the ground, third slot must still allow fire
drop(corpse);
check(items.length===2,'fire reward never crowds a third icon');
check(items.some(i=>i.k==='fire'),'overdue fire displaces one ordinary pickup');
check(stageLootCount===3&&lastFireDropWave===3,'final stage reward slot consumed by guaranteed fire');
check(Math.hypot(items[0].x-items[1].x,items[0].y-items[1].y)>=LOOT_SPACING,
 'replacement pickup remains physically separated');
items=[];drop(corpse);
check(items.length===0,'stage cap prevents extra ordinary drops');
wave=4;rack();items=[];stageLootCount=0;clock=110;
drop(corpse);
check(items.every(i=>i.k!=='fire'),'fire never repeats in the immediately following wave');
const second={x:90,y:140,w:33,h:44,hp:8,max:8,kind:0,form:0,flash:0,seed:2,
 burn:0,burnTick:0,spreadTick:0,row:1,col:1};
const third={...second,x:136,col:2};
const fourth={...second,x:182,col:3};
foes=[second,third,fourth];mode='playing';
const before=[second.x,third.x,fourth.x];
damage(second,1,false,{x:360,y:0});
check(second.x>before[0]+30&&third.x>before[1]&&fourth.x>before[2],
 'chain impulse displaces struck and neighboring zombies');
check(second.knockTime===KNOCK_TRAIL_LIFE&&fourth.knockChain,
 'impact trails identify primary and secondary collision');
for(let i=0;i<foes.length;i++)for(let j=i+1;j<foes.length;j++)
 check(!zombieBoxesOverlap(foes[i],foes[i],foes[j],foes[j],0),
  'pushed enemies cannot interpenetrate');
console.log('PASS: guaranteed fire despite full pickup lane, no repeated fire, visible chain force and separation');
`,sandbox);
