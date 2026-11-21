'use strict';
const c=document.getElementById('game');let g=c.getContext('2d');const $=id=>document.getElementById(id),W=450;let H=710,PY=584,VIEW_DELTA=0;
// Preserve normal drawing; collect only luminous shapes for the additive pass.
let fxRenderer=null;
function luminous(draw,bloomDraw=draw){
 draw();
 captureBloom(bloomDraw);
}
function captureBloom(bloomDraw){
 if(!fxEnabled||!fxRenderer)return;
 const original=g;
 // Independent FX-capture callback lets a selected layer bloom less
 // without changing its visible base draw or any other effect.
 fxRenderer.capture(original,context=>{g=context;try{bloomDraw()}finally{g=original}});
}
const TYPES=[{color:'#a9d67c',top:'#dcf3b1',side:'#60945b',hp:1,name:'그린'},{color:'#78d4e5',top:'#bbf3f6',side:'#367e98',hp:2,name:'블루'},{color:'#eabb58',top:'#ffdf96',side:'#a57932',hp:3,name:'골드'},{color:'#df87b5',top:'#ffc3e3',side:'#92527c',hp:4,name:'퍼플'},{color:'#ed7966',top:'#ffb091',side:'#a1403f',hp:5,name:'레드'}];
const SLOW_ENEMY_SPEED_RATE=.10,SLOW_HOSTILE_SHOT_RATE=.10;
const enemySlowRate=()=>has('slow')?SLOW_ENEMY_SPEED_RATE:1;
const hostileShotSlowRate=()=>has('slow')?SLOW_HOSTILE_SHOT_RATE:1;
// v232: Independent continuous sprite timeline. Enemy animation frames slow
// with the enemy's movement, while the ball, hero, UI and combat clocks don't.
let enemyAnimationClock=0;
const SKILLS={bazooka:{name:'시민 바주카',duration:12,color:'#ffd16c',desc:'시민이 3초마다 희귀 광역 로켓 · 피해 8',icon:'<path d="m5 21 15-15 7 7-15 15zM18 8l6 6M6 22l-2 6 6-2M19 3l2-2M28 10l3-1M26 3l3-3"/>'},dual:{name:'더블볼',duration:16,color:'#aee8ff',desc:'공 2개',icon:'<circle cx="9" cy="12" r="5"/><circle cx="23" cy="20" r="5"/>'},triple:{name:'트리플볼',duration:16,color:'#c0a5ff',desc:'공 3개',icon:'<circle cx="16" cy="7" r="4"/><circle cx="7" cy="23" r="4"/><circle cx="25" cy="23" r="4"/>'},power:{name:'파워볼',duration:14,color:'#f5d470',desc:'크기·공격력 ×2',icon:'<circle cx="16" cy="16" r="12"/><path d="m17 6-7 12h6l-1 8 8-13h-6z"/>'},fire:{name:'화염볼',duration:10,color:'#ff9763',desc:'점화 최대 2명 · 전염 1회',icon:'<path d="M17 3c4 9-4 9 2 14l5-6c9 12 1 19-8 18S3 21 8 13l3 5c4-4 0-8 6-15Z"/>'},slow:{name:'슬로우',duration:14,color:'#86f2e0',desc:'좀비와 적 투사체는 질질~ 공은 쌩쌩!',icon:'<circle cx="16" cy="17" r="11"/><path d="M16 10v8l6 3M12 2h8M16 2v4"/>'},pierce:{name:'관통샷',duration:10,color:'#ffe88a',desc:'10초간 적을 관통 · 충돌당 크리티컬 피해 ×2',icon:'<circle cx="7" cy="16" r="4"/><path d="M12 16h17M22 8l7 8-7 8M17 11h7"/>'},shield:{name:'보호막',duration:18,color:'#b9f684',desc:'바닥에서 공 반사',icon:'<path d="m16 3 11 4v10c0 6-11 12-11 12S5 23 5 17V7Z"/><path d="m10 16 4 4 8-9"/>'}};
let mode='menu',score=0,wave=1,lives=3,best=0,car=225,target=225,balls=[],foes=[],items=[],particles=[],keys={},swing=0,combo=0,ballVanish=[],criticalPopups=[],itemPickupFX=[],clock=0,last=0,active={},sound=true,toastTimer,stageDelay=0,audio,master,musicBus,nextBeat=0,beat=0,lastSkillMarkup='';
try{best=+(localStorage.getItem('zr-best')||0)}catch{}
const HEROES=[
{id:'ace',name:'에이스',role:'안정형',color:'#ed684c',hair:'#503627',skin:'#ffd4a0',speed:500,paddle:68,damage:1,lives:3,duration:1,desc:'넓은 라켓 · 목숨 3',stats:'이동 500 · 공격 1 · 라켓 136'},
{id:'ruby',name:'루비',role:'기동형',color:'#5ecba7',hair:'#e7843c',skin:'#ffe0ba',speed:660,paddle:51,damage:1,lives:3,duration:1.25,desc:'배트 · 이동 +32% · 스킬 +25%',stats:'이동 660 · 공격 1 · 반사 폭 102'},
{id:'liam',name:'리아',role:'공격형',color:'#f0b84e',hair:'#ed6c34',skin:'#f1bc87',speed:390,paddle:55,damage:2,lives:2,duration:1,desc:'해머 · 공격력 ×2 · 목숨 2',stats:'이동 390 · 공격 2 · 반사 폭 110'}];
if(window.ZZGarage)HEROES.push({id:'mechanic',name:'정비사',role:'벽 반사형',color:'#ffae40',hair:'#273842',skin:'#ddb48c',speed:480,paddle:60,damage:1,lives:3,duration:1,desc:'휠캡 · 측면 밀치기',stats:'벽을 맞힌 휠캡이 첫 적을 옆으로 밀칩니다.'});
const gearBonus=id=>window.ZZGarage?.bonus(id)||0;
let filterReady=0;
let touchUsed=false,lastBuzz=0,buzzLockedUntil=0,buzzPriority=0,lastCameraFeedback=0,bubbles=[],bubbleTimer=.25;
const HERO_ATTACK_DURATION=.42;let heroAttackTime=0;
let selectedHero=0,clearTime=0,clearBurst=0,resumeMode='playing',crowdTimer=3.5,junk=[],cheerTime=0;
// V161: catches build poison; a full bar temporarily locks all hero movement.
const POISON_MAX=100,POISON_SPIT=34,POISON_TRASH=20,POISON_DECAY=5.5,POISON_GROGGY_SECONDS=1.85;
let poison=0,poisonGrace=0,groggyTime=0,poisonFlash=0,poisonGaugeAlpha=0;
let endlessSurvival=0,endlessRunStarted=false,endlessHudSecond=-1,bestEndlessSurvival=0;
try{bestEndlessSurvival=+(localStorage.getItem('zz-endless-best-seconds')||0)}catch{}
function survivalClock(seconds){
 const whole=Math.floor(Math.max(0,seconds||0));
 return String(Math.floor(whole/60)).padStart(2,'0')+':'+String(whole%60).padStart(2,'0');
}
const hero=()=>HEROES[selectedHero];
const growth=id=>window.ZZProgression?.level?.(id)||0;
// V60 approved 192px idle atlas -> 108px game artwork, top-left = (car-54, PY-59).
// Tennis racket face (58,76), pink bat tip (54,75), hammer head (141,75).
// Balls sit on the UPWARD rim (face-safe), not in the character's hand or face.
const HELD_BALL_OFFSETS=[{x:-21,y:-30},{x:-23,y:-31},{x:25,y:-30}];
const heldBallOffset=()=>HELD_BALL_OFFSETS[selectedHero]||HELD_BALL_OFFSETS[0];
// Impact pose is cosmetic only; physics uses the unchanged 8/16px ball radius.
function ballImpact(b,axis,dir=1,kind='wall'){
 if(b&&kind==='wall')b.bank=true;
 if(!b||b.held)return;
 const normalSpeed=Math.abs(axis==='x'?b.vx:b.vy);
 const duration=kind==='paddle'?.19:kind==='enemy'?.17:
   kind==='shield'?.18:kind==='ceiling'?.155:.17;
 b.bounceDuration=duration;b.bounceTime=duration;
 b.bounceAxis=axis;b.bounceDir=dir;
 b.impactKind=kind;
 b.impactStrength=clamp((normalSpeed-80)/380,.64,1.12);
 b._trailCorner=true;
}
// V114: Reusable tiny 48px transparent impact bitmaps (no per-frame gradients).
const trashContactFX=[];
let ballContactFX=[];const contactStampCache=new Map();
// V123: 12 asymmetric hand-inked impact shapes with tapered variable-weight lines.
// No skill tint, directional spirals, glow or smoke. A monochrome fallback
// stays available until this 6KB sprite atlas has loaded.
const contactAtlasImage=typeof Image!=='undefined'?new Image():null;
if(contactAtlasImage){contactAtlasImage.decoding='async';contactAtlasImage.src='assets/fx/impact-bursts-mono-v123.png';}
function contactAtlasIndex(f){return f.variant%12;}

function contactStamp(kind,tone,variant){
 const key=kind+tone+variant;
 if(contactStampCache.has(key))return contactStampCache.get(key);
 if(typeof document==='undefined'||!document.createElement)return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const p=canvas.getContext('2d');if(!p)return null;
 // V118: comic starburst silhouette based on the upper-right ink/halftone
 // reference; cached once. No independent straight motion rays.
 const paper='#ffffff';
 const gleam='#ffffff';
 const ink='#202020';
 const dot='#444444';
 const cx=22,cy=32;
 const enemy=kind==='enemy';
 const points=enemy?11:kind==='ceiling'?9:10;
 const outer=enemy?16:kind==='ceiling'?12.6:14.2;
 // A loose cluster of halftone dots just outside the outgoing (+X) edge.
 // Dots are irregularly spaced to keep it from looking like a UI icon.
 p.fillStyle=dot;
 for(let i=0;i<17;i++){
  const seed=i*1.73+variant*.91+(enemy?.47:1.4);
  const y=cy+(Math.sin(seed*2.39)*.5+.5)*35-17.5;
  const x=cx+outer*.40+(Math.cos(seed*2.11)*.5+.5)*17;
  if((x-cx)*(x-cx)+(y-cy)*(y-cy)<outer*outer*.83)continue;
  const rad=(i%5===0?1.85:i%3===0?1.27:.82);
  p.globalAlpha=.18+(i%4)*.095;
  p.beginPath();p.arc(x,y,rad,0,Math.PI*2);p.fill();
 }
 // One thick, jagged, connected explosion contour—NOT lines extending
 // independently from the collision. Vary point count/angle/length subtly.
 const spike=()=>{
  p.beginPath();
  for(let j=0;j<points*2;j++){
   const tip=j%2===0;
   const k=Math.floor(j/2);
   const variation=Math.sin(k*3.61+variant*1.38+(enemy?.2:1.2));
   const radius=tip?outer*(.79+.21*(.5+.5*variation)):
     outer*(.53+.07*Math.sin(k*5.2+variant));
   const angle=j*Math.PI/points-.14+variant*.055;
   const x=cx+Math.cos(angle)*radius*(1+(enemy?.06:.08)*Math.cos(angle));
   const y=cy+Math.sin(angle)*radius*(.88+.07*Math.sin(angle*3));
   if(!j)p.moveTo(x,y);else p.lineTo(x,y);
  }
  p.closePath();
 };
 p.lineJoin='miter';p.miterLimit=2.3;
 spike();p.globalAlpha=.95;p.fillStyle=paper;p.fill();
 p.strokeStyle=ink;p.lineWidth=3.4;p.stroke();
 // Tiny inner flash: graphic shading, no white rectangular overlay.
 p.globalAlpha=.68;p.fillStyle=gleam;p.beginPath();
 p.moveTo(cx-5,cy-1);p.quadraticCurveTo(cx-3,cy-7,cx+2,cy-7);
 p.quadraticCurveTo(cx+8,cy-5,cx+8,cy+1);
 p.quadraticCurveTo(cx+3,cy+6,cx-3,cy+4);p.closePath();p.fill();
 p.globalAlpha=.76;p.fillStyle='#ffffff';p.beginPath();
 p.arc(cx+2,cy-1,1.9,0,Math.PI*2);p.fill();
 contactStampCache.set(key,canvas);return canvas;
}
function spawnContact(b,x,y,nx,ny,kind){
 if(!b||b.held)return;
 if(Number.isFinite(b.contactAt)&&clock-b.contactAt<.045)return;
 b.contactAt=clock;
 queueContact(ballContactFX,x,y,nx,ny,kind,null);
}
function queueContact(queue,x,y,nx,ny,kind,target,sizeMultiplier=1){
 queue.push({x,y,nx,ny,kind,target,sizeMultiplier,tone:0,
  variant:Math.floor(Math.abs(x*7+y*3+clock*41))%12,t:0,life:queue===trashContactFX?.42:kind==='enemy'?.30:kind==='ceiling'?.25:.27});
 if(queue.length>20)queue.splice(0,queue.length-20);
}
function contactFace(b,z,r,ox,oy){
 const x=clamp(b.x,z.x+2,z.x+z.w-2),y=clamp(b.y,z.y+2,z.y+z.h-2);
 if(ox+r<=z.x&&b.vx>0)return[z.x,y,-1,0];
 if(ox-r>=z.x+z.w&&b.vx<0)return[z.x+z.w,y,1,0];
 if(oy+r<=z.y&&b.vy>0)return[x,z.y,0,-1];
 if(oy-r>=z.y+z.h&&b.vy<0)return[x,z.y+z.h,0,1];
 const faces=[[Math.abs(b.x+r-z.x),z.x,y,-1,0],
  [Math.abs(b.x-r-(z.x+z.w)),z.x+z.w,y,1,0],
  [Math.abs(b.y+r-z.y),x,z.y,0,-1],
  [Math.abs(b.y-r-(z.y+z.h)),x,z.y+z.h,0,1]];
 let f=faces[0];for(let i=1;i<4;i++)if(faces[i][0]<f[0])f=faces[i];
 return f.slice(1);
}
function drawTrashContact(target){
 if(trashContactFX.length)drawContactFX(1,trashContactFX,target);
}
function drawContactFX(bloom=1,queue=ballContactFX,target=null){
 const atlasReady=!!(contactAtlasImage&&contactAtlasImage.complete&&contactAtlasImage.naturalWidth===256&&contactAtlasImage.naturalHeight===192);
 for(const f of queue){
  if(target!==null&&f.target!==target)continue;
  const img=atlasReady?contactAtlasImage:contactStamp(f.kind,f.tone,f.variant);if(!img)continue;
  const u=Math.max(0,Math.min(1,f.t/f.life));
  // Hold the bitmap at full strength for several frames before a soft fade.
  // V119 faded from the first tick, making a nominal 0.16s hit nearly invisible.
  const trash=queue===trashContactFX,hold=trash?.4:.28;
  const fade=u<=hold?1:Math.pow(Math.max(0,(1-u)/(1-hold)),.86);
  if(fade<=0)continue;
  g.save();g.translate(f.x,f.y);
  // Point-symmetric balloon shapes do not rotate with the travel direction.
  // The center still covers the exact ball/trail-bend collision vertex.
  if(trash){
   const impactScale=f.kind==='ground'?.68:.2175;
   const size=impactScale*f.sizeMultiplier;
   g.scale(size,size);
  }
  g.globalCompositeOperation=trash&&u<.18?'lighter':'source-over';
  g.globalAlpha=fade*(f.kind==='enemy'?.98:.95)*bloom;
  if(atlasReady){
   const frame=contactAtlasIndex(f);
   // 40-50% more screen coverage than V119; centered on the trail bend.
   const base=f.kind==='enemy'?75:f.kind==='ceiling'?67:72;
   const scale=1.02-.10*u;
   const w=base*scale;
   g.drawImage(img,(frame%4)*64,Math.floor(frame/4)*64,64,64,-w/2,-w/2,w,w);
  }else{
   // Retain the previous procedural art if the asset is still loading.
   const size=f.kind==='enemy'?1.44:f.kind==='ceiling'?1.34:1.40;
   g.scale(size*(.97+.07*u),size*(.97+.07*u));
   g.drawImage(img,-22,-32);
  }
  g.restore();
 }
}
// Nine nearly touching lanes fill the full 450px road without squeezing 128px source art.
// Shared interior lane for the painted walls in all 18 portrait scenes.
// Center a nine-column horde inside the scenery instead of clipping side walls.
// Keep the 33px colliders and 58px row spacing unchanged.
const ROAD_LEFT=36,ROAD_RIGHT=414,ZOMBIE_WALL_MARGIN=6,ENEMY_TOP_Y=70;
const ENEMY_COLUMNS=9,ENEMY_PITCH=40.875,ENEMY_LEFT_X=45,ENEMY_ROW_PITCH=58;
const zombieMinX=()=>ROAD_LEFT+ZOMBIE_WALL_MARGIN;
const zombieMaxX=z=>ROAD_RIGHT-ZOMBIE_WALL_MARGIN-z.w;
const ZOMBIE_FORMS=[{name:'그린 좀비',unlock:1},{name:'드럼통 좀비 · 레드',unlock:6},{name:'드럼통 좀비 · 블랙',unlock:32},{name:'브레인 큐브 · 레드',unlock:9},{name:'일회용 포장 박스 좀비',unlock:24},{name:'나무 상자 좀비',unlock:28},{name:'브레인 큐브 · 블랙',unlock:16},{name:'브레인 큐브 · 옐로',unlock:4}];
const BOSS_FORMS=['빅 좀비','쓰레기통 좀비','대형 생수통 좀비','큰 쓰레기 좀비'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const has=k=>(active[k]||0)>0;
// V84: hard-edge, low-poly contact shadows. All ground actors use polygon
// footprints; no blur, texture outlines, or baked shadows on approved sprites.
// V85: visible, pixel-sharp low-poly shadows with a shared upper-left light.
// Previous v84 polygons ended under each sprite's opaque feet and disappeared.
// These extend just below the real footprint, without separating the actor.
function drawHardGroundShadow(cx,foot,width,depth=6,cast=true,alpha=.30){
 if(!Number.isFinite(cx)||!Number.isFinite(foot)||!Number.isFinite(width)||width<=0)return;
 const y=foot,w=width*.5,d=Math.max(3,depth);
 g.save();g.globalCompositeOperation='source-over';
 g.shadowColor='transparent';g.shadowBlur=0;
 if(cast){
  // A small angular projection remains visible to the lower-right of a cube.
  const dx=Math.min(17,d*.95+4),dy=Math.min(14,d*.72+4);
  g.fillStyle='rgba(10,17,23,'+(alpha*.73).toFixed(3)+')';
  g.beginPath();
  g.moveTo(cx-w*.80,y-d*.43);
  g.lineTo(cx+w*.64,y-d*.43);
  g.lineTo(cx+w*.78+dx,y+dy*.75);
  g.lineTo(cx-w*.26+dx,y+dy);
  g.lineTo(cx-w*.80,y+1);
  g.closePath();g.fill();
 }
 // The contact plane overlaps feet by 1–2px and extends 6–13px beyond them.
 // Keep corners hard: no ellipse, blur, alpha gradient or softened mask.
 g.fillStyle='rgba(12,20,26,'+alpha.toFixed(3)+')';
 g.beginPath();
 g.moveTo(cx-w*.77,y-d*.53);
 g.lineTo(cx+w*.68,y-d*.53);
 g.lineTo(cx+w,y-d*.13);
 g.lineTo(cx+w*.74,y+d*.92+1.5);
 g.lineTo(cx-w*.75,y+d*.92+1.5);
 g.lineTo(cx-w,y-d*.10);
 g.closePath();g.fill();
 g.restore();
}
function drawWorldGroundShadows(){
 // Large trash-bag boss: approved 256px sprite has transparent space below
 // its visible feet. Only its cast-shadow foot pivot gets an upward trim.
 // Keep sprite positions, collider, ground contact and all other mobs intact.
 const zombieGroundShadowFoot=z=>z.y+z.h-3-(z.boss&&z.bossForm===3?18:0);
 for(const actor of foes){
  // ObjectZombie and GreenWalk use bottom pivot z.y+z.h+2.
  // Knockback shadows follow their displayed sprites, not future colliders.
  const z=knockVisualPosition(actor);
  // The v141 incoming zombie sprites fade in from 0 over .62 seconds.
  // Their cast shadows must share that SAME stagger and opacity: otherwise
  // the fully visible ground silhouettes reveal the new formation early.
  const arrivalAlpha=Number.isFinite(actor.arrivalTime)
   ?Math.max(0,Math.min(1,actor.arrivalTime/.62)):1;
  if(arrivalAlpha<=0)continue;
  drawHardGroundShadow(z.x+z.w*.5,zombieGroundShadowFoot(z),
    z.w*(z.boss?.93:.88),z.boss?15:9.5,true,(z.boss?.34:.31)*arrivalAlpha);
 }
 for(const d of enemyDeaths){
  if((d.t||0)>=d.split)continue;
  const z=d.z,fade=Math.max(0,1-d.t/d.split);
  drawHardGroundShadow(z.x+z.w*.5,zombieGroundShadowFoot(z),z.w*.83,
    z.boss?14:8.5,true,(z.boss?.28:.27)*fade);
 }
}
// The real 192px car atlas has transparent bottom padding that differs by
// hero. Sample idle frame zero ONCE per hero, then cache the visible wheel
// baseline; never guess from the 108px sprite destination rectangle.
const heroGroundFootCache=new WeakMap();
function sampleHeroCarFoot(img,heroIndex){
 if(!img||typeof document==='undefined'||typeof document.createElement!=='function')return null;
 let cache=heroGroundFootCache.get(img);
 if(!cache){cache=new Map();heroGroundFootCache.set(img,cache)}
 const row=clamp(heroIndex|0,0,2);
 if(cache.has(row))return cache.get(row);
 let baseline=null;
 try{
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(ctx&&typeof ctx.drawImage==='function'&&typeof ctx.getImageData==='function'){
   ctx.clearRect?.(0,0,64,64);
   ctx.drawImage(img,0,row*192,192,192,0,0,64,64);
   const pixels=ctx.getImageData(0,0,64,64).data;
   let last=-1;
   // Restrict to the underside of the vehicle, not the racket or hair.
   for(let y=63;y>=24&&last<0;y--)for(let x=7;x<57;x++){
    if(pixels[(y*64+x)*4+3]>=78){last=y;break}
   }
   if(last>=0)baseline=clamp(579-54+(last+1)*108/64,596,633);
  }
 }catch{/* fallback when canvas readback is unsupported */}
 cache.set(row,baseline);
 return baseline;
}
function heroCarShadowFoot(){
 const approved=window.ZZHeroAnimationsV55;
 const source=approved?.ready&&approved.idle?approved.idle:
   window.ZZHeroCarAttack?.ready?window.ZZHeroCarAttack.image:null;
 const sampled=source?sampleHeroCarFoot(source,selectedHero):null;
 // Source art usually ends near y627; this fallback cannot sink to old y636.
 // Do not follow the win-pose bounce: only the wheel art rises, the floor does not.
 return (sampled??627)+VIEW_DELTA;
}
function drawCarGroundShadow(){
 // A compact 2-layer silhouette hugs the rear and front wheel contact zones.
 const foot=heroCarShadowFoot();
 drawHardGroundShadow(car,foot-4.5,84,11.5,true,.33);
}
// v94: keep the original projection distance for colored ball lights,
// while removing the dark oval directly beneath each ball.
const BALL_PROJECTION_GAP=24;
function ballProjectionDrop(r){return BALL_PROJECTION_GAP+r*1.25}
// v94: no dark ball shadow. Colored projection and light spills stay active.
// Bright "shadows" are light spill, not dark silhouettes. This layer uses
// smooth falloff; hard edges are reserved for physical actors and pickups.
// V86: luminous colored bounce-light. Additive gradients sit ABOVE bitmap
// actors/balls and below the UI; otherwise their centers are hidden by sprites.
// v93: persistent 192px light mask per stable trail color. Multi-ball
// renders use scaled additive stamps instead of rebuilding radial gradients.
const TRAIL_LIGHT_STAMP_SIZE=192;
const trailLightStamps=new WeakMap();
function trailLightStamp(rgb){
 const cached=trailLightStamps.get(rgb);if(cached)return cached;
 const stamp=document.createElement('canvas');
 stamp.width=stamp.height=TRAIL_LIGHT_STAMP_SIZE;
 const ctx=stamp.getContext('2d');
 if(!ctx||typeof ctx.createRadialGradient!=='function')return null;
 const h=TRAIL_LIGHT_STAMP_SIZE/2;
 const grad=ctx.createRadialGradient(h,h,0,h,h,h);
 const channel=rgb.map(v=>Math.max(0,Math.min(255,v|0)));
 const prefix='rgba('+channel.join(',')+',';
 for(const [p,k] of [[0,.9],[.29,.69],[.61,.30],[.84,.085],[1,0]])
  grad.addColorStop(p,prefix+(k*.8).toFixed(3)+')');
 ctx.fillStyle=grad;ctx.fillRect(0,0,TRAIL_LIGHT_STAMP_SIZE,TRAIL_LIGHT_STAMP_SIZE);
 trailLightStamps.set(rgb,stamp);return stamp;
}
function drawSoftLightSpill(x,y,r,rgb,alpha=.35,useTrailStamp=false){
 if(!fxEnabled||!Number.isFinite(x)||!Number.isFinite(y)||alpha<=0)return;
 const radius=Math.min(100,Math.max(12,r));
 // Only the multi-ball trail wake takes this faster path. Positions, 5-stop
 // falloff, additive alpha and BOTH outer/core radii stay unchanged.
 if(useTrailStamp&&(balls.length>1||(typeof has==='function'&&has('pierce')))&&typeof document!=='undefined'&&typeof document.createElement==='function'){
  const stamp=trailLightStamp(rgb);
  if(stamp){
   g.save();g.globalCompositeOperation='lighter';
   g.shadowColor='transparent';g.shadowBlur=0;
   g.globalAlpha*=Math.min(.8,alpha)/.8;
   g.drawImage(stamp,x-radius,y-radius,radius*2,radius*2);
   g.restore();return;
  }
 }
 const grad=g.createRadialGradient?.(x,y,0,x,y,radius);
 if(!grad||typeof grad.addColorStop!=='function')return;
 const channel=rgb.map(v=>Math.max(0,Math.min(255,v|0)));
 const strength=Math.min(.8,alpha);
 const prefix='rgba('+channel.join(',')+',';
 const color=m=>prefix+(m*strength).toFixed(3)+')';
 grad.addColorStop(0,color(.9));
 grad.addColorStop(.29,color(.69));
 grad.addColorStop(.61,color(.30));
 grad.addColorStop(.84,color(.085));
 grad.addColorStop(1,color(0));
 g.save();g.globalCompositeOperation='lighter';
 g.shadowColor='transparent';g.shadowBlur=0;
 g.fillStyle=grad;g.beginPath();g.arc(x,y,radius,0,Math.PI*2);g.fill();g.restore();
}
// V91: one geometry build per ball and rendered frame. The cache is weak
// (retired balls do not leak), and the frame key prevents stale trails when
// physics updates. This removes the second identical path build in floor FX.
let trailRenderFrame=0;
const trailRenderPaths=new WeakMap();
function getBallRenderTrailPath(b,r){
 const hit=trailRenderPaths.get(b);
 if(hit&&hit.frame===trailRenderFrame&&hit.radius===r)return hit.path;
 const entry=hit||{points:[]};
 const path=buildBallTrailPath(b,r,entry.points);
 entry.frame=trailRenderFrame;entry.radius=r;entry.path=path;
 if(!hit)trailRenderPaths.set(b,entry);
 return path;
}
// Projected reflections sit below the effect, while the original flame
// filaments, electric arcs and hit flashes stay attached to their sources.
// Transforming BOTH the gradient and its path gives a soft elliptical pool.
function drawProjectedLightSpill(x,y,r,rgb,alpha=.35,drop=28,vertical=.82,useTrailStamp=false,drawCore=true){
 if(!fxEnabled||alpha<=0)return;
 g.save();
 g.translate(x+4,y+drop);
 // V89: the old 0.48 scale made falloff cores look like razor-thin lines.
 // Use a fuller oval; caller can give a rounder .94 for impact flashes.
 g.scale(1,Math.max(.72,Math.min(1,vertical)));
 drawSoftLightSpill(0,0,r,rgb,alpha,useTrailStamp);
 // Compact luminous center keeps colored reflections legible on bright roads.
 if(drawCore)drawSoftLightSpill(0,0,r*.52,rgb,alpha*.37,useTrailStamp);
 g.restore();
}
// V88: reflected light is a separate projected wake, NOT a glow pasted onto
// the sprite. A bounded set of overlapping soft ellipses forms a readable
// floor streak on bright stage roads, without another full-size particle pass.
// Fixed hero colors are not allocated again for every ball and frame.
const TRAIL_GROUND_HERO_COLORS=[[192,234,112],[255,227,183],[255,191,129]];
// Stable source arrays allow the color stamps to remain cached between frames.
const TRAIL_GROUND_FIRE_PIERCE=[[255,155,62],[95,217,255]],TRAIL_GROUND_FIRE=[[255,139,51]],TRAIL_GROUND_PIERCE=[[89,213,255]],TRAIL_GROUND_POWER=[[255,214,110]];
function drawTrailGroundReflections(b,r,path){
 if(!fxEnabled||b.held||!path||path.length<2)return;
 if(typeof compactBallFX==='function'&&compactBallFX()){
  if(has('pierce')){
   // Use up to sixteen overlapping cached pools (near-standard 12px spacing).
   // One layer per sample, no live blur and no duplicate inner light pool.
   const length=path[path.length-1].s;
   const samples=Math.min(16,Math.max(2,Math.ceil(length/12)+1));
   for(let i=0;i<samples;i++){
    const u=i/(samples-1),p=sampleBallTrail(path,length*u);
    const fade=1-.78*u;
    // Alternate warm and cyan pools when fire and pierce overlap.
    // Same 16 cached stamps; never double the floor draw calls.
    const rgb=has('fire')&&i%2===0?
      (typeof TRAIL_GROUND_FIRE!=='undefined'?TRAIL_GROUND_FIRE[0]:[255,139,51]):
      TRAIL_GROUND_PIERCE[0];
    drawProjectedLightSpill(p.x,p.y,(r>8?34:30)*(1-.12*u),
     rgb,.34*fade,30,.82,true,false);
   }
   return;
  }
  // One cached soft pool per ball replaces up to 36 large blended pools.
  const rgb=has('fire')?TRAIL_GROUND_FIRE[0]:TRAIL_GROUND_PIERCE[0];
  drawProjectedLightSpill(b.x,b.y,r*2.4,rgb,.22,30,.82,true,false);
  return;
 }
 // Match the full existing trail (170px normal, 190px power) exactly.
 // The v88 cutoff at 134px plus eight samples made its floor wake too short.
 const length=path[path.length-1].s;
 if(length<9)return;
 const fire=has('fire'),pierce=has('pierce'),power=has('power');
 const defaultColors=TRAIL_GROUND_HERO_COLORS;
 const colors=fire&&pierce?TRAIL_GROUND_FIRE_PIERCE:fire?TRAIL_GROUND_FIRE:
   pierce?TRAIL_GROUND_PIERCE:power?TRAIL_GROUND_POWER:defaultColors;
 const baseAlpha=fire||pierce?(power ? .66 : .60):(power ? .53 : .39);
 const radius=fire||pierce?(power?34:28):power?28:24;
 // Adaptive <=11px spacing produces an unbroken reflected ribbon, with
 // both ends present. At most 20 two-layer pools per ball for mobile GPUs.
 // 3+ simultaneous fire/pierce balls already have a bright elemental ribbon.
 // Project fewer soft pools and omit the duplicate inner core. The outer
 // stamp stays large enough for the pools to overlap without dotted gaps.
 const multiSkillFast=balls.length>=3&&(fire||pierce);
 const start=4;
 const samples=multiSkillFast?
  Math.min(10,Math.max(2,Math.ceil((length-start)/21)+1)):
  Math.min(20,Math.max(2,Math.ceil((length-start)/11)+1));
 for(let i=0;i<samples;i++){
  const d=start+(length-start)*i/(samples-1);
  const p=sampleBallTrail(path,d);
  if(!p)continue;
  const fade=Math.pow(Math.max(.045,1-d/(length+12)),.86);
  const variation=.94+.06*Math.sin(clock*12+i*1.1);
  const rgb=(!fire&&!pierce&&!power)?(defaultColors[selectedHero]||defaultColors[0]):colors[i%colors.length];
  // Dense pools overlap; reduce each one's alpha to prevent white blowout.
  if(multiSkillFast)
   drawProjectedLightSpill(p.x,p.y,radius*(.76+.24*fade),rgb,
     baseAlpha*.88*fade*variation,30,.82,true,false);
  else
   drawProjectedLightSpill(p.x,p.y,radius*(.76+.24*fade),rgb,
     baseAlpha*.68*fade*variation,30,.82,true);
 }
}
// V89: the former single-pixel horizontal stroke read as a loose line,
// not a floor reflection. Replace it with a filled, softly diffused oval.
function drawHitGroundGlint(f,t,drop){
 const fade=Math.pow(Math.max(0,1-t),1.5);
 if(fade<=0)return;
 const core=f.critical?36:27;
 const tint=f.piercing?[169,239,255]:f.critical?[255,248,197]:[255,231,169];
 drawProjectedLightSpill(f.x,f.y,core,tint,(f.critical?.62:.47)*fade,drop,.98);
}
function effectLightRGB(hex){
 const m=typeof hex==='string'?/^#([0-9a-f]{6})$/i.exec(hex):null;
 return m?[parseInt(m[1].slice(0,2),16),parseInt(m[1].slice(2,4),16),
   parseInt(m[1].slice(4,6),16)]:[255,210,112];
}
function drawEffectLightSpills(){
 if(!fxEnabled)return;
 // V87: these reflections live BELOW their effect positions; the rendered
 // sparks, flames and electric bolts remain at their original sprite anchors.
 for(const f of hitFlashes){
  if(f.t<(f.delay||0)||f.t>=f.life)continue;
  const u=(f.t-(f.delay||0))/Math.max(.01,f.life-(f.delay||0));
  // Freeze/hit flashes spawn at actor centers. Large bosses need their
  // projected reflection closer to the actual feet than a fixed 29px drop.
  const drop=Number.isFinite(f.groundY)?
    clamp(f.groundY-f.y+6,26,105):29;
  const rgb=f.piercing?[87,213,255]:f.critical?[255,226,142]:[255,194,105];
  const alpha=(f.critical?.79:.64)*Math.pow(1-u,1.25);
  drawProjectedLightSpill(f.x,f.y,f.critical?74:54,rgb,alpha,drop,.94);
  drawHitGroundGlint(f,u,drop);
 }
 for(const b of barrelBlasts){
  const u=b.t/Math.max(.01,b.life||.34);
  if(u<1)drawProjectedLightSpill(b.x,b.y,83,[255,125,39],.59*(1-u),34);
 }
 for(const b of bazookaBlasts){
  const u=b.t/Math.max(.01,b.life||.39);
  if(u<1)drawProjectedLightSpill(b.x,b.y,96,[255,174,70],.65*(1-u),38);
 }
 for(let i=Math.max(0,fx.length-12);i<fx.length;i++){
  const f=fx[i];
  const u=f.t/Math.max(.01,f.visualLife||.21);
  if(u>=1||f.standardHit)continue;
  drawProjectedLightSpill(f.x,f.y,Math.min(74,Math.max(26,f.size*.64)),
    effectLightRGB(f.color),(.29+.0016*Math.min(120,f.size))*(1-u),27);
 }
 for(const f of itemPickupFX){
  const u=f.t/Math.max(.01,f.life||.62);
  if(u>=1)continue;
  drawProjectedLightSpill(f.x,f.y-18*u,34,effectLightRGB(SKILLS[f.k]?.color),
    .29*(1-u),27);
 }
 // Exception: burning zombies keep their light attached to their flames.
 for(const actor of foes){
  if(!(actor.burn>0))continue;
  const z=knockVisualPosition(actor);
  drawSoftLightSpill(z.x+z.w*.5,z.y+z.h-20,z.boss?48:29,
    [255,130,41],.23*Math.min(1,actor.burn/.3));
 }
 // Every ball trail gets a floor wake, even without a skill. Active fire,
 // pierce and power colors override the natural hero trail color.
 for(const b of balls){
  if(!b.held){
   const radius=has('power') ? 12 : 8;
   drawTrailGroundReflections(b,radius,getBallRenderTrailPath(b,radius));
  }
 }
 // V131: keep the ball-local pool smaller and dimmer than its trail wake.
 // Omit the extra inner core so the head does not become a bright round disc.
 // Preserve projection position and all trail/flame/lightning artwork.
 for(const b of balls){
  if(b.held)continue;
  const r=has('power') ? 12 : 8,drop=ballProjectionDrop(r);
  if(has('pierce')){
   drawProjectedLightSpill(b.x,b.y,has('power')?24:20,
     [81,204,255],has('fire')?.10:.16,drop,.82,false,false);
  }
  if(has('fire')){
   drawProjectedLightSpill(b.x,b.y,has('power')?28:24,
     [255,133,47],has('pierce')?.12:.20,drop,.82,false,false);
  }
  if(has('power')&&!has('fire')&&!has('pierce'))
   drawProjectedLightSpill(b.x,b.y,26,[255,219,111],.17,drop,.82,false,false);
 }
}
function rect(x,y,w,h,color){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function poly(p,color){g.fillStyle=color;g.beginPath();p.forEach((v,i)=>i?g.lineTo(...v):g.moveTo(...v));g.closePath();g.fill()}
function cube(x,y,w,h,front,top,side){rect(x-2,y-1,w+4,h+3,'#111724');rect(x,y,w,h,front);poly([[x,y],[x+6,y-6],[x+w+6,y-6],[x+w,y]],top);poly([[x+w,y],[x+w+6,y-6],[x+w+6,y+h-6],[x+w,y+h]],side)}
let musicEnabled=true,fxEnabled=true,fx=[],cameraKick=0,musicTheme='',noiseBuffer,echo,lastSfx={};
const hz=n=>440*Math.pow(2,(n-69)/12);
function audioRunning(){return !!(audio&&master&&musicBus&&(!audio.state||audio.state==='running'))}
function audioUI(){const blocked=sound&&!audioRunning();$('sound').textContent=!sound?'♫ OFF':blocked?'♫ 재생':'♫ ON';$('sound').setAttribute('aria-label',!sound?'음악과 효과음 켜기':blocked?'소리 재생 다시 시도':'음악과 효과음 끄기')}
function unlockAudio(){
 try{
  if(!audio||audio.state==='closed'||!master||!musicBus){
   const AudioCtor=window.AudioContext||window.webkitAudioContext;if(!AudioCtor){audioUI();return}
   const ctx=new AudioCtor(),main=ctx.createGain(),bus=ctx.createGain();
   // Keep the essential output path independent of optional effects.
   main.connect(ctx.destination);bus.connect(main);
   audio=ctx;master=main;musicBus=bus;noiseBuffer=null;echo=null;lastSfx={};nextBeat=0;musicTheme='';
   try{if(ctx.createDelay){const delay=ctx.createDelay(),wet=ctx.createGain();delay.delayTime.value=.18;wet.gain.value=.16;bus.connect(delay);delay.connect(wet);wet.connect(main);echo=delay}}catch{}
   ctx.onstatechange=()=>{if(audio!==ctx)return;if(ctx.state==='running'){nextBeat=ctx.currentTime;lastSfx={}}audioUI()};
  }
  master.gain.value=sound?.58:0;
  if(!audioRunning()){
   const ctx=audio;
   const ready=()=>{if(audio!==ctx)return;nextBeat=ctx.currentTime;lastSfx={};audioUI();if(audioRunning()){music();if(sound)sfx('serve')}};
   const pending=ctx.resume();if(pending?.then)pending.then(ready).catch(()=>audioUI());else ready();
  }
  audioUI();
 }catch{audioUI()}
}
// Touch release is a user activation even when dragging suppresses synthetic clicks.
function recoverAudio(e){if(e?.target?.closest?.('#sound,#bgm'))return;if(sound&&!audioRunning())unlockAudio()}
for(const event of ['touchend','pointerup','click','keydown'])document.addEventListener(event,recoverAudio,{passive:true});
window.addEventListener('pageshow',()=>{if(audio&&sound)unlockAudio()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&audio&&sound)unlockAudio()});

function tone(f,d=.1,type='square',vol=.08,delay=0,music=false,endFreq=0){if(!audioRunning()||!sound)return;let t=audio.currentTime+delay,o=audio.createOscillator(),v=audio.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(15,endFreq),t+d);o.connect(v);v.connect(music?musicBus:master);v.gain.setValueAtTime(vol,t);v.gain.exponentialRampToValueAtTime(.001,t+d);o.start(t);o.stop(t+d+.01)}
function noise(d=.09,vol=.08,delay=0,mus=false){if(!audioRunning()||!sound||!audio.createBuffer)return;if(!noiseBuffer){noiseBuffer=audio.createBuffer(1,audio.sampleRate*.5,audio.sampleRate);let a=noiseBuffer.getChannelData(0),hold=0;for(let i=0;i<a.length;i++){if(i%5===0)hold=Math.random()*2-1;a[i]=hold}}let o=audio.createBufferSource(),v=audio.createGain(),t=audio.currentTime+delay;o.buffer=noiseBuffer;o.connect(v);v.connect(mus?musicBus:master);v.gain.setValueAtTime(vol,t);v.gain.exponentialRampToValueAtTime(.001,t+d);o.start(t);o.stop(t+d)}
function sfx(name){if(!audioRunning()||!sound)return;let now=audio.currentTime;if(now-(lastSfx[name]??-10)<({wall:.085,hit:.065,kill:.065,fire:.15,evade:.14}[name]||0))return;lastSfx[name]=now;
if(name==='evade'){tone(980,.035,'triangle',.052,0,false,550);noise(.028,.018);return;}
if(name==='spit'){tone(460,.11,'sawtooth',.052,0,false,135);noise(.07,.032);return;}
if(name==='poison'){tone(190,.24,'triangle',.14,0,false,54);noise(.12,.04);return;}
if(name==='block'){tone(650,.07,'triangle',.07,0,false,215);return;}
const sounds={launch:[55,67,79],blast:[36,48,55],serve:[72,79,84],wall:[67],racket:[79,86,91],car:[76,83,88],citizen:[84,79,67],return:[72,76,79,84,91],bosshit:[43,55,62],powerhit:[55,67,79],hit:[60,67],kill:[72,76,79],item:[72,76,79,84,88],expire:[72,67],miss:[64,60,55],start:[60,64,67,72,76,79],wave:[60,64,67,72,79,84],boss:[43,50,55,62],bosskill:[60,67,72,76,79,84,88],fire:[55,62],shield:[79,84,91],pause:[72,67],over:[67,64,60,55]};const notes=sounds[name]||[72],rise=['kill','hit','powerhit'].includes(name)?Math.min(7,Math.floor(combo/2)):0,comboGain=1+Math.min(combo,10)*.025,spacing=Math.max(.024,.045-Math.min(combo,10)*.002),accent=['item','return','wave','bosskill','start'].includes(name);
notes.forEach((n,i)=>{tone(hz(n+rise),accent?.16:.085,'triangle',name==='wall'?.035:.1*comboGain,i*spacing);if(name!=='wall')tone(hz(n+rise),.055,'square',.023*comboGain,i*spacing)});
if(['racket','car','citizen'].includes(name))tone(500,.065,'square',.045,0,false,1250);
if(['hit','kill','powerhit','bosshit'].includes(name)){tone(name==='kill'?160:110,.07,'triangle',.15,0,false,45);noise(.035,.04)}
if(name==='launch'){tone(180,.14,'sawtooth',.07,0,false,650);noise(.06,.08)}if(name==='blast'){tone(110,.22,'sine',.2,0,false,30);noise(.18,.1)}if(name==='fire'){noise(.07,.055);tone(160,.08,'triangle',.07,0,false,420)}
if(accent){[0,4,7].forEach(n=>tone(hz(60+n),.35,'triangle',.045,.07));tone(145,.19,'sine',.18,0,false,42);if(name==='wave'||name==='bosskill')noise(.16,.06,.12)}
if(name==='boss'){tone(82,.32,'triangle',.16,0,false,41);noise(.13,.055)}
if(name==='bosshit'){tone(95,.11,'triangle',.18,0,false,35);noise(.045,.065)}if(name==='powerhit')tone(165,.09,'triangle',.18,0,false,50);
if(name==='miss')tone(250,.18,'triangle',.12,0,false,70);}
const THEMES=[{name:'SUNNY RALLY',root:60,chords:[0,5,7,0],mel:[12,19,16,19,24,19,16,14,12,16,19,21,19,16,14,7]}, {name:'TURBO PARADE',root:57,chords:[0,5,7,5],mel:[12,16,19,21,24,21,19,16,14,17,21,24,23,19,16,14]}, {name:'VICTORY DRIVE',root:62,chords:[0,7,5,0],mel:[19,19,21,19,16,12,14,16,24,23,21,19,16,14,11,12]}, {name:'BOSS RUSH',root:50,chords:[0,5,7,0],mel:[24,19,24,27,24,19,22,19,24,27,31,27,26,22,19,15]}];
function music(){if(!audioRunning())return;musicBus.gain.value=mode==='playing'&&sound&&musicEnabled?.6:0;if(mode!=='playing'||!sound||!musicEnabled)return;const boss=foes.some(z=>z.boss),theme=THEMES[boss?3:(wave-1-Math.floor(wave/3))%3],tempo=boss?172:146+((wave-1)%3)*4,step=60/tempo/4;if(musicTheme!==theme.name){musicTheme=theme.name;beat=0;nextBeat=audio.currentTime;$('track').textContent='♫ '+theme.name}if(nextBeat<audio.currentTime-.2)nextBeat=audio.currentTime;
let guard=0;while(nextBeat<audio.currentTime+.09&&guard++<4){let i=beat%64,bar=Math.floor(i/16),sub=i%16,root=theme.root+theme.chords[bar],delay=Math.max(0,nextBeat-audio.currentTime),arp=boss?[0,7,12,15,19,15,12,7]:[0,7,12,16,19,16,12,7];
if([0,2,4,6,7,10,12,14].includes(sub)){let phrase=Math.floor(beat/64)%4,melody=root+theme.mel[(Math.floor(i/2)+(phrase%2)*4)%16]+(phrase===3&&sub>=12?12:0);tone(hz(melody),step*1.45,'square',.046,delay,true);if(bar===3||Math.floor(beat/64)%4===2)tone(hz(melody-12),step*1.6,'triangle',.065,delay,true)}
tone(hz(root+12+arp[sub%8]),step*.72,'square',.024,delay,true);
if(sub%2===0)tone(hz(root-12+([0,0,7,12][Math.floor(sub/4)])),step*1.7,'triangle',.23,delay,true);
if(sub===0||sub===6||sub===8||boss&&sub===10)tone(130,.13,'sine',.31,delay,true,32);
if(sub===4||sub===12){noise(.065,.105,delay,true);tone(200,.055,'triangle',.1,delay,true,85)}else noise(sub===14?.06:.018,sub%2===0?.028:.014,delay,true);if(bar===3&&sub>=13){noise(.035,.06,delay,true);tone(hz(root+12+(sub-13)*3),.055,'triangle',.055,delay,true)}
if(sub===0&&bar%2===0){[0,boss?3:4,7,12].forEach(n=>tone(hz(root+n),step*7,'triangle',.036,delay,true))}beat++;nextBeat+=step;}}
// V60 cube FX: short explosive square fragments. No circular markers, wedges or spikes.
function effect(x,y,color,size=45,text='',standardHit=false,shakeCamera=true){
 if(!fxEnabled)return;
 fx.push({x,y,color,size,text,t:0,life:text?.85:.26,visualLife:size>=100?.31:.21,seed:Math.random()*6.28,standardHit});
 if(fx.length>45)fx.shift();
 if(shakeCamera)cameraFeedback(size>=120?1.25:size>=70?.9:size>=45?.55:.3);
}
// V153: one base glyph + a faint additive text-only glow. Never postprocess
// the whole board or allocate an offscreen canvas for each HUD label.
function arcadeGlowText(word,x,y,blur=9){
 g.fillText(word,x,y);
 if(!fxEnabled)return;
 g.save();
 g.globalCompositeOperation='lighter';
 g.globalAlpha=(typeof g.globalAlpha==='number'?g.globalAlpha:1)*.25;
 g.shadowColor=g.fillStyle;g.shadowBlur=blur;
 g.fillText(word,x,y);
 g.restore();
}
function drawEffects(labels=false){
 if(!fxEnabled)return;
 for(const f of fx){
  const t=clamp(f.t/(f.visualLife||.22),0,1);
  if(!labels){
   if(t<1&&!f.standardHit)drawPixelBurst(f.x,f.y,t,f.size*.78,f.size>=90?25:14,f.seed||0,
      ['#fffdf0',f.color,f.color],0);
  }else if(f.text){
   const fade=Math.pow(1-clamp(f.t/f.life,0,1),.75);
   const latin=!/[\u3131-\uD79D]/.test(f.text);
   g.save();g.globalAlpha=fade;
   g.font=latin?'400 12px "Press Start 2P",monospace':'bold 15px monospace';
   g.textAlign='center';
   g.fillStyle='#081322';g.fillText(f.text,f.x+2,f.y-18-f.t*36+2);
   g.fillStyle=f.color;
   if(latin)arcadeGlowText(f.text,f.x,f.y-18-f.t*36,7);
   else g.fillText(f.text,f.x,f.y-18-f.t*36);
   g.restore();
  }
 }
}
// Shared self-contained square-particle pattern, deterministic within each impact.
function drawPixelBurst(x,y,t,radius,count,seed,palette,heading=0,particleScale=1,motionPower=.56,fadePower=1.3,glowScale=1){
 if(t>=1)return;
 const fade=Math.pow(1-t,fadePower),travel=Math.pow(t,motionPower);
 g.save();g.translate(x,y);g.shadowColor=palette[1]||'#fff';g.shadowBlur=11*fade*glowScale;
 for(let i=0;i<count;i++){
  const angle=i*2.39996323+seed,cos=Math.cos(angle),sin=Math.sin(angle);
  const jitter=.65+.43*(.5+.5*Math.sin(i*19.17+seed*7.3));
  const bias=1+.16*Math.cos(angle-heading);
  const distance=(3+radius*travel*jitter)*bias;
  const box=Math.max(3,Math.round((i%5===0?10:i%3===0?8:6)*(1-t*.56)*particleScale));
  const px=Math.round(cos*distance-box/2),py=Math.round(sin*distance-box/2);
  g.fillStyle=palette[i%palette.length];
  g.globalAlpha=fade*(i%4===0?1:.91);
  g.fillRect(px,py,box,box);
  if(i%3===0&&t<.77){
   const d=distance*.68;
   g.globalAlpha=fade*.45;g.fillRect(Math.round(cos*d-1),Math.round(sin*d-1),Math.max(1,box-2),Math.max(1,box-2));
  }
 }
 if(t<.24){
  const core=(t<.08?20:t<.15?14:7)*(1-Math.max(0,t-.15));
  g.globalAlpha=(1-t/.24)*.92;g.fillStyle='#fffefa';
  g.fillRect(-core/2,-core/2,core,core);
 }
 g.restore();
}

