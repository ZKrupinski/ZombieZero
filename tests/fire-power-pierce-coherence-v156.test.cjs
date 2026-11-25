'use strict';
// V156 runtime verification: fire should never disappear when power, pierce,
// or multi-ball enables compact rendering. Test visual draw operations, not FPS.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('v156-fire-trail-coherence'));
assert(sw.includes('v156-fire-trail-coherence'));
function section(a,b){
 const i=game.indexOf(a),j=game.indexOf(b,i+a.length);
 assert(i>=0&&j>i,'missing '+a);
 return game.slice(i,j);
}
const paths={
 sample:section('function sampleBallTrail(','function drawHeroBallTrail('),
 status:section('function compactBallFX(){','// Physical tennis, baseball'),
 trail:section('function drawElementalTrailBody(','// V83: fire is a living'),
 flame:section('function drawBurningBallFlames(','// V84: clearly readable cyan-white lightning'),
 bolts:section('function drawPierceBallLightning(','// V76: per-ball rotational inertia'),
 ground:section('function drawTrailGroundReflections(','// V89:')
};
const events=[],colors=[],flames=[],ground=[];
let paint=[];
const g=new Proxy({globalAlpha:1,fillStyle:'#fff',strokeStyle:'#fff',
 shadowBlur:0,globalCompositeOperation:'source-over',
 createLinearGradient(){events.push(['gradient']);return {addColorStop(){}}},
 createRadialGradient(){events.push(['radial']);return {addColorStop(){}}},
 save(){},restore(){},beginPath(){paint=[]},moveTo(x,y){paint.push([x,y])},
 lineTo(x,y){paint.push([x,y])},
 stroke(){events.push(['stroke',this.strokeStyle,this.lineWidth,this.globalAlpha,[...paint]])},
 fill(){events.push(['fill',this.fillStyle,this.globalAlpha])},
 arc(x,y,r){events.push(['arc',x,y,r])},
},{get(o,k){if(k in o)return o[k];return()=>{}},set(o,k,v){o[k]=v;return true}});
const env={g,fxEnabled:true,Math,clock:2.5,balls:[],multiSkillFastRender:false,
 has:k=>env.skills.includes(k),skills:[],selectedHero:0,
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
 flameTongue:(...args)=>flames.push(args),
 drawElectricArc:(...args)=>events.push(['arc-bolt',args[1]]),
 TRAIL_GROUND_PIERCE:[[89,213,255]],TRAIL_GROUND_FIRE:[[255,139,51]],
 TRAIL_GROUND_FIRE_PIERCE:[[164,125,255],[250,76,201]],TRAIL_GROUND_POWER:[[255,214,110]],TRAIL_GROUND_HERO_COLORS:[[192,234,112]],
 drawProjectedLightSpill:(...args)=>ground.push(args)};
vm.createContext(env);
for(const src of Object.values(paths))vm.runInContext(src,env);
const ball={x:210,y:180,vx:300,vy:-240,held:false};
function testAura(skills,count){
 env.skills=skills;env.balls=Array.from({length:count},()=>ball);
 events.length=colors.length=0;
 vm.runInContext('drawBallStateAura(b,r);drawBallStatusForeground(b,r)',Object.assign(env,{b:ball,r:skills.includes('power')?12:8}));
 const fills=events.filter(e=>e[0]==='fill'),paintColors=fills.map(e=>e[1]);
 if(skills.includes('fire'))assert(paintColors.includes('#ff9236'),'fire light remains on ball for '+skills);
 if(skills.includes('pierce'))assert(paintColors.includes('#70dafc'),'piercing cyan remains on ball for '+skills);
 if(skills.includes('power'))assert(paintColors.includes('#f6d46d'),'gold power light remains on ball for '+skills);
 assert(fills.length>=5,'full aura is never blank for '+skills);
 assert(events.some(e=>e[0]==='radial'),'original radial aura retained');
 assert(g.shadowBlur===0,'aura does not add extra blur');
}
for(const skills of [['fire','power'],['fire','pierce'],['fire','pierce','power'],['pierce'],['pierce','power']])
 for(const n of [1,3,6])testAura(skills,n);
const pathOf=len=>[{x:200,y:120,s:0},{x:200-len,y:120,s:len}];
env.skills=['fire','power'];env.balls=[ball];env.b=ball;env.r=12;env.path=pathOf(8);
flames.length=0;
vm.runInContext('drawBurningTrailFlames(b,r,path)',env);
assert(flames.length>=1,'compact fire begins immediately even for 8px of trail');
assert(flames.every(a=>a.every(v=>typeof v!=='number'||Number.isFinite(v))),
 'short flames have finite geometry');
for(const n of [1,3,6]){
 env.balls=Array.from({length:n},()=>ball);
 env.path=pathOf(190);
 flames.length=0;
 vm.runInContext('drawBurningTrailFlames(b,r,path)',env);
 assert(flames.length>=7,'flames remain recognizable even with many balls');
 assert.equal(flames.length,38,'same complete 2-sided flame samples at every count');
}
env.skills=['fire','power','pierce'];env.balls=[ball];env.path=pathOf(170);
flames.length=0;events.length=0;
vm.runInContext('drawBurningBallFlames(b,r,true);drawPierceBallLightning(b,r,true)',env);
assert(flames.length>=2,'front fire tongues remain for fire + power + pierce');
assert(events.some(e=>e[0]==='arc-bolt'),'one visible foreground cyan bolt survives stacked LOD');
const testBody=(p,expectGradient)=>{
 events.length=0;env.path=p;
 vm.runInContext('drawElementalTrailBody(b,r,path,true,true)',env);
 const body=events.filter(e=>e[0]==='stroke');
 assert.equal(body.length,1,'elemental core draws exactly once per ball');
 assert.equal(events.some(e=>e[0]==='gradient'),expectGradient,
  'folded trail does not use degenerate spatial gradients');
 assert(body[0][3]>.2,'body visible on rebound');
};
testBody(pathOf(170),true);
testBody([{x:210,y:180,s:0},{x:150,y:180,s:60},
 {x:210,y:180,s:120}],false);
env.path=pathOf(170);events.length=0;
vm.runInContext('drawPierceTrailLightning(b,r,path)',env);
const bolt=events.filter(e=>e[0]==='stroke');
assert.equal(bolt.length,1);
assert(bolt[0][2]>=3,'pierce line has enough weight above orange');
assert.equal(bolt[0][1],'#d9fdff','mixed trail uses bright cyan-white lightning');
env.balls=[ball,ball,ball,ball,ball,ball];env.skills=['fire','pierce','power'];
ground.length=0;
vm.runInContext('drawTrailGroundReflections({held:false},r,path)',env);
assert.equal(ground.length,17,'combined floor reflection has full density');
assert(ground.some(e=>e[3]===env.TRAIL_GROUND_FIRE_PIERCE[0]),'mixed tail reflects violet');
assert(ground.some(e=>e[3]===env.TRAIL_GROUND_FIRE_PIERCE[1]),'mixed head reflects pink');
assert(ground.every(e=>e[8]===undefined),'original full inner light pool retained');
console.log('PASS V156: short/curved fire wake stays visible, mixed colors and full-quality effects preserved');
