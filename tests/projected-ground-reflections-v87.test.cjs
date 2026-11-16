'use strict';
// v87: detached floor projections must be visibly BELOW sprite/VFX art.
// Flame tongues, electric bolts and underlying gameplay remain unchanged.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('game.js?v=90-continuous-soft-trails'),'fresh game script URL');
assert(sw.includes('zombie-zero-shell-v90-continuous-soft-trails'),'PWA cache refresh');
assert(src.includes("has('power')?12:8"),'power ball stays 1.5 times normal');
assert(src.includes('drawBurningBallFlames(b,r,false)')&&src.includes('drawPierceBallLightning(b,r,true)'),
 'attached flame and bolt visual layers remain in place');
const fireStart=src.indexOf('function drawBurningBallFlames(');
const fireEnd=src.indexOf('function drawBurningTrailFlames(',fireStart);
assert(fireStart>=0&&fireEnd>fireStart,'flame source still exists');
assert(!src.slice(fireStart,fireEnd).includes('ballProjectionDrop'),
 'the flame-covered ball is NOT displaced with its ground shadow');
const a=src.indexOf('const BALL_PROJECTION_GAP=24'),b=src.indexOf('function rect(',a);
assert(a>=0&&b>a,'complete v87 shadow and light implementations');
const draws={gradients:[],fills:[],translations:[],stacks:[]};
const state={x:0,y:0,scaleY:1};
const g=new Proxy({}, {get(target,k){
 if(k==='save')return()=>draws.stacks.push({...state});
 if(k==='restore')return()=>Object.assign(state,draws.stacks.pop());
 if(k==='translate')return(x,y)=>{state.x+=x;state.y+=y*state.scaleY;draws.translations.push([state.x,state.y])};
 if(k==='scale')return(x,y)=>{state.scaleY*=y};
 if(k==='createRadialGradient')return(...args)=>{
  const gradient={x:state.x+args[0],y:state.y+args[1]*state.scaleY,sy:state.scaleY,args,stops:[],
   addColorStop(t,color){this.stops.push([t,color])}};
  draws.gradients.push(gradient);return gradient;
 };
 if(k==='fill')return()=>draws.fills.push(target.globalCompositeOperation);
 return()=>{};
},set(target,k,v){target[k]=v;return true}});
const stateContext={g,Math,Number,Map,WeakMap,clock:1.5,fxEnabled:true,VIEW_DELTA:0,
 balls:[],foes:[],enemyDeaths:[],hitFlashes:[],barrelBlasts:[],bazookaBlasts:[],
 itemPickupFX:[],fx:[],buildBallTrailPath:()=>[],SKILLS:{fire:{color:'#ff813e'}},
 active:new Set(),has:k=>stateContext.active.has(k),knockVisualPosition:z=>z};
vm.createContext(stateContext);
vm.runInContext(src.slice(a,b),stateContext);
assert(vm.runInContext('ballProjectionDrop(8)',stateContext)===34,
 'normal ball shadow center is offset 34px below ball');
assert(vm.runInContext('ballProjectionDrop(12)',stateContext)===39,
 'larger power ball stays vertically separated');
const ball={x:220,y:280,held:false};
vm.runInContext('drawBallSoftShadow('+JSON.stringify(ball)+',8)',stateContext);
assert(draws.gradients.length===1,'free ball casts an independent soft shadow');
assert(draws.gradients[0].y===314,'shadow is centered on projected floor position');
assert(draws.gradients[0].sy===.53,'ball shadow stays softly elliptical');
assert(draws.gradients[0].stops.some(([t,c])=>t===0&&c.includes('.50')),
 'dark center remains readable');
const afterFlying=draws.gradients.length;
vm.runInContext('drawBallSoftShadow({x:220,y:280,held:true},8)',stateContext);
assert(draws.gradients.length===afterFlying,
 'held ball does not project a ghost shadow onto the car body');
stateContext.balls=[ball];
stateContext.active=new Set(['pierce']);
stateContext.hitFlashes=[{x:160,y:166,t:.01,life:.20,piercing:true,critical:false}];
stateContext.barrelBlasts=[{x:170,y:220,t:.04,life:.34}];
stateContext.bazookaBlasts=[{x:190,y:225,t:.02,life:.39}];
stateContext.fx=[{x:130,y:140,size:50,t:.01,visualLife:.25,color:'#ff9539'}];
stateContext.itemPickupFX=[{x:142,y:210,t:.01,life:.62,k:'fire'}];
vm.runInContext('drawEffectLightSpills()',stateContext);
const lights=draws.gradients.slice(afterFlying);
assert(lights.length>=12,'distinct strong, soft ground reflections for all major effects');
assert(lights.some(g=>g.y===314&&g.stops[0][1].includes('81,204,255')),
 'piercing electric ball casts cyan reflected light 34px lower');
assert(lights.some(g=>g.y===195&&g.stops[0][1].includes('87,213,255')),
 'hit lightning light is projected 29px below the impact');
assert(lights.every(g=>g.sy>=.82&&g.sy<=.98),'projected light pools have visibly thick ellipse geometry');
assert(draws.fills.includes('lighter'),'reflected glow uses additive blending');
const beforeBurn=draws.gradients.length;
stateContext.active=new Set();
stateContext.balls=[];
stateContext.hitFlashes=[];
stateContext.barrelBlasts=[];
stateContext.bazookaBlasts=[];
stateContext.fx=[];
stateContext.itemPickupFX=[];
stateContext.foes=[{x:90,y:120,w:33,h:44,burn:1}];
vm.runInContext('drawEffectLightSpills()',stateContext);
assert(draws.gradients.length===beforeBurn+1,'burning zombie glow stays attached instead of projected');
assert(draws.gradients.at(-1).y===144,'flame light still follows zombie itself');
console.log('PASS: clearly separated ball shadows and colored floor reflections; attached fire preserved.');
