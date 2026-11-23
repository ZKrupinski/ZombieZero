/* BARRICADE HORDE: independent construction + persistent wall simulation. */
(function(){
'use strict';
// One MINI-sized half cell (11px) of clearance on either side.
// Construction spans [38,412] with 17 whole 22px wall blocks; the original
// 18-column grid spanned [27,423]. All zombie colliders use this same strip.
const X=38,Y=82,T=22,COLS=17,ROWS=20,MAX_HP=30,MAX_WALLS=180,REPAIRS_PER_MATERIAL=5;
const FORTRESS_SIDE_INSET=4;
const FIELD_LEFT=X+FORTRESS_SIDE_INSET,FIELD_RIGHT=X+COLS*T-FORTRESS_SIDE_INSET;
const walls=new Map(),pending=new Map();
const $=id=>document.getElementById(id);
const ui=$('fortress-builder'),actions=$('fortress-actions'),readyButton=$('fortress-ready'),
 confirmButton=$('fortress-confirm'),cancelButton=$('fortress-cancel'),stockLabel=$('fortress-stock'),helpLabel=$('fortress-tip'),
 buildCountLabel=$('fortress-build-count'),supplyLabel=$('fortress-supply'),
 previewLabel=$('fortress-preview-summary'),toolButton=$('fortress-tool');
let stock=0,active=false,dragging=false,pointer=null,last=null,queued=[],stage=1,onReady=null;
let destroyedThisStage=0,lastRefund=0,lastBonus=0,repairMode=false;
const id=(col,row)=>row*COLS+col;
const cell=(col,row)=>({col,row,x:X+col*T,y:Y+row*T,id:id(col,row)});
const valid=(col,row)=>col>=0&&col<COLS&&row>=0&&row<ROWS;
function pointerPosition(e,canvas){
 const r=canvas.getBoundingClientRect();
 return {x:(e.clientX-r.left)*450/(r.width||450),y:(e.clientY-r.top)*710/(r.height||710)};
}
function positionCell(x,y){
 const col=Math.floor((x-X)/T),row=Math.floor((y-Y)/T);
 return valid(col,row)?cell(col,row):null;
}
function pointerCell(e,canvas){
 const p=pointerPosition(e,canvas);
 return positionCell(p.x,p.y);
}
function totals(){
 let builds=0,removes=0,repairs=0;
 for(const p of pending.values()){
  if(p.action==='remove')removes++;
  else if(p.action==='repair')repairs++;
  else builds++;
 }
 // One material fully restores up to five damaged cubes in a single
 // confirmed repair stroke; fractional groups round up once per action.
 const repairCost=Math.ceil(repairs/REPAIRS_PER_MATERIAL);
 const balance=stock+removes-builds-repairCost;
 const countAfter=walls.size-removes+builds;
 return {builds,removes,repairs,repairCost,balance,valid:balance>=0&&countAfter<=MAX_WALLS};
}
function refresh(){
 if(!ui)return;
 ui.hidden=!active;
 const hasPreview=pending.size>0,summary=totals();
 actions.hidden=!active||!hasPreview||dragging;
 readyButton.hidden=!active||hasPreview||dragging;
 if(confirmButton)confirmButton.disabled=!summary.valid;
 if(stockLabel)stockLabel.textContent='STAGE '+String(stage).padStart(2,'0')+' · 자재 '+stock+' · 방벽 '+walls.size+'/'+MAX_WALLS;
 if(buildCountLabel){
  const freeAfter=MAX_WALLS-(walls.size-summary.removes+summary.builds);
  buildCountLabel.textContent='더 건설 '+Math.max(0,Math.min(summary.balance,freeAfter))+'개';
 }
 if(supplyLabel)supplyLabel.textContent=stage===1?'초기 건설 자재 +26':'이전 파괴 환급 +'+lastRefund+' · 스테이지 보급 +'+lastBonus;
 if(previewLabel)previewLabel.textContent=
  '설치 +'+summary.builds+' · 철거 -'+summary.removes+' (환급 +'+summary.removes+')'+
  (summary.repairs?' · 수리 '+summary.repairs+'칸 (자재 -'+summary.repairCost+')':'')+
  ' · 확정 후 자재 '+summary.balance+
  (!summary.valid?' · 자재/공간 부족':'');
 if(helpLabel)helpLabel.textContent=repairMode
  ?'수리 모드: 손상 방벽 최대 5칸에 자재 1개 · 전부 완전 복구'
  :hasPreview?'미리보기만 적용 중 · 확인 또는 취소'
  :stock?'빈칸 드래그: 건설 · 기존 방벽: 빨간 철거(자재 환급)'
  :'자재 0 · 기존 방벽 철거로 자재 확보 가능';
 if(toolButton){toolButton.textContent=repairMode?'수리 ON · 5칸/자재1 · 건설로':'🛠 수리(5칸/자재1)';toolButton.setAttribute?.('aria-pressed',String(repairMode))}
}
function addCell(t){
 if(!t||pending.has(t.id))return;
 const current=walls.get(t.id);
 const action=repairMode?(current&&current.hp<MAX_HP?'repair':null):(current?'remove':'build');
 if(!action)return;
 // Apply the budget BEFORE displaying each dragged tile. The red demolition
 // preview refunds one material per existing cube, so it must remain usable
 // at zero stock; new/repair previews can use refunds in this same stroke.
 const item={...t,action};
 pending.set(t.id,item);
 if(!totals().valid){
  pending.delete(t.id);
  return;
 }
}
function lineTo(to){
 if(!to)return;
 if(!last){addCell(to);last=to;return}
 const count=Math.max(Math.abs(to.col-last.col),Math.abs(to.row-last.row),1);
 for(let i=0;i<=count;i++){
  const col=Math.round(last.col+(to.col-last.col)*i/count);
  const row=Math.round(last.row+(to.row-last.row)*i/count);
  if(valid(col,row))addCell(cell(col,row));
 }
 last=to;
}
// A fingertip can shift up/down by 10-20px while moving horizontally.
// Resolve the stroke's main direction in game pixels and lock its minor axis,
// so boundary noise never creates a second parallel row (or column).
// Mouse/stylus input retains the precise uncorrected diagonal behavior.
const TOUCH_DIRECTION_START=T*.82;
const TOUCH_AXIS_RATIO=1.42;
const TOUCH_CORNER_DEADZONE=T*1.35;
let touchStroke=null;
function touchLineTo(e,canvas,allowCorner=true){
 if(!touchStroke){lineTo(pointerCell(e,canvas));return}
 const p=pointerPosition(e,canvas);
 const raw=positionCell(p.x,p.y);
 if(!raw)return;
 const stroke=touchStroke;
 if(!stroke.axis){
  const dx=p.x-stroke.originX,dy=p.y-stroke.originY;
  if(Math.max(Math.abs(dx),Math.abs(dy))<TOUCH_DIRECTION_START)return;
  stroke.axis=Math.abs(dx)>Math.abs(dy)*TOUCH_AXIS_RATIO?'x':
    Math.abs(dy)>Math.abs(dx)*TOUCH_AXIS_RATIO?'y':'diagonal';
 }
 if(stroke.axis==='diagonal'){
  lineTo(raw);
  return;
 }
 if(stroke.axis==='x'){
  const along=positionCell(p.x,Y+stroke.anchor.row*T+T*.5);
  if(along)lineTo(along);
  // An intentional perpendicular turn needs >1.35 block widths of
  // displacement, far beyond fingertip contact jitter.
  if(allowCorner&&Math.abs(p.y-stroke.originY)>TOUCH_CORNER_DEADZONE&&last){
   const corner=last;
   stroke.axis='y';stroke.anchor=corner;
   stroke.originX=p.x;stroke.originY=p.y;
   const turn=positionCell(X+corner.col*T+T*.5,p.y);
   if(turn)lineTo(turn);
  }
 }else{
  const along=positionCell(X+stroke.anchor.col*T+T*.5,p.y);
  if(along)lineTo(along);
  if(allowCorner&&Math.abs(p.x-stroke.originX)>TOUCH_CORNER_DEADZONE&&last){
   const corner=last;
   stroke.axis='x';stroke.anchor=corner;
   stroke.originX=p.x;stroke.originY=p.y;
   const turn=positionCell(p.x,Y+corner.row*T+T*.5);
   if(turn)lineTo(turn);
  }
 }
}
function down(e,canvas){
 if(!active||dragging)return false;
 if(e.button!==undefined&&e.button!==0)return false;
 const to=pointerCell(e,canvas);
 if(!to)return false;
 pending.clear();dragging=true;pointer=e.pointerId;last=null;
 const origin=pointerPosition(e,canvas);
 touchStroke=e.pointerType==='touch'?{originX:origin.x,originY:origin.y,anchor:to,axis:null}:null;
 lineTo(to);refresh();
 try{canvas.setPointerCapture(e.pointerId)}catch{}
 return true;
}
function move(e,canvas){if(!active||!dragging||e.pointerId!==pointer)return false;touchLineTo(e,canvas);refresh();return true}
function showActionsAt(e,canvas){
 if(!ui||!actions||!actions.style)return;
 const rect=ui.getBoundingClientRect?.()||canvas.getBoundingClientRect?.();
 if(!rect)return;
 const width=rect.width||450,height=rect.height||710;
 const half=Math.min(124,width*.48),x=Math.max(half,Math.min(width-half,e.clientX-rect.left));
 const y=Math.max(0,Math.min(height,e.clientY-rect.top));
 const below=y<height*.32;
 actions.style.left=x+'px';
 actions.style.top=(below?Math.min(height-90,y+18):Math.max(100,y-18))+'px';
 actions.dataset&&(actions.dataset.side=below?'below':'above');
}
function up(e,canvas){
 if(!dragging||e.pointerId!==pointer)return false;
 // Finger-lift coordinates are noisy: keep the chosen axis and never
 // reinterpret a tiny release movement as a new corner.
 touchLineTo(e,canvas,false);dragging=false;pointer=null;last=null;touchStroke=null;
 showActionsAt(e,canvas);refresh();return true;
}
function cancel(){dragging=false;pointer=null;last=null;touchStroke=null;pending.clear();refresh()}
function confirm(){
 if(!active||dragging||!pending.size)return 0;
 const summary=totals();
 if(!summary.valid)return 0;
 // Refund dismantled blocks before spending on construction/repair. Neither
 // cancellation nor a preview changes resources or the actual collision map.
 for(const t of pending.values())if(t.action==='remove'&&walls.delete(t.id))stock++;
 let changed=0;
 // Reserve the batched repair cost before constructing new walls. Otherwise
 // a stroke that draws many cells could spend materials promised to repairs.
 for(const t of pending.values()){
  if(t.action!=='build'||walls.has(t.id)||walls.size>=MAX_WALLS)continue;
  if(stock<=summary.repairCost)break;
  walls.set(t.id,{...t,hp:MAX_HP,hit:.12});stock--;changed++;
 }
 let repaired=0;
 for(const t of pending.values()){
  if(t.action!=='repair')continue;
  const w=walls.get(t.id);
  if(w&&w.hp<MAX_HP){w.hp=MAX_HP;w.hit=.15;repaired++}
 }
 if(repaired){stock-=Math.ceil(repaired/REPAIRS_PER_MATERIAL);changed+=repaired}
 pending.clear();refresh();return changed+summary.removes;
}
function reset(){
 walls.clear();pending.clear();queued=[];stock=0;stage=1;
 active=false;dragging=false;pointer=null;last=null;touchStroke=null;
 destroyedThisStage=0;lastRefund=0;lastBonus=0;repairMode=false;refresh();
}
function begin(enemies,wave){
 queued=enemies.splice(0,enemies.length);stage=wave;
 if(wave===1){stock=26;lastBonus=26;lastRefund=0;destroyedThisStage=0}
 else{
  lastRefund=destroyedThisStage;
  lastBonus=Math.min(14,8+Math.floor(wave/5));
  // Every cube eaten last stage is refunded at full value, PLUS the stage
  // allowance. Preserve leftovers; do not silently clip refunds at 52.
  stock+=lastRefund+lastBonus;destroyedThisStage=0;
 }
 active=true;dragging=false;pointer=null;last=null;touchStroke=null;pending.clear();refresh();
}
function intersects(x,y,w,h,other,margin=0){
 return x<other.x+T+margin&&x+w>other.x-margin&&y<other.y+T+margin&&y+h>other.y-margin;
}
function firstWall(x,y,w,h){
 const c0=Math.max(0,Math.floor((x-X)/T)-1),c1=Math.min(COLS-1,Math.floor((x+w-X)/T)+1);
 const r0=Math.max(0,Math.floor((y-Y)/T)-1),r1=Math.min(ROWS-1,Math.floor((y+h-Y)/T)+1);
 for(let row=r0;row<=r1;row++)for(let col=c0;col<=c1;col++){
  const wall=walls.get(id(col,row));if(wall&&intersects(x,y,w,h,wall))return wall;
 }
 return null;
}
// Ball-vs-cube collision uses the real circular ball footprint. Unlike bites,
// rebounds never reduce a wall's HP (including powerful and piercing shots).
// The game advances balls in <=4px substeps so side selection is stable.
function bounceBall(ball,oldX,oldY,radius){
 const r=Math.max(0,radius||0),bx=ball.x,by=ball.y;
 const c0=Math.max(0,Math.floor((bx-r-X)/T)),c1=Math.min(COLS-1,Math.floor((bx+r-X)/T));
 const r0=Math.max(0,Math.floor((by-r-Y)/T)),r1=Math.min(ROWS-1,Math.floor((by+r-Y)/T));
 let best=null;
 for(let row=r0;row<=r1;row++)for(let col=c0;col<=c1;col++){
  const wall=walls.get(id(col,row));if(!wall)continue;
  const nearX=Math.max(wall.x,Math.min(wall.x+T,bx));
  const nearY=Math.max(wall.y,Math.min(wall.y+T,by));
  const dx=bx-nearX,dy=by-nearY;
  if(dx*dx+dy*dy>r*r)continue;
  // Sweep the previous and current ball centers against expanded sides.
  // Prefer the earliest side actually entered to disambiguate corners.
  const sweepX=bx-oldX,sweepY=by-oldY;
  const candidates=[];
  const test=(axis,nx,ny,boundary,prev,delta)=>{
   if(Math.abs(delta)<1e-8)return;
   const t=(boundary-prev)/delta;
   if(t>=-1e-6&&t<=1+1e-6)candidates.push({axis,nx,ny,t:Math.max(0,t)});
  };
  if(sweepX>0)test('x',-1,0,wall.x-r,oldX,sweepX);
  if(sweepX<0)test('x',1,0,wall.x+T+r,oldX,sweepX);
  if(sweepY>0)test('y',0,-1,wall.y-r,oldY,sweepY);
  if(sweepY<0)test('y',0,1,wall.y+T+r,oldY,sweepY);
  candidates.sort((a,b)=>a.t-b.t);
  let face=candidates.find(f=>f.nx*ball.vx+f.ny*ball.vy<0);
  if(!face){
   // Handles an initially overlapping center without repeated flip-flops.
   const sides=[
    {axis:'x',nx:-1,ny:0,depth:Math.abs(bx-(wall.x-r))},
    {axis:'x',nx:1,ny:0,depth:Math.abs(bx-(wall.x+T+r))},
    {axis:'y',nx:0,ny:-1,depth:Math.abs(by-(wall.y-r))},
    {axis:'y',nx:0,ny:1,depth:Math.abs(by-(wall.y+T+r))}
   ];
   sides.sort((a,b)=>a.depth-b.depth);
   face=sides.find(f=>f.nx*ball.vx+f.ny*ball.vy<0);
   if(!face)continue; // touching and moving away
   face={...face,t:0};
  }
  if(!best||face.t<best.t)best={...face,wall};
 }
 if(!best)return null;
 const {wall,axis,nx,ny}=best;
 const pad=.15;
 if(axis==='x'){
  ball.x=nx<0?wall.x-r-pad:wall.x+T+r+pad;
  ball.vx=nx<0?-Math.abs(ball.vx):Math.abs(ball.vx);
 }else{
  ball.y=ny<0?wall.y-r-pad:wall.y+T+r+pad;
  ball.vy=ny<0?-Math.abs(ball.vy):Math.abs(ball.vy);
 }
 wall.hit=Math.max(wall.hit||0,.075); // cosmetic flash only, no HP mutation
 return {axis,nx,ny,x:axis==='x'?(nx<0?wall.x:wall.x+T):
   Math.max(wall.x,Math.min(wall.x+T,bx)),
  y:axis==='y'?(ny<0?wall.y:wall.y+T):
   Math.max(wall.y,Math.min(wall.y+T,by))};
}
function clearPlacement(z,placed,x,y){
 if(x<FIELD_LEFT||x+z.w>FIELD_RIGHT||y<35||y+z.h>555||firstWall(x,y,z.w,z.h))return false;
 for(const other of placed){
  if(x<other.x+other.w+1&&x+z.w+1>other.x&&y<other.y+other.h+1&&y+z.h+1>other.y)return false;
 }
 return true;
}
function deploy(target){
 if(!active||dragging||pending.size)return false;
 const placed=[];
 const order=[...queued].sort((a,b)=>Number(!!b.boss)-Number(!!a.boss));
 for(const z of order){
  const ox=z.x,oy=z.y;
  if(!clearPlacement(z,placed,ox,oy)){
   let found=false;
   // Nearest free position, avoiding every built wall and each assigned mob.
   for(let radius=1;radius<=20&&!found;radius++){
    for(let dy=-radius;dy<=radius&&!found;dy++)for(let dx=-radius;dx<=radius;dx++){
     if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
     const nx=Math.max(FIELD_LEFT,Math.min(FIELD_RIGHT-z.w,ox+dx*T));
     const ny=Math.max(36,Math.min(550-z.h,oy+dy*T));
     if(clearPlacement(z,placed,nx,ny)){z.x=nx;z.y=ny;found=true;break}
    }
   }
   if(!found){
    // Dense late stages: use the next genuinely available upper-board slot.
    for(let row=0;row<21&&!found;row++)for(let col=0;col<COLS;col++){
     const nx=Math.max(FIELD_LEFT,Math.min(FIELD_RIGHT-z.w,X+col*T)),ny=38+row*24;
     if(clearPlacement(z,placed,nx,ny)){z.x=nx;z.y=ny;found=true;break}
    }
   }
  }
  z.arrivalTime=-Math.max(0,z.row||0)*.07-Math.random()*.05;
  placed.push(z);
 }
 target.push(...queued);queued=[];active=false;cancel();refresh();
 return true;
}
function ready(){if(!active||dragging||pending.size)return false;if(typeof onReady==='function')onReady();return true}
function resolve(z,oldX,oldY,dt,onBreak){
 const hit=firstWall(z.x,z.y,z.w,z.h);
 if(!hit){z.fortressTarget=null;z.fortressBite=0;return false}
 // Do not let a dash/diagonal step clip a cube. Hold at last safe contact.
 if(!firstWall(oldX,oldY,z.w,z.h)){z.x=oldX;z.y=oldY}
 else {
  // Knockback/teleport fallback: retreat until the unit is outside the cube.
  for(let i=1;i<=12;i++){
   const testY=oldY-i*2;
   if(!firstWall(oldX,testY,z.w,z.h)){z.x=oldX;z.y=testY;break}
  }
 }
 if(z.fortressTarget!==hit.id){z.fortressTarget=hit.id;z.fortressBite=0}
 z.fortressBite=(z.fortressBite||0)+dt*(z.boss?2.25:Number.isInteger(z.eliteKind)?1.5:1);
 if(z.fortressBite>=.78){
  const damage=Math.floor(z.fortressBite/.78);
  z.fortressBite%=.78;hit.hp-=damage;hit.hit=.18;hit.biteShake=.18;
  if(hit.hp<=0){walls.delete(hit.id);destroyedThisStage++;z.fortressTarget=null;z.fortressBite=0;if(onBreak)onBreak(hit.x+T/2,hit.y+T/2)}
 }
 return true;
}
// Five re-cut bitmap damage states (56x56 each), each with the exact same\n// 52x52 visible area at (2,2). No scale drift as damage progresses.
// A 5x1 atlas is cached once; procedural cubes remain only a loading fallback.
const BARRICADE_BITMAP_URL='assets/ip/v2/barricades/barricade-damage-v323-aligned.png';
const BARRICADE_FRAME=56;
let barricadeSprite=null,barricadeSpriteRequested=false;
function bitmapTiles(){
 if(barricadeSprite&&barricadeSprite.complete&&
    barricadeSprite.naturalWidth===BARRICADE_FRAME*5&&
    barricadeSprite.naturalHeight===BARRICADE_FRAME)return barricadeSprite;
 if(!barricadeSpriteRequested&&typeof Image==='function'){
  barricadeSpriteRequested=true;
  const im=new Image();im.decoding='async';
  im.onload=()=>{
   if(im.naturalWidth===BARRICADE_FRAME*5&&im.naturalHeight===BARRICADE_FRAME)barricadeSprite=im;
  };
  im.onerror=()=>{}; // never repaint an absent asset every frame
  im.src=BARRICADE_BITMAP_URL;
 }
 return null;
}
let atlas=null;
function tiles(){
 if(atlas)return atlas;
 atlas=document.createElement('canvas');atlas.width=T*4;atlas.height=T;
 const q=atlas.getContext('2d');if(!q)return atlas;
 q.imageSmoothingEnabled=false;
 const palettes=[
  ['#a9abb0','#7a868c','#56666d','#cdd2c4'],
  ['#a9a399','#898072','#675f5a','#d3b994'],
  ['#8e7771','#715553','#59494d','#b99681'],
  ['#696067','#5c4b53','#493f48','#b17b70']
 ];
 for(let k=0;k<4;k++){
  const x=k*T,p=palettes[k];
  q.fillStyle='#222e35';q.fillRect(x+1,5,21,17);
  q.fillStyle=p[1];q.fillRect(x+1,7,18,12);
  q.fillStyle=p[2];q.fillRect(x+17,6,4,14);
  q.fillStyle=p[0];q.fillRect(x+2,4,15,5);
  q.fillStyle=p[3];q.fillRect(x+3,3,14,3);
  q.fillStyle='#343f46';q.fillRect(x+3,10,2,8);q.fillRect(x+5,17,10,2);
  q.fillStyle='#c0b8a16b';q.fillRect(x+8,9,1,7);q.fillRect(x+11,9,1,7);
  if(k>0){q.fillStyle='#30383e';q.fillRect(x+8,10,4+k*2,1);q.fillRect(x+11,11,1,k*2);q.fillRect(x+7,14,3,1)}
  if(k>2){q.fillStyle='#292c36';q.fillRect(x+3,16,8,2);q.fillRect(x+14,13,2,4)}
 }
 return atlas;
}
function draw(g,building=false){
 const bitmap=bitmapTiles();
 const tile=bitmap||tiles();if(!tile)return;
 const frame=bitmap?BARRICADE_FRAME:T;
 for(const w of walls.values()){
  // The five authored PNG states are switched by actual remaining HP.
  const variant=w.hp>MAX_HP*.8?0:w.hp>MAX_HP*.6?1:
    w.hp>MAX_HP*.4?2:w.hp>MAX_HP*.2?3:4;
  const index=bitmap?variant:Math.min(3,variant);
  // Bite impact only affects the one cube being chewed. No global camera
  // shake and no collision/HP displacement; the PNG itself is jittered.
  const bite=Math.min(1,Math.max(0,(w.biteShake||0)/.18));
  const elapsed=.18-Math.min(.18,w.biteShake||0);
  const shakeX=bite?Math.sin(elapsed*124+w.id*.31)*1.5*bite:0;
  const shakeY=bite?Math.cos(elapsed*105+w.id*.19)*.7*bite:0;
  g.save();
  if(bite>0)g.filter='brightness('+String((1+1.2*bite).toFixed(2))+') saturate(.85)';
  g.drawImage(tile,index*frame,0,frame,frame,w.x+shakeX,w.y+shakeY,T,T);
  g.restore();
 }
 if(!building)return;
 g.save();g.globalAlpha=.22;g.fillStyle='#a3d1b0';
 for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++)g.fillRect(X+col*T+10,Y+row*T+10,2,2);
 g.globalAlpha=.8;
 for(const p of pending.values()){
  if(p.action==='remove'){
   // Demolition must be unmistakably red without deleting real walls until
   // Confirm. Keep the underlying cube visible through the overlay.
   g.globalAlpha=.63;g.fillStyle='#fc334c';g.fillRect(p.x+1,p.y+1,T-2,T-2);
   g.globalAlpha=1;g.strokeStyle='#ff3f5c';g.lineWidth=2.4;
   g.strokeRect(p.x+1,p.y+1,T-2,T-2);
   g.beginPath();g.moveTo(p.x+5,p.y+5);g.lineTo(p.x+T-5,p.y+T-5);
   g.moveTo(p.x+T-5,p.y+5);g.lineTo(p.x+5,p.y+T-5);g.stroke();
  }else{
   g.globalAlpha=.8;g.drawImage(tile,0,0,frame,frame,p.x,p.y,T,T);
   g.globalAlpha=1;g.strokeStyle=p.action==='repair'?'#62e7ef':'#ffe78f';
   g.lineWidth=1.8;g.strokeRect(p.x+1,p.y+1,T-2,T-2);
  }
 }
 g.restore();
}
function tick(dt){for(const w of walls.values()){
 w.hit=Math.max(0,(w.hit||0)-dt);
 w.biteShake=Math.max(0,(w.biteShake||0)-dt);
}}
if(confirmButton)confirmButton.addEventListener('click',confirm);
if(cancelButton)cancelButton.addEventListener('click',cancel);
if(readyButton)readyButton.addEventListener('click',ready);
if(toolButton)toolButton.addEventListener('click',()=>{
 if(!active||dragging)return;repairMode=!repairMode;pending.clear();refresh();
});
window.ZZFortress={reset,begin,deploy,resolve,bounceBall,draw,tick,down,move,up,cancel,ready,
 bind(fn){onReady=fn},getStock:()=>stock,getWallCount:()=>walls.size,
 getQueueCount:()=>queued.length,getPendingRefund:()=>destroyedThisStage,
 getSupply:()=>({refund:lastRefund,bonus:lastBonus}),
 getPreview:()=>totals(),getWallHP:(col,row)=>walls.get(id(col,row))?.hp||0,
 bounds:()=>({left:X,right:X+COLS*T,enemyLeft:FIELD_LEFT,enemyRight:FIELD_RIGHT,columns:COLS,rows:ROWS,tile:T})};
})();
