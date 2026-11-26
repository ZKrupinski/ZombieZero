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
check(hitFlashes.length===0&&a.hitShakeUntil>clock&&!b.recoil&&!d.recoil,'only first actor flashes; no burst debris');
check(ballContactFX.length===1&&ballContactFX[0].kind==='enemy','first contact uses the approved comic atlas');
check(ballContactFX[0].sizeMultiplier<1,'compact contact stamp matches mini zombie size');
check(b.knockDelay===.22&&d.knockDelay===.44,'distinct timing by chain depth');
check(Math.abs(knockVisualPosition(b).x-144)<.001,'second actor still at original position');
clock+=.17;updateEnemyVisuals(.17);
check(knockVisualPosition(a).x>132&&!b.recoil,'first moves before second contact');
clock+=.06;updateEnemyVisuals(.06);
check(b.recoil>0&&!d.recoil&&b.hitShakeUntil>clock&&hitFlashes.length===0,'second contact only, no debris');
check(ballContactFX.length===2,'second comic contact arrives with its own delayed hit');
check(Math.abs(knockVisualPosition(b).x-144)<.001,'second actor hitstops');
clock+=.13;updateEnemyVisuals(.13);
check(knockVisualPosition(b).x>144&&!d.recoil,'second launches before third contact');
clock+=.09;updateEnemyVisuals(.09);
check(d.recoil>0&&d.hitShakeUntil>clock&&hitFlashes.length===0,'third receives its own delayed flash without debris');
clock+=.6;updateEnemyVisuals(.6);
check([a,b,d].every(z=>z.knockTime===0&&z.hp===20&&!z.duckContact),'all finish without extra HP damage');
ballContactFX=[];hitFlashes=[];
const iceVictim=enemy(210,260);foes=[iceVictim];
fortressContact(iceVictim,'ice',0,1);
check(ballContactFX.length===1&&hitFlashes.length===0,'ice latch uses comic impact instead of explosive debris');
check(ballContactFX[0].y>iceVictim.y+iceVictim.h/2,'ice impact is on the claw-facing side');
fortressContact(iceVictim,'ice',0,1);
check(ballContactFX.length===1,'no repeated stamp on same contact');
const ball={held:false};
spawnContact(ball,150,200,0,1,'wall');
check(ballContactFX.length===2&&ballContactFX[1].kind==='wall','existing wall comic contact remains');
const mole={x:210,y:260},rider=enemy(212,260);foes=[rider];clock+=1;
check(pushMoleZombie(rider,mole,1)&&rider.y>282&&rider.knockTime>0,'mole can launch downwards');
const up=enemy(212,260);foes=[up];clock+=1;
check(pushMoleZombie(up,mole,-1)&&up.y+up.h<260,'mole can launch upwards');
const danger=enemy(212,DEFENSE_Y-25);foes=[danger];clock+=1;
pushMoleZombie(danger,{x:210,y:DEFENSE_Y-30},1);
check(danger.y+danger.h<=DEFENSE_Y-16,'mole cannot cause instant line breach');
const splash=enemy(190,200);foes=[splash,enemy(300,200)];clock+=1;hitFlashes=[];
damage(splash,.8,false,{x:1,y:-.2,push:.55,bankSplash:true});
check(Math.abs(splash.hp-19.2)<.001&&hitFlashes.length===0,'bank splash preserves damage without debris');
check(splash.bankFlashUntil>clock&&!(splash.hitShakeUntil>clock),'bank splash uses brief subdued flash');
console.log('PASS v396: comic contacts, bidirectional mole launches, quiet bank splash.');
start('endless');check(fortress.getWallCount()===1&&hasEndlessStructures(),'wave 1 introduces one wall');
mode='endlessShift';endlessShiftSpawned=true;wave=59;refillEndlessWave();
check(wave===60&&fortress.getWallCount()===5&&hasEndlessStructures(),'wave 10 includes all five introduced types');
check(foes.every(z=>fortress.isOpen(z,z.x,z.y)),'normal-size endless enemies spawn clear');
check(!isFortress()&&!isMiniHorde(),'endless keeps original enemy size and mode');
const bounds=fortress.bounds();
 const wall=Array.from({length:bounds.columns*bounds.rows},(_,i)=>fortress.getStructure(i%bounds.columns,Math.floor(i/bounds.columns))).find(w=>w?.kind==='wall');
 check(!!wall,'a solid wall exists among the randomized devices');
const attacker=enemy(wall.x+2,wall.y-25);foes=[attacker];mode='playing';
check(!canKnockback(attacker,wall.x+2,wall.y+1),'endless knockback cannot tunnel through wall');
const ball2={x:wall.x+5,y:wall.y-2,vx:0,vy:100};
check(fortress.bounceBall(ball2,ball2.x,ball2.y-6,4),'endless wall reflects ball');
start('campaign');check(fortress.getWallCount()===0&&!hasEndlessStructures(),'support cleared when leaving endless');
console.log('PASS v398: actual endless transition, unchanged spawn scale, wall collision, mode reset.');
`,sandbox);