function icon(k){return '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+SKILLS[k].icon+'</svg>'}
// Previous timer cards are intentionally gone. Effects are communicated
// through tiny, image-only badges anchored to the moving car inside canvas.
function skillUI(){
 const el=$('skills');
 if(!el)return;
 if(el.innerHTML)el.innerHTML='';
 if(!el.hidden)el.hidden=true;
}
let DEFENSE_Y=565;
let runMode='campaign',endlessUnlocked=false,lastStandUsed=false,resistFlash=0,failureScene=null,lastLostBall=null;
let lastStandCount=0,lastStandLastAt=-1e9;
try{endlessUnlocked=localStorage.getItem('zb-endless-unlocked')==='1'}catch{}
// Selection opens endless; results return to the character picker.
function endlessUI(){
 const el=$('endless');
 el.hidden=mode!=='menu'&&mode!=='over';
 if(mode==='menu'){
  el.textContent='ENDLESS WAVE';
  el.setAttribute('aria-label','선택한 캐릭터로 엔드리스 모드 시작');
  el.onclick=()=>start('endless');
 }else if(mode==='over'){
  el.textContent='MAIN MENU';
  el.setAttribute('aria-label','캐릭터 선택 화면으로 돌아가기');
  el.onclick=backToSelection;
 }else el.onclick=null;
}
const STAND_BANNER_SECONDS=2.45,STAND_WAVE_SECONDS=.64,STAND_MOVE_SECONDS=.66;
const standRetreat=[];
function updateStandRetreat(){
 const elapsed=STAND_BANNER_SECONDS-resistFlash;
 for(const move of standRetreat){
  const t=clamp((elapsed-move.delay)/STAND_MOVE_SECONDS,0,1);
  if(t>0&&!move.started){
   move.started=true;
   move.z.flash=.12;move.z.hitAt=clock;
   burst(move.z.x+move.z.w/2,move.z.y+move.z.h*.75,'#9debea',4);
  }
  const ease=t*t*(3-2*t);
  move.z.y=move.from+(move.to-move.from)*ease;
 }
 if(elapsed>=STAND_WAVE_SECONDS+STAND_MOVE_SECONDS)standRetreat.length=0;
}
const STAND_DANGER_DISTANCE=16,STAND_DANGER_SECONDS=2.8;
function standReady(){
 if(!window.ZZProgression)return !lastStandUsed;
 return lastStandCount<window.ZZProgression.lastStandUses()&&clock-lastStandLastAt>=15&&standRetreat.length===0;
}
let standDangerTime=0;
function updateStandDanger(dt){
 standDangerTime=0;
 if(wave<20||!standReady())return;
 for(const z of foes){
  if(z.y+z.h<DEFENSE_Y-STAND_DANGER_DISTANCE){
   z.standDangerTime=0;
   continue;
  }
  z.standDangerTime=(z.standDangerTime||0)+dt;
  standDangerTime=Math.max(standDangerTime,z.standDangerTime);
 }
 if(standDangerTime>=STAND_DANGER_SECONDS)triggerLastStand();
}
function triggerLastStand(){if(wave<20||!standReady()||standDangerTime<STAND_DANGER_SECONDS)return false;standDangerTime=0;lastStandCount++;lastStandLastAt=clock;lastStandUsed=window.ZZProgression?lastStandCount>=window.ZZProgression.lastStandUses():true;resistFlash=STAND_BANNER_SECONDS;
 const standDistance=window.ZZProgression?.lastStandDistance?.()??180;
 const sorted=[...foes].sort((a,b)=>a.y-b.y),placed=[];
 let front=-Infinity,back=Infinity;
 for(const z of sorted){const edge=z.y+z.h;front=Math.max(front,edge);back=Math.min(back,edge);standRetreat.push({z,from:z.y,edge,to:0,delay:0,started:false});}
 for(const z of sorted){if(Number.isFinite(z.breakoutTime)){delete z.breakoutTime;delete z.breakoutDuration;z.moveDir=0;z.col=Math.max(0,Math.min(ENEMY_COLUMNS-1,Math.round((z.x-ENEMY_LEFT_X)/ENEMY_PITCH)));z.breakoutCooldownUntil=clock+4}const old=z.y;let y=Math.max(ENEMY_TOP_Y,z.y-standDistance);for(const above of placed)if(!(Number.isInteger(z.row)&&z.row===above.row)&&z.x-8<above.x+above.w+8&&z.x+z.w+8>above.x-8)y=Math.max(y,above.y+above.h+(z.boss?25:10));z.y=Math.max(ENEMY_TOP_Y,Math.min(old,y));z.knockTime=0;placed.push(z)}
 // Crowded late-stage boss formations may hit the upper packing boundary and
 // leave a front enemy too close after the first push. Translate the entire
 // already-spaced formation to guarantee a visible 125px recovery window,
 // preserving collision order and every zombie's HP.
 if(foes.length){
  const furthest=Math.max(...foes.map(z=>z.y+z.h));
  const extra=Math.max(0,furthest-(DEFENSE_Y-(window.ZZProgression?Math.min(standDistance,125):125)));
  // Never pull the highest zombie above its original first-spawn line.
  // Compress the formation as far as possible without floating over the scenery.
  const available=Math.max(0,Math.min(...foes.map(z=>z.y-ENEMY_TOP_Y)));
  const retreat=Math.min(extra,available);
  if(retreat>0)for(const z of foes)z.y-=retreat;
 }
 for(const move of standRetreat){
  move.to=move.z.y;
  move.z.y=move.from;
  move.delay=STAND_WAVE_SECONDS*(front-move.edge)/Math.max(1,front-back);
 }
 sfx('bosskill');feedback('lastStand');return true}
function finishCampaign(){$('result-stage-label').textContent='도달 스테이지';endlessUnlocked=true;try{localStorage.setItem('zb-endless-unlocked','1')}catch{}mode='over';best=Math.max(best,score);try{localStorage.setItem('zr-best',best)}catch{}$('result-stage').textContent='50 스테이지 완주';$('result-cleared').textContent='50개 스테이지 클리어';$('result-score').textContent=String(score);$('result-best').textContent=String(best);overlay('50 STAGES<br><em>CLEAR!</em>','도시를 지켜냈습니다! 메인 메뉴에서 다음 도전을 선택하세요.','PLAY AGAIN','VICTORY');endlessUI();sfx('wave');feedback('victory')}
function drawDanger(){if(standRetreat.length)return;if(mode!=='playing'||balls[0]?.held||!foes.length)return;const nearest=foes.reduce((a,b)=>a.y+a.h>b.y+b.h?a:b);if(nearest.y+nearest.h<DEFENSE_Y-70)return;if(standDangerTime>0){
  const urgency=Math.min(1,standDangerTime/STAND_DANGER_SECONDS);
  g.save();g.globalAlpha=.8+.2*Math.sin(clock*(8+urgency*4));
  rect(20,DEFENSE_Y-3,410,6,'#ff425e');
  rect(W/2-104,DEFENSE_Y+5,208,23,'#30131cec');
  g.fillStyle='#fff0c9';g.textAlign='center';g.font='bold 15px Arial,sans-serif';
  g.fillText('방어선 위기! 좀비를 밀어내세요',W/2,DEFENSE_Y+22);
  g.restore();return;
 }
 g.save();g.globalAlpha=.55+.25*Math.sin(clock*9);rect(20,DEFENSE_Y-2,410,4,'#ff6278');g.fillStyle='#ffe5ba';g.textAlign='center';g.font='bold 13px Arial, sans-serif';g.fillText('위험! 좀비가 방어선에 접근 중',225,DEFENSE_Y-12);g.restore()}
function drawOutcome(){if(resistFlash>0){
 const elapsed=STAND_BANNER_SECONDS-resistFlash;
 const pulse=.5+.5*Math.cos(elapsed*12);
 g.save();g.globalAlpha=Math.min(1,resistFlash/.4);
 rect(20,DEFENSE_Y-5,410,10,'#103735');
 rect(20,DEFENSE_Y-2,410,4,'#84ffdb');
 for(let x=22;x<430;x+=24)rect(x,DEFENSE_Y-7,12,3,'#caffef');
 if(elapsed<1.3){
  g.save();g.globalAlpha*=.65*(1-elapsed/1.3);
  g.strokeStyle='#aeffed';g.lineWidth=5;g.beginPath();
  g.arc(W/2,DEFENSE_Y,18+elapsed*410,Math.PI,2*Math.PI);g.stroke();g.restore();
 }
 const y=DEFENSE_Y-54;
 rect(W/2-112,y-21,224,55,'rgba(8,32,36,.90)');
 rect(W/2-112,y-21,224,2,'#84ffdb');
 g.textAlign='center';g.fillStyle='#e3fff5';g.font='400 19px "Press Start 2P",monospace';
 arcadeGlowText('LAST STAND!',W/2,y,4+pulse*3);
 g.fillStyle='#9affd6';g.font='bold 17px Arial,sans-serif';
 g.fillText('방어선 사수!',W/2,y+24);g.restore();
 }
 if(!failureScene)return;const f=failureScene;g.save();rect(20,16,410,H-20,'#160d2444');g.strokeStyle='#ff6278';g.lineWidth=4;
 if(f.type==='breach'){rect(20,DEFENSE_Y-3,410,6,'#ff546c');g.beginPath();g.arc(f.x,f.y,42+Math.sin(f.t*15)*4,0,Math.PI*2);g.stroke();g.fillStyle='#ffd8ce';g.font='bold 14px Arial, sans-serif';g.textAlign='center';g.fillText('이 적이 방어선을 돌파했습니다',225,DEFENSE_Y+26)}else{g.beginPath();g.moveTo(f.x,H-95);g.lineTo(f.x,H-11);g.stroke();poly([[f.x-12,H-28],[f.x,H-8],[f.x+12,H-28]],'#ff7182');g.textAlign='center';g.font='bold 25px Arial, sans-serif';g.fillStyle='#ff9b9b';g.fillText('♡  0',225,H-55)}
 rect(38,264,374,142,'#251827ed');g.fillStyle='#ffad9f';g.font='bold 25px Arial, sans-serif';g.textAlign='center';g.fillText(f.type==='breach'?'방어선 돌파!':'마지막 공을 놓쳤습니다!',225,299);g.font='bold 14px Arial, sans-serif';g.fillStyle='#fff0d4';g.fillText(f.type==='breach'?'하트가 남아 있어도':'남은 하트가 0이 되어',225,329);g.fillText(f.type==='breach'?'방어선이 뚫리면 패배합니다.':'게임이 종료됩니다.',225,350);g.fillText((runMode==='endless'?'생존 '+survivalClock(endlessSurvival):'STAGE '+wave)+' · SCORE '+String(score),225,382);g.restore()}
function hud(){
 document.documentElement?.classList?.toggle?.('zz-endless-hud',runMode==='endless');
 $('survival-metric').hidden=runMode!=='endless';
 $('survival-time').textContent=survivalClock(endlessSurvival);
 $('wave-label').textContent=runMode==='endless'?'WAVE':'현재 스테이지';
 $('score').textContent=String(score);
  // Long scores scale gently within their fixed HUD column, never ellipsize.
  $('score').style?.setProperty?.('--zz-score-shrink',String(Math.min(1,6/Math.max(6,score.toString().length))));
 $('wave-number').textContent=runMode==='endless'?String(wave-50):String(wave).padStart(2,'0');
 $('progress').textContent=runMode==='endless'?'':(wave-1)+'/50 스테이지 클리어';
 // Only one prominent 3D voxel heart in the upper-left; a high-contrast
 // number tells the player exactly how many lives remain.
 const heart=$('hud-hearts');
 $('hud-heart-count').textContent='×'+Math.max(0,lives);
 heart.setAttribute('aria-label','남은 생명 '+Math.max(0,lives)+'개');
 heart.style.opacity=lives>0?'1':'.42';
 // Keep the historical node for script/test compatibility, but it is hidden
 // so lives never render twice in the footer.
 $('lives').textContent='';
 // The on-board service hint and ball text are both removed: the touch input
 // still launches the held ball and the top heart HUD still shows lives.
 $('status').textContent='';
 skillUI();
}
// No bottom-left situational text overlays: the game already communicates
// through sprites, the heart HUD, and the citizens' own speech balloons.
function toast(t){const el=$('toast');if(el){el.textContent='';el.style.opacity=0}}
// A separate density meter controls rare actual diagonal breakouts, not UI.
let waveInitialRegulars=0,breakoutNextCheck=0;
// Green is always the majority. New colors arrive in order:
// yellow (4), red (9), black (16); each gradually increases from 1 to 3.
// The exploding red barrel is a rare tactical target (1–2 per stage).
const STAGE_SPECIALS=[
 {form:1,at:[6,18]},        // red exploding barrel
 {form:7,at:[4,8,15]},      // yellow brain cube
 {form:3,at:[9,16,23]},     // red brain cube
 {form:6,at:[16,25,35]},    // black brain cube
 {form:4,at:[24]},          // packaging cameo
 {form:5,at:[28]},          // wooden crate cameo
 {form:2,at:[32]}           // black barrel cameo
];
// Distinct elite durability/tempo. 50L is the durable bruiser, the bottle is evasive.
const ELITE_FIRST_STAGES=[3,5,7];
const ELITE_HP_BONUS=[9,13,7];
const ELITE_COOLDOWN=[2.7,4.1,1.65];
function insertEliteZombies(regulars,stage){
 const atlas=window.ZZEliteSprites;
 if(!atlas)return;
 const eligible=ELITE_FIRST_STAGES.map((unlock,i)=>({i,unlock})).filter(e=>stage>=e.unlock&&atlas.cache[e.i]?.ready);
 if(!eligible.length)return;
 const available=regulars.filter(z=>!z.boss&&z.form===0);
 const count=Math.min(stage<5?1:stage<9?2:stage<18?3:4,Math.floor(regulars.length*.15),available.length);
 if(!count)return;
 const newest=eligible.find(e=>e.unlock===stage),picks=newest?[newest.i]:[];
 while(picks.length<count){
   let dice=Math.random()*eligible.reduce((n,e)=>n+(e.i===0?4:e.i===1?3:2),0);
   let pick=eligible[0].i;
   for(const e of eligible)if((dice-=e.i===0?4:e.i===1?3:2)<0){pick=e.i;break}
   picks.push(pick);
 }
 let free=available.slice();
 for(const kind of picks){
   if(!free.length)break;
   const [z]=free.splice(Math.floor(Math.random()*free.length),1);
   z.eliteKind=kind;
   // Initial throw delay is set lazily when an elite enters active combat.
   z.hp=z.max=Math.min(runMode==='endless'?24:29,
     zombieHP(0,z.kind,stage)+ELITE_HP_BONUS[kind]+Math.floor(Math.max(0,stage-6)/13));
   free=free.filter(other=>other.row!==z.row||Math.abs(other.col-z.col)>1);
 }
}
function stageRoster(stage,slots){
 const cap=Math.floor(slots*.42); // >=58% regular green even on short foldable screens.
 const activeSpecs=STAGE_SPECIALS.map(spec=>({
  form:spec.form,want:spec.at.filter(at=>stage>=at).length
 })).filter(spec=>spec.want>0);
 const chosen=[],counts={};
 // Each newly unlocked form gets an initial one-character appearance.
 for(const spec of activeSpecs)if(chosen.length<cap){chosen.push(spec.form);counts[spec.form]=1}
 // Later stages gradually add a second and third of each colored form.
 for(let tier=2;tier<=3&&chosen.length<cap;tier++)
  for(const spec of activeSpecs)
   if(chosen.length<cap&&spec.want>=tier){
    chosen.push(spec.form);counts[spec.form]=(counts[spec.form]||0)+1;
   }
 return chosen;
}
function stageFeaturedForm(stage){
 let best=0;
 for(let i=1;i<ZOMBIE_FORMS.length;i++)
  if(ZOMBIE_FORMS[i].unlock<=stage&&
    ZOMBIE_FORMS[i].unlock>ZOMBIE_FORMS[best].unlock)best=i;
 return best;
}
function stageRosterLabel(stage){
 const latest=stageFeaturedForm(stage);
 return stage>1&&ZOMBIE_FORMS[latest].unlock===stage
  ? 'NEW · '+ZOMBIE_FORMS[latest].name
  : '그린 좀비 중심 대열';
}
// Character durability is independent from palette/tier; green survives
// several normal hits and featured variants endure longer without boss HP.
function zombieHP(form,kind=0,stage=wave){
 // Opening two stages use low durability before the full progression starts.
 const base=(stage<=2?2:3)+(stage>=20?1:0)+(stage>=38?1:0);
 const tier=Math.floor(kind/2);
 const bonus=[0,2,3,3,2,2,4,2][form??0]??0;
 return base+tier+bonus;
}
// Distinct original enemy silhouettes remain visible in every endless wave.
// Only one explosive barrel is included in each large formation.
const ENDLESS_CAST=[7,3,6,4,5,2,1,7,3,6,4,5,2,7,3,6,4,5,2,7,3];
function setStageForms(regulars,stage){
 const forms=runMode==='endless'
  ?ENDLESS_CAST.slice(0,Math.floor(regulars.length*.62))
  :stageRoster(stage,regulars.length);
 // Shuffle slots, not the counts: no stage ever fills randomly with rare types.
 const available=regulars.slice();
 for(let i=available.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [available[i],available[j]]=[available[j],available[i]];
 }
 const deployedBarrels=[];
 for(const form of forms){
  let index=available.findIndex(z=>form!==1||z.row>0&&
    deployedBarrels.every(other=>Math.hypot(z.x-other.x,z.y-other.y)>95));
  if(index<0)index=available.findIndex(z=>form!==1||
    deployedBarrels.every(other=>Math.hypot(z.x-other.x,z.y-other.y)>65));
  if(index<0)index=0;
  const [z]=available.splice(index,1);
  if(!z)break;
  z.form=form;
  if(form===1)deployedBarrels.push(z);
 }
 for(const z of regulars){
  const hp=zombieHP(z.form,z.kind,stage);
  z.hp=z.max=runMode==='endless'
   ?Math.min(hp,3+Math.floor(Math.max(0,endlessWaveNumber()-1)/3))
   :hp;
 }
}
// Endless wave numbers are UI/progression counters, not campaign difficulty.
// Start like an early-mid campaign stage, then climb steadily across waves.
function combatStage(){
 return runMode==='endless'?Math.min(50,6+Math.floor(Math.max(0,wave-51)*.9)):wave;
}
function endlessWaveNumber(){return wave-50}
function isBossWave(){
 return runMode==='endless'?endlessWaveNumber()%3===0:wave%3===0;
}
function bossIndex(){
 return runMode==='endless'?Math.floor((endlessWaveNumber()-1)/3):Math.floor(wave/3)-1;
}
function requestBossForWave(nextWave){
 const ordinal=runMode==='endless'?nextWave-50:nextWave;
 if(ordinal>0&&ordinal%3===0)
  window.ZZLargeBossSprites?.requestByForm(Math.floor((ordinal-1)/3)%BOSS_FORMS.length);
}
// Only hold the short stage transition if this specific new boss is still decoding.
function nextBossArtLoading(nextWave){
 const ordinal=runMode==='endless'?nextWave-50:nextWave;
 if(ordinal<=0||ordinal%3!==0)return false;
 const form=Math.floor((ordinal-1)/3)%BOSS_FORMS.length;
 const sprites=window.ZZLargeBossSprites;
 return form>=2&&!!sprites&&sprites.readyByForm(form)!==true&&
   sprites.cache?.[form-2]?.loading===true;
}
function rack(){
 standRetreat.length=0;standDangerTime=0;resistFlash=0;
 if(window.ZZProgression){lastStandCount=0;lastStandUsed=false;lastStandLastAt=-1e9;}
 bossTrashShots.length=0;
 eliteTrashSharedReadyAt=clock+4.4;spitSharedNextAt=clock+4.8;
 poison=0;poisonGrace=0;groggyTime=0;poisonFlash=0;poisonGaugeAlpha=0;
 dodgeGhosts.length=0;
 foes=[];stageDelay=0;fireDropsThisWave=0;stageLootCount=0;stageLootKinds=[];
 supportDropsThisWave=0;endlessEmergencyUsed=false;supportDangerTime=0;
 const stage=combatStage();
 window.ZZEliteSprites?.requestForStage(stage);
 // Prefetch only the imminent boss (including its separate right walk).
 requestBossForWave(wave);requestBossForWave(wave+1);
 // A full four-row, mixed-cast opening; HP and movement scale independently.
 const rows=runMode==='endless'
  ?4
  :wave===1?2:Math.min(4,Math.max(2,Math.min(
   Math.floor((DEFENSE_Y-142)/ENEMY_ROW_PITCH)+1,
   Math.max(3,Math.round(Math.min(5,3+Math.floor(wave/2))*7/ENEMY_COLUMNS))
  )));
 const bossStage=isBossWave();
 const requestedBossForm=bossIndex()%BOSS_FORMS.length;
 // Boss identity must never change because of asynchronous PNG decoding.
 const bossForm=bossStage?requestedBossForm:0;
 for(let r=0;r<rows;r++)for(let col=0;col<ENEMY_COLUMNS;col++){
  if(bossStage&&r<(bossForm===3?3:2)&&Math.abs(col-4)<=1)continue;
  const maxKind=Math.min(4,1+Math.floor(stage/2));
  const kind=Math.floor(Math.pow(Math.random(),Math.max(.45,1.7-stage*.12))*(maxKind+1));
  const hp=zombieHP(0,kind,stage);
  foes.push({x:ENEMY_LEFT_X+col*ENEMY_PITCH,y:70+r*ENEMY_ROW_PITCH,
   row:r,col,w:33,h:44,hp,max:hp,kind,form:0,flash:0,
   seed:Math.random()*20,burn:0,burnTick:0,spreadTick:0});
 }
 setStageForms(foes,stage);
 insertEliteZombies(foes,stage);
 if(bossStage){
  // Tighter boss/elite HP spread: a threat, not the only target left for minutes.
  const baseHP=Math.round(26+Math.min(stage,12)*1.45+Math.max(0,stage-12)*.48);
  // Easily struck, but a proper durable trash-bag boss with no dodge.
  const hp=bossForm===3?Math.round(baseHP*3.6):baseHP;
  // Identity is stable; a pending new-boss bitmap is never substituted.
  foes.push({x:bossForm===3?169:192,y:74,row:-1,col:4,
   w:bossForm===3?112:66,h:bossForm===3?124:88,hp,max:hp,kind:4,
   form:3,bossForm,boss:true,flash:0,seed:0,burn:0,burnTick:0,spreadTick:0});
  sfx('boss');feedback('bossSpawn');effect(225,130,'#ff687e',145,BOSS_FORMS[bossForm]);
 }
 $('encounter').textContent=(runMode==='endless'?'ENDLESS '+endlessWaveNumber():'STAGE '+wave)
  +' · '+(bossStage?BOSS_FORMS[bossForm]:stageRosterLabel(stage))
  +' / 진군 속도 '+marchBase().toFixed(1);
 waveInitialRegulars=foes.filter(z=>!z.boss).length;
 breakoutNextCheck=clock+.85;
}
function marchBase(){const stage=Math.min(50,combatStage()),n=Math.min(9,Math.max(0,stage-1)),late=Math.max(0,stage-10);return 2.7+.22*n+.006*n*n+.07*late+.0008*late*late+(runMode==='endless'?Math.min(4,Math.max(0,endlessWaveNumber()-1)*.035):0)}
function enemySpeed(z){
 const seed=Number.isFinite(z.seed)?z.seed:0;
 const pace=Number.isFinite(z.seed)?.80+.43*((seed*.61803398875)%1):1;
 const pulse=Number.isFinite(z.seed)?1+.14*Math.sin(clock*.8+seed*1.73):1;
 return marchBase()*(z.boss?(z.bossForm===3?.44:.62):[1.1,1.04,.97,.89,.82][z.kind])*
   pace*pulse*enemySlowRate();
}
// Frequent short physical steps blend down/front/left/right animations even
// while the full horde is intact. The sprites face the ACTUAL movement vector.
const BREAKOUT_DENSITY=.86,BREAKOUT_MIN_KILLS=3,BREAKOUT_MAX_ACTIVE=3;
function tryStartBreakouts(){
 if(clock<breakoutNextCheck)return;
 breakoutNextCheck=clock+.8+Math.random()*.7;
 const living=foes.filter(z=>!z.boss),activeCount=living.filter(z=>Number.isFinite(z.breakoutTime)).length;
 if(activeCount>=BREAKOUT_MAX_ACTIVE||waveInitialRegulars<9||
    waveInitialRegulars-living.length<BREAKOUT_MIN_KILLS||
    living.length>waveInitialRegulars*BREAKOUT_DENSITY)return;
 // More deliberate breakthroughs as the formation opens up, but never random
 // sideways animations without actual diagonal displacement.
 if(Math.random()>.82)return;
 const chosen=[],available=foes.filter(z=>!z.boss);
 const occupied=new Set(available.filter(z=>Number.isInteger(z.row)&&Number.isInteger(z.col))
  .map(z=>z.row+':'+z.col));
 const density=living.length/waveInitialRegulars;
 const capacity=Math.min(BREAKOUT_MAX_ACTIVE-activeCount,
   density<.52?3:density<.72?2:1);
 const count=1+(capacity>1&&Math.random()<.7?1:0)+
   (capacity>2&&Math.random()<.36?1:0);
 for(let k=0;k<count;k++){
  const choices=[];
  for(const z of living){
   if(Number.isInteger(z.eliteKind)||chosen.some(c=>c.z===z||c.z.row===z.row)||Number.isFinite(z.breakoutTime)||
      !Number.isInteger(z.col)||!Number.isInteger(z.row)||
      z.row===0||z.y+z.h>=DEFENSE_Y-125||
      (z.breakoutCooldownUntil||0)>clock||
      (z.hitHold||0)>0||(z.recoil||0)>.015)continue;
   for(const dir of [-1,1]){
    for(const distance of [1,2]){
     if(distance===2&&Math.random()<.32)continue;
     const destCol=z.col+distance*dir;
     if(destCol<0||destCol>=ENEMY_COLUMNS)continue;
     // The path must stay clear, not merely its destination.
     let free=true;
     for(let step=1;step<=distance;step++)
      if(occupied.has(z.row+':'+(z.col+dir*step)))free=false;
     if(!free)continue;
     const dest=ENEMY_LEFT_X+ENEMY_PITCH*destCol;
     if(dest<zombieMinX()||dest>zombieMaxX(z))continue;
     if(foes.some(other=>other!==z&&(
       other.boss&&Math.abs(other.x+other.w/2-(dest+z.w/2))<70&&
                     Math.abs(other.y+other.h/2-(z.y+z.h/2+25))<110
       )))continue;
     choices.push({z,destCol,dest,distance});
    }
   }
  }
  if(!choices.length)break;
  const pick=choices[Math.floor(Math.random()*choices.length)];
  const z=pick.z,duration=.30+Math.random()*.42;
  clearShortStep(z,duration+.65);
  z.breakoutTime=0;z.breakoutDuration=duration;
  z.breakoutVX=(pick.dest-z.x)/duration;
  z.breakoutVY=(22+Math.random()*42)/duration;
  z.breakoutTargetX=pick.dest;z.breakoutTargetCol=pick.destCol;
  z.breakoutCooldownUntil=clock+duration+1.5+Math.random()*2.2;
  chosen.push(pick);
  // Reserve destinations during this batch so multiple movers never converge.
  occupied.delete(z.row+':'+z.col);
  occupied.add(z.row+':'+pick.destCol);
 }
}

 // Per-zombie short diagonal footwork. In the packed nine-column formation,
 // +/-6px still leaves a gap between adjacent 33px collision rectangles.
 // 0.38–0.66s travel + 0.27–0.65s front-facing pause, per enemy.
 const SHORT_STEP_RADIUS=6;
 function shortStepNoise(z,salt){
   const n=(z.seed||0)*31.73+(z.col||0)*23.81+(z.row||0)*13.71+
     (z.shortStepCount||0)*17.13+salt*7.31;
   const value=Math.sin(n)*43758.5453;
   return value-Math.floor(value);
 }
 function clearShortStep(z,wait=.35){
   delete z.shortStepElapsed;delete z.shortStepDuration;
   delete z.shortStepFromX;delete z.shortStepTargetX;
   z.shortStepNext=clock+wait;
 }
 function shortDiagonalStep(z,dt){
   z.moveDir=0;
   if(z.boss||!Number.isInteger(z.row)||!Number.isInteger(z.col))return;
   if(z.shortStepCol!==z.col){
     z.shortStepCol=z.col;
     z.shortStepHomeX=ENEMY_LEFT_X+z.col*ENEMY_PITCH;
     clearShortStep(z,.22+shortStepNoise(z,1)*.5);
   }
   // Recoil, chain knockback and rare long breakout own movement first.
   if((z.recoil||0)>.015||(z.hitHold||0)>0||(z.knockTime||0)>0){
     if((z.knockTime||0)>0)z.shortStepHomeX=z.x;
     clearShortStep(z,.35);
     return;
   }
   if(!Number.isFinite(z.shortStepNext))
     z.shortStepNext=clock+.12+shortStepNoise(z,2)*.62;
   if(!Number.isFinite(z.shortStepElapsed)){
     if(clock<z.shortStepNext)return;
     z.shortStepCount=(z.shortStepCount||0)+1;
     let home=z.shortStepHomeX;
     if(!Number.isFinite(home)||Math.abs(z.x-home)>SHORT_STEP_RADIUS+4){
       home=z.x;z.shortStepHomeX=home;
     }
     const magnitude=4+shortStepNoise(z,3)*2;
     const sign=shortStepNoise(z,4)<.5?-1:1;
     let dest=clamp(home+sign*magnitude,zombieMinX(),zombieMaxX(z));
     if(Math.abs(dest-z.x)<3)
       dest=clamp(home-sign*magnitude,zombieMinX(),zombieMaxX(z));
     if(Math.abs(dest-z.x)<2||!canKnockback(z,dest,z.y)){
       z.shortStepNext=clock+.24+shortStepNoise(z,5)*.38;
       return;
     }
     z.shortStepFromX=z.x;z.shortStepTargetX=dest;
     z.shortStepElapsed=0;
     z.shortStepDuration=.38+shortStepNoise(z,6)*.28;
   }
   const d=Math.min(dt*enemySlowRate(),
     z.shortStepDuration-z.shortStepElapsed);
   if(d<=0){clearShortStep(z,.3);return}
   const t=(z.shortStepElapsed+d)/z.shortStepDuration;
   const eased=t*t*(3-2*t); // eased turning, no position teleport
   const nextX=z.shortStepFromX+
     (z.shortStepTargetX-z.shortStepFromX)*eased;
   if(!canKnockback(z,nextX,z.y)){
     clearShortStep(z,.35+shortStepNoise(z,7)*.3);
     return;
   }
   const lastX=z.x;
   z.x=nextX;
   z.shortStepElapsed+=d;
   z.moveDir=Math.sign(z.x-lastX);
   if(z.shortStepElapsed>=z.shortStepDuration-1e-5)
     clearShortStep(z,.27+shortStepNoise(z,8)*.38);
 }
// V71: The boss roams only when a wide, safely traversable lane opens.
// Its long lateral sweeps use ordinary sprite movement with modest depth jukes.
const BOSS_SWEEP_MIN=84,BOSS_SWEEP_MAX=190,BOSS_SWEEP_SPEED=118,BOSS_DEPTH_SWAY=18;
function bossPatrolFree(z,x,y,gap=8){
 if(!insideZombieRoad(z,{x,y}))return false;
 return foes.every(other=>other===z||
  !zombieBoxesOverlap(z,{x,y},other,{x:other.x,y:other.y},gap));
}
function bossPatrolCorridor(z,x,y){
 const dx=x-z.x,dy=y-z.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/9));
 for(let i=1;i<=steps;i++){
  const t=i/steps;
  if(!bossPatrolFree(z,z.x+dx*t,z.y+dy*t))return false;
 }
 return true;
}
function bossSelectPatrol(z){
 // Near the defense line the boss must continue advancing, not orbit forever.
 if(z.bossHomeY+z.h>DEFENSE_Y-60)return false;
 // Alternate a small forward/back step across successive wide sweeps.
 const depthChoice=[BOSS_DEPTH_SWAY,-BOSS_DEPTH_SWAY,0][(z.bossSweepCount||0)%3];
 const options=[];
 for(const direction of [-1,1]){
  for(const span of [BOSS_SWEEP_MAX,160,125,90]){
   const x=clamp(z.x+direction*span,zombieMinX(),zombieMaxX(z));
   const travel=Math.abs(x-z.x);
   if(travel<BOSS_SWEEP_MIN)continue;
   for(const offsetY of [-BOSS_DEPTH_SWAY,0,BOSS_DEPTH_SWAY]){
    const y=clamp(z.bossHomeY+offsetY,ENEMY_TOP_Y,DEFENSE_Y-z.h-38);
    if(!bossPatrolCorridor(z,x,y))continue;
    options.push({x,y,direction,
     score:travel+(direction===-z.bossLastDir?28:0)+(offsetY===depthChoice?19:0)+Math.random()*10-Math.abs(offsetY)*.25});
   }
  }
 }
 if(!options.length)return false;
 options.sort((a,b)=>b.score-a.score);
 const goal=options[0];
 z.bossGoalX=goal.x;z.bossGoalY=goal.y;
 z.bossGoalTime=clock+3.5;z.bossLastDir=goal.direction;
 z.bossSweepCount=(z.bossSweepCount||0)+1;
 return true;
}
function bossPatrolStep(z,dt){
 z.moveDir=0;
 const speed=BOSS_SWEEP_SPEED*(z.bossForm===3?.45:1)*enemySlowRate();
 if(!Number.isFinite(z.bossHomeY))z.bossHomeY=z.y;
 z.bossHomeY+=enemySpeed(z)*dt;
 const nearDefense=z.bossHomeY+z.h>DEFENSE_Y-60;
 if(nearDefense){delete z.bossGoalX;delete z.bossGoalY;}
 if(Number.isFinite(z.bossGoalX)&&clock>(z.bossGoalTime||0)){
  delete z.bossGoalX;delete z.bossGoalY;
 }
 if(!Number.isFinite(z.bossGoalX)&&!nearDefense&&clock>=(z.bossNextMove||0)){
  if(!bossSelectPatrol(z))z.bossNextMove=clock+.32;
 }
 if(Number.isFinite(z.bossGoalX)){
  const dx=z.bossGoalX-z.x,dy=z.bossGoalY-z.y,range=Math.hypot(dx,dy);
  const step=Math.min(range,speed*dt);
  const x=range>0?z.x+dx/range*step:z.x;
  const y=range>0?z.y+dy/range*step:z.y;
  if(bossPatrolCorridor(z,x,y)){
   const before=z.x;z.x=x;z.y=y;
   z.moveDir=Math.sign(z.x-before);
  }else{
   delete z.bossGoalX;delete z.bossGoalY;z.bossNextMove=clock+.22;
  }
  if(range<=step+.5){
   delete z.bossGoalX;delete z.bossGoalY;
   z.bossNextMove=clock+.22+Math.random()*.3;
  }
 }else{
  // Return toward the ordinary march baseline without accumulating Y drift.
  const dy=clamp(z.bossHomeY-z.y,-speed*.30*dt,speed*.30*dt);
  if(bossPatrolCorridor(z,z.x,z.y+dy))z.y+=dy;
 }
 if(nearDefense){
  // Preserve the boss's ability to break the defense line.
  const nextY=Math.max(z.y,z.bossHomeY-BOSS_DEPTH_SWAY);
  if(bossPatrolFree(z,z.x,Math.min(nextY,DEFENSE_Y-z.h-16),0))
   z.y=nextY;
 }
}
// Endless solo-boss mercy: retreat quickly once, then descend gradually.
// The collider follows the sprite throughout; ordinary boss motion resumes
// after the full descent. A second retreat is never granted for this boss.
const BOSS_MERCY_RETURN_SPEED=12.5; // px/s: about 14s to descend 175px.
function bossMercyStep(z,dt){
 if(runMode!=='endless'||!z.boss||foes.length!==1)return false;
 if(!z.mercyUsed&&z.y+z.h>=DEFENSE_Y-90){
  z.mercyUsed=true;
  z.mercyStartY=z.y;z.mercyEndY=Math.max(ENEMY_TOP_Y,z.y-175);
  z.mercyElapsed=0;z.mercyReturnY=z.mercyStartY;
  delete z.bossGoalX;delete z.bossGoalY;
  z.hitShakeUntil=0;z.knockTime=0;
  sfx('wave');effect(z.x+z.w/2,z.y+z.h/2,'#a9fce6',38);
 }
 if(Number.isFinite(z.mercyElapsed)){
  z.mercyElapsed=Math.min(.48,z.mercyElapsed+dt);
  const u=z.mercyElapsed/.48,ease=1-Math.pow(1-u,3);
  z.y=z.mercyStartY+(z.mercyEndY-z.mercyStartY)*ease;
  z.bossHomeY=z.y;z.moveDir=0;
  if(u>=1){
   delete z.mercyElapsed;delete z.mercyStartY;delete z.mercyEndY;
   z.mercyDescending=true;
  }
  return true;
 }
 if(z.mercyDescending){
  z.y=Math.min(z.mercyReturnY,z.y+BOSS_MERCY_RETURN_SPEED*dt);
  z.bossHomeY=z.y;z.moveDir=0;
  if(z.y>=z.mercyReturnY-.01){
   delete z.mercyDescending;delete z.mercyReturnY;
   z.bossNextMove=clock+.6;
  }
  return true;
 }
 return false;
}
// Elite tactics v148. Every impulse is real collider movement: never teleport,
// cross occupied lanes, create vector stand-ins, or alter the shared hitbox.
function eliteCorridorFree(z,dx,dy){
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6));
 for(let i=1;i<=steps;i++){
  const t=i/steps;
  if(!canKnockback(z,z.x+dx*t,z.y+dy*t))return false;
 }
 return true;
}
function beginEliteMotion(z,dx,dy,duration,tag,windup=.12,follow=null){
 if(!eliteCorridorFree(z,dx,dy))return false;
 clearShortStep(z,duration+windup+.45);
 z.eliteMotion={sx:z.x,sy:z.y,dx,dy,t:-windup,duration,tag,follow};
 z.eliteMoveCount=(z.eliteMoveCount||0)+1;
 return true;
}
function endEliteMotion(z,m){
 delete z.eliteMotion;
 // White 50L bag: deliberate retreat then a forward counter-charge.
 // Water bottle: one quick lateral dodge followed by an opposing zigzag.
 if(m.follow&&beginEliteMotion(z,m.follow.dx,m.follow.dy,
    m.follow.duration,m.follow.tag,m.follow.windup||0))return;
 const col=Math.round((z.x-ENEMY_LEFT_X)/ENEMY_PITCH);
 if(Math.abs(z.x-(ENEMY_LEFT_X+col*ENEMY_PITCH))<8)
  z.col=clamp(col,0,ENEMY_COLUMNS-1);
 z.shortStepHomeX=z.x;
 z.eliteNextMove=clock+(ELITE_COOLDOWN[z.eliteKind]??1.5)+Math.random()*.8;
}
function moveElite(z,dt){
 // Paper packaging uses the same collision-safe movement only when
 // a reactive dodge is triggered; it does not inherit regular elite AI.
 if(!Number.isInteger(z.eliteKind)&&z.form!==4)return false;
 if((z.eliteKind===0||z.eliteKind===1)&&z.throwWindup>0){z.moveDir=0;return true;}
 if(Number.isInteger(z.eliteKind)&&z.spitWindup>0){z.moveDir=0;return true;}
 if(z.eliteMotion){
  const m=z.eliteMotion,step=dt*enemySlowRate();
  const next=Math.min(m.duration,m.t+step);
  if(next<=0){m.t=next;z.moveDir=0;return true;}
  const u=clamp(next/m.duration,0,1);
  const ease=m.tag==='dash'||m.tag==='charge'
   ?1-Math.pow(1-u,2):u*u*(3-2*u);
  const nx=m.sx+m.dx*ease,ny=m.sy+m.dy*ease;
  const dx=nx-z.x,dy=ny-z.y;
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6));
  let clear=true;
  for(let i=1;i<=count;i++)
   if(!canKnockback(z,z.x+dx*i/count,z.y+dy*i/count)){clear=false;break}
  if(!clear){
   delete z.eliteMotion;z.moveDir=0;z.eliteNextMove=clock+1.05;
   return true;
  }
  const oldX=z.x;
  if(m.tag==='evade'&&u>=(m.nextGhost||.24)){
   pushDodgeGhost(z);
   m.nextGhost=(m.nextGhost||.24)+.27;
  }
  z.x=nx;z.y=ny;m.t=next;
  z.moveDir=Math.abs(nx-oldX)>.05?Math.sign(nx-oldX):0;
  if(next>=m.duration-1e-5)endEliteMotion(z,m);
  return true;
 }
 if(!Number.isInteger(z.eliteKind))return false;
 if(!Number.isFinite(z.eliteNextMove)){
  z.eliteNextMove=clock+.55+((z.seed||0)%3)*.29;
  return false;
 }
 if(clock<z.eliteNextMove)return false;
 if(z.y+z.h>DEFENSE_Y-105){
  z.eliteNextMove=clock+1.25;return false;
 }
 const direction=(Math.random()<.5?-1:1);
 let began=false;
 if(z.eliteKind===0){
  // Black trash bag: impatient diagonal ambush into a missing slot.
  for(const offset of [ENEMY_PITCH,ENEMY_PITCH*2,ENEMY_PITCH*.65]){
   for(const sign of [direction,-direction])
    if(beginEliteMotion(z,sign*offset,16+(z.seed||0)%9,
      .29+offset/ENEMY_PITCH*.07,'dash',.14)){
     began=true;break;
    }
   if(began)break;
  }
 }else if(z.eliteKind===1){
  // White 50L regulation bag: heavy backstep / feint / linear counter-charge.
  // It retreats only if there is physical room behind its box.
  began=beginEliteMotion(z,0,-20,.29,'backstep',.22,
    {dx:0,dy:31,duration:.37,tag:'charge',windup:.16});
  if(!began){
   // Heavy shoulder shove sideways when rear lanes are sealed.
   for(const sign of [direction,-direction])
    if(beginEliteMotion(z,sign*ENEMY_PITCH,3,.49,'charge',.22)){
     began=true;break;
    }
  }
 }else if(z.eliteKind===2){
  // Water bottle: evasive side-hop when an ascending ball approaches,
  // otherwise a smaller surprise zigzag through an open neighboring space.
  const threatened=balls.some(b=>!b.held&&b.vy<0&&
    Math.abs(b.x-z.x-z.w/2)<58&&Math.abs(b.y-z.y-z.h/2)<95);
  if(threatened||Math.random()<.42){
   for(const sign of [direction,-direction])
    if(beginEliteMotion(z,sign*ENEMY_PITCH,-10,.22,'dodge',.065,
      {dx:-sign*ENEMY_PITCH*.42,dy:5,duration:.20,tag:'zigzag',windup:0})){
     began=true;break;
    }
  }
 }
 if(!began){
  z.eliteNextMove=clock+.38+Math.random()*.48;return false;
 }
 return moveElite(z,dt);
}
// V150: short, lightweight bitmap echoes are stored only on real evasions.
// They render behind the new collider position and expire in under 0.2s.
const DODGE_GHOST_MAX=24,DODGE_GHOST_LIFE=.19;
const dodgeGhosts=[];
const DODGE_PROFILES=[
 {chance:.38,distance:39,duration:.135,cooldown:1.75}, // black trash bag
 {chance:.16,distance:28,duration:.19,cooldown:2.8},  // heavy white 50L bag
 {chance:.78,distance:57,duration:.105,cooldown:1.30}, // light water bottle
];
const PAPER_DODGE_PROFILE={chance:.72,distance:51,duration:.115,cooldown:1.52};
function dodgeProfile(z){
 if(z.boss)return null;
 if(Number.isInteger(z.eliteKind))return DODGE_PROFILES[z.eliteKind]||null;
 return z.form===4?PAPER_DODGE_PROFILE:null;
}
function pushDodgeGhost(z){
 if(dodgeGhosts.length>=DODGE_GHOST_MAX)dodgeGhosts.shift();
 dodgeGhosts.push({z:{...z,eliteMotion:null,recoil:0,hitHold:0,
   flash:0,burn:0,knockTime:0},t:0,life:DODGE_GHOST_LIFE});
}
function drawDodgeGhosts(){
 for(const ghost of dodgeGhosts){
  const fade=1-ghost.t/ghost.life;
  if(fade<=0)continue;
  g.save();
  g.globalAlpha=.32*fade*fade;
  g.filter='brightness(1.5) saturate(.7)';
  zombie(ghost.z); // original approved bitmap asset, never vector imitation
  g.restore();
 }
}
// Predict a ball's nearest approach within a short reaction window; never
// dodge an already intersecting ball or give the enemy invulnerability.
function reactiveThreat(z,b,radius){
 if(b.held||b.pierceContacts?.has(z))return null;
 const cx=z.x+z.w*.5,cy=z.y+z.h*.5;
 if(b.x+radius>z.x&&b.x-radius<z.x+z.w&&
    b.y+radius>z.y&&b.y-radius<z.y+z.h)return null;
 // SLOW affects enemy movement, never the player's ball velocity.
 const vx=b.vx,vy=b.vy;
 const speed2=vx*vx+vy*vy;
 if(speed2<10000)return null;
 const t=((cx-b.x)*vx+(cy-b.y)*vy)/speed2;
 if(t<.035||t>.18)return null;
 const px=b.x+vx*t,py=b.y+vy*t;
 if(Math.abs(px-cx)>z.w*.5+radius+5||
    Math.abs(py-cy)>z.h*.5+radius+5)return null;
 return {x:px,y:py,t};
}
function tryReactiveDodges(dt){
 if(!balls.length)return;
 const radius=has('power')?12:8;
 for(const z of foes){
  const profile=dodgeProfile(z);
  if(!profile||z.hitHold>0||(z.recoil||0)>.02||
     (z.knockTime||0)>0||Number.isFinite(z.breakoutTime)||
     Number.isFinite(z.arrivalTime)||z.eliteMotion?.tag==='evade'||
     clock<(z.dodgeReadyAt||0)||z.y+z.h>DEFENSE_Y-48)continue;
  for(const b of balls){
   if(b.held||b.dodgeSeen?.has(z))continue;
   const threat=reactiveThreat(z,b,radius);
   if(!threat)continue;
   // One chance per incoming ball, not repeated probability rolls every frame.
   (b.dodgeSeen??=new Set()).add(z);
   if(Math.random()>profile.chance)break;
   const center=z.x+z.w*.5;
   const first=threat.x<center?1:-1;
   let moved=false;
   for(const extent of [1,.82]){
    for(const sign of [first,-first]){
     const dx=sign*profile.distance*extent;
     // The new position must actually escape this incoming ball's sweep.
     if(Math.abs(threat.x-(center+dx))<z.w*.5+radius+4)continue;
     if(beginEliteMotion(z,dx,-4,profile.duration,'evade',0)){
      z.dodgeReadyAt=clock+profile.cooldown;
      z.eliteNextMove=z.dodgeReadyAt;
      pushDodgeGhost(z);
      // Move the collider immediately on this frame, before ball collision.
      moveElite(z,Math.min(dt,.03));
      sfx('evade');
      moved=true;break;
     }
    }
    if(moved)break;
   }
   if(moved)break;
  }
 }
}
function march(dt){
 tryStartBreakouts();
 const sorted=[...foes].sort((a,b)=>b.y-a.y),done=[];
 for(const z of sorted){
  if(z.trashStopUntil>clock){done.push(z);continue}
  if(z.boss&&bossMercyStep(z,dt)){done.push(z);continue;}
  if((clock>=(z.hitShakeFrom||0)&&clock<(z.hitShakeUntil||0))||
     (z.knockTime||0)>0){
   // Hold the gameplay collider stationary during the visual hit/launch.
   // This also prevents regular march from swallowing the staggered ripple.
   done.push(z);continue;
  }
  if(z.boss){bossPatrolStep(z,dt);done.push(z);continue;}
  if(moveElite(z,dt)){done.push(z);continue;}
  let extraY=0;
  if(!z.boss&&Number.isFinite(z.breakoutTime)){
   const timeStep=Math.max(0,Math.min(dt*enemySlowRate(),
     z.breakoutDuration-z.breakoutTime));
   const previousX=z.x;
   const proposedX=clamp(z.x+z.breakoutVX*timeStep,zombieMinX(),zombieMaxX(z));
   // An adjacent lane may have closed after an ally was knocked into it.
   // Stop the dash rather than ghosting through a zombie then teleporting.
   if(canKnockback(z,proposedX,z.y)){
    z.x=proposedX;extraY=z.breakoutVY*timeStep;
    z.breakoutTime+=timeStep;
    z.moveDir=Math.sign(z.x-previousX);
    if(z.breakoutTime>=z.breakoutDuration-1e-6){
     if(canKnockback(z,z.breakoutTargetX,z.y)){
      z.x=z.breakoutTargetX;z.col=z.breakoutTargetCol;
     }
     delete z.breakoutTime;delete z.breakoutDuration;
     z.breakoutCooldownUntil=Math.max(z.breakoutCooldownUntil||0,clock+1.3);
    }
   }else{
    delete z.breakoutTime;delete z.breakoutDuration;z.moveDir=0;
    z.breakoutCooldownUntil=clock+1.7;
   }
  }else shortDiagonalStep(z,dt);
  let next=z.y+enemySpeed(z)*dt+extraY;
  for(const front of done){
   if(Number.isInteger(z.row)&&z.row===front.row)continue;
   if(z.x-8<front.x+front.w+8&&z.x+z.w+8>front.x-8)
    next=Math.min(next,front.y-z.h-(front.boss?25:10));
  }
  z.y=Math.max(z.y,next);
  done.push(z);
 }
 // Collision-box guard for independently paced marchers, knockback chains
 // and diagonally repositioned rogues. The sprites may touch, never interpenetrate.
 for(let pass=0;pass<2;pass++){
  let corrected=0;
  for(let i=0;i<foes.length;i++)for(let j=i+1;j<foes.length;j++){
   const a=foes[i],b=foes[j],pa={x:a.x,y:a.y},pb={x:b.x,y:b.y};
   if(!zombieBoxesOverlap(a,pa,b,pb,0))continue;
   const dx=a.x+a.w/2-b.x-b.w/2,dy=a.y+a.h/2-b.y-b.h/2,
     overlapX=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),
     overlapY=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
   const horizontal=overlapX<overlapY||a.row===b.row,
     push=horizontal?{x:dx>=0?1:-1,y:0}:{x:0,y:dy>=0?1:-1};
   if(applyKnockback(a,push,3)||applyKnockback(b,{x:-push.x,y:-push.y},3))
    corrected++;
  }
  if(!corrected)break;
 }
}
// Endless advances through a short, in-world intermission. It never opens
// a stage result dialog, but the player must serve a fresh ball for each wave.
const ENDLESS_SHIFT_SECONDS=1.8,ENDLESS_SHIFT_SPAWN_AT=.35;
let endlessShiftTime=0,endlessShiftSpawned=false,endlessBackgroundWait=0;
function beginEndlessShift(){
 if(runMode!=='endless'||mode!=='playing')return;
 resetCitizenSpeech();
 window.ZZProgression?.grant?.('wave',wave-50,10,selectedHero);
 mode='endlessShift';endlessShiftTime=0;endlessShiftSpawned=false;
 endlessBackgroundWait=0;window.ZZStageArt?.load?.(stageArtForWave(wave+1));requestBossForWave(wave+1);
 releaseInput();
 // Clear old-stage pickups, buffs, rockets, and all extra balls.
 clearSkills();resetBalls();junk=[];bossTrashShots.length=0;itemPickupFX=[];
 for(const p of citizens)p.shooting=0;
 cheerTime=Math.max(cheerTime,.4);
 hud();sfx('wave');feedback('wave');
}
function beginClear(){
 if(runMode==='endless'){beginEndlessShift();return}
 if(mode!=='playing')return;resetCitizenSpeech();window.ZZProgression?.grant?.('wave',wave,10,selectedHero);mode='clearing';clearTime=0;clearBurst=0;items=[];
 // Begin downloading only the next campaign background at STAGE CLEAR.
 // The 2.8s result celebration is the loading/decoding window.
 if(wave<50){window.ZZStageArt?.load?.(stageArtForWave(wave+1));window.ZZEliteSprites?.requestForStage(wave+1);requestBossForWave(wave+1)}
 for(const b of balls)retireBall(b,'clear');
 balls=[];junk=[];bossTrashShots.length=0;rockets=[];for(const p of citizens)p.shooting=0;
 active={};score+=500;cheerTime=3;sfx('wave');feedback('wave');
 effect(225,340,'#edfc8d',130,'STAGE CLEAR');
 $('toast').style.opacity=0;hud();$('status').textContent='';
}
function advanceStage(){
 resetCitizenSpeech();
 if(runMode==='endless'){beginEndlessShift();return}
 if(runMode==='campaign'&&wave===50){finishCampaign();return}
 wave++;setStageBackground();
 if((wave-1)%5===0)lives=Math.min(hero().lives,lives+1);
 mode='playing';clearTime=0;clearSkills();rack();resetBalls();crowdTimer=3.5;
 toast(isBossWave()?'WARNING · '+BOSS_FORMS[foes.find(z=>z.boss)?.bossForm??0]:
  'STAGE '+String(wave).padStart(2,'0')+' · '+stageRosterLabel(combatStage()));
}
// Switch the background and entire enemy formation during the intermission.
// Original assets and the 9x4 formation are preserved, with staggered fade-in.
function refillEndlessWave(){
 if(runMode!=='endless'||mode!=='endlessShift'||endlessShiftSpawned!==true)return;
 resetCitizenSpeech();
 wave++;setStageBackground();
 if((wave-1)%5===0)lives=Math.min(hero().lives,lives+1);
 rack();
 for(const z of foes)z.arrivalTime=-z.row*.09-Math.random()*.06;
 waveInitialRegulars=foes.filter(z=>!z.boss).length;
 score+=500;hud();
}
function updateEndlessShift(dt){
 if(!endlessShiftSpawned&&endlessShiftTime+dt>=ENDLESS_SHIFT_SPAWN_AT&&
    (window.ZZStageArt?.loading?.[stageArtForWave(wave+1)]||
     nextBossArtLoading(wave+1))&&endlessBackgroundWait<6){
  endlessShiftTime=ENDLESS_SHIFT_SPAWN_AT;
  endlessBackgroundWait+=dt;return;
 }
 endlessShiftTime+=dt;
 if(!endlessShiftSpawned&&endlessShiftTime>=ENDLESS_SHIFT_SPAWN_AT){
  endlessShiftSpawned=true;refillEndlessWave();
 }
 if(endlessShiftTime>=ENDLESS_SHIFT_SECONDS-1e-6){
  mode='playing';endlessShiftTime=0;
  crowdTimer=3.5;hud();
 }
}
function newBall(x=car+heldBallOffset().x,y=PY+heldBallOffset().y,vx=0,vy=0,held=true){return{x,y,vx,vy,held,trail:[],lastHit:null,hitLock:0,pierceContacts:new Set(),bounceTime:0,bounceDuration:.19,bounceAxis:'y',bounceDir:1,impactKind:'wall',impactStrength:.5,spinAngle:0,spinVelocity:0,spinDirection:vx<0?-1:1}}
function resetBalls(){killCombo=0;killTimer=0;comboPop=0;comboDisplayTime=0;balls=[newBall()];combo=0;hud()}
function clearSkills(){active={};items=[];rockets=[];bazookaBlasts=[];bazookaTimer=0;skillUI()}
let menuRunChipsAtStart=0;
function start(selectedMode='campaign'){window.ZZGarage?.load(selectedHero,window.ZZProgression?.garage());filterReady=0;menuRunChipsAtStart=window.ZZProgression?.chips?.()??0;window.ZZProgression?.startRun?.(selectedMode);runMode=selectedMode;endlessSurvival=0;endlessRunStarted=false;endlessHudSecond=-1;endlessShiftTime=0;endlessShiftSpawned=false;lastStandUsed=false;resistFlash=0;failureScene=null;lastLostBall=null;lastSupportAt=clock-60;supportDangerTime=0;resetCitizens();window.ZZThrowablesV159?.request?.();releaseInput();$('results').hidden=true;unlockAudio();score=0;wave=runMode==='endless'?51:1;setStageBackground(true);lives=hero().lives;car=target=225;clearTime=0;heroAttackTime=0;junk=[];bossTrashShots.length=0;throwableBag.length=0;crowdTimer=3.5;cheerTime=0;particles=[];ballVanish=[];criticalPopups=[];itemPickupFX=[];fx=[];enemyDeaths=[];enemyPieces=[];barrelBlasts=[];hitFlashes=[];ballContactFX=[];trashContactFX.length=0;cameraKick=0;screenShake.until=0;lastFireDropAt=-1e6;lastFireDropWave=0;recentLootKinds=[];clearSkills();rack();resetBalls();mode='playing';$('overlay').hidden=true;$('heroes').hidden=true;nextBeat=0;beat=0;sfx('start');feedback('start');hud();endlessUI();toast(runMode==='endless'?'ENDLESS · 끝없는 생존 도전!':'STAGE 01 · 준비!')}
// Random signed upward launch angle on every serve; retain original ball speed.
function backToSelection(){
 if(mode!=='over'&&mode!=='paused')return;
 // Leaving from pause ends this run; keep previously earned records.
 if(mode==='paused'){
  best=Math.max(best,score);
  try{localStorage.setItem('zr-best',String(best))}catch{}
  if(runMode==='endless'){
   bestEndlessSurvival=Math.max(bestEndlessSurvival,endlessSurvival);
   try{localStorage.setItem('zz-endless-best-seconds',String(bestEndlessSurvival))}catch{}
  }
 }
 releaseInput();keys={};mode='menu';runMode='campaign';resumeMode='playing';
 endlessRunStarted=false;endlessSurvival=0;endlessShiftTime=0;endlessShiftSpawned=false;
 bossTrashShots.length=0;
 $('pause-main-menu').hidden=true;
 failureScene=null;lastLostBall=null;lastStandUsed=false;resistFlash=0;
 score=0;wave=1;lives=hero().lives;car=target=225;cameraKick=0;screenShake.until=0;
 particles=[];ballVanish=[];criticalPopups=[];itemPickupFX=[];
 fx=[];enemyDeaths=[];enemyPieces=[];barrelBlasts=[];hitFlashes=[];ballContactFX=[];trashContactFX.length=0;junk=[];
 clearSkills();resetCitizens();setStageBackground(true);rack();resetBalls();hud();
 $('overlay').setAttribute('data-title','true');
 $('overlay').setAttribute('data-screen','selection');
 $('label').textContent='NOVALIGHT ARCADE 001 / ZOMBIE SURVIVAL';
 $('title').textContent='From HERO to ZERO';
 $('message').textContent='출전할 생존자를 선택하세요.';
 $('results').hidden=true;$('heroes').hidden=false;
 renderHeroes();endlessUI();$('overlay').hidden=false;
}
function serve(){unlockAudio();if(mode==='playing'&&balls[0]?.held){
 if(typeof runMode!=='undefined'&&runMode==='endless')endlessRunStarted=true;
 const speed=Math.hypot(125,365);
 const angle=(.16+Math.random()*.52)*(Math.random()<.5?-1:1);
 balls[0].held=false;
 // Launch stretch is the opening elastic phase, not a physical wall bounce.
 balls[0].bounceDuration=.17;balls[0].bounceTime=.17;
 balls[0].bounceAxis='y';balls[0].bounceDir=-1;
 balls[0].impactKind='serve';balls[0].impactStrength=.7;
 balls[0].vx=Math.sin(angle)*speed;balls[0].vy=-Math.cos(angle)*speed;
 balls[0].spinDirection=balls[0].vx<0?-1:1;
 // V150: first serve is a real weapon strike. Reuse the approved 8-frame
 // hero ATTACK bitmap already played on ball return; never delay ball physics.
 swing=.22;heroAttackTime=HERO_ATTACK_DURATION;
 syncMulti();sfx('serve');feedback('serve');hud();
}}
function overlay(title,message,button,label){$('overlay').setAttribute('data-title','false');$('overlay').setAttribute('data-screen',['GAME OVER','VICTORY'].includes(label)?'results':'pause');$('overlay').setAttribute('data-outcome',label);$('results').hidden=!['GAME OVER','VICTORY'].includes(label);$('heroes').hidden=!['GAME OVER','VICTORY'].includes(label);$('title').innerHTML=title;$('message').innerHTML=message;$('start').innerHTML=button+(['PAUSED','GAME OVER'].includes(label)?'':' <span>↗</span>');$('label').textContent=label;$('pause-main-menu').hidden=label!=='PAUSED';if(['GAME OVER','VICTORY'].includes(label)){const earned=Math.max(0,(window.ZZProgression?.chips?.()??menuRunChipsAtStart)-menuRunChipsAtStart);if($('result-earned-chip'))$('result-earned-chip').textContent='+'+String(earned);}$('overlay').hidden=false;endlessUI()}
function pause(){releaseInput();if(mode==='playing'||mode==='clearing'||mode==='endlessShift'){resumeMode=mode;mode='paused';sfx('pause');overlay('PAUSED','좀비도 잠깐 쉬는 중...<br>게임과 스킬 시간은 정지합니다.','RESUME','PAUSED')}else if(mode==='paused'){unlockAudio();mode=resumeMode;$('overlay').hidden=true;nextBeat=0}}
function end(reason,detail=null){
 if(mode==='over')return;
 bossTrashShots.length=0;
 releaseInput();mode='over';best=Math.max(best,score);
 try{localStorage.setItem('zr-best',best)}catch{}
 if(runMode==='endless'){
  bestEndlessSurvival=Math.max(bestEndlessSurvival,endlessSurvival);
  try{localStorage.setItem('zz-endless-best-seconds',String(bestEndlessSurvival))}catch{}
  $('result-stage-label').textContent='생존 시간';
  $('result-stage').textContent=survivalClock(endlessSurvival);
  $('result-cleared').textContent='최장 '+survivalClock(bestEndlessSurvival)+' · ∞ '+endlessWaveNumber()+' 웨이브';
 }else{
  $('result-stage-label').textContent='도달 스테이지';
  $('result-stage').textContent=wave+' 스테이지';
  $('result-cleared').textContent=(wave-1)+'개 클리어';
 }
 $('result-score').textContent=String(score);
 $('result-best').textContent=String(best);
 overlay('GAME OVER',reason,'TRY AGAIN','GAME OVER');sfx('over');feedback('gameOver');
 if(detail){failureScene={...detail,t:0};$('overlay').hidden=true;cameraFeedback(4.8)}
}
// A visual retirement is distinct from a missed-heart penalty. Expiring
// extra balls dissolve at their ACTUAL world positions rather than popping.
function retireBall(b,reason='expire'){
 if(!b||b.held)return;
 ballVanish.push({x:b.x,y:clamp(b.y,18,H-14),trail:(b.trail||[]).slice(0,8),
   reason,t:0,life:reason==='lost'?.65:.5});
 if(ballVanish.length>22)ballVanish.splice(0,ballVanish.length-22);
 if(fxEnabled)burst(b.x,clamp(b.y,24,H-24),reason==='lost'?'#ff9d9f':'#b8f9ef',6);
}
function burst(x,y,color,n=12){
 if(!fxEnabled)return;
 const count=Math.min(52,Math.max(1,Math.floor(n)));
 for(let i=0;i<count;i++){
  const angle=(i+(Math.random()-.5)*.55)*Math.PI*2/count;
  const velocity=340+Math.random()*340;
  const life=.14+Math.random()*.15;
  particles.push({x,y,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity-30,
    t:life,life,color,size:4+Math.random()*4});
 }
 if(particles.length>260)particles.splice(0,particles.length-260);
}

