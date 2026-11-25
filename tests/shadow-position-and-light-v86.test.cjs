'use strict';
// v86: enforce a measurable shift up/taller contact shadows, visible oval
// ball projection, and post-sprite strong colored FX light.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('game.js?v=93-multiball-light-cache'),'JS cache invalidated');
assert(sw.includes('zombie-zero-shell-v93-multiball-light-cache'),'PWA cache invalidated');
function section(a,b){
 const i=code.indexOf(a),j=code.indexOf(b,i+a.length);
 assert(i>=0&&j>i,'missing source section '+a);
 return code.slice(i,j);
}
const shadowSrc=section('function drawHardGroundShadow(','// v94: no dark ball shadow');
const lightSrc=section('function drawSoftLightSpill(','function rect(');
const render=section('function draw(){','function frame(');
assert(shadowSrc.includes('z.y+z.h-3'),'zombie shadow moved up 5px from original contact');
assert(shadowSrc.includes('z.boss?15:9.5'),'zombie shadow is taller');
assert(shadowSrc.includes('foot-4.5,84,11.5'),'car shadow moved up and grows vertically');
assert(shadowSrc.includes('g.moveTo(cx-w*.77,y-d*.53)'),'contact extends up instead of only down');
assert(render.includes('drawWorldGroundShadows();drawTrashContact(\'world\');drawCrowd()'),'zombie shadows on background');
assert(!render.includes('drawBallSoftShadow('),'no dark ball shadow draw call');
assert(!code.includes('function drawBallSoftShadow('),'dark ball-shadow renderer removed');
const glowPosition=render.indexOf('drawEffectLightSpills()');
assert(glowPosition>render.indexOf('drawPierceBallLightning(b,r,true)'),
 'light emitted after ball bitmap and electric effects, not underneath them');
assert(glowPosition>render.indexOf('fxRenderer.composite(g)'),
 'color spill overlays the bloom/composited FX image');
assert(glowPosition<render.indexOf('drawActiveItemIcons()'),'HUD remains unaffected');
assert(!render.includes('drawEnemyDeaths();drawEffectLightSpills()'),
 'the old occluded early pass is gone');
assert(code.includes('drawTrailGroundReflections(b,radius,getBallRenderTrailPath(b,radius))'),'colored trail reflections remain');
assert(lightSrc.includes('for(let i=0;i<fx.length;i++)'),'every live hit/catch effect projects light without array copying');
assert(lightSrc.includes('itemPickupFX'),'pickup effects project light');
assert(lightSrc.includes('actor.burn>0'),'burning enemies project warm light');
const draws={paths:[],fills:[],gradients:[],translates:[],scales:[]};
const g=new Proxy({}, {get(o,k){
 if(k in o)return o[k];
 if(k==='beginPath')return()=>draws.paths.push([]);
 if(k==='moveTo')return(x,y)=>draws.paths.at(-1).push([x,y]);
 if(k==='lineTo')return(x,y)=>draws.paths.at(-1).push([x,y]);
 if(k==='fill')return()=>draws.fills.push({style:o.fillStyle,composite:o.globalCompositeOperation});
 if(k==='translate')return(x,y)=>draws.translates.push([x,y]);
 if(k==='scale')return(x,y)=>draws.scales.push([x,y]);
 if(k==='createRadialGradient')return(...args)=>{
  const gradient={args,stops:[],addColorStop(t,c){this.stops.push([t,c])}};
  draws.gradients.push(gradient);return gradient;
 };
 return()=>{};
},set(o,k,v){o[k]=v;return true}});
const ctx={g,Math,Map,WeakMap,Number,fxEnabled:true,selectedHero:0,VIEW_DELTA:0,
 car:220,window:{},document:{},
 clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),
 knockVisualPosition:z=>z,foes:[],enemyDeaths:[],
 hitFlashes:[],barrelBlasts:[],bazookaBlasts:[],balls:[],fx:[],itemPickupFX:[],
 buildBallTrailPath:()=>[],
 SKILLS:{fire:{color:'#ff813e'},pierce:{color:'#79d8f6'}},
 has:k=>ctx.active.has(k),active:new Set()};
vm.createContext(ctx);
vm.runInContext(shadowSrc+lightSrc,ctx);
vm.runInContext('drawHardGroundShadow(100,200,33,9.5,true,.31)',ctx);
assert(draws.paths.length===2,'physical polygon shadow has cast and contact layers');
assert(draws.paths.every(path=>path.length>=5),'all physical layers are angular');
assert(draws.paths[1].some(([x,y])=>y<196),
 'contact shadow penetrates under the feet, now shifted upwards');
assert(draws.paths[1].some(([x,y])=>y>209),
 'contact shadow still appears beyond foot even after upward shift');
// v94: no dark gradients are generated just by rendering a free ball.
draws.translates.length=0;draws.scales.length=0;draws.gradients.length=0;
const ball={x:195,y:260,held:false};
const before=draws.gradients.length;
ctx.active.add('pierce');
ctx.balls=[ball];
ctx.hitFlashes=[{x:180,y:200,t:.015,life:.12,piercing:true,critical:false}];
ctx.fx=[{x:170,y:175,color:'#ff9236',t:.01,visualLife:.21,size:48}];
ctx.itemPickupFX=[{x:225,y:300,k:'fire',t:.02,life:.62}];
vm.runInContext('drawEffectLightSpills()',ctx);
assert(draws.gradients.length>=before+5,'simultaneous ball, hit, particle and pickup light spill');
const stops=draws.gradients.slice(before).flatMap(x=>x.stops);
assert(stops.some(([t,c])=>t===0&&c.startsWith('rgba(47,105,255,')&&Number(c.split(',')[3].replace(')',''))>=.13&&Number(c.split(',')[3].replace(')',''))<=.15),
 'cyan ball pool stays softly visible without overpowering the trail');
assert(draws.fills.some(x=>x.composite==='lighter'),'FX spill uses additive blending');
ctx.fxEnabled=false;
const off=draws.gradients.length;
vm.runInContext('drawEffectLightSpills()',ctx);
assert(draws.gradients.length===off,'FX enable control remains respected');
console.log('PASS: zombie/car shadows remain; dark ball shadows removed; colored FX lights preserved.');
