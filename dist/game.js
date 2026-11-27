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
// V424: bounded, reusable 10 Hz pose history; no raster copies or extra assets.
let slowEchoHistory=new WeakMap(),slowEchoNextSample=-Infinity;
const SLOW_ECHO_DELAY=3,SLOW_ECHO_INTERVAL=.1,SLOW_ECHO_CAPACITY=32,SLOW_ECHO_ALPHA=.28;
let slowTintCache=new WeakMap(),slowTintQueue=[],slowTintPixels=0,slowTintContexts=new WeakMap();
const SLOW_TINT_PIXEL_LIMIT=3500000,SLOW_TINT_COLOR='rgba(65,166,246,0.44)';
const SKILLS={bazooka:{name:'시민 바주카',duration:12,color:'#ffd16c',desc:'시민이 3초마다 희귀 광역 로켓 · 피해 8',icon:'<path d="m5 21 15-15 7 7-15 15zM18 8l6 6M6 22l-2 6 6-2M19 3l2-2M28 10l3-1M26 3l3-3"/>'},dual:{name:'더블볼',duration:16,color:'#aee8ff',desc:'공 2개',icon:'<circle cx="9" cy="12" r="5"/><circle cx="23" cy="20" r="5"/>'},triple:{name:'트리플볼',duration:16,color:'#c0a5ff',desc:'공 3개',icon:'<circle cx="16" cy="7" r="4"/><circle cx="7" cy="23" r="4"/><circle cx="25" cy="23" r="4"/>'},power:{name:'파워볼',duration:14,color:'#f5d470',desc:'크기·공격력 ×2',icon:'<circle cx="16" cy="16" r="12"/><path d="m17 6-7 12h6l-1 8 8-13h-6z"/>'},fire:{name:'화염볼',duration:10,color:'#ff9763',desc:'강화할수록 점화·전염 범위 및 연소 대상 증가',icon:'<path d="M17 3c4 9-4 9 2 14l5-6c9 12 1 19-8 18S3 21 8 13l3 5c4-4 0-8 6-15Z"/>'},slow:{name:'슬로우',duration:14,color:'#86f2e0',desc:'좀비와 적 투사체는 질질~ 공은 쌩쌩!',icon:'<circle cx="16" cy="17" r="11"/><path d="M16 10v8l6 3M12 2h8M16 2v4"/>'},pierce:{name:'관통샷',duration:10,color:'#ffe88a',desc:'10초간 적을 관통 · 충돌당 크리티컬 피해 ×2',icon:'<circle cx="7" cy="16" r="4"/><path d="M12 16h17M22 8l7 8-7 8M17 11h7"/>'},shield:{name:'보호막',duration:18,color:'#b9f684',desc:'바닥에서 공 반사',icon:'<path d="m16 3 11 4v10c0 6-11 12-11 12S5 23 5 17V7Z"/><path d="m10 16 4 4 8-9"/>'}};
let mode='menu',score=0,wave=1,lives=3,best=0,car=225,target=225,balls=[],foes=[],items=[],particles=[],keys={},swing=0,combo=0,ballVanish=[],criticalPopups=[],itemPickupFX=[],clock=0,last=0,active={},sound=true,toastTimer,stageDelay=0,audio,master,musicBus,nextBeat=0,beat=0,lastSkillMarkup='';
try{best=+(localStorage.getItem('zr-best')||0)}catch{}
const HEROES=[
 {id:'ace',name:'에이스',role:'GUARDIAN',className:'철벽 수비',trait:'와이드 커버',accent:'#99e49c',color:'#ed684c',hair:'#503627',skin:'#ffd4a0',speed:480,paddle:82,damage:1,lives:3,duration:1,desc:'넓은 라켓 · 코너 커버 · 안정적인 정타',stats:'GUARDIAN · 최대 수비 범위 · 정교한 코너 컨트롤'},
 {id:'ruby',name:'루비',role:'SPEEDSTER',className:'초고속 기동',trait:'센터 스매시',accent:'#78e4f6',color:'#5ecba7',hair:'#e7843c',skin:'#ffe0ba',speed:720,paddle:46,damage:1,lives:3,duration:1.35,desc:'스피드 720 · 정타 강타 · 스킬 +35%',stats:'SPEEDSTER · 중심 타격 넉백 · 스킬 +35%'},
 {id:'liam',name:'리아',role:'BREAKER',className:'파괴 화력',trait:'2타 충격파',accent:'#ff8c76',color:'#f0b84e',hair:'#ed6c34',skin:'#f1bc87',speed:375,paddle:49,damage:2.2,lives:2,duration:1,desc:'해머 · 공격 2.2 · 2회 리턴마다 연쇄 타격',stats:'BREAKER · 파괴력 2.2 · 반사 2회마다 연쇄 충격'}];
if(window.ZZGarage)HEROES.push({id:'mechanic',name:'렌치',role:'TRICKSHOT',className:'반사각 특화',trait:'BANK SHOT',accent:'#ffdc75',color:'#ffae40',hair:'#273842',skin:'#ddb48c',speed:480,paddle:56,damage:1.15,lives:3,duration:1,desc:'스패너 · 넓은 반사각 · 벽 충전 연쇄 타격',stats:'TRICKSHOT · 특수 반사각 · 벽 반사 후 강화 및 연쇄 타격'});
// V274: Scarlett joins the owned cast with a luxury car, handbag and prism orb.
if(window.ZZGarage)HEROES.push({id:'scarlet',name:'스칼렛',role:'DIVA',className:'프리즘 스타',trait:'다이아몬드 피니시',accent:'#ff9be7',color:'#da345c',hair:'#ffd76f',skin:'#ffddc3',speed:780,paddle:54,damage:2,lives:5,duration:1.12,desc:'명품백 · 속도 780 · 공격 2.0 · 체력 5 · 프리즘 강타',stats:'DIVA · 속도 780 · 공격 2.0 · 체력 5 · 3번째 리턴 프리즘 타격'});
const gearBonus=id=>window.ZZGarage?.bonus(id)||0;
const garageCombat=()=>window.ZZGarage?.combatStats?.()||{attack:0,guard:0,resist:0};
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
// Equipped module heart bonuses raise the real maximum for starting and
// five-wave recovery; never mutate the original character base stats.
const maxHeroLives=()=>hero().lives+Math.max(0,garageCombat().lives||0);
const growth=id=>window.ZZProgression?.level?.(id)||0;
// V60 approved 192px idle atlas -> 108px game artwork, top-left = (car-54, PY-59).
// Tennis racket face (58,76), pink bat tip (54,75), hammer head (141,75).
// Balls sit on the UPWARD rim (face-safe), not in the character's hand or face.
const HELD_BALL_OFFSETS=[{x:-21,y:-30},{x:-23,y:-31},{x:25,y:-30}];
// v306: lower the held ball to the current 80%-scale vehicle artwork.
// Preserve the subtle 8-frame vertical sway on Wrench's pre-serve ball,
// and leave the other three survivors and all live-ball physics untouched.
const wrenchServeOffsets=[{x:-34,y:-34},{x:-34,y:-36},{x:-34,y:-39},{x:-35,y:-42},
 {x:-35,y:-39},{x:-34,y:-36},{x:-34,y:-35},{x:-35,y:-35}];
const heldBallOffset=()=>selectedHero===4?{x:-35,y:-27}:selectedHero===3?wrenchServeOffsets[Math.floor(clock*8)%8]:
 HELD_BALL_OFFSETS[selectedHero]||HELD_BALL_OFFSETS[0];
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
const particlePool=[],contactPool=[],flashPool=[];
function recycleVisual(pool,v){if(pool.length<320)pool.push(v)}
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
 queueContact(ballContactFX,x,y,nx,ny,kind,null,(typeof miniBallScale==='function'?miniBallScale():1));
}
function queueContact(queue,x,y,nx,ny,kind,target,sizeMultiplier=1){
 const entry=typeof contactPool!=='undefined'?(contactPool.pop()||{}):{};
 Object.assign(entry,{x,y,nx,ny,kind,target,sizeMultiplier,tone:0,
  variant:Math.floor(Math.abs(x*7+y*3+clock*41))%12,t:0,life:queue===trashContactFX?.42:kind==='enemy'?.30:kind==='ceiling'?.25:.27});queue.push(entry);
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
  }else if(f.sizeMultiplier!==1){
   // Player-ball sparks shrink only in Mini Horde; citizen shots are never
   // part of ballContactFX and keep their original bitmap dimensions.
   g.scale(f.sizeMultiplier,f.sizeMultiplier);
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
// Fortress keeps every collider inside the same narrowed lane as its wall grid.
// Standard, endless and MINI HORDE retain their previous road bounds.
const zombieMinX=()=>isFortress()&&fortress?fortress.bounds().enemyLeft:ROAD_LEFT+ZOMBIE_WALL_MARGIN;
const zombieMaxX=z=>isFortress()&&fortress?fortress.bounds().enemyRight-z.w:ROAD_RIGHT-ZOMBIE_WALL_MARGIN-z.w;
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
 const zombieGroundShadowFoot=z=>(z.miniScale||1)<1
  ?z.y+z.h-3*(z.miniScale||1)-(z.boss&&z.bossForm===3?18*(z.miniScale||1):0)
  :z.y+z.h-3-(z.boss&&z.bossForm===3?18:0);
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
 if(selectedHero===4)return 627+VIEW_DELTA;
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
const lightColorStamps=new Map();
function trailLightStamp(rgb){
 const known=trailLightStamps.get(rgb);if(known)return known;
 const key=rgb.join(',');
 const cached=typeof lightColorStamps!=='undefined'&&lightColorStamps.get(key);
 if(cached){trailLightStamps.set(rgb,cached);return cached}
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
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
 trailLightStamps.set(rgb,stamp);
 if(typeof lightColorStamps!=='undefined'){if(lightColorStamps.size>=64)lightColorStamps.delete(lightColorStamps.keys().next().value);lightColorStamps.set(key,stamp)}
 return stamp;
}
function drawSoftLightSpill(x,y,r,rgb,alpha=.35,useTrailStamp=false,widthScale=1){
 if(!fxEnabled||!Number.isFinite(x)||!Number.isFinite(y)||alpha<=0)return;
 const radius=Math.min(100,Math.max(12,r))*widthScale;
 // Every trail wake can use the prebuilt mask, including the first skill pickup. Positions, 5-stop
 // falloff, additive alpha and BOTH outer/core radii stay unchanged.
 if(useTrailStamp&&typeof document!=='undefined'&&typeof document.createElement==='function'){
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
function drawProjectedLightSpill(x,y,r,rgb,alpha=.35,drop=28,vertical=.82,useTrailStamp=true,drawCore=true,widthScale=1){
 if(!fxEnabled||alpha<=0)return;
 g.save();
 g.translate(x+4,y+drop);
 // V89: the old 0.48 scale made falloff cores look like razor-thin lines.
 // Use a fuller oval; caller can give a rounder .94 for impact flashes.
 g.scale(1,Math.max(.72,Math.min(1,vertical)));
 // Draw the same cached outer/core mask pair without nested saves, restores,
 // repeated color-cache lookup or repeated blend/shadow state changes.
 const stamp=useTrailStamp&&typeof trailLightStamp==='function'?trailLightStamp(rgb):null;
 if(stamp&&Number.isFinite(x)&&Number.isFinite(y)){
  const inherited=g.globalAlpha,outer=Math.min(100,Math.max(12,r))*widthScale;
  g.globalCompositeOperation='lighter';g.shadowColor='transparent';g.shadowBlur=0;
  g.globalAlpha=inherited*Math.min(.8,alpha)/.8;
  g.drawImage(stamp,-outer,-outer,outer*2,outer*2);
  if(drawCore){
   const core=Math.min(100,Math.max(12,r*.52))*widthScale;
   g.globalAlpha=inherited*Math.min(.8,alpha*.37)/.8;
   g.drawImage(stamp,-core,-core,core*2,core*2);
  }
 }else{
  drawSoftLightSpill(0,0,r,rgb,alpha,useTrailStamp,widthScale);
  if(drawCore)drawSoftLightSpill(0,0,r*.52,rgb,alpha*.37,useTrailStamp,widthScale);
 }
 g.restore();
}
// V88: reflected light is a separate projected wake, NOT a glow pasted onto
// the sprite. A bounded set of overlapping soft ellipses forms a readable
// floor streak on bright stage roads, without another full-size particle pass.
// Fixed hero colors are not allocated again for every ball and frame.
// v282: index every playable hero. The missing Scarlet entry used to
// fall back to Ace's lime tennis light even when her diamond trail was blue.
const TRAIL_GROUND_HERO_COLORS=[
 [192,234,112], // Ace: tennis lime
 [255,227,183], // Ruby: warm baseball ivory
 [255,191,129], // Ria: orange toy ball
 [174,213,221], // Wrench: brushed steel cyan
 [180,212,255]  // Scarlet: ice-blue diamond refraction
];
const HERO_GROUND_RAMPS=[
 [TRAIL_GROUND_HERO_COLORS[0]],
 [[255,227,183],[255,215,190],[255,195,173],[255,174,161]],
 [[255,191,129],[255,174,107],[255,154,89],[255,139,74]],
 [[174,213,221],[151,209,223],[125,198,220],[105,185,217]],
 [[180,212,255],[159,198,255],[143,184,255],[128,169,255]]
];
const SCARLET_DIAMOND_GROUND_ACCENT=[245,187,237]; // subtle violet-pink facet
// Indexed by fire (1), pierce (2), power (4). Stops run from tail to ball.
const SKILL_TRAIL_RAMPS=[
 null,
 ['#fff15b','#ff8610','#c90009'],
 ['#c0ffff','#00b8ff','#1824be'],
 ['#dbcaff','#7130cb','#ff087d'],
 ['#964200','#ffb409','#ffff94'],
 ['#fffba0','#ffb000','#ac0b00'],
 ['#fff9a6','#17dbbe','#152da6'],
 ['#fff791','#ff5423','#5616af']
].map(stops=>stops&&{
 stops,
 ground:stops.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)))
});
function activeTrailRamp(){
 return SKILL_TRAIL_RAMPS[(has('fire')?1:0)|(has('pierce')?2:0)|(has('power')?4:0)];
}
const BURN_GROUND_COLOR=[255,139,51];
// V410: normalized flame masks, warmed before a rally. Scaling and rotation
// reproduce the original cubic silhouette with no per-tongue path rasterization.
const trailFlameStamps=new Map();
function trailFlameStamp(color){
 if(typeof CanvasRenderingContext2D!=='function'||typeof document==='undefined')return null;
 if(trailFlameStamps.has(color))return trailFlameStamps.get(color);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const c=canvas.getContext('2d');if(!c)return null;
 c.setTransform(100,0,0,50,8,64);c.fillStyle=color;c.beginPath();c.moveTo(0,.64);
 c.bezierCurveTo(.33,.9,.72,.34,1,0);
 c.bezierCurveTo(.64,-.36,.25,-.9,0,-.64);c.closePath();c.fill();
 trailFlameStamps.set(color,canvas);return canvas;
}

 const PICKUP_LIGHT_COLORS=Object.fromEntries(Object.entries(typeof SKILLS!=='undefined'?SKILLS:{}).map(([k,v])=>[k,typeof effectLightRGB==='function'?effectLightRGB(v.color):[255,210,112]]));
 const TRAIL_WARM_COLORS=[...TRAIL_GROUND_HERO_COLORS,...HERO_GROUND_RAMPS.flat(),SCARLET_DIAMOND_GROUND_ACCENT,
  ...SKILL_TRAIL_RAMPS.slice(1).flatMap(ramp=>ramp.ground),BURN_GROUND_COLOR,...Object.values(PICKUP_LIGHT_COLORS),
   [87,213,255],[255,226,142],[255,194,105],[169,239,255],[255,248,197],[255,231,169],[255,125,39],[255,174,70],[255,210,112]];
 let trailWarmIndex=0;
 function warmTrailLighting(){
  if(trailWarmIndex>=TRAIL_WARM_COLORS.length||!fxEnabled)return;
  // At most one tiny canvas per frame, only while there is no active rally.
  if(mode!=='menu'&&mode!=='building'&&mode!=='over'&&!(balls[0]?.held))return;
  if(typeof document==='undefined'||typeof document.createElement!=='function')return;
  const rgb=TRAIL_WARM_COLORS[trailWarmIndex++];
  const stamp=trailLightStamp(rgb);
  // Touch the texture on the live canvas at zero opacity, before action.
  if(stamp&&g?.drawImage){g.save();g.globalAlpha=0;g.drawImage(stamp,0,0,1,1);g.restore()}
 }
 // A fast Start/Serve may occur before the expanded palette finishes
 // prewarming. Complete only the remaining masks while the ball is held.
 function finishTrailLightingWarmup(){
  if(!fxEnabled||!balls[0]?.held||typeof document==='undefined'||typeof document.createElement!=='function')return;
  while(trailWarmIndex<TRAIL_WARM_COLORS.length){
   const previous=trailWarmIndex;warmTrailLighting();
   if(trailWarmIndex===previous)break;
  }
 }