function multiCount(){return (has('dual')?2:1)*(has('triple')?3:1)}
function syncMulti(fromHero=false){if(!balls.length||balls[0].held)return;const n=multiCount(),src=balls[0];
 // First multiball pickup: the hero serves only the extra balls. Stacked
 // dual x triple still splits at the existing ball, including after losses.
 if(fromHero&&balls.length===1&&(n===2||n===3)){
   const origin=heldBallOffset(),speed=Math.hypot(src.vx,src.vy);
   const side=Math.random()<.5?-1:1;
   for(let i=0,count=n-balls.length;i<count;i++){
     const angle=(.16+Math.random()*.52)*side*(i===0?1:-1);
     const extra=newBall(car+origin.x,PY+origin.y,Math.sin(angle)*speed,-Math.cos(angle)*speed,false);
     extra.bounceDuration=.17;extra.bounceTime=.17;
     extra.bounceAxis='y';extra.bounceDir=-1;
     extra.impactKind='serve';extra.impactStrength=.7;
     balls.push(extra);
   }
   swing=.22;heroAttackTime=HERO_ATTACK_DURATION;sfx('serve');feedback('serve');
 }
 while(balls.length<n){const angles=[-1.1,...balls.map(b=>clamp(Math.atan2(b.vx,Math.abs(b.vy)),-1.1,1.1)),1.1].sort((a,b)=>a-b);let gap=0,a=0;for(let i=1;i<angles.length;i++)if(angles[i]-angles[i-1]>gap){gap=angles[i]-angles[i-1];a=(angles[i]+angles[i-1])/2}const sp=Math.max(350,Math.hypot(src.vx,src.vy));balls.push(newBall(src.x,src.y,Math.sin(a)*sp,-Math.cos(a)*sp,false))}if(balls.length>n){for(const b of balls.slice(n))retireBall(b);balls=balls.slice(0,n)}hud()}
