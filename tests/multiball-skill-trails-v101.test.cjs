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
assert(!draw.includes('multiSkillFastRender='),'no adaptive loss of artwork');
assert(draw.includes('if(!elementalTrail){\n   drawHeroBallTrail(b,r,trailPath);'),
 'elemental body replaces duplicate base consistently');
assert(draw.includes('drawBallSkillTrail(b,r,trailPath)'));
assert(draw.includes('drawBurningTrailFlames(b,r,trailPath)'));
assert(draw.includes('drawPierceTrailLightning(b,r,trailPath)'));
assert(draw.includes('drawHeroBallSprite(b,r,palette.main)'),'ball sprite still painted');
assert(draw.includes('drawBallStatusForeground(b,r)'),'surface state still readable');
assert(draw.includes('drawTrailEdgeHalo(b,r,trailPath,.72)'),'unchanged 1/2-ball halo');
assert(src.includes('if(i%3===0)'),'skill sparks keep full density');
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
vm.runInContext(src.slice(src.indexOf('const SKILL_TRAIL_RAMPS='),src.indexOf('const BURN_GROUND_COLOR=')),env);

vm.runInContext(section('function drawElementalTrailBody(','// V83: fire is a living secondary layer'),env);
vm.runInContext(section('function drawBurningTrailFlames(','// V84: clearly readable cyan-white lightning'),env);
vm.runInContext(section('function drawPierceTrailLightning(','// V76: per-ball rotational inertia'),env);
function measure(fn,fast){
 for(const k of Object.keys(gStats))gStats[k]=0;
 tongues=0;arcs=0;env.multiSkillFastRender=fast;vm.runInContext(fn+'(b,8,path)',env);
 return {...gStats,tongues,electricArcs:arcs};
}
const normalSkill=measure('drawBallSkillTrail',false);
const fastSkill=measure('drawBallSkillTrail',true);
assert.equal(normalSkill.strokes,1,'bounded body draw count');
assert.deepEqual(normalSkill,fastSkill,'body stays identical when ball count crosses LOD threshold');
const normalFire=measure('drawBurningTrailFlames',false);
const fastFire=measure('drawBurningTrailFlames',true);
assert.deepEqual(normalFire,fastFire,'fire tongue count and draw operations invariant');
assert(normalFire.fills===0&&fastFire.strokes===0,'fire detail never draws a second body');
assert(fastFire.tongues>=3,'recognizable fire sparks remain');
const normalBolt=measure('drawPierceTrailLightning',false);
const fastBolt=measure('drawPierceTrailLightning',true);
assert.equal(normalBolt.electricArcs,0,'single ball has no fork arcs');
assert.equal(normalBolt.strokes,1,'single stroke at all detail levels');
assert.deepEqual(fastBolt,normalBolt,'same inexpensive zigzag for single and multiple balls');
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
assert.equal(fastPools,basePools,'full wake density independent of count');
assert(floorDraws.every(a=>a[8]===undefined),'full outer and core retained');
const summary={skillStrokes:[normalSkill.strokes,fastSkill.strokes],
 fireTongues:[normalFire.tongues,fastFire.tongues],fireRibbons:[normalFire.fills,fastFire.strokes],
 lightningForks:[normalBolt.electricArcs,fastBolt.strokes],
 floorSamples:[basePools,fastPools]};
console.log('PASS: full trail, fire/bolt detail and floor glow invariant under multi-ball load. '+JSON.stringify(summary));
