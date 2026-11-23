/* BARRICADE HORDE: independent construction + persistent wall simulation. */
(function(){
'use strict';
const X=27,Y=82,T=22,COLS=18,ROWS=20,MAX_HP=12,MAX_WALLS=180;
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
function pointerCell(e,canvas){
 const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*450/(r.width||450),y=(e.clientY-r.top)*710/(r.height||710);
 const col=Math.floor((x-X)/T),row=Math.floor((y-Y)/T);
 return valid(col,row)?cell(col,row):null;
}
function totals(){
 let builds=0,removes=0,repairs=0;
 for(const p of pending.values()){
  if(p.action==='remove')removes++;
  else if(p.action==='repair')repairs++;
  else builds++;
 }
 const balance=stock+removes-builds-repairs;
 const countAfter=walls.size-removes+builds;
 return {builds,removes,repairs,balance,valid:balance>=0&&countAfter<=MAX_WALLS};
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
  (summary.repairs?' · 수리 +'+summary.repairs:'')+
  ' · 확정 후 자재 '+summary.balance+
  (!summary.valid?' · 자재/공간 부족':'');
 if(helpLabel)helpLabel.textContent=repairMode
  ?'수리 모드: 손상된 방벽을 드래그 · 칸당 자재 1'
  :hasPreview?'미리보기만 적용 중 · 확인 또는 취소'
  :stock?'빈칸 드래그: 건설 · 기존 방벽: 빨간 철거(자재 환급)'
  :'자재 0 · 기존 방벽 철거로 자재 확보 가능';
 if(toolButton){toolButton.textContent=repairMode?'수리 모드 ON · 건설/철거로':'🛠 파손 방벽 수리';toolButton.setAttribute?.('aria-pressed',String(repairMode))}
}
function addCell(t){
 if(!t||pending.has(t.id))return;
 const current=walls.get(t.id);
 const action=repairMode?(current&&current.hp<MAX_HP?'repair':null):(current?'remove':'build');
 if(!action)return;
 pending.set(t.id,{...t,action});
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
function down(e,canvas){
 if(!active||dragging)return false;
 if(e.button!==undefined&&e.button!==0)return false;
 const to=pointerCell(e,canvas);
 if(!to)return false;
 pending.clear();dragging=true;pointer=e.pointerId;last=null;lineTo(to);refresh();
 try{canvas.setPointerCapture(e.pointerId)}catch{}
 return true;
}
function move(e,canvas){if(!active||!dragging||e.pointerId!==pointer)return false;lineTo(pointerCell(e,canvas));refresh();return true}
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
 lineTo(pointerCell(e,canvas));dragging=false;pointer=null;last=null;
 showActionsAt(e,canvas);refresh();return true;
}
function cancel(){dragging=false;pointer=null;last=null;pending.clear();refresh()}
function confirm(){
 if(!active||dragging||!pending.size)return 0;
 const summary=totals();
 if(!summary.valid)return 0;
 // Refund dismantled blocks before spending on construction/repair. Neither
 // cancellation nor a preview changes resources or the actual collision map.
 for(const t of pending.values())if(t.action==='remove'&&walls.delete(t.id))stock++;
 let changed=0;
 for(const t of pending.values()){
  if(t.action==='remove')continue;
  if(stock<=0)break;
  const w=walls.get(t.id);
  if(t.action==='repair'&&w&&w.hp<MAX_HP){w.hp=MAX_HP;w.hit=.15;stock--;changed++}
  else if(t.action==='build'&&!w&&walls.size<MAX_WALLS){
   walls.set(t.id,{...t,hp:MAX_HP,hit:.12});stock--;changed++;
  }
 }
 pending.clear();refresh();return changed+summary.removes;
}
function reset(){
 walls.clear();pending.clear();queued=[];stock=0;stage=1;
 active=false;dragging=false;pointer=null;last=null;
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
 active=true;dragging=false;pointer=null;last=null;pending.clear();refresh();
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
 if(x<20||x+z.w>430||y<35||y+z.h>555||firstWall(x,y,z.w,z.h))return false;
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
     const nx=Math.max(22,Math.min(429-z.w,ox+dx*T));
     const ny=Math.max(36,Math.min(550-z.h,oy+dy*T));
     if(clearPlacement(z,placed,nx,ny)){z.x=nx;z.y=ny;found=true;break}
    }
   }
   if(!found){
    // Dense late stages: use the next genuinely available upper-board slot.
    for(let row=0;row<21&&!found;row++)for(let col=0;col<COLS;col++){
     const nx=X+col*T,ny=38+row*24;
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
  z.fortressBite%=.78;hit.hp-=damage;hit.hit=.14;
  if(hit.hp<=0){walls.delete(hit.id);destroyedThisStage++;z.fortressTarget=null;z.fortressBite=0;if(onBreak)onBreak(hit.x+T/2,hit.y+T/2)}
 }
 return true;
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
 const tile=tiles();if(!tile)return;
 for(const w of walls.values()){
  const variant=w.hp>MAX_HP*.72?0:w.hp>MAX_HP*.45?1:w.hp>MAX_HP*.2?2:3;
  g.drawImage(tile,variant*T,0,T,T,w.x,w.y,T,T);
  if(w.hit>0){g.save();g.globalAlpha=Math.min(.52,w.hit*3);g.fillStyle='#ffe5a0';g.fillRect(w.x+2,w.y+4,T-5,T-7);g.restore()}
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
   g.globalAlpha=.8;g.drawImage(tile,0,0,T,T,p.x,p.y,T,T);
   g.globalAlpha=1;g.strokeStyle=p.action==='repair'?'#62e7ef':'#ffe78f';
   g.lineWidth=1.8;g.strokeRect(p.x+1,p.y+1,T-2,T-2);
  }
 }
 g.restore();
}
function tick(dt){for(const w of walls.values())w.hit=Math.max(0,(w.hit||0)-dt)}
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
 getPreview:()=>totals(),getWallHP:(col,row)=>walls.get(id(col,row))?.hp||0};
})();
