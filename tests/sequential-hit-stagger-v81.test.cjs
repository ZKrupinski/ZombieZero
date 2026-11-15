'use strict';
// v81: every knockback victim reacts in sequence, freezes in place, then moves.
// All gameplay displacement is still resolved as safe independent colliders.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const css=fs.readFileSync('dist/style.css','utf8');
const source=fs.readFileSync('dist/game.js','utf8');
const finalCss=css.slice(css.lastIndexOf('/* Score sits in the top HUD'));
assert(finalCss.includes('left:50%!important;'),'the combo is horizontally centered');
assert(!finalCss.includes('left:calc(273px')&&!finalCss.includes('left:calc(257px'),'no per-size side offsets');
const noop=()=>{},elements={};
const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function element(id){return elements[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}};
const sandbox={navigator:{},document:{getElementById:element,addEventListener:noop},
 window:{addEventListener:noop},localStorage:{getItem:()=>0,setItem:noop},
 Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(source+`
function check(ok,msg){if(!ok)throw Error(msg)}
const close=(a,b)=>Math.abs(a-b)<.0001;
const enemy=(x,y=180)=>({x,y,w:33,h:44,hp:20,max:20,kind:0,form:0,
 seed:1.2,flash:0,burn:0,row:1,col:Math.round((x-ENEMY_LEFT_X)/ENEMY_PITCH)});
mode='playing';clock=10;
const a=enemy(100),b=enemy(146),third=enemy(193),spare=enemy(350,300);
foes=[a,b,third,spare];
damage(a,1,false,{x:300,y:0});
check(a.x>100&&b.x>146&&third.x>193,'existing force chain still reserves collision-safe destinations');
check(close(knockVisualPosition(a).x,100)&&close(knockVisualPosition(b).x,146)&&close(knockVisualPosition(third).x,193),
 'all rendered zombies first stay at the contact spot');
check(close(b.hitShakeFrom,a.hitShakeUntil)&&third.hitShakeFrom>b.hitShakeFrom,
 'each subsequent contact starts after primary launched and with separate cadence');
check(!b.recoil&&!third.recoil,'no premature bystander recoil before their actual contact');
check(b.hp===20&&third.hp===20,'chain collision does not apply bonus HP damage');
clock+=.08;updateEnemyVisuals(.08);
check(close(knockVisualPosition(a).x,100)&&close(knockVisualPosition(b).x,146),
 'initial freeze displays without moving anyone');
clock+=.10;updateEnemyVisuals(.10);
check(knockVisualPosition(a).x>100,'directly struck zombie begins launch after its own stun');
check(close(knockVisualPosition(b).x,146)&&b.recoil>.2&&b.hitHold>0,
 'first bystander now shakes and flashes but has not launched');
check(close(knockVisualPosition(third).x,193)&&!third.recoil,
 'second bystander still waits for its collision');
clock+=.16;updateEnemyVisuals(.16);
check(knockVisualPosition(b).x>146,'first bystander launches only after its freeze');
check(close(knockVisualPosition(third).x,193)&&third.recoil>.2,
 'second bystander shakes in place after the first already moved');
clock+=.11;updateEnemyVisuals(.11);
check(knockVisualPosition(third).x>193,'second bystander finally launches');
clock+=1.1;updateEnemyVisuals(1.1);
check([a,b,third].every(z=>!z.knockTime),'all delayed tweens terminate');
check([a,b,third].every(z=>close(knockVisualPosition(z).x,z.x)),
 'animated sprite endpoints meet physics colliders');
check([a,b,third].every(z=>insideZombieRoad(z,z)),'no impact violates road boundaries');
check(hitFlashes.some(f=>f.delay>0&&f.life-f.delay>=.4),
 'secondary hit effects wait for their own contact and play slower');
console.log('PASS: centered combo; contact, shake, sequential launch; no overlap or HP damage.');
`,sandbox);