function activate(k,x=car,y=PY-24){
 active[k]=SKILLS[k].duration*hero().duration*(1+growth(k)*.06);
 if(k==='dual'||k==='triple')syncMulti(true);
 if(k==='bazooka'){bazookaTimer=0;lastSupportAt=clock}
 sfx('item');feedback('item');
 if(typeof citizenReaction==='function')citizenReaction('item');
 // A brief bitmap pickup confirmation at the actual caught-item position.
 // Do not grow or restyle the already-approved tiny equipped badges.
 itemPickupFX.push({k,x,y,t:0,life:.62});
 if(itemPickupFX.length>12)itemPickupFX.shift();
 effect(x,y,SKILLS[k].color,50);
 burst(x,y,SKILLS[k].color,10);
 hud();
}
// Support is rare while safe, weighted toward danger, and rate-limited per run.
let lastSupportAt=-60,supportDangerTime=0,supportDropsThisWave=0,endlessEmergencyUsed=false;
function supportRisk(){
 if(!foes.length)return 0;
 const bottom=Math.max(...foes.map(z=>z.y+z.h)),alive=citizens.filter(p=>p.alive).length;
 // Withhold support until the ONE remaining boss completes its retreat,
 // returns to within 38px of the defense line, and remains dangerous.
 if(runMode==='endless'&&foes.some(z=>z.boss)){
  const boss=foes.find(z=>z.boss);
  return foes.length===1&&boss.mercyUsed&&!boss.mercyDescending&&
   !Number.isFinite(boss.mercyElapsed)&&boss.y+boss.h>=DEFENSE_Y-38?2:0;
 }
 return bottom>=475||(bottom>=380&&(lives===1||alive<=5))?2:bottom>=390||lives===1||alive<=8?1:0;
}
function supportAvailable(){return wave>=3&&!(runMode==='endless'&&foes.some(z=>z.boss))&&supportDropsThisWave<1&&citizens.some(p=>p.alive)&&clock-lastSupportAt>=45&&!has('bazooka')&&!items.some(i=>i.k==='bazooka')&&!rockets.length}
function supportChance(){return supportAvailable()?[.005,.1,.28][supportRisk()]:0}
function updateEmergencySupport(dt){
 if(mode!=='playing'||supportRisk()<2){supportDangerTime=0;return}
 if(runMode==='endless'){
  // A collected bazooka is already doing its job. Uncollected pickups can
  // otherwise block support indefinitely, especially when the stage is full.
  if(has('bazooka')||endlessEmergencyUsed){supportDangerTime=0;return}
  const pending=items.find(i=>i.k==='bazooka');
  if(supportDropsThisWave>=1&&!pending){supportDangerTime=0;return}
  supportDangerTime+=dt;
  if(supportDangerTime<(foes.length===1&&foes[0].boss?3.5:2))return;
  // Give the run exactly one automatic emergency assist per wave, even when
  // the item slots are full or every citizen has fallen.
  const dropped=items.findIndex(i=>i.k==='bazooka');
  if(dropped>=0)items.splice(dropped,1);
  else supportDropsThisWave++;
  let citizen=citizens.find(p=>p.alive);
  if(!citizen){
   citizen=citizens[0];
   if(citizen){citizen.alive=true;citizen.dying=0;citizen.absent=0;citizen.returning=1.1;citizen.shooting=0;citizen.guardSpent=false;citizen.guardUntil=0}
  }
  if(!citizen)return;
  endlessEmergencyUsed=true;supportDangerTime=0;
  activate('bazooka',car,PY-24);
  citizenCue(citizen,true);
  sfx('item');
  return;
 }
 // Campaign retains its original pickup-based support mechanics.
 if(balls[0]?.held||!supportAvailable()){supportDangerTime=0;return}
 supportDangerTime+=dt;
 if(supportDangerTime<3||items.length>=lootVisibleLimit())return;
 const pos=pickupLocation(car,PY-119);
 if(!pos)return;
 items.push({...pos,k:'bazooka',phase:0});lastSupportAt=clock;
 supportDropsThisWave++;supportDangerTime=0;toast('긴급 지원! · 바주카를 받아주세요');sfx('item');
}
// Controlled loot: a few meaningful, non-duplicate pickups per wave.
// Fire is recoverably rare (guaranteed after a dry streak of stages), not absent.
const LOOT_DROP_CHANCE=.19,LOOT_MAX_VISIBLE=2,LOOT_MAX_STAGE=3,LOOT_SPACING=72;
const FIRE_DROP_CHANCE=.20,FIRE_DROP_COOLDOWN=24,FIRE_DROP_STAGE_GAP=2,FIRE_PITY_STAGES=3;
let fireDropsThisWave=0,lastFireDropAt=-1e6,lastFireDropWave=0;
let stageLootCount=0,recentLootKinds=[],stageLootKinds=[];
function stageLootLimit(){
 // Stage 1–3 retain the original cap; later stages get more opportunities.
 return LOOT_MAX_STAGE+(wave>=5)+(wave>=12)+(wave>=24)+(wave>=40);
}
function lootStageProgress(){
 // Count enemies still standing so the last ranks have a better drop rate.
 if(waveInitialRegulars<=0)return 0;
 const remaining=Math.min(waveInitialRegulars,foes.filter(z=>!z.boss).length);
 return clamp((waveInitialRegulars-remaining)/waveInitialRegulars,0,1);
}
function stageLootQuota(){
 // Preserve slots for the latter half instead of exhausting all drops early.
 return Math.ceil(stageLootLimit()*(.45+.55*lootStageProgress()));
}
function lootDropChance(){
 const stage=clamp((wave-1)/35,0,1);
 return Math.min(.64,LOOT_DROP_CHANCE+.26*stage+.19*lootStageProgress());
}
function lootVisibleLimit(){return wave>=15?3:LOOT_MAX_VISIBLE}
function fireDropChance(){return Math.min(.36,FIRE_DROP_CHANCE+.15*clamp((wave-3)/32,0,1))}
function fireCanDrop(){
 const gap=wave>=12?1:FIRE_DROP_STAGE_GAP,cooldown=wave>=12?16:FIRE_DROP_COOLDOWN;
 return fireDropsThisWave===0&&wave-lastFireDropWave>=gap&&
   clock-lastFireDropAt>=cooldown&&!has('fire')&&
   !items.some(item=>item.k==='fire');
}
function pickupLocation(x,y){
 // Pickup icons have 38px silhouettes; keep them apart while they fall.
 const offsets=[[0,0],[72,0],[-72,0],[0,-72],[0,72],[144,0],[-144,0],
  [72,-72],[-72,-72],[72,72],[-72,72],[0,-144],[0,144]];
 for(const [dx,dy] of offsets){
  const px=clamp(x+dx,40,410),py=clamp(y+dy,35,H-65);
  if(items.every(item=>Math.hypot(item.x-px,item.y-py)>=LOOT_SPACING))
   return {x:px,y:py};
 }
 return null;
}
function drop(z){
 if(z.max<2&&!z.boss)return;
 const boss=!!z.boss,fireReady=fireCanDrop();
 const pity=fireReady&&wave>=3&&wave-lastFireDropWave>=(wave>=12?2:FIRE_PITY_STAGES);
 // Hard cap is stage-scaled; soft quota reserves part of the loot for late kills.
 if(!boss&&stageLootCount>=stageLootLimit())return;
 if(!boss&&!pity&&stageLootCount>=stageLootQuota())return;
 if(!boss&&!pity&&Math.random()>=lootDropChance())return;
 // Fire pity and boss rewards can replace one uncollected regular pickup.
 if(items.length>=lootVisibleLimit()){
  if(!boss&&!pity)return;
  const replaceIndex=items.findIndex(item=>item.k!=='fire');
  if(replaceIndex<0)return;
  items.splice(replaceIndex,1);
 }
 let k=null;
 if(fireReady&&(pity||Math.random()<fireDropChance())){
  k='fire';
 }else if(supportAvailable()&&Math.random()<supportChance()){
  k='bazooka';
 }else{
  const choices=Object.keys(SKILLS).filter(key=>key!=='fire'&&key!=='bazooka'&&
   !has(key)&&!items.some(item=>item.k===key));
  // Prefer a skill not yet seen in THIS stage, then avoid recent-stage repeats.
  const neverThisStage=choices.filter(key=>!stageLootKinds.includes(key));
  const candidatePool=neverThisStage.length?neverThisStage:choices;
  const fresh=candidatePool.filter(key=>!recentLootKinds.includes(key));
  const oldest=Math.min(...candidatePool.map(key=>recentLootKinds.lastIndexOf(key)));
  const pool=fresh.length?fresh:candidatePool.filter(key=>recentLootKinds.lastIndexOf(key)===oldest);
  if(!pool.length)return;
  k=pool[Math.floor(Math.random()*pool.length)];
 }
 if(items.some(item=>item.k===k))return;
 const pos=pickupLocation(z.x+z.w/2,z.y+z.h/2);
 if(!pos)return;
 items.push({...pos,k,phase:Math.random()*6});
 stageLootCount++;
 if(!stageLootKinds.includes(k))stageLootKinds.push(k);
 recentLootKinds.push(k);
 if(recentLootKinds.length>4)recentLootKinds.shift();
 if(k==='fire'){
  fireDropsThisWave++;lastFireDropAt=clock;lastFireDropWave=wave;
 }
 if(k==='bazooka'){lastSupportAt=clock;supportDropsThisWave++}
}
const RED_BARREL_RADIUS=86;
function explodeRedBarrel(z){
 const x=z.x+z.w/2,y=z.y+z.h/2;
 barrelBlasts.push({x,y,t:0,life:.34,seed:Math.random()*6.28});
 if(barrelBlasts.length>6)barrelBlasts.shift();
 effect(x,y,'#ffac48',112,'',false,false);burst(x,y,'#ff913b',48);
 sfx('blast');feedback('blast');
 // Fire spreads to nearby enemy collision rectangles, not to the player or civilians.
 const victims=foes.map(other=>{
  const dx=x-clamp(x,other.x,other.x+other.w);
  const dy=y-clamp(y,other.y,other.y+other.h);
  return {other,dist:dx*dx+dy*dy};
 }).filter(v=>v.dist<=RED_BARREL_RADIUS*RED_BARREL_RADIUS)
   .sort((a,b)=>a.dist-b.dist);
 let ignited=0;
 for(const v of victims)if(ignite(v.other,0)&&++ignited>=FIRE_BARREL_TARGETS)break;
}
// A CRITICAL is a probability-driven, full-health single-strike knockout.
// Power/rocket overkill and burning kills are not critical finishers.
const CRITICAL_GREEN_CHANCE=.15,CRITICAL_SPECIAL_CHANCE=.09;
function criticalEligible(z){return !z.boss&&Number.isInteger(z.form)&&z.hp>=z.max&&z.max>=3}
// Push a small chain of zombies when a hit has room to travel. Compute all
// destinations first, so no zombie moves if a wall, boss or crowded rank blocks
// the chain. This keeps collision rectangles separate and prevents phantom hits.
// v81: each zombie owns the complete contact -> freeze -> launch timeline.
// At 60 fps: direct stun ~10f, chain stun ~8f, chain starts stagger ~5–6f.
const KNOCK_CHAIN_LIMIT=8,KNOCK_TWEEN_LIFE=.27;
const HIT_FREEZE_NORMAL=.16,HIT_FREEZE_BOSS=.19;
const CHAIN_KNOCK_STEP=.14,CHAIN_HIT_FREEZE=.125;
const KNOCK_TRAIL_LIFE=KNOCK_TWEEN_LIFE+HIT_FREEZE_NORMAL+
  KNOCK_CHAIN_LIMIT*CHAIN_KNOCK_STEP+CHAIN_HIT_FREEZE;
// Safe collider destinations are committed immediately; the animated sprite
// travels there over ~12 frames rather than visibly teleporting in one frame.
function knockMotionProgress(z){
 if(!(z.knockTime>0))return 1;
 const elapsed=(z.knockDuration||KNOCK_TRAIL_LIFE)-z.knockTime-
   (z.knockDelay||0)-(z.knockFreeze||0);
 return clamp(elapsed/KNOCK_TWEEN_LIFE,0,1);
}
function knockVisualPosition(z){
 if(!(z.knockTime>0)||!Number.isFinite(z.knockFromX))return z;
 const t=knockMotionProgress(z);
 const ease=1-Math.pow(1-t,3);
 return {...z,x:z.knockFromX+(z.x-z.knockFromX)*ease,
              y:z.knockFromY+(z.y-z.knockFromY)*ease};
}
function zombieBoxesOverlap(a,pa,b,pb,gap=.5){
 return pa.x<pb.x+b.w+gap&&pa.x+a.w+gap>pb.x&&
        pa.y<pb.y+b.h+gap&&pa.y+a.h+gap>pb.y;
}
function insideZombieRoad(z,p){
 return p.x>=zombieMinX()&&p.x<=zombieMaxX(z)&&
        p.y>=ENEMY_TOP_Y&&p.y+z.h<=DEFENSE_Y-16;
}
function canKnockback(z,x,y){
 const pos={x,y};
 return insideZombieRoad(z,pos)&&!foes.some(other=>other!==z&&
   zombieBoxesOverlap(z,pos,other,{x:other.x,y:other.y},1));
}
function planKnockPush(z,dx,dy,plans,depth=0){
 // Knockback must NEVER move an enemy toward the defense line (positive Y),
 // including recursive pushes and the overlap-repair pass in march().
 if(dy>0||z.boss||depth>KNOCK_CHAIN_LIMIT||plans.has(z))return false;
 const pos={x:z.x+dx,y:z.y+dy};
 if(!insideZombieRoad(z,pos))return false;
 plans.set(z,{...pos,chainDepth:depth});
 const pushX=Math.abs(dx)>=Math.abs(dy);
 const direction=Math.sign(pushX?dx:dy);
 if(!direction)return false;
 for(const other of foes){
  if(other===z)continue;
  const otherPos=plans.get(other)||{x:other.x,y:other.y};
  if(!zombieBoxesOverlap(z,pos,other,otherPos,1))continue;
  if(other.boss||plans.has(other))return false;
  const overlapX=direction>0?pos.x+z.w+1-otherPos.x:
    otherPos.x+other.w+1-pos.x;
  const overlapY=direction>0?pos.y+z.h+1-otherPos.y:
    otherPos.y+other.h+1-pos.y;
  const push=pushX?{dx:direction*Math.max(1,overlapX),dy:0}:
                  {dx:0,dy:direction*Math.max(1,overlapY)};
  if(!planKnockPush(other,push.dx,push.dy,plans,depth+1))return false;
 }
 return true;
}
function applyKnockback(z,impact,n=1){
 if(!impact||z.boss)return false;
 // Incoming balls can hit the back/top of a zombie while travelling DOWN.
 // Remove only the forward Y impulse: keep the existing upward and sideways
 // knockback distances, directions, chain count and smooth visual tween.
 const vx=impact.x||0,vy=Math.min(0,impact.y||0),mag=Math.hypot(vx,vy);
 if(mag<.01)return false;
 // Contact transfers displacement to successive zombies. Attempt shorter
 // shoves when tightly packed ranks, bosses or road edges block the impulse.
 const distance=Math.min(50,36+Math.min(n,5)*3)*(impact.push||1);
 const dirX=vx/mag,dirY=vy/mag;
 for(const factor of [1,.85,.7,.55,.4,.25,.12]){
  const plans=new Map();
  // Reflect lateral impact at the painted side walls instead of embedding a
  // knocked zombie in a wall. Full chains remain collision-checked as before.
  const proposedX=z.x+dirX*distance*factor;
  const low=zombieMinX(),high=zombieMaxX(z);
  const reflectedX=proposedX<low?2*low-proposedX:
                   proposedX>high?2*high-proposedX:proposedX;
  const pushX=reflectedX-z.x;
  const pushY=dirY*distance*factor;
  if(!planKnockPush(z,pushX,pushY,plans))continue;
  let valid=true;
  for(const [a,pa] of plans)
   for(const other of foes){
    if(a===other)continue;
    const pb=plans.get(other)||{x:other.x,y:other.y};
    if(zombieBoxesOverlap(a,pa,other,pb,.5)){valid=false;break}
   }
  if(!valid)continue;
  for(const [actor,pos] of plans){
   // A chained shove interrupts any existing elite route; never snap back
   // to the start of a pre-hit dash once the physics tween ends.
   if(actor.eliteMotion){
    delete actor.eliteMotion;
    actor.eliteNextMove=clock+(actor.eliteKind===2?.6:1.1);
   }
   // Repeated hits restart from the current rendered position, not a
   // previous distant collider destination.
   const before=knockVisualPosition(actor);
   const beforeX=before.x,beforeY=before.y; // snapshot values before actor mutates
   actor.x=pos.x;actor.y=pos.y;
   actor.knockFromX=beforeX;actor.knockFromY=beforeY;
   actor.knockChain=actor!==z;
   actor.knockDelay=(pos.chainDepth||0)>0
     ?HIT_FREEZE_NORMAL+((pos.chainDepth||0)-1)*CHAIN_KNOCK_STEP:0;
   // Only a direct hit has a local hit-stop. Neighbors inherit displacement.
   actor.knockFreeze=actor===z?Math.max(0,(actor.hitShakeUntil||0)-clock):0;
   actor.knockDuration=actor.knockDelay+actor.knockFreeze+KNOCK_TWEEN_LIFE;
   actor.knockTime=actor.knockDuration;
   // Each collider reserves its final safe position immediately; only the
   // rendered sprite waits. Ordinary marching must not race the tween.
   clearShortStep(actor,.5+actor.knockDuration);actor.shortStepHomeX=pos.x;
   // Active diagonal animation must not snap the pushed zombie back
   // onto its old target column or teleport through an ally.
   if(Number.isFinite(actor.breakoutTime)){
    delete actor.breakoutTime;delete actor.breakoutDuration;actor.moveDir=0;
    actor.breakoutCooldownUntil=clock+2;
   }
  }
  if(hitFlashes.length>36)hitFlashes.splice(0,hitFlashes.length-36);
  return true;
 }
 return false;
}
function damage(z,n=1,burning=false,impact=null,criticalHit=false,piercingCritical=false){
 if(!foes.includes(z))return;
 const fullHP=z.hp>=z.max,criticalKnockout=!burning&&!!criticalHit&&fullHP&&!z.boss;
 const critical=criticalKnockout||(!burning&&piercingCritical);
 const amount=criticalKnockout?z.hp:n;
 z.hp-=amount;
 z.flash=burning?.12:.22;
 enemyReaction(z,amount,impact,!burning);
 if(!burning){
  hitFlashes.push({x:z.x+z.w/2,y:z.y+z.h/2,groundY:z.y+z.h,
   t:0,life:critical?.39:.48,critical,spread:Math.max(z.w,z.h),
   piercing:piercingCritical||has('pierce'),angle:Math.atan2(impact?.y??-1,impact?.x??0)});
  if(hitFlashes.length>36)hitFlashes.shift();
  if(z.hp>0&&!piercingCritical)applyKnockback(z,impact,amount);
 }
 const hitPosition=knockVisualPosition(z);
 if(critical){citizenReaction('critical');
  // Sample once, at the hit. A piercing combo uses varied, slightly smaller
  // CRITICAL! titles to avoid stacking giant identical words across the lane.
  const textScale=piercingCritical?.75+Math.random()*.28:.90+Math.random()*.15;
  criticalPopups.push({x:hitPosition.x+z.w/2,y:hitPosition.y+z.h/2,
    t:0,life:.72,pierce:piercingCritical,textScale});
  if(criticalPopups.length>12)criticalPopups.shift();
 }
 if(burning){if(z.hp<=0)feedback('fireKill')}
 else feedback(critical?'critical':z.boss?(z.hp<=0?'bossKill':'bossHit'):(z.hp<=0?'kill':amount>=2?'powerHit':'hit'));
 effect(hitPosition.x+z.w/2,hitPosition.y+z.h/2,burning?'#ffac48':critical?'#fff3b2':TYPES[z.kind].color,
  z.hp<=0?(z.boss?150:55):burning?20:38,
  z.hp<=0?(z.boss?'BOSS BREAK!':critical?'CRITICAL!':'+'+(100*z.max)):burning?'':'-'+amount,
  !burning&&z.hp>0&&!critical,false);
 score+=z.hp<=0?(z.boss?1500:100*z.max)+Math.min(combo,10)*10:25;
 if(z.hp<=0||critical||burning)burst(hitPosition.x+z.w/2,hitPosition.y+z.h/2,
  burning?'#ff985f':critical?'#fff6be':TYPES[z.kind].color,z.boss?20:burning?3:12);
 if(!burning&&amount>=2&&!z.boss)sfx('powerhit');
 if(!burning&&z.hp>0){
  if(z.boss)sfx('bosshit');
  else if(amount<2)sfx('hit');
 }
 if(z.hp<=0){
  enemyDeath(z,critical);
   if(z.boss)window.ZZProgression?.grant?.('boss',wave,25);
  if(critical)burst(z.x+z.w/2,z.y+8,'#fff0ad',17);
  recordKill();if(z.boss)citizenReaction('boss');foes.splice(foes.indexOf(z),1);
  if(!z.boss&&z.form===1)explodeRedBarrel(z);
  drop(z);sfx(z.boss?'boss':'kill');
  if(z.boss)toast('BOSS DOWN · +1500');
 }
 hud();if(!foes.length)beginClear();
}
// Fire has a hard simultaneous cap and at most one single-hop spread per
// directly ignited zombie. Propagated flames cannot propagate again.
const FIRE_MAX_ACTIVE=5,FIRE_DURATION=2.4,FIRE_TICK_INTERVAL=1.05,FIRE_TICK_DAMAGE=.75;
const FIRE_SPREAD_RADIUS=52,FIRE_SPREAD_DEPTH=1,FIRE_DIRECT_TARGETS=2,FIRE_BARREL_TARGETS=3;
function ignite(z,depth=0){
 if(!foes.includes(z)||z.burn>0||foes.filter(other=>other.burn>0).length>=FIRE_MAX_ACTIVE)
  return false;
 z.burn=FIRE_DURATION;z.burnTick=0;z.spreadTick=0;
 z.burnDepth=depth;z.spreadDone=false;
 return true;
}
function fireTargetsNear(z,radius){
 return foes.filter(other=>other!==z&&other.burn<=0&&
  Math.hypot(other.x+other.w/2-z.x-z.w/2,
             other.y+other.h/2-z.y-z.h/2)<=radius)
  .sort((a,b)=>Math.hypot(a.x-z.x,a.y-z.y)-Math.hypot(b.x-z.x,b.y-z.y));
}
function hit(z,impact=null,piercing=false){
 combo++;
 const critical=!piercing&&criticalEligible(z)&&Math.random()<(z.form===0&&!Number.isInteger(z.eliteKind)?CRITICAL_GREEN_CHANCE:CRITICAL_SPECIAL_CHANCE);
 // Piercing deals two times the normal damage to ALL enemies, including
 // bosses, but never turns a full-health boss into a one-hit kill.
 const echo=impact?.echo?fireTargetsNear(z,84).find(other=>other!==z):null;
 damage(z,hero().damage*(has('power')?2:1)*(piercing?2:1)*(impact?.power||1),false,impact,critical,piercing);
 if(echo){spawnContact({vx:0,vy:-1},echo.x+echo.w/2,echo.y+echo.h/2,0,1,'enemy');damage(echo,1,false,{x:0,y:-1})}
 if(has('fire')){
  const targets=foes.includes(z)?[z,...fireTargetsNear(z,82)]:foes.filter(other=>
   Math.hypot(other.x+other.w/2-z.x-z.w/2,other.y+other.h/2-z.y-z.h/2)<82);
  let count=0;
  for(const other of targets)if(ignite(other,0)&&++count>=FIRE_DIRECT_TARGETS)break;
  if(count)sfx('fire');
 }
}
// Stable in-place removal avoids allocating short-lived effect arrays each tick.
function compactVisualQueue(queue,keep){
 let write=0;
 for(let read=0;read<queue.length;read++){
  const value=queue[read];if(keep(value))queue[write++]=value;
 }
 queue.length=write;return queue;
}
const visualAlive=f=>f.t<f.life,particleAlive=p=>p.t>0,deathPending=d=>!d.done;
function advanceVisualQueue(queue,dt){
 for(const f of queue)f.t+=dt;
 return compactVisualQueue(queue,visualAlive);
}
function update(dt){
 // Visual FX can finish even while a final-ball loss freezes the game scene.
 if(mode!=='paused'){
  for(const f of ballVanish)f.t+=dt;
  compactVisualQueue(ballVanish,visualAlive);
  for(const f of criticalPopups)f.t+=dt;
  compactVisualQueue(criticalPopups,visualAlive);
  for(const f of itemPickupFX)f.t+=dt;
  compactVisualQueue(itemPickupFX,visualAlive);for(const q of ballContactFX)q.t+=dt;compactVisualQueue(ballContactFX,visualAlive);
  if(trashContactFX.length)advanceVisualQueue(trashContactFX,dt);
 }
 if(mode==='over'&&failureScene){failureScene.t+=dt;clock+=dt;cameraKick*=Math.exp(-dt*10);if(failureScene.t>=1.8){failureScene=null;$('overlay').hidden=false}return}
 if(mode!=='playing'&&mode!=='clearing'&&mode!=='endlessShift')return;
 if(runMode==='endless'&&endlessRunStarted){
  endlessSurvival+=dt;
  const sec=Math.floor(endlessSurvival);
  if(sec!==endlessHudSecond){endlessHudSecond=sec;$('survival-time').textContent=survivalClock(endlessSurvival)}
 }
 clock+=dt;enemyAnimationClock+=dt*enemySlowRate();updateStageBackground(dt);resistFlash=Math.max(0,resistFlash-dt);updateEnemyVisuals(dt);cameraKick*=Math.exp(-dt*23);if(cameraKick<.06)cameraKick=0;advanceVisualQueue(fx,dt);swing=Math.max(0,swing-dt);heroAttackTime=Math.max(0,heroAttackTime-dt);compactVisualQueue(particles,particleAlive);for(const p of particles){p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt}
if(standRetreat.length){updateStandRetreat();return}
if(mode==='endlessShift'){updateEndlessShift(dt);return}
if(mode==='playing'){killTimer=Math.max(0,killTimer-dt);if(!killTimer)killCombo=0;comboPop=Math.max(0,comboPop-dt);comboDisplayTime=Math.max(0,comboDisplayTime-dt)}
updateCrowd(dt);updateEmergencySupport(dt);
if(mode==='clearing'){
 clearTime+=dt;clearBurst+=dt;car+=(225-car)*Math.min(1,dt*3);
 if(fxEnabled&&clearBurst>.22){clearBurst=0;burst(35+Math.random()*380,160+Math.random()*200,['#ffe97a','#8df3c8','#f9a2de'][Math.floor(Math.random()*3)],14)}
 if(clearTime>=2.8){
  // Wait for the specifically requested scene, with a bounded fallback
  // to avoid softlock when the network stops responding.
  const loading=runMode==='campaign'&&wave<50&&
    (window.ZZStageArt?.loading?.[stageArtForWave(wave+1)]||nextBossArtLoading(wave+1));
  if(!loading||clearTime>=8.8)advanceStage();
 }
 return;
}
if(!foes.length){beginClear();return}
updatePoisonStatus(dt);
const previousCar=car;
if(groggyTime>0){target=car;}
else{
 const driveSpeed=hero().speed*(1+gearBonus('steer')/100);
 if(keys.ArrowLeft||keys.a)target-=driveSpeed*dt;
 if(keys.ArrowRight||keys.d)target+=driveSpeed*dt;
 target=clamp(target,72,W-72);
 car+=clamp(target-car,-driveSpeed*dt,driveSpeed*dt);
}
for(const k of Object.keys(active)){active[k]-=dt;if(active[k]<=0){delete active[k];if(k==='dual'||k==='triple'){const n=multiCount();for(const b of balls.slice(n))retireBall(b);balls=balls.slice(0,n)}/* Preserve contacts through pierce expiry; clear only upon physical separation. */sfx('expire');hud()}}skillUI();
for(const item of [...items]){item.y+=105*dt;if(item.y>=PY-2&&item.y<=PY+61&&Math.abs(item.x-car)<65+growth('itemMagnet')*4){items.splice(items.indexOf(item),1);activate(item.k,item.x,item.y)}else if(item.y>H+20)items.splice(items.indexOf(item),1)}
// A held serve pauses enemy marching and new attacks. Shots already airborne
// still reach the hero, citizens or ground while the next ball is held.
if(!balls[0]?.held)march(dt);
updateBossTrashShots(dt,previousCar);
if(balls[0]?.held){
 const o=heldBallOffset();
 balls[0].x=car+o.x;balls[0].y=PY+o.y;
 return;
}
for(const z of [...foes]){z.flash=Math.max(0,z.flash-dt);if(z.burn>0){
 z.burn=Math.max(0,z.burn-dt);z.burnTick+=dt;z.spreadTick+=dt;
 if(z.spreadTick>=.95&&!z.spreadDone){
  z.spreadDone=true;
  if((z.burnDepth||0)<FIRE_SPREAD_DEPTH){
   const neighbour=fireTargetsNear(z,FIRE_SPREAD_RADIUS)[0];
   if(neighbour)ignite(neighbour,(z.burnDepth||0)+1);
  }
 }
 if(z.burnTick>=FIRE_TICK_INTERVAL){
  z.burnTick-=FIRE_TICK_INTERVAL;
  damage(z,FIRE_TICK_DAMAGE,true);
  if(mode!=='playing')return;
 }
}if(foes.includes(z)&&z.y+z.h>=DEFENSE_Y){if(wave>=20&&standReady()){z.y=DEFENSE_Y-z.h-1;continue}end(z.boss?'보스가 방어선을 돌파했습니다. 하트와 관계없이 패배합니다.':'좀비가 방어선을 돌파했습니다. 하트와 관계없이 패배합니다.',{type:'breach',x:z.x+z.w/2,y:z.y+z.h/2});return}}
// Resolve real-time avoidance before the ball's existing substep collider tests.
tryReactiveDodges(dt);
for(const b of [...balls]){updateBallSpin(b,dt);b.bounceTime=Math.max(0,(b.bounceTime||0)-dt);const radius=has('power')?12:8,steps=Math.max(1,Math.ceil(Math.max(Math.hypot(b.vx,b.vy)*dt,Math.abs(car-previousCar))/4)),d=dt/steps;
for(let s=0;s<steps;s++){const ox=b.x,oy=b.y;b.hitLock=Math.max(0,b.hitLock-d);b.x+=b.vx*d;b.y+=b.vy*d;if(b.x<ROAD_LEFT+radius){b.x=ROAD_LEFT+radius;b.vx=Math.abs(b.vx);ballImpact(b,'x',1,'wall');spawnContact(b,b.x,b.y,1,0,'wall');sfx('wall');feedback('wall')}if(b.x>ROAD_RIGHT-radius){b.x=ROAD_RIGHT-radius;b.vx=-Math.abs(b.vx);ballImpact(b,'x',-1,'wall');spawnContact(b,b.x,b.y,-1,0,'wall');sfx('wall');feedback('wall')}if(b.y<16+radius){b.y=16+radius;b.vy=Math.abs(b.vy);ballImpact(b,'y',1,'ceiling');spawnContact(b,b.x,b.y,0,1,'ceiling');sfx('wall');feedback('wall')}
 // Each ball can strike multiple enemies in a line without flipping its
 // velocity, but never repeatedly damage one enemy during a single overlap.
 // Once it fully exits that enemy, the contact can be struck on a later pass.
 const piercing=has('pierce');
 // Track physical overlap for both regular and piercing shots. One hit per
 // continuous touch even on the boss's 66x88 collider; not a .10s damage loop.
 for(const z of b.pierceContacts){
  if(!foes.includes(z)||b.x+radius<=z.x||b.x-radius>=z.x+z.w||
     b.y+radius<=z.y||b.y-radius>=z.y+z.h)b.pierceContacts.delete(z);
 }
 for(const z of foes){
  if(b.pierceContacts.has(z)||(!piercing&&b.lastHit===z&&b.hitLock>0))continue;
  if(b.x+radius>z.x&&b.x-radius<z.x+z.w&&b.y+radius>z.y&&b.y-radius<z.y+z.h){
   const impact={x:b.vx,y:b.vy};
   b.pierceContacts.add(z);const f=contactFace(b,z,radius,ox,oy);spawnContact(b,piercing?f[0]:ox,piercing?f[1]:oy,f[2],f[3],'enemy');
   if(piercing){
    // A penetrating ball retains its velocity through unique targets.
   }else if(ox+radius<=z.x||ox-radius>=z.x+z.w){b.vx*=-1;b.x=ox;ballImpact(b,'x',b.vx,'enemy')}
   else{b.vy*=-1;b.y=oy;ballImpact(b,'y',b.vy,'enemy')}
   b.lastHit=z;b.hitLock=.1;window.ZZGarage?.contact(b,selectedHero,impact);hit(z,impact,piercing);
   if(mode!=='playing')return;
   break;
  }
 }
if(b.vy>0&&oy+radius<=PY&&b.y+radius>=PY&&Math.abs(b.x-car)<hero().paddle+radius/2+growth('sweetSpot')*2+gearBonus('wide')){const offset=clamp((b.x-car)/hero().paddle,-1,1),speed=Math.min(600,Math.hypot(b.vx,b.vy)+7),angle=window.ZZGarage?.strike(b,selectedHero,offset)??offset*1.06;b.vx=Math.sin(angle)*speed;b.vy=-Math.cos(angle)*speed;b.y=PY-radius-1;ballImpact(b,'y',-1,'paddle');swing=.22;heroAttackTime=HERO_ATTACK_DURATION;combo=0;effect(b.x,PY,'#e8ff93',30);burst(b.x,PY,'#e4ff9c',8);sfx('racket');feedback('racket')}
carCollision(b,radius,previousCar+(car-previousCar)*(s+1)/steps);
if(has('shield')&&b.vy>0&&b.y+radius>=SHIELD_LINE_Y){b.y=SHIELD_LINE_Y-radius;b.vy=-Math.abs(b.vy);ballImpact(b,'y',-1,'shield');sfx('shield');feedback('shield');effect(b.x,SHIELD_LINE_Y,'#a1fbe6',75,'SAVE!');burst(b.x,SHIELD_LINE_Y,'#b9f684',10)}
if(!has('shield'))citizenCollision(b,radius);
if(b.y>H+20){lastLostBall={x:clamp(b.x,28,422),y:H-11};retireBall(b,'lost');balls.splice(balls.indexOf(b),1);hud();break}
  recordBallTrail(b,b.x,b.y,!!b._trailCorner);b._trailCorner=false;
 }
}
if(!balls.length){lives--;effect(car,PY,'#ff7089',85,'MISS');sfx('miss');feedback('miss');clearSkills();if(!lives){hud();end('마지막 공이 떨어져 하트가 모두 소진되었습니다.',{type:'ball',x:lastLostBall?.x||car,y:H-11});return}resetBalls();toast('공 낙하! · 하트 '+lives+'개 남음 · 탭해서 서브');return}
updateStandDanger(dt);
}
function proceduralBackground(){// Readability-first road tones: brighter, largely neutral gray with a restrained
// warm/cool shift per stage. Keep colored zombie silhouettes in the foreground.
const palette=[['#444e53','#566064','#4e595d','#77878a'],
               ['#514b55','#615c66','#58545d','#817b83'],
               ['#48554f','#5a685f','#526057','#7a8b7e']][(wave-1)%3];rect(0,0,W,H,palette[0]);for(let row=0;row<Math.ceil(H/49)+1;row++)for(let col=0;col<9;col++){let x=20+col*47,y=row*49,k=(row*7+col*13)%5;rect(x,y,45,47,palette[k%2+1]);rect(x,y,45,2,'#b9c7c11b');if(k===1){rect(x+7,y+25,11,2,'#24303835');rect(x+16,y+27,2,7,'#24303835')}}
for(let side of [0,432]){rect(side,0,18,H,'#343e43');for(let y=0;y<H;y+=42){rect(side+4,y,10,24,palette[3]);rect(side+6,y+2,3,18,'#8b9b97')}}
g.globalAlpha=.10;for(let y=-60;y<H;y+=92)rect(222,y+(clock*12)%92,6,34,palette[3]);g.globalAlpha=1;g.strokeStyle=palette[3]+'24';g.lineWidth=2;g.strokeRect(29,27,392,DEFENSE_Y-45);
for(let i=0;i<16;i++){let x=25+(i*137)%400,y=(i*97+clock*9)%(DEFENSE_Y-15);rect(x,y,2,2,palette[3]+'30')}
// Defense breach remains a physics rule; no always-on text or vector indicator.rect(20,H-50,410,50,'#17252baa');
if(has('slow')){g.save();g.strokeStyle='#86f2e0ac';g.lineWidth=2;g.strokeRect(24,22,402,DEFENSE_Y-30);g.restore()}
}
// Eighteen stage-local bitmap scenes. Keep the game world's fixed 450×710
// coordinates and its collision/defense positions completely unchanged.
const STAGE_ART_COUNT=25;
const STAGE_FADE_SECONDS=.9;
const STAGE_PLAYFIELD_VEIL=[.10,.12,.14,.12,.18,.16,.12,.14,.13,.22,.12,.14,.11,.11,.12,.19,.13,.13, .14,.18,.12,.18,.19,.16,.13];
let stageArtIndex=0,previousArtIndex=-1,stageArtBlend=1;
function stageArtForWave(n){return ((Math.max(1,n)-1)%STAGE_ART_COUNT)}
function setStageBackground(immediate=false){
 const next=stageArtForWave(wave);
 const art=window.ZZStageArt;
 art?.retain?.(next,immediate?-1:stageArtIndex);
 art?.load?.(next);
 if(immediate){stageArtIndex=next;previousArtIndex=-1;stageArtBlend=1;return}
 if(stageArtIndex!==next){
  previousArtIndex=stageArtIndex;
  stageArtIndex=next;
  stageArtBlend=0;
 }
}
function updateStageBackground(dt){
 const art=window.ZZStageArt;
 if(previousArtIndex<0||!art?.ready?.[stageArtIndex])return;
 stageArtBlend=Math.min(1,stageArtBlend+dt/STAGE_FADE_SECONDS);
 if(stageArtBlend>=1){previousArtIndex=-1;art.retain?.(stageArtIndex,mode==='endlessShift'&&!endlessShiftSpawned?stageArtForWave(wave+1):-1);}
}
function background(){
 if(stageArtIndex!==stageArtForWave(wave))setStageBackground();
 const art=window.ZZStageArt;
 const newReady=!!art?.ready?.[stageArtIndex];
 const oldReady=previousArtIndex>=0&&!!art?.ready?.[previousArtIndex];
 if(!newReady&&!oldReady){proceduralBackground();return}
 g.save();
 if(oldReady&&stageArtBlend<1){
  g.drawImage(art.images[previousArtIndex],0,0,W,H);
  if(newReady){
   g.globalAlpha=stageArtBlend;
   g.drawImage(art.images[stageArtIndex],0,0,W,H);
   g.globalAlpha=1;
  }
 }else if(newReady)g.drawImage(art.images[stageArtIndex],0,0,W,H);
 else g.drawImage(art.images[previousArtIndex],0,0,W,H);
 g.restore();
 // Keep the original collision boundary at DEFENSE_Y regardless of art.
 // The threshold is enforced by physics; do not draw a redundant dashed line. Apply a soft veil only over gameplay, not bright side scenery:
 // voxel zombies, balls, item pickups, and combo remain the visual focus.
 g.save();
 g.fillStyle='rgba(10,18,26,'+STAGE_PLAYFIELD_VEIL[stageArtIndex]+')';
 g.fillRect(20,63,410,Math.max(1,DEFENSE_Y-63));
 // Visual defense caption removed; zombie breach logic still uses DEFENSE_Y.
 // A light backing tint separates the colorful supporter sprites from
 // the illustrated footer without covering the original details.
 rect(20,H-50,410,50,'#17252b66');
 if(has('slow')){g.save();g.strokeStyle='#86f2e0ac';g.lineWidth=2;g.strokeRect(24,22,402,DEFENSE_Y-30);g.restore()}
 g.restore();
}
// V242: The approved original character colors are always the clean base.
// Each blocked hostile projectile increases a SEPARATE translucent lime
// overlay; only full intoxication (groggy) uses the complete green palette.
function heroPoisonTintStrength(){
 if(groggyTime>0)return 1;
 return Math.max(0,Math.min(.78,(poison/POISON_MAX)*.78));
}
function drawHeroBitmap(image,...args){
 g.drawImage(image,...args); // exact original asset when toxin is zero
 const strength=heroPoisonTintStrength();
 if(strength<=0)return;
 g.save();
 g.globalAlpha*=strength;
 g.filter='grayscale(1) sepia(1) saturate(5) hue-rotate(42deg) brightness(1.18)';
 g.drawImage(image,...args);
 g.restore();
}
function player(){
 drawTrashContact("hero");
 if(selectedHero===3){
  const sprite=$('mechanic-art');
  if(sprite?.naturalWidth){
   const h=100*sprite.naturalHeight/sprite.naturalWidth;
   g.save();g.translate(car,625+VIEW_DELTA);g.rotate(Math.sin(heroAttackTime/HERO_ATTACK_DURATION*Math.PI)*-.09);
   drawHeroBitmap(sprite,-50,-h,100,h);g.restore();
  }
  return;
 }
 const approved=window.ZZHeroAnimationsV55;
 if(approved&&approved.ready&&approved.idle&&approved.attack){
  const attacking=heroAttackTime>0;
  const t=attacking?Math.max(0,Math.min(1,1-heroAttackTime/HERO_ATTACK_DURATION)):0;
  const n=attacking?Math.min(7,Math.floor(t*8)):(Math.floor(clock*8)%8);
  const atlas=attacking?approved.attack:approved.idle;
  const w=108,h=108;
  const win=mode==='clearing'||mode==='paused'&&resumeMode==='clearing';
  g.save();g.translate(0,VIEW_DELTA);
  if(win)g.translate(0,-Math.abs(Math.sin(clearTime*7))*4);
  drawHeroBitmap(atlas,n*192,selectedHero*192,192,192,car-w/2,579-h/2,w,h);
  g.restore();
  return;
 }
 // Legacy author-approved asset fallback if the new sprite PNGs cannot load.
 const sprite=window.ZZHeroCarAttack;
 if(sprite&&sprite.ready&&sprite.image){
  // 70% of the original onscreen car/hero size. Re-center on the OLD 154px
  // rectangle's midpoint rather than anchoring its bottom; the raised
  // bounce line now runs through the seated hero's weapon-hand height.
  // Physics width and the forgiving car body emergency save stay unchanged.
  const t=heroAttackTime>0?1-heroAttackTime/HERO_ATTACK_DURATION:0;
  const order=[2,3,4,5,6,7,0];
  const n=heroAttackTime>0?order[Math.min(order.length-1,Math.floor(t*order.length))]:0;
  const w=108,h=108; // 154×154 → 108×108 (~70%); preserve the 192px master atlas
  const win=mode==='clearing'||mode==='paused'&&resumeMode==='clearing';
  g.save();g.translate(0,VIEW_DELTA);
  if(win)g.translate(0,-Math.abs(Math.sin(clearTime*7))*4);
  // The racket strike range is physics-only; hide the former horizontal guide.
  drawHeroBitmap(sprite.image,n*192,selectedHero*192,192,192,
    car-w/2,579-h/2,w,h);
  g.restore();
  return;
 }
 let x=car;const h=hero(),win=mode==='clearing'||mode==='paused'&&resumeMode==='clearing';g.save();g.translate(0,VIEW_DELTA);
 const fallbackTint=heroPoisonTintStrength();
 if(fallbackTint>0)g.filter='sepia('+fallbackTint.toFixed(3)+') saturate('+(1+fallbackTint*3).toFixed(2)+') hue-rotate('+(42*fallbackTint).toFixed(1)+'deg)';if(win)g.translate(0,-Math.abs(Math.sin(clearTime*7))*4);/* no baked vehicle ground shadow */rect(x-57,626,13,24,'#14251f');rect(x+44,626,13,24,'#14251f');cube(x-52,621,104,25,h.color,'#ffbc72','#54313a');rect(x-45,625,90,5,'#ff9c58');cube(x-27,612,53,18,'#182e2a','#3d5441','#18221d');heroSprite(x,600,1,win);rect(x-46,635,18,6,'#fff2b2');rect(x+29,635,18,6,'#fff2b2');rect(x-47,649,95,5,'#b1b59b');g.strokeStyle='#e6d399';g.lineWidth=6;g.beginPath();g.moveTo(x+14,611);g.lineTo(x+32,602);g.stroke();g.save();g.translate(x+34,604-5);g.rotate(swing>0?-.25:0);g.strokeStyle='#e7c696';g.lineWidth=5;g.beginPath();g.ellipse(0,0,24,13,0,0,Math.PI*2);g.stroke();g.lineWidth=.8;g.strokeStyle='#f7f4dbaa';for(let i=-16;i<=16;i+=8){g.beginPath();g.moveTo(i,-9);g.lineTo(i,9);g.stroke()}for(let i=-6;i<=6;i+=6){g.beginPath();g.moveTo(-19,i);g.lineTo(19,i);g.stroke()}g.restore();/* no visible racket hit-range guide in procedural fallback */g.restore()}
