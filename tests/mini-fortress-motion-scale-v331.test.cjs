'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const s=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
// Evaluate actual movement-scale and enemy-speed expressions from the game,
// rather than trusting hardcoded expected constants in this test.
const scaleSrc=s.match(/const MINI_HORDE_SCALE=\.5,MINI_HORDE_COLUMNS=18;/)?.[0];
const fortressSrc=s.match(/const isFortress=\(\)=>runMode==='fortress';/)?.[0];
const miniSrc=s.match(/const isMiniHorde=\(\)=>runMode==='mini'\|\|isFortress\(\);/)?.[0];
const moveSrc=s.match(/const enemyDisplacementScale=\(\)=>isMiniHorde\(\)\?MINI_HORDE_SCALE:1;/)?.[0];
const enemySpeedSrc=s.match(/function enemySpeed\(z\)\{[\s\S]*?\n\}/)?.[0];
assert(scaleSrc&&fortressSrc&&miniSrc&&moveSrc&&enemySpeedSrc);
function behavior(mode){
 const create=new Function('runMode','clock','enemySlowRate','marchBase',
  [scaleSrc,fortressSrc,miniSrc,moveSrc,enemySpeedSrc,
   'return {scale:enemyDisplacementScale(),speed:enemySpeed};'].join('\n'));
 return create(mode,1.25,()=>.8,()=>8);
}
const base=behavior('campaign'),endless=behavior('endless'),
 mini=behavior('mini'),fort=behavior('fortress');
assert.equal(base.scale,1);assert.equal(endless.scale,1);
assert.equal(mini.scale,.5);assert.equal(fort.scale,.5);
for(const mob of [
 {seed:2.3,kind:0,boss:false},{seed:1.23,kind:4,boss:false},
 {seed:0,kind:4,boss:true,bossForm:1},{seed:5,kind:4,boss:true,bossForm:3}
]){
 const normal=base.speed(mob);
 assert(Number.isFinite(normal)&&normal>0);
 assert.equal(endless.speed(mob),normal,'endless march speed unchanged');
 assert.equal(mini.speed(mob),normal*.5,'MINI march speed halved');
 assert.equal(fort.speed(mob),normal*.5,'BARRICADE march speed halved');
}
const knockExpr=s.match(/const distance=Math\.min\(50,36\+Math\.min\(n,5\)\*3\)\*enemyDisplacementScale\(\)\*\(impact\.push\|\|1\);/)?.[0];
assert(knockExpr,'knockback impulse must scale exactly once');
const knock=new Function('n','impact','enemyDisplacementScale',knockExpr+'return distance;');
for(const power of [1,2,5,8])for(const p of [1,1.45]){
 const regular=knock(power,{push:p},()=>1);
 assert.equal(knock(power,{push:p},()=>.5),regular*.5);
}
assert(s.includes('const magnitude=(4+shortStepNoise(z,3)*2)*enemyDisplacementScale();'),
 'short random footwork amplitude should scale');
assert(s.includes('(SHORT_STEP_RADIUS+4)*enemyDisplacementScale()'),
 'short stride re-centering radius should scale');
assert(s.includes('(22+Math.random()*42)*enemyDisplacementScale()/duration'),
 'vertical component of diagonal breakout should scale; lateral uses foePitch');
assert(s.includes('for(const span of [BOSS_SWEEP_MAX,160,125,90].map(d=>d*size))'),
 'boss roam sweep span should scale');
assert(s.includes('if(travel<BOSS_SWEEP_MIN*size)continue;'));
assert(s.includes('[-BOSS_DEPTH_SWAY*size,0,BOSS_DEPTH_SWAY*size]'));
assert(s.includes('BOSS_SWEEP_SPEED*enemyDisplacementScale()'));
assert(s.includes('BOSS_DEPTH_SWAY*enemyDisplacementScale()'));
for(const token of [
 '-20*enemyDisplacementScale()', 'dy:31*enemyDisplacementScale()',
 '(16+(z.seed||0)%9)*enemyDisplacementScale()',
 'dy:5*enemyDisplacementScale()','-10*enemyDisplacementScale()'
])assert(s.includes(token),'elite dash/backstep component missing: '+token);
const dodgeExpr=s.match(/const dx=sign\*profile\.distance\*enemyDisplacementScale\(\)\*extent;/)?.[0];
assert(dodgeExpr,'reactive evasion should follow miniature physical scale');
const dodge=new Function('sign','profile','extent','enemyDisplacementScale',dodgeExpr+'return dx;');
for(const distance of [28,39,51,57]){
 assert.equal(dodge(1,{distance},1,()=>.5),distance*.5);
 assert.equal(dodge(-1,{distance},.82,()=>.5),-distance*.82*.5);
 assert.equal(dodge(1,{distance},1,()=>1),distance);
}
assert(s.includes('if(beginEliteMotion(z,dx,-4*enemyDisplacementScale()'),
 'evasion depth also scales');
assert(s.includes('const foeRowPitch=()=>isMiniHorde()?ENEMY_ROW_PITCH*MINI_HORDE_SCALE:ENEMY_ROW_PITCH;'),
 'mini row spacing already half-size, do not double-scale');
assert(s.includes('const foePitch=()=>isFortress()')&&!s.includes('foePitch()*enemyDisplacementScale()'),
 'mini lateral lane widths already sized once');
assert(s.includes('BOSS_SWEEP_MIN=84,BOSS_SWEEP_MAX=190,BOSS_SWEEP_SPEED=118,BOSS_DEPTH_SWAY=18;'),
 'ordinary boss dimensions and movement defaults remain unchanged');
assert(s.includes(" / 진군 속도 '+(marchBase()*enemyDisplacementScale()).toFixed(1)"),
 'on-screen movement pace reflects the scaled speed');
assert(html.includes('game.js?v=')&&html.includes('-v331-mini-fortress-motion-scale'),
 'mobile clients must load the updated motion code');
assert(sw.includes('v331-mini-fortress-motion-scale'),
 'service-worker shell must invalidate old game cache');
console.log('PASS v331: MINI and BARRICADE scale zombie march, lateral/vertical footwork, knockback, dodge, elite and boss travel exactly .5; normal/endless unchanged.');
