/* BARRICADE HORDE: independent construction + persistent wall simulation. */
(function(){
'use strict';
// One MINI-sized half cell (11px) of clearance on either side.
// Construction spans [38,412] with 17 whole 22px wall blocks; the original
// 18-column grid spanned [27,423]. All zombie colliders use this same strip.
const X=38,Y=82,T=22,COLS=17,ROWS=20,MAX_HP=30,MAX_WALLS=180;
const FORTRESS_SIDE_INSET=4;
const FIELD_LEFT=X+FORTRESS_SIDE_INSET,FIELD_RIGHT=X+COLS*T-FORTRESS_SIDE_INSET;
const occupied=new Map(); // Each occupied tile points to its single structure.
const walls=new Map(),pending=new Map();
// Special devices occupy a two-by-two footprint.
const BUILD_TYPES={
 wall:{name:'방벽',cost:1,hp:30,desc:'연속 드래그 설치 · 적과 공 차단'},
 bollard:{name:'두더지 차단봉',cost:2,hp:30,cycle:3.8,desc:'1칸 · 솟을 때 밀치고 잠시 길을 막음'},
 lure:{name:'꽥꽥 유인기',cost:4,hp:22,range:100,duration:.84,cycle:4.5,desc:'위쪽 90° 스프링 돌진 · 충돌 시 연쇄 넉백'},
 saw:{name:'빙글 톱날',cost:5,hp:24,range:34,duration:1.1,cycle:1.65,desc:'주변 좀비 최대 3마리에 반복 피해'},
 ice:{name:'꽁꽁 포획기',cost:3,hp:30,range:126,duration:.85,cycle:3.5,desc:'최대 4마리 당겨 결빙 · 대기 중 피해 절반'}
};
let selectedBuild='wall',placementTip='';
const spec=w=>BUILD_TYPES[w?.kind]||BUILD_TYPES.wall;
const buildButtons=['wall','bollard','lure','saw','ice'].map(kind=>({kind,el:document.getElementById('build-pick-'+kind)}));
const $=id=>document.getElementById(id);
const ui=$('fortress-builder'),actions=$('fortress-actions'),readyButton=$('fortress-ready'),
 confirmButton=$('fortress-confirm'),cancelButton=$('fortress-cancel'),stockLabel=$('fortress-stock'),helpLabel=$('fortress-tip'),
 buildCountLabel=$('fortress-build-count'),supplyLabel=$('fortress-supply'),
 previewLabel=$('fortress-preview-summary');
let stock=0,active=false,dragging=false,pointer=null,last=null,queued=[],stage=1,onReady=null;
let destroyedThisStage=0,lastRefund=0,lastBonus=0,lastHealed=0;
const id=(col,row)=>row*COLS+col;
const cell=(col,row)=>({col,row,x:X+col*T,y:Y+row*T,id:id(col,row)});
const span=w=>w.kind&&w.kind!=='wall'&&w.kind!=='bollard'?2:1;
function footprint(w,visit){
 for(let row=w.row;row<w.row+span(w);row++)for(let col=w.col;col<w.col+span(w);col++)visit(id(col,row));
}
function removeStructure(w){
 walls.delete(w.id);
 footprint(w,key=>occupied.delete(key));
}
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
 let builds=0,removes=0,cost=0,refund=0;
 for(const p of pending.values()){
  if(p.action==='remove'){removes++;refund+=spec(walls.get(p.id)).cost;}
  else{builds++;cost+=spec(p).cost;}
 }
 const balance=stock+refund-cost;
 const countAfter=walls.size-removes+builds;
 return {builds,removes,cost,refund,balance,valid:balance>=0&&countAfter<=MAX_WALLS};
}
function refresh(){
 if(!ui)return;
 ui.hidden=!active;
 const hasPreview=pending.size>0,summary=totals();
 actions.hidden=!active||!hasPreview||dragging;
 readyButton.hidden=!active||hasPreview||dragging;
 if(confirmButton)confirmButton.disabled=!summary.valid;
 if(stockLabel)stockLabel.textContent='STAGE '+String(stage).padStart(2,'0')+' · 자재 '+stock+' · 구조물 '+walls.size+'/'+MAX_WALLS;
 if(buildCountLabel){
  const freeAfter=MAX_WALLS-(walls.size-summary.removes+summary.builds);
  buildCountLabel.textContent='더 건설 '+Math.max(0,Math.min(Math.floor(summary.balance/BUILD_TYPES[selectedBuild].cost),freeAfter))+'개';
 }
 if(supplyLabel)supplyLabel.textContent=stage===1?'초기 건설 자재 +26':'생존 방벽 '+lastHealed+'개 자동 수리(무료) · 파괴 환급 +'+lastRefund+' · 보급 +'+lastBonus;
 if(previewLabel)previewLabel.textContent=
  '설치 +'+summary.builds+' (자재 -'+summary.cost+') · 철거 -'+summary.removes+' (환급 +'+summary.refund+')'+
  ' · 확정 후 자재 '+summary.balance+
  (!summary.valid?' · 자재/공간 부족':'');
 for(const {kind,el} of buildButtons)if(el){
  el.setAttribute?.('aria-pressed',String(kind===selectedBuild));
  el.disabled=hasPreview||dragging;
  if(el.dataset)el.dataset.affordable=String(stock>=BUILD_TYPES[kind].cost);
 }
 if(helpLabel)helpLabel.textContent=hasPreview?'미리보기만 적용 중 · 확인 또는 취소'
  :placementTip?placementTip:stock?(span({kind:selectedBuild})===1?'':'2×2칸 · 불규칙 가동 · ')+BUILD_TYPES[selectedBuild].desc+' · 기존 구조물 터치: 철거'
  :'자재 0 · 기존 구조물 철거로 자재 확보 가능';
}
function addCell(t){
 if(!t)return;
 const current=occupied.get(t.id);
 if(current)t=cell(current.col,current.row);
 else if(span({kind:selectedBuild})===2){
  t=cell(Math.min(t.col,COLS-2),Math.min(t.row,ROWS-2));
  let blocked=false;
  footprint({...t,kind:selectedBuild},key=>{if(occupied.has(key))blocked=true});
  if(blocked){placementTip='설치하려면 빈 2×2칸이 필요합니다';return}
 }
 if(pending.has(t.id))return;
 const action=current?'remove':'build';
 if(!action)return;
 // Apply the budget BEFORE displaying each dragged tile. Demolition
 // refunds one material per cube, even at zero stock. No manual repairs.
 const item={...t,action,kind:current?.kind||selectedBuild};
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
  const ax=Math.abs(dx),ay=Math.abs(dy),major=Math.max(ax,ay),minor=Math.min(ax,ay);
  if(major<TOUCH_DIRECTION_START)return;
  // The first 1-tile movement may contain nearly as much finger jitter as
  // intentional travel. Defer ambiguous angles until a longer gesture makes
  // its true direction apparent; don't commit a diagonal ghost prematurely.
  const ratio=allowCorner?TOUCH_AXIS_RATIO:1.2;
  if(major<minor*ratio && major<T*1.5 && allowCorner)return;
  stroke.axis=ax>ay*ratio?'x':ay>ax*ratio?'y':'diagonal';
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
 placementTip='';pending.clear();dragging=true;pointer=e.pointerId;last=null;
 const origin=pointerPosition(e,canvas);
 touchStroke=e.pointerType==='touch'?{originX:origin.x,originY:origin.y,anchor:to,axis:null}:null;
 if(selectedBuild==='wall')lineTo(to);else addCell(to);refresh();
 try{canvas.setPointerCapture(e.pointerId)}catch{}
 return true;
}
function move(e,canvas){if(!active||!dragging||e.pointerId!==pointer)return false;if(selectedBuild==='wall')touchLineTo(e,canvas);refresh();return true}
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
 if(selectedBuild==='wall')touchLineTo(e,canvas,false);dragging=false;pointer=null;last=null;touchStroke=null;
 showActionsAt(e,canvas);refresh();return true;
}
function cancel(){dragging=false;pointer=null;last=null;touchStroke=null;pending.clear();refresh()}
function confirm(){
 if(!active||dragging||!pending.size)return 0;
 const summary=totals();
 if(!summary.valid)return 0;
 // Refund demolished blocks first, then use that material for building.
 // Damaged survivors are restored automatically at the NEXT wave for free.
 for(const t of pending.values())if(t.action==='remove'){const old=walls.get(t.id);if(old){removeStructure(old);stock+=spec(old).cost}}
 let changed=0;
 for(const t of pending.values()){
  if(t.action!=='build'||walls.has(t.id)||walls.size>=MAX_WALLS)continue;
  const type=spec(t);
  if(stock<type.cost)break;
  const structure={...t,hp:type.hp,hit:.12,cooldown:0,pulse:0};
  walls.set(t.id,structure);footprint(structure,key=>occupied.set(key,structure));stock-=type.cost;changed++;
 }
 pending.clear();refresh();return changed+summary.removes;
}
function reset(){
 occupied.clear();walls.clear();pending.clear();queued=[];stock=0;stage=1;selectedBuild='wall';
 active=false;dragging=false;pointer=null;last=null;touchStroke=null;
 destroyedThisStage=0;lastRefund=0;lastBonus=0;lastHealed=0;refresh();
}
function begin(enemies,wave){
 placementTip='';queued=enemies.splice(0,enemies.length);stage=wave;
 if(wave===1){
  stock=26;lastBonus=26;lastRefund=0;lastHealed=0;destroyedThisStage=0;
 }else{
  // Stage survived: every remaining cube heals completely without consuming
  // construction materials; already destroyed cubes stay absent and refund
  // one material each on top of the regular per-wave supply.
  lastHealed=walls.size;
  for(const w of walls.values()){w.hp=spec(w).hp;w.hit=0;w.biteShake=0;w.cooldown=0;w.run=null;w.pulse=0;w.raised=false;w.lift=0}
  lastRefund=destroyedThisStage;
  lastBonus=Math.min(14,8+Math.floor(wave/5));
  stock+=lastRefund+lastBonus;destroyedThisStage=0;
 }
 active=true;dragging=false;pointer=null;last=null;touchStroke=null;pending.clear();refresh();
}
function intersects(x,y,w,h,other,margin=0){
 return x<other.x+T*span(other)+margin&&x+w>other.x-margin&&y<other.y+T*span(other)+margin&&y+h>other.y-margin;
}
function isSolid(w){return w&&(w.kind!=='bollard'||w.raised)}
function firstWall(x,y,w,h){
 const c0=Math.max(0,Math.floor((x-X)/T)-1),c1=Math.min(COLS-1,Math.floor((x+w-X)/T)+1);
 const r0=Math.max(0,Math.floor((y-Y)/T)-1),r1=Math.min(ROWS-1,Math.floor((y+h-Y)/T)+1);
 for(let row=r0;row<=r1;row++)for(let col=c0;col<=c1;col++){
  const wall=occupied.get(id(col,row));if(isSolid(wall)&&intersects(x,y,w,h,wall))return wall;
 }
 return null;
}
// Check the full collider sweep, not only the destination: fast charges,
// knockback and separation can otherwise skip over a 22px block in one tick.
// Returning the last clear sample also keeps bite positions outside the cube.
function firstWallOnPath(x0,y0,x1,y1,w,h){
 if(!walls.size)return null;
 const start=firstWall(x0,y0,w,h);
 if(start)return {wall:start,x:x0,y:y0,startInside:true};
 const dx=x1-x0,dy=y1-y0;
 const count=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/Math.min(5,T/4)));
 let lastX=x0,lastY=y0;
 for(let i=1;i<=count;i++){
  const t=i/count,x=x0+dx*t,y=y0+dy*t;
  const wall=firstWall(x,y,w,h);
  if(wall)return {wall,x:lastX,y:lastY,startInside:false};
  lastX=x;lastY=y;
 }
 return null;
}
function isOpen(z,x,y){return !firstWall(x,y,z.w,z.h)}
function isPathClear(z,x0,y0,x1,y1){
 return !firstWallOnPath(x0,y0,x1,y1,z.w,z.h);
}
function escapeWall(z,oldX,oldY){
 // Only used when an enemy was already embedded (older saves/spawns,
 // complicated chain reactions). Search outwards from its pre-move position,
 // prioritizing backward movement so it never teleports through a barricade.
 const x=Number.isFinite(oldX)?oldX:z.x,y=Number.isFinite(oldY)?oldY:z.y;
 const legal=(a,b)=>a>=FIELD_LEFT&&a+z.w<=FIELD_RIGHT&&
  b>=35&&b+z.h<=555&&isOpen(z,a,b);
 for(let d=2;d<=Math.max(T*4,z.w+T);d+=2){
  for(const [tx,ty] of [[x,y-d],[x-d,y],[x+d,y],[x,y+d]]){
   if(legal(tx,ty)){z.x=tx;z.y=ty;return true}
  }
 }
 // Last resort: deterministic nearest safe grid point.
 let best=null;
 for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){
  const tx=Math.max(FIELD_LEFT,Math.min(FIELD_RIGHT-z.w,X+col*T));
  const ty=Y+row*T;
  if(!legal(tx,ty))continue;
  const distance=(tx-x)*(tx-x)+(ty-y)*(ty-y);
  if(!best||distance<best.distance)best={x:tx,y:ty,distance};
 }
 if(best){z.x=best.x;z.y=best.y;return true}
 return false;
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
  const wall=occupied.get(id(col,row));if(!isSolid(wall))continue;
  const nearX=Math.max(wall.x,Math.min(wall.x+T*span(wall),bx));
  const nearY=Math.max(wall.y,Math.min(wall.y+T*span(wall),by));
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
  if(sweepX<0)test('x',1,0,wall.x+T*span(wall)+r,oldX,sweepX);
  if(sweepY>0)test('y',0,-1,wall.y-r,oldY,sweepY);
  if(sweepY<0)test('y',0,1,wall.y+T*span(wall)+r,oldY,sweepY);
  candidates.sort((a,b)=>a.t-b.t);
  let face=candidates.find(f=>f.nx*ball.vx+f.ny*ball.vy<0);
  if(!face){
   // Handles an initially overlapping center without repeated flip-flops.
   const sides=[
    {axis:'x',nx:-1,ny:0,depth:Math.abs(bx-(wall.x-r))},
    {axis:'x',nx:1,ny:0,depth:Math.abs(bx-(wall.x+T*span(wall)+r))},
    {axis:'y',nx:0,ny:-1,depth:Math.abs(by-(wall.y-r))},
    {axis:'y',nx:0,ny:1,depth:Math.abs(by-(wall.y+T*span(wall)+r))}
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
  ball.x=nx<0?wall.x-r-pad:wall.x+T*span(wall)+r+pad;
  ball.vx=nx<0?-Math.abs(ball.vx):Math.abs(ball.vx);
 }else{
  ball.y=ny<0?wall.y-r-pad:wall.y+T*span(wall)+r+pad;
  ball.vy=ny<0?-Math.abs(ball.vy):Math.abs(ball.vy);
 }
 wall.hit=Math.max(wall.hit||0,.075); // cosmetic flash only, no HP mutation
 return {axis,nx,ny,x:axis==='x'?(nx<0?wall.x:wall.x+T*span(wall)):
   Math.max(wall.x,Math.min(wall.x+T*span(wall),bx)),
  y:axis==='y'?(ny<0?wall.y:wall.y+T*span(wall)):
   Math.max(wall.y,Math.min(wall.y+T*span(wall),by))};
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
   if(!found){
    // Search half-tiles too: the former fallback silently retained an
    // overlapping original spawn when its coarse slot grid was full.
    for(let row=0;row<Math.ceil((555-z.h-35)/(T/2))&&!found;row++){
     const ny=35+row*(T/2);
     for(let nx=FIELD_LEFT;nx<=FIELD_RIGHT-z.w&&!found;nx+=T/2){
      if(clearPlacement(z,placed,nx,ny)){z.x=nx;z.y=ny;found=true;break}
     }
    }
   }
   if(!found){
    // No free board slot: queue the zombie just ABOVE the board in a safe,
    // non-overlapping reserve row. It will march into play naturally;
    // NEVER force it onto an occupied barricade tile.
    for(let row=0;row<80&&!found;row++){
     const ny=35-z.h-4-row*(Math.max(24,z.h)+3);
     for(let col=0;col<18;col++){
      const nx=FIELD_LEFT+(FIELD_RIGHT-z.w-FIELD_LEFT)*col/17;
      if(firstWall(nx,ny,z.w,z.h))continue;
      if(placed.some(other=>nx<other.x+other.w+1&&
         nx+z.w+1>other.x&&ny<other.y+other.h+1&&
         ny+z.h+1>other.y))continue;
      z.x=nx;z.y=ny;found=true;break;
     }
    }
   }
   if(!found)throw Error('Barricade enemy staging exhausted: unsafe spawn blocked');
  }
  z.arrivalTime=-Math.max(0,z.row||0)*.07-Math.random()*.05;
  placed.push(z);
 }
 for(const w of walls.values())if(w.kind&&w.kind!=='wall'){
  w.run=null;w.cooldown=w.kind==='ice'?.3+.45*Math.random():randomRest(w)*(.25+.45*Math.random());
 }
 target.push(...queued);queued=[];active=false;cancel();refresh();
 return true;
}
function ready(){if(!active||dragging||pending.size)return false;if(typeof onReady==='function')onReady();return true}
function resolve(z,oldX,oldY,dt,onBreak){
 const trace=firstWallOnPath(oldX,oldY,z.x,z.y,z.w,z.h);
 if(!trace){
  z.fortressTarget=null;z.fortressBite=0;return false;
 }
 const hit=trace.wall;
 if(!trace.startInside){
  // Stop at the last genuinely safe point along the swept movement.
  z.x=trace.x;z.y=trace.y;
 }else if(!isOpen(z,z.x,z.y)){
  // A previously embedded enemy must be pushed outside immediately.
  escapeWall(z,oldX,oldY);
 }
 // Do not let an overlapping start persist or award bites when already clear.
 if(!isOpen(z,z.x,z.y)){
  z.fortressTarget=null;z.fortressBite=0;return true;
 }
 if(z.fortressTarget!==hit.id){z.fortressTarget=hit.id;z.fortressBite=0}
 z.fortressBite=(z.fortressBite||0)+dt*(z.boss?2.25:Number.isInteger(z.eliteKind)?1.5:1);
 if(z.fortressBite>=.78){
  const damage=Math.floor(z.fortressBite/.78);
  z.fortressBite%=.78;hit.hp-=hit.kind==='ice'&&!hit.run?damage*.5:damage;hit.hit=.18;hit.biteShake=.18;
  if(hit.hp<=0){removeStructure(hit);destroyedThisStage++;z.fortressTarget=null;z.fortressBite=0;if(onBreak)onBreak(hit.x+T*span(hit)/2,hit.y+T*span(hit)/2)}
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

// Cached raster art: use the same blocky top/side shading as the barricade.
// The tiny animated accents are separate; the icon and board share the art.
const deviceArt=new Map();
function deviceBitmap(kind){
 if(deviceArt.has(kind))return deviceArt.get(kind);
 if(typeof document.createElement!=='function')return null;
 const im=document.createElement('canvas');im.width=im.height=64;
 const c=im.getContext?.('2d');if(!c||typeof c.fillRect!=='function')return null;
 const box=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h)};
 if(kind==='bollard'||kind==='bollardCap'){
  if(kind==='bollard'){
   box(1,1,62,62,'#293239');box(2,2,60,59,'#77868a');box(6,6,52,51,'#333d44');
   for(const x of [4,56])for(const y of [4,55])box(x,y,4,4,'#ccdbd8');
   box(7,8,50,45,'#59666a');box(8,9,48,3,'#92a09f');
   box(10,29,44,2,'#354347');box(25,48,14,3,'#dc9952');
  }else{
   box(0,0,52,36,'#ed8731');box(0,0,52,4,'#ffcd71');box(48,3,4,33,'#ad562e');
   for(const x of [7,23,39])for(let y=0;y<4;y++)box(x-y*2,11+y*3,7,3,'#443e3c');
   box(0,36,52,21,'#99512f');box(3,38,44,6,'#f4b45b');box(4,48,43,5,'#5d493e');
  }
  deviceArt.set(kind,im);return im;
 }
 box(7,37,50,20,'#222e35');box(7,32,43,19,'#60717b');box(50,34,7,17,'#374d55');
 box(9,29,42,10,'#b4c4bf');box(10,48,37,4,'#3a5058');
 for(let i=0;i<4;i++)box(12+i*10,43,5,4,'#f2bf59');
 if(kind==='duck'){
  c.clearRect(0,0,64,64);
  // Rubber duck on a spring-loaded loudspeaker.

  box(13,19,34,12,'#b87826');box(14,15,30,13,'#f5c341');box(16,12,26,8,'#ffdf72');
  box(31,4,16,18,'#ffc537');box(33,4,10,4,'#ffed8c');
  box(42,11,4,5,'#202c34');box(47,14,12,6,'#f18b3c');box(47,19,8,3,'#b85528');
 }else if(kind==='lure'){
  // Twin bass speakers on the striped cabinet.
  for(const x of [17,45]){
   for(const [radius,color] of [[10,'#26323e'],[8,'#cb8032'],[6,'#54414b'],[3,'#efb055']]){
    c.fillStyle=color;c.beginPath();c.arc(x,44,radius,0,Math.PI*2);c.fill();
   }
  }
 }else if(kind==='saw'){
  box(24,15,16,25,'#364d56');box(27,12,10,25,'#a7b8c1');
  // Blade is rendered separately so its teeth genuinely rotate.
  box(20,33,24,7,'#d79a39');
 }else if(kind==='ice'){
  box(13,12,37,28,'#277b98');box(12,10,34,25,'#80c9d9');box(14,9,30,7,'#c5f9ef');
  box(19,16,22,13,'#235466');box(22,19,16,7,'#80f7ff');
  box(25,14,3,17,'#e2ffff');box(18,21,20,3,'#e2ffff');
  box(45,14,5,23,'#397789');box(8,29,43,5,'#d5af64');
  box(15,36,8,5,'#604c38');box(41,36,8,5,'#604c38');
 }else if(kind==='wall'){
  box(8,13,46,34,'#64737b');box(8,11,41,9,'#c4d0c9');
  box(49,15,7,29,'#46555d');box(14,24,34,3,'#364951');
  box(25,18,3,15,'#46565b');box(16,37,34,3,'#405258');
 }
 deviceArt.set(kind,im);return im;
}
function sawBitmap(){
 if(deviceArt.has('blade'))return deviceArt.get('blade');
 const im=document.createElement?.('canvas');if(!im)return null;
 im.width=im.height=64;const c=im.getContext?.('2d');
 if(!c||typeof c.beginPath!=='function')return null;
 c.beginPath();
 for(let i=0;i<32;i++){const a=i*Math.PI/16,r=i%2===0?30:23;
  const x=32+Math.cos(a)*r,y=32+Math.sin(a)*r;
  if(!i)c.moveTo(x,y);else c.lineTo(x,y);
 }
 c.closePath();c.fillStyle='#4b5c65';c.fill();
 c.beginPath();c.arc(32,32,22,0,Math.PI*2);c.fillStyle='#d0dfe0';c.fill();
 c.beginPath();c.arc(32,32,15,0,Math.PI*2);c.fillStyle='#a1b6bd';c.fill();
 for(const a of [0,2.1,4.2]){
  c.fillStyle='#465b62';c.beginPath();c.arc(32+12*Math.cos(a),32+12*Math.sin(a),3,0,Math.PI*2);c.fill();
 }
 c.fillStyle='#e5ae52';c.fillRect(26,26,12,12);
 c.fillStyle='#354952';c.fillRect(29,29,6,6);
 deviceArt.set('blade',im);return im;
}
// All coordinates are local to the 64px machine. Only moving parts are transformed.
function paintMachine(g,kind,time,pulse,bladeOffset=null){
 const art=deviceBitmap(kind);if(!art)return;
 g.drawImage(art,0,0);
 if(kind==='bollard'){
  const lift=pulse,top=10-9*lift;
  if(lift<=0)return;
  g.save();g.globalAlpha*=Math.min(1,lift*2);
  const cap=deviceBitmap('bollardCap');
  g.drawImage(cap,0,0,52,36,6,top,52,40);
  g.drawImage(cap,0,36,52,21,6,top+40,52,21*lift);g.restore();
  return;
 }
 if(kind==='wall')return;
 const beat=Math.sin(time*5),kick=Math.sin(Math.PI*pulse);
 if(kind==='lure'){
  const lift=bladeOffset?.y||0,slide=bladeOffset?.x||0;
  g.strokeStyle='#43505b';g.lineWidth=5;g.beginPath();
  for(let i=0;i<=12;i++){
   const f=i/12,y=37+(lift-10)*f,x=32+slide*f+(i%2?7:-7);
   if(i)g.lineTo(x,y);else g.moveTo(x,y);
  }
  g.stroke();
  g.strokeStyle='#ffe392';g.lineWidth=2;g.stroke();
  g.drawImage(deviceBitmap('duck'),slide,lift);
  if(pulse>0){
   g.strokeStyle='#ffdf70';g.lineWidth=2;
   for(const x of [16,48]){g.beginPath();g.arc(x,44,6+kick*5,0,Math.PI*2);g.stroke()}
  }
 }else if(kind==='saw'){
  const travel=Math.sin(time*3)*6-kick*3;
  g.fillStyle='#48545a';g.fillRect(10,29,44,6);
  g.fillStyle='#ed9f39';g.fillRect(22+travel,27,20,10);
  const blade=sawBitmap();if(!blade)return;
  const bx=32+(bladeOffset?bladeOffset.x:travel),by=22+(bladeOffset?bladeOffset.y:0);
  if(bladeOffset){
   g.strokeStyle='#556a74';g.lineWidth=5;g.beginPath();g.moveTo(32,32);g.lineTo(bx,by);g.stroke();
  }
  g.save();g.translate(bx,by);g.rotate(time*8+.3);g.drawImage(blade,-22,-22,44,44);g.restore();
 }else{
  // Opposed toothed jaws close over the chilled core when the trap fires.
  const close=1+beat+kick*9;
  for(const side of [-1,1]){
   g.save();g.translate(32,0);g.scale(side,1);g.translate(-close,0);
   g.fillStyle='#244855';g.fillRect(19,14,6,27);
   g.fillStyle='#6ac9dc';g.fillRect(18,11,6,24);
   g.fillStyle='#d8ffff';g.fillRect(12,9,12,6);g.fillRect(12,14,4,5);
   g.fillStyle='#c08c4c';g.fillRect(17,30,10,6);g.restore();
  }
  g.fillStyle='#204453';g.fillRect(19,41,26,8);
  g.fillStyle='#94fcff';
  for(let i=0;i<4;i++)g.fillRect(21+i*6,43,3,i<2+beat||pulse>0?2:1);
 }
}
function makeDeviceIcons(){
 for(const {kind,el} of buildButtons){
  if(!el)continue;
  const icon=el.querySelector?.('canvas'),art=deviceBitmap(kind);
  const q=icon?.getContext?.('2d');if(!q||!art)continue;
  q.clearRect(0,0,64,64);paintMachine(q,kind,0,kind==='bollard'?1:0);
 }
}
function selectBuild(kind){
 if(!active||dragging||pending.size||!BUILD_TYPES[kind])return false;
 placementTip='';selectedBuild=kind;refresh();return true;
}
function armReach(w,dx,dy){
 const half=T*span(w)/2,length=Math.hypot(dx,dy);
 const face=length*half/Math.max(1,Math.abs(dx),Math.abs(dy));
 return Math.min(length,face+spec(w).range);
}
const ICE_LATCH=.32,ICE_FREEZE=.62;
function drawDevice(g,w,building=false){
 const art=deviceBitmap(w.kind);if(!art)return;
 const size=T*span(w),x=w.x+size/2,y=w.y+size/2;
 const run=building?null:w.run,progress=run?run.time/spec(w).duration:0;
 let offset=null;
 if(run&&w.kind==='lure'){
  const travel=duckTravel(progress)*64/size;offset={x:run.dx*travel,y:run.dy*travel};
 }
 if(run&&w.kind==='saw'){
  const step=progress*run.targets.length,index=Math.min(run.targets.length-1,Math.floor(step));
  const z=run.targets[index],reach=Math.sin(Math.PI*(step-index));
  const dx=z.x+z.w/2-x,dy=z.y+z.h/2-y;
  const scale=armReach(w,dx,dy)/Math.max(1,Math.hypot(dx,dy))*64/size;
  offset={x:dx*scale*reach,y:(dy*scale+10)*reach};
 }
 g.save();g.translate(w.x,w.y);g.scale(size/64,size/64);
 paintMachine(g,w.kind,run?run.time*3:0,w.kind==='bollard'?(building?1:w.lift||0):progress,offset);
 g.restore();
 if(run&&w.kind==='ice'){
  const reach=Math.min(1,progress/ICE_LATCH,(1-progress)/(1-ICE_FREEZE));
  g.save();
  for(const z of run.targets){
   if(progress>=ICE_LATCH&&!run.grabbed.has(z))continue;
   const dx=z.x+z.w/2-x,dy=z.y+z.h/2-y;
   g.save();g.translate(x,y);g.rotate(Math.atan2(dy,dx));
   const length=Math.hypot(dx,dy)*reach;
   g.strokeStyle='#ac874e';g.lineWidth=2;g.beginPath();g.moveTo(0,0);g.lineTo(length,0);g.stroke();
   g.strokeStyle='#bcf9ff';g.lineWidth=3;
   const gap=3+6*(1-reach);
   for(const sign of [-1,1]){
    g.beginPath();g.moveTo(length-7,0);g.lineTo(length-2,sign*gap);g.lineTo(length+3,sign*gap);g.stroke();
   }
   g.restore();
  }
  g.restore();
 }
 if(!building&&w.hp<spec(w).hp){
  g.fillStyle='#263039';g.fillRect(x-9,w.y+size-4,18,2);
  g.fillStyle='#f2b968';g.fillRect(x-9,w.y+size-4,18*Math.max(0,w.hp/spec(w).hp),2);
 }
}
// Devices act only when the real wave is moving. Cooldowns advance on the
// same dt, not while the player is building, paused, or holding a serve.
function randomRest(w){return spec(w).cycle*(.65+.8*Math.random())}
function withinReach(z,w){
 const half=T*span(w)/2;
 const dx=Math.max(0,Math.abs(z.x+z.w/2-w.x-half)-half);
 const dy=Math.max(0,Math.abs(z.y+z.h/2-w.y-half)-half);
 return dx*dx+dy*dy<=spec(w).range**2;
}
function eligible(z,w,now){
 if(z.hp<=0||(z.arrivalTime||0)<0||z.y+z.h>550||!withinReach(z,w))return false;
 if(w.kind==='lure'){
  const dx=z.x+z.w/2-w.x-T,up=duckOriginY(w)-z.y-z.h/2;
  return !z.boss&&!(z.fortressFrozenUntil>now)&&up>0&&Math.abs(dx)<=up&&Math.hypot(dx,up)<=spec(w).range+12;
 }
 return w.kind!=='ice'||(!(z.fortressIceReady>now)&&!(z.knockTime>0));
}
function reelIceTarget(w,z,prev,progress,now,ops){
 const run=w.run;
 if(prev<ICE_LATCH&&progress>=ICE_LATCH&&eligible(z,w,now)){
  run.grabbed.add(z);
  const remaining=(ICE_FREEZE-ICE_LATCH)*spec(w).duration;
  z.fortressIceReady=now+remaining;
  z.trashStopUntil=Math.max(z.trashStopUntil||0,now+remaining);
  delete z.wormParade;delete z.breakoutTime;delete z.eliteMotion;
 }
 if(!run.grabbed.has(z)||prev>=ICE_FREEZE)return false;
 const dx=w.x+T-z.x-z.w/2,dy=w.y+T-z.y-z.h/2;
 const distance=Math.hypot(dx,dy);
 const elapsed=Math.max(0,Math.min(progress,ICE_FREEZE)-Math.max(prev,ICE_LATCH))*spec(w).duration;
 const travel=Math.min(distance,elapsed*760);
 // Test short steps along the line so neither compact enemies nor a wall
 // can be skipped, even when an entire pull is processed in one update.
 const steps=Math.ceil(travel/3);
 for(let step=0;step<steps;step++){
  const x=z.x+dx/distance*travel/steps,y=z.y+dy/distance*travel/steps;
  if(y+z.h>550||!ops.canMove?.(z,x,y))break;
  z.x=x;z.y=y;
 }
 if(progress<ICE_FREEZE)return false;
 const duration=z.boss?.85:2.8;
 z.fortressFrozenUntil=now+duration;z.fortressIceReady=now+duration+2;
 z.trashStopUntil=Math.max(z.trashStopUntil||0,z.fortressFrozenUntil);
 return true;
}
// The centre of the painted duck sits 18/64 down the machine.
function duckOriginY(w){return w.y+2*T*18/64}
function duckTravel(p){
 if(p<.22)return -4*Math.sin(Math.PI*p/.22);
 if(p<.45)return BUILD_TYPES.lure.range*(1-(1-(p-.22)/.23)**2);
 return BUILD_TYPES.lure.range*(1-(p-.45)/.55)**2;
}
function strikeDuck(w,enemies,prev,progress,now,ops){
 if(progress<=.22||prev>=.45)return;
 const run=w.run,start=duckTravel(Math.max(.22,prev)),end=duckTravel(Math.min(.45,progress));
 const steps=Math.max(1,Math.ceil((end-start)/4));
 for(let i=0;i<=steps;i++){
  const d=start+(end-start)*i/steps,x=w.x+T+run.dx*d,y=duckOriginY(w)+run.dy*d;
  for(const z of enemies){
   if(run.struck.has(z)||z.boss||z.hp<=0||(z.arrivalTime||0)<0||z.fortressFrozenUntil>now)continue;
   const ax=Math.max(z.x-x,0,x-z.x-z.w),ay=Math.max(z.y-y,0,y-z.y-z.h);
   if((ax/14)**2+(ay/9)**2>1)continue;
   run.struck.add(z);
   if(ops.push?.(z,run.dx,run.dy))ops.pulse?.('lure',x,y,1);
  }
 }
}
// Plan small, swept displacements. Each touching neighbour joins the same
// directional shove, while a wall, boss or road edge stops the connected group.
function duckKnockPlan(root,dx,dy,enemies,inside){
 const positions=new Map(),stride=3,limit=12;
 for(let step=0;step<24;step++){
  const next=new Map();
  function advance(z,depth){
   if(next.has(z))return true;
   if(z.boss||depth>limit)return false;
   const old=positions.get(z)||z;
   const pos={x:old.x+dx*stride,y:old.y+dy*stride,chainDepth:old.chainDepth??depth};
   if(!inside(z,pos)||!isPathClear(z,old.x,old.y,pos.x,pos.y))return false;
   next.set(z,pos);
   for(const other of enemies){
    if(other===z)continue;
    const at=next.get(other)||positions.get(other)||other;
    if(pos.x<at.x+other.w+.5&&pos.x+z.w+.5>at.x&&pos.y<at.y+other.h+.5&&pos.y+z.h+.5>at.y){
     if(next.has(other)||!advance(other,depth+1))return false;
    }
   }
   return true;
  }
  if(!advance(root,0))break;
  for(const [actor,pos] of next)positions.set(actor,pos);
 }
 return positions;
}
function tickBollard(w,dt,enemies,ops){
 w.cooldown=Math.max(0,w.cooldown-dt);
 if(w.cooldown===0){
  if(w.raised){
   w.raised=false;w.cooldown=randomRest(w);
  }else{
   const cx=w.x+T/2,cy=w.y+T/2;
   const nearby=enemies.filter(z=>z.hp>0&&(z.arrivalTime||0)>=0&&intersects(z.x,z.y,z.w,z.h,w,T));
   // Clear the hatch before solidifying. Shove away from its centre, favouring
   // sideways escape on the player-facing side to respect the defence line.
   for(const z of nearby){
    const dx=z.x+z.w/2-cx,dy=z.y+z.h/2-cy;
    const vx=dy>0?(dx<0?-1:1):dx,vy=dy>0?0:Math.min(-1,dy);
    const length=Math.hypot(vx,vy);
    if(!ops.push?.(z,vx/length,vy/length)&&intersects(z.x,z.y,z.w,z.h,w)){
     // Try a clear exit for a boss or a zombie pinned on the primary side.
     for(const [sx,sy] of [[0,-1],[-1,0],[1,0]]){
      const distance=sy<0?z.y+z.h-w.y+2:sx<0?z.x+z.w-w.x+2:w.x+T-z.x+2;
      const steps=Math.ceil(distance/3);
      let clear=true;
      for(let n=1;n<=steps;n++){
       if(!ops.canMove?.(z,z.x+sx*distance*n/steps,z.y+sy*distance*n/steps)){clear=false;break}
      }
      if(clear){z.x+=sx*distance;z.y+=sy*distance;break}
     }
    }
   }
   // An immovable boss or a packed corridor can pin the hatch.
   if(enemies.some(z=>z.hp>0&&intersects(z.x,z.y,z.w,z.h,w))){
    w.cooldown=.8+Math.random();return;
   }
   w.raised=true;w.cooldown=1.8+Math.random()*2.2;
   ops.pulse?.('bollard',cx,cy,nearby.length);
  }
 }
 w.lift=w.raised?Math.min(1,(w.lift||0)+dt*14):Math.max(0,(w.lift||0)-dt*7);
}
function tickDevices(dt,enemies,now,ops){
 if(active||!walls.size)return;
 for(const w of walls.values()){
  if(!w.kind||w.kind==='wall')continue;
  if(w.kind==='bollard'){tickBollard(w,dt,enemies,ops);continue}
  const type=spec(w),cx=w.x+T,cy=w.y+T;
  if(!w.run){
   w.cooldown=Math.max(0,w.cooldown-dt);
   if(w.cooldown>0)continue;
   const distance=z=>(z.x+z.w/2-cx)**2+(z.y+z.h/2-cy)**2;
   const targets=enemies.filter(z=>eligible(z,w,now)).sort((a,b)=>distance(a)-distance(b))
    .slice(0,w.kind==='saw'?3:w.kind==='ice'?4:6);
   if(!targets.length){w.cooldown=.25+.5*Math.random();continue}
   w.run={time:0,targets};
   if(w.kind==='ice')w.run.grabbed=new Set();
   if(w.kind==='lure'){
    const target=targets[0],dx=target.x+target.w/2-cx,dy=target.y+target.h/2-duckOriginY(w);
    const length=Math.hypot(dx,dy);
    Object.assign(w.run,{dx:dx/length,dy:dy/length,struck:new Set()});
   }
  }
  const run=w.run,prev=run.time/type.duration;
  run.time=Math.min(type.duration,run.time+dt);
  const progress=run.time/type.duration;
  if(w.kind==='lure'){
   strikeDuck(w,enemies,prev,progress,now,ops);
   if(progress>=1){w.run=null;w.cooldown=randomRest(w)}
   continue;
  }
  let hit=0;
  for(const [i,z] of run.targets.entries()){
   if(z.hp<=0||!enemies.includes(z))continue;
   if(w.kind==='ice'){
    if(reelIceTarget(w,z,prev,progress,now,ops))hit++;
    continue;
   }
   if(!eligible(z,w,now))continue;
   const impact=(i+.5)/run.targets.length;
   if(prev>=impact||progress<impact)continue;
   ops.damage?.(z,z.boss?1:2);hit++;
  }
  if(hit)ops.pulse?.(w.kind,cx,cy,hit);
  if(progress>=1){w.run=null;w.cooldown=randomRest(w)}
 }
 // Keep freshly frozen enemies out of the normal march/parade selectors.
 for(const z of enemies)if(z.fortressFrozenUntil>now){
  z.trashStopUntil=Math.max(z.trashStopUntil||0,z.fortressFrozenUntil);
  z.hitHold=Math.max(z.hitHold||0,.11);z.recoil=Math.max(z.recoil||0,.031);
  delete z.wormParade;delete z.breakoutTime;delete z.eliteMotion;
 }
}
function drawStatuses(g,enemies,now,position){
 for(const actor of enemies){
  if(!(actor.fortressFrozenUntil>now))continue;
  const z=position(actor),x=z.x-2,y=z.y-2,w=z.w+4,h=z.h+4;
  g.save();g.globalAlpha=.32;g.fillStyle='#8fe9ff';g.fillRect(x,y,w,h);
  g.globalAlpha=.9;g.strokeStyle='#cafaff';g.lineWidth=1.5;g.strokeRect(x,y,w,h);
  g.fillStyle='#d4ffff';g.fillRect(x+2,y+2,3,8);g.fillRect(x+6,y+2,6,2);
  // The comic rope remains readable on the transparent ice shell.
  g.fillStyle='#c99c52';g.fillRect(x,y+h*.65,w,3);g.fillStyle='#ffdb86';g.fillRect(x+w*.45,y+h*.65-2,5,6);
  g.restore();
 }
}
for(const {kind,el} of buildButtons)el?.addEventListener?.('click',()=>selectBuild(kind));
makeDeviceIcons();