// Cosmetic poses only: no pose or death fragment participates in physics.
let enemyDeaths=[],enemyPieces=[],barrelBlasts=[],hitFlashes=[];
const ENEMY_CLOTH=['#65535a','#242b39','#302139','#574b66','#68415a','#e4d6b0','#d49b39','#733e65'];
const fract=n=>n-Math.floor(n);
function enemyAnim(z){if(z.anim)return z.anim;const seed=(z.seed||0)*13.71+z.x*.31+z.y*.17+(z.form||0)*7.13;const r=n=>fract(Math.sin(seed+n*19.17)*43758.5453);return z.anim={type:Math.floor(r(1)*6),phase:r(2)*6.28,speed:2.5+r(3)*1.8,amp:.7+r(4)*.6,period:3+r(5)*3,side:r(6)>.5?1:-1,seed}}
function enemyPose(z){const a=enemyAnim(z),t=z.hitHold>0?z.hitAt:clock,b=z.boss,person=b?[1,3,2,5][z.bossForm||0]:a.type,speed=b?[1.7,3.2,2.3,2.7][z.bossForm||0]:a.speed,q=t*speed+a.phase,low=b&&z.hp/z.max<.3?1.35:1,amp=a.amp*low*(fxEnabled?1:.6),cycle=Math.floor((t+a.phase)/a.period),u=(t+a.phase)%a.period,gate=fract(Math.sin(a.seed+cycle*8.3)*919.1),twitch=(person===2||person===5)&&u<.2?Math.sin(u*65)*.08:0,roar=b&&u>.5&&u<1.2?Math.sin((u-.5)/.7*Math.PI):0;
const hit=clamp((z.recoil||0)/.22,0,1),dx=z.impactX||0,dy=z.impactY||-1,neighbor=(z.flinch||0)/.3;
return {lean:clamp(Math.sin(q)*(person===0?.068:.037)*amp+twitch+neighbor*.035*(z.flinchSide||1)+hit*dx*.06,-.13,.13),bob:Math.sin(q*1.8)*.8*amp,head:clamp(Math.sin(q-.65)*.045*amp+(person===4?.04:0)*a.side+twitch*(person===2?1.3:.8)-hit*.09, -.16,.16),left:Math.sin(q*.91)*.24*amp+(person===1?.28:person===3?-.28:0)+hit*.35,right:Math.sin(q*1.13+1.8)*.24*amp+(person===3?-.3:0)-hit*.3,shoulder:Math.sin(q*2.31)*.7+roar*1.5,jaw:clamp((person===1?2:person===5?2.5:.4)+Math.max(0,Math.sin(q*.64))*1.7+(gate>.4&&u<.5?Math.sin(u*42)*.7:0)+roar*4,0,7),lidL:person===4?4:((gate<.65&&u<.23)?7*Math.sin(u/.23*Math.PI):1),lidR:person===1?3:((gate>.65&&u>.3&&u<.53)?8*Math.sin((u-.3)/.23*Math.PI):0),eye:gate>.45&&u>1.3&&u<1.7?a.side*2:0,legL:Math.sin(q+1.1)*1.3,legR:Math.sin(q*.94+3)*1.1,hit,dx,dy,roar};}
// v102: Valid hits always show recoil/flash, but do not keep the boss
// stationary forever when multiple balls arrive more often than .19 sec.
const BOSS_STAGGER_REARM=.65;
function enemyReaction(z,n,impact,ballHit=true){
 const length=Math.hypot(impact?.x??0,impact?.y??-1)||1;
 z.impactX=(impact?.x??0)/length;z.impactY=(impact?.y??-1)/length;
 z.recoil=.29;
 if(z.eliteMotion){
  delete z.eliteMotion;z.eliteNextMove=clock+(z.eliteKind===2?.55:1.1);
 }
 if(clock<(z.hitShakeUntil||0))return;
 if(ballHit&&z.boss&&clock<(z.bossStaggerReadyAt||0))return;
 z.hitAt=clock;
 z.hitHold=ballHit?(z.boss?HIT_FREEZE_BOSS:HIT_FREEZE_NORMAL):.025;
 if(ballHit){
  z.hitShakeFrom=clock;z.hitShakeUntil=clock+z.hitHold;
  if(z.boss)z.bossStaggerReadyAt=clock+BOSS_STAGGER_REARM;
 }
}
function enemyDeath(z,critical=false){
 enemyAnim(z);
 // The green mascot uses its approved 8+10-frame death atlas, rather than
 // the generic 2-key critical/death poses shared by the other 9 object types.
 const eliteSprite=!z.boss&&Number.isInteger(z.eliteKind)&&window.ZZEliteSprites?.available(z)===true;
 const isGreen=!z.boss&&(z.form??0)===0&&!eliteSprite;
 const largeBossSprite=!!z.boss&&window.ZZLargeBossSprites?.available(z)===true;
 const objectSprite=!isGreen&&!eliteSprite&&!largeBossSprite&&window.ZZObjectSprite?.available(z)===true;
 const greenSprite=isGreen&&window.ZZGreenDeath?.ready===true;
 const spriteMode=largeBossSprite||eliteSprite||objectSprite||greenSprite;
 const split=largeBossSprite?(critical?.94:.78):eliteSprite?.72:objectSprite?(z.boss?(critical?.94:.78):(critical?.58:.52)):(greenSprite?(critical?.580:.520):(critical?.580:(z.boss?.32:.12)));
 const freeze=Math.max(0,(z.hitShakeUntil||0)-clock);
 enemyDeaths.push({source:z,z:{...z,flash:.12},critical,spriteMode,t:0,freeze,split:split+freeze,done:false});if(enemyDeaths.length>24)enemyDeaths.shift()}
function updateEnemyVisuals(dt){
 for(const ghost of dodgeGhosts)ghost.t+=dt;
 compactVisualQueue(dodgeGhosts,ghost=>ghost.t<ghost.life);
 advanceVisualQueue(hitFlashes,dt);advanceVisualQueue(barrelBlasts,dt);advanceVisualQueue(bazookaBlasts,dt);for(const z of foes){
 if(z.trashStopUntil>clock){z.hitHold=Math.max(0,(z.hitHold||0)-dt);continue}
 if(Number.isFinite(z.arrivalTime)){
  z.arrivalTime=Math.min(.62,z.arrivalTime+dt);
  if(z.arrivalTime>=.62)delete z.arrivalTime;
 }
 z.recoil=Math.max(0,(z.recoil||0)-dt);z.hitHold=Math.max(0,(z.hitHold||0)-dt);
 z.flinch=Math.max(0,(z.flinch||0)-dt);z.knockTime=Math.max(0,(z.knockTime||0)-dt);

}for(const d of enemyDeaths){d.t+=dt;if(!d.done&&d.t>=d.split){d.done=true;
 // Final bitmap already depicts lying down / cute brain debris; do not duplicate
 // the old procedural blast or turn a normal backward fall into a side explosion.
 // No procedural fragments when a bitmap sprite is missing.
}}compactVisualQueue(enemyDeaths,deathPending);for(const p of enemyPieces){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=420*dt;p.angle+=p.spin*dt}compactVisualQueue(enemyPieces,visualAlive)}
// Original ZOMBIE ZERO mascot critical death: hinged black head lid reveals
// a bright pink brain. Fixed front/elevated-top gameplay camera; NO floor shadow.
// This only changes the cosmetic death queue (never HP, scoring or colliders).
// Bitmap-only zombies and bosses. The former procedural/vector fallback
// must never replace approved character art during asynchronous image loads.
function drawEnemyDeaths(){
 for(const d of enemyDeaths){
  if(d.source)drawTrashContact(d.source);
  if(d.t<(d.freeze||0)){
   g.save();
   const t=d.t/Math.max(.001,d.freeze||.105);
   g.filter=t<.68?'brightness(2.25) saturate(.52)':'brightness(1.64) saturate(.83)';
   const jitter=hitShakeOffset(d.t,d.freeze||.105,!!d.z.boss);
   g.translate(jitter.x,jitter.y);zombie(d.z);g.restore();continue;
  }
  const elapsed=Math.max(0,d.t-(d.freeze||0));
  const duration=Math.max(.01,d.split-(d.freeze||0));
  // V155: All bitmap death routes (green / object / elite / boss) share
  // the same soft fade over the final two of eight animation frames.
  // Preserve the fully opaque hit-freeze and every approved source atlas.
  const progress=Math.min(1,elapsed/duration);
  const deathAlpha=progress<=.75?1:Math.max(0,(1-progress)*4);
  g.save();
  g.globalAlpha=(Number.isFinite(g.globalAlpha)?g.globalAlpha:1)*deathAlpha;
  if(d.spriteMode&&window.ZZLargeBossSprites?.available(d.z)===true)
   window.ZZLargeBossSprites.drawDeath(g,d.z,elapsed,duration);
  else if(d.spriteMode&&window.ZZEliteSprites?.available(d.z)===true)
   window.ZZEliteSprites.drawDeath(g,d.z,elapsed,duration);
  else if(d.spriteMode&&window.ZZObjectSprite?.available(d.z)===true)
   window.ZZObjectSprite.drawDeath(g,d.z,d.critical,elapsed,duration);
  else if(d.spriteMode&&window.ZZGreenDeath?.ready===true)
   window.ZZGreenDeath.draw(g,d.z,d.critical,elapsed);
  g.restore();
 }
}
function zombie(z){
 if(z.boss&&window.ZZLargeBossSprites?.draw(g,z,enemyAnimationClock))return;
 if(!z.boss&&window.ZZEliteSprites?.draw(g,z,enemyAnimationClock))return;
 const originalObject=window.ZZObjectSprite;
 if(originalObject?.draw(g,z,enemyAnimationClock)){
  if(z.burn>0){
   g.save();g.globalAlpha=.8;g.fillStyle='#ffb066';
   for(let i=0;i<3;i++)g.fillRect(z.x+6+i*11,z.y-9+Math.sin(clock*13+i)*4,3,9);
   g.restore();
  }
  return;
 }
 if(!z.boss&&(z.form??0)===0&&window.ZZGreenWalk?.draw(g,z,enemyAnimationClock))return;
 if(!z.boss&&(z.form??0)===0&&window.ZZGreenDeath?.ready===true)
  window.ZZGreenDeath.draw(g,z,false,0);
 // No generic rectangle/cube placeholder. The source sprite is mandatory.
}
const ITEM_ICON_KEYS=['bazooka','dual','triple','power','fire','slow','pierce','shield'];
function drawItemArtwork(k,x,y,size=24){
 const atlas=window.ZZItemIcons,ix=ITEM_ICON_KEYS.indexOf(k);
 if(ix>=0&&atlas?.ready&&atlas.image){
  g.drawImage(atlas.image,ix*128,0,128,128,x-size/2,y-size/2,size,size);
 }else{g.save();g.translate(x,y);g.scale(size/24,size/24);drawIcon(k,0,0);g.restore()} // same-sized fallback
}
// Small power-up symbols, not a toolbar: no timer text, solid panels or
// changing screen anchors. The faint ring alone indicates duration remaining.
// Falling pickups are collectibles, NOT the 17px equipped status symbols.
// Render approved item bitmap without a fuzzy duplicated additive border.
const FALLING_ITEM_SIZE=46;
function drawFallingItem(item){
 drawHardGroundShadow(item.x+2,item.y+FALLING_ITEM_SIZE*.48,30,6,true,.27);
 g.save();g.translate(item.x,item.y);
 g.rotate(Math.sin(clock*3+item.phase)*.055);
 g.shadowColor='transparent';g.shadowBlur=0;
 drawItemArtwork(item.k,0,0,FALLING_ITEM_SIZE);g.restore();
}
// At collection, a larger copy of the ITEM art pops outward briefly,
// surrounded by six fading square sparks. No item-name/description text.
function drawItemPickupFX(){
 for(const f of itemPickupFX){
  const t=Math.min(1,f.t/f.life),fade=Math.pow(1-t,1.3);
  const color=SKILLS[f.k].color;
  g.save();g.translate(f.x,f.y-18*t);
  if(fxEnabled){
   g.globalCompositeOperation='lighter';
   g.globalAlpha=.5*fade;
   g.shadowColor='transparent';g.shadowBlur=0;
   g.strokeStyle=color;g.lineWidth=2.4*(1-t)+.6;
   g.beginPath();g.arc(0,0,12+28*t,0,Math.PI*2);g.stroke();
   g.shadowBlur=0;
  }
  g.globalCompositeOperation='source-over';
  g.globalAlpha=fade;
  const size=18+15*Math.sin(t*Math.PI);
  drawItemArtwork(f.k,0,-4-t*16,size);
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3+.25,r=12+33*t;
   const px=Math.cos(a)*r,py=Math.sin(a)*r;
   rect(px-2,py-2,4,4,color);
  }
  g.restore();
 }
}
function drawActiveItemIcons(){
 const keys=ITEM_ICON_KEYS.filter(has);
 if(!keys.length||!['playing','clearing','paused'].includes(mode))return;
 const size=22,step=24; // increase 17px badges so the front-facing box emblem reads at mobile size
 const total=(keys.length-1)*step+size;
 const center=clamp(car,total/2+8,W-total/2-8);
 const first=center-(keys.length-1)*step/2;
 // 15px above the shield beam: sits directly beneath the vehicle wheels.
 // 22px artwork and 12.2px duration ring both finish before shield Y=652.
 const y=SHIELD_LINE_Y-15+VIEW_DELTA;
 for(let i=0;i<keys.length;i++){
  const key=keys[i],x=first+i*step;
  const skill=SKILLS[key],ratio=clamp(active[key]/(skill.duration*hero().duration),0,1);
  g.save();g.globalAlpha=.95;
  g.shadowColor='transparent';g.shadowBlur=0;
  drawItemArtwork(key,x,y,size);
  // A fine radial remaining-time indicator; intentionally no numbers.
  g.lineWidth=1.4;g.strokeStyle='#1b283a99';
  g.beginPath();g.arc(x,y,12.2,-Math.PI/2,Math.PI*1.5);g.stroke();
  g.strokeStyle=skill.color;
  g.beginPath();g.arc(x,y,12.2,-Math.PI/2,-Math.PI/2+Math.PI*2*ratio);g.stroke();
  g.restore();
 }
}
function drawIcon(k,x,y){g.save();g.translate(x-12,y-12);g.scale(.75,.75);g.strokeStyle=SKILLS[k].color;g.lineWidth=2.5;g.lineCap='round';g.lineJoin='round';const circle=(x,y,r)=>{g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke()};if(k==='dual'){circle(9,12,5);circle(23,20,5)}if(k==='triple'){circle(16,7,4);circle(7,23,4);circle(25,23,4)}if(k==='power'){circle(16,16,12);g.stroke(new Path2D('M17 6 10 18H16L15 26 23 13H17Z'))}if(k==='fire')g.stroke(new Path2D('M17 3C21 12 13 12 19 17L24 11C33 23 25 30 16 29S3 21 8 13L11 18C15 14 11 10 17 3Z'));if(k==='slow'){circle(16,17,11);g.stroke(new Path2D('M16 10V18L22 21M12 2H20M16 2V4'))}if(k==='bazooka')g.stroke(new Path2D('M5 21 20 6 27 13 12 28ZM18 8 24 14M6 22 4 28 10 26M19 3 21 1M28 10 31 9M26 3 29 0'));if(k==='pierce'){circle(6,16,4);g.beginPath();g.moveTo(12,16);g.lineTo(29,16);g.moveTo(22,9);g.lineTo(29,16);g.lineTo(22,23);g.stroke()}if(k==='shield')g.stroke(new Path2D('M16 3 27 7V17C27 23 16 29 16 29S5 23 5 17V7ZM10 16 14 20 22 11'));g.restore()}
// Fire stays attached to each burning enemy and sits on top of its sprite.
function drawBurningOverlays(){
 if(!fxEnabled)return;
 luminous(()=>{for(const actor of foes){
  const z=knockVisualPosition(actor);
  if(!(z.burn>0))continue;
  const cx=z.x+z.w/2,base=z.y+z.h-4,lifeFade=Math.min(1,z.burn/.25);
  g.save();g.globalAlpha=.92*lifeFade;
  g.shadowColor='#ff822d';g.shadowBlur=9;
  // Pixel flames grow in staggered, stepped square stacks without a flat glowing border.
  for(let column=-3;column<=3;column++){
   const x=cx+column*(z.boss?10:6);
   const wave=.5+.5*Math.sin(clock*24+column*3.7+(z.seed||0));
   const height=(z.boss?41:24)*(.65+.35*wave)*(1-.09*Math.abs(column));
   for(let step=0;step<5;step++){
    const frac=step/5,y=base-height*frac,span=Math.max(2,(z.boss?7:5)-step*.65);
    g.fillStyle=step>3?'#fff4a4':step>1?'#ffb641':'#f35a26';
    g.globalAlpha=lifeFade*(1-step*.11);
    g.fillRect(Math.round(x-span/2+Math.sin(clock*15+column*2+step)*2),Math.round(y),Math.ceil(span),Math.ceil((z.boss?8:5)));
   }
  }
  g.restore();
 }});
}

function drawBallVanish(){
 for(const f of ballVanish){
  const t=clamp(f.t/Math.min(.28,f.life),0,1),fade=Math.pow(1-t,1.4);
  if(!fade)continue;
  const col=f.reason==='lost'?'#ff9bad':f.reason==='clear'?'#fff2a0':'#b8f9ed';
  g.save();
  for(let i=0;i<13;i++){
   const a=i*2.39996,dist=5+t*(18+i%3*7),sz=Math.max(1,Math.ceil((5-i%3)*(1-t*.6)));
   g.globalAlpha=fade*(i%2?.6:1);g.fillStyle=i%4===0?'#fff6e5':col;
   g.fillRect(Math.round(f.x+Math.cos(a)*dist),Math.round(f.y+Math.sin(a)*dist),sz,sz);
  }
  for(let i=0;i<f.trail.length;i++){
   const p=f.trail[i],sz=Math.max(1,4-i*.4);
   g.globalAlpha=fade*(1-i/f.trail.length)*.5;
   g.fillRect(p.x-sz/2,p.y-sz/2,sz,sz);
  }
  g.restore();
 }
}

function drawCriticalPopups(){
 // Pixel-block outlined title, readable across the muted roadway.
 for(const f of criticalPopups){
  const t=clamp(f.t/f.life,0,1),fade=Math.min(1,(1-t)*2.8);
  const x=clamp(f.x,95,W-95),y=clamp(f.y-24-t*28,131,DEFENSE_Y-40);
  const word='CRITICAL!';
  g.save();g.translate(x,y);g.globalAlpha=fade;
  const sc=(f.textScale??1)*(.82+.18*Math.sin(Math.min(1,t*4)*Math.PI/2));
  g.scale(sc,sc);g.textAlign='center';g.textBaseline='middle';
  g.font='400 16px "Press Start 2P",monospace';g.lineJoin='bevel';
  g.shadowColor=f.pierce?'#ffe061':'#fff4bb';g.shadowBlur=fxEnabled?15*fade:0;
  g.strokeStyle='#17212b';g.lineWidth=5;g.strokeText(word,0,0);
  g.fillStyle=f.pierce?'#ffda49':'#fff2a3';
  arcadeGlowText(word,0,0,12);
  g.shadowBlur=0;
  for(const side of [-1,1])for(let i=0;i<3;i++){
   const px=side*(68+9*i+16*t),py=(i-1)*9+t*(i%2?8:-8);
   rect(px,py,4+i%2,4+i%2,f.pierce?'#ffe769':'#fff5ad');
  }
  g.restore();
 }
}
function drawImpactFlashes(){
 if(!fxEnabled||!hitFlashes.length)return;
 for(const f of hitFlashes){
  if(f.t<(f.delay||0))continue;
  const t=clamp((f.t-(f.delay||0))/Math.max(.01,f.life-(f.delay||0)),0,1);
  if(t>=1)continue;
  const palette=f.piercing?['#ffffff','#a3f5ff','#4dc8ed']:['#fffefe','#ffe58c','#ffac51'];
  const drawHit=()=>drawPixelBurst(f.x,f.y,t,f.critical?55:(f.spread||44),f.critical?32:16,
    (f.x*.17+f.y*.09)%6.28,palette,f.angle||0,f.critical?1:1.75,
    f.critical?.56:1.45,f.critical?1.3:.78,f.critical?1:.35);
  // Critical hits retain full shader; ordinary hits get only subtle local glow.
  if(f.critical)luminous(drawHit);else drawHit();
 }
}
function drawBarrelBlasts(){
 if(!fxEnabled||!barrelBlasts.length)return;
 luminous(()=>{for(const b of barrelBlasts){
  const t=clamp(b.t/.34,0,1);
  if(t>=1)continue;
  drawPixelBurst(b.x,b.y,t,RED_BARREL_RADIUS*1.08,60,b.seed,
    ['#fffefa','#ffdc60','#ff9c31','#f04e24','#9b3831'],0);
  // Three fast, chunky fire-pixel clusters blast out, then disappear.
  g.save();g.globalAlpha=Math.max(0,(1-t*3)*.8);
  const size=40+24*t;g.fillStyle='#fff5c7';
  g.fillRect(b.x-size/2,b.y-size/2,size,size);g.restore();
 }});
}