function drawTrailGroundReflections(b,r,path){
 if(!fxEnabled||b.held||!path||path.length<2)return;
 // Match the full existing trail (170px normal, 190px power) exactly.
 // The v88 cutoff at 134px plus eight samples made its floor wake too short.
 const length=path[path.length-1].s;
 if(length<9)return;
 const fire=has('fire'),pierce=has('pierce'),power=has('power');
 const defaultColors=TRAIL_GROUND_HERO_COLORS;
 const heroRamp=typeof HERO_GROUND_RAMPS!=='undefined'?(HERO_GROUND_RAMPS[selectedHero]||HERO_GROUND_RAMPS[0]):[defaultColors[selectedHero]||defaultColors[0]];
 const ramp=activeTrailRamp();
 const colors=ramp?ramp.ground:heroRamp;
 const baseAlpha=(fire||pierce?(power ? .43 : .39):(power ? .42 : .39))*(ramp ? .8 : .6);
 const radius=(fire||pierce?(power?34:28):power?28:24)*(typeof miniBallScale==='function'?miniBallScale():1);
 // V410: 16px maximum spacing, both endpoints retained. Normalize additive
 // energy by the old/new sample ratio, without enlarging the wake silhouette.
 const start=4;
 const samples=Math.min(20,Math.max(2,Math.ceil((length-start)/16)+1));
 const energy=(Math.min(20,Math.max(2,Math.ceil((length-start)/11)+1))-1)/(samples-1);
 for(let i=0;i<samples;i++){
  const d=start+(length-start)*i/(samples-1);
  const p=sampleBallTrail(path,d);
  if(!p)continue;
  const fade=Math.pow(Math.max(.045,1-d/(length+12)),.86);
  const variation=.94+.06*Math.sin(clock*12+i*1.1);
  // Diamond floor lights match its cyan/blue body with a faint pink facet
  // reflection. Do not use the Ace lime fallback on the fifth hero.
  const normal=!fire&&!pierce&&!power;
  const rgb=normal&&selectedHero===4&&i%5===3?
    SCARLET_DIAMOND_GROUND_ACCENT:
    colors[Math.round((1-d/length)*(colors.length-1))];
  // Dense pools overlap; reduce each one's alpha to prevent white blowout.
  drawProjectedLightSpill(p.x,p.y,radius*(.76+.24*fade),rgb,
     baseAlpha*.68*fade*variation*energy,30,.82,true,undefined,
      1-.88*Math.pow(Math.max(0,(d/length-.25)/.75),2)*(3-2*Math.max(0,(d/length-.25)/.75)));
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
  drawProjectedLightSpill(f.x,f.y,(f.critical?74:54)*(f.miniFxScale||1),rgb,alpha,drop,.94);
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
 for(let i=0;i<fx.length;i++){
  const f=fx[i];
  const u=f.t/Math.max(.01,f.visualLife||.21);
  if(u>=1||f.standardHit)continue;
  drawProjectedLightSpill(f.x,f.y,Math.min(74,Math.max(26,f.size*.64)),
    effectLightRGB(f.color),(.29+.0016*Math.min(120,f.size))*(1-u),27);
 }
 for(const f of itemPickupFX){
  const u=f.t/Math.max(.01,f.life||.62);
  if(u>=1)continue;
  drawProjectedLightSpill(f.x,f.y-18*u,34,PICKUP_LIGHT_COLORS[f.k]||effectLightRGB(SKILLS[f.k]?.color),
    .29*(1-u),27,.82,true);
 }
 // Exception: burning zombies keep their light attached to their flames.
 for(const actor of foes){
  if(!(actor.burn>0)||actor.burnVisualDelay>0)continue;
  const z=knockVisualPosition(actor);
  drawSoftLightSpill(z.x+z.w*.5,z.y+z.h-20*(z.miniScale||1),(z.boss?48:29)*(z.miniScale||1),
    BURN_GROUND_COLOR,.23*Math.min(1,actor.burn/.3),true);
 }
 // Every ball trail gets a floor wake, even without a skill. Active fire,
 // pierce and power colors override the natural hero trail color.
 for(const b of balls){
  if(!b.held){
   const radius=((has('power')?12:8)*(typeof miniBallScale==='function'?miniBallScale():1));
   drawTrailGroundReflections(b,radius,getBallRenderTrailPath(b,radius));
  }
 }
 // V131: keep the ball-local pool smaller and dimmer than its trail wake.
 // Omit the extra inner core so the head does not become a bright round disc.
 // Preserve projection position and all trail/flame/lightning artwork.
 for(const b of balls){
  if(b.held)continue;
  const r=((has('power')?12:8)*(typeof miniBallScale==='function'?miniBallScale():1)),drop=ballProjectionDrop(r);
  const ramp=activeTrailRamp();
  if(ramp){
   const size=has('fire')?(has('power')?28:24):has('pierce')?(has('power')?24:20):26;
   const alpha=has('fire')&&has('pierce')?.19:has('fire')||has('pierce')?.16:.17;
   drawProjectedLightSpill(b.x,b.y,size*(typeof miniBallScale==='function'?miniBallScale():1),
     ramp.ground[2],alpha*.8,drop,.82,true,false);
  }
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
function sfx(name){if(!audioRunning()||!sound)return;let now=audio.currentTime;if(now-(lastSfx[name]??-10)<({wall:.085,hit:.065,kill:.065,fire:.15,evade:.14,powerhit:.045,bosshit:.05}[name]||0))return;lastSfx[name]=now;
 if(typeof playCachedCombatSfx==='function'&&playCachedCombatSfx(name))return;
 synthSfx(name,combo,tone,noise);
}
function synthSfx(name,combo,tone,noise){
if(name==='evade'){tone(980,.035,'triangle',.052,0,false,550);noise(.028,.018);return;}
if(name==='spit'){tone(460,.11,'sawtooth',.052,0,false,135);noise(.07,.032);return;}
if(name==='poison'){tone(190,.24,'triangle',.14,0,false,54);noise(.12,.04);return;}
if(name==='block'){tone(650,.07,'triangle',.07,0,false,215);return;}
const sounds={launch:[55,67,79],blast:[36,48,55],serve:[72,79,84],wall:[67],racket:[79,86,91],car:[76,83,88],citizen:[84,79,67],return:[72,76,79,84,91],bosshit:[43,55,62],powerhit:[55,67,79],hit:[60,67],kill:[72,76,79],item:[72,76,79,84,88],expire:[72,67],miss:[64,60,55],start:[60,64,67,72,76,79],wave:[60,64,67,72,79,84],boss:[43,50,55,62],bosskill:[60,67,72,76,79,84,88],fire:[55,62],shield:[79,84,91],pause:[72,67],over:[67,64,60,55]};const notes=sounds[name]||[72],rise=['kill','hit','powerhit'].includes(name)?Math.min(7,Math.floor(combo/2)):0,comboGain=1+Math.min(combo,10)*.025,spacing=Math.max(.024,.045-Math.min(combo,10)*.002),accent=['item','return','wave','bosskill','start'].includes(name);
notes.forEach((n,i)=>{tone(hz(n+rise),accent?.16:.085,'triangle',name==='wall'?.035:.1*comboGain,i*spacing);if(name!=='wall')tone(hz(n+rise),.055,'square',.023*comboGain,i*spacing)});
if(['racket','car','citizen'].includes(name))tone(500,.065,'square',.045,0,false,1250);
if(name==='racket'||name==='serve'){tone(155,.085,'triangle',.17,0,false,48);noise(.042,.085);}
if(['hit','kill','powerhit','bosshit'].includes(name)){tone(name==='kill'?160:110,.07,'triangle',.15,0,false,45);noise(.035,.04)}
if(name==='launch'){tone(180,.14,'sawtooth',.07,0,false,650);noise(.06,.08)}if(name==='blast'){tone(110,.22,'sine',.2,0,false,30);noise(.18,.1)}if(name==='fire'){noise(.07,.055);tone(160,.08,'triangle',.07,0,false,420)}
if(accent){[0,4,7].forEach(n=>tone(hz(60+n),.35,'triangle',.045,.07));tone(145,.19,'sine',.18,0,false,42);if(name==='wave'||name==='bosskill')noise(.16,.06,.12)}
if(name==='boss'){tone(82,.32,'triangle',.16,0,false,41);noise(.13,.055)}
if(name==='bosshit'){tone(95,.11,'triangle',.18,0,false,35);noise(.045,.065)}if(name==='powerhit')tone(165,.09,'triangle',.18,0,false,50);
if(name==='miss')tone(250,.18,'triangle',.12,0,false,70);}
// V349: cache the original synthesized combat sounds, including combo variants.
const combatSfxNames=['powerhit','kill','hit','bosshit'],combatSfxCache=new Map();
let combatSfxWarmBusy=false,combatSfxWarmFailed=false;
function playCachedCombatSfx(name){
 if(!combatSfxNames.includes(name))return false;
 const buffer=combatSfxCache.get(name+':'+Math.min(14,Math.max(0,combo|0)));
 if(!buffer)return false;
 try{const src=audio.createBufferSource();src.buffer=buffer;src.connect(master);src.onended=()=>src.disconnect?.();src.start(audio.currentTime);return true}catch{return false}
}
function warmCombatSfx(){
 if(combatSfxWarmBusy||combatSfxWarmFailed||!audioRunning()||!sound)return;
 if(mode==='playing'&&!balls[0]?.held)return;
 const Ctor=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!Ctor)return;
 let name,level;
 for(const c of [0,5,10,14,1,2,3,4,6,7,8,9,11,12,13]){
  for(const n of combatSfxNames){if(!combatSfxCache.has(n+':'+c)){name=n;level=c;break}}
  if(name)break;
 }
 if(!name)return;
 const key=name+':'+level;
 try{
  const rate=audio.sampleRate||44100,ctx=new Ctor(1,Math.ceil(rate*.4),rate);
  const schedule=(o,d,vol,delay,tail=0)=>{
   const v=ctx.createGain();o.connect(v);v.connect(ctx.destination);
   v.gain.setValueAtTime(vol,delay);v.gain.exponentialRampToValueAtTime(.001,delay+d);
   o.start(delay);o.stop(delay+d+tail);
  };
  const note=(f,d=.1,type='square',vol=.08,delay=0,music=false,endFreq=0)=>{
   const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,delay);
   if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(15,endFreq),delay+d);
   schedule(o,d,vol,delay,.01);
  };
  const hiss=(d=.09,vol=.08,delay=0)=>{
   if(!noiseBuffer){
    noiseBuffer=audio.createBuffer(1,Math.ceil(rate*.5),rate);
    const a=noiseBuffer.getChannelData(0);let hold=0;
    for(let i=0;i<a.length;i++){if(i%5===0)hold=Math.random()*2-1;a[i]=hold}
   }
   const o=ctx.createBufferSource();o.buffer=noiseBuffer;schedule(o,d,vol,delay);
  };
  synthSfx(name,level,note,hiss);combatSfxWarmBusy=true;
  Promise.resolve(ctx.startRendering()).then(buffer=>combatSfxCache.set(key,buffer))
   .catch(()=>{combatSfxWarmFailed=true}).finally(()=>{combatSfxWarmBusy=false});
 }catch{combatSfxWarmBusy=false;combatSfxWarmFailed=true}
}
const THEMES=[{name:'SUNNY RALLY',root:60,chords:[0,5,7,0],mel:[12,19,16,19,24,19,16,14,12,16,19,21,19,16,14,7]}, {name:'TURBO PARADE',root:57,chords:[0,5,7,5],mel:[12,16,19,21,24,21,19,16,14,17,21,24,23,19,16,14]}, {name:'VICTORY DRIVE',root:62,chords:[0,7,5,0],mel:[19,19,21,19,16,12,14,16,24,23,21,19,16,14,11,12]}, {name:'BOSS RUSH',root:50,chords:[0,5,7,0],mel:[24,19,24,27,24,19,22,19,24,27,31,27,26,22,19,15]}];
// V344: hand-authored original chip-arcade songs, no downloaded audio.
// Four 8-bar sections: hook, answer, lighter bridge, final hook.
const MUSIC_NEW=[["NEON BOUNCE",60,[0,5,9,7],[5,7,0,0],[12,16,19,24,21,19,16,14],[19,21,24,28,24,21,19,16],0],["STREET DISCO",57,[0,9,5,7],[5,0,7,9],[12,12,19,16,21,19,24,21],[16,19,16,14,12,19,21,24],1],["MIDNIGHT ARCADE",62,[0,7,9,5],[5,7,0,7],[19,24,23,19,16,19,21,24],[24,21,19,14,16,19,24,28],2],["ROOFTOP SPRINT",59,[0,5,7,9],[5,7,0,0],[12,14,16,19,21,24,21,19],[24,28,26,24,19,21,16,14],3],["PIXEL PARTY",65,[0,5,0,7],[9,5,7,0],[24,19,24,16,19,14,16,12],[19,19,21,24,21,19,16,19],1],["POWER RALLY",58,[0,7,5,9],[9,5,0,7],[12,19,24,19,16,19,21,19],[24,21,24,28,26,24,19,16],0],["GUMBALL GROOVE",61,[0,9,5,7],[0,5,7,0],[16,14,12,19,21,16,19,24],[19,24,19,21,16,14,19,12],2],["TURBO TAXI",55,[0,5,7,5],[9,7,5,0],[12,19,19,21,19,16,14,16],[24,24,21,19,16,19,21,24],3],["SUNSET BOOST",63,[0,9,5,7],[5,0,7,0],[12,16,21,19,24,23,21,19],[16,19,24,26,24,19,21,16],2],["BOUNCE EXPRESS",60,[0,7,0,5],[5,9,7,0],[19,16,19,24,19,16,21,24],[24,19,16,12,14,16,19,24],1],["COIN FEVER",64,[0,5,9,7],[5,7,9,0],[12,16,19,16,24,21,19,24],[24,28,24,21,19,16,14,12],3],["ZOMBIE JAM",57,[0,5,7,0],[9,5,7,5],[19,19,16,12,16,21,19,16],[12,16,19,24,21,24,19,14],0],["HIGH SCORE HERO",62,[0,9,5,7],[0,7,5,0],[12,19,21,24,28,24,21,19],[24,23,24,19,21,16,19,24],2],["FUNKY DEFENSE",56,[0,5,7,0],[5,9,7,0],[12,16,12,19,16,21,19,24],[19,16,14,19,21,24,21,19],1],["LAST BALL PARTY",60,[0,7,9,5],[5,7,0,0],[16,19,24,28,24,21,19,16],[12,19,24,21,19,24,26,24],3],["RED ALERT",50,[0,8,10,7],[0,5,8,7],[12,19,24,22,19,15,19,24],[24,27,24,19,22,19,15,12],0],["MEGA SIEGE",52,[0,5,8,7],[8,10,0,7],[19,24,19,27,24,22,19,15],[12,15,19,24,22,24,27,24],1],["TOXIC RUSH",48,[0,10,8,5],[0,8,5,7],[12,12,19,15,22,19,24,22],[24,22,19,15,19,24,27,24],2],["IRON HORDE",53,[0,5,8,10],[8,5,7,0],[12,19,24,19,27,24,22,19],[15,19,22,24,27,24,19,15],3],["BREAK THE WALL",51,[0,8,5,7],[0,10,8,7],[24,19,15,19,22,24,19,24],[27,24,22,19,15,19,24,27],0],["PANIC PARADE",49,[0,5,10,8],[5,8,7,0],[19,22,24,22,19,24,27,24],[12,19,15,19,24,27,24,22],1],["FINAL OVERDRIVE",54,[0,8,10,7],[5,8,7,0],[12,19,22,24,27,31,27,24],[24,27,31,29,27,24,22,19],3]].map(([name,root,chords,answer,mel,hook,groove],index)=>({name,root,chords,answer,mel,hook,groove,boss:index>=15,bars:32}));
const MUSIC_NORMAL=[...THEMES.slice(0,3),...MUSIC_NEW.filter(t=>!t.boss)];
const MUSIC_BOSS=[THEMES[3],...MUSIC_NEW.filter(t=>t.boss)];
const MUSIC_RHYTHMS=[[0,2,4,6,7,10,12,14],[0,3,4,7,8,10,13,14],[0,2,5,6,8,11,12,15],[0,2,4,7,8,9,12,14]];
const MUSIC_ARPS=[[0,7,12,16,19,16,12,7],[0,12,7,16,12,19,7,16],[0,7,16,12,19,12,16,7],[0,12,16,19,12,7,16,19]];
let musicTrack=null,musicBoss=null,musicTempo=146;
const musicDecks=[[],[]],musicLast=[null,null];
function pickMusic(boss){
 const k=boss?1:0,deck=musicDecks[k],pool=boss?MUSIC_BOSS:MUSIC_NORMAL;
 if(!deck.length){
  deck.push(...pool);
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
  if(musicLast[k]===deck[0]&&deck.length>1)[deck[0],deck[1]]=[deck[1],deck[0]];
 }
 const track=deck.shift();musicLast[k]=track;return track;
}
function beginMusic(boss,when){
 musicTrack=pickMusic(boss);musicBoss=boss;musicTheme=musicTrack.name;beat=0;nextBeat=when;
 musicTempo=boss?172:146+((Math.max(1,wave)-1)%3)*4;
 $('track').textContent='♫ '+musicTheme;
}
function music(){
 if(!audioRunning())return;
 musicBus.gain.value=mode==='playing'&&sound&&musicEnabled?.6:0;
 if(mode!=='playing'||!sound||!musicEnabled)return;
 const boss=foes.some(z=>z.boss);
 // Keep the song through wave changes; change category only when a boss arrives/leaves.
 if(!musicTrack||musicBoss!==boss||!musicTheme)beginMusic(boss,audio.currentTime);
 if(nextBeat<audio.currentTime-.2)nextBeat=audio.currentTime;
 let guard=0;
 while(nextBeat<audio.currentTime+.09&&guard++<4){
  if(beat>=(musicTrack.bars||16)*16)beginMusic(boss,nextBeat);
  const theme=musicTrack,step=60/musicTempo/4,i=beat%64,bar=Math.floor(i/16),sub=i%16;
  const phrase=Math.floor(beat/64)%4,section=Math.floor(beat/128)%4,modern=!!theme.hook;
  const progression=modern&&(section===1||section===2)?theme.answer:theme.chords;
  const chord=progression[bar],root=theme.root+chord,delay=Math.max(0,nextBeat-audio.currentTime);
  // A minor vi chord in bright songs; boss themes use minor i/iv/v and major bVI/bVII.
  const minor=modern?(boss?chord!==8&&chord!==10:chord===9):boss;
  const color=n=>minor?(n%12===4?n-1:n%12===9?n-1:n%12===11?n-1:n):n;
  const rhythm=modern?MUSIC_RHYTHMS[theme.groove]:MUSIC_RHYTHMS[0];
  const note=rhythm.indexOf(sub);
  if(note!==-1&&(!modern||section!==2||note%2===0||bar===3)){
   let melody;
   if(modern){
    const motif=section===1||section===3?theme.hook:theme.mel;
    const offset=section===3&&bar===3?12:0;
    melody=root+color(motif[(note+(bar%2)*2)%8])+offset;
   }else melody=root+theme.mel[(Math.floor(i/2)+(phrase%2)*4)%16]+(phrase===3&&sub>=12?12:0);
   tone(hz(melody),step*(modern&&section===2?2.6:1.45),'square',.046,delay,true);
   if(modern?(section===3&&note%2===0):bar===3||phrase===2)tone(hz(melody-12),step*1.6,'triangle',.065,delay,true);
  }
  const arp=modern?MUSIC_ARPS[theme.groove]:boss?[0,7,12,15,19,15,12,7]:MUSIC_ARPS[0];
  if(!modern||section!==2||sub%2===0)tone(hz(root+12+(modern?color(arp[sub%8]):arp[sub%8])),step*.72,'square',.024,delay,true);
  if(sub%2===0)tone(hz(root-12+([0,0,7,12][Math.floor(sub/4)])),step*1.7,'triangle',.23,delay,true);
  if(sub===0||sub===6||sub===8||boss&&sub===10)tone(130,.13,'sine',.31,delay,true,32);
  if(sub===4||sub===12){noise(.065,.105,delay,true);tone(200,.055,'triangle',.1,delay,true,85)}
  else noise(sub===14?.06:.018,sub%2===0?.028:.014,delay,true);
  if(bar===3&&sub>=13&&(!modern||section!==2)){noise(.035,.06,delay,true);tone(hz(root+12+(sub-13)*3),.055,'triangle',.055,delay,true)}
  if(sub===0&&bar%2===0){[0,minor?3:4,7,12].forEach(n=>tone(hz(root+n),step*7,'triangle',.036,delay,true))}
  beat++;nextBeat+=step;
 }
}
// V60 cube FX: short explosive square fragments. No circular markers, wedges or spikes.
function effect(x,y,color,size=45,text='',standardHit=false,shakeCamera=true){
 if(!fxEnabled)return;
 fx.push({x,y,color,size,text,t:0,life:text?.85:.26,visualLife:size>=100?.31:.21,seed:Math.random()*6.28,standardHit});
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
  const core=(t<.08?20:t<.15?14:7)*(1-Math.max(0,t-.15))*Math.min(1,particleScale);
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
// Mini Horde halves both enemy dimensions (one-quarter of visible area)
// and doubles the grid resolution without scaling hero, ball or citizens.
const MINI_HORDE_SCALE=.5,MINI_HORDE_COLUMNS=18;
const isFortress=()=>runMode==='fortress';
const fortress=window.ZZFortress;
const hasEndlessStructures=()=>runMode==='endless'&&wave>=51;
const isMiniHorde=()=>runMode==='mini'||isFortress();
// Scale raw zombie displacement to its body size in MINI/BARRICADE modes.
// Spawn-row and column pitches are already half-size; never scale those twice.
const enemyDisplacementScale=()=>isMiniHorde()?MINI_HORDE_SCALE:1;
const miniBallScale=()=>isMiniHorde()?.60:1;
const heroBallRadius=()=> (has('power')?12:8)*(typeof miniBallScale==='function'?miniBallScale():1);
const foeColumns=()=>isMiniHorde()?MINI_HORDE_COLUMNS:ENEMY_COLUMNS;
const foeStartX=()=>isFortress()?zombieMinX():ENEMY_LEFT_X;
const foePitch=()=>isFortress()
 ?(fortress.bounds().enemyRight-foeW()-foeStartX())/(MINI_HORDE_COLUMNS-1)
 :isMiniHorde()?(ENEMY_PITCH*(ENEMY_COLUMNS-1)+33-33*MINI_HORDE_SCALE)/(MINI_HORDE_COLUMNS-1):ENEMY_PITCH;
const foeRowPitch=()=>isMiniHorde()?ENEMY_ROW_PITCH*MINI_HORDE_SCALE:ENEMY_ROW_PITCH;
const foeW=()=>isMiniHorde()?33*MINI_HORDE_SCALE:33;
const foeH=()=>isMiniHorde()?44*MINI_HORDE_SCALE:44;
// Reserve only cells physically overlapped by the HALF-SIZE boss, not
// the old 5x4 vacancy. Place mobs in all remaining 18-column cells.
function miniBossOverlapsSlot(row,col,bossForm){
 const bw=(bossForm===3?112:66)*MINI_HORDE_SCALE;
 const bh=(bossForm===3?124:88)*MINI_HORDE_SCALE;
 const bx=225-bw/2,by=74,clearance=2;
 const x=foeStartX()+col*foePitch(),y=70+row*foeRowPitch();
 return x<bx+bw+clearance&&x+foeW()>bx-clearance&&
        y<by+bh+clearance&&y+foeH()>by-clearance;
}
let lastStandCount=0,lastStandLastAt=-1e9;
try{endlessUnlocked=localStorage.getItem('zb-endless-unlocked')==='1'}catch{}
// Selection opens endless; results return to the character picker.
function endlessUI(){
 const el=$('endless');
 const mini=$('mini-horde');
 if(mini){mini.hidden=mode!=='menu';mini.onclick=mode==='menu'?()=>start('mini'):null;}
 const barricade=$('fortress-horde');
 if(barricade){barricade.hidden=mode!=='menu';barricade.onclick=mode==='menu'?()=>start('fortress'):null;}
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
 for(const z of sorted){if(Number.isFinite(z.breakoutTime)){delete z.breakoutTime;delete z.breakoutDuration;z.moveDir=0;z.col=Math.max(0,Math.min(foeColumns()-1,Math.round((z.x-foeStartX())/foePitch())));z.breakoutCooldownUntil=clock+4}const old=z.y;let y=Math.max(ENEMY_TOP_Y,z.y-standDistance);for(const above of placed)if(!(Number.isInteger(z.row)&&z.row===above.row)&&z.x-8<above.x+above.w+8&&z.x+z.w+8>above.x-8)y=Math.max(y,above.y+above.h+(z.boss?25:10));z.y=Math.max(ENEMY_TOP_Y,Math.min(old,y));z.knockTime=0;placed.push(z)}
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
let frameUpdating=false,hudDirty=false;
function hud(){
 if(typeof frameUpdating!=='undefined'&&frameUpdating){hudDirty=true;return}
 document.documentElement?.classList?.toggle?.('zz-endless-hud',runMode==='endless');
 $('survival-metric').hidden=runMode!=='endless';
 {const el=$('survival-time'),value=survivalClock(endlessSurvival);if(el.textContent!==value)el.textContent=value;}
 {const el=$('wave-label'),value=runMode==='endless'?'WAVE':isFortress()?'BARRICADE':isMiniHorde()?'MINI HORDE':'현재 스테이지';if(el.textContent!==value)el.textContent=value;}
 {const el=$('score'),value=String(score);if(el.textContent!==value)el.textContent=value;}
  // Long scores scale gently within their fixed HUD column, never ellipsize.
  $('score').style?.setProperty?.('--zz-score-shrink',String(Math.min(1,6/Math.max(6,score.toString().length))));
 {const el=$('wave-number'),value=runMode==='endless'?String(wave-50):String(wave).padStart(2,'0');if(el.textContent!==value)el.textContent=value;}
 {const el=$('progress'),value=runMode==='endless'?'':(wave-1)+'/50 스테이지 클리어';if(el.textContent!==value)el.textContent=value;}
 // Only one prominent 3D voxel heart in the upper-left; a high-contrast
 // number tells the player exactly how many lives remain.
 const heart=$('hud-hearts');
 {const el=$('hud-heart-count'),value='×'+Math.max(0,lives);if(el.textContent!==value)el.textContent=value;}
 heart.setAttribute('aria-label','남은 생명 '+Math.max(0,lives)+'개');
 heart.style.opacity=lives>0?'1':'.42';
 // Keep the historical node for script/test compatibility, but it is hidden
 // so lives never render twice in the footer.
 {const el=$('lives'),value='';if(el.textContent!==value)el.textContent=value;}
 // The on-board service hint and ball text are both removed: the touch input
 // still launches the held ball and the top heart HUD still shows lives.
 {const el=$('status'),value='';if(el.textContent!==value)el.textContent=value;}
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
function rollEliteKinds(stage,count){
 const eligible=ELITE_FIRST_STAGES.map((unlock,i)=>({i,unlock})).filter(e=>stage>=e.unlock);
 if(!eligible.length||!count)return [];
 const newest=eligible.find(e=>e.unlock===stage),picks=newest?[newest.i]:[];
 while(picks.length<count){
   let dice=Math.random()*eligible.reduce((n,e)=>n+(e.i===0?4:e.i===1?3:2),0);
   let pick=eligible[0].i;
   for(const e of eligible)if((dice-=e.i===0?4:e.i===1?3:2)<0){pick=e.i;break}
   picks.push(pick);
 }
 return picks;
}
function insertEliteZombies(regulars,stage,planned){
 const atlas=window.ZZEliteSprites;
 if(!atlas)return;
 const available=regulars.filter(z=>!z.boss&&z.form===0);
 const count=Math.min((stage<5?1:stage<9?2:stage<18?3:4)*(typeof isMiniHorde==='function'&&isMiniHorde()?3:1),Math.floor(regulars.length*.15),available.length);
 const picks=(planned||rollEliteKinds(stage,count)).slice(0,count);
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
 if((runMode==='campaign'||isMiniHorde())&&stage<=2)return '그린 좀비 · 드럼통 · 포장 박스';
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
 const bonus=stage<=2&&(form===1||form===4)?0:([0,2,3,3,2,2,4,2][form??0]??0);
 return base+tier+bonus;
}
// Distinct original enemy silhouettes remain visible in every endless wave.
// Only one explosive barrel is included in each large formation.
const ENDLESS_CAST=[7,3,6,4,5,2,1,7,3,6,4,5,2,7,3,6,4,5,2,7,3];
// Opening comics 01–02 introduce red drums and cardboard boxes.
// Mini and Barricade Horde have double rows and columns: preserve the
// campaign opening density with four times the same special roster.
function campaignOpeningComicForms(stage,slots,multiplier=1){
 const forms=stage===1?[1,4]:stage===2?[1,4,1,4]:[];
 return forms.flatMap(form=>Array(multiplier).fill(form)).slice(0,Math.floor(slots*.42));
}
function setStageForms(regulars,stage){
 const forms=runMode==='endless'
  ?ENDLESS_CAST.slice(0,Math.floor(regulars.length*.62))
  :((runMode==='campaign'||isMiniHorde())&&stage<=2
    ?campaignOpeningComicForms(stage,regulars.length,isMiniHorde()?4:1)
    :isMiniHorde()
     ?stageRoster(stage,regulars.length).flatMap(form=>Array(form===1?2:4).fill(form))
     :stageRoster(stage,regulars.length));
 // Shuffle slots, not the counts: no stage ever fills randomly with rare types.
 const available=regulars.slice();
 for(let i=available.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [available[i],available[j]]=[available[j],available[i]];
 }
 const deployedBarrels=[];
 const openingSpacing=isMiniHorde()&&stage<=2?.5:1;
 for(const form of forms){
  let index=available.findIndex(z=>form!==1||z.row>0&&
    deployedBarrels.every(other=>Math.hypot(z.x-other.x,z.y-other.y)>95*openingSpacing));
  if(index<0)index=available.findIndex(z=>form!==1||
    deployedBarrels.every(other=>Math.hypot(z.x-other.x,z.y-other.y)>65*openingSpacing));
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
let preparedStage=null;
function prepareStageArt(number,gameMode=runMode){
 if(preparedStage?.number===number&&preparedStage.gameMode===gameMode)return preparedStage;
 const endless=gameMode==='endless',ordinal=endless?number-50:number;
 const stage=endless?Math.min(50,6+Math.floor(Math.max(0,number-51)*.9)):number;
 const mini=gameMode==='mini'||gameMode==='fortress';
 const forms=endless?ENDLESS_CAST:stage<=2?campaignOpeningComicForms(stage,144,mini?4:1):stageRoster(stage,144);
 const boss=ordinal%3===0?Math.floor((ordinal-1)/3)%BOSS_FORMS.length:-1;
 const sprites=window.ZZObjectSprite;
 const keys=sprites?.normal?[...new Set(forms.map(form=>sprites.normal[form]))]:[];
 if(boss>=0&&boss<2&&sprites?.bosses)keys.push(sprites.bosses[boss]);
 const elites=rollEliteKinds(stage,(stage<5?1:stage<9?2:stage<18?3:4)*(mini?3:1));
 preparedStage={number,gameMode,keys,boss,elites};
 sprites?.prefetch?.(keys);
 for(const kind of new Set(elites))window.ZZEliteSprites?.request?.(kind);
 if(boss>=2)window.ZZLargeBossSprites?.requestByForm(boss);
 return preparedStage;
}
function preparedArtLoading(plan){
 if(!plan)return false;
 if(window.ZZObjectSprite?.loading?.(plan.keys))return true;
 for(const i of plan.elites){
  const e=window.ZZEliteSprites?.cache[i];
  if(e?.loading||e?.death?.loading)return true;
 }
 const boss=window.ZZLargeBossSprites?.cache?.[plan.boss-2];
 return !!(boss&&(boss.loading||boss.rightLoading||boss.death?.loading));
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
 if(typeof resetSlowEchoHistory==='function')resetSlowEchoHistory();
 clearWormParade();wormNextAt=clock+4+Math.random()*2.5;
 standRetreat.length=0;standDangerTime=0;resistFlash=0;
 if(window.ZZProgression){lastStandCount=0;lastStandUsed=false;lastStandLastAt=-1e9;}
 bossTrashShots.length=0;
 eliteTrashSharedReadyAt=clock+4.4;spitSharedNextAt=clock+4.8;
 poison=0;poisonGrace=0;groggyTime=0;poisonFlash=0;poisonGaugeAlpha=0;
 dodgeGhosts.length=0;
 foes=[];stageDelay=0;fireDropsThisWave=0;stageLootCount=0;stageLootKinds=[];
 supportDropsThisWave=0;endlessEmergencyUsed=false;supportDangerTime=0;
 const stage=combatStage();
 const plan=prepareStageArt(wave);
 // A full four-row, mixed-cast opening; HP and movement scale independently.
 const baseRows=runMode==='endless'
  ?4
  :wave===1?2:Math.min(4,Math.max(2,Math.min(
   Math.floor((DEFENSE_Y-142)/ENEMY_ROW_PITCH)+1,
   Math.max(3,Math.round(Math.min(5,3+Math.floor(wave/2))*7/ENEMY_COLUMNS))
  )));
 const rows=baseRows*(isMiniHorde()?2:1);
 const bossStage=isBossWave();
 const requestedBossForm=bossIndex()%BOSS_FORMS.length;
 // Boss identity must never change because of asynchronous PNG decoding.
 const bossForm=bossStage?requestedBossForm:0;
 for(let r=0;r<rows;r++)for(let col=0;col<foeColumns();col++){
  if(bossStage&&(isMiniHorde()
     ?miniBossOverlapsSlot(r,col,bossForm)
     :r<(bossForm===3?3:2)&&Math.abs(col-4)<=1))continue;
  const maxKind=Math.min(4,1+Math.floor(stage/2));
  const kind=Math.floor(Math.pow(Math.random(),Math.max(.45,1.7-stage*.12))*(maxKind+1));
  const hp=zombieHP(0,kind,stage);
  const hairRoll=Math.random(),faceRoll=Math.random();
  foes.push({x:foeStartX()+col*foePitch(),y:70+r*foeRowPitch(),
   row:r,col,w:foeW(),h:foeH(),miniScale:isMiniHorde()?MINI_HORDE_SCALE:1,
   miniBaseW:33,miniBaseH:44,hp,max:hp,kind,form:0,flash:0,
   hairColor:hairRoll<.10?'blond':hairRoll<.20?'red':hairRoll<.45?'chestnut':null,
   // v292: Each face remains independent of the zombie's palette and hair.
   // Heart eyes and paired features are uncommon; no gameplay/stat changes.
   expression:faceRoll<.16?'half-lid':
     faceRoll<.29?'raised-brow':
     faceRoll<.38?'uneven-eyes':
     faceRoll<.55?'extra-teeth':
     faceRoll<.63?'slack-jaw':
     faceRoll<.73?'heart-eyes':
     faceRoll<.78?'heart-teeth':
     faceRoll<.81?'uneven-jaw':null,seed:Math.random()*20,burn:0,burnTick:0,spreadTick:0});
 }
 setStageForms(foes,stage);
 insertEliteZombies(foes,stage,plan.elites);
 if(bossStage){
  // Tighter boss/elite HP spread: a threat, not the only target left for minutes.
  const baseHP=Math.round(26+Math.min(stage,12)*1.45+Math.max(0,stage-12)*.48);
  // Easily struck, but a proper durable trash-bag boss with no dodge.
  const hp=bossForm===3?Math.round(baseHP*3.6):baseHP;
  // Identity is stable; a pending new-boss bitmap is never substituted.
  const bossWidth=bossForm===3?112:66,bossHeight=bossForm===3?124:88;
  const scale=isMiniHorde()?MINI_HORDE_SCALE:1;
  foes.push({x:isMiniHorde()?225-bossWidth*scale/2:(bossForm===3?169:192),
   y:74,row:-1,col:isMiniHorde()?9:4,
   w:bossWidth*scale,h:bossHeight*scale,miniScale:scale,
   miniBaseW:bossWidth,miniBaseH:bossHeight,hp,max:hp,kind:4,
   form:3,bossForm,boss:true,flash:0,seed:0,burn:0,burnTick:0,spreadTick:0});
  if(!isFortress()){sfx('boss');feedback('bossSpawn');}
 }
 const sprites=window.ZZObjectSprite;
 if(sprites?.retain){
  const used=foes.filter(z=>z.boss?z.bossForm<2:z.form>0&&!Number.isInteger(z.eliteKind));
  sprites.retain(used.map(sprites.keyFor));
 }
 window.ZZEliteSprites?.retain?.(foes.filter(z=>Number.isInteger(z.eliteKind)).map(z=>z.eliteKind));
 window.ZZLargeBossSprites?.retain?.(plan.boss);
 $('encounter').textContent=(runMode==='endless'?'ENDLESS '+endlessWaveNumber():isFortress()?'BARRICADE '+wave:isMiniHorde()?'MINI HORDE '+wave:'STAGE '+wave)
  +' · '+(bossStage?'BOSS WAVE':stageRosterLabel(stage))
  +' / 진군 속도 '+(marchBase()*enemyDisplacementScale()).toFixed(1);
 waveInitialRegulars=foes.filter(z=>!z.boss).length;
 breakoutNextCheck=clock+.85;
}
function marchBase(){const stage=Math.min(50,combatStage()),n=Math.min(9,Math.max(0,stage-1)),late=Math.max(0,stage-10);return 2.7+.22*n+.006*n*n+.07*late+.0008*late*late+(runMode==='endless'?Math.min(4,Math.max(0,endlessWaveNumber()-1)*.035):0)}
function enemySpeed(z){
 const seed=Number.isFinite(z.seed)?z.seed:0;
 const pace=Number.isFinite(z.seed)?.80+.43*((seed*.61803398875)%1):1;
 const pulse=Number.isFinite(z.seed)?1+.14*Math.sin(clock*.8+seed*1.73):1;
 return marchBase()*enemyDisplacementScale()*(z.boss?(z.bossForm===3?.44:.62):[1.1,1.04,.97,.89,.82][z.kind])*
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
   if(z.moleHop)continue;
   if(z.wormParade||Number.isInteger(z.eliteKind)||chosen.some(c=>c.z===z||c.z.row===z.row)||Number.isFinite(z.breakoutTime)||
      !Number.isInteger(z.col)||!Number.isInteger(z.row)||
      z.row===0||z.y+z.h>=DEFENSE_Y-125||
      (z.breakoutCooldownUntil||0)>clock||
      (z.hitHold||0)>0||(z.recoil||0)>.015)continue;
   for(const dir of [-1,1]){
    for(const distance of [1,2]){
     if(distance===2&&Math.random()<.32)continue;
     const destCol=z.col+distance*dir;
     if(destCol<0||destCol>=foeColumns())continue;
     // The path must stay clear, not merely its destination.
     let free=true;
     for(let step=1;step<=distance;step++)
      if(occupied.has(z.row+':'+(z.col+dir*step)))free=false;
     if(!free)continue;
     const dest=foeStartX()+foePitch()*destCol;
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
  z.breakoutVY=(22+Math.random()*42)*enemyDisplacementScale()/duration;
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
     z.shortStepHomeX=foeStartX()+z.col*foePitch();
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
     if(!Number.isFinite(home)||Math.abs(z.x-home)>(SHORT_STEP_RADIUS+4)*enemyDisplacementScale()){
       home=z.x;z.shortStepHomeX=home;
     }
     const magnitude=(4+shortStepNoise(z,3)*2)*enemyDisplacementScale();
     const sign=shortStepNoise(z,4)<.5?-1:1;
     let dest=clamp(home+sign*magnitude,zombieMinX(),zombieMaxX(z));
     if(Math.abs(dest-z.x)<3*enemyDisplacementScale())
       dest=clamp(home-sign*magnitude,zombieMinX(),zombieMaxX(z));
     if(Math.abs(dest-z.x)<2*enemyDisplacementScale()||!canKnockback(z,dest,z.y)){
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
 if(!insideZombieRoad(z,{x,y})||
   (isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))&&fortress&&!fortress.isPathClear(z,z.x,z.y,x,y))return false;
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
 const size=enemyDisplacementScale();
 const depthChoice=[BOSS_DEPTH_SWAY*size,-BOSS_DEPTH_SWAY*size,0][(z.bossSweepCount||0)%3];
 const options=[];
 for(const direction of [-1,1]){
  for(const span of [BOSS_SWEEP_MAX,160,125,90].map(d=>d*size)){
   const x=clamp(z.x+direction*span,zombieMinX(),zombieMaxX(z));
   const travel=Math.abs(x-z.x);
   if(travel<BOSS_SWEEP_MIN*size)continue;
   for(const offsetY of [-BOSS_DEPTH_SWAY*size,0,BOSS_DEPTH_SWAY*size]){
    const y=clamp(z.bossHomeY+offsetY,ENEMY_TOP_Y,DEFENSE_Y-z.h-38);
    if(!bossPatrolCorridor(z,x,y))continue;
    options.push({x,y,direction,
     score:travel+(direction===-z.bossLastDir?28*size:0)+(offsetY===depthChoice?19*size:0)+Math.random()*10*size-Math.abs(offsetY)*.25});
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
 const speed=BOSS_SWEEP_SPEED*enemyDisplacementScale()*(z.bossForm===3?.45:1)*enemySlowRate();
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
  const nextY=Math.max(z.y,z.bossHomeY-BOSS_DEPTH_SWAY*enemyDisplacementScale());
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
 const col=Math.round((z.x-foeStartX())/foePitch());
 if(Math.abs(z.x-(foeStartX()+col*foePitch()))<(isMiniHorde()?4:8))
  z.col=clamp(col,0,foeColumns()-1);
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
  for(const offset of [foePitch(),foePitch()*2,foePitch()*.65]){
   for(const sign of [direction,-direction])
    if(beginEliteMotion(z,sign*offset,(16+(z.seed||0)%9)*enemyDisplacementScale(),
      .29+offset/foePitch()*.07,'dash',.14)){
     began=true;break;
    }
   if(began)break;
  }
 }else if(z.eliteKind===1){
  // White 50L regulation bag: heavy backstep / feint / linear counter-charge.
  // It retreats only if there is physical room behind its box.
  began=beginEliteMotion(z,0,-20*enemyDisplacementScale(),.29,'backstep',.22,
    {dx:0,dy:31*enemyDisplacementScale(),duration:.37,tag:'charge',windup:.16});
  if(!began){
   // Heavy shoulder shove sideways when rear lanes are sealed.
   for(const sign of [direction,-direction])
    if(beginEliteMotion(z,sign*foePitch(),3*enemyDisplacementScale(),.49,'charge',.22)){
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
    if(beginEliteMotion(z,sign*foePitch(),-10*enemyDisplacementScale(),.22,'dodge',.065,
      {dx:-sign*foePitch()*.42,dy:5*enemyDisplacementScale(),duration:.20,tag:'zigzag',windup:0})){
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
  g.globalAlpha=.32*.8*fade*fade;
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
 const radius=((has('power')?12:8)*(typeof miniBallScale==='function'?miniBallScale():1));
 for(const z of foes){
  const profile=dodgeProfile(z);
  if(!profile||z.wormParade||z.hitHold>0||(z.recoil||0)>.02||
     (z.knockTime||0)>0||z.moleHop||Number.isFinite(z.breakoutTime)||
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
     const dx=sign*profile.distance*enemyDisplacementScale()*extent;
     // The new position must actually escape this incoming ball's sweep.
     if(Math.abs(threat.x-(center+dx))<z.w*.5+radius+4)continue;
     if(beginEliteMotion(z,dx,-4*enemyDisplacementScale(),profile.duration,'evade',0)){
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
// V337 — Occasional 7 / 10 / 20-zombie worm parades in both horde modes.
// These are REAL colliders, not an overlay. All movement is swept and bounded.
// The choreography only retreats UPWARD, never breaches the defense line.
const WORM_GROUP_SIZES=[7,10,20],WORM_SAFE_MARGIN=90;
// Require a real open pocket in front of a potential snake line. The front
// edge is measured using real colliders, not the old logical row number.
const WORM_FORWARD_GAP=42,WORM_FORWARD_MAX=28;
let wormParade=null,wormNextAt=0;
function clearWormParade(){
 if(wormParade)for(const m of wormParade.members){
  if(m.z.wormParade===wormParade)delete m.z.wormParade;
  m.z.shortStepHomeX=m.z.x;
 }
 wormParade=null;
}
function wormEligible(z){
 return z&&!z.boss&&!z.moleHop&&!Number.isInteger(z.eliteKind)&&z.hp>0&&
  Number.isInteger(z.row)&&z.row>=0&&Number.isInteger(z.col)&&
  z.col>=0&&z.col<foeColumns()&&
  z.y>=ENEMY_TOP_Y+8&&z.y+z.h<DEFENSE_Y-WORM_SAFE_MARGIN-22&&
  Math.abs(z.x-(foeStartX()+z.col*foePitch()))<6&&
  !Number.isFinite(z.breakoutTime)&&!z.eliteMotion&&
  (z.knockTime||0)<=0&&(z.hitHold||0)<=0&&(z.recoil||0)<=.02&&
  (z.trashStopUntil||0)<=clock&&(z.arrivalTime||0)<=0;
}
function wormForwardClearance(group){
 const set=new Set(group);
 const bottom=Math.max(...group.map(z=>z.y+z.h));
 const left=Math.min(...group.map(z=>z.x))-3;
 const right=Math.max(...group.map(z=>z.x+z.w))+3;
 let room=DEFENSE_Y-WORM_SAFE_MARGIN-bottom;
 for(const other of foes){
  if(set.has(other)||other.hp<=0||other.y+other.h<=bottom+1)continue;
  if(other.x>=right||other.x+other.w<=left)continue;
  room=Math.min(room,other.y-bottom);
 }
 // Barricade blocks count as occupied space: do not schedule a front surge
 // with a wall directly underneath the chosen leading zombies.
 if(typeof isFortress==='function'&&isFortress()&&fortress){
  const travel=Math.min(24,Math.max(0,room-10));
  if(group.some(z=>z.y+z.h>=bottom-3&&
     !fortress.isPathClear(z,z.x,z.y,z.x,z.y+travel)))return 0;
 }
 return Math.max(0,room);
}
function startWormParade(){
 if(!isMiniHorde()||mode!=='playing'||balls[0]?.held||
    wormParade||clock<wormNextAt)return false;
 wormNextAt=clock+3.5;
 if(foes.length<7)return false;
 const rows=new Map();
 for(const z of foes)if(wormEligible(z)){
  let cols=rows.get(z.row);
  if(!cols){cols=new Map();rows.set(z.row,cols)}
  cols.set(z.col,z);
 }
 const rand=Math.random(),preferred=rand<.38?7:rand<.79?10:20;
 const sizes=[preferred,...WORM_GROUP_SIZES.filter(n=>n!==preferred)];
 let chosen=null,chosenGap=0;
 // Score the real front edge: lower surviving rows with an empty pocket in
 // front are selected before high, still-packed rows. The size preference
 // (7 / 10 / 20) is retained when that size has a safe front-facing line.
 const consider=(line,options)=>{
  if(!line.every(Boolean))return;
  const gap=wormForwardClearance(line);
  if(gap<WORM_FORWARD_GAP)return;
  const front=Math.max(...line.map(z=>z.y+z.h));
  options.push({line,gap,score:front*2+Math.min(gap,115)*.35});
 };
 for(const size of sizes){
  const options=[];
  for(const [row,cols] of rows){
   if(size===20){
    // Ten upper zombies travel left-to-right; the next ten run in
    // reverse order across the adjacent row, making a continuous S.
    const next=rows.get(row+1);
    if(!next)continue;
    for(let c=0;c<=foeColumns()-10;c++){
     const top=[],bottom=[];
     for(let k=0;k<10;k++){
      top.push(cols.get(c+k));bottom.push(next.get(c+k));
     }
     consider([...top,...bottom.reverse()],options);
    }
   }else for(let c=0;c<=foeColumns()-size;c++){
    const line=[];
    for(let k=0;k<size;k++)line.push(cols.get(c+k));
    consider(line,options);
   }
  }
  if(options.length){
   // Prefer the nearest-to-player OPEN front. Vary only among the best
   // adjacent groups so it is still an occasional organic event.
   options.sort((a,b)=>b.score-a.score);
   const pick=options[Math.floor(Math.random()*Math.min(3,options.length))];
   chosen=pick.line;chosenGap=pick.gap;
   break;
  }
 }
 if(!chosen)return false;
 const room=Math.min(...chosen.map(z=>z.y-ENEMY_TOP_Y-1));
 if(room<5)return false;
 const members=chosen.map((z,index)=>({z,index,baseX:z.x,baseY:z.y}));
 wormParade={members,elapsed:0,duration:4.8,
  // Step briefly into the cleared space, bending the former flat row into
  // a real snake; then recoil behind the original position.
  advance:Math.min(WORM_FORWARD_MAX,Math.max(0,chosenGap-12)),
  retreat:Math.min(16,room),seed:Math.random()*Math.PI*2};
 for(const m of members){
  m.z.wormParade=wormParade;
  clearShortStep(m.z,5.4);
 }
 wormNextAt=clock+10+Math.random()*4;
 return true;
}
// V339: Additional Galaga-like pattern. A living 7/10/20-zombie row
// detaches into a free lane, makes two clearly visible circular orbits,
// then returns. A shared rigid translation keeps the formation's original
// collider spacing; only outside zombies/walls are obstacles.
// No overlay, fake sprites, animation allocations or scripted breach.
const WORM_ORBIT_EXIT=.90,WORM_ORBIT_LAP=2.20,WORM_ORBIT_DURATION=6.10;
const WORM_ORBIT_DETACH=32,WORM_ORBIT_RX=32,WORM_ORBIT_RY=19;
const WORM_ORBIT_GAP=84;
function wormOrbitOffset(t,side=1){
 const ease=u=>{const v=clamp(u,0,1);return v*v*(3-2*v)};
 if(t<=WORM_ORBIT_EXIT)
  return {dx:0,dy:WORM_ORBIT_DETACH*ease(t/WORM_ORBIT_EXIT)};
 const spinFinish=WORM_ORBIT_EXIT+WORM_ORBIT_LAP*2;
 if(t<=spinFinish){
  const angle=((t-WORM_ORBIT_EXIT)/WORM_ORBIT_LAP)*Math.PI*2;
  return {dx:side*WORM_ORBIT_RX*Math.sin(angle),
    dy:WORM_ORBIT_DETACH+WORM_ORBIT_RY*(1-Math.cos(angle))};
 }
 return {dx:0,dy:WORM_ORBIT_DETACH*
   (1-ease((t-spinFinish)/(WORM_ORBIT_DURATION-spinFinish)))};
}
function wormOrbitClear(group,dx,dy,fromCurrent=false){
 const selected=new Set(group);
 for(const z of group){
  const x=(fromCurrent?z.x:z.orbitBaseX??z.x)+dx;
  const y=(fromCurrent?z.y:z.orbitBaseY??z.y)+dy;
  if(x<zombieMinX()||x>zombieMaxX(z)||y<ENEMY_TOP_Y||
     y+z.h>DEFENSE_Y-WORM_SAFE_MARGIN)return false;
  // The entire route and its projected source are checked against wall
  // tiles, including during construction-persistent BARRICADE waves.
  if(typeof isFortress==='function'&&(isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))&&fortress&&
     (!fortress.isOpen(z,x,y)||
      !fortress.isPathClear(z,z.x,z.y,x,y)))return false;
  for(const other of foes){
   if(selected.has(other)||other.hp<=0)continue;
   if(x<other.x+other.w+.6&&x+z.w+.6>other.x&&
      y<other.y+other.h+.6&&y+z.h+.6>other.y)return false;
  }
 }
 return true;
}
function startGalagaOrbit(){
 if(!isMiniHorde()||mode!=='playing'||balls[0]?.held||
    wormParade||clock<wormNextAt)return false;
 // Orbiting needs space for the excursion and the full 90px safety fence.
 // Prefer the lowest intact, non-elite row: the display is most readable
 // after shots have cleared the area below the leading survivors.
 const rows=new Map();
 for(const z of foes)if(wormEligible(z)){
  let cols=rows.get(z.row);
  if(!cols){cols=new Map();rows.set(z.row,cols)}
  cols.set(z.col,z);
 }
 const options=[];
 for(const [row,cols] of rows){
  for(const size of WORM_GROUP_SIZES){
   if(size===20){
    const next=rows.get(row+1);
    if(!next)continue;
    for(let c=0;c<=foeColumns()-10;c++){
     const upper=[],lower=[];
     for(let k=0;k<10;k++){
      upper.push(cols.get(c+k));lower.push(next.get(c+k));
     }
     if(!upper.every(Boolean)||!lower.every(Boolean))continue;
     const group=[...upper,...lower.reverse()];
     const gap=wormForwardClearance(group);
     if(gap>=WORM_ORBIT_GAP)
      options.push({group,front:Math.max(...group.map(z=>z.y+z.h)),size,gap});
    }
   }else for(let c=0;c<=foeColumns()-size;c++){
    const group=[];
    for(let k=0;k<size;k++)group.push(cols.get(c+k));
    if(!group.every(Boolean))continue;
    const gap=wormForwardClearance(group);
    if(gap>=WORM_ORBIT_GAP)
     options.push({group,front:Math.max(...group.map(z=>z.y+z.h)),size,gap});
   }
  }
 }
 if(!options.length)return false;
 // All three sizes should appear across runs. Preserve the front-most
 // priority, then favor a size on this roll rather than always selecting 20.
 const sizeRoll=Math.random();
 const preferred=sizeRoll<.40?7:sizeRoll<.80?10:20;
 options.sort((a,b)=>b.front-a.front||
  Number(b.size===preferred)-Number(a.size===preferred)||b.size-a.size);
 // The first 18 real front-line candidates are enough. Check the entire
 // loop for all live colliders and avoid expensive per-frame route searches.
 for(const option of options.slice(0,18)){
  const group=option.group;
  for(const z of group){z.orbitBaseX=z.x;z.orbitBaseY=z.y}
  const sideOrder=Math.random()<.5?[1,-1]:[-1,1];
  for(const side of sideOrder){
   let clear=true;
   // The takeoff, both rotations and the return must all fit in the
   // lower pocket. Our trajectory never moves nearer than 90px to danger.
   for(let i=0;i<=40&&clear;i++){
    const at=WORM_ORBIT_DURATION*i/40;
    const off=wormOrbitOffset(at,side);
    if(!wormOrbitClear(group,off.dx,off.dy)){clear=false;break}
   }
   if(!clear)continue;
   const members=group.map((z,index)=>({
    z,index,baseX:z.orbitBaseX,baseY:z.orbitBaseY
   }));
   wormParade={kind:'orbit',members,elapsed:0,
    duration:WORM_ORBIT_DURATION,side};
   for(const m of members){
    m.z.wormParade=wormParade;
    clearShortStep(m.z,WORM_ORBIT_DURATION+.7);
   }
   wormNextAt=clock+10+Math.random()*4;
   return true;
  }
 }
 return false;
}
function updateGalagaOrbit(dt){
 const p=wormParade,step=Math.max(0,dt*enemySlowRate());
 p.elapsed=Math.min(p.duration,p.elapsed+step);
 const t=p.elapsed,offset=wormOrbitOffset(t,p.side);
 const live=p.members.filter(m=>foes.includes(m.z)&&m.z.wormParade===p&&
   m.z.hp>0&&(m.z.knockTime||0)<=0&&(m.z.hitHold||0)<=0&&
   (m.z.recoil||0)<=.02&&!m.z.eliteMotion);
 for(const m of p.members)if(!live.includes(m)&&m.z.wormParade===p)
  delete m.z.wormParade;
 if(live.length<4){
  clearWormParade();return;
 }
 const group=live.map(m=>m.z),selected=new Set(group);
 // Validate ALL targets as one group; individual sequential collision
 // checks would prevent adjacent line members from taking the orbit.
 const moves=[],maxStep=145*step;
 for(const m of live){
  const z=m.z;
  const x=z.x+clamp(m.baseX+offset.dx-z.x,-maxStep,maxStep);
  const y=z.y+clamp(m.baseY+offset.dy-z.y,-maxStep,maxStep);
  if(x<zombieMinX()||x>zombieMaxX(z)||y<ENEMY_TOP_Y||
     y+z.h>DEFENSE_Y-WORM_SAFE_MARGIN||
     typeof isFortress==='function'&&(isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))&&fortress&&
     (!fortress.isOpen(z,x,y)||!fortress.isPathClear(z,z.x,z.y,x,y))){
   // The active orbit is cancelled rather than stranding a circling pack
   // at the line or letting any zombie cross a new wall.
   clearWormParade();return;
  }
  for(const other of foes){
   if(selected.has(other)||other.hp<=0)continue;
   if(x<other.x+other.w+.6&&x+z.w+.6>other.x&&
      y<other.y+other.h+.6&&y+z.h+.6>other.y){
    clearWormParade();return;
   }
  }
  moves.push({z,x,y});
 }
 for(const m of moves){
  const oldX=m.z.x;
  m.z.x=m.x;m.z.y=m.y;
  m.z.moveDir=Math.abs(m.x-oldX)>.02?Math.sign(m.x-oldX):0;
 }
 if(t>=p.duration){
  clearWormParade();
  for(const m of p.members)clearShortStep(m.z,.4+Math.random()*.6);
 }
}
// V340 — Loose, staggered horde choreography. Use live collider positions,
// not intact rows or original column homes. Every member has its own clock.
const HORDE_MOTIFS=['snake','orbit','figure8','zigzag','fan','ripple'];
let lastHordeMotif='';
function looseHordeEligible(z){
 return z&&!z.boss&&!z.moleHop&&!Number.isInteger(z.eliteKind)&&z.hp>0&&
  z.y>=ENEMY_TOP_Y&&z.y+z.h<DEFENSE_Y-WORM_SAFE_MARGIN-8&&
  !z.wormParade&&!Number.isFinite(z.breakoutTime)&&!z.eliteMotion&&
  (z.knockTime||0)<=0&&(z.hitHold||0)<=0&&(z.recoil||0)<=.02&&
  (z.trashStopUntil||0)<=clock&&(z.arrivalTime||0)<=0;
}
function looseHordeSafe(z,x,y){
 return x>=zombieMinX()&&x<=zombieMaxX(z)&&y>=ENEMY_TOP_Y&&
  y+z.h<=DEFENSE_Y-WORM_SAFE_MARGIN&&canKnockback(z,x,y);
}
function looseHordeRoom(z,dx,dy){
 let room=0;
 for(const d of [8,16,24,32,40,48,56]){
  if(!looseHordeSafe(z,z.x+dx*d,z.y+dy*d))break;
  room=d;
 }
 return room;
}
function startLooseHordeParade(){
 if(!isMiniHorde()||mode!=='playing'||!balls.length||balls[0]?.held||
    wormParade||clock<wormNextAt)return false;
 // Retry even in a fragmented late wave. No requirement for contiguous
 // columns, a flat row, a shared rectangular pocket, or exact home X.
 wormNextAt=clock+.85+Math.random()*.65;
 const pool=[];
 for(const z of foes){
  if(!looseHordeEligible(z))continue;
  const directions=[[0,1],[1,0],[-1,0],[0,-1]].map(([dx,dy])=>
    ({dx,dy,room:looseHordeRoom(z,dx,dy)}));
  directions.sort((a,b)=>(b.room+(b.dy===1?9:0))-(a.room+(a.dy===1?9:0)));
  const best=directions.find(d=>d.room>=16);
  if(!best)continue;
  const recent=clock-(z.lastHordeParadeAt??-100);
  pool.push({z,dir:best,score:z.y+z.h+best.room*.45+
    Math.min(22,recent*2)+(best.dy===1?12:0)});
 }
 if(pool.length<3)return false;
 pool.sort((a,b)=>b.score-a.score);
 const roll=Math.random(),wanted=roll<.40?7:roll<.80?10:20;
 const size=[wanted,10,7].find(n=>n<=pool.length)??Math.min(6,pool.length);
 const chain=[pool.shift()];
 // Follow nearby living zombies one at a time, spanning holes and rows.
 // Prefer front-line neighbors, but allow dispersed survivors to join.
 while(chain.length<size&&pool.length){
  const prev=chain[chain.length-1].z;
  let bestIndex=0,bestCost=Infinity;
  for(let i=0;i<pool.length;i++){
   const p=pool[i],z=p.z;
   const cost=Math.hypot(z.x-prev.x,(z.y-prev.y)*1.25)-
      p.score*.15;
   if(cost<bestCost){bestCost=cost;bestIndex=i}
  }
  chain.push(pool.splice(bestIndex,1)[0]);
 }
 const motifs=HORDE_MOTIFS.filter(k=>k!==lastHordeMotif);
 const kind=motifs[Math.floor(Math.random()*motifs.length)];
 lastHordeMotif=kind;
 let delay=0;
 const side=Math.random()<.5?-1:1;
 const members=chain.map((p,index)=>{
  const z=p.z,m={z,index,baseX:z.x,baseY:z.y,delay,
   dx:p.dir.dx,dy:p.dir.dy,room:p.dir.room,
   side:kind==='fan'&&index%2?-side:side,
   span:Math.min(50,Math.max(22,p.dir.room)),speed:.92+Math.random()*.16};
  delay+=.105+Math.random()*.075;
  return m;
 });
 const duration=members[members.length-1].delay+5.85;
 wormParade={kind:'loose',motif:kind,members,elapsed:0,duration};
 for(const m of members){
  m.z.wormParade=wormParade;
  m.z.lastHordeParadeAt=clock;
  clearShortStep(m.z,duration+.2);
 }
 return true;
}
// Each member traces its own phase of the motif. All paths have a smooth
// takeoff/withdrawal; local clearance, not rigid formation, limits travel.
function looseHordeOffset(m,kind,t){
 const ease=u=>{const q=clamp(u,0,1);return q*q*(3-2*q)};
 const u=clamp(t*m.speed/5.1,0,1),a=u*Math.PI*2;
 const e=ease(u/.15)*(1-ease((u-.80)/.20));
 const span=m.span,side=m.side;
 let f=0,s=0;
 switch(kind){
  case 'snake':
   f=span*(.50+.40*Math.sin(a-.5))*e;
   s=side*26*Math.sin(a*2)*e;break;
  case 'orbit':
   f=span*(.50-.50*Math.cos(a*2))*e;
   s=side*34*Math.sin(a*2)*e;break;
  case 'figure8':
   f=span*(.52+.44*Math.sin(a))*e;
   s=side*36*Math.sin(a*2)*e;break;
  case 'zigzag':
   f=span*(.55+.35*Math.sin(a*1.5))*e;
   s=side*34*(2/Math.PI)*Math.asin(Math.sin(a*3))*e;break;
  case 'fan':
   f=span*(.55+.40*Math.sin(a))*e;
   s=side*(32+Math.min(12,m.index))*Math.sin(a)*e;break;
  default:
   f=span*(.50-.50*Math.cos(a*3))*e;
   s=side*23*Math.sin(a*1.5)*e;
 }
 // On completion retreat slightly away from the defense, rather than
 // snapping back into the old rigid formation.
 const retreat=12*ease((u-.76)/.24);
 return {x:m.dx*f+m.dy*s,y:m.dy*f-m.dx*s-retreat};
}
function finishLooseHordeParade(p){
 clearWormParade();
 for(const m of p.members)if(foes.includes(m.z)&&!m.z.wormParade)
  clearShortStep(m.z,.25+Math.random()*.55);
 wormNextAt=clock+1.6+Math.random()*2.1;
}
// V341: Stabilize the displayed walk direction independently of collision
// movement. Tiny side slips and axis fallback must not swap atlas rows every
// frame. Keep the original continuous 6.4fps per-enemy walk phase.
function updateLooseHordeFacing(m,dx,dy,dt){
 if(dt<=0)return;
 const z=m.z;
 if(!Number.isFinite(m.facing)){
  m.facing=Math.sign(z.moveDir||0);m.faceAge=.24;
  m.faceCandidate=m.facing;m.faceCandidateAge=0;
  m.faceVX=0;m.faceVY=0;m.faceStill=0;
 }
 const a=1-Math.exp(-dt/.10);
 const vx=dx/dt,vy=dy/dt;
 m.faceVX+=(vx-m.faceVX)*a;m.faceVY+=(vy-m.faceVY)*a;
 m.faceAge+=dt;
 const stopped=Math.hypot(vx,vy)<3;
 m.faceStill=stopped?m.faceStill+dt:0;
 let wanted=m.facing;
 const ax=Math.abs(m.faceVX),ay=Math.abs(m.faceVY);
 // Hysteresis: need a clear lateral component to enter a side clip,
 // and a persistent predominantly vertical motion to return to front.
 if(m.faceStill>=.28)wanted=0;
 else if(ax>=11&&ax>=ay*.50)wanted=Math.sign(m.faceVX);
 else if(!stopped&&ax<6&&ay>=9)wanted=0;
 if(wanted!==m.faceCandidate){
  m.faceCandidate=wanted;m.faceCandidateAge=0;
 }else m.faceCandidateAge+=dt;
 if(wanted!==m.facing&&m.faceAge>=.24&&m.faceCandidateAge>=.12){
  m.facing=wanted;m.faceAge=0;
 }
 z.moveDir=m.facing;
}
function updateLooseHordeParade(dt){
 const p=wormParade,step=Math.max(0,Math.min(.05,dt*enemySlowRate()));
 if(!step)return;
 p.elapsed=Math.min(p.duration,p.elapsed+step);
 let alive=0;
 for(const m of p.members){
  const z=m.z;
  if(z.wormParade!==p||!foes.includes(z)||z.hp<=0||
    (z.knockTime||0)>0||(z.hitHold||0)>0||(z.recoil||0)>.02||
    Number.isFinite(z.breakoutTime)||z.eliteMotion||
    (z.trashStopUntil||0)>clock||z.y+z.h>DEFENSE_Y-WORM_SAFE_MARGIN){
   if(z.wormParade===p)delete z.wormParade;
   continue;
  }
  alive++;
  const local=p.elapsed-m.delay;
  if(local<=0){updateLooseHordeFacing(m,0,0,step);continue}
  const off=looseHordeOffset(m,p.motif,local);
  const gx=clamp(m.baseX+off.x,zombieMinX(),zombieMaxX(z));
  const gy=clamp(m.baseY+off.y,ENEMY_TOP_Y,DEFENSE_Y-z.h-WORM_SAFE_MARGIN);
  const vx=gx-z.x,vy=gy-z.y,d=Math.hypot(vx,vy);
  if(d<.015){updateLooseHordeFacing(m,0,0,step);continue}
  const factor=Math.min(1,112*step/d);
  const x=z.x+vx*factor,y=z.y+vy*factor,oldX=z.x,oldY=z.y;
  // Never cancel an entire pack because one follower meets a wall or
  // another zombie. Slide on a free axis, or wait at the safe position.
  if(looseHordeSafe(z,x,y)){z.x=x;z.y=y}
  else if(Math.abs(vy)>.015&&looseHordeSafe(z,z.x,y))z.y=y;
  else if(Math.abs(vx)>.015&&looseHordeSafe(z,x,z.y))z.x=x;
  updateLooseHordeFacing(m,z.x-oldX,z.y-oldY,step);
 }
 if(alive<2||p.elapsed>=p.duration)finishLooseHordeParade(p);
}
function updateWormParade(dt){
 if(!isMiniHorde()||mode!=='playing'){clearWormParade();return}
 if(!wormParade){startLooseHordeParade();return}
 if(wormParade.kind==='loose'){updateLooseHordeParade(dt);return}
 if(wormParade.kind==='orbit'){updateGalagaOrbit(dt);return}
 const p=wormParade,step=Math.max(0,dt*enemySlowRate());
 p.elapsed=Math.min(p.duration,p.elapsed+step);
 const t=p.elapsed;
 const fade=Math.max(0,Math.min(1,t/.42,(p.duration-t)/.52));
 const smooth=u=>{const q=clamp(u,0,1);return q*q*(3-2*q)};
 // A delayed front-to-tail surge bends the line into the space vacated by
 // defeated zombies. The whole group then withdraws and breaks formation.
 const back=smooth((t-2.55)/1.10)*p.retreat;
 let remaining=0;
 for(const m of p.members){
  const z=m.z;
  if(z.wormParade!==p||!foes.includes(z)||z.hp<=0||
     (z.knockTime||0)>0||(z.hitHold||0)>0||(z.recoil||0)>.02||
     Number.isFinite(z.breakoutTime)||z.eliteMotion){
   if(z.wormParade===p)delete z.wormParade;
   continue;
  }
  remaining++;
  const wave=(Math.sin(t*5.5-m.index*.73)*4.2+
   Math.sin(t*2.1+p.seed)*7.1)*fade;
  const delay=m.index*.034;
  const push=smooth((t-delay)/1.20)*
    (1-smooth((t-delay-2.05)/.88));
  const ripple=Math.sin(t*5.5-m.index*.73)*3.6*fade;
  const goalX=clamp(m.baseX+wave,zombieMinX(),zombieMaxX(z));
  // Downward movement is permitted ONLY inside the verified open pocket,
  // strictly above the 90px hard safety margin. The delayed forward/reverse
  // waves scatter the former straight row, and then retreat.
  const goalY=clamp(m.baseY+clamp(p.advance*push+ripple,0,p.advance)-back,
   ENEMY_TOP_Y,DEFENSE_Y-z.h-WORM_SAFE_MARGIN);
  const maxStep=76*step;
  const nx=z.x+clamp(goalX-z.x,-maxStep,maxStep);
  const ny=z.y+clamp(goalY-z.y,-maxStep,maxStep);
  // Collision checks include the fortress swept wall path. No choreography
  // position may ever overlap a zombie, cross a wall or touch the defense.
  if(ny+z.h>DEFENSE_Y-WORM_SAFE_MARGIN||
     !canKnockback(z,nx,ny))continue;
  const oldX=z.x;z.x=nx;z.y=ny;
  z.moveDir=Math.abs(nx-oldX)>.02?Math.sign(nx-oldX):0;
 }
 if(remaining<4||t>=p.duration){
  clearWormParade();
  // Finish at the retreated position. Each survivor resumes its own AI.
  for(const m of p.members){
   m.z.shortStepHomeX=m.z.x;
   clearShortStep(m.z,.35+Math.random()*.7);
  }
 }
}
// V349: conservative broad phase, preserves original foe order.
function makeFoeGrid(actors){
 const cell=48,buckets=new Map(),seen=new Set();
 const key=(x,y)=>y*4096+x;
 for(let i=0;i<actors.length;i++){
  const z=actors[i];
  for(let y=Math.floor(z.y/cell);y<=Math.floor((z.y+z.h)/cell);y++)
   for(let x=Math.floor(z.x/cell);x<=Math.floor((z.x+z.w)/cell);x++){
    const k=key(x,y);let list=buckets.get(k);if(!list)buckets.set(k,list=[]);list.push(i);
   }
 }
 return {query(x,y,w,h,min=-1){
  seen.clear();const result=[];
  for(let cy=Math.floor(y/cell);cy<=Math.floor((y+h)/cell);cy++)
   for(let cx=Math.floor(x/cell);cx<=Math.floor((x+w)/cell);cx++){
    const list=buckets.get(key(cx,cy));if(!list)continue;
    for(const i of list)if(i>min&&!seen.has(i)){seen.add(i);result.push(i)}
   }
  return result.sort((a,b)=>a-b);
 }};
}
function march(dt){
 if((isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))&&fortress)fortress.tickDevices?.(dt,foes,clock,{
  canMove:(z,x,y)=>canKnockback(z,x,y),
  molePush:pushMoleZombie,
  push:(z,x,y,kind,struck)=>{fortressContact(z,kind,x,y);if(z.boss)return pushFortressBoss(z,x,y);return applyKnockback(z,{x,y,duck:true,structure:kind,struck},2)},
  contact:fortressContact,
  damage:(z,n,kind,cx,cy)=>{
   if(kind==='saw'){
    const px=Math.max(z.x,Math.min(z.x+z.w,cx)),py=Math.max(z.y,Math.min(z.y+z.h,cy));
    queueContact(ballContactFX,px,py,0,-1,'enemy',null,z.boss?.86:.48);
    if(z.boss)z.fortressBossFlashUntil=clock+.19;
   }
   damage(z,n,false,{x:0,y:-1,push:.25});
  },
  pulse:(kind,x,y,count)=>{if(kind==='ice')sfx('item');else if(kind==='bollard'){
   // A localized pop at the hatch, not a group-wide explosion.
   queueContact(ballContactFX,x,y-8,0,-1,'enemy',null,count?.58:.32);
   if(count)sfx('wall');
  }}
 });
 if((isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))&&fortress)for(const z of foes){z.fortressPreviousX=z.x;z.fortressPreviousY=z.y}
 updateWormParade(dt);
 tryStartBreakouts();
 const sorted=[...foes].sort((a,b)=>b.y-a.y),done=[];
 for(const z of sorted){
  // Parade members already moved via the swept, safe group path.
  if(z.moleHop||z.moleHopMovedAt===clock){done.push(z);continue}
  if(z.wormParade===wormParade&&wormParade){done.push(z);continue}
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
   const gap=isMiniHorde()?2:8;
   if(z.x-gap<front.x+front.w+gap&&z.x+z.w+gap>front.x-gap)
    next=Math.min(next,front.y-z.h-(front.boss?(isMiniHorde()?12:25):(isMiniHorde()?5:10)));
  }
  z.y=Math.max(z.y,next);
  done.push(z);
 }
 // Collision-box guard for independently paced marchers, knockback chains
 // and diagonally repositioned rogues. The sprites may touch, never interpenetrate.
 for(let pass=0;pass<2;pass++){
  let corrected=0;
  const compact=isMiniHorde();
  let grid=foes.length>=32&&typeof makeFoeGrid==='function'?makeFoeGrid(foes):null;
  for(let i=0;i<foes.length;i++){
   const a=foes[i];let nearby=grid?grid.query(a.x,a.y,a.w,a.h,i):null,k=0;
   for(let j=nearby?nearby[k++]:i+1;j!==undefined&&j<foes.length;j=nearby?nearby[k++]:j+1){
   const b=foes[j];
   // 18x8 mobs make 10k pairs: reject distant rectangles before allocating
   // any temporary position objects. Base mode keeps the original code path.
   if(compact&&(a.x>=b.x+b.w||b.x>=a.x+a.w||
      a.y>=b.y+b.h||b.y>=a.y+a.h))continue;
   const pa={x:a.x,y:a.y},pb={x:b.x,y:b.y};
   if(!zombieBoxesOverlap(a,pa,b,pb,0))continue;
   const dx=a.x+a.w/2-b.x-b.w/2,dy=a.y+a.h/2-b.y-b.h/2,
     overlapX=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),
     overlapY=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
   const horizontal=overlapX<overlapY||a.row===b.row,
     push=horizontal?{x:dx>=0?1:-1,y:0}:{x:0,y:dy>=0?1:-1};
   if(applyKnockback(a,push,3)||applyKnockback(b,{x:-push.x,y:-push.y},3)){
    corrected++;
    // A chain can move other actors; refresh before continuing in original order.
    if(grid){grid=makeFoeGrid(foes);nearby=grid.query(a.x,a.y,a.w,a.h,j);k=0}
   }
   }
  }
  if(!corrected)break;
 }
 // Zombie bodies cannot pass barricade blocks. Every blocked attack chips HP.
 if((isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))&&fortress)for(const z of foes){
  fortress.resolve(z,z.fortressPreviousX,z.fortressPreviousY,dt,(x,y)=>{
   effect(x,y,'#d3bda0',18);sfx('wall');
  },clock);
 }
}
// Endless advances through a short, in-world intermission. It never opens
// a stage result dialog, but the player must serve a fresh ball for each wave.
const ENDLESS_SHIFT_SECONDS=1.8,ENDLESS_SHIFT_SPAWN_AT=.35;
let endlessShiftTime=0,endlessShiftSpawned=false,endlessBackgroundWait=0;
const WAVE_QUIPS=[
 '신입 좀비 “앞줄이 명당이라면서요?”',
 '빅좀비 “내 등 뒤에서 단체 사진 찍지 마.”',
 '흰 봉투 “50L요. 자꾸 몇 킬로냐고 묻지 마요.”',
 '검은 봉투 “다쳤는데 왜 묶어 주시는 거죠?”',
 '생수병 “나 맞고 기절했는데 다들 원샷이래.”',
 '대형 생수통 “살려 줘! 정수기가 날 알아봤어!”',
 '나무상자 “눈 마주쳤잖아요. 개봉하지 마세요.”',
 '쓰레기통 “입 벌리라더니 분리수거를 하네.”',
 '드럼통 “세 대까진 폭행인데 네 대부터 박자가 맞아.”',
 '반쯤 감긴 눈 “윙크 아니에요. 부었어요.”',
 '하트눈 좀비 “아까부터 날 노려. 우리 무슨 사이야?”',
 '금발 좀비 “탈색은 세 시간, 뚜껑 분리는 한 방.”',
 '빨간 머리 좀비 “내 뚜껑 누가 고추장 덮개로 썼냐.”',
 '좀비 미용사 “앞머리만요? 뚜껑 맡기고 가세요.”',
 '좀비 의사 “머리 여세요. 아, 벌써 열렸네요.”',
 '좀비 치과 “입만 벌리세요. 머리까지 말고요.”',
 '분실물 방송 “뇌 찾아가세요. 무슨 생각 했는지 대 보세요.”',
 '좀비 유언 “내 뚜껑… 반찬통에 쓰지 마…”',
 '좀비 보험 “사망 연도요? 가입 전이시네요.”',
 '좀비 인사팀 “평생직장 맞습니다. 죽고도 나오셨잖아요.”',
 '좀비 사장 “죽도록 일하랬지, 퇴근하랬어?”',
 '좀비 식당 “산 사람 둘이요.” 전원이 숟가락을 놨다.',
 '좀비 셀카 “하나, 둘, 뇌~ …야, 그걸 왜 꺼내.”',
 '좀비 명언 “머리를 맞대면 관통샷 한 방이다.”',
 '뒷줄 좀비 “관통이요? 앞줄 수당은 쟤가 받는데?”',
 '벽 옆 좀비 “저 공 피했어! …누가 벽 세웠냐.”',
 '좀비 심판 “라인에 닿았습니다. 제 헤어라인에.”',
 '좀비 코치 “공을 몸으로 막아!” 벤치가 텅 비었다.',
 '좀비 주장 “맨 앞은 나한테 맡겨. 난 오늘 연차야.”',
 '좀비 해설 “첫 안타입니다. 맞은 분은 안타깝고요.”',
 '에이스 “공에 사인해 줬더니 이마에 찍혔네.”',
 '루비 “포수 누구야?” 좀비들이 일제히 뒤를 봤다.',
 '리아 “삑 소리 나는 공인데 왜 네가 삑 해?”',
 '렌치 “머리에서 나사 빠진 분! …한 줄로 서세요.”',
 '스칼렛 “다이아가 가짜라고? 그럼 왜 주워서 튀어?”',
 '시민 “공 좀 주워 줘!” 좀비가 유언장을 접었다.',
 '시민 “누가 밥솥 던졌어? 아직 취사 중이야!”',
 '시민 “썩은 사과 던져!” 한 입 베어 문 놈 누구냐.',
 '시민 “냉장고 던질 땐 자석 떼! 치킨집 번호!”',
 '좀비 응원단 “머리 위로 박수!” 뚜껑 셋이 닫혔다.',
 '오리한테 밀린 좀비 “나 방금 가금류한테 졌어.”',
 '톱날 앞 좀비 “새치기하실 분? 오늘만 양보합니다.”',
 '얼어붙은 좀비 “나 녹으면… 저 오리부터 불러.”',
 '두더지 “누가 내 초인종 밟았냐.” 좀비가 날아갔다.',
 '방벽 뒤 좀비 “여기 안전해.” 방벽에 금이 갔다.',
 '불붙은 좀비 “생수병 어디 갔어!” 생수병이 뛰기 시작했다.',
 '좀비 안과 “공이 셋으로 보여요.” 의사도 피했다.',
 '좀비 점호 “머릿수는 맞는데 뚜껑이 하나 남습니다.”',
 '좀비 장례식 “고인이 지각하셔서 잠시만 기다릴게요.”',
 '마지막 좀비 “나 하나 남았는데 왜 복식으로 쳐요?”'
];
let remainingWaveQuips=[],waveQuip='';
let introFadeAt=-Infinity;
const INTRO_FADE_SECONDS=1.2;
function pickWaveQuip(){
 if(!remainingWaveQuips.length)remainingWaveQuips=WAVE_QUIPS.slice();
 let index=Math.floor(Math.random()*remainingWaveQuips.length);
 if(remainingWaveQuips[index]===waveQuip)index=(index+1)%remainingWaveQuips.length;
 waveQuip=remainingWaveQuips.splice(index,1)[0];
}
function prepareStageIntro(){
 pickWaveQuip();
 introFadeAt=Infinity;
}
function beginEndlessShift(){
 if(runMode!=='endless'||mode!=='playing')return;
 resetCitizenSpeech();
 window.ZZProgression?.grant?.('wave',wave-50,10,selectedHero);
 prepareStageIntro();
 mode='endlessShift';endlessShiftTime=0;endlessShiftSpawned=false;
 endlessBackgroundWait=0;window.ZZStageArt?.load?.(stageArtForWave(wave+1));prepareStageArt(wave+1);
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
 if(wave<50){window.ZZStageArt?.load?.(stageArtForWave(wave+1));prepareStageArt(wave+1)}
 for(const b of balls)retireBall(b,'clear');
 balls=[];junk=[];bossTrashShots.length=0;rockets=[];for(const p of citizens)p.shooting=0;
 active={};score+=500;cheerTime=3;sfx('wave');feedback('wave');
 effect(225,340,'#edfc8d',130);
 $('toast').style.opacity=0;hud();$('status').textContent='';
}
// Clear transient battle and celebration effects when the arena changes.
function clearStageVisuals(){
 if(typeof resetSlowEchoHistory==='function')resetSlowEchoHistory();
 particles=[];ballVanish=[];criticalPopups=[];itemPickupFX=[];fx=[];
 enemyDeaths=[];enemyPieces=[];barrelBlasts=[];hitFlashes=[];
 ballContactFX=[];trashContactFX.length=0;
 junk=[];bossTrashShots.length=0;rockets=[];bazookaBlasts=[];items=[];
 dodgeGhosts.length=0;standRetreat.length=0;
 clearBurst=0;cheerTime=0;swing=0;heroAttackTime=0;
 cameraKick=0;screenShake.until=0;screenShake.zoom=0;screenShake.power=0;
 poisonFlash=0;resistFlash=0;failureScene=null;
 for(const citizen of citizens)citizen.shooting=0;
}
// Approved campaign comics. Load only the current stage, never the whole set.
const CAMPAIGN_COMIC_STAGES=new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43]);
let campaignComicSession=null;
function showCampaignComic(){
 if(runMode!=='campaign'||!CAMPAIGN_COMIC_STAGES.has(wave)||mode!=='playing'||typeof document.createElement!=='function'||!document.body)return;
 const stage=wave;
 const panel=document.createElement('div'),img=document.createElement('img');
 panel.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#000;display:flex;align-items:center;justify-content:center;touch-action:manipulation;user-select:none;overflow:hidden';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Stage '+stage+' introduction');
 panel.tabIndex=0;
 img.style.cssText='display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;visibility:hidden';
 img.alt='STAGE '+String(stage).padStart(2,'0');
 panel.appendChild(img);
 const session={panel,readyAt:Infinity,timer:0,numberTimer:0};
 campaignComicSession=session;mode='stageComic';releaseInput();keys={};
 function finish(){
  if(campaignComicSession!==session)return;
  clearTimeout(session.timer);clearTimeout(session.numberTimer);
  panel.remove();campaignComicSession=null;
  if(mode==='stageComic'||mode==='stageNumber'){keys={};releaseInput();mode='playing';hud()}
 }
 function continueStage(e){
  e.preventDefault();e.stopPropagation();
  if(campaignComicSession!==session||mode!=='stageComic'||performance.now()<session.readyAt)return;
  // Reveal the newly prepared arena, not a second black title screen.
  mode='stageNumber';
  setStageBackground(true);
  cameraKick=0;screenShake.until=0;screenShake.zoom=0;screenShake.power=0;
  draw();
  panel.remove();
  session.numberTimer=setTimeout(finish,1000);
 }
 panel.addEventListener('pointerdown',e=>{e.stopPropagation()});
 panel.addEventListener('click',continueStage);
 panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'||e.code==='Space')continueStage(e)});
 img.onload=()=>{
  if(campaignComicSession!==session)return;
  clearTimeout(session.timer);
  img.style.visibility='visible';
  // Begin the three-second lock only after the image has been displayed.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(campaignComicSession===session)session.readyAt=performance.now()+3000;
  }));
 };
 img.onerror=finish;
 // A missing/broken asset must not prevent a run from starting.
 session.timer=setTimeout(finish,5000);
 document.body.appendChild(panel);
 try{panel.focus({preventScroll:true})}catch{}
 img.src='assets/stages/comics/stage-'+String(stage).padStart(2,'0')+(stage===10||stage===11?'.png':'.jpg')+(stage===12?'?v=359':'');
}

function advanceStage(){
 resetCitizenSpeech();
 if(runMode==='endless'){beginEndlessShift();return}
 if(runMode!=='endless'&&wave===50){finishCampaign();return}
 clearStageVisuals();
 wave++;setStageBackground();
 if((wave-1)%5===0)lives=Math.min(maxHeroLives(),lives+1);
 mode='playing';clearTime=0;clearSkills();rack();resetBalls();crowdTimer=3.5;
 if(isFortress()&&fortress){
  fortress.begin(foes,wave);mode='building';
 }
 toast(isFortress()?'방벽 보강 · STAGE '+wave:isBossWave()?'WARNING':'STAGE '+String(wave).padStart(2,'0')+' · '+stageRosterLabel(combatStage()));
 prepareStageIntro();
 showCampaignComic();
}
// Switch the background and entire enemy formation during the intermission.
// Original assets and the 9x4 formation are preserved, with staggered fade-in.
function refillEndlessWave(){
 if(runMode!=='endless'||mode!=='endlessShift'||endlessShiftSpawned!==true)return;
 resetCitizenSpeech();
 clearStageVisuals();
 wave++;setStageBackground();
 if((wave-1)%5===0)lives=Math.min(maxHeroLives(),lives+1);
 rack();
 if(fortress?.setupEndless)fortress.setupEndless(endlessWaveNumber(),foes,DEFENSE_Y);
 for(const z of foes)z.arrivalTime=-z.row*.09-Math.random()*.06;
 waveInitialRegulars=foes.filter(z=>!z.boss).length;
 score+=500;hud();
}
function updateEndlessShift(dt){
 // V430: updateEnemyVisuals runs before this function. Do not clear the
 // death queue or evict current sprite sheets while any death is still playing.
 if(!endlessShiftSpawned&&enemyDeaths.some(d=>!d.done))return;
 if(!endlessShiftSpawned&&endlessShiftTime+dt>=ENDLESS_SHIFT_SPAWN_AT&&
    (window.ZZStageArt?.loading?.[stageArtForWave(wave+1)]||
     nextBossArtLoading(wave+1)||preparedArtLoading(preparedStage))&&endlessBackgroundWait<6){
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
// The first serve establishes the unskilled ball's minimum cruise speed.
// Keep its direction when restoring speed; never slow down a fast rally.
const BASE_BALL_CRUISE_SPEED=Math.hypot(125,365);
function ensureBallCruiseSpeed(b){
 if(!b||b.held)return 0;
 const speed=Math.hypot(b.vx,b.vy);
 // Only true gameplay serves/splits get the cruise floor.
 // Scripted/test projectiles at low speed retain their exact velocity.
 if(!b.cruiseFloor)return speed;
 if(speed>1&&speed<b.cruiseFloor){
  const ratio=b.cruiseFloor/speed;
  b.vx*=ratio;b.vy*=ratio;
  return b.cruiseFloor;
 }
 return speed;
}
function resetBalls(){if(typeof heroStrikeVisual!=='undefined')heroStrikeVisual=null;killCombo=0;killTimer=0;comboPop=0;comboDisplayTime=0;balls=[newBall()];combo=0;hud()}
function clearSkills(){active={};items=[];rockets=[];bazookaBlasts=[];bazookaTimer=0;fireWaves.length=0;skillUI()}
let menuRunChipsAtStart=0;
let waitingForStart=false;
function start(selectedMode='campaign'){
 if(campaignComicSession||waitingForStart)return;
 const first=selectedMode==='endless'?51:1;
 preparedStage=null;
 const plan=prepareStageArt(first,selectedMode),bg=stageArtForWave(first);
 window.ZZStageArt?.load?.(bg);
 if(window.ZZObjectSprite?.loading&&(preparedArtLoading(plan)||window.ZZStageArt?.loading?.[bg])){
  waitingForStart=true;unlockAudio();
  const button=$(selectedMode==='endless'?'endless':selectedMode==='mini'?'mini-horde':selectedMode==='fortress'?'fortress-horde':'start');
  const original=button?.innerHTML;if(button)button.textContent='스테이지 준비 중…';
  const deadline=Date.now()+8000;
  function wait(){
   if(Date.now()<deadline&&(preparedArtLoading(plan)||window.ZZStageArt?.loading?.[bg])){requestAnimationFrame(wait);return}
   waitingForStart=false;if(button)button.innerHTML=original;startPrepared(selectedMode);
  }
  requestAnimationFrame(wait);return;
 }
 startPrepared(selectedMode);
}
function startPrepared(selectedMode){window.ZZGarage?.load(selectedHero,window.ZZProgression?.garage());filterReady=0;menuRunChipsAtStart=window.ZZProgression?.chips?.()??0;window.ZZProgression?.startRun?.(selectedMode);runMode=selectedMode;endlessSurvival=0;endlessRunStarted=false;endlessHudSecond=-1;endlessShiftTime=0;endlessShiftSpawned=false;lastStandUsed=false;resistFlash=0;failureScene=null;lastLostBall=null;lastSupportAt=clock-60;supportDangerTime=0;resetCitizens();window.ZZThrowablesV159?.request?.();releaseInput();$('results').hidden=true;unlockAudio();score=0;wave=runMode==='endless'?51:1;setStageBackground(true);lives=maxHeroLives();car=target=225;clearTime=0;heroAttackTime=0;junk=[];bossTrashShots.length=0;throwableBag.length=0;crowdTimer=3.5;cheerTime=0;particles=[];ballVanish=[];criticalPopups=[];itemPickupFX=[];fx=[];enemyDeaths=[];enemyPieces=[];barrelBlasts=[];hitFlashes=[];ballContactFX=[];trashContactFX.length=0;cameraKick=0;screenShake.until=0;screenShake.zoom=0;lastFireDropAt=-1e6;lastFireDropWave=0;recentLootKinds=[];clearSkills();fortress?.reset();rack();if(runMode==='endless')fortress?.setupEndless?.(endlessWaveNumber(),foes,DEFENSE_Y);resetBalls();mode='playing';if(isFortress()&&fortress){fortress.begin(foes,wave);mode='building'}$('overlay').hidden=true;$('heroes').hidden=true;nextBeat=0;beat=0;sfx('start');feedback('start');hud();endlessUI();toast(runMode==='endless'?'ENDLESS · 끝없는 생존 도전!':isFortress()?'BARRICADE HORDE · 드래그로 방벽을 건설하세요!':isMiniHorde()?'MINI HORDE · 작은 좀비들의 대군!':'STAGE 01 · 준비!');prepareStageIntro();showCampaignComic()}
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
 releaseInput();keys={};fortress?.reset();mode='menu';runMode='campaign';resumeMode='playing';
 endlessRunStarted=false;endlessSurvival=0;endlessShiftTime=0;endlessShiftSpawned=false;
 bossTrashShots.length=0;
 $('pause-main-menu').hidden=true;
 failureScene=null;lastLostBall=null;lastStandUsed=false;resistFlash=0;
 score=0;wave=1;lives=maxHeroLives();car=target=225;cameraKick=0;screenShake.until=0;screenShake.zoom=0;
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
 if(typeof finishTrailLightingWarmup==='function')finishTrailLightingWarmup();
 if(typeof runMode!=='undefined'&&runMode==='endless')endlessRunStarted=true;
 const speed=Math.hypot(125,365);
 // Hidden outward fan: central hero launches straight, edge positions aim
 // progressively outward up to 38 degrees. Use the actual launch position.
 const center=W/2,angle=Math.max(-1,Math.min(1,(car-center)/(center-72)))*(38*Math.PI/180);
 const origin=heldBallOffset();
 balls[0].x=car+origin.x;balls[0].y=PY+origin.y;
 balls[0].held=false;
 if(introFadeAt===Infinity)introFadeAt=clock;
 // Launch stretch is the opening elastic phase, not a physical wall bounce.
 balls[0].bounceDuration=.17;balls[0].bounceTime=.17;
 balls[0].bounceAxis='y';balls[0].bounceDir=-1;
 balls[0].impactKind='serve';balls[0].impactStrength=.7;
 balls[0].vx=Math.sin(angle)*speed;balls[0].vy=-Math.cos(angle)*speed;
 balls[0].cruiseFloor=speed;
 balls[0].spinDirection=balls[0].vx<0?-1:1;
 // V150: first serve is a real weapon strike. Reuse the approved 8-frame
 // hero ATTACK bitmap already played on ball return; never delay ball physics.
 swing=.22;heroAttackTime=HERO_ATTACK_DURATION;
 if(typeof triggerHeroStrike==='function')triggerHeroStrike(balls[0].x,false);
 syncMulti();sfx('serve');feedback('serve');hud();
}}
function overlay(title,message,button,label){$('overlay').setAttribute('data-title','false');$('overlay').setAttribute('data-screen',['GAME OVER','VICTORY'].includes(label)?'results':'pause');$('overlay').setAttribute('data-outcome',label);$('results').hidden=!['GAME OVER','VICTORY'].includes(label);$('heroes').hidden=!['GAME OVER','VICTORY'].includes(label);$('title').innerHTML=title;$('message').innerHTML=message;$('start').innerHTML=button+(['PAUSED','GAME OVER'].includes(label)?'':' <span>↗</span>');$('label').textContent=label;$('pause-main-menu').hidden=label!=='PAUSED';if(['GAME OVER','VICTORY'].includes(label)){const earned=Math.max(0,(window.ZZProgression?.chips?.()??menuRunChipsAtStart)-menuRunChipsAtStart);if($('result-earned-chip'))$('result-earned-chip').textContent='+'+String(earned);}$('overlay').hidden=false;
 if(['GAME OVER','VICTORY'].includes(label)){
  // The result screen shares the same live five-card selector as the title.
  // Repopulate from the latest owned roster AFTER the overlay is visible,
  // so cards have measured width and the touch carousel can paint correctly.
  renderHeroes();
  window.ZZRefreshHeroReel?.();
 }
 endlessUI()}
function pause(){releaseInput();if(mode==='playing'||mode==='clearing'||mode==='endlessShift'||mode==='building'){resumeMode=mode;mode='paused';sfx('pause');overlay('PAUSED','좀비도 잠깐 쉬는 중...<br>게임과 스킬 시간은 정지합니다.','RESUME','PAUSED')}else if(mode==='paused'){unlockAudio();mode=resumeMode;$('overlay').hidden=true;nextBeat=0}}
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
  $('result-stage-label').textContent=isFortress()?'방벽 호드 도달 스테이지':isMiniHorde()?'미니 호드 도달 스테이지':'도달 스테이지';
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
   miniScale:(typeof miniBallScale==='function'?miniBallScale():1),reason,t:0,life:reason==='lost'?.65:.5});
 if(fxEnabled)burst(b.x,clamp(b.y,24,H-24),reason==='lost'?'#ff9d9f':'#b8f9ef',6);
}
function burst(x,y,color,n=12){
 if(!fxEnabled)return;
 const count=Math.min(52,Math.max(1,Math.floor(n)));
 for(let i=0;i<count;i++){
  const angle=(i+(Math.random()-.5)*.55)*Math.PI*2/count;
  const velocity=340+Math.random()*340;
  const life=.14+Math.random()*.15;
  const p=typeof particlePool!=='undefined'?(particlePool.pop()||{}):{};
  p.x=x;p.y=y;p.vx=Math.cos(angle)*velocity;p.vy=Math.sin(angle)*velocity-30;
  p.t=p.life=life;p.color=color;p.size=4+Math.random()*4;particles.push(p);
 }
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
     extra.cruiseFloor=BASE_BALL_CRUISE_SPEED;
     balls.push(extra);
   }
   swing=.22;heroAttackTime=HERO_ATTACK_DURATION;if(typeof triggerHeroStrike==='function')triggerHeroStrike(car,false);sfx('serve');feedback('serve');
 }
 while(balls.length<n){const angles=[-1.1,...balls.map(b=>clamp(Math.atan2(b.vx,Math.abs(b.vy)),-1.1,1.1)),1.1].sort((a,b)=>a-b);let gap=0,a=0;for(let i=1;i<angles.length;i++)if(angles[i]-angles[i-1]>gap){gap=angles[i]-angles[i-1];a=(angles[i]+angles[i-1])/2}const sp=Math.max(350,Math.hypot(src.vx,src.vy));const split=newBall(src.x,src.y,Math.sin(a)*sp,-Math.cos(a)*sp,false);split.cruiseFloor=BASE_BALL_CRUISE_SPEED;balls.push(split)}if(balls.length>n){for(const b of balls.slice(n))retireBall(b);balls=balls.slice(0,n)}hud()}