function draw(g,building=false){
 const bitmap=bitmapTiles();
 const tile=bitmap||tiles();if(!tile)return;
 const frame=bitmap?BARRICADE_FRAME:T;
 for(const w of walls.values()){
  if(w.kind&&w.kind!=='wall'){drawDevice(g,w,building);continue}
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
  const size=T*span(p);
  if(p.action==='remove'){
   // Demolition must be unmistakably red without deleting real walls until
   // Confirm. Keep the underlying cube visible through the overlay.
   g.globalAlpha=.63;g.fillStyle='#fc334c';g.fillRect(p.x+1,p.y+1,size-2,size-2);
   g.globalAlpha=1;g.strokeStyle='#ff3f5c';g.lineWidth=2.4;
   g.strokeRect(p.x+1,p.y+1,size-2,size-2);
   g.beginPath();g.moveTo(p.x+5,p.y+5);g.lineTo(p.x+size-5,p.y+size-5);
   g.moveTo(p.x+size-5,p.y+5);g.lineTo(p.x+5,p.y+size-5);g.stroke();
  }else{
   g.globalAlpha=.8;if(p.kind&&p.kind!=='wall')drawDevice(g,p,true);else g.drawImage(tile,0,0,frame,frame,p.x,p.y,T,T);
   g.globalAlpha=1;g.strokeStyle='#ffe78f';
   g.lineWidth=1.8;g.strokeRect(p.x+1,p.y+1,size-2,size-2);
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
window.ZZFortress={duckKnockPlan,reset,begin,deploy,resolve,selectBuild,tickDevices,drawStatuses,getBuildType:()=>selectedBuild,getStructure:(col,row)=>occupied.get(id(col,row)),isOpen,isPathClear,escapeWall,bounceBall,draw,tick,down,move,up,cancel,ready,
 bind(fn){onReady=fn},getStock:()=>stock,getWallCount:()=>walls.size,
 getQueueCount:()=>queued.length,getPendingRefund:()=>destroyedThisStage,
 getSupply:()=>({refund:lastRefund,bonus:lastBonus,healed:lastHealed}),
 getPreview:()=>totals(),getWallHP:(col,row)=>occupied.get(id(col,row))?.hp||0,
 bounds:()=>({left:X,right:X+COLS*T,enemyLeft:FIELD_LEFT,enemyRight:FIELD_RIGHT,columns:COLS,rows:ROWS,tile:T})};
})();
