'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
function piece(from,to){
 const i=game.indexOf(from),j=game.indexOf(to,i);
 assert(i>=0&&j>i,'production source function exists: '+from);
 return game.slice(i,j);
}
const body=[
 piece('function knockMotionProgress(z){','function zombieBoxesOverlap('),
 piece('function hitShakeOffset(','function drawStruckZombie('),
 piece('function zombieHandVisualPosition(z){','function launchTrashShot('),
 piece('function launchSpit(z,citizen){','function updateBossTrashShots('),
 piece('function paintSpit(','function updateCrowd(')
].join('\n');
const draws=[],stack=[];
const g={
 globalAlpha:1,x:0,y:0,s:1,
 save(){stack.push([this.globalAlpha,this.x,this.y,this.s])},
 restore(){[this.globalAlpha,this.x,this.y,this.s]=stack.pop()},
 translate(x,y){this.x+=x;this.y+=y},
 rotate(){},scale(v){this.s*=v},
 drawImage(){draws.push({x:this.x,y:this.y,alpha:this.globalAlpha,scale:this.s})}
};
const ctx={
 Math,g,clock:60,foes:[],bossTrashShots:[],spitBloomDraws:[],
 fxEnabled:true,fxRenderer:{},
 clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
 KNOCK_TRAIL_LIFE:.32,KNOCK_TWEEN_LIFE:.22,
 trashThrower:()=>false,spitThrower:z=>!!z.boss,
 spitSprite:radius=>({radius}),
 drawThrowable(){throw Error('boss venom cannot become trash')},
 bossTrashProjectilePosition:p=>({x:p.sx+(p.tx-p.sx)*p.t/p.duration,
  y:p.sy+(p.ty-p.sy)*p.t/p.duration,t:p.t/p.duration}),
 captureBloom:fn=>fn(),sfx(){}
};
vm.createContext(ctx);
vm.runInContext(body,ctx);
const calc=expr=>vm.runInContext(expr,ctx);
const near=(x,y)=>Math.abs(x-y)<.0001;
function drawAt(z,progress){
 z.spitWindup=z.spitWindupTotal*(1-progress);
 draws.length=0;
 calc('drawBossTrashShots()');
 return draws.slice();
}
for(const form of [0,1,2,3]){
 const large=form===3;
 const z={
  boss:true,bossForm:form,w:large?112:66,h:large?124:88,
  x:large?169:192,y:110,spitWindup:.55,spitWindupTotal:.55,
  knockTime:0,hitShakeFrom:0,hitShakeUntil:0
 };
 ctx.foes=[z];ctx.bossTrashShots.length=0;
 ctx.z=z;
 const mouth=calc('spitMouthAnchor(z)');
 const early=drawAt(z,0);
 assert.equal(early.length,0,'boss '+form+' invisible at first prep frame, including glow');
 const rise=drawAt(z,.18);
 assert.equal(rise.length,2,'boss '+form+' venom and bloom both present during rise');
 assert(rise[0].y<mouth.y-5,'boss '+form+' toxin rises from its mouth');
 assert(rise[0].alpha>.7&&rise[0].alpha<1,'boss '+form+' toxin fades in');
 assert(near(rise[0].alpha,rise[1].alpha),'boss '+form+' bloom shares fade');
 const peak=drawAt(z,.52),pose=calc('raisedSpitPose(.52)');
 assert(peak[0].y<rise[0].y-12,'boss '+form+' has prominent high overshoot');
 assert(near(peak[0].y,mouth.y+pose.y*1.35),'boss '+form+' high key is scaled');
 assert(near(peak[0].scale,pose.scale*1.30),'boss '+form+' toxin grows to boss scale');
 const catchFrame=drawAt(z,.73);
 assert(catchFrame[0].y>mouth.y+4,'boss '+form+' toxin snaps downward to catch');
 const settle=drawAt(z,.98);
 assert(Math.abs(settle[0].y-mouth.y)<2,'boss '+form+' settles at launch anchor');
 assert(near(settle[0].scale,1.30),'boss '+form+' remains enlarged when held');
 assert(near(settle[1].scale,settle[0].scale),'boss '+form+' bloom has matching scale');
 // Bosses normally resist pushback; still test any visual knock tween
 // and the hit-shake used on the rendered boss sprite.
 z.knockFromX=z.x;z.knockFromY=z.y;
 z.x+=55;z.y+=15;z.knockDuration=.32;z.knockTime=.32;
 const frozen=drawAt(z,.55);
 assert(near(frozen[0].x,z.knockFromX+z.w*.5),'boss '+form+' held venom sticks to visual origin');
 z.knockTime=.18;
 const mid=drawAt(z,.55),vis=calc('knockVisualPosition(z)');
 assert(near(mid[0].x,vis.x+z.w*.5),'boss '+form+' toxin follows knockback x');
 assert(near(mid[0].y,vis.y+z.h*.39+calc('raisedSpitPose(.55)').y*1.35),
  'boss '+form+' toxin follows knockback y and raised key');
 z.hitShakeFrom=59.96;z.hitShakeUntil=60.09;
 const shake=drawAt(z,.55),offset=calc('hitShakeOffset(.04,.13,true)');
 assert(near(shake[0].x,vis.x+z.w*.5+offset.x),'boss '+form+' toxin shares hit shake');
 z.spitWindup=0;
 const origin=calc('spitMouthAnchor(z)');
 ctx.citizen={x:320,y:620,alive:true};
 calc('launchSpit(z,citizen)');
 const shot=ctx.bossTrashShots.at(-1);
 assert(shot&&shot.type==='spit','boss '+form+' still fires poison');
 assert(near(shot.sx,origin.x)&&near(shot.sy,origin.y),
  'boss '+form+' projectile launches from the held visual location');
 assert.equal(shot.spitScale,1.30,'boss '+form+' emitted toxin stays same size');
 draws.length=0;calc('drawBossTrashShots()');
 assert.equal(draws.length,2,'boss '+form+' airborne toxin still has base and bloom');
 assert(draws.every(d=>near(d.scale,1.30)),'boss '+form+' no visual size pop at release');
 assert.equal(g.globalAlpha,1,'boss '+form+' alpha restored after draw');
}
assert(game.includes("function spitThrower(z){return !!z.boss||Number.isInteger(z.eliteKind)}"),
 'all bosses, including old big zombie/trashcan and new bottle/bag, can spit');
assert(game.includes("z.spitWindup=z.boss?.55:.44"),'boss prepare time remains .55s');
assert(html.includes('v252-boss-spit-presentation'),'browser script cache incremented');
assert(sw.includes('v252-boss-spit-presentation'),'service worker cache incremented');
console.log('PASS v252: all 4 boss forms get distinct larger fade-up/catch venom, synchronized knock/hit visual, seamless boss-scale shot and matching Bloom.');