// V60: Each empowered ball uses small fast pixel embers, never fixed green spikes.
// V79: Full-sized, crisp elemental aura follows the actual ball, not just
// the wake. The baseline ball art remains untouched; status colors distinguish
// piercing (cyan), fire (orange) and large/power (gold).
// V82: polished, close-fitting bitmap-ball accents. The real ball retains its
// exact 2x powered diameter; effects never form a second oversized silhouette.
// v108: stacked skills use a fixed, small render budget even with one ball.
function compactBallFX(){
 return fxEnabled&&(has('pierce')||
  (has('fire')&&(has('power')||balls.length>=3)));
}
// V156: Compact LOD still draws the skill colors. The previous early returns
// erased ALL fire/pierce/power accents whenever stacked skills were active.
// Keep a fixed 2-7 tiny additive dots per pass, with no blur or gradients.
function drawCompactBallStatus(b,r,front=false){
 if(!fxEnabled)return;
 const fire=has('fire'),pierce=has('pierce'),power=has('power');
 if(!fire&&!pierce&&!power)return;
 const phase=clock*(front?1.1:.72),radius=r*(front?1.14:1.35);
 g.save();g.translate(b.x,b.y);
 g.globalCompositeOperation='lighter';g.shadowBlur=0;
 const emit=(count,phaseOffset,color,alpha)=>{
  for(let i=0;i<count;i++){
   const a=phase+phaseOffset+i*Math.PI*2/count;
   g.fillStyle=color;g.globalAlpha=alpha;
   g.beginPath();
   g.arc(Math.cos(a)*radius,Math.sin(a)*radius,
     Math.max(.85,Math.min(1.45,r*.095)),0,Math.PI*2);
   g.fill();
  }
 };
 if(fire)emit(front?2:3,0,'#ff9a3f',front?.56:.68);
 if(pierce)emit(front?2:3,Math.PI/3,'#a9f4ff',front?.66:.76);
 if(power)emit(front?1:2,Math.PI/4,'#ffdf87',front?.45:.55);
 g.restore();
}
function drawBallStateAura(b,r){
 if(typeof compactBallFX==='function'&&compactBallFX()){
  drawCompactBallStatus(b,r,false);return;
 }
 const fire=has('fire'),pierce=has('pierce'),power=has('power');
 if(!fxEnabled||!(fire||pierce||power))return;
 const phase=clock*(b.held?2.4:4.2),pulse=.5+.5*Math.sin(clock*9.5);
 const shell=r*1.62,glowLimit=r*1.72;
 const layers=Number(fire)+Number(pierce)+Number(power);
 const balance=layers>1?.7:1;
 const hue=fire&&pierce?'#d7e8df':fire?'#ff8c45':pierce?'#67dfff':'#f0d775';
 g.save();g.translate(b.x,b.y);
 g.globalCompositeOperation='lighter';g.shadowBlur=0;g.lineCap='round';
 // A feathered *internal* light falloff replaces hard square coronas.
 const gradient=g.createRadialGradient?.(0,0,r*.72,0,0,glowLimit);
 if(gradient&&typeof gradient.addColorStop==='function'){
  gradient.addColorStop(0,'#ffffff00');
  gradient.addColorStop(.50,hue+'12');
  gradient.addColorStop(.79,hue+'42');
  gradient.addColorStop(1,hue+'00');
  g.globalAlpha=balance*(b.held?.57:.85);
  g.fillStyle=gradient;g.beginPath();g.arc(0,0,glowLimit,0,Math.PI*2);g.fill();
 }
 if(pierce){
  // Six separated cyan light arcs, not giant spikes projecting from the ball.
  g.strokeStyle='#70dafc';g.lineWidth=Math.max(1,r*.105);
  for(let i=0;i<6;i++){
   const angle=phase*.31+i*Math.PI/3;
   g.globalAlpha=balance*(.47+.18*pulse);
   g.beginPath();g.arc(0,0,shell*.97,angle,angle+.28);g.stroke();
  }
  for(let i=0;i<6;i++){
   const angle=-phase*.38+i*Math.PI/3;
   const d=shell*(.93+.035*Math.sin(phase+i));
   g.globalAlpha=balance*(.5+.25*pulse);g.fillStyle=i%2?'#70dafc':'#e8ffff';
   g.beginPath();g.arc(Math.cos(angle)*d,Math.sin(angle)*d,Math.max(.8,r*.072),0,Math.PI*2);g.fill();
  }
 }
 if(fire){
  // Fine tapered-looking curved flame filaments stay within the ball outline.
  for(let i=0;i<7;i++){
   const angle=i*Math.PI*2/7+.12*Math.sin(phase+i*.8);
   const start=r*1.12,tip=shell*(.95+.045*Math.sin(phase*1.6+i));
   g.strokeStyle=i%3===0?'#fff1b7':i%2?'#ff9236':'#ff5f2b';
   g.lineWidth=Math.max(1.1,r*.10);g.globalAlpha=balance*(.62+.13*pulse);
   g.beginPath();
   g.moveTo(Math.cos(angle)*start,Math.sin(angle)*start);
   g.quadraticCurveTo(Math.cos(angle+.12)*(start+tip)*.53,Math.sin(angle+.12)*(start+tip)*.53,
     Math.cos(angle+.08)*tip,Math.sin(angle+.08)*tip);
   g.stroke();
  }
  for(let i=0;i<5;i++){
   const angle=phase*.44+i*2.399963,dist=shell*(.79+.15*(.5+.5*Math.sin(phase+i*1.7)));
   g.fillStyle=i%3===0?'#fff1b7':i%2?'#ff9236':'#ff5f2b';
   g.globalAlpha=balance*.67;
   g.beginPath();g.arc(Math.cos(angle)*dist,Math.sin(angle)*dist,
     Math.max(.9,r*.082),0,Math.PI*2);g.fill();
  }
 }
 if(power){
  // Thin, layered golden crescents frame the ball without enlarging it.
  for(let i=0;i<5;i++){
   const angle=phase*.17+i*Math.PI*2/5;
   g.strokeStyle=i%2?'#fff4bd':'#f6d46d';
   g.lineWidth=Math.max(1.15,r*.093);g.globalAlpha=balance*(.55+.2*pulse);
   g.beginPath();g.arc(0,0,shell*.98,angle,angle+.41);g.stroke();
  }
  for(let i=0;i<4;i++){
   const angle=phase*.24+i*Math.PI/2,dist=shell*(.85+.07*pulse);
   g.fillStyle=i%2?'#fff4bd':'#f6d46d';g.globalAlpha=balance*.70;
   g.beginPath();g.arc(Math.cos(angle)*dist,Math.sin(angle)*dist,
     Math.max(1,r*.083),0,Math.PI*2);g.fill();
  }
 }
 g.restore();
}

// A few bright shards are drawn AFTER the opaque ball sprite so the state
// remains readable on white baseballs and pale green tennis balls.
// V82: sparse surface glints on TOP of the bitmap, not oversized pixels.
function drawBallStatusForeground(b,r){
 if(typeof compactBallFX==='function'&&compactBallFX()){
  drawCompactBallStatus(b,r,true);return;
 }
 const fire=has('fire'),pierce=has('pierce'),power=has('power');
 if(!fxEnabled||!(fire||pierce||power))return;
 const count=Number(fire)+Number(pierce)+Number(power),balance=count>1?.73:1;
 const rim=r*1.49,t=clock;
 g.save();g.translate(b.x,b.y);g.shadowBlur=0;g.lineCap='round';
 g.globalCompositeOperation='lighter';
 const glint=(angle,color,opacity,step=1)=>{
  const x=Math.cos(angle)*rim,y=Math.sin(angle)*rim;
  const dx=Math.cos(angle+.46)*step,dy=Math.sin(angle+.46)*step;
  g.strokeStyle=color;g.lineWidth=Math.max(.95,r*.073);
  g.globalAlpha=balance*opacity;
  g.beginPath();g.moveTo(x-dx,y-dy);g.lineTo(x+dx,y+dy);g.stroke();
 };
 if(pierce)for(let i=0;i<4;i++)glint(t*.66+i*Math.PI/2,'#e8ffff',.8,1.6);
 if(fire)for(let i=0;i<4;i++)glint(-t*.49+i*Math.PI/2,
   i%2?'#fff1b7':'#ff9236',.72,1.5);
 if(power)for(let i=0;i<4;i++)glint(t*.34+i*Math.PI/2,
   i%2?'#fff5d4':'#f6d46d',.62,1.75);
 g.restore();
}

// Physical tennis, baseball and toy-ball sprite colors, not one shared lime beam.
const HERO_BALL_TRAILS=[
 {main:'#d8efa1',soft:'#95b96e',accent:'#f4f8d1'}, // tennis felt
 {main:'#f2e9dd',soft:'#c9bdaf',accent:'#c86e6b'}, // baseball leather + stitches
 {main:'#f5be76',soft:'#78c2d9',accent:'#e995c2'}  // colorful toy ball
];
// V67 physical substep history: one shared centerline for ribbon and skill chips.
const BALL_TRAIL_NORMAL=170,BALL_TRAIL_POWER=190;
function recordBallTrail(b,x,y,corner=false){
 if(b.held)return;
 const last=b.trail[0];
 if(last&&Math.hypot(last.x-x,last.y-y)<.7){if(corner)last.corner=true;return}
 b.trail.unshift({x,y,corner:!!corner});
 if(b.trail.length>96)b.trail.length=96;
}
function buildBallTrailPath(b,r,points){
 if(b.held||!b.trail?.length)return [];
 // Reuse vertex storage per live ball; retain the exact spline and sampling.
 // Index zero is the current position (without a historical corner flag).
 const head={x:b.x,y:b.y},trail=b.trail,limit=r>8?BALL_TRAIL_POWER:BALL_TRAIL_NORMAL;
 let total=0;const path=[];
 const append=(x,y,s)=>{
  const i=path.length,p=points?(points[i]||(points[i]={x:0,y:0,s:0})):{};
  p.x=x;p.y=y;p.s=s;path.push(p);
 };
 append(b.x,b.y,0);
 for(let i=0;i<trail.length&&total<limit;i++){
  const p=i?trail[i-1]:head,q=trail[i],prev=i>1?trail[i-2]:head,next=trail[Math.min(trail.length-1,i+1)];
  const dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy);if(len<.6)continue;
  const count=Math.ceil(len/2.6),corner=p.corner||q.corner;
  const m0x=corner?dx:(q.x-prev.x)*.5,m0y=corner?dy:(q.y-prev.y)*.5;
  const m1x=corner?dx:(next.x-p.x)*.5,m1y=corner?dy:(next.y-p.y)*.5;
  const minX=Math.min(p.x,q.x),maxX=Math.max(p.x,q.x),minY=Math.min(p.y,q.y),maxY=Math.max(p.y,q.y);
  for(let n=1;n<=count;n++){
   const t=n/count,t2=t*t,t3=t2*t;
   const x=clamp(corner?p.x+dx*t:(2*t3-3*t2+1)*p.x+(t3-2*t2+t)*m0x+(-2*t3+3*t2)*q.x+(t3-t2)*m1x,minX,maxX);
   const y=clamp(corner?p.y+dy*t:(2*t3-3*t2+1)*p.y+(t3-2*t2+t)*m0y+(-2*t3+3*t2)*q.y+(t3-t2)*m1y,minY,maxY);
   const last=path[path.length-1],step=Math.hypot(x-last.x,y-last.y);if(step<.04)continue;
   if(total+step>=limit){const z=(limit-total)/step;append(last.x+(x-last.x)*z,last.y+(y-last.y)*z,limit);return path}
   total+=step;append(x,y,total);
  }
 }
 return path;
}
function sampleBallTrail(path,d){
 // Monotonic arc-length lookup: O(log N) instead of scanning up to ~74
 // spline vertices for EACH flame, electric spark and floor reflection.
 const n=path.length;
 if(n<2)return path[0]||null;
 // Preserve the original sample contract for positions beyond the tail.
 if(d>path[n-1].s)return path[n-1];
 let low=1,high=n-1;
 while(low<high){
  const mid=(low+high)>>1;
  if(path[mid].s<d)low=mid+1;else high=mid;
 }
 const a=path[low-1],b=path[low];
 const t=clamp((d-a.s)/Math.max(.001,b.s-a.s),0,1);
 return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
}
function drawHeroBallTrail(b,r,path=buildBallTrailPath(b,r)){
 if(path.length<2)return;
 const col=HERO_BALL_TRAILS[selectedHero]||HERO_BALL_TRAILS[0];
 const n=path.length-1,len=Math.max(1,path[n].s),tip=path[n];
 const grad=g.createLinearGradient?.(tip.x,tip.y,b.x,b.y);
 if(grad&&typeof grad.addColorStop==='function'){
  grad.addColorStop(0,col.soft+'00');grad.addColorStop(.3,col.main+'55');grad.addColorStop(.7,col.main+'85');grad.addColorStop(1,col.main+'b0');
 }
 g.save();g.fillStyle=grad||col.main+'88';g.beginPath();
 // Trace the EXACT same left/right vertices directly to Canvas. Avoid two
 // temporary arrays and 2*(N+1) point allocations every rendered frame.
 for(let i=0;i<=n;i++){
  const p=path[i],a=path[Math.max(0,i-1)],z=path[Math.min(n,i+1)];
  const dx=a.x-z.x,dy=a.y-z.y,m=Math.hypot(dx,dy)||1;
  const taper=clamp((len-p.s)/Math.min(17,len*.3),0,1);
  const half=Math.min(r*.76,11)*(1-.2*p.s/len)*(.2+.8*taper);
  const x=p.x-dy/m*half,y=p.y+dx/m*half;
  if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
 }
 for(let i=n;i>=0;i--){
  const p=path[i],a=path[Math.max(0,i-1)],z=path[Math.min(n,i+1)];
  const dx=a.x-z.x,dy=a.y-z.y,m=Math.hypot(dx,dy)||1;
  const taper=clamp((len-p.s)/Math.min(17,len*.3),0,1);
  const half=Math.min(r*.76,11)*(1-.2*p.s/len)*(.2+.8*taper);
  g.lineTo(p.x+dy/m*half,p.y-dx/m*half);
 }
 g.closePath();g.fill();g.restore();
}
// V90: the existing bitmap-colored ribbon stays crisp inside, while
// the outer edge receives a light feather and a small amount of the
// existing FXRenderer bloom. No new full-screen shader or sprite sheet.
function drawTrailEdgeHalo(b,r,path,bloomScale=1){
 if(!fxEnabled||b.held||!path||path.length<2)return;
 const col=HERO_BALL_TRAILS[selectedHero]||HERO_BALL_TRAILS[0];
 const fire=has('fire'),pierce=has('pierce'),power=has('power');
 const glow=fire&&pierce?'#bce6e8':pierce?'#7bdcff':
   fire?'#ffa354':power?'#ffe0a3':col.main;
 const end=path[path.length-1],head=path[0];
 const grad=g.createLinearGradient?.(end.x,end.y,head.x,head.y);
 if(grad&&typeof grad.addColorStop==='function'){
  grad.addColorStop(0,glow+'00');
  grad.addColorStop(.16,glow+'30');
  grad.addColorStop(.58,glow+'8a');
  grad.addColorStop(1,glow+'c2');
 }
 g.save();g.globalCompositeOperation='lighter';
 g.lineCap='round';g.lineJoin='round';
 g.shadowColor=glow;g.shadowBlur=4;
 // The ordinary feathered edge remains identical. Only the separate
 // bloom capture uses a lower alpha (v92).
 g.globalAlpha=.23*bloomScale;g.strokeStyle=grad||glow;
 g.lineWidth=r*1.55;
 g.beginPath();g.moveTo(head.x,head.y);
 for(let i=2;i<path.length;i+=2)g.lineTo(path[i].x,path[i].y);
 if((path.length-1)%2!==0)g.lineTo(end.x,end.y);
 g.stroke();g.restore();
}
// A softly feathered path is captured into the existing FX-only bloom
// surface, not the background or the original ball sprite.
// V82: fine comet streaks / light motes. No wide blocky particle chips.
// v107: a single broad body for elemental shots, independent of ball count.
// Round, short strokes follow every history vertex, including reversal corners.
// A coincident head/tail falls back to solid color instead of disappearing.
function drawElementalTrailBody(b,r,path,fire,pierce){
 const head=path[0],tail=path[path.length-1];
 const color=fire&&pierce?'#ffad62':fire?'#ff9b46':'#79d8f6';
 g.save();g.lineCap='round';g.lineJoin='round';g.shadowBlur=0;
 g.globalCompositeOperation='lighter';g.globalAlpha=.52;
 // One stroke composites overlapping joins only once: no bright dotted seams.
 // A closed rebound must not create a zero-length transparent gradient.
 // A hairpin/rebound may put head almost on top of tail. A spatial
 // gradient then maps the whole loop to zero alpha and the trail vanishes.
 // Use a fixed visible body on folded paths; vertex/length data is unchanged.
 const displacement=Math.hypot(head.x-tail.x,head.y-tail.y);
 const useGradient=displacement>Math.min(24,path[path.length-1].s*.33);
 const gradient=useGradient&&g.createLinearGradient?.(tail.x,tail.y,head.x,head.y);
 if(gradient&&typeof gradient.addColorStop==='function'){
  gradient.addColorStop(0,color+'00');gradient.addColorStop(.35,color+'65');
  gradient.addColorStop(1,color+'ff');
 }
 g.strokeStyle=gradient||color;g.lineWidth=r*1.52;
 g.beginPath();g.moveTo(head.x,head.y);
 for(let i=1;i<path.length;i++)g.lineTo(path[i].x,path[i].y);
 g.stroke();g.restore();
}
function drawBallSkillTrail(b,r,path=buildBallTrailPath(b,r)){
 const fast=typeof multiSkillFastRender!=='undefined'&&multiSkillFastRender;
 if(!fxEnabled||path.length<2)return;
 const fire=has('fire'),pierce=has('pierce'),power=has('power');
 if(!fire&&!pierce&&!power)return;
 if(fire||pierce){drawElementalTrailBody(b,r,path,fire,pierce);return;}
 const colors=fire&&pierce?['#ffd49b','#91e6fd','#fff8de']:fire?['#ffba77','#ff813e','#fff0c5']:
   pierce?['#79d8f6','#d9faff','#a3e7ff']:['#ffe8a0','#fff5d5','#e5c573'];
 const len=path[path.length-1].s;
 const step=fast?(r>8?14.5:13.5):(r>8?6.5:5.5);
 g.save();g.lineCap='round';g.lineJoin='round';
 g.globalCompositeOperation='lighter';
 // A single continuous, slightly feathered energy core stops individual
 // skill streaks looking like disconnected Morse-code dashes.
 const first=path[0],tail=path[path.length-1];
 const ribbon=g.createLinearGradient?.(tail.x,tail.y,first.x,first.y);
 if(ribbon&&typeof ribbon.addColorStop==='function'){
  ribbon.addColorStop(0,colors[0]+'00');
  ribbon.addColorStop(.23,colors[0]+'48');
  ribbon.addColorStop(.63,colors[1]+'a0');
  ribbon.addColorStop(1,colors[1]+'d0');
 }
 g.strokeStyle=ribbon||colors[0];
 g.globalAlpha=.48;g.lineWidth=Math.min(4.5,r*.39);
 g.shadowColor=colors[0];g.shadowBlur=3;
 g.beginPath();g.moveTo(first.x,first.y);
 for(let i=2;i<path.length;i+=2)g.lineTo(path[i].x,path[i].y);
 if((path.length-1)%2!==0)g.lineTo(tail.x,tail.y);
 g.stroke();
 g.shadowBlur=0;
 // Short overlapping sparks occur every 5–6.5px (was 11–13px). The
 // continuous core beneath them remains exactly the original trail length.
 for(let d=3,i=0;d<len-1;d+=step,i++){
  const p=sampleBallTrail(path,d),next=sampleBallTrail(path,Math.min(len,d+step+2));
  if(!p||!next)continue;
  const dx=next.x-p.x,dy=next.y-p.y,mag=Math.hypot(dx,dy)||1;
  const nx=-dy/mag,ny=dx/mag;
  const fade=1-.78*d/Math.max(1,len);
  const width=Math.min(2.3,Math.max(1,r*.14));
  g.strokeStyle=colors[i%3];g.lineWidth=width;g.globalAlpha=.36*fade;
  g.beginPath();g.moveTo(p.x,p.y);g.lineTo(next.x,next.y);g.stroke();
  if(!fast&&i%3===0){
   const lateral=r*.72,chip=Math.max(.8,width*.48);
   for(const side of [-1,1]){
    g.fillStyle=colors[(i+1+(side>0?1:0))%3];g.globalAlpha=.32*fade;
    g.beginPath();g.arc(p.x+nx*side*lateral,p.y+ny*side*lateral,chip,0,Math.PI*2);g.fill();
   }
  }
 }
 g.restore();
}
// V83: fire is a living secondary layer, never a replacement for the ball bitmap.
// v101: scope-limited multi-ball fast mode. Ordinary 1/2 ball effects keep
// every original render call and visual characteristic intact.
let multiSkillFastRender=false;
// Tapered cubic tongues, warm inner cores and a backward-flowing ember ribbon.
function flameTongue(x,y,dx,dy,width,outer,alpha=1){
 const mag=Math.hypot(dx,dy)||1,nx=-dy/mag,ny=dx/mag;
 const len=mag,root=width*.64;
 g.save();g.globalAlpha=alpha;g.fillStyle=outer;
 g.beginPath();g.moveTo(x+nx*root,y+ny*root);
 g.bezierCurveTo(x+dx*.33+nx*width*.9,y+dy*.33+ny*width*.9,
  x+dx*.72+nx*width*.34,y+dy*.72+ny*width*.34,x+dx,y+dy);
 g.bezierCurveTo(x+dx*.64-nx*width*.36,y+dy*.64-ny*width*.36,
  x+dx*.25-nx*width*.9,y+dy*.25-ny*width*.9,
  x-nx*root,y-ny*root);g.closePath();g.fill();
 g.restore();
}
function drawBurningBallFlames(b,r,front=false){
 const fast=(typeof compactBallFX==='function'&&compactBallFX())||
  (typeof multiSkillFastRender!=='undefined'&&multiSkillFastRender);
 if(!fxEnabled||!has('fire'))return;
 const t=clock,velocity=Math.hypot(b.vx||0,b.vy||0);
 const windX=velocity>1?-(b.vx||0)/velocity:0,windY=velocity>1?-(b.vy||0)/velocity:-1;
 // Power increases the physical ball from r=8 to 12, but the ornament
 // thickness grows less aggressively so overlapping skills never look broken.
 const fxRadius=r>8?8+(r-8)*.55:r;
 g.save();g.translate(b.x,b.y);g.globalCompositeOperation='lighter';
 if(!front&&!fast){
  const glow=g.createRadialGradient?.(0,0,r*.65,0,0,r*2.05);
  if(glow&&typeof glow.addColorStop==='function'){
   glow.addColorStop(0,'rgba(255,238,155,0)');
   glow.addColorStop(.47,'rgba(255,146,47,.18)');
   glow.addColorStop(.78,'rgba(255,86,27,.14)');
   glow.addColorStop(1,'rgba(255,86,27,0)');
   g.fillStyle=glow;g.globalAlpha=.87;g.beginPath();g.arc(0,0,r*2.05,0,Math.PI*2);g.fill();
  }
 }
 const count=fast?(front?2:4):(front?6:12);
 g.shadowColor=fast||front?'transparent':'#ff7b2a';g.shadowBlur=fast||front?0:4;
 for(let i=0;i<count;i++){
  const angle=i*Math.PI*2/count+.06*Math.sin(t*7+i*2.3);
  const ax=Math.cos(angle),ay=Math.sin(angle);
  const wave=.5+.5*Math.sin(t*(front?13:10)+i*2.4);
  const bx=ax*r*(front?1.17:1.26),by=ay*r*(front?1.17:1.26);
  const length=fxRadius*(front?.18+.18*wave:fast?.38+.28*wave:.25+.23*wave);
  const dx=ax*length*.75+windX*length*.46;
  const dy=ay*length*.75+windY*length*.46;
  const width=fxRadius*(front?.085:fast?.17:.14)*(1+.2*wave);
  const alpha=front?.47:.73;
  flameTongue(bx,by,dx,dy,width,i%3===0?'#ffe393':i%2?'#ffad48':'#ff6428',alpha);
  if(!front&&!fast)flameTongue(bx,by,dx*.62,dy*.62,width*.46,'#fff4bf',.46);
 }
 if(front){
  // Surface heat should glimmer over, but not obscure, the three ball designs.
  g.globalAlpha=.22;g.strokeStyle='#ffd88a';g.lineWidth=Math.max(1,r*.07);
  for(let i=0;i<4;i++){
   const a=t*.85+i*Math.PI/2;
   g.beginPath();g.arc(0,0,r*1.22,a,a+.37);g.stroke();
  }
 }
 g.restore();
}
function drawBurningTrailFlames(b,r,path){
 const fast=(typeof compactBallFX==='function'&&compactBallFX())||
  (typeof multiSkillFastRender!=='undefined'&&multiSkillFastRender);
 if(!fxEnabled||!has('fire')||!path||path.length<2)return;
 const t=clock,maxLen=path[path.length-1].s;
 if(maxLen<4)return;
 if(fast){
  // Even an 8px-long fresh trail gets a spark near the head. Multi-ball
  // keeps a coarser fixed budget; 1/2-ball power/pierce is more detailed.
  const spacing=typeof balls!=='undefined'&&balls.length>=3?19:12;
  const ornamentR=r>8?8+(r-8)*.55:r;
  g.save();g.globalCompositeOperation='lighter';
  for(let d=3,i=0;d<maxLen-1;d+=spacing,i++){
   const p=sampleBallTrail(path,d),q=sampleBallTrail(path,Math.min(maxLen,d+7));
   if(!p||!q)continue;
   let dx=q.x-p.x,dy=q.y-p.y,mag=Math.hypot(dx,dy);
   if(mag<.35){dx=b.vx||0;dy=b.vy||-1;mag=Math.hypot(dx,dy)||1}
   const nx=-dy/mag,ny=dx/mag,side=i%2?-1:1;
   const fade=Math.pow(Math.max(.08,1-d/maxLen),.9);
   const reach=(12+3*Math.sin(t*11+i*2))*fade;
   flameTongue(p.x+nx*side*ornamentR*.42,p.y+ny*side*ornamentR*.42,
    dx/mag*reach+nx*side*reach*.5,dy/mag*reach+ny*side*reach*.5,
    Math.max(.7,ornamentR*.18*fade),i%3?'#ff8d36':'#ffe0a1',.72*fade);
  }
  g.restore();return;
 }
 g.save();g.lineCap='round';g.globalCompositeOperation='lighter';g.shadowBlur=0;
 // Tongues curl and detach from the outer edge of the moving trail,
 // staggered in time instead of one rigid straight beam.
 for(let d=3,i=0;d<maxLen-1;d+=10,i++){
  const p=sampleBallTrail(path,d),q=sampleBallTrail(path,Math.min(maxLen,d+7));
  if(!p||!q)continue;
  const dx=q.x-p.x,dy=q.y-p.y,mag=Math.hypot(dx,dy)||1;
  const nx=-dy/mag,ny=dx/mag;
  const fade=Math.pow(1-d/maxLen,1.25);
  for(const side of [-1,1]){
   const oscillation=Math.sin(t*13+i*2.2+side*1.5);
   const base=r*(.45+.25*oscillation);
   const x=p.x+nx*side*base,y=p.y+ny*side*base;
   const reach=(8+5*(.5+.5*oscillation))*fade;
   const tx=dx/mag*reach+nx*side*reach*.65;
   const ty=dy/mag*reach+ny*side*reach*.65;
   flameTongue(x,y,tx,ty,Math.max(.7,r*.17*fade),
     (i+side)%3===0?'#fff1b5':i%2?'#ff9e41':'#f75c2c',.78*fade);
  }
 }
 g.restore();
}

// V84: clearly readable cyan-white lightning for piercing shots.
// Each arc receives a blurred additive outer glow and crisp inner filament.
function drawElectricArc(points,alpha=1,scale=1){
 const fast=(typeof compactBallFX==='function'&&compactBallFX())||
  (typeof multiSkillFastRender!=='undefined'&&multiSkillFastRender);
 if(!points||points.length<2)return;
 g.save();g.lineCap='round';g.lineJoin='miter';
 g.globalCompositeOperation='lighter';g.beginPath();
 g.moveTo(points[0].x,points[0].y);
 for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
 if(fast){
  // Omit two shadow-blurred outer strokes for every fast-mode lightning arc.
  g.shadowBlur=0;g.strokeStyle='#a9f4ff';g.lineWidth=2.15*scale;
  g.globalAlpha=.81*alpha;g.stroke();g.restore();return;
 }
 g.shadowColor='#69dfff';g.shadowBlur=9*scale;
 g.strokeStyle='#45c8ff';g.lineWidth=3.5*scale;g.globalAlpha=.39*alpha;g.stroke();
 g.shadowBlur=3.5*scale;g.strokeStyle='#a3efff';
 g.lineWidth=1.85*scale;g.globalAlpha=.85*alpha;g.stroke();
 g.shadowBlur=0;g.strokeStyle='#f0ffff';
 g.lineWidth=Math.max(.75,.86*scale);g.globalAlpha=.94*alpha;g.stroke();
 g.restore();
}
function drawPierceBallLightning(b,r,front=false){
 // A single thin foreground bolt keeps fire + pierce recognizable in
 // compact mode; pierce-only compact remains back-only to limit overdraw.
 if(front&&typeof compactBallFX==='function'&&compactBallFX()&&!has('fire'))return;
 const fast=(typeof compactBallFX==='function'&&compactBallFX())||
  (typeof multiSkillFastRender!=='undefined'&&multiSkillFastRender);
 if(!fxEnabled||!has('pierce'))return;
 const beat=Math.floor(clock*25),count=fast?(front?1:2):(front?3:4);
 const bright=has('fire')?.86:1;
 g.save();g.translate(b.x,b.y);
 for(let i=0;i<count;i++){
  const a=i*Math.PI*2/count+beat*.43+(front?.22:0);
  const start=r*(front?1.10:1.34),end=r*(front?1.59:1.74);
  const sign=i%2?-1:1,wobble=Math.sin(beat*1.43+i*5.3);
  const points=[
   {x:Math.cos(a)*start,y:Math.sin(a)*start},
   {x:Math.cos(a+.16*sign)*r*1.31+wobble*r*.09,
    y:Math.sin(a+.16*sign)*r*1.31-wobble*r*.09},
   {x:Math.cos(a-.13*sign)*r*1.49,y:Math.sin(a-.13*sign)*r*1.49},
   {x:Math.cos(a+.07*sign)*end,y:Math.sin(a+.07*sign)*end}
  ];
  drawElectricArc(points,bright*(.64+.22*Math.sin(beat+i*2.1)**2),front?.68:.77);
 }
 g.restore();
}
function drawPierceTrailLightning(b,r,path){
 if(!fxEnabled||!has('pierce')||!path||path.length<2)return;
 const len=path[path.length-1].s;if(len<3)return;
 const beat=Math.floor(clock*18),n=path.length-1;
 g.save();g.globalCompositeOperation='lighter';g.shadowBlur=0;
 g.lineCap='round';g.lineJoin='round';
 // Cyan-white must stay visible over the continuous warm fire ribbon.
 g.strokeStyle=has('fire')?'#d9fdff':'#a8f3ff';
 g.lineWidth=has('fire')?Math.max(2.4,r*.25):Math.max(1.5,r*.17);
 g.globalAlpha=has('fire')?.95:.9;
 g.beginPath();g.moveTo(path[0].x,path[0].y);
 // Single branchless zigzag. Retain every trajectory vertex at rebounds;
 // a triangular wave supplies sharp alternating teeth, not parallel lines.
 for(let i=1;i<=n;i++){
  const p=path[i],a=path[i-1],z=path[Math.min(n,i+1)];
  const dx=z.x-a.x,dy=z.y-a.y,m=Math.hypot(dx,dy)||1;
  const wave=1-4*Math.abs((p.s/24)%1-.5);
  const envelope=Math.min(1,p.s/10,(len-p.s)/12);
  const side=wave*r*.42*envelope*(.88+.12*Math.sin(beat*1.7));
  g.lineTo(p.x-dy/m*side,p.y+dx/m*side);
 }
 g.stroke();g.restore();
}
// V76: per-ball rotational inertia updated ONCE per game tick, not per frame
// cell or direction change. Squash/stretch uses its own transform axes.
const HERO_BALL_SPIN_FACTORS=[1,.82,1.13]; // tennis / baseball / toy
function updateBallSpin(b,dt){
 if(!b||!Number.isFinite(dt)||dt<=0)return;
 const factor=HERO_BALL_SPIN_FACTORS[selectedHero]||1;
 const speed=Math.hypot(b.vx||0,b.vy||0);
 const goal=(b.held?.95:clamp(speed/92,2.7,7.1))*factor*(b.spinDirection||1);
 const easing=1-Math.exp(-dt*6.5);
 b.spinVelocity=(b.spinVelocity||0)+(goal-(b.spinVelocity||0))*easing;
 b.spinAngle=((b.spinAngle||0)+b.spinVelocity*dt)%(Math.PI*2);
}
/* V77: Single original base bitmap in every state; no animation frame swaps.
   The same PNG rotates while the visible silhouette deforms mathematically. */
