'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
function piece(begin,end){
 const a=game.indexOf(begin),b=game.indexOf(end,a);
 assert(a>=0&&b>a,'actual source range: '+begin);
 return game.slice(a,b);
}
// Evaluate the actual production functions, including the real knockback
// interpolation, shake and visual render functions, not recreated test code.
const pieces=[
 piece('function knockMotionProgress(z){','function zombieBoxesOverlap('),
 piece('function hitShakeOffset(','function drawStruckZombie('),
 piece('function zombieHandVisualPosition(z){','function launchTrashShot('),
 piece('function launchSpit(z,citizen){','function updateBossTrashShots('),
 piece('function paintSpit(','function updateCrowd(')
];
const draws=[],stack=[];
const g={
 globalAlpha:1,x:0,y:0,s:1,
 save(){stack.push([this.globalAlpha,this.x,this.y,this.s])},
 restore(){[this.globalAlpha,this.x,this.y,this.s]=stack.pop()},
 translate(x,y){this.x+=x;this.y+=y},
 rotate(){},
 scale(x){this.s*=x},
 drawImage(sprite){draws.push({x:this.x,y:this.y,s:this.s,a:this.globalAlpha,radius:sprite.radius})}
};
const z={boss:false,eliteKind:0,x:105,y:173,w:33,h:44,
 spitWindup:.44,spitWindupTotal:.44,knockTime:0,
 hitShakeFrom:0,hitShakeUntil:0};
const shoots=[];
const ctx={Math,g,z,foes:[z],bossTrashShots:shoots,spitBloomDraws:[],
 KNOCK_TRAIL_LIFE:.32,KNOCK_TWEEN_LIFE:.22,clock:50,
 fxEnabled:true,fxRenderer:{},clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),
 trashThrower:()=>false,spitThrower:()=>true,spitSprite:radius=>({radius}),
 drawThrowable(){throw Error('spit test must not draw trash')},
 bossTrashProjectilePosition:p=>({x:p.sx+(p.tx-p.sx)*p.t/p.duration,
  y:p.sy+(p.ty-p.sy)*p.t/p.duration,t:p.t/p.duration}),
 captureBloom:fn=>fn(),sfx(){},
};
vm.createContext(ctx);
vm.runInContext(pieces.join('\n'),ctx);
const read=expr=>vm.runInContext(expr,ctx);
const near=(a,b)=>Math.abs(a-b)<.0001;
function at(progress){
 z.spitWindup=z.spitWindupTotal*(1-progress);
 draws.length=0;
 read('drawBossTrashShots()');
 return draws.slice();
}
const mouth=read('spitMouthAnchor(z)');
assert.equal(at(0).length,0,'no premature opaque poison spawn or glow');
const rise=at(.18);
assert.equal(rise.length,2,'held venom has matching base and bloom render passes');
assert(rise[0].y<mouth.y-3,'venom rises out of mouth');
assert(rise[0].a>.7&&rise[0].a<1,'venom gradually fades in');
assert(near(rise[0].a,rise[1].a),'bloom does not flash ahead of the fade');
assert(near(rise[0].s,rise[1].s),'bloom scale matches body during pickup');
const peak=at(.52);
assert(peak[0].y<rise[0].y-9,'rising venom visibly overshoots mouth');
assert(peak[0].s>1,'overshoot scales venom slightly above full size');
const catchFrame=at(.73);
assert(catchFrame[0].y>mouth.y+3.5,'venom taps down into mouth/hand catch position');
const settle=at(.98);
assert(Math.abs(settle[0].y-mouth.y)<1,'venom settles back onto its launch point');
assert.equal(settle[0].a,1,'fully visible only after fade-in');
assert.equal(g.globalAlpha,1,'compositing preserves world transparency');
z.knockFromX=105;z.knockFromY=173;z.x=165;z.y=193;
z.knockDuration=.32;z.knockTime=.32;z.knockDelay=0;z.knockFreeze=0;
const freeze=at(.55);
assert(near(freeze[0].x,105+z.w*.5),'held poison sticks to old visible enemy during knock freeze');
assert(!near(freeze[0].x,z.x+z.w*.5),'held poison must not jump to its future collider');
z.knockTime=.19;
const move=at(.55),visible=read('knockVisualPosition(z)');
const pose=read('raisedSpitPose(.55)');
assert(near(move[0].x,visible.x+z.w*.5),'held poison follows interpolated knockback X');
assert(near(move[0].y,visible.y+z.h*.39+pose.y),'held poison follows interpolated knockback Y');
z.hitShakeFrom=49.96;z.hitShakeUntil=50.09;
const shaken=at(.55),jitter=read('hitShakeOffset(.04,.13,false)');
assert(near(shaken[0].x,visible.x+z.w*.5+jitter.x),
 'held venom shares 60fps hit-shake x offset');
assert(near(shaken[0].y,visible.y+z.h*.39+jitter.y+pose.y),
 'held venom shares 60fps hit-shake y offset');
z.spitWindup=0;
const firingPoint=read('spitMouthAnchor(z)');
const citizen={x:330,y:641,alive:true};
ctx.citizen=citizen;
read('launchSpit(z,citizen)');
assert.equal(shoots.length,1);
assert.equal(shoots[0].type,'spit','actual attack stays poison, not trash');
assert(near(shoots[0].sx,firingPoint.x)&&near(shoots[0].sy,firingPoint.y),
 'spit launches from exact visual mouth, no pop after knockback');
assert(shoots[0].duration>=1.0&&shoots[0].duration<1.2,
 'flight timing preserved for poison and citizen interception');
draws.length=0;read('drawBossTrashShots()');
assert.equal(draws.length,2,'airborne poison still renders base and bloom');
assert(draws.every(v=>v.a===1&&v.s===1),'airborne poison keeps original full look');
assert(game.includes('z.spitWindupTotal=z.spitWindup'),'reveal keys use the gameplay slowed windup');
assert(game.includes('const SPIT_RAISE_KEYS=['),'dedicated venom rise/catch timing');
assert(html.includes('v251-spit-rise-catch-tether'),'browser loads new venom animation');
assert(sw.includes('v251-spit-rise-catch-tether'),'offline game asset cache rotates');
console.log('PASS v251: neon spit fades up/rises/catches, bloom stays in phase, held toxin follows actual knockback/hit shake, projectile launches at visible anchor.');
