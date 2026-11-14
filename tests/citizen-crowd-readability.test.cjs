'use strict';
// Protect the intended v41 citizen scale: visually friendly overlap is
// intentional; the SHIELD pickup must stay above heads at H-58.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/game.js','utf8');
assert(source.includes("rect(20,H-51,410,4,'#7189a2')"),
 'restore original rear platform trim, which was not the glowing beam');
assert(source.includes("rect(20,H-47,410,3,'#182d40')"),
 'retain original dark back rail');
assert(source.includes('const SHIELD_LINE_Y=H-58;'),
 'the actual shield beam should move 23px up, clear of citizen heads');
assert(source.includes('rect(21,SHIELD_LINE_Y,408,3'),
 'draw the shield at the new height');
assert(source.includes('b.y+radius>=SHIELD_LINE_Y'),
 'bounce collision must coincide with visible shield');
assert(!source.includes('rect(21,H-35,408,4'),
 'no old face-height shield is drawn');
assert(source.includes('const tile=128,width=35,height=46;'),
 'v41 approved large bitmap citizens restored without changing the 20x34 colliders');
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
for(const p of citizens)p.phase=-Math.PI/2; // deterministic idle, no cheer bob
draws.length=0;rects.length=0;drawCrowd();
const crowd=draws.filter(a=>a[0]===window.ZZCitizenCast.cheer);
check(crowd.length===18,'all 18 original citizens remain visible and functional');
check(new Set(crowd.map(a=>a[1])).size===8,'all 8 costumes remain distinct');
for(let i=0;i<crowd.length;i++){
 const d=crowd[i],p=citizens[i];
 check(d[7]===35&&d[8]===46,'v41 approved larger citizen art is restored');
 check(Math.abs(d[5]-(p.x-17.5))<.01,'large sprite remains centered on original hitbox');
 check(Math.abs(d[6]-(p.y-25))<.01,'sprite top returns to v41 approved position');
 check(Math.abs((d[6]+46)-(p.y+21))<.01,'feet still align with original collision box bottom');
 if(i){
  const prev=crowd[i-1];
  check(Math.abs((d[5]-prev[5])-23.4)<.01,'citizen positions unchanged, deliberately denser at larger scale');
 }
}
const longStripes=rects.filter(a=>a[2]>=400);
check(longStripes.length===2,'the two original platform stripes remain');
check(longStripes[0][1]===H-51&&longStripes[1][1]===H-47,
 'dark platform trim sits behind and above the citizen sprite heads');
check(citizens.every(p=>p.alive),'pure drawing does not affect any defensive citizen');
// The shield is a skill, not a platform decoration. The graphics, spark and
// physics all use exactly the same new Y while the civilian colliders stay.
const lowestHead=Math.min(...citizens.map(p=>p.y-25));
check(SHIELD_LINE_Y+3<lowestHead,
 'visible shield beam is above restored larger citizen heads');
active.shield=18;mode='playing';balls=[newBall(60,SHIELD_LINE_Y-12,0,400,false)];
update(.04);
check(balls[0].vy<0&&balls[0].y+8<=SHIELD_LINE_Y,
 'shield still reflects a falling ball at the newly visible beam');
check(citizens.every(p=>p.alive),
 'shield catches ball without sacrificing any citizen');
rects.length=0;draw();
check(rects.some(a=>a[0]===21&&a[1]===SHIELD_LINE_Y&&a[2]===408&&a[3]===3),
 'actual gameplay uses new raised visible shield line');
check(!rects.some(a=>a[0]===21&&a[1]===H-35&&a[2]===408&&a[3]===4),
 'old eye-level beam never reappears');
console.log('PASS: restored 35x46 crowd as in v41, unchanged citizen hitboxes, shield beam above heads and correct bounce');
`,sandbox);
