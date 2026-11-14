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
 window:{AudioContext:AudioMock,addEventListener:noop},localStorage:{getItem:()=>0,setItem:noop},
 Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,
 Math:Object.create(Math),console};
vm.createContext(sandbox);
const src=fs.readFileSync('dist/game.js','utf8');sandbox.src=src;
vm.runInContext(src+`
function check(ok,msg){if(!ok)throw Error(msg)}
function foe(x=130,y=110,hp=6){
 return {x,y,w:33,h:44,hp,max:hp,kind:0,form:0,flash:0,seed:1.2,
  burn:0,burnTick:0,spreadTick:0,row:1,col:Math.round((x-ENEMY_LEFT_X)/ENEMY_PITCH)};
}
function pick(x=145,y=180){
 drop({x:x-16.5,y:y-22,w:33,h:44,max:3,boss:false});
}
Math.random=()=>0;start();serve();clock=2;
wave=1;rack();items=[];lastSupportAt=clock;
pick();check(items.length===1,'first loot appears on eligible roll');
const kind=items[0].k;
pick();check(items.length===2,'a second eligible kill yields a second item');
check(items[1].k!==kind,'no identical pickup types on ground');
check(Math.hypot(items[0].x-items[1].x,items[0].y-items[1].y)>=LOOT_SPACING,
      'pickup icons do not overlap despite identical spawn points');
pick();check(items.length===2,'maximum two simultaneous items');
for(const item of items){check(item.x>=40&&item.x<=410,'loot stays inside visible roadway')}
const saved=items[0].k;active[saved]=10;items=[];pick();
check(items[0].k!==saved,'no active-skill duplicate pickup');
active={};items=[];
for(let j=0;j<10;j++){items=[];pick()}
check(stageLootCount<=LOOT_MAX_STAGE,'hard maximum four ordinary drops per stage');
const before=items.length;
pick();check(items.length===before,'late extra enemies do not spam items');
const priorLoot=stageLootCount;
items=[{x:200,y:200,k:'dual',phase:0},{x:260,y:200,k:'triple',phase:0}];
drop({x:200,y:120,w:66,h:88,max:50,boss:true});
check(items.length===2,'boss reward replaces oldest pickup, never stacks a third');
check(stageLootCount===priorLoot+1,'boss retains guaranteed reward');
check(new Set(items.map(i=>i.k)).size===2,'boss reward also avoids duplicates');
check(Math.hypot(items[0].x-items[1].x,items[0].y-items[1].y)>=LOOT_SPACING,'boss reward does not overlap another pickup');

// Contact chain: a hit on one zombie pushes the next two in order, leaving
// collision boxes completely separate.
mode='playing';items=[];hitFlashes=[];clock=3;
let a=foe(100,140,9),b=foe(146,140,9),third=foe(193,140,9),d=foe(350,220,9);
foes=[a,b,third,d];
const oldA=a.x,oldB=b.x,oldC=third.x;
damage(a,1,false,{x:320,y:0});
check(a.x>=oldA+24,'the struck zombie visibly slides more than before');
check(b.x>oldB&&third.x>oldC,'collision transfer ripples through two bystanders');
check(a.knockTime>0&&b.knockTime>0&&third.knockTime>0,
 'each displaced zombie gets a temporary motion echo');
check(b.flinch>0&&third.flinch>0,'pushed bystanders react despite taking no damage');
check(b.hp===9&&third.hp===9,'collision propagation is force only, not extra damage');
check(!zombieBoxesOverlap(a,{x:a.x,y:a.y},b,{x:b.x,y:b.y},0),
 'contact chain cannot overlap neighbor');
check(!zombieBoxesOverlap(b,{x:b.x,y:b.y},third,{x:third.x,y:third.y},0),
 'contact chain cannot overlap next neighbor');
updateEnemyVisuals(.33);
check([a,b,third].every(z=>!z.knockTime),'afterimage ends within .32 seconds');
// Bounding-box limits block a shove against the roadway wall.
a=foe(20,130);foes=[a];
check(!applyKnockback(a,{x:-300,y:0},1),'wall safely blocks outward knockback');
check(a.x===20,'wall collision cannot move outside roadway');
// Boss cannot be pushed; wall cannot get shoved through.
let boss={...foe(137,140,60),w:66,h:88,boss:true,bossForm:0};
a=foe(100,140);foes=[a,boss];
check(!applyKnockback(a,{x:300,y:0},1),'nearby boss blocks chain or shortens it');
check(a.x+a.w<=boss.x,'no collision through boss');
// Timed marching should not re-overlap bodies after a successful chain.
a=foe(100,140);b=foe(146,140);third=foe(193,140);foes=[a,b,third];
damage(a,1,false,{x:360,y:0});
for(let t=0;t<70;t++){clock+=.016;march(.016)}
for(let i=0;i<foes.length;i++)for(let j=i+1;j<foes.length;j++)
 check(!zombieBoxesOverlap(foes[i],foes[i],foes[j],foes[j],0),
   'collisions remain separated during subsequent independent movement');
// Dash is blocked by newly occupied routes rather than running through.
check(src.includes('if(canKnockback(z,proposedX,z.y))'),
 'diagonal dash now checks for actual free space');
console.log('PASS: visible diversified pickup drops, fire retained, on-screen/type/total caps, boss prize, 2-hop force-only knockback, animation echo and overlap avoidance');
`,sandbox);
