'use strict';
// v92 visual parity: reduce ONLY the existing trail's captured bloom,
// keeping its unblurred visible edge and all other FX passes unchanged.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const shader=fs.readFileSync('dist/fx-renderer.js','utf8');
assert(html.includes('game.js?v=93-multiball-light-cache'),'new game JS cache version');
assert(sw.includes('zombie-zero-shell-v93-multiball-light-cache'),'new PWA cache');
assert(html.includes('fx-renderer.js?v=91-texture-sub-upload'),
 'v91 optimized renderer reused unchanged');
assert(code.includes('luminous(()=>drawTrailEdgeHalo(b,r,trailPath),\n    ()=>drawTrailEdgeHalo(b,r,trailPath,.72))'),
 'main render calls original trail draw and softer FX-only capture');
assert(code.includes('drawEffectLightSpills()'),'existing floor reflection pass retained');
assert(code.includes('drawSimpleSkillTrailAccent(b,r,trailPath)'),'single interior elemental accent retained');
assert(shader.includes('bloom:1,radius:12'),'global bloom and radius unchanged');
function part(a,b){
 const start=code.indexOf(a),end=code.indexOf(b,start+a.length);
 assert(start>=0&&end>start,'missing function section '+a);return code.slice(start,end);
}
const luminous=part('function luminous(','const TYPES=');
const halo=part('function drawTrailEdgeHalo(','// A softly feathered path');
const strokes=[],contexts=[];
function createG(kind){
 const g={
  save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},
  createLinearGradient(){return{addColorStop(){}}},
  stroke(){strokes.push({kind,alpha:this.globalAlpha,blur:this.shadowBlur,
   width:this.lineWidth,style:this.strokeStyle,shadow:this.shadowColor})}
 };
 contexts.push(g);return g;
}
const base=createG('base'),captured=createG('captured');
const ball={x:170,y:150,held:false};
const path=Array.from({length:8},(_,i)=>({x:170-i*7,y:150+i*8,s:i*10}));
const ctx={Math,g:base,fxEnabled:true,fxRenderer:{capture(original,draw){
 assert.strictEqual(original,base,'capture must sample original graphics context');
 draw(captured);
}},HERO_BALL_TRAILS:[{main:'#b6e882'}],selectedHero:0,has:()=>false,
 ball,path};
vm.createContext(ctx);
vm.runInContext(luminous+halo,ctx);
vm.runInContext('luminous(()=>drawTrailEdgeHalo(ball,8,path),()=>drawTrailEdgeHalo(ball,8,path,.72))',ctx);
assert(strokes.length===2,'trail drawn once normally and once into bloom source');
assert(strokes[0].kind==='base'&&strokes[1].kind==='captured',
 'draw order and separate FX source are preserved');
assert(Math.abs(strokes[0].alpha-.23*.6)<1e-10,'normal trail feather at 60%');
assert(Math.abs(strokes[1].alpha-.23*.6*.72)<1e-10,
 'only bloom capture is attenuated by exactly 28%');
assert(strokes[0].blur===4&&strokes[1].blur===4,
 'trail edge softness unchanged');
assert(strokes[0].width===strokes[1].width,'trail physical width unchanged');
assert(strokes[0].shadow===strokes[1].shadow,'trail hue unchanged');
assert(ctx.g===base,'drawing context always restored after FX capture');
strokes.length=0;ctx.fxEnabled=false;
vm.runInContext('luminous(()=>drawTrailEdgeHalo(ball,8,path),()=>drawTrailEdgeHalo(ball,8,path,.72))',ctx);
assert(strokes.length===0,'trail halo stays disabled with FX-off');
ctx.fxEnabled=true;strokes.length=0;
vm.runInContext('luminous(()=>drawTrailEdgeHalo(ball,8,path))',ctx);
assert(strokes.length===2&&Math.abs(strokes[1].alpha-strokes[0].alpha)<1e-10,
 'existing single-callback luminous callers still capture at normal strength');
console.log('PASS: trail-only bloom reduced 28%; identical normal edge, color, width, and all other luminous callers.');
