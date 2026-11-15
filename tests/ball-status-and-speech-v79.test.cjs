'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('game.js?v=82-ball-fx-ripple'),'current gameplay assets must reload');
assert(sw.includes('zombie-zero-shell-v82-ball-fx-ripple'),'PWA cache refreshes skill art');
assert(code.includes("carAtBirth:car,event:text?"),'support dialogue anchors at creation');
assert(code.includes("carAtBirth:car,t:0,life:1.6"),'everyday cheering anchors at creation');
assert(code.includes("drawBallStatusForeground(b,r);"),'status highlights actually render after bitmap');
const take=(start,end)=>{
 const i=code.indexOf(start),j=code.indexOf(end,i+start.length);
 assert(i>=0&&j>i,'missing code section '+start);
 return code.slice(i,j);
};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const speech=take('function citizenBubbleLayout(q,carX=car){','function drawBubbles(){');
const ctx={car:180,W:450,H:710,PY:584,Number,Math,clamp};
vm.createContext(ctx);
vm.runInContext(speech,ctx);
const fixed={x:190,y:582,w:112,event:'return',carAtBirth:225,citizen:{x:210,y:682}};
const before=vm.runInContext('citizenBubbleLayout('+JSON.stringify(fixed)+',40)',ctx);
const after=vm.runInContext('citizenBubbleLayout('+JSON.stringify(fixed)+',410)',ctx);
assert.deepEqual(JSON.parse(JSON.stringify(before)),JSON.parse(JSON.stringify(after)),
 'player x movement never shifts an active dialogue balloon');
const tip=vm.runInContext('citizenBubblePointer('+JSON.stringify(fixed)+',citizenBubbleLayout('+JSON.stringify(fixed)+',410))',ctx);
assert(tip.tipY-before.y-before.h===16,'speech pointer has a fixed, readable 16px length');
assert(Math.abs(tip.tipX-tip.baseX)<=8,'speech pointer cannot stretch sideways');
assert(before.x>=22&&before.x+before.w<=428,'bubble is inside game walls');
assert(code.includes('g.lineTo(tail.tipX,tail.tipY)'),'renderer uses local constant-length pointer');
assert(!take('function drawBubbles(){','function updateCrowd(dt)').includes('g.lineTo(q.citizen.x,q.citizen.y-19)'),
 'old long rubber-band pointer is removed');
const aura=take('function drawBallStateAura(b,r){','// Physical tennis, baseball and toy-ball sprite colors');
const trail=take('function drawBallSkillTrail(b,r,path=buildBallTrailPath(b,r))','// V76: per-ball rotational inertia');
let active=new Set(),count={rect:0,stroke:0,filled:0,arc:0,positions:[],colors:[]};
const context=new Proxy({},{get(t,p){if(p==='g')return drawing;return t[p]}});
const drawState={globalAlpha:1,fillStyle:'#ffffff',strokeStyle:'#ffffff',shadowBlur:0,globalCompositeOperation:'source-over'};
const drawing=new Proxy(drawState,{get(t,p){if(p in t)return t[p];if(p==='fillRect')return (x,y,w,h)=>{count.rect++;count.positions.push({x,y,w,h});count.colors.push(t.fillStyle)};
 if(p==='stroke')return()=>{count.stroke++};
 if(p==='fill')return()=>{count.filled++;count.colors.push(t.fillStyle)};
 if(p==='arc')return()=>{count.arc++};
 return()=>{};},set(t,p,v){t[p]=v;return true}});
Object.assign(context,{Math,Number,clock:1.72,selectedHero:0,fxEnabled:true,has:k=>active.has(k),clamp});
vm.createContext(context);
vm.runInContext(aura,context);
vm.runInContext(trail,context);
const ball={x:205,y:352,vx:180,vy:-390,held:false};
for(const [skills,minDraws,tag] of [[['pierce'],15,'blue'],[['fire'],14,'fire'],[['power'],8,'power'],[['fire','pierce','power'],32,'combined']]){
 active=new Set(skills);count={rect:0,stroke:0,filled:0,arc:0,positions:[],colors:[]};
 vm.runInContext('drawBallStateAura('+JSON.stringify(ball)+',8);drawBallStatusForeground('+JSON.stringify(ball)+',8)',context);
 assert(count.rect+count.filled+count.stroke>=minDraws,tag+' gives a visible full-ball effect');
 if(tag==='blue')assert(count.colors.some(x=>String(x).includes('#e8ffff')||String(x).includes('#70dafc')),'pierce has readable white/cyan highlights');
 if(tag==='fire')assert(count.colors.some(x=>String(x).includes('#ff5f2b')||String(x).includes('#ff9236')),'fire has unmistakable orange flames');
 if(tag==='power')assert(count.stroke>3,'power has orbital gold bands');
 assert(drawState.shadowBlur===0,'FX remain soft-edged but contain no oversized particle bloom');
}
assert(code.includes('const lateral=r*.72'),'skill trail chips are visible on either side of the beam');
console.log('PASS: stable speech anchored at creation, 16px bounded pointer; bold piercing/fire/power ball auras and larger trail pixels');