function activate(k,x=car,y=PY-24){
 active[k]=SKILLS[k].duration*hero().duration*(1+growth(k)*.06);
 if(k==='dual'||k==='triple')syncMulti(true);
 if(k==='bazooka'){bazookaTimer=0;lastSupportAt=clock}
 sfx('item');feedback('item');
 if(typeof citizenReaction==='function')citizenReaction('item');
 // A brief bitmap pickup confirmation at the actual caught-item position.
 // Do not grow or restyle the already-approved tiny equipped badges.
 itemPickupFX.push({k,x,y,t:0,life:.62});
 effect(x,y,SKILLS[k].color,50);
 burst(x,y,SKILLS[k].color,10);
 // No score, life or wave changes here. Multiball already updates HUD in syncMulti.
 skillUI();
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
// V350: ordinary pickup type weights, before eligibility and variety rules.
// Order of profiles matches HEROES. Emergency bazooka stays risk-gated.
const HERO_LOOT_PROFILES=[
 {dual:14,triple:14,power:15,fire:15,slow:14,pierce:14,shield:14,support:1,pity:3},
 {dual:22,triple:30,power:8,fire:6,slow:24,pierce:5,shield:5,support:.75,pity:5},
 {dual:6,triple:5,power:37,fire:38,slow:4,pierce:7,shield:3,support:1.25,pity:2},
 {dual:25,triple:16,power:10,fire:5,slow:14,pierce:8,shield:22,support:1.5,pity:5},
 {dual:5,triple:5,power:15,fire:2,slow:4,pierce:66,shield:3,support:.5,pity:0}
];
function heroLootProfile(index=selectedHero){return HERO_LOOT_PROFILES[index]||HERO_LOOT_PROFILES[0]}
function weightedLoot(pool,profile,stageKinds=[],recentKinds=[],balanced=false,roll=Math.random()){
 if(!pool.length)return null;
 const weights=pool.map(k=>profile[k]*(balanced?1:
  (stageKinds.includes(k)?.85:1)*(recentKinds.includes(k)?.85:1)));
 let pick=roll*weights.reduce((a,b)=>a+b,0);
 for(let i=0;i<pool.length;i++){pick-=weights[i];if(pick<0)return pool[i]}
 return pool[pool.length-1];
}

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
function fireDropChance(){return heroLootProfile().fire/100}
function fireCanDrop(){
 const fastFire=selectedHero===2;
 const gap=wave>=12||fastFire?1:FIRE_DROP_STAGE_GAP,cooldown=wave>=12||fastFire?16:FIRE_DROP_COOLDOWN;
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
 const boss=!!z.boss,fireReady=fireCanDrop(),profile=heroLootProfile();
 const pityStages=selectedHero===0&&wave>=12?2:profile.pity;
 const pity=fireReady&&pityStages>0&&wave>=pityStages&&wave-lastFireDropWave>=pityStages;
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
 }else if(supportAvailable()&&Math.random()<Math.min(.42,supportChance()*profile.support)){
  k='bazooka';
 }else{
  const choices=Object.keys(SKILLS).filter(key=>key!=='fire'&&key!=='bazooka'&&
   !has(key)&&!items.some(item=>item.k===key));
  // Ace keeps strict rotation; specialists use soft repetition penalties,
  // so their signature item stays likely after it expires or is collected.
  let pool=choices;
  if(selectedHero===0){
   const neverThisStage=choices.filter(key=>!stageLootKinds.includes(key));
   const candidatePool=neverThisStage.length?neverThisStage:choices;
   const fresh=candidatePool.filter(key=>!recentLootKinds.includes(key));
   const oldest=Math.min(...candidatePool.map(key=>recentLootKinds.lastIndexOf(key)));
   pool=fresh.length?fresh:candidatePool.filter(key=>recentLootKinds.lastIndexOf(key)===oldest);
  }
  if(!pool.length)return;
  k=weightedLoot(pool,profile,stageLootKinds,recentLootKinds,selectedHero===0);
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
const DUCK_CHAIN_STEP=.22,DUCK_CHAIN_FREEZE=.12;
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
 const x=z.knockFromX+(z.x-z.knockFromX)*ease,
       y=z.knockFromY+(z.y-z.knockFromY)*ease;
 // Final knockback colliders may be safe while a visual tween crosses an
 // intervening wall. Never paint a zombie on top of the barricade bitmap.
 if(!z.moleLaunch&&typeof isFortress==='function'&&(isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))&&fortress&&
   (!fortress.isOpen(z,x,y)||
    !fortress.isPathClear(z,z.knockFromX,z.knockFromY,x,y)))return z;
 return {...z,x,y};
}
function zombieBoxesOverlap(a,pa,b,pb,gap=.5){
 return pa.x<pb.x+b.w+gap&&pa.x+a.w+gap>pb.x&&
        pa.y<pb.y+b.h+gap&&pa.y+a.h+gap>pb.y;
}
function insideZombieRoad(z,p){
 return p.x>=zombieMinX()&&p.x<=zombieMaxX(z)&&
        p.y>=ENEMY_TOP_Y&&p.y+z.h<=DEFENSE_Y-16&&
        (!(isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))||!fortress||fortress.isOpen(z,p.x,p.y));
}
function canKnockback(z,x,y){
 const pos={x,y};
 return insideZombieRoad(z,pos)&&
   (!(isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))||!fortress||fortress.isPathClear(z,z.x,z.y,x,y))&&
   !foes.some(other=>other!==z&&
    zombieBoxesOverlap(z,pos,other,{x:other.x,y:other.y},1));
}
function planKnockPush(z,dx,dy,plans,depth=0){
 // Knockback must NEVER move an enemy toward the defense line (positive Y),
 // including recursive pushes and the overlap-repair pass in march().
 if(dy>0||z.boss||depth>KNOCK_CHAIN_LIMIT||plans.has(z))return false;
 const pos={x:z.x+dx,y:z.y+dy};
 if(!insideZombieRoad(z,pos)||
   (isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))&&fortress&&!fortress.isPathClear(z,z.x,z.y,pos.x,pos.y))return false;
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
 const distance=Math.min(50,36+Math.min(n,5)*3)*enemyDisplacementScale()*(impact.push||1);
 const dirX=vx/mag,dirY=vy/mag;
 for(const factor of [1,.85,.7,.55,.4,.25,.12]){
  const plans=impact.duck?fortress.duckKnockPlan(z,dirX,dirY,foes,insideZombieRoad,impact.struck):new Map();
  if(impact.duck&&!plans.size)return false;
  // Reflect lateral impact at the painted side walls instead of embedding a
  // knocked zombie in a wall. Full chains remain collision-checked as before.
  const proposedX=z.x+dirX*distance*factor;
  const low=zombieMinX(),high=zombieMaxX(z);
  const reflectedX=proposedX<low?2*low-proposedX:
                   proposedX>high?2*high-proposedX:proposedX;
  const pushX=reflectedX-z.x;
  const pushY=dirY*distance*factor;
  if(!impact.duck&&!planKnockPush(z,pushX,pushY,plans))continue;
  let valid=true;
  for(const [a,pa] of plans)
   for(const other of foes){
    if(a===other)continue;
    const pb=plans.get(other)||{x:other.x,y:other.y};
    if(zombieBoxesOverlap(a,pa,other,pb,.5)){valid=false;break}
   }
  if(!valid){if(impact.duck)return false;continue}
  for(const [actor,pos] of plans){
   // A chained shove interrupts any existing elite route; never snap back
   // to the start of a pre-hit dash once the physics tween ends.
   if(impact.duck)delete actor.wormParade;
   if(actor.eliteMotion){
    delete actor.eliteMotion;
    actor.eliteNextMove=clock+(actor.eliteKind===2?.6:1.1);
   }
   // Repeated hits restart from the current rendered position, not a
   // previous distant collider destination.
   const duckRipple=impact.structure==='lure';
   const depth=pos.chainDepth||0;
   if(duckRipple){
    impact.struck?.add(actor);
    if(actor!==z)actor.duckContact={at:clock+depth*DUCK_CHAIN_STEP,x:dirX,y:dirY};
   }else if(impact.structure&&actor!==z&&typeof fortressContact==='function')fortressContact(actor,impact.structure,dirX,dirY);
   const before=knockVisualPosition(actor);
   const beforeX=before.x,beforeY=before.y; // snapshot values before actor mutates
   delete actor.moleLaunch;delete actor.moleHop;
   actor.x=pos.x;actor.y=pos.y;
   actor.knockFromX=beforeX;actor.knockFromY=beforeY;
   actor.knockChain=actor!==z;
   actor.knockDelay=(pos.chainDepth||0)>0
     ?HIT_FREEZE_NORMAL+((pos.chainDepth||0)-1)*CHAIN_KNOCK_STEP:0;
   if(duckRipple)actor.knockDelay=depth*DUCK_CHAIN_STEP;
   // Duck contacts stagger individually before each reserved collider tween.
   actor.knockFreeze=actor===z?Math.max(0,(actor.hitShakeUntil||0)-clock):0;
   if(duckRipple&&actor!==z)actor.knockFreeze=DUCK_CHAIN_FREEZE;
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
  return true;
 }
 return false;
}
// Non-damaging structure contacts use the same pooled impact sprite,
 // local stagger and feedback as ball hits without awarding damage or score.
