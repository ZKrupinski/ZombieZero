'use strict';
// v101: verify work reduction by deterministic draw-call counts, not fake FPS.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('game.js?v=93-multiball-light-cache-v94-no-dark-shadow-v101-multiskill-lod'));
assert(sw.includes('v101-multiskill-lod'));
const section=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+a.length);
 assert(i>=0&&j>i,'source section '+a);return src.slice(i,j)};
const draw=section('function draw(){','function frame(');
assert(draw.includes("multiSkillFastRender=fxEnabled&&balls.length>=3&&(has('fire')||has('pierce'))"));
assert(draw.includes('if(!skillMultiFast){\n   drawHeroBallTrail(b,r,trailPath);'),
 'skip duplicate hero ribbon only with 3+ skill balls');
assert(draw.includes('drawBallSkillTrail(b,r,trailPath)'));
assert(draw.includes('drawBurningTrailFlames(b,r,trailPath)'));
assert(draw.includes('drawPierceTrailLightning(b,r,trailPath)'));
assert(draw.includes('drawHeroBallSprite(b,r,palette.main)'),'ball sprite still painted');
assert(draw.includes('drawBallStatusForeground(b,r)'),'surface state still readable');
assert(draw.includes('drawTrailEdgeHalo(b,r,trailPath,.72)'),'unchanged 1/2-ball halo');
assert(src.includes("if(!fast&&i%3===0)"),'skill spark loop keeps single/dual detail');
assert(src.includes("if(drawCore)drawSoftLightSpill"),'multi-ball omits duplicate floor core');
const path=Array.from({length:35},(_,i)=>({x:300-i*5,y:140,s:i*5}));
const gStats={strokes:0,fills:0,arcs:0,blurs:0,images:0};
let tongues=0,arcs=0;
const g={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},
 bezierCurveTo(){},quadraticCurveTo(){},closePath(){},
 stroke(){gStats.strokes++},fill(){gStats.fills++},
 arc(){gStats.arcs++},createLinearGradient(){return{addColorStop(){}}},
 createRadialGradient(){return{addColorStop(){}}},
 drawImage(){gStats.images++}};
const env={Math,g,fxEnabled:true,clock:2.2,multiSkillFastRender:false,balls:[{},{},{}],selectedHero:0,
 HERO_BALL_TRAILS:[{main:'#d8efa1',soft:'#95b96e'}],
 has(k){return k==='fire'||k==='pierce';},
 sampleBallTrail(p,d){return{x:300-d,y:140}},
 flameTongue(){tongues++},
 drawElectricArc(){arcs++},
 b:{x:300,y:140,vx:280,vy:160},path,
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
vm.createContext(env);
vm.runInContext(section('function drawBallSkillTrail(','// V83: fire is a living secondary layer'),env);
vm.runInContext(section('function drawBurningTrailFlames(','// V84: clearly readable cyan-white lightning'),env);
vm.runInContext(section('function drawPierceTrailLightning(','// V76: per-ball rotational inertia'),env);
function measure(fn,fast){
 for(const k of Object.keys(gStats))gStats[k]=0;
 tongues=0;arcs=0;env.multiSkillFastRender=fast;vm.runInContext(fn+'(b,8,path)',env);
 return {...gStats,tongues,electricArcs:arcs};
}
const normalSkill=measure('drawBallSkillTrail',false);
const fastSkill=measure('drawBallSkillTrail',true);
assert(normalSkill.strokes>fastSkill.strokes*1.7,
 'fast skill trail produces substantially fewer per-sample strokes');
assert(normalSkill.arcs>0&&fastSkill.arcs===0,'fast core skips scattered chips');
const normalFire=measure('drawBurningTrailFlames',false);
const fastFire=measure('drawBurningTrailFlames',true);
assert(normalFire.tongues>fastFire.tongues*3,
 'fire tongues reduced >=3x');
assert(normalFire.fills>=3&&fastFire.strokes===1,
 '3 fill ribbons replaced with 1 continuous stroke wake');
assert(fastFire.tongues>=3,'recognizable fire sparks remain');
const normalBolt=measure('drawPierceTrailLightning',false);
const fastBolt=measure('drawPierceTrailLightning',true);
assert(normalBolt.electricArcs>=5,'baseline lightning has many independent fork arcs');
assert(fastBolt.electricArcs===0,'fast lightning combines into one stroke path');
assert(fastBolt.strokes<=6&&fastBolt.strokes>=4,'full filament and visible forks retained');
const ground=section('const TRAIL_GROUND_HERO_COLORS=','// V89: the former single-pixel');
const floorDraws=[];
const floor={Math,clock:2.2,selectedHero:0,fxEnabled:true,
 balls:[{},{}],has(k){return k==='fire'},
 sampleBallTrail:(p,d)=>({x:300-d,y:140}),
 drawProjectedLightSpill(...args){floorDraws.push(args)}};
vm.createContext(floor);vm.runInContext(ground,floor);
floor.path=path;floor.b={held:false};
vm.runInContext('drawTrailGroundReflections(b,8,path)',floor);
const basePools=floorDraws.length;
assert(basePools>=14,'one/two-ball baseline preserves dense soft floor reflections');
assert(floorDraws.every(a=>a[8]===undefined),'normal pools include double-core halo');
floorDraws.length=0;floor.balls=[{},{},{}];
vm.runInContext('drawTrailGroundReflections(b,8,path)',floor);
const fastPools=floorDraws.length;
assert(fastPools<=10&&fastPools<basePools,'fewer multi-ball reflection samples');
assert(floorDraws.every(a=>a[8]===false),'single wide floor halo per sample');
const summary={skillStrokes:[normalSkill.strokes,fastSkill.strokes],
 fireTongues:[normalFire.tongues,fastFire.tongues],fireRibbons:[normalFire.fills,fastFire.strokes],
 lightningForks:[normalBolt.electricArcs,fastBolt.strokes],
 floorSamples:[basePools,fastPools]};
console.log('PASS: dynamic 3+ skill LOD saves repeated trails, fire/bolt arcs and floor glow while keeping game art/physics. '+JSON.stringify(summary));
