/* BARRICADE HORDE: independent construction + persistent wall simulation. */
(function(){
'use strict';
// One MINI-sized half cell (11px) of clearance on either side.
// Construction spans [38,412] with 17 whole 22px wall blocks; the original
// 18-column grid spanned [27,423]. All zombie colliders use this same strip.
const MINI_TILE=22,ENDLESS_TILE=44,MAX_HP=30,MAX_WALLS=180;
const INITIAL_MATERIAL=16;
const FORTRESS_SIDE_INSET=4;
let X=38,Y=82,T=MINI_TILE,COLS=17,ROWS=20,FIELD_LEFT=42,FIELD_RIGHT=408;
// V412: normal zombies are 33x44; one normal structure cell is 44x44.
function setStructureGrid(endless){
 T=MINI_TILE;
 X=endless?49:38;Y=endless?58:82;
 COLS=endless?16:17;ROWS=20;
 FIELD_LEFT=endless?42:X+FORTRESS_SIDE_INSET;
 FIELD_RIGHT=endless?408:X+COLS*T-FORTRESS_SIDE_INSET;
}
const occupied=new Map(); // Each occupied tile points to its single structure.
const walls=new Map(),pending=new Map();
// V442: wall and mole use one 22px cell; other machines retain 44px footprints.
const BUILD_TYPES={
 wall:{name:'방벽',cost:1,hp:30,desc:'연속 드래그 설치 · 적과 공 차단'},
 bollard:{name:'두더지 차단봉',cost:2,hp:12,cycle:4.8,desc:'드래그 연속 설치 · 솟을 때 밀치고 길을 막음'},
 lure:{name:'꽥꽥 유인기',cost:4,hp:12,range:100,duration:.84,cycle:4.5,desc:'위쪽 90° 스프링 돌진 · 충돌 시 연쇄 넉백'},
 saw:{name:'빙글 톱날',cost:5,hp:14,range:34,duration:1.1,cycle:1.65,desc:'주변 좀비 최대 3마리에 반복 피해'},
 ice:{name:'꽁꽁 포획기',cost:3,hp:16,range:126,duration:.85,cycle:3.5,desc:'최대 4마리 당겨 결빙 · 대기 중 피해 절반'}
};
let selectedBuild='wall',placementTip='';
const spec=w=>BUILD_TYPES[w?.kind]||BUILD_TYPES.wall;
const buildButtons=['wall','bollard','ice','lure','saw'].map(kind=>({kind,el:document.getElementById('build-pick-'+kind)}));
const $=id=>document.getElementById(id);
const ui=$('fortress-builder'),actions=$('fortress-actions'),readyButton=$('fortress-ready'),
 confirmButton=$('fortress-confirm'),cancelButton=$('fortress-cancel'),materialLabel=$('fortress-material'),helpLabel=$('fortress-tip'),
 previewLabel=$('fortress-preview-summary');
let stock=0,active=false,dragging=false,pointer=null,last=null,queued=[],stage=1,onReady=null;
let destroyedThisStage=0,lastRefund=0,lastBonus=0,lastHealed=0;
// V441: combat-only bitmap debris, independent of removed colliders.
const structureDebris=[],structureDebrisArt=new Map();
let starting=false,startToken=0,onStartFeedback=null;
const id=(col,row)=>row*COLS+col;
const cell=(col,row)=>({col,row,x:X+col*T,y:Y+row*T,id:id(col,row)});
const smallStructure=w=>!w?.kind||w.kind==='wall'||w.kind==='bollard';
const span=w=>smallStructure(w)?1:2;
const structureSize=w=>T*span(w);
const canDragBuild=()=>selectedBuild==='wall'||selectedBuild==='bollard';
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
 if(actions)actions.hidden=!active||!hasPreview||dragging;
 readyButton.hidden=!active||hasPreview||dragging;
 readyButton.disabled=starting;
 if(readyButton.dataset)readyButton.dataset.starting=String(starting);
 if(confirmButton)confirmButton.disabled=!summary.valid;
 if(materialLabel){
  materialLabel.hidden=!active;
  const amount=materialLabel.querySelector?.('strong');
  // Total includes all standing structures plus unspent stock; pending
  // construction/demolition changes the used portion, not the total.
  let installedCost=0;
  for(const w of walls.values())installedCost+=spec(w).cost;
  const used=installedCost+summary.cost-summary.refund;
  const total=installedCost+stock;
  if(amount)amount.textContent=String(used)+'/'+String(total);
  if(materialLabel.dataset)materialLabel.dataset.empty=String(summary.balance===0);
 }
 if(previewLabel)previewLabel.textContent=
  '설치 +'+summary.builds+' (자재 -'+summary.cost+') · 철거 -'+summary.removes+' (환급 +'+summary.refund+')'+
  (!summary.valid?' · 자재/공간 부족':'');
 for(const {kind,el} of buildButtons)if(el){
  el.setAttribute?.('aria-pressed',String(kind===selectedBuild));
  el.disabled=hasPreview||dragging||starting;
  if(el.dataset)el.dataset.affordable=String(stock>=BUILD_TYPES[kind].cost);
 }
 if(helpLabel)helpLabel.textContent=hasPreview?'놓으면 즉시 적용 · 전장 밖으로 놓으면 아이콘 설치 취소'
  :placementTip?placementTip:stock?(span({kind:selectedBuild})===1?'1칸 · ':'2×2칸 · ')+BUILD_TYPES[selectedBuild].desc+' · 아이콘 직접 드래그 · 기존 구조물 터치: 철거'
  :'기존 구조물 철거로 자재 확보 가능';
}
function addCell(t,buildOnly=false){
 if(!t)return;
 const current=occupied.get(t.id);
 if(buildOnly&&current)return;
 if(current)t=cell(current.col,current.row);
 else if(span({kind:selectedBuild})===2){
  t=cell(Math.min(t.col,COLS-2),Math.min(t.row,ROWS-2));
  let blocked=false;
  footprint({...t,kind:selectedBuild},key=>{
    if(occupied.has(key))blocked=true;
    const col=key%COLS,row=Math.floor(key/COLS);
    for(const q of pending.values())if(q.action==='build'&&col>=q.col&&col<q.col+span(q)&&row>=q.row&&row<q.row+span(q))blocked=true;
   });
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
let touchStroke=null,iconStroke=false;
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
 if(!active||dragging||starting)return false;
 if(e.button!==undefined&&e.button!==0)return false;
 const to=pointerCell(e,canvas);
 if(!to)return false;
 placementTip='';pending.clear();dragging=true;pointer=e.pointerId;last=null;iconStroke=false;
 const origin=pointerPosition(e,canvas);
 touchStroke=e.pointerType==='touch'?{originX:origin.x,originY:origin.y,anchor:to,axis:null}:null;
 if(canDragBuild())lineTo(to);else addCell(to);refresh();
 try{canvas.setPointerCapture(e.pointerId)}catch{}
 return true;
}
// V468: dragging a picker icon previews one structure; never demolish on drop.
function iconDown(kind,e,canvas){
 if(!active||dragging||starting||!BUILD_TYPES[kind]||(e.button!==undefined&&e.button!==0))return false;
 if(!selectBuild(kind))return false;
 if(stock<BUILD_TYPES[kind].cost)return false;
 pending.clear();dragging=true;pointer=e.pointerId;last=null;touchStroke=null;iconStroke=true;
 try{canvas.setPointerCapture(e.pointerId)}catch{}
 refresh();return true;
}
function previewIcon(e,canvas){
 pending.clear();placementTip='';
 const to=pointerCell(e,canvas);
 if(to)addCell(to,true);
}
function move(e,canvas){
 if(!active||!dragging||e.pointerId!==pointer)return false;
 if(iconStroke)previewIcon(e,canvas);
 else if(canDragBuild())touchLineTo(e,canvas);
 refresh();return true;
}
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
 if(iconStroke)previewIcon(e,canvas);
 else if(canDragBuild())touchLineTo(e,canvas,false);
 dragging=false;pointer=null;last=null;touchStroke=null;iconStroke=false;
 showActionsAt(e,canvas);refresh();return true;
}
function cancel(){dragging=false;pointer=null;last=null;touchStroke=null;iconStroke=false;pending.clear();refresh()}
// Real pointer releases commit immediately. A cancelled gesture is never charged.
function finish(e,canvas){
 if(!dragging||e.pointerId!==pointer)return false;
 if(e.type&&e.type!=='pointerup'){cancel();return true}
 if(!iconStroke&&!pointerCell(e,canvas)){cancel();return true}
 if(!up(e,canvas))return false;
 confirm();return true;
}
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
 starting=false;startToken++;
 occupied.clear();walls.clear();pending.clear();structureDebris.length=0;queued=[];stock=0;stage=1;selectedBuild='wall';setStructureGrid(false);
 active=false;dragging=false;pointer=null;last=null;touchStroke=null;
 destroyedThisStage=0;lastRefund=0;lastBonus=0;lastHealed=0;refresh();
}
// Endless assistance uses the same physical devices, without spending stock
// or invoking construction, relocation, Ready, or the fortress UI.
const ENDLESS_DEVICE_ORDER=['wall','bollard','ice','lure','saw'];
const ENDLESS_INTRO_WAVES=[1,3,5,7,9],ENDLESS_MAX_STRUCTURES=6;
function shuffledEndless(list){
 for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}
 return list;
}
function setupEndless(wave,enemies,defenseY=565){
 reset();
 if(wave<1)return 0;
 setStructureGrid(true);stage=wave;
 const kinds=ENDLESS_DEVICE_ORDER.filter((kind,i)=>wave>=ENDLESS_INTRO_WAVES[i]);
 // One additional random type from wave 15, never more than two of a type.
 if(wave>=15&&kinds.length<ENDLESS_MAX_STRUCTURES)kinds.push(ENDLESS_DEVICE_ORDER[Math.floor(Math.random()*ENDLESS_DEVICE_ORDER.length)]);
 const mapHeight=defenseY+145,front=enemies.reduce((y,z)=>Math.max(y,z.y+z.h),0);
 const minY=Math.max(mapHeight/3,front+12),maxY=Math.min(mapHeight*2/3,defenseY-66);
 // V443: straight, independent small-cell lines, irregularly spaced machines.
 // Every candidate uses its actual rectangular footprint, not a 44px macro grid.
 const candidates={line:[],machine:[]};
 const overlaps=(a,b,margin=0)=>a.x<b.x+b.w+margin&&a.x+a.w>b.x-margin&&a.y<b.y+b.h+margin&&a.y+a.h>b.y-margin;
 function candidate(col,row,cols,rows,list){
  if(col+cols>COLS||row+rows>ROWS)return;
  const p={...cell(col,row),cols,rows,w:cols*T,h:rows*T};
  if(p.y<minY||p.y+p.h>maxY||enemies.some(z=>overlaps(p,z,12)))return;
  list.push(p);
 }
 for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){
  candidate(col,row,2,2,candidates.machine);
  for(let length=4;length<=6;length++){
   candidate(col,row,length,1,candidates.line);
   candidate(col,row,1,length,candidates.line);
  }
 }
 let best=[];
 // A bounded randomized search, with a different full-height 132px clear
 // corridor on each attempt. Close pairs and broad gaps are both possible.
 for(let attempt=0;attempt<40;attempt++){
  const corridor=Math.floor(Math.random()*(COLS-5));
  const fits=p=>p.col+p.cols<=corridor||p.col>=corridor+6;
  const line=candidates.line.filter(fits),machine=candidates.machine.filter(fits);
  const chosen=[];
  for(const kind of kinds){
   const pool=smallStructure({kind})?line:machine;
   // No fixed spacing: a small safety gap keeps separate groups identifiable.
   // Different groups may sit close or far apart and use odd grid offsets.
   const available=pool.filter(p=>chosen.every(v=>!overlaps(p,v,6)));
   if(!available.length)break;
   const p=available[Math.floor(Math.random()*available.length)];
   chosen.push({...p,kind});
  }
  if(chosen.length>best.length)best=chosen;
  if(chosen.length===kinds.length)break;
 }
 for(const p of best){
  const kind=p.kind,type=BUILD_TYPES[kind];
  const group=[];
  if(smallStructure(p)){
   for(let dy=0;dy<p.rows;dy++)for(let dx=0;dx<p.cols;dx++)group.push(cell(p.col+dx,p.row+dy));
  }else group.push(cell(p.col,p.row));
  for(const pos of group){
   const w={...pos,kind,hp:type.hp,hit:0,biteShake:0,run:null,pulse:0,raised:false,lift:0};
   w.cooldown=kind==='wall'?0:kind==='ice'?.3+.45*Math.random():randomRest(w)*(.25+.45*Math.random());
   walls.set(w.id,w);footprint(w,key=>occupied.set(key,w));
  }
 }
 return walls.size;
}
function begin(enemies,wave){
 if(X!==38)reset();
 starting=false;startToken++;
 placementTip='';structureDebris.length=0;queued=enemies.splice(0,enemies.length);stage=wave;
 if(wave===1){
  stock=INITIAL_MATERIAL;lastBonus=INITIAL_MATERIAL;lastRefund=0;lastHealed=0;destroyedThisStage=0;
 }else{
  // Stage survived: every remaining cube heals completely without consuming
  // construction materials; already destroyed cubes stay absent and refund
  // one material each on top of the regular per-wave supply.
  lastHealed=walls.size;
  for(const w of walls.values()){w.hp=spec(w).hp;w.hit=0;w.biteShake=0;w.cooldown=0;w.run=null;w.pulse=0;w.fxImpact=0;w.raised=false;w.lift=0;w.moleHit=0;w.moleHitSide=0}
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
  w.run=null;w.fxImpact=0;w.cooldown=w.kind==='ice'?.3+.45*Math.random():randomRest(w)*(.25+.45*Math.random());
 }
 target.push(...queued);queued=[];active=false;cancel();refresh();
 return true;
}
function ready(){if(!active||dragging||pending.size||starting)return false;if(typeof onReady==='function')onReady();return true}
function startWithFeedback(){
 if(!active||dragging||pending.size||starting)return false;
 // Preserve direct ready semantics for non-browser simulation environments.
 if(typeof window.setTimeout!=='function')return ready();
 starting=true;const token=++startToken;refresh();
 if(typeof onStartFeedback==='function')onStartFeedback();
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 window.setTimeout(()=>{
  if(token!==startToken||!starting)return;
  starting=false;refresh();
  ready();
 },reduced?80:520);
 return true;
}
// A stopped boss still attacks nearby solid structures.
function adjacentStructure(z){
 const gap=z.boss?6:3.5;
 const c0=Math.max(0,Math.floor((z.x-gap-X)/T)),c1=Math.min(COLS-1,Math.floor((z.x+z.w+gap-X)/T));
 const r0=Math.max(0,Math.floor((z.y-gap-Y)/T)),r1=Math.min(ROWS-1,Math.floor((z.y+z.h+gap-Y)/T));
 let nearest=null,best=Infinity;
 for(let row=r0;row<=r1;row++)for(let col=c0;col<=c1;col++){
  const w=occupied.get(id(col,row));
  if(!isSolid(w)||(!z.boss&&(!w.kind||w.kind==='wall')))continue;
  const size=T*span(w);
  const dx=Math.max(0,w.x-z.x-z.w,z.x-w.x-size),dy=Math.max(0,w.y-z.y-z.h,z.y-w.y-size);
  const d=Math.hypot(dx,dy);
  if(d<=gap&&d<best){best=d;nearest=w}
 }
 return nearest;
}
function resolve(z,oldX,oldY,dt,onBreak,now=Infinity){
 const trace=firstWallOnPath(oldX,oldY,z.x,z.y,z.w,z.h);
 const hit=trace?.wall||adjacentStructure(z);
 if(!hit){
  z.fortressTarget=null;z.fortressBite=0;return false;
 }
 if(trace&&!trace.startInside){
  // Stop at the last genuinely safe point along the swept movement.
  z.x=trace.x;z.y=trace.y;
 }else if(trace&&!isOpen(z,z.x,z.y)){
  // A previously embedded enemy must be pushed outside immediately.
  escapeWall(z,oldX,oldY);
 }
 // Do not let an overlapping start persist or award bites when already clear.
 if(!isOpen(z,z.x,z.y)){
  z.fortressTarget=null;z.fortressBite=0;return true;
 }
 if((z.fortressFrozenUntil||0)>now||(z.trashStopUntil||0)>now||(z.hitShakeUntil||0)>now||(z.knockTime||0)>0)return true;
 if(z.fortressTarget!==hit.id){z.fortressTarget=hit.id;z.fortressBite=0}
 z.fortressBite=(z.fortressBite||0)+dt*(z.boss?2.25:Number.isInteger(z.eliteKind)?1.5:1);
 const bitePeriod=hit.kind==='bollard'?.48:.78;
 if(z.fortressBite>=bitePeriod){
  const damage=Math.floor(z.fortressBite/bitePeriod)*(z.boss?8:1);
  // Boss impacts overpower idle cryo armor; ordinary bites do not.
  const hpBefore=hit.hp;
  z.fortressBite%=bitePeriod;hit.hp-=hit.kind==='ice'&&!hit.run&&!z.boss?damage*.5:damage;hit.hit=.18;hit.biteShake=.18;
  if(hit.kind==='bollard'){hit.moleHit=.28;hit.moleHitSide=z.x+z.w/2<hit.x+structureSize(hit)/2?1:-1}
  if(hit.hp<=0)spawnStructureBreak(hit,hpBefore);
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
   if(im.naturalWidth===BARRICADE_FRAME*5&&im.naturalHeight===BARRICADE_FRAME){barricadeSprite=im;makeDeviceIcons()}
  };
  im.onerror=()=>{}; // never repaint an absent asset every frame
  im.src=BARRICADE_BITMAP_URL;
 }
 return null;
}
let atlas=null;
function tiles(){
 if(atlas)return atlas;
 atlas=document.createElement('canvas');atlas.width=MINI_TILE*4;atlas.height=MINI_TILE;
 const q=atlas.getContext('2d');if(!q)return atlas;
 q.imageSmoothingEnabled=false;
 const palettes=[
  ['#a9abb0','#7a868c','#56666d','#cdd2c4'],
  ['#a9a399','#898072','#675f5a','#d3b994'],
  ['#8e7771','#715553','#59494d','#b99681'],
  ['#696067','#5c4b53','#493f48','#b17b70']
 ];
 for(let k=0;k<4;k++){
  const x=k*MINI_TILE,p=palettes[k];
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

// Twelve transparent, separately articulated voxel sprite parts, 128px per cell.
const partsURL='assets/ip/v2/barricades/fortress-voxels-v373.png';
let parts=null,duckFaces=null;
function part(g,index,x,y,w,h,expression=0,direction=2){
 // V472: 5 directional cels x 2 expressions, original-art raster atlas.
 if(index===4&&duckFaces){g.drawImage(duckFaces,direction*128,expression*140,128,140,x,y,w,h);return}
 if(index===4){y+=h-w;h=w}
 if(parts)g.drawImage(parts,(index%4)*128,Math.floor(index/4)*128,128,128,x,y,w,h);
}
function linkage(g,index,x,y,dx,dy,width){
 const length=Math.hypot(dx,dy);if(length<.1)return;
 g.save();g.translate(x,y);g.rotate(Math.atan2(dy,dx));
 if(index===10){g.rotate(Math.PI/2);part(g,index,-width/2,-length,width,length)}
 else part(g,index,0,-width/2,length,width);
 g.restore();
}
function paintMachine(g,kind,time,pulse,offset=null,layer='all'){
 if(kind==='wall'){
  const tile=bitmapTiles();if(tile)g.drawImage(tile,0,0,56,56,0,0,64,64);
  return;
 }
 if(kind==='bollard'){
  part(g,3,0,22,64,40);
  if(pulse<=0||!parts)return;
  const spring=time>0?Math.sin(time*30)*Math.exp(-time*6.5)*.56:0;
  // Keep the lower body below the curved inner edge of the rocks, even
  // during the elastic rise. The mole must emerge from a hole, not a flat cut.
  const impact=offset?.moleImpact;
  const height=54*pulse*(1+spring)*(impact?.height||1),width=(46*(.70+.30*pulse))/(1+spring*.48)*(impact?.width||1);
  const gaze=impact?.gaze??Math.sin(time*5);
  const face=gaze<-.42?0:gaze>.42?2:1;
  part(g,face,32-width/2+(impact?.x||0),56-height,width,height);
  // Repaint only the original foreground stones, following their irregular
  // U-shaped inner rim in source coordinates. No horizontal crop seam.
  g.save();g.translate(0,22);g.scale(.5,40/128);
  if(typeof g.clip==='function'){
   g.beginPath();g.moveTo(0,47);g.lineTo(13,48);g.lineTo(24,57);
   g.lineTo(36,75);g.lineTo(47,78);g.lineTo(56,86);
   g.lineTo(69,85);g.lineTo(80,77);g.lineTo(93,71);
   g.lineTo(105,56);g.lineTo(116,47);g.lineTo(128,43);
   g.lineTo(128,128);g.lineTo(0,128);g.closePath();g.clip();
   g.drawImage(parts,384,0,128,128,0,0,128,128);
  }else g.drawImage(parts,384,77,128,51,0,77,128,51);
  g.restore();
  return;
 }
 const x=offset?.x||0,y=offset?.y||0;
 if(kind==='lure'){
  if(layer!=='attack')part(g,5,2,27,60,36);
  if(layer!=='base'){
   const expression=offset?.angry?1:0,direction=offset?.direction??2;
   const bob=offset?.bob||0,jx=offset?.jitterX||0,jy=offset?.jitterY||0;
   linkage(g,10,32,36,x,y-13+bob,12);
   // Only the duck bobs or shakes; its metal base and collision stay fixed.
   part(g,4,11+x+jx,-11+y+bob+jy,43,47,expression,direction);
  }
 }else if(kind==='saw'){
  if(layer!=='attack')part(g,6,2,20,60,43);
  if(layer!=='base'){
   linkage(g,11,32,38,x,y-16,7);
   g.save();g.translate(32+x,22+y);g.rotate(time*17+.3);
   part(g,7,-22,-22,44,44);g.restore();
  }
 }else if(kind==='ice'){
  const spread=Math.sin(Math.PI*pulse)*5;
  if(!offset?.deployed)for(const side of [-1,1]){
   g.save();g.translate(32+side*(18+spread),17);g.rotate(side<0?-2.1:-1.04);
   part(g,9,-10,-15,21,20);g.restore();
  }
  part(g,8,3,9,58,54);
 }
}
// Dedicated high-DPI picker artwork: render the original bitmap parts
// directly into a 256px UI canvas, never enlarge the old 64px composite.
// Gameplay sprites and their animation geometry are deliberately untouched.
// Edge-directed bitmap enlargement for the 56px wall source. Unlike
// stretching a 64px composite, this reconstructs diagonal pixel edges.
let wallIconSource=null,wallIconHD=null;
function upscaleWallIcon(tile){
 if(!tile||typeof document.createElement!=='function')return null;
 if(wallIconSource===tile&&wallIconHD)return wallIconHD;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=BARRICADE_FRAME;
 const q=canvas.getContext?.('2d');
 if(!q||typeof q.getImageData!=='function'||typeof q.putImageData!=='function'||typeof q.createImageData!=='function')return null;
 q.drawImage(tile,0,0,BARRICADE_FRAME,BARRICADE_FRAME,0,0,BARRICADE_FRAME,BARRICADE_FRAME);
 let data=q.getImageData(0,0,BARRICADE_FRAME,BARRICADE_FRAME).data,side=BARRICADE_FRAME;
 // Two Scale2x passes, preserving the actual wall palette and transparency.
 for(let pass=0;pass<2;pass++){
  const next=new Uint8ClampedArray(side*side*16),n=side*2;
  const at=(x,y)=>(Math.max(0,Math.min(side-1,y))*side+Math.max(0,Math.min(side-1,x)))*4;
  const same=(a,b)=>{
   if(data[a+3]<16&&data[b+3]<16)return true;
   return Math.abs(data[a+3]-data[b+3])<20&&
    Math.abs(data[a]-data[b])+Math.abs(data[a+1]-data[b+1])+Math.abs(data[a+2]-data[b+2])<26;
  };
  const copy=(a,x,y)=>next.set(data.subarray(a,a+4),(y*n+x)*4);
  for(let y=0;y<side;y++)for(let x=0;x<side;x++){
   const e=at(x,y),b=at(x,y-1),d=at(x-1,y),f=at(x+1,y),h=at(x,y+1);
   const edge=!same(b,h)&&!same(d,f);
   copy(edge&&same(d,b)?d:e,x*2,y*2);
   copy(edge&&same(b,f)?f:e,x*2+1,y*2);
   copy(edge&&same(d,h)?d:e,x*2,y*2+1);
   copy(edge&&same(h,f)?f:e,x*2+1,y*2+1);
  }
  data=next;side=n;
 }
 canvas.width=canvas.height=side;
 const bitmap=q.createImageData(side,side);bitmap.data.set(data);q.putImageData(bitmap,0,0);
 wallIconSource=tile;wallIconHD=canvas;return canvas;
}
function makeDeviceIcons(){
 const resolution=256,artSize=384;
 // All five silhouettes fit the same visual envelope and retain aspect ratio.
 const displayScale={wall:.82,bollard:.82,ice:.82,lure:.82,saw:.82};
 let source=null,ctx=null;
 if(typeof document.createElement==='function'){
  source=document.createElement('canvas');source.width=source.height=artSize;
  ctx=source.getContext?.('2d');
 }
 for(const {kind,el} of buildButtons){
  const icon=el?.querySelector?.('canvas');if(!icon)continue;
  if(icon.width!==resolution)icon.width=resolution;
  if(icon.height!==resolution)icon.height=resolution;
  const q=icon.getContext?.('2d');if(!q)continue;
  q.clearRect(0,0,resolution,resolution);
  q.imageSmoothingEnabled=true;q.imageSmoothingQuality='high';
  const fit=resolution*displayScale[kind];
  if(!ctx||typeof ctx.getImageData!=='function'){
   q.save();q.translate((resolution-fit)/2,(resolution-fit)/2);q.scale(fit/64,fit/64);
   paintMachine(q,kind,0,kind==='bollard'?1:0);q.restore();continue;
  }
  ctx.clearRect(0,0,artSize,artSize);
  ctx.save();ctx.translate(32,32);ctx.scale(5,5);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const wall=kind==='wall'?upscaleWallIcon(bitmapTiles()):null;
  if(wall)ctx.drawImage(wall,0,0,64,64);
  else paintMachine(ctx,kind,0,kind==='bollard'?1:0);
  ctx.restore();
  const pixels=ctx.getImageData(0,0,artSize,artSize).data;
  let x0=artSize,y0=artSize,x1=-1,y1=-1;
  for(let y=0;y<artSize;y++)for(let x=0;x<artSize;x++){
   if(pixels[(y*artSize+x)*4+3]<12)continue;
   x0=Math.min(x,x0);y0=Math.min(y,y0);x1=Math.max(x,x1);y1=Math.max(y,y1);
  }
  if(x1<x0||y1<y0)continue;
  const w=x1-x0+1,h=y1-y0+1,scale=fit/Math.max(w,h);
  q.drawImage(source,x0,y0,w,h,(resolution-w*scale)/2,(resolution-h*scale)/2,w*scale,h*scale);
 }
}
if(typeof Image==='function'){
 const image=new Image();image.onload=()=>{
  if(image.naturalWidth===512&&image.naturalHeight===384){parts=image;makeDeviceIcons()}
 };image.src=partsURL;
 const faces=new Image();faces.onload=()=>{
  if(faces.naturalWidth===640&&faces.naturalHeight===280){duckFaces=faces;makeDeviceIcons()}
 };faces.src='assets/ip/v2/barricades/duck-faces-v472.png';
}
function selectBuild(kind){
 if(!active||dragging||starting||pending.size||!BUILD_TYPES[kind])return false;
 placementTip='';selectedBuild=kind;refresh();return true;
}
function armReach(w,dx,dy){
 const half=T*span(w)/2,length=Math.hypot(dx,dy);
 const face=length*half/Math.max(1,Math.abs(dx),Math.abs(dy));
 return Math.min(length,face+spec(w).range);
}
const ICE_LATCH=.32,ICE_FREEZE=.62;
function drawIceArms(g,w){
 const run=w.run,progress=run.time/spec(w).duration;
 const ease=t=>1-(1-Math.max(0,Math.min(1,t)))**2;
 const cx=w.x+structureSize(w)/2,cy=w.y+structureSize(w)/2,visualScale=structureSize(w)/ENDLESS_TILE;
 for(const z of run.targets){
  const grip=run.grabbed.get(z);
  if(z.hp<=0||(progress>=ICE_LATCH&&!grip))continue;
  const dx=z.x+z.w/2-cx,dy=z.y+z.h*.48-cy;
  const retract=progress>=ICE_FREEZE;
  const ax=retract?(grip.releaseX??dx):dx,ay=retract?(grip.releaseY??dy):dy;
  const angle=Math.atan2(ay,ax),distance=Math.hypot(ax,ay);
  // Dock to the actual near side of the target rather than its centre.
  const edge=Math.min(distance*.55,Math.max(3,Math.min(z.w,z.h)*.32));
  const end=Math.max(0,distance-edge);
  const length=end*(retract?1-ease((progress-ICE_FREEZE)/(1-ICE_FREEZE)):progress<ICE_LATCH?ease(progress/ICE_LATCH):1);
  if(length<8)continue;
  g.save();g.translate(cx,cy);g.rotate(angle);
  // A compact dark cable with a narrow cold highlight; no oversized arrows.
  linkage(g,11,0,0,length,0,5.2*visualScale);
  g.globalCompositeOperation='lighter';g.globalAlpha=.9;g.strokeStyle='#86e8ff';g.lineWidth=1.8;
  g.beginPath();g.moveTo(5,-.7);g.lineTo(length,-.7);g.stroke();
  if(grip&&!retract&&grip.moved>0.4){
   const shift=(run.time*120)%16;
   g.strokeStyle='#e2f9ff';g.lineWidth=2.8;g.globalAlpha=1;
   g.beginPath();
   for(let pos=length-shift;pos>12;pos-=16){g.moveTo(pos-3,-1);g.lineTo(pos+1,-1)}
   g.stroke();
  }
  g.globalCompositeOperation='source-over';g.globalAlpha=1;
  const claw=progress<ICE_LATCH?1.18:grip&&!retract?1.35:1;
  part(g,9,length-7*visualScale*claw,-6*visualScale*claw,14*visualScale*claw,12*visualScale*claw);
  g.globalCompositeOperation='lighter';g.globalAlpha=.28;
  part(g,9,length-7*visualScale*claw,-6*visualScale*claw,14*visualScale*claw,12*visualScale*claw);g.restore();
 }
}
// V469: presentation envelope only; never feeds movement or collision.
function devicePunch(w,building=false){
 if(building)return 0;
 const impact=Math.max(0,Math.min(1,(w.fxImpact||0)/.20));
 const pop=w.kind==='bollard'&&w.raised?Math.max(0,1-(w.moleTime||0)/.20):0;
 const windup=w.run?Math.max(0,1-w.run.time/.14)*.55:0;
 return Math.max(impact,pop,windup);
}
// Five real directional bitmap frames; attack uses actual target direction,
// not the direction of the retracting spring. Animation is visual only.
function duckPose(w,run,progress,building=false){
 const age=(w.duckIdleTime||0)+(w.id||0)*.071;
 if(building)return {direction:3,bob:0,angry:false,jitterX:0,jitterY:0};
 if(!run)return {direction:Math.max(0,Math.min(4,2+Math.round(2*Math.sin(age*2.25)))),
  bob:-4.2*Math.pow(Math.sin(age*5.2),2),angry:false,jitterX:0,jitterY:0};
 const direction=Math.max(0,Math.min(4,2+Math.round(2*(run.dx||0)/.7071)));
 const angry=progress<.79;
 const tick=Math.floor(run.time*60),strength=angry?(progress<.22?.55:progress<.53?1:.45):0;
 return {direction,bob:0,angry,jitterX:(tick%2?1:-1)*4.8*strength,
  jitterY:[-2.8,1.8,-1.2,2.5][tick%4]*strength};
}
function drawDevice(g,w,building=false,glow=null,drawGauge=true,layer='all'){
 if(!parts)return;
 const size=T*span(w),x=w.x+size/2,y=w.y+size/2;
 const run=building?null:w.run,progress=run?run.time/spec(w).duration:0;
 let offset=run&&w.kind==='ice'?{deployed:true}:null;
 if(!building&&w.kind==='bollard'&&w.moleHit>0)offset={moleImpact:moleImpactPose(w)};
 if(w.kind==='lure'){
  const travel=run?duckTravel(progress)*64/size:0;
  offset={...duckPose(w,run,progress,building),x:run?run.dx*travel:0,y:run?run.dy*travel:0};
 }
 if(run&&w.kind==='saw'){
  const step=progress*run.targets.length,index=Math.min(run.targets.length-1,Math.floor(step));
  const z=run.targets[index],reach=Math.sin(Math.PI*(step-index));
  const target=deviceTarget(z,x,y);
  const dx=target.x-x,dy=target.y-y;
  const scale=armReach(w,dx,dy)/Math.max(1,Math.hypot(dx,dy))*64/size;
  offset={x:dx*scale*reach,y:(dy*scale+10)*reach};
 }
 // Same impact envelope as barricades, applied only to the bitmap.
 const bite=building?0:Math.min(1,Math.max(0,(w.biteShake||0)/.18));
 const elapsed=.18-Math.min(.18,w.biteShake||0);
 const punch=devicePunch(w,building);
 const shakeX=(bite?Math.sin(elapsed*124+w.id*.31)*3*bite:0)+(punch?Math.sin((w.fxImpact||w.moleTime||0)*100+w.id)*2.8*punch:0);
 const shakeY=(bite?Math.cos(elapsed*105+w.id*.19)*1.5*bite:0)-(punch?2.2*punch:0);
 const time=w.kind==='bollard'?(building?0:w.moleTime||0):run?run.time*3:0;
 const pulse=w.kind==='bollard'?(building?1:w.lift||0):progress;
 g.save();g.translate(w.x+shakeX,w.y+shakeY);g.scale(size/64,size/64);
 // A single original-art afterimage follows each rapidly moving head,
 // never the stationary base. No new canvases or per-frame assets.
 if(run&&offset&&layer!=='base'&&(w.kind==='lure'||w.kind==='saw')&&
    Math.hypot(offset.x||0,offset.y||0)>12){
  g.save();g.globalAlpha=.32;g.globalCompositeOperation='lighter';
  paintMachine(g,w.kind,Math.max(0,time-.12),pulse,{...offset,x:offset.x*.79,y:offset.y*.79,jitterX:0,jitterY:0},'attack');
  g.restore();
 }
 if(bite>0||punch>0)g.filter='brightness('+String((1+Math.max(1.7*bite,(w.kind==='lure'&&offset?.angry?.25:1.1)*punch)).toFixed(2))+') saturate(.95)';
 if(punch&&layer!=='attack'){
  g.translate(32,40);g.scale(1+.09*punch,1-.10*punch);g.translate(-32,-40);
 }
 paintMachine(g,w.kind,time,pulse,offset,layer);
 g.restore();
 if(drawGauge)drawDeviceGauge(g,w,glow);
}
function drawDeviceGauge(g,w,glow=null){
 // Moles and ordinary walls retain their gauge-free appearance.
 if(w.kind==='bollard'||!w.kind||w.kind==='wall'||!Number.isFinite(w.hp))return;
 const size=T*span(w),x=w.x+size/2;
 {
  const width=24,bx=x-width/2,by=w.y+size+1,bw=width*Math.max(0,Math.min(1,w.hp/spec(w).hp));
  const color=w.kind==='ice'?'#46cfff':'#ffbf55';
  g.save();g.fillStyle='#172733';g.fillRect(bx-1,by-1,width+2,4);
  g.fillStyle=color;g.fillRect(bx,by,bw,2);g.restore();
  if(bw>0&&glow)glow(ctx=>{
   ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=color;
   ctx.globalAlpha=.32;ctx.fillRect(bx,by-1,bw,4);
   ctx.globalAlpha=.85;ctx.fillStyle=w.kind==='ice'?'#b9f4ff':'#fff0a3';
   ctx.fillRect(bx,by,bw,1);ctx.restore();
  });
 }
}

// Directional bitmap flinch: squash, overshoot and return. No collider changes.
function moleImpactPose(w){
 const p=1-Math.max(0,Math.min(1,(w.moleHit||0)/.28));
 const recoil=p<.34?Math.sin(p/.34*Math.PI/2):Math.pow(1-(p-.34)/.66,2);
 const rebound=p>.34?Math.sin((p-.34)/.66*Math.PI)*.11:0;
 const side=w.moleHitSide||1;
 return {x:side*7*recoil,height:1-.42*recoil+rebound,width:1+.23*recoil-rebound*.35,gaze:side};
}
// Use slices of the actual bitmap art; cache only the small source surfaces.
function structureBreakArt(w,hpBefore){
 const kind=w.kind||'wall';
 const variant=hpBefore>MAX_HP*.8?0:hpBefore>MAX_HP*.6?1:hpBefore>MAX_HP*.4?2:hpBefore>MAX_HP*.2?3:4;
 const raised=kind==='bollard'&&(w.raised||(w.lift||0)>.3);
 const key=kind==='wall'?kind+variant:kind+(raised?'up':'');
 if(structureDebrisArt.has(key))return structureDebrisArt.get(key);
 const source=document.createElement('canvas');source.width=64;source.height=64;
 const ctx=source.getContext?.('2d');if(!ctx)return null;
 if(kind==='wall'){
  const bitmap=bitmapTiles();
  if(bitmap)ctx.drawImage(bitmap,variant*BARRICADE_FRAME,0,BARRICADE_FRAME,BARRICADE_FRAME,0,0,64,64);
  else return null;
 }else{
  if(!parts)return null;
  paintMachine(ctx,kind,0,raised?1:0);
 }
 structureDebrisArt.set(key,source);return source;
}
function spawnStructureBreak(w,hpBefore){
 const art=structureBreakArt(w,hpBefore);if(!art)return;
 const size=structureSize(w),pieces=[];
 // Stable visual noise; never consume the simulation's random number stream.
 const seed=(w.id+1)*17+stage*31;
 const noise=n=>{const v=Math.sin(seed*12.9898+n*78.233)*43758.5453;return v-Math.floor(v)};
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  const i=row*4+col,dx=(col-1.5)/1.5,dy=(row-1.5)/1.5;
  pieces.push({sx:col*16,sy:row*16,x:w.x+(col+.5)*size/4,y:w.y+(row+.5)*size/4,
   // V463: compact local shatter; keep the original launch distribution and spin.
   vx:(dx*(100+noise(i*4)*110)+(noise(i*4+1)-.5)*80)*.09,
   vy:(-80+dy*48+noise(i*4+2)*115)*.28,spin:(noise(i*4+3)-.5)*16,
   size:size/4*(1.05+noise(i*4+4)*.55),life:.95+noise(i*4+5)*.45});
 }
 structureDebris.push({art,pieces,t:0});
}
function tickStructureDebris(dt){
 let write=0;
 for(const burst of structureDebris){
  // V466: accelerate the visual clock without shortening the fall path.
  burst.t+=dt*1.15;
  if(burst.t<1.4)structureDebris[write++]=burst;
 }
 structureDebris.length=write;
}
function drawStructureDebris(g){
 if(!structureDebris.length)return;
 for(const burst of structureDebris){
  const t=burst.t;
  for(const p of burst.pieces){
   if(t>=p.life)continue;
   const x=p.x+p.vx*t,y=p.y+p.vy*t+114.8*t*t;
   const alpha=Math.min(1,(p.life-t)/.28);
   g.save();g.translate(x,y);g.rotate(p.spin*t);g.globalAlpha=alpha;
   if(t<.085)g.filter='brightness('+String((1+1.3*(1-t/.085)).toFixed(2))+')';
   g.drawImage(burst.art,p.sx,p.sy,16,16,-p.size/2,-p.size/2,p.size,p.size);
   g.restore();
  }
 }
}
// Devices act only when the real wave is moving. Cooldowns advance on the
// same dt, not while the player is building, paused, or holding a serve.
function randomRest(w){return spec(w).cycle*(.65+.8*Math.random())}
// Boss body edge, rather than center, determines contact range.
function deviceTarget(z,cx,cy){
 return z.boss?{x:Math.max(z.x,Math.min(z.x+z.w,cx)),y:Math.max(z.y,Math.min(z.y+z.h,cy))}:{x:z.x+z.w/2,y:z.y+z.h/2};
}
function withinReach(z,w){
 const half=T*span(w)/2,cx=w.x+half,cy=w.y+half,p=deviceTarget(z,cx,cy);
 const dx=Math.max(0,Math.abs(p.x-cx)-half),dy=Math.max(0,Math.abs(p.y-cy)-half);
 return dx*dx+dy*dy<=spec(w).range**2;
}
function eligible(z,w,now){
 if(z.hp<=0||(z.arrivalTime||0)<0||z.y+z.h>550||!withinReach(z,w))return false;
 if(w.kind==='lure'){
  const p=deviceTarget(z,w.x+structureSize(w)/2,duckOriginY(w));
  const dx=p.x-w.x-structureSize(w)/2,up=duckOriginY(w)-p.y;
  return !(z.fortressFrozenUntil>now)&&up>0&&Math.abs(dx)<=up&&Math.hypot(dx,up)<=spec(w).range+12;
 }
 return w.kind!=='ice'||(!(z.fortressIceReady>now)&&!(z.knockTime>0));
}
function reelIceTarget(w,z,prev,progress,now,ops){
 const run=w.run;
 if(prev<ICE_LATCH&&progress>=ICE_LATCH&&eligible(z,w,now)){
  run.grabbed.set(z,{distance:Math.hypot(w.x+structureSize(w)/2-z.x-z.w/2,w.y+structureSize(w)/2-z.y-z.h/2),moved:0});
  const remaining=(ICE_FREEZE-ICE_LATCH)*spec(w).duration;
  z.fortressIceReady=now+remaining;
  z.trashStopUntil=Math.max(z.trashStopUntil||0,now+remaining);
  delete z.wormParade;delete z.breakoutTime;delete z.eliteMotion;
  w.fxImpact=.20;
  ops.contact?.(z,'ice',w.x+structureSize(w)/2-z.x-z.w/2,w.y+structureSize(w)/2-z.y-z.h/2);
 }
 if(!run.grabbed.has(z)||prev>=ICE_FREEZE)return false;
 const dx=w.x+structureSize(w)/2-z.x-z.w/2,dy=w.y+structureSize(w)/2-z.y-z.h/2;
 const distance=Math.hypot(dx,dy);
 const pullStart=ICE_LATCH+.085/spec(w).duration;
 const elapsed=Math.max(0,Math.min(progress,ICE_FREEZE)-Math.max(prev,pullStart))*spec(w).duration;
 const travel=Math.min(distance,elapsed*1140);
 // Test short steps along the line so neither compact enemies nor a wall
 // can be skipped, even when an entire pull is processed in one update.
 const grip=run.grabbed.get(z),startX=z.x,startY=z.y;
 const steps=Math.ceil(travel/3);
 for(let step=0;step<steps;step++){ 
  const x=z.x+dx/distance*travel/steps,y=z.y+dy/distance*travel/steps;
  if(y+z.h>550||!ops.canMove?.(z,x,y))break;
  z.x=x;z.y=y;
 }
 grip.moved=Math.hypot(z.x-startX,z.y-startY);
 if(progress<ICE_FREEZE)return false;
 grip.releaseX=z.x+z.w/2-w.x-structureSize(w)/2;grip.releaseY=z.y+z.h*.48-w.y-structureSize(w)/2;
 const duration=z.boss?.85:2.8;
 z.fortressFrozenUntil=now+duration;z.fortressIceReady=now+duration+2;
 z.trashStopUntil=Math.max(z.trashStopUntil||0,z.fortressFrozenUntil);
 w.fxImpact=.20;ops.freezeFX?.(z,w);
 return true;
}
// The centre of the painted duck sits 18/64 down the machine.
function duckOriginY(w){return w.y+structureSize(w)*18/64}
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
  const d=start+(end-start)*i/steps,x=w.x+structureSize(w)/2+run.dx*d,y=duckOriginY(w)+run.dy*d;
  for(const z of enemies){
   if(run.struck.has(z)||z.hp<=0||(z.arrivalTime||0)<0||z.fortressFrozenUntil>now)continue;
   const ax=Math.max(z.x-x,0,x-z.x-z.w),ay=Math.max(z.y-y,0,y-z.y-z.h);
   const sizeScale=structureSize(w)/ENDLESS_TILE;
    if((ax/(14*sizeScale))**2+(ay/(9*sizeScale))**2>1)continue;
   run.struck.add(z);
   w.fxImpact=.20;
   ops.push?.(z,run.dx,run.dy,'lure',run.struck);
  }
 }
}
// Plan small, swept displacements. Each touching neighbour joins the same
// directional shove, while a wall, boss or road edge stops the connected group.
function duckKnockPlan(root,dx,dy,enemies,inside,alreadyStruck=null){
 const positions=new Map(),stride=3,limit=12;
 for(let step=0;step<24;step++){
  const next=new Map();
  function advance(z,depth){
   if(next.has(z))return true;
   if(z.boss||depth>limit||(z!==root&&alreadyStruck?.has(z)))return false;
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
// Advance only one checked crossing per actor per frame. The hole is
// passable while retracted, but all other colliders remain solid.
function advanceMoleHops(dt,enemies,now,ops){
 for(const z of enemies){
  const hop=z.moleHop;if(!hop)continue;
  const w=walls.get(hop.id);
  if(!w||w.raised||z.hp<=0||z.knockTime>0||z.hitShakeUntil>now||z.trashStopUntil>now){delete z.moleHop;continue}
  const step=Math.min(hop.end-z.y,hop.speed*dt);
  if(step<=0){delete z.moleHop;continue}
  const n=Math.max(1,Math.ceil(step/3));
  let moved=false;
  for(let i=0;i<n;i++){
   const y=z.y+step/n;
   if(y+z.h>549||!ops.canMove?.(z,z.x,y)){delete z.moleHop;break}
   z.y=y;moved=true;
  }
  if(moved){hop.travel+=step;z.moleHopMovedAt=now}
  if(z.y>=hop.end-.01)delete z.moleHop;
 }
}
function tryMoleHop(w,dt,enemies,now,ops){
 if(!ops.canMove||w.raised||(w.lift||0)>.15||w.cooldown<=0)return;
 w.hopCheck=Math.max(0,(w.hopCheck||0)-dt);
 if(w.hopCheck>0)return;
 w.hopCheck=.32+Math.random()*.48;
 // Favor a risky late crossing but also allow lucky early escapes.
 const late=w.cooldown<.55;
 const candidates=enemies.filter(z=>{
  const gap=w.y-z.y-z.h;
  return !z.boss&&z.hp>0&&(z.arrivalTime||0)>=0&&!z.moleHop&&
    !(z.knockTime>0)&&!(z.hitShakeUntil>now)&&!(z.trashStopUntil>now)&&
    !(z.fortressFrozenUntil>now)&&!(z.moleHopReady>now)&&
    gap>=-3&&gap<=20&&Math.abs(z.x+z.w/2-w.x-structureSize(w)/2)<structureSize(w)*.65;
 }).sort((a,b)=>b.y-a.y);
 const z=candidates[0];if(!z||Math.random()>(late?.94:.48))return;
 const end=w.y+structureSize(w)+3+Math.random()*8;
 if(end+z.h>549||!ops.canMove(z,z.x,end))return;
 z.moleHop={id:w.id,end,speed:100+Math.random()*75,travel:0,total:end-z.y};
 z.moleHopReady=now+1.5;
 delete z.wormParade;delete z.breakoutTime;delete z.breakoutDuration;delete z.eliteMotion;
 z.moleHopMovedAt=now;
}
function tickBollard(w,dt,enemies,ops,now=0){
 w.cooldown=Math.max(0,w.cooldown-dt);
 if(w.cooldown===0){
  if(w.raised){
   w.raised=false;w.cooldown=randomRest(w);
  }else{
   const cx=w.x+structureSize(w)/2,cy=w.y+structureSize(w)/2;
   const nearby=enemies.filter(z=>z.hp>0&&(z.arrivalTime||0)>=0&&intersects(z.x,z.y,z.w,z.h,w,ops.molePush?2:structureSize(w)))
    .sort((a,b)=>Number(intersects(b.x,b.y,b.w,b.h,w))-Number(intersects(a.x,a.y,a.w,a.h,w)));
   // Clear the hatch before solidifying. Shove away from its centre, favouring
   // sideways escape on the player-facing side to respect the defence line.
   let launched=0;
   for(const z of nearby){
    const dx=z.x+z.w/2-cx,dy=z.y+z.h/2-cy;
    if(ops.molePush){
     if(z.fortressFrozenUntil>now||z.trashStopUntil>now||z.moleLaunch||z.molePopReady>now)continue;
     const crossing=intersects(z.x,z.y,z.w,z.h,w);
     const forward=crossing?Math.random()<.5:dy>0;
     if(ops.molePush(z,w,forward?1:-1)){delete z.moleHop;z.moleHopReady=now+1.5;z.molePopReady=now+.8;launched++}
     continue;
    }
    const vx=dy>0?(dx<0?-1:1):dx,vy=dy>0?0:Math.min(-1,dy);
    const length=Math.hypot(vx,vy);
    if(!ops.push?.(z,vx/length,vy/length,'bollard')&&intersects(z.x,z.y,z.w,z.h,w)){
     // Try a clear exit for a boss or a zombie pinned on the primary side.
     for(const [sx,sy] of [[0,-1],[-1,0],[1,0]]){
      const distance=sy<0?z.y+z.h-w.y+2:sx<0?z.x+z.w-w.x+2:w.x+structureSize(w)-z.x+2;
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
   w.raised=true;w.moleTime=0;w.fxImpact=.20;w.cooldown=4.5+Math.random()*2.5;
   if(ops.molePush)ops.pulse?.('bollard',cx,cy,launched);
   else if(!nearby.length)ops.pulse?.('bollard',cx,cy,0);
  }
 }
 if(!w.raised)tryMoleHop(w,dt,enemies,now,ops);
 if(w.raised)w.moleTime=(w.moleTime||0)+dt;
 w.lift=w.raised?Math.min(1,(w.lift||0)+dt*14):Math.max(0,(w.lift||0)-dt*7);
}
function tickDevices(dt,enemies,now,ops){
 if(active||!walls.size)return;
 advanceMoleHops(dt,enemies,now,ops);
 for(const w of walls.values()){
  if(!w.kind||w.kind==='wall')continue;
  if(w.kind==='bollard'){tickBollard(w,dt,enemies,ops,now);continue}
  const type=spec(w),cx=w.x+structureSize(w)/2,cy=w.y+structureSize(w)/2;
  if(!w.run){
   w.cooldown=Math.max(0,w.cooldown-dt);
   if(w.cooldown>0)continue;
   const distance=z=>{const p=deviceTarget(z,cx,cy);return (p.x-cx)**2+(p.y-cy)**2};
   const targets=enemies.filter(z=>eligible(z,w,now)).sort((a,b)=>(w.kind==='saw'?Number(!!b.boss)-Number(!!a.boss):0)||distance(a)-distance(b))
    .slice(0,w.kind==='saw'?3:w.kind==='ice'?4:6);
   if(!targets.length){w.cooldown=.25+.5*Math.random();continue}
   w.run={time:0,targets};
   if(w.kind==='ice')w.run.grabbed=new Map();
   if(w.kind==='lure'){
    const target=deviceTarget(targets[0],cx,duckOriginY(w)),dx=target.x-cx,dy=target.y-duckOriginY(w);
    const length=Math.hypot(dx,dy)||1;
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
   w.fxImpact=.20;ops.damage?.(z,z.boss?3:2,w.kind,cx,cy);hit++;
  }
  if(hit&&w.kind==='ice')ops.pulse?.(w.kind,cx,cy,hit);
  if(progress>=1){w.run=null;w.cooldown=randomRest(w)}
 }
 // Keep freshly frozen enemies out of the normal march/parade selectors.
 for(const z of enemies)if(z.fortressFrozenUntil>now){
  z.trashStopUntil=Math.max(z.trashStopUntil||0,z.fortressFrozenUntil);
  z.hitHold=Math.max(z.hitHold||0,.11);z.recoil=Math.max(z.recoil||0,.031);
  delete z.wormParade;delete z.breakoutTime;delete z.eliteMotion;
 }
}
for(const {kind,el} of buildButtons)el?.addEventListener?.('click',()=>selectBuild(kind));
makeDeviceIcons();

// v451: only the animated duck/blade and its extending linkage cross above enemies.
function frontAttack(w){return !!w.run&&(w.kind==='lure'||w.kind==='saw')}
function drawAttackForeground(g){
 if(!parts)return;
 for(const w of walls.values())if(frontAttack(w))drawDevice(g,w,false,null,false,'attack');
}
function draw(g,building=false,glow=null,splitAttacks=false){
 const bitmap=bitmapTiles();
 const tile=bitmap||tiles();if(!tile)return;
 const frame=bitmap?BARRICADE_FRAME:MINI_TILE;
 if(!building&&parts)for(const w of walls.values())if(w.kind==='ice'&&w.run)drawIceArms(g,w);
 for(const w of walls.values()){
  if(w.kind&&w.kind!=='wall'){drawDevice(g,w,building,glow,false,!building&&splitAttacks&&frontAttack(w)?'base':'all');continue}
  // The five authored PNG states are switched by actual remaining HP.
  const variant=w.hp>MAX_HP*.8?0:w.hp>MAX_HP*.6?1:
    w.hp>MAX_HP*.4?2:w.hp>MAX_HP*.2?3:4;
  const index=bitmap?variant:Math.min(3,variant);
  // Bite impact only affects the one cube being chewed. No global camera
  // shake and no collision/HP displacement; the PNG itself is jittered.
  const bite=Math.min(1,Math.max(0,(w.biteShake||0)/.18));
  const elapsed=.18-Math.min(.18,w.biteShake||0);
  const shakeX=bite?Math.sin(elapsed*124+w.id*.31)*3*bite:0;
  const shakeY=bite?Math.cos(elapsed*105+w.id*.19)*1.6*bite:0;
  g.save();
  if(bite>0)g.filter='brightness('+String((1+1.8*bite).toFixed(2))+') saturate(.95)';
  g.drawImage(tile,index*frame,0,frame,frame,w.x+shakeX,w.y+shakeY,structureSize(w),structureSize(w));
  g.restore();
 }
 // Draw gauges after sprites so neighboring structures cannot hide them.
 for(const w of walls.values())drawDeviceGauge(g,w,glow);
 if(!building){drawStructureDebris(g);return;}
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
   g.globalAlpha=.8;if(p.kind&&p.kind!=='wall')drawDevice(g,p,true);else g.drawImage(tile,0,0,frame,frame,p.x,p.y,size,size);
   g.globalAlpha=1;g.strokeStyle='#ffe78f';
   g.lineWidth=1.8;g.strokeRect(p.x+1,p.y+1,size-2,size-2);
  }
 }
 g.restore();
}
function tick(dt){tickStructureDebris(dt);for(const w of walls.values()){
 w.hit=Math.max(0,(w.hit||0)-dt);w.fxImpact=Math.max(0,(w.fxImpact||0)-dt);
 if(w.kind==='lure'&&!w.run)w.duckIdleTime=((w.duckIdleTime||0)+dt)%120;
 w.biteShake=Math.max(0,(w.biteShake||0)-dt);
 if(w.moleHit>0)w.moleHit=Math.max(0,w.moleHit-dt);
}}
if(confirmButton)confirmButton.addEventListener('click',confirm);
if(cancelButton)cancelButton.addEventListener('click',cancel);
if(readyButton)readyButton.addEventListener('click',startWithFeedback);
window.ZZFortress={structureSize,duckKnockPlan,reset,setupEndless,begin,deploy,resolve,selectBuild,tickDevices,getBuildType:()=>selectedBuild,getStructure:(col,row)=>valid(col,row)?occupied.get(id(col,row)):undefined,isOpen,isPathClear,escapeWall,bounceBall,draw,drawAttackForeground,tick,down,iconDown,move,up,finish,cancel,ready,startWithFeedback,
 bind(fn,feedback){onReady=fn;onStartFeedback=feedback},getStock:()=>stock,getWallCount:()=>walls.size,
 getQueueCount:()=>queued.length,getPendingRefund:()=>destroyedThisStage,
 getSupply:()=>({refund:lastRefund,bonus:lastBonus,healed:lastHealed}),
 getPreview:()=>totals(),getWallHP:(col,row)=>valid(col,row)?(occupied.get(id(col,row))?.hp||0):0,
 bounds:()=>({left:X,right:X+COLS*T,enemyLeft:FIELD_LEFT,enemyRight:FIELD_RIGHT,columns:COLS,rows:ROWS,tile:T})};
})();
