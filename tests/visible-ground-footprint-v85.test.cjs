'use strict';
// v85: verify physical contact polygons remain visible below actor bitmaps,
// and vehicle feet use its real opaque atlas baseline, not a detached Y=636.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8'),html=fs.readFileSync('dist/index.html','utf8'),
 sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('game.js?v=93-multiball-light-cache-v94-no-dark-shadow'),'updated game script cache');
assert(sw.includes('zombie-zero-shell-v93-multiball-light-cache'),'updated offline cache');
const start=game.indexOf('function drawHardGroundShadow('),
 end=game.indexOf('// v94: no dark ball shadow',start);
assert(start>=0&&end>start,'ground shadow functions present');
const src=game.slice(start,end);
assert(!src.includes('g.ellipse('),'non-ball shadows are faceted');
assert(!src.includes('g.filter='),'no shadow blur filtering');
assert(src.includes('g.shadowBlur=0'),'physical shadows always hard-edge');
assert(src.includes('z.y+z.h-3'),'zombie shadow intentionally hugs feet 5px higher');
assert(game.includes('drawHardGroundShadow(p.x,p.y+21,25,6,true,.28)'),
 'citizens have visible contact and directional silhouettes');
assert(game.includes('drawHardGroundShadow(item.x+2,item.y+FALLING_ITEM_SIZE*.48,30,6,true,.27)'),
 'items have visible projected polygon shadows');
assert(game.includes('drawCarGroundShadow();player()'),
 'car shadow drawn below body with shared anchor');
assert(!game.includes('drawHardGroundShadow(car,636+VIEW_DELTA'),
 'detached hardcoded car shadow position removed');
const coords=[],drawn=[],g={
 save(){},restore(){},beginPath(){coords.push([])},moveTo(x,y){coords.at(-1).push([x,y])},
 lineTo(x,y){coords.at(-1).push([x,y])},closePath(){},
 fill(){drawn.push({points:coords.at(-1),color:this.fillStyle,blur:this.shadowBlur})}
};
let drawImageCount=0,readCount=0,lastRow=46;
const atlas={naturalWidth:1536,naturalHeight:576};
const doc={createElement(){
 return {width:0,height:0,getContext(){return {
  drawImage(){drawImageCount++},clearRect(){},getImageData(){
   readCount++;const pixels=new Uint8ClampedArray(64*64*4);
   pixels[(lastRow*64+33)*4+3]=255;
   return {data:pixels};
  }
 }}}}
};
const ctx={g,window:{ZZHeroAnimationsV55:{ready:true,idle:atlas}},
 document:doc,Math,Map,WeakMap,Number,selectedHero:0,VIEW_DELTA:0,
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
 knockVisualPosition:z=>z,foes:[],enemyDeaths:[],car:200};
vm.createContext(ctx);
vm.runInContext(src,ctx);
vm.runInContext('drawHardGroundShadow(120,200,33,6.5,true,.31)',ctx);
assert(drawn.length===2,'directional shadow and grounding polygon both visible');
assert(drawn.every(p=>p.blur===0),'sharp edges and no blur in both passes');
assert(drawn.some(p=>p.points.some(v=>v[1]>207)),
 'shadow projects at least 7px below bottom pivot, not under the sprite');
assert(drawn.some(p=>p.points.some(v=>v[0]>142)),
 'directional cast remains exposed right of the cube');
assert(drawn.some(p=>p.color.includes('.31')),'contact has readable opacity');
coords.length=0;drawn.length=0;
ctx.foes=[{x:100,y:180,w:33,h:44,boss:false}];
vm.runInContext('drawWorldGroundShadows()',ctx);
assert(drawn.length>=2&&drawn.some(p=>p.points.some(v=>v[1]>231)),
 'zombie shadow protrudes below rendered zombie base at 226');
let foot=vm.runInContext('heroCarShadowFoot()',ctx);
const expected=579-54+(lastRow+1)*108/64;
assert(Math.abs(foot-expected)<.1,'hero contact derives from real alpha last row');
assert(drawImageCount===1&&readCount===1,'only one atlas scan for repeated frames');
foot=vm.runInContext('heroCarShadowFoot()',ctx);
assert(drawImageCount===1&&foot===expected,'hero wheel contact is cached');
coords.length=0;drawn.length=0;
vm.runInContext('drawCarGroundShadow()',ctx);
assert(drawn.length===2&&drawn.some(p=>p.points.some(v=>v[1]>foot+5)),
 'car shadow overlaps actual wheel and projects visibly beyond it');
lastRow=51;ctx.selectedHero=1;
const other=vm.runInContext('heroCarShadowFoot()',ctx);
assert(other>foot&&drawImageCount===2,'each hero receives independent measured wheel baseline');
ctx.document={};
ctx.window={};
assert(vm.runInContext('heroCarShadowFoot()',ctx)===627,
 'when assets unavailable fallback remains attached, not down at 636');
console.log('PASS: visible polygon projections for zombies/citizens/items; cached true wheel-contact shadows for car.');
