'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const name of ['citizen-cheer-v41.png','citizen-sacrifice-v41.png']){
 const b=fs.readFileSync('dist/assets/ip/'+name);
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name+' real bitmap PNG');
 assert.equal(b.readUInt32BE(16),1024,name+' has eight 128px columns');
 assert.equal(b.readUInt32BE(20),512,name+' has four 128px rows');
 assert.equal(b[25],3,name+' is optimized palette bitmap rather than SVG');
 assert(b.includes(Buffer.from('tRNS')),name+' retains transparent background');
}
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const src=fs.readFileSync('dist/game.js','utf8');
assert(html.includes('assets/ip/citizen-cast-v41.js?v=41-voxel-citizens'),
 'live game loads new citizen atlas reader');
assert(html.indexOf('citizen-cast-v41.js')<html.indexOf('game.js?v=41-voxel-citizens'),
 'sprite loader arrives before game.js');
for(const f of ['citizen-cheer-v41.png','citizen-sacrifice-v41.png','citizen-cast-v41.js'])
 assert(sw.includes(f),'offline asset cached: '+f);
assert(!src.includes('bossHpOffset('),'boss health bar placement code removed');
assert(!src.includes("100*Math.max(0,z.hp/z.max)"),'no boss HP fill bar drawn');
assert(!src.includes("g.fillText(BOSS_FORMS[z.bossForm"),'boss numeric health text removed');
assert(src.includes("z.hp-=amount"),'boss combat HP and damage model preserved');
const noop=()=>{},elements={},images=[];
const ctx=new Proxy({drawImage:(...args)=>images.push(args)},
 {get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
const el=id=>elements[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
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
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console,
 images};
vm.createContext(sandbox);
vm.runInContext(src+`
function check(ok,label){if(!ok)throw Error(label)}
start();serve();images.length=0;
check(citizens.length===18,'original 18 support citizens preserved');
check(new Set(citizens.map(p=>p.style)).size===8,'all eight colorful unique citizen identities appear');
cheerTime=0;clock=0;drawCrowd();
const crowd=images.filter(a=>a[0]===window.ZZCitizenCast.cheer);
check(crowd.length===18,'all citizens use transparent PNG animation frames');
check(crowd[0][1]===0&&crowd[1][1]===128&&crowd[7][1]===896,
 'column index maps to the correct distinct citizen');
check(crowd.every(a=>a[3]===128&&a[4]===128&&a[7]===35&&a[8]===46),
 'source cells independent and the game renders 35x46 citizens');
images.length=0;cheerTime=1.1;clock=.3;drawCrowd();
const cheering=images.filter(a=>a[0]===window.ZZCitizenCast.cheer);
check(cheering.length===18&&cheering.some(a=>a[2]>0),
 'cheer action progresses through four actual frames');
let p=citizens[0];p.shooting=1.1;images.length=0;drawCrowd();
check(images.some(a=>a[0]===attack&&a[1]===0),'bazooka hero switches to citizen attack sheet');
p.shooting=0;p.supportTime=.62;images.length=0;drawCrowd();
check(images.some(a=>a[0]===attack),'ordinary thrown support animates a counterattack');
p.supportTime=0;
const ball=newBall(p.x,p.y-12,0,400,false);const ok=citizenCollision(ball,8);
check(ok&&!p.alive&&p.dying===.8,'ball sacrifice preserves original bounce/loss rules');
images.length=0;drawCrowd();
check(images.some(a=>a[0]===attack),'sacrificed citizen displays distinct hero animation');
updateCrowd(.27);images.length=0;drawCrowd();
check(images.some(a=>a[0]===attack&&a[2]>=128),'sacrifice frames progress after collision');
resetCitizens();
check(citizens.every(p=>p.alive&&p.supportTime===0),'all citizens recover and are reset for another game');
const boss={x:192,y:74,row:-1,col:4,w:66,h:88,hp:36,max:36,
 boss:true,kind:4,form:0,bossForm:0,seed:0,burn:0,flash:0};
window.ZZObjectSprite={draw:()=>true};
images.length=0;zombie(boss);
check(boss.hp===36,'removing boss HP gauge does not change boss HP logic');
console.log('PASS: 8 colorful voxel citizens × 4 cheer and 4 sacrifice frames, combat/recovery timing, no boss HP UI');
`,sandbox);
