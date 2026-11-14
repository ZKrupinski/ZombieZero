'use strict';
// Screenshot regression: the v41 crowd had 35px citizens on 23.4px centers
// and a bloom-affected platform line at face height H-51.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/game.js','utf8');
assert(source.includes("rect(20,H-6,410,2,'#213139')"),
 'subtle platform trim sits at the feet, not eye height');
assert(source.includes("rect(20,H-4,410,2,'#14252e')"),
 'dark secondary trim sits beneath the crowd');
assert(!source.includes("rect(20,H-51,410,4,'#7189a2')"),
 'remove luminous bar through all 18 citizens');
assert(source.includes('const tile=128,width=23,height=34;'),
 'citizen display art must fit 23.4px centers and 34px collider height');
const noop=()=>{},elements={},draws=[],rects=[];
const g=new Proxy({drawImage:(...args)=>draws.push(args),
 fillRect:(...args)=>rects.push(args)},
 {get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
const el=id=>elements[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>g,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop};
class AudioMock{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const cheer={naturalWidth:1024,naturalHeight:512},attack={naturalWidth:1024,naturalHeight:512};
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{ZZCitizenCast:{ready:true,cheer,attack},AudioContext:AudioMock,addEventListener:noop},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),
 console,draws,rects};
vm.createContext(sandbox);
vm.runInContext(source+`
function check(ok,message){if(!ok)throw Error(message)}
start();serve();mode='playing';cheerTime=0;clock=0;
draws.length=0;rects.length=0;drawCrowd();
const crowd=draws.filter(a=>a[0]===window.ZZCitizenCast.cheer);
check(crowd.length===18,'all 18 original citizens remain visible and functional');
check(new Set(crowd.map(a=>a[1])).size===8,'all 8 costumes remain distinct');
for(let i=0;i<crowd.length;i++){
 const d=crowd[i],p=citizens[i];
 check(d[7]===23&&d[8]===34,'no stretched or overlapping citizen art');
 check(Math.abs(d[5]-(p.x-11.5))<.01,'sprite is centered on original hitbox');
 check(Math.abs(d[6]-(p.y-13))<.01,'sprite head aligns with collision box top');
 check(Math.abs((d[6]+34)-(p.y+21))<.01,'feet align with collision box bottom');
 if(i){
  const prev=crowd[i-1];
  check(d[5]-(prev[5]+23)>.3,'separate citizens must have a visible gap');
 }
}
const longStripes=rects.filter(a=>a[2]>=400);
check(longStripes.length===2,'only two quiet platform/foot strip rectangles');
check(longStripes.every(a=>a[1]>=H-6),'no stripe crosses the citizens faces');
check(citizens.every(p=>p.alive),'pure drawing does not affect any defensive citizen');
console.log('PASS: 18 distinct citizens without body overlap; bottom-aligned colliders; no luminous face-height rail');
`,sandbox);