const BALL_MATERIAL_SPRING=[1,.72,1.14]; // tennis / baseball / toy
function ballSpritePose(b,r,heroIndex=selectedHero,now=clock){
 const index=0,spin=b.spinAngle||0;
 let sx=1,sy=1,rotation=0;
 if(b.held)return {index,sx,sy,rotation,spin};
 const speed=Math.hypot(b.vx||0,b.vy||0);
 const moveAngle=Math.atan2(b.vy||-1,b.vx||0);
 const material=BALL_MATERIAL_SPRING[heroIndex]||1;
 const flight=clamp((speed-280)/570,0,.042)*material;
 sx=1+flight;sy=1-flight*.72;rotation=moveAngle;
 if((b.bounceTime||0)>0){
  const duration=b.bounceDuration||.17,phase=clamp(1-b.bounceTime/duration,0,1);
  const strength=clamp(b.impactStrength||.7,.45,1.12)*material*(r>8?.86:1);
  if(b.impactKind==='serve'){
   const stretch=Math.sin(phase*Math.PI)*.105*strength;
   sx=1+stretch;sy=1-stretch*.75;rotation=moveAngle;
  }else{
   const smooth=t=>{const p=clamp(t,0,1);return p*p*(3-2*p)};
   const amount=clamp(.20*strength,.075,.235);
   let deform;
   if(phase<.20)deform=-amount;
   else if(phase<.50)deform=-amount+(amount*1.62)*smooth((phase-.20)/.30);
   else if(phase<.68)deform=amount*.62;
   else deform=amount*.62*(1-smooth((phase-.68)/.32));
   sx=1+deform;sy=1-deform*.72;
   rotation=b.bounceAxis==='x'?0:Math.PI/2;
  }
 }
 // Power-up is exactly 1.5x the regular 8px radius; rebound may squash
 // inward but never stretch past the powered silhouette's intended diameter.
 if(r>8){sx=clamp(sx,.94,1);sy=clamp(sy,.94,1)}
 return {index,sx,sy,rotation,spin};
}
function drawHeroBallSprite(b,r,col){
 const sprites=window.ZZHeroBallsV58;
 const img=sprites?.images?.[selectedHero];
 const ready=!!sprites?.ready?.[selectedHero]&&img&&img.naturalWidth===1774&&img.naturalHeight===887;
 const pose=ballSpritePose(b,r);
 g.save();g.shadowColor='transparent';g.shadowBlur=0;
 // Orient anisotropic squash/stretch in world space, but let the bitmap
 // independently rotate by spinAngle. No angle snap when a ball hits a wall.
 g.translate(b.x,b.y);g.rotate(pose.rotation);g.scale(pose.sx,pose.sy);
 g.rotate(pose.spin-pose.rotation);
 if(selectedHero===3 && $('hubcap-art')?.naturalWidth){g.drawImage($('hubcap-art'),-r,-r,r*2,r*2)}else if(ready){
  const frameW=img.naturalWidth/4,frameH=img.naturalHeight/2;
  const size=r*3.40;
  g.drawImage(img,0,0,frameW,frameH,-size/2,-size/2,size,size);
 }else{
  g.fillStyle=col;g.beginPath();g.arc(0,0,r*1.11,0,Math.PI*2);g.fill();
  g.strokeStyle='#ffffcf';g.lineWidth=1.5;
  g.beginPath();g.arc(-r*.7,0,r*.85,-1.1,1.1);g.stroke();
  g.beginPath();g.arc(r*.7,0,r*.85,2,4.3);g.stroke();
 }
 g.restore();
}
// Hit reaction stays attached to the actual zombie sprite, not a detached flash.
// V70: 60fps phase-locked hit jitter stays on the enemy sprite only.
// Alternating 4-6px displacement is conspicuous without moving collision boxes.
function hitShakeOffset(t,duration,boss=false){
 const frame=Math.max(0,Math.floor(t*60));
 const phase=Math.max(0,Math.min(1,t/Math.max(.001,duration)));
 const amplitude=(boss?5.6:4.4)*(1-.2*phase);
 return {x:(frame%2?1:-1)*amplitude,
   y:[-.42,.28,-.26,.38][frame%4]*amplitude};
}
function drawStruckZombie(z){
 drawTrashContact(z);
 const entering=Number.isFinite(z.arrivalTime);
 if(entering){g.save();g.globalAlpha=Math.max(0,Math.min(1,z.arrivalTime/.62));}
 const active=clock>=(z.hitShakeFrom||0)&&clock<(z.hitShakeUntil||0);
 if(!active){zombie(knockVisualPosition(z));if(entering)g.restore();return}
 const t=clock-(z.hitShakeFrom||clock),duration=Math.max(.001,(z.hitShakeUntil||clock)-(z.hitShakeFrom||clock));
 const phase=t/duration;
 g.save();
 // First two-thirds are an unmistakable white contact flash. No blurry glow.
 g.filter=phase<.68?'brightness(2.25) saturate(.52)':'brightness(1.64) saturate(.83)';
 const jitter=hitShakeOffset(t,duration,!!z.boss);
 g.translate(jitter.x,jitter.y);
 zombie(knockVisualPosition(z));g.restore();
 if(entering)g.restore();
}
function draw(){trailRenderFrame++;if((!fxRenderer||fxRenderer.height!==H)&&window.FXRenderer)fxRenderer=new window.FXRenderer(W,H);if(fxRenderer&&fxEnabled)fxRenderer.begin();g.clearRect(0,0,W,H);g.save();const shakeOffset=cameraOffset();if(shakeOffset)g.translate(shakeOffset.x,shakeOffset.y);background();drawWorldGroundShadows();drawTrashContact('world');drawCrowd();drawDodgeGhosts();
 // Visible afterimage and impact line show actual displacement and chain hits.
 if(fxEnabled)for(const z of foes)if((z.knockTime||0)>0&&knockMotionProgress(z)>0){
  const fade=Math.min(1,z.knockTime/(z.knockDuration||KNOCK_TRAIL_LIFE));
  g.save();g.globalAlpha=.4*fade;
  zombie({...z,x:z.knockFromX,y:z.knockFromY,flash:0,burn:0,knockTime:0});
  g.globalAlpha=.7*fade;g.strokeStyle=z.knockChain?'#b9ffe2':'#fff2bb';
  g.lineWidth=z.knockChain?3:4;g.lineCap='round';
  const visible=knockVisualPosition(z);
  g.beginPath();g.moveTo(z.knockFromX+z.w/2,z.knockFromY+z.h/2);
  g.lineTo(visible.x+z.w/2,visible.y+z.h/2);g.stroke();g.restore();
 }
 for(const z of foes)drawStruckZombie(z);drawBurningOverlays();drawEnemyDeaths();drawImpactFlashes();if(has('shield'))luminous(()=>{g.shadowColor='#b9f684';g.shadowBlur=10;rect(21,SHIELD_LINE_Y,408,3,'#b9f684');g.shadowBlur=0});drawCarGroundShadow();player();drawPoisonGauge();drawGroggyFeedback();drawBazooka();for(const item of items)drawFallingItem(item);drawItemPickupFX();
drawKillCombo();drawBarrelBlasts();
 // v101: This is set once per render to avoid extra has()/ball-count checks
 // inside each spark and flame loop; standalone legacy tests default to false.
 multiSkillFastRender=fxEnabled&&balls.length>=3&&(has('fire')||has('pierce'));
 // Elemental shots own one broad body at every detail level.
 const elementalTrail=fxEnabled&&(has('fire')||has('pierce'));
 for(const b of balls){
  const r=has('power')?12:8;
  const palette=HERO_BALL_TRAILS[selectedHero]||HERO_BALL_TRAILS[0];
  const trailPath=getBallRenderTrailPath(b,r);
  if(!elementalTrail){
   drawHeroBallTrail(b,r,trailPath);
   if(fxEnabled)luminous(()=>drawTrailEdgeHalo(b,r,trailPath),
    ()=>drawTrailEdgeHalo(b,r,trailPath,.72));
  }
  drawBallSkillTrail(b,r,trailPath);
  drawBurningTrailFlames(b,r,trailPath);
  drawPierceTrailLightning(b,r,trailPath);
  drawBallStateAura(b,r);
  drawBurningBallFlames(b,r,false);
  drawPierceBallLightning(b,r,false);
  drawHeroBallSprite(b,r,palette.main);
  drawBallStatusForeground(b,r);
  drawBurningBallFlames(b,r,true);
  drawPierceBallLightning(b,r,true);
 }
 drawBallVanish();
  if(particles.length)luminous(()=>{
  g.save();
  for(const p of particles){
   const fade=clamp(p.t/(p.life||.25),0,1);
   const size=Math.max(2,Math.round(p.size*(.6+.4*fade)));
   g.globalAlpha=fade;
   g.fillStyle=p.color;g.shadowColor=p.color;g.shadowBlur=6*fade;
   g.fillRect(Math.round(p.x-size/2),Math.round(p.y-size/2),size,size);
   if(fade>.65){g.fillStyle='#fffce7';g.fillRect(Math.round(p.x),Math.round(p.y),Math.max(1,size*.35),Math.max(1,size*.35));}
  }
  g.restore();
 });
 
drawJunk();drawBossTrashShots();if(fx.length)luminous(()=>drawEffects());if(ballContactFX.length)luminous(()=>drawContactFX(1),()=>drawContactFX(.10));if(fxEnabled&&fxRenderer)fxRenderer.composite(g);drawEffectLightSpills();// Badges are above Bloom and shield, but citizen dialogue must be the front layer.
drawEffects(true);drawCriticalPopups();drawActiveItemIcons();drawBubbles();g.restore();drawDanger();drawOutcome();
 if(mode==='endlessShift'||mode==='paused'&&resumeMode==='endlessShift')drawEndlessShift();
 if(runMode!=='endless'&&(mode==='clearing'||mode==='paused'&&resumeMode==='clearing'))drawClear();}
function frame(t){
 // Keep game time at real pace on busy frames, with bounded collision steps.
 const elapsed=last?Math.min(.10,Math.max(0,(t-last)/1000)):0;
 last=t;
 const steps=Math.max(1,Math.ceil(elapsed*30-1e-9));
 for(let i=0;i<steps;i++)update(elapsed/steps);
 draw();music();requestAnimationFrame(frame);
}
function heroSprite(x,y,scale=1,win=false){let h=hero();
 const cast=window.ZZObjectCast,atlas=cast&&cast.gameplayCompatible===true?cast.gameplayAtlas:null,ix=cast&&cast.heroIndex[selectedHero];
 if(atlas&&atlas.complete&&atlas.naturalWidth===256&&Number.isInteger(ix)){
  g.save();g.translate(x,y);g.scale(scale,scale);
  if(win)g.translate(0,-Math.abs(Math.sin(clearTime*7))*4);
  g.drawImage(atlas,(ix%4)*64,Math.floor(ix/4)*64,64,64,-28,-44,56,65);
  g.restore();return;
 }
 g.save();g.translate(x,y);g.scale(scale,scale);rect(-14,-3,29,22,h.color);rect(-10,4,4,10,'#fcf2cb');rect(5,4,4,10,'#fcf2cb');rect(-19,-27,37,29,h.skin);rect(-20,-31,38,9,h.hair);if(h.id==='ace'){rect(-22,-34,39,10,'#2b7181');rect(-23,-26,47,5,'#214757')}if(h.id==='ruby'){rect(-29,-24,10,13,h.hair);rect(18,-24,10,13,h.hair);rect(-25,-25,6,3,'#d3ef95');rect(20,-25,6,3,'#d3ef95');rect(-20,-29,6,13,h.hair)}if(h.id==='liam'){poly([[-17,-28],[-18,-38],[-9,-32],[-5,-41],[3,-33],[13,-38],[17,-28]],h.hair);rect(-20,-25,39,4,'#fcf0b5')}
if(win){rect(-12,-15,9,2,'#533a39');rect(-10,-17,5,2,'#533a39');rect(4,-15,9,2,'#533a39');rect(6,-17,5,2,'#533a39');rect(-8,-7,18,6,'#7d4546');rect(-6,-7,14,3,'#fff5d3');let waveY=-24+Math.sin(clearTime*14)*5;rect(-27,-2,9,7,h.skin);rect(-29,waveY,7,25-waveY,h.color);rect(-30,waveY-5,9,9,h.skin);rect(18,-6,11,7,h.skin);rect(24,-23,6,22,h.skin)}else{rect(-12,-18,9,10,'#fff4dc');rect(4,-18,9,10,'#fff4dc');rect(-7,-15,3,6,'#34404b');rect(5,-15,3,6,'#34404b');rect(-3,-3,8,2,'#945b4d')}g.restore()}
function portrait(h){
 const i=HEROES.indexOf(h);
 // 192px transparent car/hero art, sampled sharply for the narrow selection UI.
 // Public hero names: Ace / Ruby / Ria. The Liam sprite ID remains stable.
 return '<span class="hero-portrait hero-vehicle-portrait row-'+i+'" role="img" aria-label="'+h.name+' · 차량과 전용 무기"></span>';
}
// Menu-only character stat gauges; native hero portraits and gameplay values stay unchanged.
function heroMiniStats(h){
 return window.ZZGarage?.heroStatMarkup?.(h,window.ZZProgression?.garage?.(),window.ZZProgression,HEROES.indexOf(h))||'';
}
function renderHeroes(){for(let i=0;i<HEROES.length;i++){let h=HEROES[i],el=$('hero-'+i);if(!el)continue;if(i===3)el.hidden=!window.ZZProgression?.garage().mechanic;el.innerHTML=portrait(h)+'<b>'+h.name+'</b><small>'+h.role+'</small><span>'+h.desc+'</span>';if(mode==='menu')el.innerHTML+=heroMiniStats(h);el.setAttribute('aria-pressed',String(i===selectedHero));el.onclick=()=>{if(mode!=='menu'&&mode!=='over')return;selectedHero=i;renderHeroes();draw()}}$('hero-stats').textContent=hero().stats;if(mode==='menu')$('start').innerHTML="LET'S ROLL, "+(['ACE','RUBY','RIA','WRENCH'][selectedHero]||'HERO')+'!';window.ZZRefreshHeroReel?.()}

// Kill streak is independent of the rally hit counter and uses active play time.
let killCombo=0,killTimer=0,comboPop=0,comboDisplayTime=0;
function recordKill(){
 killCombo=killTimer>0?killCombo+1:1;killTimer=6+growth('comboFocus')*.24;comboPop=.22;comboDisplayTime=1.45;
 if([5,10,20,30,50].includes(killCombo))citizenReaction('combo');
 if(killCombo%(growth('rescue')>=3?4:5)!==0)return;
 const p=citizens.filter(p=>!p.alive&&p.absent>=8-growth('rescue')*.5).sort((a,b)=>b.absent-a.absent)[0];
 if(!p)return;
 p.alive=true;p.dying=0;p.absent=0;p.returning=1.1;p.guardSpent=false;p.guardUntil=0;cheerTime=1.8;
 citizenCue(p,true);effect(p.x,p.y-12,'#91f4d0',65);burst(p.x,p.y-10,'#91f4d0',24);sfx('return');feedback('rescue');toast('시민 +1 복귀! · '+killCombo+' COMBO');
}
// The original 5-kill citizen returns remain unchanged; the banner uses
// six distinct tiers, with visible art/colors independent of combat balance.
const COMBO_STEPS=[
 {min:2,word:'NICE!'}, {min:5,word:'COOL!'},
 {min:10,word:'GREAT!'}, {min:15,word:'AWESOME!'},
 {min:20,word:'UNSTOPPABLE!'}, {min:30,word:'LEGENDARY!'}
];
let comboRenderedCount=-1,comboRenderedTier=-1;
function comboTier(count){
 let tier=0;
 for(let i=1;i<COMBO_STEPS.length;i++)if(count>=COMBO_STEPS[i].min)tier=i;
 return tier;
}
function drawKillCombo(){
 const el=$('combo-overlay');
 if(!el)return;
 if(killCombo<2||killTimer<=0||comboDisplayTime<=0||!['playing','clearing','paused'].includes(mode)){
  el.hidden=true;comboRenderedCount=-1;comboRenderedTier=-1;return;
 }
 const tier=comboTier(killCombo),count=String(killCombo);
 if(count!==String(comboRenderedCount)||tier!==comboRenderedTier){
  $('combo-number').textContent=count;
  $('combo-praise').textContent=COMBO_STEPS[tier].word;
  if(!el.dataset)el.dataset={};
  el.dataset.tier=String(tier);
  el.setAttribute?.('aria-label',count+' 연속 처치 · '+COMBO_STEPS[tier].word);
  // A short pixel burst on each kill; never restart it on every 60fps frame.
  if(el.classList?.remove&&el.classList?.add){
   el.classList.remove('zz-combo-hit');
   void el.offsetWidth;
   el.classList.add('zz-combo-hit');
  }
  comboRenderedCount=killCombo;comboRenderedTier=tier;
 }
 el.hidden=false;
 // Visible briefly on each hit, then clears the top of the enemy formation.
 const fade=Math.min(1,comboDisplayTime/.48);
 el.style.opacity=String(Math.max(0,Math.min(1,fade)));
 el.style.setProperty?.('--combo-quiet',String(Math.max(0,Math.min(1,(1.45-comboDisplayTime)/1.45))));
 el.style.setProperty?.('--combo-progress',String(Math.max(0,Math.min(1,killTimer/(6+growth('comboFocus')*.24)))));
}
// Keep all 18 original supporters and sprites, but bring their save hitboxes
// inside the same side walls where the ball now legitimately travels.
const citizens=Array.from({length:18},(_,i)=>({x:48+i*(354/17),y:682+VIEW_DELTA+(i%2)*5,skin:['#ffd6a4','#c48b68','#f3bb92','#92624f'][i%4],shirt:['#e69a72','#78b5cc','#b692d6','#e7cd72','#a5d398','#e58da7'][i%6],hair:['#49332f','#d89343','#d8d8cc','#333d50','#875645'][i%5],style:i%8,phase:i*.9,alive:true,dying:0,supportTime:0}));
function resetCitizens(){for(const p of citizens){p.alive=true;p.dying=0;p.absent=0;p.returning=0;p.shooting=0;p.supportTime=0;p.guardSpent=false;p.guardUntil=0}bubbles=[];bubbleTimer=.25;lastCitizenLine=''}
// One additional absorbed civilian hit; LV1..5 = 20/40/60/80/100%
// chance to block the first hit. Protection expires on the next real impact.
function tryCitizenGuard(p){
 if(!p?.alive)return false;
 if((p.guardUntil||0)>clock)return true;
 const rank=growth('citizenArmor');
 if(rank<=0||p.guardSpent||Math.random()>=rank*.2)return false;
 p.guardSpent=true;p.guardUntil=clock+.6;p.supportTime=.46;
 effect(p.x,p.y-16,'#b4f7aa',34);burst(p.x,p.y-16,'#b4f7aa',7);
 sfx('shield');feedback('shield');return true;
}
// Gameplay feedback is independent of the FX FULL / LIGHT graphics option.
// Weak simultaneous hits cannot cancel a longer critical or boss vibration.
// Browser vibration has no strength parameter. Duration/pattern control perceived
// emphasis; short (<20ms) requests can be imperceptible on Android motors.
const HAPTICS_STORAGE_KEY='zz-device-haptics-enabled';
let hapticsEnabled=true;
try{if(typeof localStorage!=='undefined')hapticsEnabled=localStorage.getItem(HAPTICS_STORAGE_KEY)!=='0'}catch{}
const FEEDBACK_PRESETS={
 wall:{v:28,s:0.28,p:0},
 racket:{v:38,s:0.9,p:2},
 car:{v:45,s:1.3,p:3},
 hit:{v:105,s:1.4,p:5},
 powerHit:{v:140,s:2.15,p:7},
 kill:{v:[115,36,105],s:2.6,p:8},
 fireKill:{v:[80,28,85],s:1.7,p:6},
 critical:{v:[180,48,210],s:4.6,p:10},
 bossHit:{v:145,s:2.9,p:8},
 bossKill:{v:[190,56,240],s:5.2,p:11},
 blast:{v:[85,35,90],s:3.85,p:9},
 junkHit:{v:50,s:1,p:4},
 junkGround:{v:28,s:0.25,p:0},
 citizen:{v:[75,30,85],s:2.75,p:8},
 rescue:{v:[42,26,75],s:1.25,p:4},
 poisonBlock:{v:58,s:1.6,p:5},
 groggy:{v:[90,35,140],s:3.3,p:9},
 miss:{v:[75,30,65],s:2.8,p:8},
 gameOver:{v:[160,60,200],s:4.8,p:12},
 lastStand:{v:[105,42,130],s:5,p:11},
 shield:{v:[45,22,54],s:1.3,p:4},
 blocked:{v:40,s:0.85,p:3},
 bossSpawn:{v:[85,32,105],s:2.8,p:8},
 item:{v:40,s:0.55,p:2},
 serve:{v:28,s:0.4,p:1},
 start:{v:25,s:0,p:1},
 wave:{v:[45,30,45],s:1.15,p:3},
 victory:{v:[55,35,110],s:2,p:6}
};
// A real-time 5–9-frame shake envelope independent of the graphics FX switch.
// Previous v182 shake lost most of its intensity before the render frame.
const screenShake={power:0,started:0,until:0,phase:0};
// Browser and VM regression tests use the same clock-safe fallback.
const feedbackNow=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now();
let screenShakeFrame=0;
function cameraFeedback(strength){
 if(!(strength>0))return;
 const now=feedbackNow();
 const power=strength<.5?.8:Math.min(8,1.7+2.4*strength);
 // Only one envelope. Never sum multiball hits; upgrade for stronger impacts.
 if(now<screenShake.until&&power<=screenShake.power&&now-screenShake.started<90)return;
 const life=strength>=4?150:strength>=2?120:100;
 screenShake.power=power;screenShake.started=now;screenShake.until=now+life;
 screenShake.phase=(screenShake.phase+1.41)%6.283;
 cameraKick=power;lastCameraFeedback=now;
}
function cameraOffset(){
 const now=feedbackNow(),remaining=screenShake.until-now;
 if(remaining<=0)return null;
 const life=Math.max(1,screenShake.until-screenShake.started);
 const fade=Math.pow(Math.min(1,remaining/life),.65);
 const power=screenShake.power*fade;
 const phase=screenShake.phase+(++screenShakeFrame)*2.24;
 return {x:Math.sin(phase)*power*.92,y:Math.cos(phase*1.2)*power*.72};
}
// Keep lightweight counters so players can verify that zombie hits reach
// the vibration API, independently from whether the device motor responds.
const feedbackDiagnostics={attempts:0,accepted:0,blocked:0,last:'—',result:'대기',
 hits:0,critical:0,hitRequests:0,hitAccepted:0,hitBlocked:0,lastHit:'—',lastHitResult:'대기'};
const feedbackNames={hit:'좀비 일반 피격',powerHit:'강타',kill:'좀비 처치',
 fireKill:'화염 처치',critical:'크리티컬',bossHit:'보스 피격',
 bossKill:'보스 처치',racket:'자동차 공 반사',car:'자동차 충돌'};
const COMBAT_FEEDBACK_KINDS=new Set(['hit','powerHit','kill','critical','bossHit','bossKill','fireKill']);
// Optional in-game instrumentation: ?hapticDebug=1 displays live hit counts
// without pausing to open Settings. This is disabled in normal play.
const HAPTIC_DEBUG=typeof location!=='undefined'&&new URLSearchParams(location.search).get('hapticDebug')==='1';
let hapticDebugTag=null;
function updateFeedbackDiagnostics(){
 const d=feedbackDiagnostics;
 if(!HAPTIC_DEBUG)return;
 if(!hapticDebugTag){
  hapticDebugTag=document.createElement('div');
  hapticDebugTag.setAttribute('role','status');
  hapticDebugTag.style.cssText='position:fixed;z-index:2147483647;bottom:8px;left:8px;max-width:95vw;pointer-events:none;background:#060f1ee6;color:#e9f5ca;padding:6px 9px;border:1px solid #9fd88b;font:11px/1.45 monospace;border-radius:5px';
  document.body.appendChild(hapticDebugTag);
 }
 hapticDebugTag.textContent='v186 HIT '+d.hits+' / VIBE '+d.hitAccepted+' / BLOCK '+d.hitBlocked+' · '+(feedbackNames[d.lastHit]||d.lastHit)+' · '+d.lastHitResult;
}
function feedback(kind){
 const cfg=FEEDBACK_PRESETS[kind];if(!cfg)return;
 cameraFeedback(cfg.s);
 const d=feedbackDiagnostics,combat=COMBAT_FEEDBACK_KINDS.has(kind);
 d.last=kind;
 if(combat){d.hits++;d.lastHit=kind}
 if(kind==='critical')d.critical++;
 const report=(status,blocked=false)=>{
  d.result=status;
  if(combat){d.lastHitResult=status;if(blocked)d.hitBlocked++}
  updateFeedbackDiagnostics();
 };
 if(!hapticsEnabled){report('사용자 설정 OFF');return}
 if(typeof navigator==='undefined'||typeof navigator.vibrate!=='function'){
  report('API 미지원');return;
 }
 if(typeof document!=='undefined'&&document.hidden){report('화면 비활성');return}
 const now=feedbackNow(),length=Array.isArray(cfg.v)?cfg.v.reduce((a,b)=>a+b,0):cfg.v;
 // Max-priority single dispatcher: wall/racket/item never interrupt a zombie hit.
 if(now<buzzLockedUntil&&cfg.p<=buzzPriority){
  d.blocked++;report('중복 차단',true);return;
 }
 // Only minor events have additional rate limits; real combat overrides them.
 if(cfg.p<=2&&now-lastBuzz<135){
  d.blocked++;report('약한 충격 제한',true);return;
 }
 try{
  d.attempts++;if(combat)d.hitRequests++;
  const ok=navigator.vibrate(cfg.v);
  if(ok){
   lastBuzz=now;buzzPriority=cfg.p;
   buzzLockedUntil=now+Math.max(95,Math.min(550,length+14));
   d.accepted++;if(combat)d.hitAccepted++;
   report('요청 수락');
  }else report('요청 거부');
 }catch(e){report('오류 '+(e?.name||'unknown'))}
}
// QA signal only: physical motor output cannot be measured from JavaScript.
window.ZZHapticDebug={version:'v186',counts:feedbackDiagnostics};
// Game options: persisted device vibration toggle; no test controls in settings.
const hapticsToggle=$('haptics-toggle');
function syncHapticsToggle(){
 if(!hapticsToggle)return;
 const on=hapticsEnabled;
 hapticsToggle.setAttribute('aria-pressed',String(on));
 hapticsToggle.setAttribute('aria-label','기기 진동 · '+(on?'켜짐':'꺼짐'));
 const status=hapticsToggle.querySelector?.('.option-status');
 if(status){
  status.textContent=on?'켜짐':'꺼짐';
  hapticsToggle.dataset.state=on?'on':'off';
 }else hapticsToggle.textContent=on?'VIBRATION ON':'VIBRATION OFF';
}
if(hapticsToggle){
 syncHapticsToggle();
 hapticsToggle.addEventListener('click',()=>{
  hapticsEnabled=!hapticsEnabled;
  try{if(typeof localStorage!=='undefined')localStorage.setItem(HAPTICS_STORAGE_KEY,hapticsEnabled?'1':'0')}catch{}
  if(!hapticsEnabled){
   buzzLockedUntil=0;buzzPriority=0;
   try{if(typeof navigator!=='undefined'&&typeof navigator.vibrate==='function')navigator.vibrate(0)}catch{}
  }
  syncHapticsToggle();
 });
}
function circleRect(x,y,r,box){const dx=x-clamp(x,box.x,box.x+box.w),dy=y-clamp(y,box.y,box.y+box.h);return dx*dx+dy*dy<=r*r}
function upwardBounce(b,center,half,top,r){const speed=clamp(Math.hypot(b.vx,b.vy),350,600),angle=clamp((b.x-center)/half,-1,1)*.95;b.vx=Math.sin(angle)*speed;b.vy=-Math.max(210,Math.cos(angle)*speed);b.y=top-r-1;b.lastHit=null;b.hitLock=0;combo=0;b.trail=[];ballImpact(b,'y',-1,'citizen')}
function carCollision(b,r,cx=car){const boxes=[{x:cx-52,y:621+VIEW_DELTA,w:104,h:33},{x:cx-57,y:626+VIEW_DELTA,w:13,h:24},{x:cx+44,y:626+VIEW_DELTA,w:13,h:24}];if(!boxes.some(box=>circleRect(b.x,b.y,r,box)))return false;upwardBounce(b,cx,57,621+VIEW_DELTA,r);swing=.18;heroAttackTime=HERO_ATTACK_DURATION;effect(b.x,623+VIEW_DELTA,'#fff49a',38,'NICE SAVE');burst(b.x,625+VIEW_DELTA,'#f8d87d',7);sfx('car');feedback('car');return true}
function citizenCollision(b,r){if(b.vy<=0)return false;for(const p of citizens){if(!p.alive)continue;const box={x:p.x-10,y:p.y-13,w:20,h:34};if(!circleRect(b.x,b.y,r,box))continue;if(tryCitizenGuard(p)){upwardBounce(b,p.x,16,box.y,r);return true}p.alive=false;p.dying=.8;p.returning=0;p.absent=0;bubbles=bubbles.filter(q=>q.citizen!==p);upwardBounce(b,p.x,16,box.y,r);citizenCue(p,false);effect(p.x,box.y,'#ffb16f',65);burst(p.x,p.y-10,'#ffda86',22);sfx('citizen');feedback('citizen');return true}return false}
// V124: Short arcade crowd reactions with dynamic speech width.
// A measured approximation avoids per-frame canvas text measurement.
let lastCitizenLine='';
function citizenBubbleWidth(text,event=false){
 const len=Array.from(text).reduce((sum,c)=>sum+(c.codePointAt(0)>255?15:9),0);
 return clamp(Math.ceil(len+22),event?112:80,event?166:152);
}
function pickCitizenLine(lines){
 const available=lines.length>1?lines.filter(line=>line!==lastCitizenLine):lines;
 const line=available[Math.floor(Math.random()*available.length)];
 lastCitizenLine=line;
 return line;
}
function citizenCue(p,back,text=null){
 const lines=back?
  ['다시 왔어!','나만 믿어!','한 번 더!','돌아왔다!','복귀 완료!','아직 안 끝났어!']:
  ['내가 막을게!','뒤를 부탁해!','으악! 막았다!','이 몸이 막는다!','살신성인!','내가 지킨다!'];
 const said=text||pickCitizenLine(lines);
 const w=citizenBubbleWidth(said,true),x=clamp(p.x-w/2,22,W-22-w);
 bubbles=bubbles.filter(q=>q.citizen!==p&&(q.x+(q.w||80)+8<=x||q.x>=x+w+8)).slice(-1);
 bubbles.push({citizen:p,x,y:p.y-86,w,carAtBirth:car,event:text?'bazooka':back?'return':'save',t:0,life:2.1,text:said});bubbleTimer=1;
}
const CHEERS=['파이팅!','막아줘!','멋져!','최고야!','조심해!','가자!',
 '씩스쎄븐~!','사랑해요','확간다','통쾌!','쫌 치는데?',
 '이 맛이지!','캬~ 시원해!','오늘 폼 뭐야?','나이스 샷!',
 '가보자고!','어우야!','오, 제법인데?','짜릿하다!',
 '실화냐?','이게 되네?','이거지 이거!','오우~ 예!',
 '대박 사건!','공 좀 친다!','얼씨구!','화끈하다!'];
// V215: Only real gameplay events produce ambient-style short reactions.
const CITIZEN_REACTIONS={
 critical:['쫌 치는데?','캬~ 시원해!','오늘 폼 뭐야?','나이스 샷!','대박 사건!','이게 되네?'],
 combo:['씩스쎄븐~!','확간다','통쾌!','이거지 이거!','짜릿하다!','오우~ 예!'],
 item:['오, 보급이다!','이 맛이지!','득템이다!','선물 왔어요!','아이템 좋다!'],
 boss:['보스 잡았다!','드디어 끝났어!','오늘 폼 뭐야?','대박 사건!']
};
function resetCitizenSpeech(){bubbles=[];bubbleTimer=0;lastCitizenLine=''}
function citizenReaction(kind){if(mode==='playing')updateBubbles(0,kind)}
// V129: Small vertical variation keeps spontaneous cheers from forming one
// ruler-straight row. Check FINAL clamped/car-shifted rectangles, not raw x/y.
// A second cheer must be staggered by >=11px and clear all nearby balloons.
function citizenCheerFits(q){
 const a=citizenBubbleLayout(q);
 return bubbles.every(other=>{
  const b=citizenBubbleLayout(other);
  if(Math.abs(a.y-b.y)<11)return false;
  return a.x+a.w+7<=b.x||b.x+b.w+7<=a.x||
         a.y+a.h+7<=b.y||b.y+b.h+7<=a.y;
 });
}
function updateBubbles(dt,reaction=null){
 bubbles=bubbles.filter(q=>(q.t+=dt)<q.life&&(q.event||q.citizen.alive));
 bubbleTimer=Math.max(0,bubbleTimer-dt);
 // No automatic idle or clear-screen dialogue; a real gameplay event is required.
 if(!reaction||mode!=='playing')return;
 if(bubbleTimer>0||bubbles.length>=2)return;
 const lines=CITIZEN_REACTIONS[reaction];
 if(!lines)return;
 const said=pickCitizenLine(lines),w=citizenBubbleWidth(said);
 const crowd=citizens.filter(p=>p.alive&&Math.abs(p.x-car)>76&&
  !bubbles.some(q=>q.citizen===p));
 if(!crowd.length)return;
 const stagger=[-8,-2,4,10,16,21];
 const firstCitizen=Math.floor(Math.random()*crowd.length);
 const firstOffset=Math.floor(Math.random()*stagger.length);
 let chosen=null;
 for(let i=0;i<crowd.length&&!chosen;i++){
  const p=crowd[(firstCitizen+i)%crowd.length];
  const x=clamp(p.x-w/2,22,W-22-w);
  for(let j=0;j<stagger.length;j++){
   const y=p.y-61+stagger[(firstOffset+j)%stagger.length];
   const q={citizen:p,x,y,w,carAtBirth:car};
   if(citizenCheerFits(q)){chosen=q;break}
  }
 }
 if(!chosen)return;
 bubbles.push({...chosen,t:0,life:1.6,text:said});
 bubbleTimer=2.7; // 2.7s between comments even if many zombies fall at once.
 cheerTime=Math.max(cheerTime,1);
}
// V79: speech placement depends on the car position ONLY when the bubble
// is created. Moving the car cannot drag the bubble or stretch its pointer.
// V128: Drop speech 14px toward the citizen and allow ambient bubbles to
// overlap only the outer edge of the car, never its central hero portrait.
// Preserve V79's immutable car-at-birth anchor and 16px nonstretching pointer.
function citizenBubbleLayout(q,carX=car){
 const w=q.w||80,h=q.event?46:29;
 const initialCar=Number.isFinite(q.carAtBirth)?q.carAtBirth:carX;
 // Normal cheers can land 12px lower; keep the pointer just above citizen heads.
 let x=clamp(q.x,22,W-22-w),y=clamp(q.y,100,q.event?H-57-h:H-45-h);
 // Long save/return bubbles keep original car clearance; short cheers can
 // partially overlap the car's outer 20px without hiding the hero's face.
 const centralClearance=q.event?56:26;
 if(x<initialCar+centralClearance&&x+w>initialCar-centralClearance&&y+h>PY-66&&y<PY+42){
  const edge=q.event?67:34;
  const left=initialCar-w-edge,right=initialCar+edge;
  const candidates=[left,right].filter(v=>v>=22&&v+w<=W-22);
  if(candidates.length)x=candidates.sort((a,b)=>Math.abs(a-x)-Math.abs(b-x))[0];
  else y=Math.max(108,PY-h-(q.event?69:50));
 }
 return {x,y,w,h};
}
// A deliberately SHORT pointer is attached to the balloon itself, not to
// a moving car or a remote citizen center. No stretched kite-like polygon.
function citizenBubblePointer(q,place){
 const baseX=clamp(q.citizen.x,place.x+12,place.x+place.w-12);
 return {baseX,tipX:baseX+clamp(q.citizen.x-baseX,-8,8),
         tipY:place.y+place.h+16};
}
function drawBubbles(){for(const q of bubbles){const a=Math.min(1,q.t/.12,(q.life-q.t)/.3);
 const place=citizenBubbleLayout(q),x=place.x,y=place.y-(q.event?Math.sin(Math.min(1,q.t/.3)*Math.PI)*5:0),w=place.w,h=place.h;
 const tail=citizenBubblePointer(q,{x,y,w,h});g.save();g.globalAlpha=Math.max(0,a);g.fillStyle=q.event==='return'?'#c5ffe5':q.event?'#ffe2ae':'#fff6d8';g.strokeStyle=q.event==='return'?'#287760':q.event?'#974c35':'#28374b';g.lineWidth=q.event?3:2;g.beginPath();g.moveTo(x,y);g.lineTo(x+w,y);g.lineTo(x+w,y+h);g.lineTo(tail.baseX+6,y+h);g.lineTo(tail.tipX,tail.tipY);g.lineTo(tail.baseX-6,y+h);g.lineTo(x,y+h);g.closePath();g.fill();g.stroke();g.fillStyle='#263449';g.font='bold 15px Arial, sans-serif';g.textAlign='center';g.fillText(q.text,x+w/2,y+20);if(q.event){g.font='bold 11px Arial, sans-serif';g.fillText(q.event==='return'?'시민 +1 복귀!':q.event==='bazooka'?'광역 지원 사격!':'공을 지켜냈다!',x+w/2,y+37)}g.restore()}}