// Only mole launches may propel a zombie toward the player. Reserve a
// legal landing before the hatch becomes solid and animate the short arc.
function pushMoleZombie(z,w,dir){
 const tile=fortress?.structureSize?.(w)||44;
 const top=w.y-z.h-3,bottom=w.y+tile+3;
 const before=knockVisualPosition(z),bx=before.x,by=before.y;
 for(const sy of [dir,-dir]){
  const edge=sy>0?bottom:top;
  for(const extra of [15,8,0]){
   const ny=sy>0?Math.max(z.y+8,edge+extra):Math.min(z.y-8,edge-extra);
   if(!canKnockback(z,z.x,ny))continue;
   fortressContact(z,'bollard',0,sy);
   z.knockFromX=bx;z.knockFromY=by;z.y=ny;
   z.knockChain=false;z.knockDelay=0;z.knockFreeze=.06;
   z.knockDuration=.06+KNOCK_TWEEN_LIFE;z.knockTime=z.knockDuration;
   z.moleLaunch=true;delete z.moleHop;delete z.duckContact;delete z.wormParade;
   delete z.breakoutTime;delete z.breakoutDuration;delete z.eliteMotion;
   clearShortStep(z,.7);z.shortStepHomeX=z.x;
   if(z.boss){delete z.bossGoalX;delete z.bossGoalY;z.bossHomeY=z.y;z.bossNextMove=clock+.5}
   return true;
  }
 }
 // Crowded vertical lanes: choose a checked sideways exit, or leave the
 // mole submerged rather than pinning a zombie inside a solid structure.
 for(const sx of [-1,1]){
  const nx=sx<0?w.x-z.w-3:w.x+tile+3;
  if(!canKnockback(z,nx,z.y))continue;
  fortressContact(z,'bollard',sx,0);
  z.knockFromX=bx;z.knockFromY=by;z.x=nx;
  z.knockChain=false;z.knockDelay=0;z.knockFreeze=.06;
  z.knockDuration=.06+KNOCK_TWEEN_LIFE;z.knockTime=z.knockDuration;
  z.moleLaunch=true;delete z.moleHop;delete z.duckContact;delete z.wormParade;
  delete z.breakoutTime;delete z.breakoutDuration;delete z.eliteMotion;
  clearShortStep(z,.7);z.shortStepHomeX=z.x;return true;
 }
 return false;
}
function pushFortressBoss(z,x,y){
 const length=Math.hypot(x,Math.min(0,y))||1,dx=x/length,dy=Math.min(0,y)/length;
 const before=knockVisualPosition(z),beforeX=before.x,beforeY=before.y;
 for(const distance of [12,9,6,3]){
  const nx=z.x+dx*distance,ny=z.y+dy*distance;
  if(!canKnockback(z,nx,ny))continue;
  z.x=nx;z.y=ny;z.knockFromX=beforeX;z.knockFromY=beforeY;
  z.knockChain=false;z.knockDelay=0;z.knockFreeze=Math.max(0,(z.hitShakeUntil||0)-clock);
  z.knockDuration=z.knockFreeze+KNOCK_TWEEN_LIFE;z.knockTime=z.knockDuration;
  delete z.bossGoalX;delete z.bossGoalY;z.bossHomeY=z.y;z.bossNextMove=clock+z.knockDuration+.2;
  return true;
 }
 return false;
}
function fortressContact(z,kind,x=0,y=-1,freeze=null){
 if(!foes.includes(z)||z.hp<=0)return;
 if(clock<(z.fortressContactReady||0))return;
 z.fortressContactReady=clock+.14;
 const position=knockVisualPosition(z);
 enemyReaction(z,1,{x,y},true);
 if(freeze!==null&&!z.boss){z.hitAt=clock;z.hitHold=freeze;z.hitShakeFrom=clock;z.hitShakeUntil=clock+freeze}
 z.fortressContactCel=enemyAnimationClock;
 if(z.boss)z.fortressBossFlashUntil=clock+.19;
 // Reuse the approved monochrome comic impact atlas at the real contact
 // face. Duck and ice capture never emit explosive/death-like debris.
 if(kind==='lure'||kind==='ice'||kind==='bollard'){
  const length=Math.hypot(x,y)||1,dx=x/length,dy=y/length;
  // The duck pushes away from itself; the ice claw pulls towards itself.
  const side=kind==='ice'?1:-1;
  const px=position.x+z.w/2+side*dx*z.w*.38;
  const py=position.y+z.h/2+side*dy*z.h*.32;
  const scale=Math.max(.28,Math.min(.72,Math.max(z.w,z.h)/52))*(kind==='ice'?.85:1);
  queueContact(ballContactFX,px,py,side*dx,side*dy,'enemy',null,scale);
  feedback(z.boss?'bossHit':'hit');sfx(z.boss?'bosshit':'hit');return;
 }
 const flash=typeof flashPool!=='undefined'?(flashPool.pop()||{}):{};
 Object.assign(flash,{x:position.x+z.w/2,y:position.y+z.h/2,groundY:position.y+z.h,
  t:0,life:.48,critical:false,spread:Math.max(z.w,z.h),delay:0,
  miniFxScale:isMiniHorde()?MINI_HORDE_SCALE:1,piercing:kind==='ice',angle:Math.atan2(y,x)});
 hitFlashes.push(flash);
 feedback(z.boss?'bossHit':'hit');sfx(z.boss?'bosshit':'hit');
}
function damage(z,n=1,burning=false,impact=null,criticalHit=false,piercingCritical=false){
 if(!foes.includes(z))return;
 const fullHP=z.hp>=z.max,criticalKnockout=!burning&&!!criticalHit&&fullHP&&!z.boss;
 const critical=criticalKnockout||(!burning&&piercingCritical);
 const amount=criticalKnockout?z.hp:n;
 z.hp-=amount;
 z.flash=burning?.12:.22;
 enemyReaction(z,amount,impact,!burning&&!impact?.bankSplash);
 if(impact?.bankSplash&&z.hp>0){z.bankFlashUntil=clock+.10}
 if(!burning){
  if(!impact?.bankSplash){
  const flash=typeof flashPool!=='undefined'?(flashPool.pop()||{}):{};
 Object.assign(flash,{x:z.x+z.w/2,y:z.y+z.h/2,groundY:z.y+z.h,
   t:0,life:critical?.39:.48,critical,spread:Math.max(z.w,z.h),delay:0,
   miniFxScale:isMiniHorde()?MINI_HORDE_SCALE:1,
   piercing:piercingCritical||has('pierce'),angle:Math.atan2(impact?.y??-1,impact?.x??0)});hitFlashes.push(flash);
  }
  // Scarlett's third handbag return earns a prismatic hit without floating text.
  if(impact?.sparkle)burst(z.x+z.w/2,z.y+z.h/2,'#c9dfff',12);
  if(z.hp>0&&!piercingCritical)applyKnockback(z,impact,amount);
 }
 const hitPosition=knockVisualPosition(z);
 let criticalLabel=false;
 if(critical){citizenReaction('critical');
  // V348: at most one live piercing label across all balls. Do not throttle
  // damage, death, local hit flash, citizen reactions or regular criticals.
  const textScale=piercingCritical?.75+Math.random()*.28:.90+Math.random()*.15;
  if(!piercingCritical||!criticalPopups.some(f=>f.pierce&&f.t<f.life)){
   criticalLabel=true;
   criticalPopups.push({x:hitPosition.x+z.w/2,y:hitPosition.y+z.h/2,
     t:0,life:.72,pierce:piercingCritical,textScale});
   if(criticalPopups.length>12)criticalPopups.shift();
  }
 }
 if(burning){if(z.hp<=0)feedback('fireKill')}
 else feedback(critical?'critical':z.boss?(z.hp<=0?'bossKill':'bossHit'):(z.hp<=0?'kill':amount>=2?'powerHit':'hit'),criticalLabel);
 effect(hitPosition.x+z.w/2,hitPosition.y+z.h/2,burning?'#ffac48':critical?'#fff3b2':TYPES[z.kind].color,
  z.hp<=0?(z.boss?150:55):burning?20:38,
  // Hit and kill values belong to the score calculation, not floating text.
  z.hp<=0?(z.boss?'BOSS BREAK!':critical&&!piercingCritical?'CRITICAL!':''):'',
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
const FIRE_BASE_PROFILE={directRadius:82,spreadRadius:FIRE_SPREAD_RADIUS,directTargets:FIRE_DIRECT_TARGETS,maxActive:FIRE_MAX_ACTIVE};
const fireWaves=[];
function fireProfile(level=0){
 return window.ZZProgression?.fireProfile?.(level)||FIRE_BASE_PROFILE;
}
function fireRangeScale(){return typeof isMiniHorde==='function'&&isMiniHorde()?.60:1}
function burningCount(){let n=0;for(const z of foes)if(z.burn>0)n++;return n}
function ignite(z,depth=0,level=0,visualDelay=0,knownCount=null){
 if(!foes.includes(z)||z.burn>0||(knownCount??burningCount())>=fireProfile(level).maxActive)
  return false;
 z.burn=FIRE_DURATION;z.burnTick=0;z.spreadTick=0;
 z.burnDepth=depth;z.spreadDone=false;z.burnGrowthLevel=level;
 z.burnVisualDelay=visualDelay;
 return true;
}
function fireImpactTargets(x,y,radius,primary){
 const candidates=[],r2=radius*radius;
 for(const z of foes){
  if(z.burn>0||z===primary)continue;
  const dx=z.x+z.w/2-x,dy=z.y+z.h/2-y,d=dx*dx+dy*dy;
  if(d<=r2)candidates.push({z,d});
 }
 candidates.sort((a,b)=>a.d-b.d);
 return (foes.includes(primary)&&!(primary.burn>0)?[primary]:[]).concat(candidates.map(v=>v.z));
}
function applyFireImpact(z,x,y,level){
 const profile=fireProfile(level),radius=profile.directRadius*fireRangeScale();
 let activeCount=burningCount(),count=0;
 if(activeCount>=profile.maxActive)return 0;
 for(const other of fireImpactTargets(x,y,radius,z)){
  if(ignite(other,0,level,Math.min(.14,count*.022),activeCount)){
   activeCount++;count++;
   if(count>=profile.directTargets||activeCount>=profile.maxActive)break;
  }
 }
 if(count&&fxEnabled){
  fireWaves.push({x,y,radius,t:0,life:.28,seed:clock*2.4});
 }
 return count;
}
function drawFireWaves(){
 if(!fxEnabled||!fireWaves.length)return;
 g.save();g.globalCompositeOperation='lighter';g.shadowBlur=0;
 for(const f of fireWaves){
  const u=Math.min(1,f.t/f.life),r=f.radius*(.16+.84*Math.sin(u*Math.PI/2)),fade=1-u;
  g.strokeStyle='#ff9c42';g.lineWidth=2.4*fade+.5;g.globalAlpha=.25*fade;
  g.beginPath();g.arc(f.x,f.y,r,0,Math.PI*2);g.stroke();
  for(let i=0;i<12;i++){
   const a=f.seed+i*Math.PI/6,sz=1.5+2.5*fade;
   g.fillStyle=i%3?'#ff9a3d':'#fff0a0';g.globalAlpha=.62*fade;
   g.fillRect(f.x+Math.cos(a)*r-sz/2,f.y+Math.sin(a)*r-sz/2,sz,sz);
  }
 }
 g.restore();
}
function fireTargetsNear(z,radius){
 return foes.filter(other=>other!==z&&other.burn<=0&&
  Math.hypot(other.x+other.w/2-z.x-z.w/2,
             other.y+other.h/2-z.y-z.h/2)<=radius)
  .sort((a,b)=>Math.hypot(a.x-z.x,a.y-z.y)-Math.hypot(b.x-z.x,b.y-z.y));
}
function hit(z,impact=null,piercing=false){
 const fireX=z.x+z.w/2,fireY=z.y+z.h/2;
 combo++;
 const critical=!piercing&&criticalEligible(z)&&Math.random()<(z.form===0&&!Number.isInteger(z.eliteKind)?CRITICAL_GREEN_CHANCE:CRITICAL_SPECIAL_CHANCE);
 // Piercing deals two times the normal damage to ALL enemies, including
 // bosses, but never turns a full-health boss into a one-hit kill.
 const echo=impact?.echo?fireTargetsNear(z,110).find(other=>other!==z):null;
 const bankTargets=impact?.ricochet?fireTargetsNear(z,84*(isMiniHorde()?MINI_HORDE_SCALE:1)).slice(0,2):[];
 const moduleAttack=1+garageCombat().attack/100;
 damage(z,hero().damage*moduleAttack*(has('power')?2:1)*(piercing?2:1)*(impact?.power||1),false,impact,critical,piercing);
 if(echo&&foes.includes(echo)){spawnContact({vx:0,vy:-1},echo.x+echo.w/2,echo.y+echo.h/2,0,1,'enemy');damage(echo,1.35*moduleAttack,false,{x:0,y:-1})}
 if(impact?.ricochet){
  // Wrench: first enemy hit after a side-wall bounce splashes at most two nearby foes.
  for(const other of bankTargets){
   if(!foes.includes(other)||mode!=='playing')continue;
   queueContact(ballContactFX,other.x+other.w/2,other.y+other.h/2,0,1,'enemy',null,isMiniHorde()?.30:.55);
   damage(other,.8*moduleAttack,false,{x:impact.x||1,y:-.2,push:.55,bankSplash:true});
  }
 }
 if(has('fire')){
  if(applyFireImpact(z,fireX,fireY,growth('fire')))sfx('fire');
 }
}
// Stable in-place removal avoids allocating short-lived effect arrays each tick.
function compactVisualQueue(queue,keep){
 let write=0;
 for(let read=0;read<queue.length;read++){
  const value=queue[read];if(keep(value))queue[write++]=value;
  else if(typeof particlePool!=='undefined'){
   if(queue===particles)recycleVisual(particlePool,value);
   else if(queue===ballContactFX||queue===trashContactFX){value.target=null;recycleVisual(contactPool,value)}
   else if(queue===hitFlashes)recycleVisual(flashPool,value);
  }
 }
 queue.length=write;return queue;
}
const visualAlive=f=>f.t<f.life,particleAlive=p=>p.t>0,deathPending=d=>!d.done;
function advanceVisualQueue(queue,dt){
 for(const f of queue)f.t+=dt;
 return compactVisualQueue(queue,visualAlive);
}
function update(dt){
 if(mode==='stageComic'||mode==='stageNumber')return;
 // Visual FX can finish even while a final-ball loss freezes the game scene.
 if(mode!=='paused'){
  for(const f of ballVanish)f.t+=dt;
  compactVisualQueue(ballVanish,visualAlive);
  for(const f of criticalPopups)f.t+=dt;
  compactVisualQueue(criticalPopups,visualAlive);
  advanceVisualQueue(fireWaves,dt);
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
 clock+=dt;enemyAnimationClock+=dt*enemySlowRate();if(isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))fortress?.tick(dt);updateStageBackground(dt);resistFlash=Math.max(0,resistFlash-dt);updateEnemyVisuals(dt);cameraKick*=Math.exp(-dt*23);if(cameraKick<.06)cameraKick=0;advanceVisualQueue(fx,dt);swing=Math.max(0,swing-dt);heroAttackTime=Math.max(0,heroAttackTime-dt);compactVisualQueue(particles,particleAlive);for(const p of particles){p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt}
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
  const loading=wave<50&&
    (window.ZZStageArt?.loading?.[stageArtForWave(wave+1)]||nextBossArtLoading(wave+1)||preparedArtLoading(preparedStage));
  if(!loading||clearTime>=8.8)advanceStage();
 }
 return;
}
if(!foes.length){beginClear();return}
updatePoisonStatus(dt);
const previousCar=car;
if(groggyTime>0){target=car;}
else{
 const driveSpeed=hero().speed*(1+(garageCombat().speed||0)/100);
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
 z.burn=Math.max(0,z.burn-dt);z.burnTick+=dt;z.spreadTick+=dt;z.burnVisualDelay=Math.max(0,(z.burnVisualDelay||0)-dt);
 if(z.spreadTick>=.95&&!z.spreadDone){
  z.spreadDone=true;
  if((z.burnDepth||0)<FIRE_SPREAD_DEPTH){
   const level=z.burnGrowthLevel||0;
   const neighbour=fireTargetsNear(z,fireProfile(level).spreadRadius*fireRangeScale())[0];
   if(neighbour)ignite(neighbour,(z.burnDepth||0)+1,level);
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
let ballGrid=foes.length>=32&&typeof makeFoeGrid==='function'?makeFoeGrid(foes):null;
for(const b of [...balls]){updateBallSpin(b,dt);const cruise=ensureBallCruiseSpeed(b);b.bounceTime=Math.max(0,(b.bounceTime||0)-dt);const radius=((has('power')?12:8)*(typeof miniBallScale==='function'?miniBallScale():1)),steps=Math.max(1,Math.ceil(Math.max(cruise*dt,Math.abs(car-previousCar))/4)),d=dt/steps;
for(let s=0;s<steps;s++){const ox=b.x,oy=b.y;b.hitLock=Math.max(0,b.hitLock-d);b.x+=b.vx*d;b.y+=b.vy*d;if(b.x<ROAD_LEFT+radius){b.x=ROAD_LEFT+radius;b.vx=Math.abs(b.vx);ballImpact(b,'x',1,'wall');spawnContact(b,b.x,b.y,1,0,'wall');sfx('wall');feedback('wall')}if(b.x>ROAD_RIGHT-radius){b.x=ROAD_RIGHT-radius;b.vx=-Math.abs(b.vx);ballImpact(b,'x',-1,'wall');spawnContact(b,b.x,b.y,-1,0,'wall');sfx('wall');feedback('wall')}if(b.y<16+radius){b.y=16+radius;b.vy=Math.abs(b.vy);ballImpact(b,'y',1,'ceiling');spawnContact(b,b.x,b.y,0,1,'ceiling');sfx('wall');feedback('wall')}
 // Barricades reflect ALL balls, even pierce shots; only zombie bites
 // damage their HP. Run before enemy hit tests, at existing ball substeps.
 if((isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))&&fortress){
  const wallHit=fortress.bounceBall(b,ox,oy,radius);
  if(wallHit){
   ballImpact(b,wallHit.axis,wallHit.axis==='x'?b.vx:b.vy,'wall');
   spawnContact(b,wallHit.x,wallHit.y,wallHit.nx,wallHit.ny,'wall');
   sfx('wall');feedback('wall');
   b._trailCorner=true;
  }
 }
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
 const ballCandidates=ballGrid?ballGrid.query(b.x-radius,b.y-radius,radius*2,radius*2).map(i=>foes[i]):foes;
 for(const z of ballCandidates){
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
   if(ballGrid)ballGrid=foes.length>=32?makeFoeGrid(foes):null;
   break;
  }
 }
if(b.vy>0&&oy+radius<=PY&&b.y+radius>=PY&&Math.abs(b.x-car)<hero().paddle+radius/2+growth('sweetSpot')*2+gearBonus('wide')+(window.ZZGarage?.combatStats?.()?.guard||0)+(window.ZZGarage?.masteryDefense?.()||0)){const overhead=overheadReturn(b.vx,b.vy),offset=clamp((b.x-car)/hero().paddle,-1,1),speed=Math.min(selectedHero===1?650:600,Math.hypot(b.vx,b.vy)+(selectedHero===1?35:7)),angle=window.ZZGarage?.strike(b,selectedHero,offset)??offset*1.06;b.vx=Math.sin(angle)*speed;b.vy=-Math.cos(angle)*speed;b.y=PY-radius-1;ballImpact(b,'y',-1,'paddle');swing=.22;heroAttackTime=HERO_ATTACK_DURATION;if(typeof triggerHeroStrike==='function')triggerHeroStrike(b.x);combo=0;effect(b.x,PY,'#e8ff93',46);burst(b.x,PY,'#e4ff9c',13);sfx('racket');feedback('racket',false,overhead)}
carCollision(b,radius,previousCar+(car-previousCar)*(s+1)/steps);
if(has('shield')&&b.vy>0&&b.y+radius>=SHIELD_LINE_Y){b.y=SHIELD_LINE_Y-radius;b.vy=-Math.abs(b.vy);ballImpact(b,'y',-1,'shield');sfx('shield');feedback('shield');effect(b.x,SHIELD_LINE_Y,'#a1fbe6',75,'SAVE!');burst(b.x,SHIELD_LINE_Y,'#b9f684',10)}
if(!has('shield'))citizenCollision(b,radius);
if(b.y>H+20){lastLostBall={x:clamp(b.x,28,422),y:H-11};retireBall(b,'lost');balls.splice(balls.indexOf(b),1);hud();break}
  recordBallTrail(b,b.x,b.y,!!b._trailCorner);b._trailCorner=false;
 }
}
if(!balls.length){lives--;effect(car,PY,'#ff7089',85,'MISS');sfx('miss');feedback('miss');clearSkills();if(!lives){hud();end('마지막 공이 떨어져 하트가 모두 소진되었습니다.',{type:'ball',x:lastLostBall?.x||car,y:H-11});return}resetBalls();toast('공 낙하! · 하트 '+lives+'개 남음 · 좌우 드래그 후 손을 떼면 서브');return}
updateStandDanger(dt);
}
function proceduralBackground(){// Readability-first road tones: brighter, largely neutral gray with a restrained
// warm/cool shift per stage. Keep colored zombie silhouettes in the foreground.
const palette=[['#444e53','#566064','#4e595d','#77878a'],
               ['#514b55','#615c66','#58545d','#817b83'],
               ['#48554f','#5a685f','#526057','#7a8b7e']][(wave-1)%3];rect(0,0,W,H,palette[0]);for(let row=0;row<Math.ceil(H/49)+1;row++)for(let col=0;col<9;col++){let x=20+col*47,y=row*49,k=(row*7+col*13)%5;rect(x,y,45,47,palette[k%2+1]);rect(x,y,45,2,'#b9c7c11b');if(k===1){rect(x+7,y+25,11,2,'#24303835');rect(x+16,y+27,2,7,'#24303835')}}
for(let side of [0,432]){rect(side,0,18,H,'#343e43');for(let y=0;y<H;y+=42){rect(side+4,y,10,24,palette[3]);rect(side+6,y+2,3,18,'#8b9b97')}}
g.globalAlpha=.10;for(let y=-60;y<H;y+=92)rect(222,y+(clock*12)%92,6,34,palette[3]);g.globalAlpha=1; // Legacy procedural stage also draws no enemy-area debug rectangle.
for(let i=0;i<16;i++){let x=25+(i*137)%400,y=(i*97+clock*9)%(DEFENSE_Y-15);rect(x,y,2,2,palette[3]+'30')}
// Defense breach remains a physics rule; no always-on text or vector indicator.rect(20,H-50,410,50,'#17252baa');
// Slow is shown on affected enemies and skill icons, never as an arena-sized outline.
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
 if(stageArtBlend>=1){previousArtIndex=-1;art.retain?.(stageArtIndex,(mode==='clearing'&&wave<50||mode==='endlessShift'&&!endlessShiftSpawned)?stageArtForWave(wave+1):-1);}
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
 // Slow is shown on affected enemies and skill icons, never as an arena-sized outline.
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

// v280: approved attack atlas has correctly authored per-frame transparency.
// Draw its native bitmap directly; no runtime RGB/alpha substitution or cutouts.

// V342: Hero-only impact presentation. The established paddle, car and ball
// collision/angle/velocity are untouched. Only the bitmap lunges sideways.
let heroStrikeVisual=null,heroStrikeGhostPass=false;
const HERO_STRIKE_IN=.032,HERO_STRIKE_HOLD=.115,HERO_STRIKE_OUT=.13;
const HERO_STRIKE_LIFE=HERO_STRIKE_IN+HERO_STRIKE_HOLD+HERO_STRIKE_OUT;
// Approximate visible body/weapon width, excluding transparent sprite padding.
const HERO_STRIKE_VISIBLE_HALF=[40,38,38,35,32];
function heroStrikePose(age,offset){
 const t=Math.max(0,age);
 const ease=v=>{const u=clamp(v,0,1);return 1-Math.pow(1-u,3)};
 const slide=t<HERO_STRIKE_IN?ease(t/HERO_STRIKE_IN):
  t<HERO_STRIKE_IN+HERO_STRIKE_HOLD?1:
  1-ease((t-HERO_STRIKE_IN-HERO_STRIKE_HOLD)/HERO_STRIKE_OUT);
 const arrival=Math.abs(offset)>1?HERO_STRIKE_IN:0;
 const impactAge=t-arrival;
 const hit=impactAge<0?0:Math.max(0,1-impactAge/.105);
 // Begin the localized shake and flash at the reached position, not in flight.
 return {shift:offset*slide,jx:Math.sin(impactAge*185+1.1)*4.5*hit,
  jy:Math.cos(impactAge*149)*2.8*hit,flash:impactAge<0?0:Math.max(0,1-impactAge/.075)};
}
function triggerHeroStrike(hitX,allowDash=true){
 const delta=hitX-car,edge=HERO_STRIKE_VISIBLE_HALF[selectedHero]??38;
 const offset=allowDash&&Math.abs(delta)>edge?
  clamp(car+Math.sign(delta)*Math.min(56,Math.max(20,Math.abs(delta)-17)),45,W-45)-car:0;
 heroStrikeVisual={at:clock,offset,origin:car};
}
// V343: freeze the actual impact cel while the visual offset is held.
// The live car center is still read on every draw; controls never stop.
function heroStrikeFrame(fallback,impactFrame=4){
 if(!heroStrikeVisual||heroAttackTime<=0)return fallback;
 const p=heroStrikeVisual,age=Math.max(0,clock-p.at);
 const arrival=Math.abs(p.offset)>1?HERO_STRIKE_IN:0;
 const release=arrival+HERO_STRIKE_HOLD;
 if(age<arrival)return Math.min(impactFrame-1,Math.floor(age/Math.max(.001,arrival)*impactFrame));
 if(age<=release)return impactFrame;
 return Math.min(7,impactFrame+Math.floor((age-release)/.055));
}
function drawHeroStrikePresentation(){
 const p=heroStrikeVisual,age=p?Math.max(0,clock-p.at):Infinity;
 if(!p||age>=HERO_STRIKE_LIFE||mode!=='playing'){
  drawCarGroundShadow();player();drawPoisonGauge();drawGroggyFeedback();return;
 }
 const pose=heroStrikePose(age,p.offset);
 // Three short, fading copies of the actual authored hero sprite, left
 // behind along the lunge. No extra actors, physics or persistent trails.
 if(Math.abs(p.offset)>1&&age<.145){
  const alpha=Math.max(0,1-age/.145);
  for(const [part,opacity] of [[0,.24],[.33,.18],[.66,.12]]){
   g.save();g.translate(p.origin-car+pose.shift*part,0);
   g.globalAlpha*=opacity*alpha;g.filter='brightness(1.45) saturate(.65)';
   heroStrikeGhostPass=true;
   try{player()}finally{heroStrikeGhostPass=false;g.restore()}
  }
 }
 g.save();g.translate(pose.shift,0);
 drawCarGroundShadow();
 g.save();g.translate(pose.jx,pose.jy);
 if(pose.flash>0)g.filter='brightness('+(1+pose.flash*1.8).toFixed(3)+') saturate('+(1-pose.flash*.55).toFixed(3)+')';
 player();g.restore();
 drawPoisonGauge();drawGroggyFeedback();g.restore();
}
function player(){
 if(typeof heroStrikeGhostPass==='undefined'||!heroStrikeGhostPass)drawTrashContact("hero");
 if(selectedHero===4){
  // Same elevated front/side presentation and wheel baseline as the existing cast.
  const attacking=heroAttackTime>0;
  const t=attacking?Math.max(0,1-heroAttackTime/HERO_ATTACK_DURATION):0;
  const frame=attacking?Math.min(7,Math.floor(t*8)):(Math.floor(clock*8)%8);
  const shownFrame=attacking?heroStrikeFrame(frame):frame;
  const sheet=$(attacking?'scarlet-attack':'scarlet-idle');
  const renderSheet=sheet;
  // v281: Scarlet's authored car + rider is 80% of the previous displayed
  // size. Anchor the wheel baseline, not the sprite center, for both poses.
  const size=112*.8,carSpriteBottom=579+112/2;
  const win=mode==='clearing'||mode==='paused'&&resumeMode==='clearing';
  g.save();g.translate(0,VIEW_DELTA);
  if(win)g.translate(0,-Math.abs(Math.sin(clearTime*7))*4);
  if((renderSheet?.naturalWidth||renderSheet?.width)===768&&(renderSheet?.naturalHeight||renderSheet?.height)===384){
   drawHeroBitmap(renderSheet,(shownFrame%4)*192,Math.floor(shownFrame/4)*192,192,192,
    car-size/2,carSpriteBottom-size,size,size);
  }else{
   const portrait=$('scarlet-portrait');
   if(portrait?.naturalWidth)drawHeroBitmap(portrait,car-size/2,carSpriteBottom-size,size,size);
  }
  g.restore();return;
 }
 if(selectedHero===3){
  let swinging=heroAttackTime>0;
  let frame=Math.floor(clock*8)%8;
  if(swinging){
   // The bounce has already occurred. Start at impact, then follow through.
   frame=Math.min(7,4+Math.floor((HERO_ATTACK_DURATION-heroAttackTime)/.055));
   frame=heroStrikeFrame(frame);
  }else{
   const radius=((has('power')?12:8)*(typeof miniBallScale==='function'?miniBallScale():1));
   const reach=hero().paddle+radius/2+growth('sweetSpot')*2+gearBonus('wide')+(window.ZZGarage?.combatStats?.()?.guard||0)+(window.ZZGarage?.masteryDefense?.()||0);
   let soonest=.20;
   for(const ball of balls){
    if(ball.held||ball.vy<=0)continue;
    const until=(PY-radius-ball.y)/ball.vy;
    if(until>=0&&until<soonest&&Math.abs(ball.x+ball.vx*until-car)<reach){
     soonest=until;swinging=true;
    }
   }
   if(swinging)frame=Math.min(3,Math.floor((.20-soonest)/.05));
  }
  const sheet=$(swinging?'wrench-swing':'wrench-idle');
  if(sheet?.naturalWidth===768&&sheet.naturalHeight===384){
   // v303: Wrench rider and buggy are now 80% of their previous on-screen
   // size. Keep the identical wheel/foot anchor, ball physics and hit timing.
   const size=124*.8;
   drawHeroBitmap(sheet,(frame%4)*192,Math.floor(frame/4)*192,192,192,
    car-size*244/480,625+VIEW_DELTA-size*455/480,size,size);
  }else{
   const sprite=$('mechanic-art');
   if(sprite?.naturalWidth){
    const w=100*.8,h=w*sprite.naturalHeight/sprite.naturalWidth;
    drawHeroBitmap(sprite,car-w/2,625+VIEW_DELTA-h,w,h);
   }
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
  drawHeroBitmap(atlas,(attacking?heroStrikeFrame(n):n)*192,selectedHero*192,192,192,car-w/2,579-h/2,w,h);
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
  drawHeroBitmap(sprite.image,(heroAttackTime>0?heroStrikeFrame(n):n)*192,selectedHero*192,192,192,
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
 enemyDeaths.push({source:z,z:{...z,flash:.12},critical,spriteMode,t:0,freeze,split:split+freeze,done:false});}
function updateEnemyVisuals(dt){
 for(const ghost of dodgeGhosts)ghost.t+=dt;
 compactVisualQueue(dodgeGhosts,ghost=>ghost.t<ghost.life);
 advanceVisualQueue(hitFlashes,dt);advanceVisualQueue(barrelBlasts,dt);advanceVisualQueue(bazookaBlasts,dt);for(const z of foes){
 if(z.duckContact&&clock>=z.duckContact.at){const q=z.duckContact;delete z.duckContact;if(!(z.fortressFrozenUntil>clock))fortressContact(z,'lure',q.x,q.y,DUCK_CHAIN_FREEZE)}
 if(z.trashStopUntil>clock){z.hitHold=Math.max(0,(z.hitHold||0)-dt);continue}
 if(Number.isFinite(z.arrivalTime)){
  z.arrivalTime=Math.min(.62,z.arrivalTime+dt);
  if(z.arrivalTime>=.62)delete z.arrivalTime;
 }
 z.recoil=Math.max(0,(z.recoil||0)-dt);z.hitHold=Math.max(0,(z.hitHold||0)-dt);
 z.flinch=Math.max(0,(z.flinch||0)-dt);z.knockTime=Math.max(0,(z.knockTime||0)-dt);
 if(!z.knockTime)delete z.moleLaunch;

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
  if((d.z.miniScale||1)<1){
   // Only Mini Horde uses scaled virtual dimensions. Base modes keep the
   // exact legacy death renderer and its approved atlas timing.
   drawMiniEnemy(d.z,visual=>{
    if(d.spriteMode&&window.ZZLargeBossSprites?.available(visual)===true)
     window.ZZLargeBossSprites.drawDeath(g,visual,elapsed,duration);
    else if(d.spriteMode&&window.ZZEliteSprites?.available(visual)===true)
     window.ZZEliteSprites.drawDeath(g,visual,elapsed,duration);
    else if(d.spriteMode&&window.ZZObjectSprite?.available(visual)===true)
     window.ZZObjectSprite.drawDeath(g,visual,d.critical,elapsed,duration);
    else if(d.spriteMode&&window.ZZGreenDeath?.ready===true)
     window.ZZGreenDeath.draw(g,visual,d.critical,elapsed);
   });
  }else{
   if(d.spriteMode&&window.ZZLargeBossSprites?.available(d.z)===true)
    window.ZZLargeBossSprites.drawDeath(g,d.z,elapsed,duration);
   else if(d.spriteMode&&window.ZZEliteSprites?.available(d.z)===true)
    window.ZZEliteSprites.drawDeath(g,d.z,elapsed,duration);
   else if(d.spriteMode&&window.ZZObjectSprite?.available(d.z)===true)
    window.ZZObjectSprite.drawDeath(g,d.z,d.critical,elapsed,duration);
   else if(d.spriteMode&&window.ZZGreenDeath?.ready===true)
    window.ZZGreenDeath.draw(g,d.z,d.critical,elapsed);
  }
  g.restore();
 }
}
// Apply a single uniform canvas transform to the APPROVED bitmap renderers,
// including their death strips. Geometry/physics stay in mini world-space,
// while all art is sampled from the identical original sprite files.
function drawMiniEnemy(z,paint){
 const scale=z?.miniScale||1;
 if(scale>=1)return paint(z);
 g.save();
 g.translate(z.x+z.w/2,z.y+z.h+2*scale);
 g.scale(scale,scale);
 try{
  return paint({...z,x:-z.miniBaseW/2,y:-z.miniBaseH-2,
   w:z.miniBaseW,h:z.miniBaseH});
 }finally{g.restore();}
}
// V425: same alpha-clipped blue overlay as the cryo trap. Cache only the
// actual source cel (not an entire actor or atlas), and share it across foes.
function resetSlowTintCache(){
 slowTintCache=new WeakMap();slowTintQueue=[];slowTintPixels=0;
}
function slowTintBitmap(image,sx=0,sy=0,sw=image?.naturalWidth||image?.width,sh=image?.naturalHeight||image?.height){
 if(!image||!(sw>0&&sh>0)||typeof document.createElement!=='function')return image;
 let entries=slowTintCache.get(image);
 if(!entries){entries=new Map();slowTintCache.set(image,entries)}
 const key=sx+','+sy+','+sw+','+sh;
 const prior=entries.get(key);if(prior)return prior;
 const scale=Math.min(1,256/Math.max(sw,sh)),w=Math.max(1,Math.ceil(sw*scale)),h=Math.max(1,Math.ceil(sh*scale));
 try{
  const tile=document.createElement('canvas');tile.width=w;tile.height=h;
  const ctx=tile.getContext('2d');if(!ctx||typeof ctx.drawImage!=='function')return image;
  ctx.drawImage(image,sx,sy,sw,sh,0,0,w,h);
  ctx.globalCompositeOperation='source-atop';ctx.fillStyle=SLOW_TINT_COLOR;
  ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='source-over';
  while(slowTintQueue.length&&slowTintPixels+w*h>SLOW_TINT_PIXEL_LIMIT){
   const old=slowTintQueue.shift();old.entries.delete(old.key);slowTintPixels-=old.pixels;
  }
  entries.set(key,tile);slowTintQueue.push({entries,key,pixels:w*h});slowTintPixels+=w*h;
  return tile;
 }catch{return image}
}
// Forward native Canvas methods with their real receiver. Only drawImage
// substitutes the shared blue cel. Hit flash, transform and opacity survive.
function slowTintContext(ctx){
 let proxy=slowTintContexts.get(ctx);if(proxy)return proxy;
 const bound=new Map();
 const draw=(image,...a)=>{
  if(a.length===8){
   const tile=slowTintBitmap(image,a[0],a[1],a[2],a[3]);
   if(tile!==image)return ctx.drawImage(tile,0,0,tile.width,tile.height,a[4],a[5],a[6],a[7]);
  }else if(a.length===2||a.length===4){
   const tile=slowTintBitmap(image);
   if(tile!==image){
    if(a.length===2)return ctx.drawImage(tile,a[0],a[1],image.naturalWidth||image.width,image.naturalHeight||image.height);
    return ctx.drawImage(tile,...a);
   }
  }
  return ctx.drawImage(image,...a);
 };
 proxy=new Proxy(ctx,{get(target,key){
  if(key==='drawImage')return draw;
  const value=Reflect.get(target,key,target);
  if(typeof value!=='function')return value;
  if(!bound.has(key))bound.set(key,value.bind(target));
  return bound.get(key);
 },set(target,key,value){return Reflect.set(target,key,value,target)}});
 slowTintContexts.set(ctx,proxy);return proxy;
}
function slowTintOn(){return typeof slowEchoVisible==='function'&&slowEchoVisible()}
function zombie(z){
 // Vertical screen lift is cosmetic only; the floor shadow and collider
 // follow the checked ground path. Retain the approved bitmap animation.
 let lift=0;
 if(z.moleLaunch&&z.knockTime>0)lift=12*Math.sin(Math.PI*knockMotionProgress(z));
 else if(z.moleHop)lift=10*Math.sin(Math.PI*clamp(z.moleHop.travel/Math.max(1,z.moleHop.total),0,1));
 const actor=lift>0?{...z,y:z.y-lift}:z;
 if(typeof slowTintOn!=='function'||!slowTintOn()||z.fortressFrozenUntil>clock)return drawMiniEnemy(actor,paintOriginalZombie);
 const live=g;g=slowTintContext(live);
 try{return drawMiniEnemy(actor,paintOriginalZombie)}finally{g=live}
}
function paintOriginalZombie(z){
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
 if(!fxEnabled||!burningCount())return;
 // V365: all detail levels use the full original 7-column / 5-step flame.
 // Cache its animated artwork instead of deleting the bright tips or rows.
 const paint=()=>{for(const actor of foes){
  if(!(actor.burn>0)||actor.burnVisualDelay>0||actor.fortressFrozenUntil>clock)continue;
  const z=knockVisualPosition(actor),scale=z.miniScale||1;
  const cx=z.x+z.w/2,base=z.y+z.h-4*scale,fade=Math.min(1,z.burn/.25);
  const atlas=burningFlameAtlas(!!z.boss);
  g.save();
  if(atlas&&typeof g.drawImage==='function'){
   const period=2*Math.PI/3,phase=clock+(z.seed||0)/24;
   const frame=((Math.floor(phase/period*64)%64)+64)%64;
   g.shadowColor='transparent';g.shadowBlur=0;g.globalAlpha=fade;
   g.drawImage(atlas.canvas,(frame%8)*atlas.w,Math.floor(frame/8)*atlas.h,atlas.w,atlas.h,
    cx-atlas.cx*scale,base-atlas.base*scale,atlas.w*scale,atlas.h*scale);
  }else{
   // Canvas-less environments retain all original pixels, not a sparse LOD.
   g.translate(cx,base);g.scale(scale,scale);g.translate(-cx,-base);
   g.shadowBlur=9;
   paintOriginalBurningFlame(g,!!z.boss,cx,base,clock,z.seed||0,fade);
  }
  g.restore();
 }};
 luminous(paint);
}
// Identical geometry, color progression and staggered flicker to the full
// pre-LOD flame. Coordinates are shared by cached and immediate paths.
function burningFlameGeometry(boss,cx,base,time,seed,emit){
 for(let column=-3;column<=3;column++){
  const x=cx+column*(boss?10:6);
  const wave=.5+.5*Math.sin(time*24+column*3.7+seed);
  const height=(boss?41:24)*(.65+.35*wave)*(1-.09*Math.abs(column));
  for(let step=0;step<5;step++){
   const y=base-height*step/5,span=Math.max(2,(boss?7:5)-step*.65);
   emit(Math.round(x-span/2+Math.sin(time*15+column*2+step)*2),Math.round(y),
    Math.ceil(span),boss?8:5,step);
  }
 }
}
const ZOMBIE_FLAME_COLORS=[SKILL_TRAIL_RAMPS[1].stops[2],'#ed3503',SKILL_TRAIL_RAMPS[1].stops[1],'#ffcb18',SKILL_TRAIL_RAMPS[1].stops[0]];
function paintOriginalBurningFlame(ctx,boss,cx,base,time,seed,fade){
 burningFlameGeometry(boss,cx,base,time,seed,(x,y,w,h,step)=>{
  ctx.shadowColor=ctx.fillStyle=ZOMBIE_FLAME_COLORS[step];
  ctx.globalAlpha=fade*(1-step*.11);ctx.fillRect(x,y,w,h);
 });
}
function burningFlameAtlas(boss){
 const key=boss?'boss':'regular';
 const cache=burningFlameAtlas.cache||(burningFlameAtlas.cache={});
 if(key in cache)return cache[key];
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
 try{
  const w=boss?112:80,h=boss?80:64,cx=w/2,base=boss?54:40;
  const canvas=document.createElement('canvas');canvas.width=w*8;canvas.height=h*8;
  const ctx=canvas.getContext('2d');
  if(!ctx||typeof ctx.drawImage!=='function'||typeof ctx.fillRect!=='function')return cache[key]=null;
  // Only five shadowed rectangle stamps per enemy size. Compose every
  // full-detail frame from these once, avoiding thousands of shadow blurs.
  const stamps=[];
  for(let step=0;step<5;step++){
   const stamp=document.createElement('canvas');stamp.width=stamp.height=40;
   const sc=stamp.getContext('2d');
   if(!sc||typeof sc.fillRect!=='function')return cache[key]=null;
   sc.shadowBlur=9;
   sc.shadowColor=sc.fillStyle=ZOMBIE_FLAME_COLORS[step];
   sc.globalAlpha=1-step*.11;
   sc.fillRect(16,16,Math.ceil(Math.max(2,(boss?7:5)-step*.65)),boss?8:5);
   stamps.push(stamp);
  }
  for(let frame=0;frame<64;frame++){
   const ox=frame%8*w,oy=Math.floor(frame/8)*h,time=frame/64*(2*Math.PI/3);
   burningFlameGeometry(boss,cx,base,time,0,(x,y,sw,sh,step)=>{
    ctx.drawImage(stamps[step],ox+x-16,oy+y-16);
   });
  }
  return cache[key]={canvas,w,h,cx,base};
 }catch{return cache[key]=null}
}

function drawBallVanish(){
 for(const f of ballVanish){
  const t=clamp(f.t/Math.min(.28,f.life),0,1),fade=Math.pow(1-t,1.4);
  if(!fade)continue;
  const col=f.reason==='lost'?'#ff9bad':f.reason==='clear'?'#fff2a0':'#b8f9ed';
  g.save();
  if((f.miniScale||1)<1){
   g.translate(f.x,f.y);g.scale(f.miniScale,f.miniScale);g.translate(-f.x,-f.y);
  }
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
  const drawHit=()=>drawPixelBurst(f.x,f.y,t,(f.critical?55:(f.spread||44))*(f.miniFxScale||1),Math.max(4,Math.ceil((f.critical?32:16)*(f.miniFxScale||1))),
    (f.x*.17+f.y*.09)%6.28,palette,f.angle||0,(f.critical?1:1.75)*(f.miniFxScale||1),
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
function compactBallFX(){return false} // Compatibility query: no visible LOD.
function drawBallStateAura(b,r){
 const fire=has('fire'),pierce=has('pierce'),power=has('power');
 if(!fxEnabled||!(fire||pierce||power))return;
 const phase=clock*(b.held?2.4:4.2),pulse=.5+.5*Math.sin(clock*9.5);
 const shell=r*1.62,glowLimit=r*1.72;
 const layers=Number(fire)+Number(pierce)+Number(power);
 const balance=layers>1?.7:1;
 const hue=fire&&pierce?'#ef56d8':fire?'#ff4043':pierce?'#397bff':'#f0d775';
 const outerHue=fire&&pierce?'#ae85ff':fire?'#ff9a42':pierce?'#80ddff':hue;
 g.save();g.translate(b.x,b.y);
 g.globalCompositeOperation='lighter';g.shadowBlur=0;g.lineCap='round';
 // A feathered *internal* light falloff replaces hard square coronas.
 const gradient=g.createRadialGradient?.(0,0,r*.72,0,0,glowLimit);
 if(gradient&&typeof gradient.addColorStop==='function'){
  gradient.addColorStop(0,'#ffffff00');
  gradient.addColorStop(.50,hue+'26');
  gradient.addColorStop(.79,outerHue+'42');
  gradient.addColorStop(1,outerHue+'00');
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
 {main:'#f2e9dd',soft:'#c9bdaf',accent:'#c86e6b',head:'#ffb9a8'}, // baseball leather + stitches
 {main:'#f5be76',soft:'#78c2d9',accent:'#e995c2',head:'#ff984c'}, // colorful toy ball
 {main:'#d0dce0',soft:'#6b999f',accent:'#e8f5fd',head:'#88c8df'}, // Wrench steel
 {main:'#c2e7ff',soft:'#a795f2',accent:'#ffbce9',head:'#94baff'}  // Scarlett gemstone
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
 const head={x:b.x,y:b.y},trail=b.trail,limit=(r>8||(typeof has==='function'&&has('power')))?BALL_TRAIL_POWER:BALL_TRAIL_NORMAL;
 let total=0;const path=[];
 const append=(x,y,s)=>{
  const i=path.length,p=points?(points[i]||(points[i]={x:0,y:0,s:0})):{};
  p.x=x;p.y=y;p.s=s;path.push(p);
 };
 append(b.x,b.y,0);
 for(let i=0;i<trail.length&&total<limit;i++){
  const p=i?trail[i-1]:head,q=trail[i],prev=i>1?trail[i-2]:head,next=trail[Math.min(trail.length-1,i+1)];
  const dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy);if(len<.6)continue;
  const corner=p.corner||q.corner;
  const ax=p.x-prev.x,ay=p.y-prev.y,bx=next.x-q.x,by=next.y-q.y;
  const curved=!corner&&(Math.abs(ax*dy-ay*dx)>.12*Math.hypot(ax,ay)*len||Math.abs(bx*dy-by*dx)>.12*Math.hypot(bx,by)*len);
  const count=Math.ceil(len/(curved?2.6:4));
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
// V409: a single filled variable-width ribbon, cached for the scene and
// bloom passes. Split at sharp bends so reversing segments never cancel.
// The front quarter retains the previous diameter; only the wake tapers.
function makeTaperedTrailRibbon(path,width){
 const shape=new Path2D(),n=path.length-1,len=path[n].s||1;
 const half=i=>{const u=Math.max(0,(path[i].s/len-.25)/.75);return width*.5*(1-.88*u*u*(3-2*u))};
 function strip(start,end){
  if(end<=start)return;
  for(let side=1;side>=-1;side-=2){
   for(let i=side===1?start:end;side===1?i<=end:i>=start;i+=side){
    const p=path[i],a=path[Math.max(start,i-1)],z=path[Math.min(end,i+1)];
    let dx=z.x-a.x,dy=z.y-a.y,m=Math.hypot(dx,dy);
    if(m<.001){const q=i<end?path[i+1]:path[i-1];dx=i<end?q.x-p.x:p.x-q.x;dy=i<end?q.y-p.y:p.y-q.y;m=Math.hypot(dx,dy)||1}
    const h=half(i)*side,x=p.x+dy/m*h,y=p.y-dx/m*h;
    if(side===1&&i===start)shape.moveTo(x,y);else shape.lineTo(x,y);
   }
  }
  shape.closePath();
 }
 function cap(i){const p=path[i],h=half(i);shape.moveTo(p.x+h,p.y);shape.arc(p.x,p.y,h,0,Math.PI*2);shape.closePath()}
 let start=0;
 for(let i=1;i<n;i++){
  const a=path[i-1],p=path[i],z=path[i+1],ax=p.x-a.x,ay=p.y-a.y,bx=z.x-p.x,by=z.y-p.y;
  if(ax*bx+ay*by<0){strip(start,i);cap(i);start=i}
 }
 strip(start,n);cap(0);cap(n);return shape;
}
function drawHeroBallTrail(b,r,path=buildBallTrailPath(b,r)){
 if(path.length<2)return;
 const col=HERO_BALL_TRAILS[selectedHero]||HERO_BALL_TRAILS[0];
 const n=path.length-1,len=Math.max(1,path[n].s),tip=path[n];
 const grad=g.createLinearGradient?.(tip.x,tip.y,b.x,b.y);
 if(grad&&typeof grad.addColorStop==='function'){
  grad.addColorStop(0,col.soft+'00');grad.addColorStop(.3,col.main+'55');grad.addColorStop(.7,col.main+'85');grad.addColorStop(1,(col.head||col.main)+'b0');
 }
 // Same approved Ace ribbon opacity for every hero; the bitmap is drawn
 // after the trail, so the gemstone facets remain intact.
 g.save();g.globalAlpha=.6;g.fillStyle=grad||col.main+'88';g.beginPath();
 // Trace the EXACT same left/right vertices directly to Canvas. Avoid two
 // temporary arrays and 2*(N+1) point allocations every rendered frame.
 for(let i=0;i<=n;i++){
  const p=path[i],a=path[Math.max(0,i-1)],z=path[Math.min(n,i+1)];
  const dx=a.x-z.x,dy=a.y-z.y,m=Math.hypot(dx,dy)||1;
  const taper=clamp((len-p.s)/Math.min(17,len*.3),0,1);
  const u=Math.max(0,(p.s/len-.25)/.75);
   const half=Math.min(r*.76,11)*(1-.2*p.s/len)*(.2+.8*taper)*(1-.88*u*u*(3-2*u));
  const x=p.x-dy/m*half,y=p.y+dx/m*half;
  if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
 }
 for(let i=n;i>=0;i--){
  const p=path[i],a=path[Math.max(0,i-1)],z=path[Math.min(n,i+1)];
  const dx=a.x-z.x,dy=a.y-z.y,m=Math.hypot(dx,dy)||1;
  const taper=clamp((len-p.s)/Math.min(17,len*.3),0,1);
  const u=Math.max(0,(p.s/len-.25)/.75);
   const half=Math.min(r*.76,11)*(1-.2*p.s/len)*(.2+.8*taper)*(1-.88*u*u*(3-2*u));
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
 const glow=fire&&pierce?'#ed58df':pierce?'#468bff':
   fire?'#ff5543':power?'#ffe0a3':(col.head||col.main);
 const end=path[path.length-1],head=path[0];
 const grad=g.createLinearGradient?.(end.x,end.y,head.x,head.y);
 if(grad&&typeof grad.addColorStop==='function'){
  const tailGlow=!fire&&!pierce&&!power?col.main:glow;
  grad.addColorStop(0,tailGlow+'00');
  grad.addColorStop(.16,tailGlow+'30');
  grad.addColorStop(.58,tailGlow+'8a');
  grad.addColorStop(1,glow+'c2');
 }
 g.save();g.globalCompositeOperation='lighter';
 g.lineCap='round';g.lineJoin='round';
 g.shadowColor=glow;g.shadowBlur=4;
 // The ordinary feathered edge remains identical. Only the separate
 // bloom capture uses a lower alpha (v92).
 g.globalAlpha=.23*.6*bloomScale;g.strokeStyle=grad||glow;
 g.lineWidth=r*1.55;
 if(typeof Path2D==='function'&&typeof Path2D.prototype.moveTo==='function'){
  g.fillStyle=g.strokeStyle;
  g.fill(path.haloRibbon||(path.haloRibbon=makeTaperedTrailRibbon(path,g.lineWidth)));
  g.restore();return;
 }
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
function drawElementalTrailBody(b,r,path,fire,pierce,bloomScale=1){
 const head=path[0],tail=path[path.length-1];
 const [tailColor,middle,color]=activeTrailRamp().stops;
 g.save();g.lineCap='round';g.lineJoin='round';g.shadowBlur=0;
 g.globalCompositeOperation='lighter';g.globalAlpha=.90*.8*bloomScale;
 // One stroke composites overlapping joins only once: no bright dotted seams.
 // A closed rebound must not create a zero-length transparent gradient.
 // A hairpin/rebound may put head almost on top of tail. A spatial
 // gradient then maps the whole loop to zero alpha and the trail vanishes.
 // Use a fixed visible body on folded paths; vertex/length data is unchanged.
 const displacement=Math.hypot(head.x-tail.x,head.y-tail.y);
 const useGradient=displacement>Math.min(24,path[path.length-1].s*.33);
 const gradient=useGradient&&g.createLinearGradient?.(tail.x,tail.y,head.x,head.y);
 if(gradient&&typeof gradient.addColorStop==='function'){
  gradient.addColorStop(0,tailColor+'00');gradient.addColorStop(.18,tailColor+'95');
  gradient.addColorStop(.40,tailColor+'b8');
  gradient.addColorStop(.66,middle+'dc');gradient.addColorStop(.90,color+'f2');
  gradient.addColorStop(1,color+'ff');
 }
 g.strokeStyle=gradient||color;g.lineWidth=r*1.52;
 if(typeof Path2D==='function'&&typeof Path2D.prototype.moveTo==='function'){
  g.fillStyle=g.strokeStyle;
  g.fill(path.elementalRibbon||(path.elementalRibbon=makeTaperedTrailRibbon(path,g.lineWidth)));
  g.restore();return;
 }
 g.beginPath();g.moveTo(head.x,head.y);
 for(let i=1;i<path.length;i++)g.lineTo(path[i].x,path[i].y);
 g.stroke();g.restore();
}
function drawBallSkillTrail(b,r,path=buildBallTrailPath(b,r)){
 if(!fxEnabled||path.length<2)return;
 const fire=has('fire'),pierce=has('pierce'),power=has('power');
 if(!fire&&!pierce&&!power)return;
 drawElementalTrailBody(b,r,path,fire,pierce);
}
// V411: at most ONE interior stroke, no detached ornaments. Fire is a
// fine warm centerline; pierce is a subdued, widely spaced zigzag.
// The ribbon/Bloom pass and physical ball tint remain unchanged.
function drawSimpleSkillTrailAccent(b,r,path){
 if(!fxEnabled||!path||path.length<2)return;
 const fire=has('fire'),pierce=has('pierce');
 if(!fire&&!pierce)return;
 const n=path.length-1,len=path[n].s;if(len<5)return;
 const head=path[0],tail=path[n],color=pierce?'#d9fdff':'#ffe19a';
 g.save();g.globalCompositeOperation='lighter';g.shadowBlur=0;
 g.lineCap='round';g.lineJoin='round';
 g.lineWidth=Math.max(.65,r*(pierce?.115:.09));g.globalAlpha=pierce?.68:.44;
 const distance=Math.hypot(head.x-tail.x,head.y-tail.y);
 const grad=distance>Math.min(24,len*.33)&&g.createLinearGradient?.(tail.x,tail.y,head.x,head.y);
 if(grad&&typeof grad.addColorStop==='function'){
  grad.addColorStop(0,color+'00');grad.addColorStop(.25,color+'45');grad.addColorStop(.60,color+'cc');grad.addColorStop(1,color+'ff');
 }
 g.strokeStyle=grad||color;
 g.beginPath();g.moveTo(head.x,head.y);
 for(let i=1;i<=n;i++){
  const p=path[i];
  if(!pierce||i===n){g.lineTo(p.x,p.y);continue}
  const a=path[i-1],z=path[i+1],dx=z.x-a.x,dy=z.y-a.y,mag=Math.hypot(dx,dy)||1;
  const u=Math.max(0,(p.s/len-.25)/.75),taper=1-.88*u*u*(3-2*u);
  const wave=1-4*Math.abs((p.s/36)%1-.5);
  const side=wave*r*.22*taper*Math.min(1,p.s/12,(len-p.s)/12);
  g.lineTo(p.x-dy/mag*side,p.y+dx/mag*side);
 }
 g.stroke();g.restore();
}
// V83: fire is a living secondary layer, never a replacement for the ball bitmap.
// v101: scope-limited multi-ball fast mode. Ordinary 1/2 ball effects keep
// every original render call and visual characteristic intact.
// No ball-count or performance-dependent visual LOD.
// Tapered cubic tongues, warm inner cores and a backward-flowing ember ribbon.
function flameTongue(x,y,dx,dy,width,outer,alpha=1,useStamp=false){
 if(useStamp&&typeof trailFlameStamp==='function'){
  const stamp=trailFlameStamp(outer),length=Math.hypot(dx,dy);
  if(stamp&&length>.001&&width>0){
   g.save();g.globalAlpha=alpha;g.translate(x,y);g.rotate(Math.atan2(dy,dx));
   g.drawImage(stamp,-length*.08,-width*1.28,length*1.28,width*2.56);g.restore();return;
  }
 }
 const mag=Math.hypot(dx,dy)||1,nx=-dy/mag,ny=dx/mag;
 const len=mag,root=width*.64;
 // Both callers own the canvas state for their entire flame layer.
 g.globalAlpha=alpha;g.fillStyle=outer;
 g.beginPath();g.moveTo(x+nx*root,y+ny*root);
 g.bezierCurveTo(x+dx*.33+nx*width*.9,y+dy*.33+ny*width*.9,
  x+dx*.72+nx*width*.34,y+dy*.72+ny*width*.34,x+dx,y+dy);
 g.bezierCurveTo(x+dx*.64-nx*width*.36,y+dy*.64-ny*width*.36,
  x+dx*.25-nx*width*.9,y+dy*.25-ny*width*.9,
  x-nx*root,y-ny*root);g.closePath();g.fill();
}
function drawBurningBallFlames(b,r,front=false){
 if(!fxEnabled||!has('fire'))return;
 const t=clock,velocity=Math.hypot(b.vx||0,b.vy||0);
 const windX=velocity>1?-(b.vx||0)/velocity:0,windY=velocity>1?-(b.vy||0)/velocity:-1;
 // Power increases the physical ball from r=8 to 12, but the ornament
 // thickness grows less aggressively so overlapping skills never look broken.
 const fxRadius=r>8?8+(r-8)*.55:r;
 g.save();g.translate(b.x,b.y);g.globalCompositeOperation='lighter';
 if(!front){
  const glow=g.createRadialGradient?.(0,0,r*.65,0,0,r*2.05);
  if(glow&&typeof glow.addColorStop==='function'){
   glow.addColorStop(0,'rgba(255,238,155,0)');
   glow.addColorStop(.47,'rgba(255,146,47,.18)');
   glow.addColorStop(.78,'rgba(255,86,27,.14)');
   glow.addColorStop(1,'rgba(255,86,27,0)');
   g.fillStyle=glow;g.globalAlpha=.87;g.beginPath();g.arc(0,0,r*2.05,0,Math.PI*2);g.fill();
  }
 }
 const count=front?6:12;
 g.shadowColor=front?'transparent':'#ff7b2a';g.shadowBlur=front?0:4;
 for(let i=0;i<count;i++){
  const angle=i*Math.PI*2/count+.06*Math.sin(t*7+i*2.3);
  const ax=Math.cos(angle),ay=Math.sin(angle);
  const wave=.5+.5*Math.sin(t*(front?13:10)+i*2.4);
  const bx=ax*r*(front?1.17:1.26),by=ay*r*(front?1.17:1.26);
  const length=fxRadius*(front?.18+.18*wave:.25+.23*wave);
  const dx=ax*length*.75+windX*length*.46;
  const dy=ay*length*.75+windY*length*.46;
  const width=fxRadius*(front?.085:.14)*(1+.2*wave);
  const alpha=front?.47:.73;
  flameTongue(bx,by,dx,dy,width,i%3===0?'#ff8610':i%2?'#f43c04':'#c90009',alpha);
  if(!front)flameTongue(bx,by,dx*.62,dy*.62,width*.46,'#ffca25',.46);
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
 if(!fxEnabled||!has('fire')||!path||path.length<2)return;
 const t=clock,maxLen=path[path.length-1].s;
 const colors=activeTrailRamp().stops;
 if(maxLen<4)return;
 g.save();g.lineCap='round';g.globalCompositeOperation='lighter';g.shadowBlur=0;
 // Tongues curl and detach from the outer edge of the moving trail,
 // staggered in time instead of one rigid straight beam.
 for(let d=3,i=0;d<maxLen-1;d+=12,i++){
  const p=sampleBallTrail(path,d),q=sampleBallTrail(path,Math.min(maxLen,d+7));
  if(!p||!q)continue;
  const dx=q.x-p.x,dy=q.y-p.y,mag=Math.hypot(dx,dy)||1;
  const nx=-dy/mag,ny=dx/mag;
  const position=d/maxLen,u=Math.max(0,(position-.25)/.75),taper=1-.88*u*u*(3-2*u);
  const fade=Math.pow(1-position,1.25);
  const tongueColor=colors[position<.30?2:position<.60?1:0];
  for(const side of [-1,1]){
   const oscillation=Math.sin(t*13+((d-3)/10)*2.2+side*1.5);
   const base=r*(.45+.25*oscillation)*taper;
   const x=p.x+nx*side*base,y=p.y+ny*side*base;
   const reach=(8+5*(.5+.5*oscillation))*fade;
   const tx=dx/mag*reach+nx*side*reach*.65*taper;
   const ty=dy/mag*reach+ny*side*reach*.65*taper;
   flameTongue(x,y,tx,ty,Math.max(.7,r*.17*fade)*taper,
     tongueColor,.78*.8*fade*1.2,true);
  }
 }
 g.restore();
}

// V84: clearly readable cyan-white lightning for piercing shots.
// Each arc receives a blurred additive outer glow and crisp inner filament.
function drawElectricArc(points,alpha=1,scale=1){
 if(!points||points.length<2)return;
 g.save();g.lineCap='round';g.lineJoin='miter';
 g.globalCompositeOperation='lighter';g.beginPath();
 g.moveTo(points[0].x,points[0].y);
 for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
 g.shadowColor='#69dfff';g.shadowBlur=9*scale;
 g.strokeStyle='#45c8ff';g.lineWidth=3.5*scale;g.globalAlpha=.39*alpha;g.stroke();
 g.shadowBlur=3.5*scale;g.strokeStyle='#a3efff';
 g.lineWidth=1.85*scale;g.globalAlpha=.85*alpha;g.stroke();
 g.shadowBlur=0;g.strokeStyle='#f0ffff';
 g.lineWidth=Math.max(.75,.86*scale);g.globalAlpha=.94*alpha;g.stroke();
 g.restore();
}
function drawPierceBallLightning(b,r,front=false){
 if(!fxEnabled||!has('pierce'))return;
 const beat=Math.floor(clock*25),bright=has('fire')?.86:1;
 // All balls share the same 25 Hz bolt animation. Keep each layer at
 // the live backing-store resolution so its blur and line widths match.
 if(typeof document!=='undefined'&&document.createElement&&g.canvas&&g.getTransform){
  const transform=g.getTransform();
  if(transform?.a>0&&transform.d>0&&!transform.b&&!transform.c){
   const sx=transform.a,sy=transform.d;
   const cache=drawPierceBallLightning.layers||(drawPierceBallLightning.layers=[]);
   const index=Number(front);
   let layer=cache[index];
   if(!layer){
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    if(ctx)layer=cache[index]={canvas,ctx};
   }
   if(layer){
    const w=2*Math.ceil(r*2*sx+20),h=2*Math.ceil(r*2*sy+20);
    if(layer.beat!==beat||layer.r!==r||layer.bright!==bright||layer.sx!==sx||layer.sy!==sy){
     const {canvas,ctx}=layer;
     if(canvas.width!==w)canvas.width=w;
     if(canvas.height!==h)canvas.height=h;
     ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
     ctx.setTransform(sx,0,0,sy,w/2,h/2);
     const target=g;g=ctx;
     try{paintPierceBallLightning(0,0,r,front,beat,bright)}finally{g=target}
     Object.assign(layer,{beat,r,bright,sx,sy});
    }
    g.save();g.globalCompositeOperation='lighter';
    g.drawImage(layer.canvas,b.x-w/(2*sx),b.y-h/(2*sy),w/sx,h/sy);
    g.restore();return;
   }
  }
 }
 paintPierceBallLightning(b.x,b.y,r,front,beat,bright);
}
function paintPierceBallLightning(x,y,r,front,beat,bright){
 const count=front?3:4;
 g.save();g.translate(x,y);
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
 g.globalAlpha=(has('fire')?.95:.9)*.8;
 g.beginPath();g.moveTo(path[0].x,path[0].y);
 // Single branchless zigzag. Retain every trajectory vertex at rebounds;
 // a triangular wave supplies sharp alternating teeth, not parallel lines.
 for(let i=1;i<=n;i++){
  const p=path[i],a=path[i-1],z=path[Math.min(n,i+1)];
  const dx=z.x-a.x,dy=z.y-a.y,m=Math.hypot(dx,dy)||1;
  const wave=1-4*Math.abs((p.s/24)%1-.5);
  const envelope=Math.min(1,p.s/10,(len-p.s)/12);
  const u=Math.max(0,(p.s/len-.25)/.75),taper=1-.88*u*u*(3-2*u);
  const side=wave*r*.42*envelope*(.88+.12*Math.sin(beat*1.7))*taper;
  g.lineTo(p.x-dy/m*side,p.y+dx/m*side);
 }
 g.stroke();g.restore();
}
// V76: per-ball rotational inertia updated ONCE per game tick, not per frame
// cell or direction change. Squash/stretch uses its own transform axes.
const HERO_BALL_SPIN_FACTORS=[1,.82,1.13,1,0]; // diamond is visually stationary
function updateBallSpin(b,dt){
 if(!b||!Number.isFinite(dt)||dt<=0)return;
 if(selectedHero===4){b.spinVelocity=0;b.spinAngle=0;return}
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
  const strength=clamp(b.impactStrength||.7,.45,1.12)*material*((r>8||(typeof has==='function'&&has('power')))?.86:1);
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
 else if(typeof has==='function'&&has('power')){sx=clamp(sx,.94,1);sy=clamp(sy,.94,1)}
 return {index,sx,sy,rotation,spin};
}
const skillBallTintCache=new WeakMap();
function drawSkillTintedFrame(img,sx,sy,sw,sh,dx,dy,dw,dh){
 if(typeof has!=='function'||typeof fxEnabled!=='undefined'&&!fxEnabled||!img)return false;
 if(typeof document==='undefined'||!document.createElement)return false;
 const ramp=activeTrailRamp();
 if(!ramp)return false;
 const canvas=skillTintFrame(img,sx,sy,sw,sh,ramp);
 if(!canvas)return false;
 g.drawImage(canvas,dx,dy,dw,dh);return true;
}
function skillTintFrame(img,sx,sy,sw,sh,ramp){
 const [rim,,tint]=ramp.stops;
 const key=[sx,sy,sw,sh,tint].join(',');
 let frames=skillBallTintCache.get(img);if(!frames){frames=new Map();skillBallTintCache.set(img,frames)}
 let canvas=frames.get(key);
 if(!canvas){
  canvas=document.createElement('canvas');canvas.width=Math.ceil(sw);canvas.height=Math.ceil(sh);
  const ctx=canvas.getContext('2d');if(!ctx||typeof ctx.drawImage!=='function'||typeof ctx.createRadialGradient!=='function')return false;
  const w=canvas.width,h=canvas.height;
  ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h);
  const grad=ctx.createRadialGradient(w*.5,h*.48,0,w*.5,h*.48,Math.min(w,h)*.48);
  if(!grad||typeof grad.addColorStop!=='function')return false;
  grad.addColorStop(0,tint+'a0');grad.addColorStop(.55,tint+'75');grad.addColorStop(1,rim+'35');
  ctx.globalCompositeOperation='source-atop';ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  frames.set(key,canvas);
 }
 return canvas;
}
const tintWarmProgress=new WeakMap();
function warmSelectedBallTint(){
 if(!fxEnabled||typeof document==='undefined'||!document.createElement)return;
 if(mode!=='menu'&&mode!=='building'&&!balls[0]?.held)return;
 const gem=selectedHero===4,steel=selectedHero===3;
 const img=gem?$('scarlet-ball-art'):steel?$('wrench-ball-art'):window.ZZHeroBallsV58?.images?.[selectedHero];
 if(!img?.naturalWidth||!img.naturalHeight)return;
 const frames=gem?8:1,index=tintWarmProgress.get(img)||0;
 if(index>=frames*7)return;
 const sw=steel?img.naturalWidth:img.naturalWidth/4,sh=steel?img.naturalHeight:img.naturalHeight/2;
 const frame=index%frames,ramp=SKILL_TRAIL_RAMPS[1+Math.floor(index/frames)];
 if(skillTintFrame(img,frame%4*sw,Math.floor(frame/4)*sh,sw,sh,ramp))tintWarmProgress.set(img,index+1);
}
function drawHeroBallSprite(b,r,col){
 if(selectedHero===4){
  // Fixed round silhouette; only the eight internal refraction/glint frames animate.
  const gem=$('scarlet-ball-art');
  const frame=Math.floor(clock*12)%8;
  const pose=ballSpritePose(b,r);
  g.save();g.shadowColor='transparent';g.shadowBlur=0;
  g.translate(b.x,b.y);
  g.scale(pose.sx,pose.sy); // elastic hit response without rotating the facet art
  const size=r*3.25;
  if(gem?.naturalWidth===384&&gem.naturalHeight===192){
   if(!drawSkillTintedFrame(gem,(frame%4)*96,Math.floor(frame/4)*96,96,96,-size/2,-size/2,size,size))g.drawImage(gem,(frame%4)*96,Math.floor(frame/4)*96,96,96,-size/2,-size/2,size,size);
  }else{
   g.fillStyle='#b3e7ff';g.beginPath();g.arc(0,0,r*1.18,0,Math.PI*2);g.fill();
   g.fillStyle='#ffffff';g.fillRect(-r*.3,-r*.6,r*.6,r*.6);
  }
  g.restore();return;
 }
 const sprites=window.ZZHeroBallsV58;
 const img=sprites?.images?.[selectedHero];
 const ready=!!sprites?.ready?.[selectedHero]&&img&&img.naturalWidth===1774&&img.naturalHeight===887;
 const pose=ballSpritePose(b,r);
 g.save();g.shadowColor='transparent';g.shadowBlur=0;
 // Orient anisotropic squash/stretch in world space, but let the bitmap
 // independently rotate by spinAngle. No angle snap when a ball hits a wall.
 g.translate(b.x,b.y);g.rotate(pose.rotation);g.scale(pose.sx,pose.sy);
 g.rotate(pose.spin-pose.rotation);
 // Wrench uses a separate steel-ball bitmap drawn at 2r before scaling.
 // The old 1.38x rendered it at 2.76r, about 81% of Ace's 3.40r tennis
 // sprite. 1.85x renders it at 3.70r (about 9% larger than Ace), as intended.
 // Keep the shared collision radius, wall reflection, trail and ball velocity.
 // This visual correction applies equally to held and airborne steel balls.
 if(selectedHero===3)g.scale(1.85,1.85);
 else if(selectedHero===1)g.scale(1.08,1.08);
 if(selectedHero===3 && $('wrench-ball-art')?.naturalWidth){const steel=$('wrench-ball-art');if(!drawSkillTintedFrame(steel,0,0,steel.naturalWidth,steel.naturalHeight,-r,-r,r*2,r*2))g.drawImage($('wrench-ball-art'),-r,-r,r*2,r*2)}else if(ready){
  const frameW=img.naturalWidth/4,frameH=img.naturalHeight/2;
  const size=r*3.40;
  if(!drawSkillTintedFrame(img,0,0,frameW,frameH,-size/2,-size/2,size,size))g.drawImage(img,0,0,frameW,frameH,-size/2,-size/2,size,size);
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
// Tint only the sprite's alpha, including the transparent gaps between limbs.
let frozenSpriteCanvas=null;
function drawFrozenZombie(actor){
 const z=knockVisualPosition(actor),size=Math.ceil(Math.max(z.w,z.h)*3+24);
 if(!frozenSpriteCanvas)frozenSpriteCanvas=document.createElement('canvas');
 if(frozenSpriteCanvas.width<size*2||frozenSpriteCanvas.height<size*2){
  frozenSpriteCanvas.width=frozenSpriteCanvas.height=size*2;
 }
 const layer=frozenSpriteCanvas.getContext('2d');
 const left=z.x+z.w/2-size/2,top=z.y+z.h/2-size/2;
 layer.clearRect(0,0,size*2,size*2);layer.save();
 const screen=g,liveAnimationClock=enemyAnimationClock;
 // Hold one real animation cel for this freeze, not an advancing walk loop.
 if(actor.fortressFrozenFrameUntil!==actor.fortressFrozenUntil){
  actor.fortressFrozenFrameUntil=actor.fortressFrozenUntil;
  actor.fortressFrozenFrame=liveAnimationClock;
  actor.fortressFrozenStart=clock;
 }
 const fade=Math.max(0,Math.min(1,(actor.fortressFrozenUntil-clock)*6));
 const onset=Math.max(.35,Math.min(1,(clock-actor.fortressFrozenStart)*12));
 try{
  layer.setTransform(2,0,0,2,-left*2,-top*2);g=layer;
  enemyAnimationClock=actor.fortressFrozenFrame;zombie({...z,burn:0});
 }finally{g=screen;enemyAnimationClock=liveAnimationClock;layer.restore()}
 layer.save();layer.globalCompositeOperation='source-atop';
 layer.fillStyle='rgba(65,166,246,'+(.44*fade*onset)+')';
 layer.fillRect(0,0,size*2,size*2);layer.restore();
 const phase=clock*48+(actor.col||0)*2+(actor.row||0);
 g.drawImage(frozenSpriteCanvas,0,0,size*2,size*2,left+Math.sin(phase)*.95*fade,
  top+Math.cos(phase*.85)*.32*fade,size,size);
}
function drawStruckZombie(z){
 drawTrashContact(z);
 const entering=Number.isFinite(z.arrivalTime);
 if(entering){g.save();g.globalAlpha=Math.max(0,Math.min(1,z.arrivalTime/.62));}
 if(z.fortressFrozenUntil>clock){
  drawFrozenZombie(z);if(entering)g.restore();return;
 }
 const localHit=clock>=(z.hitShakeFrom||0)&&clock<(z.hitShakeUntil||0);
 const deviceBossHit=z.boss&&clock<(z.fortressBossFlashUntil||0);
 const active=localHit||deviceBossHit;
 if(!active){delete z.fortressContactCel;
  if(z.bankFlashUntil>clock){g.save();g.filter='brightness(1.35)';zombie(knockVisualPosition(z));g.restore()}
  else zombie(knockVisualPosition(z));if(entering)g.restore();return}
 const t=localHit?clock-(z.hitShakeFrom||clock):Math.max(0,clock-(z.fortressBossFlashUntil-.19)),duration=localHit?Math.max(.001,(z.hitShakeUntil||clock)-(z.hitShakeFrom||clock)):.19;
 const phase=t/duration;
 g.save();
 // First two-thirds are an unmistakable white contact flash. No blurry glow.
 g.filter=phase<.68?'brightness(2.25) saturate(.52)':'brightness(1.64) saturate(.83)';
 const jitter=hitShakeOffset(t,duration,!!z.boss);
 g.translate(jitter.x,jitter.y);
 const liveCel=enemyAnimationClock;
 if(Number.isFinite(z.fortressContactCel))enemyAnimationClock=z.fortressContactCel;
 try{zombie(knockVisualPosition(z))}finally{enemyAnimationClock=liveCel;g.restore()}
 if(entering)g.restore();
}
// Capture only data needed to repaint a historical approved sprite cel.
// Weak keys let removed enemies/projectiles release their rings immediately.
function resetSlowEchoHistory(){slowEchoHistory=new WeakMap();slowEchoNextSample=-Infinity;if(typeof resetSlowTintCache==='function')resetSlowTintCache()}
function slowEchoSlot(actor){
 let ring=slowEchoHistory.get(actor);
 if(!ring){ring={next:0,count:0,slots:new Array(SLOW_ECHO_CAPACITY)};slowEchoHistory.set(actor,ring)}
 const slot=ring.slots[ring.next]||(ring.slots[ring.next]={});
 ring.next=(ring.next+1)%SLOW_ECHO_CAPACITY;
 ring.count=Math.min(SLOW_ECHO_CAPACITY,ring.count+1);
 slot.at=clock;return slot;
}
function recordSlowEchoHistory(){
 if(mode!=='playing'||clock+1e-8<slowEchoNextSample)return;
 slowEchoNextSample=clock+SLOW_ECHO_INTERVAL;
 for(const z of foes){
  const slot=slowEchoSlot(z),pos=knockVisualPosition(z);
  let lift=0;
  if(z.moleLaunch&&z.knockTime>0)lift=12*Math.sin(Math.PI*knockMotionProgress(z));
  else if(z.moleHop)lift=10*Math.sin(Math.PI*clamp(z.moleHop.travel/Math.max(1,z.moleHop.total),0,1));
  // The original atlas selects a frame from this saved clock and pose.
  slot.cel=z.fortressFrozenUntil>clock&&Number.isFinite(z.fortressFrozenFrame)?z.fortressFrozenFrame:
   Number.isFinite(z.fortressContactCel)?z.fortressContactCel:enemyAnimationClock;
  slot.alpha=Number.isFinite(z.arrivalTime)?Math.max(0,Math.min(1,z.arrivalTime/.62)):1;
  const q=slot.z||(slot.z={});
  q.x=pos.x;q.y=pos.y-lift;q.w=z.w;q.h=z.h;
  q.boss=z.boss;q.bossForm=z.bossForm;q.form=z.form;q.kind=z.kind;q.eliteKind=z.eliteKind;
  q.seed=z.seed;q.moveDir=z.moveDir;q.recoil=z.recoil;q.hitHold=z.hitHold;
  q.expression=z.expression;q.hairColor=z.hairColor;q.paletteVariant=z.paletteVariant;
  q.miniScale=z.miniScale;q.miniBaseW=z.miniBaseW;q.miniBaseH=z.miniBaseH;
  q.throwWindup=z.throwWindup;q.spitWindup=z.spitWindup;q.breakoutTime=z.breakoutTime;
  if(z.eliteMotion){const em=q.eliteMotion||{};em.tag=z.eliteMotion.tag;em.t=z.eliteMotion.t;q.eliteMotion=em}
  else q.eliteMotion=null;
  q.flash=0;q.burn=0;
 }
 for(const p of bossTrashShots){
  const slot=slowEchoSlot(p),pos=bossTrashProjectilePosition(p);
  slot.x=pos.x;slot.y=pos.y;slot.t=pos.t;slot.type=p.type;slot.kind=p.kind;
  slot.eliteKind=p.eliteKind;slot.enemyScale=p.enemyScale||1;slot.spitScale=p.spitScale||1;
  slot.angle=p.type==='spit'?Math.atan2(p.ty-p.sy,p.tx-p.sx):pos.t*Math.PI*5;
 }
}
function slowEchoAt(actor){
 const ring=slowEchoHistory.get(actor);if(!ring?.count)return null;
 const cutoff=clock-SLOW_ECHO_DELAY+1e-8;
 let chosen=null;
 // The oldest sample is normally just before the cutoff. Never show a
 // younger frame as a fake 3-second echo for newly spawned actors.
 for(let i=0;i<ring.count;i++){
  const q=ring.slots[(ring.next-ring.count+SLOW_ECHO_CAPACITY+i)%SLOW_ECHO_CAPACITY];
  if(q.at>cutoff)break;
  chosen=q;
 }
 return chosen;
}
function slowEchoVisible(){
 return (mode==='playing'||mode==='paused'&&resumeMode==='playing')&&has('slow');
}
function drawSlowZombieEchoes(){
 if(!slowEchoVisible())return;
 const liveCel=enemyAnimationClock;
 g.save();g.globalAlpha*=SLOW_ECHO_ALPHA;
 try{
  for(const z of foes){
   const q=slowEchoAt(z);if(!q||q.alpha<=0)continue;
   enemyAnimationClock=q.cel;
   g.save();g.globalAlpha*=q.alpha;
   try{zombie(q.z)}finally{g.restore()}
  }
 }finally{enemyAnimationClock=liveCel;g.restore()}
}
function drawSlowProjectileEchoes(){
 if(!slowEchoVisible())return;
 g.save();g.globalAlpha*=SLOW_ECHO_ALPHA;
 try{
  for(const p of bossTrashShots){
   const q=slowEchoAt(p);if(!q)continue;
   if(q.type==='spit'){
    // Reuse the cached neon bitmap but do not add a second bloom pass.
    const sprite=spitSprite(Math.round(11+3*Math.sin(Math.PI*q.t)));
    paintSpit(typeof slowTintBitmap==='function'?slowTintBitmap(sprite):sprite,q.x,q.y,q.angle,1,q.spitScale);
   }else{
    const flare=1-Math.abs(2*q.t-1);
    const size=q.eliteKind===0?22+5*flare:q.eliteKind===1?24+6*flare:29+7*flare;
    drawThrowable(q.kind,q.x,q.y,size*q.enemyScale,q.angle,true);
   }
  }
 }finally{g.restore()}
}
function draw(){recordSlowEchoHistory();trailRenderFrame++;if((!fxRenderer||fxRenderer.height!==H)&&window.FXRenderer)fxRenderer=new window.FXRenderer(W,H);if(fxRenderer&&fxEnabled){fxRenderer.begin()}g.clearRect(0,0,W,H);g.save();const shakeOffset=cameraOffset();if(shakeOffset)g.translate(shakeOffset.x,shakeOffset.y);const zoom=heroCameraZoom();const spring=heroCameraSpring(zoom);if(spring){if(spring.stretch>1){g.translate(0,spring.pivotY);g.scale(1,spring.stretch);g.translate(0,-spring.pivotY)}g.translate(0,spring.offset)}if(zoom){g.translate(zoom.x,zoom.y);g.scale(zoom.scale,zoom.scale);g.translate(-zoom.x,-zoom.y)}background();drawWorldGroundShadows();drawTrashContact('world');drawCrowd();drawDodgeGhosts();if(isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))fortress?.draw(g,mode==='building'||mode==='paused'&&resumeMode==='building',fxEnabled?paint=>{paint(g);captureBloom(()=>paint(g))}:null);
 // Visible afterimage and impact line show actual displacement and chain hits.
 if(fxEnabled)for(const z of foes)if((z.knockTime||0)>0&&knockMotionProgress(z)>0){
  // A ghost streak must not be drawn straight through a barricade either.
  if((isFortress()||(typeof hasEndlessStructures==='function'&&hasEndlessStructures()))&&fortress&&
    !fortress.isPathClear(z,z.knockFromX,z.knockFromY,z.x,z.y))continue;
  const fade=Math.min(1,z.knockTime/(z.knockDuration||KNOCK_TRAIL_LIFE));
  g.save();g.globalAlpha=.4*fade;
  zombie({...z,x:z.knockFromX,y:z.knockFromY,flash:0,burn:0,knockTime:0});
  g.globalAlpha=.7*fade;g.strokeStyle=z.knockChain?'#b9ffe2':'#fff2bb';
  g.lineWidth=z.knockChain?3:4;g.lineCap='round';
  const visible=knockVisualPosition(z);
  g.beginPath();g.moveTo(z.knockFromX+z.w/2,z.knockFromY+z.h/2);
  g.lineTo(visible.x+z.w/2,visible.y+z.h/2);g.stroke();g.restore();
 }
 drawSlowZombieEchoes();for(const z of foes)drawStruckZombie(z);drawBurningOverlays();drawFireWaves();drawEnemyDeaths();drawImpactFlashes();if(has('shield'))luminous(()=>{g.shadowColor='#b9f684';g.shadowBlur=10;rect(21,SHIELD_LINE_Y,408,3,'#b9f684');g.shadowBlur=0});drawHeroStrikePresentation();drawBazooka();for(const item of items)drawFallingItem(item);drawItemPickupFX();
drawKillCombo();drawBarrelBlasts();
 // v101: This is set once per render to avoid extra has()/ball-count checks
 // inside each spark and flame loop; standalone legacy tests default to false.
 // Skill artwork is invariant across ball counts and measured frame load.
 // Elemental shots own one broad body at every detail level.
 const elementalTrail=fxEnabled&&activeTrailRamp();
 for(const b of balls){
  const r=((has('power')?12:8)*(typeof miniBallScale==='function'?miniBallScale():1));
  const palette=HERO_BALL_TRAILS[selectedHero]||HERO_BALL_TRAILS[0];
  const trailPath=getBallRenderTrailPath(b,r);
  if(!elementalTrail){
   drawHeroBallTrail(b,r,trailPath);
   if(fxEnabled)luminous(()=>drawTrailEdgeHalo(b,r,trailPath),
    ()=>drawTrailEdgeHalo(b,r,trailPath,.72));
  }else{
   drawBallSkillTrail(b,r,trailPath);
  }
  // Capture only the single continuous ribbon, not all fire ornaments.
  if(elementalTrail&&trailPath.length>=2)captureBloom(()=>drawElementalTrailBody(b,r,trailPath,has('fire'),has('pierce'),.46));
  if(elementalTrail)drawSimpleSkillTrailAccent(b,r,trailPath);
  drawHeroBallSprite(b,r,palette.main);
 }
 drawBallVanish();
  if(particles.length)luminous(()=>{
  g.save();
  for(const p of particles){
   // Cull only completely offscreen pixels, including the maximum glow fringe.
   if(p.x<-32||p.x>W+32||p.y<-32||p.y>H+32)continue;
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
 drawStageIntro();
 if(runMode!=='endless'&&(mode==='clearing'||mode==='paused'&&resumeMode==='clearing'))drawClear();}
// V349: measure real RAF and CPU work. Adapt secondary effects only.
let perfTier=0,perfSlow=0,perfFast=0,perfWorkEMA=0,perfRafEMA=16.7,perfTag=null,perfDebugAt=0;
const PERF_DEBUG=typeof location!=='undefined'&&typeof URLSearchParams!=='undefined'&&new URLSearchParams(location.search).get('perfDebug')==='1';
const perfStats={tier:0,fps:60,updateMs:0,drawMs:0,workMs:0,frameMs:16.7,peakMs:0,slowFrames:0};
function updatePerfBudget(t,elapsed,updateMs,drawMs,workMs){
 if(elapsed>0&&elapsed<.2){
  const ms=elapsed*1000;perfRafEMA+=(ms-perfRafEMA)*.08;perfWorkEMA+=(workMs-perfWorkEMA)*.12;
  const busy=perfWorkEMA>14.5||perfRafEMA>21.5,severe=perfWorkEMA>21||perfRafEMA>29;
  const healthy=perfWorkEMA<10.5&&perfRafEMA<18.5;
  if(busy){perfSlow++;perfFast=0}else{perfSlow=0;perfFast=healthy?perfFast+1:0}
  if(perfSlow>=8&&perfTier<(severe?2:1)){perfTier++;perfSlow=0}
  if(perfFast>=100&&perfTier>0){perfTier--;perfFast=0}
  perfStats.frameMs=ms;perfStats.fps=1000/perfRafEMA;
  perfStats.peakMs=Math.max(perfStats.peakMs,ms);if(ms>22)perfStats.slowFrames++;
 }
 Object.assign(perfStats,{tier:perfTier,updateMs,drawMs,workMs});
 if(PERF_DEBUG&&t-perfDebugAt>500&&typeof document.createElement==='function'){
  perfDebugAt=t;
  if(!perfTag){perfTag=document.createElement('div');perfTag.style.cssText='position:fixed;top:4px;left:4px;z-index:2147483647;pointer-events:none;background:#000c;color:#d5ffc4;font:11px monospace;padding:5px';document.body?.appendChild(perfTag)}
  perfTag.textContent='FPS '+perfStats.fps.toFixed(0)+' | update '+updateMs.toFixed(1)+'ms | draw '+drawMs.toFixed(1)+'ms | FX '+perfTier+' | slow '+perfStats.slowFrames;
 }
}
window.ZZPerf=perfStats;
function frame(t){
 // Keep game time at real pace on busy frames, with bounded collision steps.
 const rawElapsed=last?Math.max(0,(t-last)/1000):0;
 const elapsed=Math.min(.10,rawElapsed);
 last=t;
 if(mode==='stageComic'){requestAnimationFrame(frame);return}
 if(mode==='stageNumber'){draw();requestAnimationFrame(frame);return}
 const steps=Math.max(1,Math.ceil(elapsed*30-1e-9));
 const begin=feedbackNow();frameUpdating=true;
 try{for(let i=0;i<steps;i++)update(elapsed/steps)}finally{frameUpdating=false}
 if(hudDirty){hudDirty=false;hud()}
 const updated=feedbackNow();
 warmTrailLighting();warmSelectedBallTint();draw();
 const rendered=feedbackNow();
 music();warmCombatSfx();
 updatePerfBudget(t,rawElapsed,updated-begin,rendered-updated,feedbackNow()-begin);
 requestAnimationFrame(frame);
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
 if(i===4)return '<img class="hero-portrait hero-vehicle-portrait hero-vehicle-scarlet row-4" src="assets/ip/scarlet-portrait-v277.webp" alt="'+h.name+' · 스포츠카와 명품백" draggable="false">';
 return '<span class="hero-portrait hero-vehicle-portrait row-'+i+'" role="img" aria-label="'+h.name+' · 차량과 전용 무기"></span>';
}
// Menu-only character stat gauges; native hero portraits and gameplay values stay unchanged.
function heroMiniStats(h){
 return window.ZZGarage?.heroStatMarkup?.(h,window.ZZProgression?.garage?.(),window.ZZProgression,HEROES.indexOf(h))||'';
}
function renderHeroes(){for(let i=0;i<HEROES.length;i++){let h=HEROES[i],el=$('hero-'+i);if(!el)continue;if(i===3)el.hidden=!window.ZZProgression?.garage().mechanic;if(i===4)el.hidden=false;el.innerHTML=portrait(h)+'<b>'+h.name+'</b><small>'+h.role+'</small><span>'+h.desc+'</span>';if(mode==='menu'||mode==='over')el.innerHTML+=heroMiniStats(h);el.setAttribute('aria-pressed',String(i===selectedHero));el.onclick=()=>{if(mode!=='menu'&&mode!=='over')return;selectedHero=i;renderHeroes();draw()}}$('hero-stats').textContent=hero().stats;if(mode==='menu')$('start').textContent='Game Start!';window.ZZRefreshHeroReel?.()}

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
// v315: Three real haptic modes. New installs default to player-only.
 // Read the old toggle ONLY when the 3-mode preference does not exist,
 // so existing explicit ON/OFF users do not unexpectedly change settings.
const HAPTICS_STORAGE_KEY='zz-device-haptics-enabled';
const HAPTICS_MODE_STORAGE_KEY='zz-device-haptics-mode';
const HAPTIC_MODES=['off','player','full'];
let hapticsMode='player';
try{
 if(typeof localStorage!=='undefined'){
  const saved=localStorage.getItem(HAPTICS_MODE_STORAGE_KEY);
  if(HAPTIC_MODES.includes(saved))hapticsMode=saved;
  else{
   const legacy=localStorage.getItem(HAPTICS_STORAGE_KEY);
   if(legacy==='0')hapticsMode='off';
   else if(legacy==='1')hapticsMode='full';
  }
 }
}catch{}
let hapticsEnabled=hapticsMode!=='off';
const FEEDBACK_PRESETS={
 wall:{v:28,s:0.28,p:0},
 racket:{v:[205,32,235],s:0.9,p:13},
 car:{v:[205,32,235],s:1.3,p:13},
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
 serve:{v:[205,32,235],s:0.4,p:13},
 start:{v:25,s:0,p:1},
 wave:{v:[45,30,45],s:1.15,p:3},
 victory:{v:[55,35,110],s:2,p:6},
 groggyRecover:{v:[42,28,62],s:0,p:6}
};
// Player-only mode vibrates exclusively for the player's own ball controls,
// direct interception of a zombie projectile, and groggy entry/recovery.
// Zombie damage/deaths, explosions, drops, civilian actions, walls and stage
// transitions still keep the same SCREEN SHAKE / sounds, but not motor output.
const PLAYER_HAPTIC_KINDS=new Set([
 'serve','racket','car','poisonBlock','blocked','groggy','groggyRecover'
]);
// V415: compact real-time camera impulse. No queued or extended shakes.
const screenShake={power:0,started:0,until:0,phase:0,critical:false,hero:false,zoom:0,zoomAt:-Infinity,zoomDuration:100,springPower:0,springTailMs:0,focusX:225,focusY:584};
const feedbackNow=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now();
const CAMERA_REST_MS=45;
const CAMERA_AMPLITUDE_SCALE=1.15;
// V428: measure the incoming velocity before reflection, not the outgoing shot.
function overheadReturn(vx,vy){return vy>0&&Math.abs(vx)<=vy}
function cameraFeedback(strength,zombieImpact=false,criticalLabel=false,heroStrike=false,serveStrike=false,overhead=false){
 if(!(strength>0))return;
 const now=feedbackNow();
 // V418: own strike gets the highest priority, a single bounded pulse and
 // a short zoom toward the hero. Rapid multiball contacts do not accumulate.
 if(heroStrike){
  if(screenShake.hero&&screenShake.until>0&&now<screenShake.until+CAMERA_REST_MS)return;
  // V423: serve and return have independent zoom ranges and recovery times.
  screenShake.power=serveStrike?12:9.5;screenShake.started=now;screenShake.until=now+100;
  screenShake.phase=(screenShake.phase+1.41)%6.283;
  screenShake.hero=true;screenShake.critical=false;
  screenShake.zoom=serveStrike?.10+Math.random()*.04:.04+Math.random()*.02;screenShake.zoomAt=now;screenShake.zoomDuration=serveStrike?200:overhead?180:100;
  // V431: a distinct vertical spring, never a second shake impulse.
  screenShake.springPower=serveStrike?4:overhead?3.5:2.5;
  screenShake.springTailMs=serveStrike?120:95;
  screenShake.focusX=typeof car==='number'?Math.max(45,Math.min(405,car)):225;
  // V427: frame the action above the hero. The world transform shifts the
  // hero downward on screen while its position, collisions and input stay put.
  // V429: nearly top-anchored vertical framing creates a clear downward
  // hero displacement without exposing empty canvas or increasing zoom.
  screenShake.focusY=!serveStrike&&overhead?20:(typeof PY==='number'?PY:584)-185;
  cameraKick=screenShake.power;lastCameraFeedback=now;return;
 }
 if(screenShake.hero&&screenShake.until>0&&now<screenShake.until+CAMERA_REST_MS)return;
 // V416: a newly displayed CRITICAL label may replace an ordinary shake
 // (even during its rest), but never restart another critical envelope.
 if(criticalLabel){
  if(screenShake.critical&&screenShake.until>0&&now<screenShake.until+CAMERA_REST_MS)return;
  screenShake.power=8*.82*CAMERA_AMPLITUDE_SCALE;screenShake.started=now;screenShake.until=now+84;
  screenShake.phase=(screenShake.phase+1.41)%6.283;screenShake.critical=true;screenShake.hero=false;
  cameraKick=screenShake.power;lastCameraFeedback=now;return;
 }
 const power=(strength<.5?.45:Math.min(5.2,(1.7+2.4*strength)*.65))*(zombieImpact?.82:1)*CAMERA_AMPLITUDE_SCALE;
 const life=(strength>=4?90:strength>=2?75:60)*(zombieImpact?.8:1);
 // Stronger impacts can take over amplitude, never restart phase or extend
 // the current impulse. Ignore every request during the quiet interval.
 if(now<screenShake.until){
  if(power>screenShake.power){screenShake.power=power;cameraKick=power}
  return;
 }
 if(screenShake.until>0&&now<screenShake.until+CAMERA_REST_MS)return;
 screenShake.power=power;screenShake.started=now;screenShake.until=now+life;screenShake.critical=false;screenShake.hero=false;
 screenShake.phase=(screenShake.phase+1.41)%6.283;
 cameraKick=power;lastCameraFeedback=now;
}
function cameraOffset(){
 const now=feedbackNow(),remaining=screenShake.until-now;
 if(remaining<=0)return null;
 const life=Math.max(1,screenShake.until-screenShake.started);
 const fade=Math.pow(Math.min(1,remaining/life),.8);
 const power=screenShake.power*fade;
 const phase=screenShake.phase+(now-screenShake.started)*.1344;
 return {x:Math.sin(phase)*power*.92,y:Math.cos(phase*1.2)*power*.72};
}
// The zoom only transforms the world render. HUD, collision space and input
// stay in their original coordinates. Bloom captures the same world matrix.
function heroCameraZoom(){
 if(screenShake.zoom<=0||screenShake.until<=0||(typeof mode!=='undefined'&&mode!=='playing'))return null;
 const age=feedbackNow()-screenShake.zoomAt;
 if(age<0||age>=screenShake.zoomDuration)return null;
 // Hard cut to the close shot on frame zero, then ease back smoothly.
 // Independent of the shorter shake, so subsequent enemy hits never cut it off.
 const u=age/screenShake.zoomDuration,t=1-u*u*(3-2*u);
 return {scale:1+screenShake.zoom*t,x:screenShake.focusX,y:screenShake.focusY};
}
// V431: press downward on impact, recover with the zoom, then overshoot
// upwards and rebound once at lower amplitude. Fixed time, not frame count.
function heroCameraSpring(zoom,height=typeof H==='number'?H:710){
 if(screenShake.zoom<=0||screenShake.until<=0||screenShake.springPower<=0||(typeof mode!=='undefined'&&mode!=='playing'))return null;
 const age=feedbackNow()-screenShake.zoomAt,duration=screenShake.zoomDuration;
 if(age<0||age>=duration+screenShake.springTailMs)return null;
 let offset;
 if(age<duration){
  const u=age/duration;
  offset=screenShake.springPower*(1-u)*(1-u);
 }else{
  const u=(age-duration)/screenShake.springTailMs;
  offset=-screenShake.springPower*Math.sin(2*Math.PI*u)*(1-u)*(1-u);
 }
 if(Math.abs(offset)<.0001)return null;
 // Compose the spring in screen space. A tiny vertical stretch around the
 // rendered hero pivot only when needed covers the top/bottom canvas edges.
 // It does not change the existing horizontal zoom or the hero's target Y.
 const scale=zoom?.scale||1,baseTop=zoom?(1-scale)*zoom.y:0;
 const top=baseTop+offset,bottom=top+height*scale;
 const pivot=(typeof PY==='number'?PY:584)+15;
 const pivotY=pivot*scale+top;
 let stretch=1;
 if(top>0&&pivotY>top)stretch=Math.max(stretch,pivotY/(pivotY-top));
 if(bottom<height&&bottom>pivotY)stretch=Math.max(stretch,(height-pivotY)/(bottom-pivotY));
 return {offset,pivotY,stretch};
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
function feedback(kind,criticalLabel=false,overhead=false){
 const cfg=FEEDBACK_PRESETS[kind];if(!cfg)return;
 if(kind==='serve'||kind==='racket'||kind==='car')cameraFeedback(cfg.s,false,false,true,kind==='serve',overhead);
 else if(kind==='critical'&&criticalLabel)cameraFeedback(cfg.s,true,true);
 else cameraFeedback(cfg.s,COMBAT_FEEDBACK_KINDS.has(kind));
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
 // typeof guard retains older isolated dispatcher tests (which deliberately
 // construct the original full-feedback scope without UI initialization).
 if(typeof hapticsMode!=='undefined'&&hapticsMode==='player'&&
    !PLAYER_HAPTIC_KINDS.has(kind)){
  report('플레이어 전용 모드에서 제외');return;
 }
 if(typeof navigator==='undefined'||typeof navigator.vibrate!=='function'){
  report('API 미지원');return;
 }
 if(typeof document!=='undefined'&&document.hidden){report('화면 비활성');return}
 const now=feedbackNow(),length=Array.isArray(cfg.v)?cfg.v.reduce((a,b)=>a+b,0):cfg.v;
 // Max-priority single dispatcher: own strike beats critical; wall/item cannot interrupt combat.
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
// One toggle cycles OFF -> PLAYER -> FULL -> OFF. It remains clickable
// in OFF mode; only its visual status is marked inactive.
const hapticsToggle=$('haptics-toggle');
const HAPTICS_MODE_LABELS={off:'진동 없음',player:'플레이어 중심',full:'풀 진동'};
function syncHapticsToggle(){
 if(!hapticsToggle)return;
 const label=HAPTICS_MODE_LABELS[hapticsMode];
 hapticsToggle.setAttribute('aria-pressed',String(hapticsMode!=='off'));
 hapticsToggle.setAttribute('aria-label','기기 진동 · '+label+' · 누르면 다음 모드');
 hapticsToggle.setAttribute('title','진동 없음 → 플레이어 중심 → 풀 진동');
 if(hapticsToggle.dataset){
  hapticsToggle.dataset.mode=hapticsMode;
  hapticsToggle.dataset.state=hapticsMode==='off'?'off':'on';
 }
 const status=hapticsToggle.querySelector?.('.option-status');
 if(status)status.textContent=label;
 else hapticsToggle.textContent='VIBRATION '+(hapticsMode==='off'?'OFF':hapticsMode==='player'?'PLAYER':'FULL');
}
if(hapticsToggle){
 syncHapticsToggle();
 hapticsToggle.addEventListener('click',()=>{
  const index=HAPTIC_MODES.indexOf(hapticsMode);
  hapticsMode=HAPTIC_MODES[(index+1)%HAPTIC_MODES.length];
  hapticsEnabled=hapticsMode!=='off';
  try{
   if(typeof localStorage!=='undefined'){
    localStorage.setItem(HAPTICS_MODE_STORAGE_KEY,hapticsMode);
    // Keep the historical toggle key in sync for an older offline build.
    localStorage.setItem(HAPTICS_STORAGE_KEY,hapticsEnabled?'1':'0');
   }
  }catch{}
  // Stop an old critical/boss vibration whenever the mode changes.
  // Otherwise a long FULL-mode pulse can bleed into PLAYER or OFF.
  buzzLockedUntil=0;buzzPriority=0;lastBuzz=0;
  try{if(typeof navigator!=='undefined'&&typeof navigator.vibrate==='function')navigator.vibrate(0)}catch{}
  syncHapticsToggle();
 });
}
function circleRect(x,y,r,box){const dx=x-clamp(x,box.x,box.x+box.w),dy=y-clamp(y,box.y,box.y+box.h);return dx*dx+dy*dy<=r*r}
function upwardBounce(b,center,half,top,r){const speed=clamp(Math.hypot(b.vx,b.vy),350,600),angle=clamp((b.x-center)/half,-1,1)*.95;b.vx=Math.sin(angle)*speed;b.vy=-Math.max(210,Math.cos(angle)*speed);b.y=top-r-1;b.lastHit=null;b.hitLock=0;combo=0;b.trail=[];ballImpact(b,'y',-1,'citizen')}
function carCollision(b,r,cx=car){const boxes=[{x:cx-52,y:621+VIEW_DELTA,w:104,h:33},{x:cx-57,y:626+VIEW_DELTA,w:13,h:24},{x:cx+44,y:626+VIEW_DELTA,w:13,h:24}];if(!boxes.some(box=>circleRect(b.x,b.y,r,box)))return false;const overhead=overheadReturn(b.vx,b.vy);upwardBounce(b,cx,57,621+VIEW_DELTA,r);swing=.18;heroAttackTime=HERO_ATTACK_DURATION;if(typeof triggerHeroStrike==='function')triggerHeroStrike(b.x);effect(b.x,623+VIEW_DELTA,'#fff49a',38,'NICE SAVE');burst(b.x,625+VIEW_DELTA,'#f8d87d',7);sfx('car');feedback('car',false,overhead);return true}
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
function drawThrowable(kind,x,y,size,turn=0,hostile=false){
 // Enlarge approved 36-item sheet uniformly, without resizing the source PNG.
 size*=THROWABLE_SIZE_SCALE;
 const sheet=window.ZZThrowablesV159;
 const tinted=hostile&&typeof slowTintOn==='function'&&slowTintOn();
 if(sheet?.draw?.(tinted?slowTintContext(g):g,kind,x,y,size,turn))return;
 // Loading fallback is a small solid package, never an old zombie/vector.
 g.save();g.translate(x,y);g.rotate(turn);
 rect(-size*.32,-size*.20,size*.64,size*.40,tinted?'#617e9a':'#7a5741');
 rect(-size*.30,-size*.23,size*.6,size*.08,tinted?'#9bb4a6':'#e0ae66');
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
// V250: held trash belongs to the ZOMBIE'S VISIBLE pose, never its eagerly
// committed knockback collider destination. Share the same tween and 60fps
// hit-shake used by drawStruckZombie; there is no independent follower lerp.
function zombieHandVisualPosition(z){
 const pos=knockVisualPosition(z);
 let shakeX=0,shakeY=0;
 if(clock>=(z.hitShakeFrom||0)&&clock<(z.hitShakeUntil||0)){
  const t=clock-(z.hitShakeFrom||clock);
  const duration=Math.max(.001,(z.hitShakeUntil||clock)-(z.hitShakeFrom||clock));
  const shake=hitShakeOffset(t,duration,!!z.boss);
  shakeX=shake.x;shakeY=shake.y;
 }
 return {x:pos.x+shakeX,y:pos.y+shakeY};
}
function heldTrashAnchor(z){
 const pos=zombieHandVisualPosition(z);
 return {x:pos.x+z.w*.75,y:pos.y+(z.boss?-4:4)};
}
// Hand-key animation (one complete windup, no textures or frame allocations):
// invisible pull-up -> quick high overshoot -> sharp catch -> tiny settle.
// Progress comes from the real throwWindup timer, including slow-motion.
const TRASH_RAISE_KEYS=[
 {t:0,y:17,s:.72,a:0,r:-.48},
 {t:.18,y:-6,s:.90,a:.85,r:-.28},
 {t:.46,y:-28,s:1.08,a:1,r:.11},
 {t:.55,y:-31,s:1.08,a:1,r:.14},
 {t:.74,y:4,s:1,a:1,r:-.28},
 {t:.86,y:-3,s:1,a:1,r:-.18},
 {t:1,y:0,s:1,a:1,r:-.20}
];
// Matching preparation keys for the neon toxin: fade up out of the mouth,
// leap above it, then tap/catch back to the launch anchor. Deliberately
// smaller than a trash item's arc; enemy sprite frames are unchanged.
const SPIT_RAISE_KEYS=[
 {t:0,y:10,s:.60,a:0,r:-.22},
 {t:.17,y:-4,s:.80,a:.78,r:-.15},
 {t:.43,y:-18,s:1.09,a:1,r:.12},
 {t:.54,y:-20,s:1.10,a:1,r:.15},
 {t:.73,y:4,s:1,a:1,r:-.08},
 {t:.86,y:-2,s:1,a:1,r:.03},
 {t:1,y:0,s:1,a:1,r:0}
];
function raisedTrashPose(progress,keys=TRASH_RAISE_KEYS){
 const p=clamp(progress,0,1);
 for(let i=1;i<keys.length;i++){
  const b=keys[i],a=keys[i-1];
  if(p>b.t&&i<keys.length-1)continue;
  const t=clamp((p-a.t)/(b.t-a.t),0,1);
  const u=t*t*(3-2*t),lerp=(x,y)=>x+(y-x)*u;
  return {y:lerp(a.y,b.y),scale:lerp(a.s,b.s),
   alpha:lerp(a.a,b.a),turn:lerp(a.r,b.r)};
 }
 return {y:0,scale:1,alpha:1,turn:0};
}
function raisedSpitPose(progress){return raisedTrashPose(progress,SPIT_RAISE_KEYS)}
function spitMouthAnchor(z){
 const pos=zombieHandVisualPosition(z);
 return {x:pos.x+z.w*.5,y:pos.y+z.h*.39};
}
// All four boss variants use the identical venom pickup keys. Magnify only
// their presentation so the action reads clearly on their much larger art;
// the 60fps animation clock, poison damage and hitbox remain unchanged.
function spitBossPresentation(z){
 return {lift:z.boss?1.35:1,size:z.boss?1.30:1};
}
function launchTrashShot(z,citizen){
 const elite=eliteTrashThrower(z),hand=heldTrashAnchor(z);
 // Launch precisely from the final held location: no one-frame pop between
 // caught item and in-flight projectile, even during a chain knockback.
 bossTrashShots.push({sx:hand.x,sy:hand.y,
  tx:citizen.x,ty:citizen.y-13,citizen,kind:z.throwKind,
  enemyScale:z.miniScale||1,
  duration:(elite?1.15:1.05)+Math.random()*.22,t:0,
  arc:(elite?67:56)+Math.random()*28,eliteKind:elite?z.eliteKind:null});
 sfx('launch');burst(hand.x,hand.y,'#ffc67e',elite?5:7);
}
// One projectile list for all hostile trash and neon-green spit.
function updatePoisonStatus(dt){
 if(!poison&&!poisonGrace&&!groggyTime&&!poisonFlash&&!poisonGaugeAlpha)return;
 const wasGroggy=groggyTime;
 groggyTime=Math.max(0,groggyTime-dt);
 if(wasGroggy>0&&groggyTime===0){
  // Recovered: remove ALL character tint immediately, not just the stun.
  poison=0;poisonGrace=0;poisonFlash=0;
  // Recovery is a meaningful character event even if no poison remains.
  // The guard preserves isolated poison-gauge regression harnesses.
  if(typeof feedback==='function')feedback('groggyRecover');
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
 const r=(shot.type==='spit'?8:13)*(shot.enemyScale||1);
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
  // Filter's passive toxic resistance applies on EVERY blocked projectile;
  // the timed spit cleansing remains an additional unique effect.
  // Mini/Barricade zombies already stamp their size onto trash and venom
  // shots at launch (enemyScale=.5). Their poison payload must shrink too:
  // spit 34 -> 17, trash 20 -> 10, before resistance reductions.
  // Normal and endless shots keep their original enemyScale=1 damage.
  const toxicPayload=(shot.type==='spit'?POISON_SPIT:POISON_TRASH)*(shot.enemyScale??1);
  poison=Math.min(POISON_MAX,poison+(1-filtered/100)*(1-garageCombat().resist/100)*toxicPayload*(1-growth('poisonResist')*.06));
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
 // Start exactly at the held venom anchor, keeping the boss-sized venom
 // consistent between the final catch frame and the projectile's first frame.
 const mouth=spitMouthAnchor(z),presentation=spitBossPresentation(z);
 bossTrashShots.push({
  type:'spit',sx:mouth.x,sy:mouth.y,
  enemyScale:z.miniScale||1,spitScale:presentation.size*(z.miniScale||1),
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
   if(shot.type!=='spit')queueContact(trashContactFX,after.x,after.y,0,-1,'enemy',"hero",shot.enemyScale||1);
   blockHostileShot(shot,after.x,after.y);
   continue;
  }
  if(shot.t<shot.duration){i++;continue}
  bossTrashShots.splice(i,1);
  if(has('shield')){
   if(shot.type!=='spit')queueContact(trashContactFX,shot.tx,SHIELD_LINE_Y,0,-1,'enemy','world',shot.enemyScale||1);
   effect(shot.tx,SHIELD_LINE_Y,'#b9f684',36,'BLOCK!');
   burst(shot.tx,SHIELD_LINE_Y,'#b9f684',9);sfx('shield');feedback('shield');
  }else{
   const citizen=shot.citizen;
   if(citizen?.alive){
    if(shot.type!=='spit')queueContact(trashContactFX,shot.tx,shot.ty,0,-1,'enemy',citizen,shot.enemyScale||1);
    defeatCitizenByTrash(citizen,shot.type==='spit'?'spit':'trash');
   }
   else{
    if(shot.type!=='spit')queueContact(trashContactFX,shot.tx,shot.ty,0,-1,'ground','world',shot.enemyScale||1);
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
  z.throwWindupTotal=z.throwWindup; // keyframe clock, not a separate timer
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
  z.spitWindupTotal=z.spitWindup; // use the real slowed prep clock
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
function paintSpit(sprite,x,y,angle,alpha=1,scale=1){
 if(alpha<=0)return;
 g.save();g.globalAlpha*=alpha;
 g.translate(x,y);g.rotate(angle);g.scale(scale,scale);
 g.drawImage(sprite,-40,-32);g.restore();
}
function drawNeonSpit(x,y,t,angle=0,alpha=1,scale=1){
 if(alpha<=0)return; // no one-frame flash before the visible reveal
 const base=spitSprite(Math.round(11+3*Math.sin(Math.PI*t)));
 const sprite=typeof slowTintOn==='function'&&slowTintOn()?slowTintBitmap(base):base;
 paintSpit(sprite,x,y,angle,alpha,scale);
 // The ADD/bloom pass must use the very same reveal alpha and pickup scale,
 // otherwise full-strength bloom flashes while the toxin is still invisible.
 if(fxEnabled&&fxRenderer)spitBloomDraws.push(sprite,x,y,angle,alpha,scale);
}
function drawSpitBloom(){
 for(let i=0;i<spitBloomDraws.length;i+=6){
  paintSpit(spitBloomDraws[i],spitBloomDraws[i+1],spitBloomDraws[i+2],
   spitBloomDraws[i+3],spitBloomDraws[i+4],spitBloomDraws[i+5]);
 }
}
function drawBossTrashShots(){
 spitBloomDraws.length=0;
 if(typeof drawSlowProjectileEchoes==='function')drawSlowProjectileEchoes();
 for(const z of foes){
  if(trashThrower(z)&&z.throwWindup>0){
   const total=Math.max(.001,z.throwWindupTotal||z.throwWindup);
   const phase=raisedTrashPose(1-z.throwWindup/total);
   const hand=heldTrashAnchor(z),size=z.boss?40:z.eliteKind===0?24:28;
   g.save();
   g.globalAlpha*=phase.alpha;
   const mini=z.miniScale||1;
   drawThrowable(z.throwKind,hand.x,hand.y+phase.y*mini,size*phase.scale*mini,phase.turn,true);
   g.restore();
  }
  if(spitThrower(z)&&z.spitWindup>0){
   const total=Math.max(.001,z.spitWindupTotal||z.spitWindup);
   const pose=raisedSpitPose(1-z.spitWindup/total);
   const mouth=spitMouthAnchor(z),presentation=spitBossPresentation(z);
   const mini=z.miniScale||1;
   drawNeonSpit(mouth.x,mouth.y+pose.y*presentation.lift*mini,
    .15,pose.turn,pose.alpha,pose.scale*presentation.size*mini);
  }
 }
 for(const p of bossTrashShots){
  const pos=bossTrashProjectilePosition(p);
  if(p.type==='spit'){
   const angle=Math.atan2(p.ty-p.sy,p.tx-p.sx);
   drawNeonSpit(pos.x,pos.y,pos.t,angle,1,p.spitScale||1);
  }else{
   const flare=1-Math.abs(2*pos.t-1);
   const size=p.eliteKind===0?22+5*flare:p.eliteKind===1?24+6*flare:29+7*flare;
   drawThrowable(p.kind,pos.x,pos.y,size*(p.enemyScale||1),pos.t*Math.PI*5,true);
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
function drawStageIntro(){
 const scene=mode==='paused'?resumeMode:mode;
 const shifting=scene==='endlessShift';
 if(!shifting&&scene!=='playing'&&scene!=='stageNumber')return;
 if(shifting&&!endlessShiftSpawned&&enemyDeaths.some(d=>!d.done))return;
 const fade=Math.max(0,Math.min(1,1-(clock-introFadeAt)/INTRO_FADE_SECONDS));
 if(fade<=0)return;
 g.save();
 g.globalAlpha=shifting?Math.min(1,endlessShiftTime/.24):fade*fade*(3-2*fade);
 g.textAlign='center';
 let subtitleY;
 if(runMode==='endless'){
  const number=endlessWaveNumber()+(shifting&&!endlessShiftSpawned?1:0);
  g.font='400 19px "Press Start 2P",monospace';g.fillStyle='#e9ffbd';
  g.shadowColor='#132926';g.shadowBlur=8;
  arcadeGlowText('WAVE '+String(number).padStart(2,'0'),W/2,315,9);
  subtitleY=338;
 }else{
  drawStageAnnouncement('STAGE '+String(wave).padStart(2,'0'),'#ffffff',32);
  subtitleY=H/2+34;
 }
 g.font='bold 12px Arial, sans-serif';g.fillStyle='#d7e9e0';
 g.shadowColor='#132926';g.shadowBlur=8;
 g.fillText(waveQuip,W/2,subtitleY,W-48);
 g.restore();
}
// Screen-space announcement: crisp black outline, bright face and a soft local bloom.
function drawStageAnnouncement(word,color,size){
 const x=W/2,y=H/2;
 g.save();g.textAlign='center';g.textBaseline='middle';
 g.font='400 '+size+'px "Press Start 2P",monospace';
 g.lineJoin='round';g.lineCap='round';
 const parts=word.endsWith(' !')?[word.slice(0,-2),'!']:[word];
 const widths=parts.map(p=>{
  const width=g.measureText?.(p)?.width;
  return Number.isFinite(width)&&width>0?width:p.length*size;
 });
 const gap=parts.length>1?size*.42:0;
 const natural=widths.reduce((a,b)=>a+b,0)+gap;
 const fit=Math.min(1,(W-36)/Math.max(1,natural));
 let left=x-natural*fit/2;
 const runs=parts.map((p,i)=>{
  const width=widths[i]*fit,cx=left+width/2;
  left+=width+gap*fit;
  return {p,cx,width};
 });
 const paint=stroke=>{for(const r of runs){
  if(stroke)g.strokeText(r.p,r.cx,y,r.width);
  else g.fillText(r.p,r.cx,y,r.width);
 }};
 if(fxEnabled){
  g.save();g.globalCompositeOperation='lighter';g.globalAlpha*=.7;
  g.fillStyle=color;g.shadowColor=color;g.shadowBlur=20;
  paint(false);g.restore();
 }
 g.strokeStyle='#000000';g.lineWidth=6;paint(true);
 g.fillStyle=color;paint(false);
 if(fxEnabled){
  g.save();g.globalCompositeOperation='lighter';g.globalAlpha*=.23;
  g.fillStyle=color;g.shadowColor=color;g.shadowBlur=9;
  paint(false);g.restore();
 }
 g.restore();
}
function drawClear(){if(enemyDeaths.some(d=>!d.done))return;drawStageAnnouncement('STAGE CLEAR !','#ffe32b',28)}
let inputPointer=null,inputX=0,armedServeBall=null;
function releaseInput(){inputPointer=null;armedServeBall=null}
function blocksInput(e){return !!e.target?.closest?.('button,a,input,select,textarea,summary,[role="button"],.overlay,.guide')}
function inputDown(e){if(mode==='building'){if(e.target===c&&fortress?.down(e,c))e.preventDefault?.();return}if(mode!=='playing'||blocksInput(e)||inputPointer!==null||(e.button!==undefined&&e.button!==0))return;inputPointer=e.pointerId;inputX=e.clientX;touchUsed=e.pointerType==='touch';target=car;e.preventDefault?.();try{c.setPointerCapture?.(e.pointerId)}catch{}armedServeBall=balls[0]?.held?balls[0]:null;unlockAudio()}
function inputMove(e){if(mode==='building'){if(fortress?.move(e,c))e.preventDefault?.();return}if(mode!=='playing')return;if(inputPointer===e.pointerId){const r=c.getBoundingClientRect(),width=r.width||W;target=clamp(target+(e.clientX-inputX)*W/width,72,W-72);inputX=e.clientX;
 if(armedServeBall===balls[0]&&armedServeBall?.held&&groggyTime<=0){car=target;const o=heldBallOffset();armedServeBall.x=car+o.x;armedServeBall.y=PY+o.y}
 e.preventDefault?.()}else if(inputPointer===null&&e.pointerType==='mouse'&&e.target===c){const r=c.getBoundingClientRect();target=clamp((e.clientX-r.left)/(r.width||W)*W,72,W-72)}}
function inputEnd(e){
 if(mode==='building')fortress?.up(e,c);
 if(e.pointerId!==inputPointer)return;
 const launch=e.type==='pointerup'&&mode==='playing'&&armedServeBall===balls[0]&&armedServeBall?.held;
 // Consume a final movement sample if the pointer was released between
 // move events. Release ownership before launching; lost capture cannot fire.
 if(launch&&Number.isFinite(e.clientX))inputMove(e);
 releaseInput();
 if(launch)serve();
}
document.addEventListener('pointerdown',inputDown,{passive:false});document.addEventListener('pointermove',inputMove,{passive:false});document.addEventListener('pointerup',inputEnd);document.addEventListener('pointercancel',inputEnd);c.addEventListener('lostpointercapture',inputEnd);
window.addEventListener('keydown',e=>{if($('garage-dialog')?.open||$('radio-dialog')?.open||$('upgrade-dialog')?.open)return;if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys[e.key]=true;if(e.code==='Space'){if(mode==='menu'||mode==='over')start(mode==='over'?runMode:'campaign');else if(mode==='paused')pause();else if(mode==='building')fortress?.startWithFeedback?.();else serve()}if(e.code==='Escape'){if(mode==='building')fortress?.cancel();else pause()}});window.addEventListener('keyup',e=>keys[e.key]=false);window.addEventListener('blur',()=>{keys={};if(mode==='playing'||mode==='clearing'||mode==='endlessShift'||mode==='building')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode==='playing'||mode==='endlessShift'||mode==='building'))pause()});$('start').onclick=()=>mode==='paused'?pause():start(mode==='over'?runMode:'campaign');$('pause-main-menu').onclick=()=>{if(mode==='paused')backToSelection()};$('pause').onclick=pause;$('sound').onclick=()=>{sound=sound&&!audioRunning()?true:!sound;unlockAudio();audioUI();if(sound)sfx('item')};fortress?.bind(()=>{if(mode!=='building'||!fortress.deploy(foes))return;mode='playing';hud();nextBeat=0;if(foes.some(z=>z.boss)){sfx('boss');feedback('bossSpawn');effect(225,130,'#ff687e',145)}toast('방벽 배치 완료 · 좀비 호드 진격!');},()=>{unlockAudio();tone(150,.13,'triangle',.16,0,false,46);noise(.075,.075);sfx('start');feedback('start');});$('legend').innerHTML=Object.entries(SKILLS).map(([k,s])=>'<div style="--skill:'+s.color+'">'+icon(k)+'<span><b>'+s.name+'</b><small>'+s.desc+' · '+s.duration+'초</small></span></div>').join('');rack();resetBalls();renderHeroes();endlessUI();requestAnimationFrame(frame);

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
resizeCanvas();if(typeof requestIdleCallback==='function'){requestIdleCallback(()=>burningFlameAtlas(false));requestIdleCallback(()=>burningFlameAtlas(true));}window.addEventListener('resize',resizeCanvas);if(typeof ResizeObserver!=='undefined')new ResizeObserver(resizeCanvas).observe(c);

