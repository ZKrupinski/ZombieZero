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
sandbox.document.createElement=()=>({getContext:()=>null});
vm.runInContext(fs.readFileSync('dist/fortress-mode.js','utf8'),sandbox);
vm.runInContext(source+`
function check(ok,msg){if(!ok)throw Error(msg)}
const enemy=(x,y)=>({x,y,w:16,h:22,hp:20,max:20,kind:0,form:0,seed:1.2,flash:0,burn:0,row:1});
mode='playing';runMode='fortress';clock=10;
const a=enemy(132,205),b=enemy(144,179),d=enemy(156,153);
foes=[a,b,d];
const struck=new Set([a]),dx=.45,dy=-Math.sqrt(1-dx*dx);
fortressContact(a,'lure',dx,dy);
check(applyKnockback(a,{x:dx,y:dy,duck:true,structure:'lure',struck},2),'chain succeeds');
check(struck.size===3,'one duck swing marks every chain member');
check(hitFlashes.length===1&&!b.recoil&&!d.recoil,'only first actor flashes initially');
check(b.knockDelay===.22&&d.knockDelay===.44,'distinct timing by chain depth');
check(Math.abs(knockVisualPosition(b).x-144)<.001,'second actor still at original position');
clock+=.17;updateEnemyVisuals(.17);
check(knockVisualPosition(a).x>132&&!b.recoil,'first moves before second contact');
clock+=.06;updateEnemyVisuals(.06);
check(b.recoil>0&&!d.recoil&&hitFlashes.length===2,'second contact only');
check(Math.abs(knockVisualPosition(b).x-144)<.001,'second actor hitstops');
clock+=.13;updateEnemyVisuals(.13);
check(knockVisualPosition(b).x>144&&!d.recoil,'second launches before third contact');
clock+=.09;updateEnemyVisuals(.09);
check(d.recoil>0&&hitFlashes.length===3,'third receives its own delayed flash');
clock+=.6;updateEnemyVisuals(.6);
check([a,b,d].every(z=>z.knockTime===0&&z.hp===20&&!z.duckContact),'all finish without extra HP damage');
console.log('PASS v388: duck ripple stagger, delayed per-actor flashes, one hit per swing.');
`,sandbox);