// V159: One approved 6x6 transparent bitmap sheet for BOTH throwers.
// Draw only the needed frame: no per-projectile bitmap or gradient allocation.
const trashThrowersInOrder=[];
const THROWABLE_COUNT=36,THROWABLE_SIZE_SCALE=1.824,throwableBag=[],bossTrashShots=[];
const TRASH_SHOT_CAP=2,ELITE_THROW_COOLDOWN=[10.5,13.5];
let eliteTrashSharedReadyAt=0,spitSharedNextAt=0;
// Campaign grows from stage 3 to 50; endless starts gently, then ramps by wave.
function projectilePressure(){
 const equivalent=runMode==='endless'?6+Math.max(0,endlessWaveNumber()-1)*1.05:wave;
 return clamp((equivalent-3)/47,0,1);
}
function projectileFlightCap(){return TRASH_SHOT_CAP+Math.floor(projectilePressure()*3.001)}
function spitCooldown(z){
 return (z.boss?11:13.5)*(1-.47*projectilePressure())+Math.random()*2.2;
}
function spitThrower(z){return !!z.boss||Number.isInteger(z.eliteKind)}
function nextThrowableKind(){
 if(!throwableBag.length){
  for(let i=0;i<THROWABLE_COUNT;i++)throwableBag.push(i);
  for(let i=throwableBag.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1));
   [throwableBag[i],throwableBag[j]]=[throwableBag[j],throwableBag[i]];
  }
 }
 return throwableBag.pop();
}
function drawThrowable(kind,x,y,size,turn=0){
 // Enlarge approved 36-item sheet uniformly, without resizing the source PNG.
 size*=THROWABLE_SIZE_SCALE;
 const sheet=window.ZZThrowablesV159;
 if(sheet?.draw?.(g,kind,x,y,size,turn))return;
 // Loading fallback is a small solid package, never an old zombie/vector.
 g.save();g.translate(x,y);g.rotate(turn);
 rect(-size*.32,-size*.20,size*.64,size*.40,'#7a5741');
 rect(-size*.30,-size*.23,size*.6,size*.08,'#e0ae66');
 g.restore();
}
function bossTrashProjectilePosition(p){
 const t=clamp(p.t/p.duration,0,1);
 return {x:p.sx+(p.tx-p.sx)*t,
   y:p.sy+(p.ty-p.sy)*t-Math.sin(Math.PI*t)*p.arc,t};
}
function defeatCitizenByTrash(p,kind='trash'){
 if(!p?.alive||mode!=='playing')return false;
 if(tryCitizenGuard(p))return false;
 p.alive=false;p.dying=.8;p.returning=0;p.absent=0;
 p.shooting=0;p.supportTime=0;
 bubbles=bubbles.filter(b=>b.citizen!==p);
 citizenCue(p,false,kind==='spit'?'으악! 독침이야!':'으악! 쓰레기다!');
 effect(p.x,p.y-10,kind==='spit'?'#b5ff28':'#ffcf7c',60);
 burst(p.x,p.y-10,kind==='spit'?'#a6f72f':'#ffba66',18);
 sfx('citizen');feedback('citizen');
 return true;
}
// Black trash bag + white 50L elite share the approved PNG atlas with the giant boss.
function eliteTrashThrower(z){return !z.boss&&(z.eliteKind===0||z.eliteKind===1)}
function trashThrower(z){return (z.boss&&z.bossForm===3)||eliteTrashThrower(z)}
function trashThrowCooldown(z){
 const base=z.boss?6.5+Math.random()*3:ELITE_THROW_COOLDOWN[z.eliteKind]+Math.random()*3;
 return base*(1-.44*projectilePressure());
}
function launchTrashShot(z,citizen){
 const elite=eliteTrashThrower(z);
 bossTrashShots.push({sx:z.x+z.w*.5,sy:z.y+z.h*(z.boss?.43:.24),
  tx:citizen.x,ty:citizen.y-13,citizen,kind:z.throwKind,
  duration:(elite?1.15:1.05)+Math.random()*.22,t:0,
  arc:(elite?67:56)+Math.random()*28,eliteKind:elite?z.eliteKind:null});
 sfx('launch');burst(z.x+z.w*.5,z.y+z.h*(z.boss?.38:.22),'#ffc67e',elite?5:7);
}
// One projectile list for all hostile trash and neon-green spit.
function updatePoisonStatus(dt){
 if(!poison&&!poisonGrace&&!groggyTime&&!poisonFlash&&!poisonGaugeAlpha)return;
 const wasGroggy=groggyTime;
 groggyTime=Math.max(0,groggyTime-dt);
 if(wasGroggy>0&&groggyTime===0){
  // Recovered: remove ALL character tint immediately, not just the stun.
  poison=0;poisonGrace=0;poisonFlash=0;
 }
 poisonGrace=Math.max(0,poisonGrace-dt);
 if(groggyTime===0&&poisonGrace===0)poison=Math.max(0,poison-POISON_DECAY*(1+growth('detox')*.12)*dt);
 poisonFlash=Math.max(0,poisonFlash-dt);
 // Ease in while poisoned / groggy; ease out once the toxin fully clears.
 // The meter has no permanent baseline when clean.
 const visible=poison>0||groggyTime>0;
 poisonGaugeAlpha+=( (visible?1:0)-poisonGaugeAlpha)*(1-Math.exp(-dt*(visible?14:9)));
 if(!visible&&poisonGaugeAlpha<.015)poisonGaugeAlpha=0;
}
function shotTouchesHero(shot,from,to,oldCar=car){
 // Swept segment/AABB: fast projectiles and a rapidly moving car cannot tunnel.
 const r=shot.type==='spit'?8:13;
 const left=Math.min(car,oldCar)-38-r,right=Math.max(car,oldCar)+38+r;
 const top=PY-52-r,bottom=PY+54+r;
 let tMin=0,tMax=1;
 for(const [start,delta,min,max] of [[from.x,to.x-from.x,left,right],[from.y,to.y-from.y,top,bottom]]){
  if(Math.abs(delta)<.00001){if(start<min||start>max)return false;continue}
  const a=(min-start)/delta,b=(max-start)/delta;
  tMin=Math.max(tMin,Math.min(a,b));tMax=Math.min(tMax,Math.max(a,b));
  if(tMin>tMax)return false;
 }
 return true;
}
function blockHostileShot(shot,x,y){
 const shielded=has('shield');
 if(!shielded&&groggyTime<=0){
  const filtered=shot.type==='spit'&&clock>=filterReady?gearBonus('filter'):0;
  if(filtered)filterReady=clock+8;
  poison=Math.min(POISON_MAX,poison+(1-filtered/100)*(shot.type==='spit'?POISON_SPIT:POISON_TRASH)*(1-growth('poisonResist')*.06));
  poisonGrace=2.35-growth('recover')*.22;poisonFlash=.26;
  if(poison>=POISON_MAX){
   poison=POISON_MAX;groggyTime=POISON_GROGGY_SECONDS-growth('mental')*.1;target=car;
   effect(car,PY-74,'#b7ff40',52,'GROGGY!');
   sfx('poison');feedback('groggy');
  }else{sfx('block');feedback('poisonBlock')}
 }else{sfx(shielded?'shield':'block');feedback(shielded?'shield':'blocked')}
 effect(x,y,shielded?'#b9f684':shot.type==='spit'?'#c4ff42':'#f9db99',32);
 burst(x,y,shot.type==='spit'?'#a3ff3d':'#ffdfab',6);
}
function drawPoisonGauge(){
 if((mode!=='playing'&&mode!=='paused'&&mode!=='clearing')||poisonGaugeAlpha<=0)return;
 // Compact status indicator placed beside each hero's rear/ear silhouette.
 // Ace and Ruby: right ear; Ria: left ear. Keep the face fully unobstructed.
 // The translucent plate and current fade curve remain unchanged.
 const x=Math.round(car+(selectedHero===2?-39:31)),y=Math.round(PY-43),w=8,h=20;
 g.save();g.globalAlpha*=poisonGaugeAlpha;
 g.fillStyle='rgba(8,28,18,0.42)';g.fillRect(x-1,y-1,w+2,h+2);
 g.fillStyle='rgba(32,83,45,0.24)';g.fillRect(x+1,y+1,w-2,h-2);
 const filled=Math.round((h-4)*poison/POISON_MAX);
 if(filled>0){
  g.fillStyle=groggyTime>0?'#d3ff46':'#88ff32';
  g.shadowColor='#8eff32';g.shadowBlur=poisonFlash>0||groggyTime>0?5:2;
  g.fillRect(x+2,y+h-2-filled,w-4,filled);
  g.shadowBlur=0;
 }
 g.fillStyle='rgba(184,232,171,0.48)';
 g.fillRect(x,y,w,1);g.fillRect(x,y+h-1,w,1);
 if(groggyTime>0&&Math.floor(clock*12)%2===0){
  g.fillStyle='#ddff8a';g.fillRect(x,y-2,w,2);
 }
 g.restore();
}
function drawGroggyFeedback(){
 if(groggyTime<=0)return;
 g.save();g.fillStyle='#d4ff78';g.textAlign='center';
 g.font='bold 11px Arial, sans-serif';
 g.shadowColor='#77ff2c';g.shadowBlur=7;
 g.fillText('GROGGY',car,PY-83);
 for(let i=0;i<3;i++){
  const angle=clock*5+i*Math.PI*2/3;
  g.fillRect(car+Math.cos(angle)*23-3,PY-63+Math.sin(angle)*7-3,6,6);
 }
 g.restore();
}
function launchSpit(z,citizen){
 bossTrashShots.push({
  type:'spit',sx:z.x+z.w*.5,sy:z.y+z.h*.39,
  tx:citizen.x,ty:citizen.y-13,citizen,
  duration:1.0+Math.random()*.20,t:0,arc:35+Math.random()*22
 });
 sfx('spit');
}
function updateBossTrashShots(dt,previousCar=car){
 if(mode!=='playing')return;
 // Process interceptions before arrival. Existing shield protection still works.
 for(let i=0;i<bossTrashShots.length;){
  const shot=bossTrashShots[i];
  const before=bossTrashProjectilePosition(shot);
  shot.t=Math.min(shot.duration,shot.t+dt*hostileShotSlowRate());
  const after=bossTrashProjectilePosition(shot);
  if(shotTouchesHero(shot,before,after,previousCar)){
   bossTrashShots.splice(i,1);
   if(shot.type!=='spit')queueContact(trashContactFX,after.x,after.y,0,-1,'enemy',"hero");
   blockHostileShot(shot,after.x,after.y);
   continue;
  }
  if(shot.t<shot.duration){i++;continue}
  bossTrashShots.splice(i,1);
  if(has('shield')){
   if(shot.type!=='spit')queueContact(trashContactFX,shot.tx,SHIELD_LINE_Y,0,-1,'enemy','world');
   effect(shot.tx,SHIELD_LINE_Y,'#b9f684',36,'BLOCK!');
   burst(shot.tx,SHIELD_LINE_Y,'#b9f684',9);sfx('shield');feedback('shield');
  }else{
   const citizen=shot.citizen;
   if(citizen?.alive){
    if(shot.type!=='spit')queueContact(trashContactFX,shot.tx,shot.ty,0,-1,'enemy',citizen);
    defeatCitizenByTrash(citizen,shot.type==='spit'?'spit':'trash');
   }
   else{
    if(shot.type!=='spit')queueContact(trashContactFX,shot.tx,shot.ty,0,-1,'ground','world');
    effect(shot.tx,shot.ty,'#dfb48d',26);burst(shot.tx,shot.ty,'#dbb081',5);feedback('junkGround');
   }
  }
 }
 if(balls[0]?.held)return;
 const cap=projectileFlightCap();
 // Giant trash boss takes priority when the shared projectile budget is tight.
 const throwers=trashThrowersInOrder;
 throwers.length=0;
 for(const z of foes)if(z.boss&&trashThrower(z))throwers.push(z);
 for(const z of foes)if(eliteTrashThrower(z))throwers.push(z);
 for(const z of throwers){
  const elite=eliteTrashThrower(z);
  if(z.throwWindup>0){
   z.throwWindup=Math.max(0,z.throwWindup-dt*enemySlowRate());
   if(z.throwWindup>0)continue;
   const citizen=z.throwTarget;
   if(citizen?.alive&&bossTrashShots.length<cap)launchTrashShot(z,citizen);
   z.throwTarget=null;
   z.throwAt=clock+trashThrowCooldown(z);
   spitSharedNextAt=Math.max(spitSharedNextAt,clock+.85);
   continue;
  }
  if(elite&&(z.eliteMotion||z.spitWindup>0||z.hitHold>0||(z.recoil||0)>.02||
    clock<eliteTrashSharedReadyAt))continue;
  if(clock<(z.throwAt??(z.throwAt=clock+(z.boss?3.7:5.2)+Math.random()*3))||
    bossTrashShots.length>=cap)continue;
  const alive=citizens.filter(p=>p.alive);
  if(!alive.length){z.throwAt=clock+4;continue}
  z.throwTarget=alive[Math.floor(Math.random()*alive.length)];
  z.throwKind=nextThrowableKind();
  z.throwWindup=z.boss?.75:z.eliteKind===0?.58:.80;
  z.throwAt=clock+9;
  if(elite)eliteTrashSharedReadyAt=clock+(6.3+Math.random()*1.9)*(1-.38*projectilePressure());
  spitSharedNextAt=Math.max(spitSharedNextAt,clock+1.2);
  effect(z.x+z.w*.5,z.y+z.h*.20,'#ffcb71',z.boss?36:24);
  sfx('serve');
 }
 // All elites (including water bottle) and all four boss forms may spit.
 for(const z of foes){
  if(!spitThrower(z))continue;
  if(!Number.isFinite(z.spitAt)){
   z.spitAt=clock+4.5+Math.random()*4+(z.boss?0:1.5);
   continue;
  }
  if(z.spitWindup>0){
   z.spitWindup=Math.max(0,z.spitWindup-dt*enemySlowRate());
   if(z.spitWindup>0)continue;
   if(z.spitTarget?.alive&&bossTrashShots.length<cap)launchSpit(z,z.spitTarget);
   z.spitTarget=null;z.spitAt=clock+spitCooldown(z);
   continue;
  }
  if(clock<z.spitAt||clock<spitSharedNextAt||bossTrashShots.length>=cap||
    z.throwWindup>0||z.eliteMotion||z.hitHold>0||(z.recoil||0)>.02)continue;
  const alive=citizens.filter(p=>p.alive);
  if(!alive.length){z.spitAt=clock+3;continue}
  z.spitTarget=alive[Math.floor(Math.random()*alive.length)];
  z.spitWindup=z.boss?.55:.44;
  spitSharedNextAt=clock+2.35-1.35*projectilePressure();
  sfx('spit');
 }
}
// Bake the four visible widths once. The base pass and Bloom use the same bitmap.
const spitSprites=[],spitBloomDraws=[];
function spitSprite(radius){
 if(spitSprites[radius])return spitSprites[radius];
 const sprite=document.createElement('canvas');
 sprite.width=80;sprite.height=64;
 const ctx=sprite.getContext('2d');
 ctx.translate(40,32);
 ctx.fillStyle='#74ed20';ctx.shadowColor='#70ff11';ctx.shadowBlur=11;
 ctx.beginPath();ctx.ellipse(0,0,radius,7,0,0,Math.PI*2);ctx.fill();
 ctx.shadowBlur=0;ctx.fillStyle='#dcff72';
 ctx.beginPath();ctx.ellipse(2,-2,5.5,3.2,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#91fb38';ctx.fillRect(-17,-2,5,4);ctx.fillRect(-23,0,3,3);
 spitSprites[radius]=sprite;
 return sprite;
}
function paintSpit(sprite,x,y,angle){
 g.save();g.translate(x,y);g.rotate(angle);
 g.drawImage(sprite,-40,-32);g.restore();
}
function drawNeonSpit(x,y,t,angle=0){
 const sprite=spitSprite(Math.round(11+3*Math.sin(Math.PI*t)));
 paintSpit(sprite,x,y,angle);
 if(fxEnabled&&fxRenderer)spitBloomDraws.push(sprite,x,y,angle);
}
function drawSpitBloom(){
 for(let i=0;i<spitBloomDraws.length;i+=4){
  paintSpit(spitBloomDraws[i],spitBloomDraws[i+1],spitBloomDraws[i+2],spitBloomDraws[i+3]);
 }
}
function drawBossTrashShots(){
 spitBloomDraws.length=0;
 for(const z of foes){
  if(trashThrower(z)&&z.throwWindup>0){
   const sway=Math.sin(enemyAnimationClock*16)*2,size=z.boss?40:z.eliteKind===0?24:28;
   drawThrowable(z.throwKind,z.x+z.w*.75,z.y+(z.boss?-4:4)+sway,size,-.2);
  }
  if(spitThrower(z)&&z.spitWindup>0){
   const x=z.x+z.w*.5,y=z.y+z.h*.39;
   drawNeonSpit(x,y,.15,0);
  }
 }
 for(const p of bossTrashShots){
  const pos=bossTrashProjectilePosition(p);
  if(p.type==='spit'){
   const angle=Math.atan2(p.ty-p.sy,p.tx-p.sx);
   drawNeonSpit(pos.x,pos.y,pos.t,angle);
  }else{
   const flare=1-Math.abs(2*pos.t-1);
   const size=p.eliteKind===0?22+5*flare:p.eliteKind===1?24+6*flare:29+7*flare;
   drawThrowable(p.kind,pos.x,pos.y,size,pos.t*Math.PI*5);
  }
 }
 if(spitBloomDraws.length)captureBloom(drawSpitBloom);
}
function updateCrowd(dt){updateBubbles(dt);for(const p of citizens){if(p.dying>0)p.dying=Math.max(0,p.dying-dt);if(!p.alive&&mode==='playing')p.absent=(p.absent||0)+dt;p.returning=Math.max(0,(p.returning||0)-dt);p.supportTime=Math.max(0,(p.supportTime||0)-dt);}cheerTime=Math.max(0,cheerTime-dt);if(mode==='clearing')return;updateBazooka(dt);if(mode!=='playing')return;for(let i=0;i<junk.length;){const j=junk[i];j.t+=dt;if(j.t>=j.duration){junk.splice(i,1);burst(j.tx,j.ty,'#d9c28b',4);if(foes.includes(j.target)&&Math.hypot(j.target.x+j.target.w/2-j.tx,j.target.y+j.target.h/2-j.ty)<32){queueContact(trashContactFX,j.tx,j.ty,0,1,'enemy',j.target,1.4375);const citizenCrit=Math.random()<growth('citizenCrit')*.03;
 const citizenDamage=(.25+growth('citizenPower')*.05)*(citizenCrit?3:1);
 damage(j.target,citizenDamage,true);
 if(citizenCrit){effect(j.tx,j.ty,'#fff5ad',31);burst(j.tx,j.ty,'#ffe899',7);sfx('hit');feedback('critical')}else feedback('junkHit');
 if(j.target.hp>0&&!(j.target.trashStopUntil>clock)){
  j.target.trashStopUntil=clock+.08;
  j.target.hitHold=Math.max(j.target.hitHold||0,.08);
 }
 if(mode!=='playing')return}else{queueContact(trashContactFX,j.tx,j.ty,0,1,'ground','world');feedback('junkGround')}}else i++}if(balls[0]?.held||!foes.length)return;crowdTimer-=dt;if(crowdTimer<=0){crowdTimer=3.5+Math.random()*2;const alive=citizens.filter(p=>p.alive);if(!alive.length)return;let citizen=alive[Math.floor(Math.random()*alive.length)],target=foes[Math.floor(Math.random()*foes.length)];junk.push({sx:citizen.x,sy:citizen.y-15,tx:target.x+target.w/2,ty:target.y+target.h/2,target,t:0,duration:1.4,kind:nextThrowableKind()});citizen.supportTime=.62;cheerTime=1.4;sfx('serve')}}
// 8 distinct approved citizens × 4 frames each. Two separate alpha PNG
// atlases share a fixed 128×128 cell grid: cheer vs counterattack/sacrifice.
// Keep the old procedural artwork only as a non-blocking loading fallback.
function citizenSpriteFrame(p,cheering){
 const cast=window.ZZCitizenCast;
 if(!cast?.ready)return null;
 const wounded=!p.alive&&p.dying>0;
 const supporting=(p.shooting||0)>0||(p.supportTime||0)>0;
 const attack=wounded||supporting;
 let frame=0;
 if(wounded)frame=Math.min(3,Math.floor((1-p.dying/.8)*4));
 else if((p.shooting||0)>0)frame=Math.min(3,Math.floor((1.15-p.shooting)/1.15*4));
 else if((p.supportTime||0)>0)frame=Math.min(3,Math.floor((.62-p.supportTime)/.62*4));
 else if(cheering)frame=Math.floor((clock*5.6+p.phase)%4);
 return {atlas:attack?cast.attack:cast.cheer,frame,identity:p.style%8};
}
function drawCitizenBitmap(p,x,y,cheering){
 const frame=citizenSpriteFrame(p,cheering);
 if(!frame||!frame.atlas)return false;
 // Restore v41's approved, expressive citizen size. Mild overlap is
 // intentional in the packed audience; keep foot anchor and all hitboxes.
 const tile=128,width=35,height=46;
 g.drawImage(frame.atlas,frame.identity*tile,frame.frame*tile,tile,tile,
             x-width/2,y-height+21,width,height);
 return true;
}
// Original crowd railing stays behind the citizens. The bright horizontal
// light in the screenshot is the timed SHIELD ITEM, not this railing.
// Place the shield beam 23 logical pixels ABOVE its old H-35 position,
// clear of civilian heads. The same Y is used for the ball rebound and
// its hit sparkle; the bounce rule and skill duration do not change.
const SHIELD_LINE_Y=H-58;
function drawCrowd(){rect(20,H-51,410,4,'#7189a2');rect(20,H-47,410,3,'#182d40');for(const p of citizens){if(!p.alive&&p.dying<=0)continue;g.save();drawHardGroundShadow(p.x,p.y+21,25,6,true,.28);drawTrashContact(p);if(p.returning>0){const t=1-p.returning/1.1;g.globalAlpha=Math.min(1,t*5);if(fxEnabled){g.strokeStyle='#91f4d0';g.lineWidth=3;g.beginPath();g.ellipse(p.x,p.y+12,12+t*24,5+t*8,0,0,Math.PI*2);g.stroke();for(let i=0;i<4;i++){const a=i*Math.PI/2+t*4;rect(p.x+Math.cos(a)*25,p.y-15+Math.sin(a)*23,4,4,'#ffed9b')}}g.translate(0,-Math.sin(t*Math.PI)*22)}if(!p.alive){const t=1-p.dying/.8;g.globalAlpha=Math.min(1,p.dying/.35);g.translate(p.x,p.y);g.rotate(Math.sin(t*13)*.22);g.scale(1+t*.15,1-t*.15);g.translate(-p.x,-p.y-30*Math.sin(t*Math.PI/2))}let cheer=mode==='clearing'||cheerTime>0||Math.sin(clock*1.5+p.phase)>.82,bob=cheer?Math.abs(Math.sin(clock*7+p.phase))*3:0,x=p.x,y=p.y-bob;if(drawCitizenBitmap(p,x,y,cheer)){g.restore();continue}rect(x-9,y+4,18,17,p.shirt);rect(x-8,y-10,16,16,p.skin);rect(x-9,y-13,18,5,p.hair);if(p.style===0){rect(x-11,y-15,22,4,p.shirt);rect(x-7,y-20,15,6,p.shirt)}if(p.style===1){rect(x-10,y-8,4,17,p.hair);rect(x+7,y-8,4,17,p.hair)}if(p.style===2){rect(x-8,y-7,16,2,'#263441');rect(x-7,y-5,5,4,'#d3ece1');rect(x+3,y-5,5,4,'#d3ece1')}else{rect(x-5,y-5,2,3,'#394149');rect(x+3,y-5,2,3,'#394149')}rect(x-3,y+1,6,2,'#984f4d');if(p.style===3){rect(x-6,y+12,13,3,'#f0e9c9');rect(x-2,y+4,4,14,'#f0e9c9')}if(p.style===4)rect(x-7,y,14,4,'#d3d4c0');if(cheer){rect(x-13,y-4,5,14,p.skin);rect(x+10,y-8,5,17,p.skin);rect(x-14,y-7,6,5,p.skin);rect(x+9,y-11,6,5,p.skin)}else{rect(x-12,y+7,4,12,p.skin);rect(x+9,y+7,4,12,p.skin)}g.restore()}}
// Citizen support uses its own projectiles; tennis ball physics stays unchanged.
// V151: each support rocket rolls one actual radius at launch.
// 48..88px replaces the former fixed 120px blast. The same value drives
// damage, contact flash, and the bitmap-friendly pixel burst renderer.
const BAZOOKA_RADIUS_MIN=48,BAZOOKA_RADIUS_MAX=88,BAZOOKA_DAMAGE=8;
function rollBazookaRadius(){
 return Math.round(BAZOOKA_RADIUS_MIN+
   (BAZOOKA_RADIUS_MAX-BAZOOKA_RADIUS_MIN)*Math.pow(Math.random(),1.25));
}
let rockets=[],bazookaTimer=0,bazookaBlasts=[];
function updateBazooka(dt){
 for(const p of citizens)p.shooting=Math.max(0,(p.shooting||0)-dt);
 for(const r of [...rockets]){r.t+=dt;if(r.t<r.duration)continue;rockets.splice(rockets.indexOf(r),1);
  const radius=r.radius??BAZOOKA_RADIUS_MAX;
  bazookaBlasts.push({x:r.tx,y:r.ty,radius,t:0,life:.39,seed:Math.random()*6.28});
  if(bazookaBlasts.length>6)bazookaBlasts.shift();
  effect(r.tx,r.ty,'#ffd16c',radius*.94,'BAZOOKA!',false,false);feedback('blast');
  burst(r.tx,r.ty,'#ffae65',Math.round(14+radius*.27));
  sfx('blast');
  for(const z of [...foes]){const dx=r.tx-clamp(r.tx,z.x,z.x+z.w),dy=r.ty-clamp(r.ty,z.y,z.y+z.h);if(dx*dx+dy*dy<=radius*radius){damage(z,BAZOOKA_DAMAGE+(typeof growth==='function'?growth('bazookaPower')*.4:0),false,{x:z.x+z.w/2-r.tx,y:z.y+z.h/2-r.ty});if(mode!=='playing')return}}
 }
 if(!has('bazooka')||!foes.length||(runMode!=='endless'&&balls[0]?.held))return;
 if(runMode==='endless'&&foes.some(z=>z.boss)&&supportRisk()<2)return;
 bazookaTimer-=dt;if(bazookaTimer>0)return;
 const alive=citizens.filter(p=>p.alive);if(!alive.length)return;
 const p=alive[Math.floor(Math.random()*alive.length)],z=foes[Math.floor(Math.random()*foes.length)],tx=z.x+z.w/2,ty=z.y+z.h/2;
 p.shooting=1.15;p.aim=Math.atan2(ty-(p.y-16),tx-p.x);bazookaTimer=3-(typeof growth==='function'?growth('bazookaReload')*.08:0);
 rockets.push({sx:p.x,sy:p.y-16,tx,ty,radius:rollBazookaRadius()+(typeof growth==='function'?Math.round(growth('bazookaPower')*1.6):0),t:0,duration:.7});citizenCue(p,false,'한 방 간다!');sfx('launch');burst(p.x,p.y-16,'#ffd16c',6);
}
function drawBazooka(){
 for(const p of citizens){
  if(!p.alive||!(p.shooting>0))continue;
  const elapsed=1.15-p.shooting,recoil=Math.max(0,1-elapsed/.2)*8;
  g.save();g.globalAlpha=Math.min(1,p.shooting/.2);g.translate(p.x,p.y-14);
  g.rotate(p.aim??-Math.PI/2);g.translate(-recoil,0);
  rect(-23,-9,53,18,'#1a2936');rect(-20,-7,48,14,'#708e57');
  rect(-18,-7,44,4,'#b9cd83');rect(-23,-11,10,22,'#415440');
  rect(23,-11,11,22,'#d3dda0');rect(29,-8,6,16,'#263640');
  rect(-5,-13,13,5,'#303d42');rect(-3,-14,5,2,'#ffdb81');
  rect(5,-6,5,12,'#36473a');rect(-9,7,7,11,'#374936');
  rect(13,7,6,9,'#374936');rect(-10,8,10,7,p.skin);rect(11,7,10,7,p.skin);
  if(elapsed<.12)luminous(()=>{
   g.fillStyle='#fff6bc';g.fillRect(33,-7,15,14);
   g.fillStyle='#ffae43';g.fillRect(48,-4,12,8);
   g.fillStyle='#ffa453';g.fillRect(34,-12,7,5);g.fillRect(34,7,6,5);
  });
  g.restore();
 }
 for(const r of rockets){
  const t=clamp(r.t/r.duration,0,1),x=r.sx+(r.tx-r.sx)*t,y=r.sy+(r.ty-r.sy)*t,travel=Math.hypot(x-r.sx,y-r.sy);
  const trail=Math.min(115,travel);
  g.save();g.translate(x,y);g.rotate(Math.atan2(r.ty-r.sy,r.tx-r.sx));
  luminous(()=>{
   for(let i=10;i>=1;i--){
    const d=trail*i/10,fade=1-i/11;
    g.globalAlpha=fade*.73;
    g.fillStyle=i%2?'#ff9b46':'#ffd777';
    g.fillRect(-d-10,Math.round(Math.sin(clock*40+i)*4)-3,Math.max(3,14-i*.8),Math.max(2,7-i*.45));
   }
   g.globalAlpha=1;
   g.fillStyle='#fff5b7';g.fillRect(-30,-3,14,6);
   g.fillStyle='#ffae4c';g.fillRect(-40,-7,12,4);g.fillRect(-42,4,15,4);
  });
  rect(-16,-8,29,16,'#1e3440');rect(-14,-6,26,12,'#dceb9b');
  rect(-10,-5,12,10,'#78995c');rect(2,-6,5,12,'#e69b54');
  rect(12,-5,10,10,'#ffae79');rect(-17,-12,7,24,'#618476');
  rect(-16,-11,5,3,'#dce8b4');g.restore();
 }
 if(bazookaBlasts.length)luminous(()=>{for(const b of bazookaBlasts){
  const t=clamp(b.t/.39,0,1);
  if(t>=1)continue;
  drawPixelBurst(b.x,b.y,t,(b.radius??88)*.94,68,b.seed||0,
    ['#ffffff','#ffedb3','#ffcb5d','#ff9036','#e96733'],0);
  g.save();g.globalAlpha=Math.max(0,(1-t*4)*.88);
  const box=(b.radius??88)*.52*(1-t*.42);
  g.fillStyle='#fff7c9';g.fillRect(b.x-box/2,b.y-box/2,box,box);g.restore();
 }});
}

function drawJunk(){for(const j of junk){
 const t=clamp(j.t/j.duration,0,1),
  x=j.sx+(j.tx-j.sx)*t,
  y=j.sy+(j.ty-j.sy)*t-Math.sin(Math.PI*t)*85;
 drawThrowable(j.kind,x,y,24+4*Math.sin(Math.PI*t),t*8);
}}
function drawEndlessShift(){
 // A light in-world cue only; never show the stage result card.
 const waveNumber=endlessWaveNumber()+(endlessShiftSpawned?0:1);
 const alpha=Math.min(1,Math.max(0,endlessShiftTime/.24),
  Math.max(0,(ENDLESS_SHIFT_SECONDS-endlessShiftTime)/.30));
 g.save();g.globalAlpha=alpha;
 g.textAlign='center';
 g.font='400 19px "Press Start 2P",monospace';g.fillStyle='#e9ffbd';
 g.shadowColor='#132926';g.shadowBlur=8;
 arcadeGlowText('WAVE '+String(waveNumber).padStart(2,'0'),225,315,9);
 g.font='bold 12px Arial, sans-serif';g.fillStyle='#d7e9e0';
 g.fillText('READY · 다음 공을 준비하세요',225,338);
 g.restore();
}
function drawClear(){g.fillStyle='#101a36df';g.fillRect(48,290,354,124);g.strokeStyle='#eff39e';g.lineWidth=2;g.strokeRect(48,290,354,124);g.textAlign='center';g.fillStyle='#eaf98a';g.font='400 17px "Press Start 2P",monospace';arcadeGlowText((runMode==='endless'?'WAVE '+(wave-50):'STAGE '+String(wave).padStart(2,'0'))+' CLEAR',225,330,10);g.fillStyle='#faf1d1';g.font='bold 13px monospace';g.fillText('시민들을 지켜냈습니다!',225,357);g.fillStyle='#96e3cd';g.font='400 10px "Press Start 2P",Arial,sans-serif';arcadeGlowText('+500 BONUS  ·  '+hero().name+' WIN!',225,385,5)}
let inputPointer=null,inputX=0;
function releaseInput(){inputPointer=null}
function blocksInput(e){return !!e.target?.closest?.('button,a,input,select,textarea,summary,[role="button"],.overlay,.guide')}
function inputDown(e){if(mode!=='playing'||blocksInput(e)||inputPointer!==null||(e.button!==undefined&&e.button!==0))return;inputPointer=e.pointerId;inputX=e.clientX;touchUsed=e.pointerType==='touch';target=car;e.preventDefault?.();try{c.setPointerCapture?.(e.pointerId)}catch{}serve()}
function inputMove(e){if(mode!=='playing')return;if(inputPointer===e.pointerId){const r=c.getBoundingClientRect(),width=r.width||W;target=clamp(target+(e.clientX-inputX)*W/width,72,W-72);inputX=e.clientX;e.preventDefault?.()}else if(inputPointer===null&&e.pointerType==='mouse'&&e.target===c){const r=c.getBoundingClientRect();target=clamp((e.clientX-r.left)/(r.width||W)*W,72,W-72)}}
function inputEnd(e){if(e.pointerId===inputPointer)releaseInput()}
document.addEventListener('pointerdown',inputDown,{passive:false});document.addEventListener('pointermove',inputMove,{passive:false});document.addEventListener('pointerup',inputEnd);document.addEventListener('pointercancel',inputEnd);c.addEventListener('lostpointercapture',inputEnd);
window.addEventListener('keydown',e=>{if($('garage-dialog')?.open||$('radio-dialog')?.open||$('upgrade-dialog')?.open)return;if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys[e.key]=true;if(e.code==='Space'){if(mode==='menu'||mode==='over')start(mode==='over'?runMode:'campaign');else if(mode==='paused')pause();else serve()}if(e.code==='Escape')pause()});window.addEventListener('keyup',e=>keys[e.key]=false);window.addEventListener('blur',()=>{keys={};if(mode==='playing'||mode==='clearing'||mode==='endlessShift')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode==='playing'||mode==='endlessShift'))pause()});$('start').onclick=()=>mode==='paused'?pause():start(mode==='over'?runMode:'campaign');$('pause-main-menu').onclick=()=>{if(mode==='paused')backToSelection()};$('pause').onclick=pause;$('sound').onclick=()=>{sound=sound&&!audioRunning()?true:!sound;unlockAudio();audioUI();if(sound)sfx('item')};$('legend').innerHTML=Object.entries(SKILLS).map(([k,s])=>'<div style="--skill:'+s.color+'">'+icon(k)+'<span><b>'+s.name+'</b><small>'+s.desc+' · '+s.duration+'초</small></span></div>').join('');rack();resetBalls();renderHeroes();endlessUI();requestAnimationFrame(frame);

// Confirm successful permanent upgrades with the existing approved pickup sound.
window.ZZProgressionSound=()=>{unlockAudio();sfx('item');feedback('item')};
$('bgm').onclick=()=>{musicEnabled=!musicEnabled;unlockAudio();$('bgm').textContent=musicEnabled?'BGM ON':'BGM OFF';$('bgm').setAttribute('aria-pressed',String(musicEnabled));nextBeat=0};
$('fx').onclick=()=>{fxEnabled=!fxEnabled;$('fx').textContent=fxEnabled?'FX FULL':'FX LIGHT';$('fx').setAttribute('aria-pressed',String(fxEnabled));if(!fxEnabled){fx=[]}};
$('share').onclick=async()=>{const url=new URL('./',location.href).href;try{if(navigator.share){await navigator.share({title:'ZOMBIE ZERO',text:'테니스공으로 좀비를 물리쳐 보세요!',url});return}await navigator.clipboard.writeText(url);$('share').textContent='링크 복사 완료!'}catch(e){if(e.name==='AbortError')return;$('share-url').hidden=false;$('share-url').value=url;$('share-url').select()}};
// Keep the pixel-art shapes but render geometry and text at native display density.
// Mobile portrait world expands vertically instead of scaling 450×710 shapes
// into a distorted rectangle. Actual world collisions use the same coordinate
// system as the drawing surface, so the whole extra space is playable.
function resizeCanvas(){
 const bounds=c.getBoundingClientRect(),widthCss=bounds.width||W,heightCss=bounds.height||710;
 // All display sizes render the SAME logical 450×710 arena. App.fit() sizes
 // the CSS canvas as a contain-fit rectangle instead of resizing game physics.
 const targetH=710;
 if(targetH!==H){
  const oldH=H,delta=targetH-oldH;
  H=targetH;VIEW_DELTA=H-710;PY=H-126;DEFENSE_Y=H-145;
  // Keep live positions stable relative to the expanded screen.
  for(const citizen of citizens)citizen.y+=delta;
  for(const ball of balls){
   if(ball.held){const o=heldBallOffset();ball.x=car+o.x;ball.y=PY+o.y;continue}
   const progress=clamp((ball.y-16)/(oldH-16),0,1);
   ball.y+=delta*progress;
   if(ball.trail)for(const p of ball.trail)p.y+=delta*clamp((p.y-16)/(oldH-16),0,1);
  }
  for(const item of items)item.y+=delta*clamp((item.y-16)/(oldH-16),0,1);
  // Enemies keep their actual distances from the top entry point; the larger
  // runway to DEFENSE_Y is intentional when a taller phone is available.
  if(fxRenderer)fxRenderer=null;
 }
 const dpr=clamp(window.devicePixelRatio||1,1,3);
 const width=Math.max(1,Math.round(widthCss*dpr));
 const height=Math.max(1,Math.round(heightCss*dpr));
 if(c.width!==width||c.height!==height){c.width=width;c.height=height}
 g.setTransform(width/W,0,0,height/H,0,0);
 g.imageSmoothingEnabled=true;
 draw();
}
window.ZZGameLayout={getHeight:()=>H,getDefenseY:()=>DEFENSE_Y,getPaddleY:()=>PY,getViewDelta:()=>VIEW_DELTA};
resizeCanvas();window.addEventListener('resize',resizeCanvas);if(typeof ResizeObserver!=='undefined')new ResizeObserver(resizeCanvas).observe(c);

