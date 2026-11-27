'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const nodes={};
for(const id of ['fortress-builder','fortress-actions','fortress-ready','fortress-confirm','fortress-cancel','fortress-stock','fortress-tip','fortress-build-count','fortress-supply','fortress-preview-summary','build-pick-wall','build-pick-lure','build-pick-saw','build-pick-ice'])nodes[id]={addEventListener(k,fn){this[k]=fn},setAttribute(){},dataset:{}};
const window={},document={getElementById:id=>nodes[id],createElement:()=>({getContext:()=>null})};
new Function('window','document',fs.readFileSync('dist/fortress-mode.js','utf8'))(window,document);
const f=window.ZZFortress,canvas={getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),setPointerCapture(){}};
const p=(col,row)=>({clientX:38+col*22+10,clientY:82+row*22+10,pointerId:1,button:0});
function place(kind,col,row,cost){
 assert(f.selectBuild(kind));let before=f.getStock();
 f.down(p(col,row),canvas);f.move(p(col+1,row),canvas);f.up(p(col+1,row),canvas);
 assert.equal(f.getPreview().builds,1);assert.equal(f.getPreview().cost,cost);
 nodes['fortress-confirm'].click();assert.equal(f.getStock(),before-cost);
 assert.equal(f.getStructure(col,row).kind,kind);
}
f.reset();f.begin([],1);place('lure',2,5,4);place('saw',7,12,5);place('ice',12,5,3);
assert.equal(f.getStock(),4);assert.equal(f.getWallCount(),3);
const actor=(x,y)=>({x,y,w:16,h:22,hp:12});
const a=actor(38+2*22+28,82+5*22-24),b=actor(38+7*22+6,82+12*22-25),c=actor(38+12*22+6,82+5*22-25);
const enemies=[a,b,c];let pushes=0,hits=0;
f.deploy([]);
const ops={canMove:()=>true,push:()=>{pushes++;return true},damage(z,n){hits++;z.hp-=n}};
const startX=a.x;
f.tickDevices(.01,enemies,.01,ops);
assert.equal(pushes+hits,0);assert.equal(a.x,startX);assert(!c.fortressFrozenUntil);
for(let frame=2;frame<=900;frame++)f.tickDevices(.01,enemies,frame*.01,ops);
assert(pushes>0);assert(hits>0);assert(c.fortressFrozenUntil>0);
const saw=f.getStructure(7,12);
for(let frame=0;saw.run&&frame<150;frame++)f.tickDevices(.01,enemies,10+frame*.01,ops);
assert(!saw.run&&saw.cooldown>0);
const previous=hits;
f.tickDevices(Math.min(.1,saw.cooldown/2),enemies,12,ops);assert.equal(hits,previous);
f.begin([],2);assert.equal(f.getStructure(12,5).hp,16);
assert.equal(f.getStructure(12,5).cooldown,0);
assert(f.selectBuild('ice'));let before=f.getStock();
f.down(p(12,5),canvas);f.up(p(12,5),canvas);
assert.equal(f.getPreview().refund,3);nodes['fortress-confirm'].click();assert.equal(f.getStock(),before+3);
console.log('PASS V366: individual placement, material costs, full demolition refund, lure, damage, freeze, cooldown, persistence');
// Every tile belongs to one shared machine, including the far corner.
f.reset();f.begin([],1);place('saw',4,6,5);
const machine=f.getStructure(4,6);
for(let row=6;row<8;row++)for(let col=4;col<6;col++){
 assert.equal(f.getStructure(col,row),machine);
}
assert.equal(f.getStructure(6,7),undefined);
const right=machine.x+44,bottom=machine.y+44;
const ball={x:right+1,y:bottom-3,vx:-100,vy:0};
assert.equal(f.bounceBall(ball,right+8,ball.y,3).nx,1);
assert(ball.x>=right+3);
assert(!f.isOpen({w:3,h:3},right-3,bottom-3));
assert(f.selectBuild('ice'));
f.down(p(3,5),canvas);f.up(p(3,5),canvas);
assert.equal(f.getPreview().builds,0);
f.down(p(5,7),canvas);f.up(p(5,7),canvas);
assert.equal(f.getPreview().refund,5);
nodes['fortress-confirm'].click();
assert.equal(f.getWallCount(),0);
assert.equal(f.getStructure(4,6),undefined);
assert(f.isOpen({w:3,h:3},right-3,bottom-3));
f.down(p(16,19),canvas);f.up(p(16,19),canvas);
nodes['fortress-confirm'].click();
assert.equal(f.getStructure(16,19),f.getStructure(15,18));
assert.equal(f.getStructure(15,18).kind,'ice');
console.log('PASS 2×2 occupancy, edge placement, shared demolition, overlap and outer-face collisions');
for(const blocked of [false,true]){
 f.reset();f.begin([],1);place('ice',4,6,3);
 if(blocked){f.selectBuild('wall');f.down(p(7,6),canvas);f.up(p(7,6),canvas);nodes['fortress-confirm'].click()}
 f.deploy([]);
 const trap=f.getStructure(4,6),start=trap.x+145;
 const target=actor(start,trap.y+4);
 trap.cooldown=0;
 const movement={canMove:(z,x,y)=>f.isPathClear(z,z.x,z.y,x,y)};
 let movedBeforeFreeze=false;
 for(let i=1;i<=75;i++){
  f.tickDevices(.01,[target],i/100,movement);
  if(i<=25){assert.equal(target.x,start);assert(!target.fortressFrozenUntil)}
  if(target.x<start&&!target.fortressFrozenUntil)movedBeforeFreeze=true;
 }
 assert(movedBeforeFreeze);assert(target.fortressFrozenUntil>2);
 const edge=trap.x+(blocked?4:2)*22;
 assert(target.x>=edge&&target.x<edge+3.1);
}
console.log('PASS long-range claw latches, pulls before freezing and stops at solid surfaces');
f.reset();f.begin([],1);place('ice',4,6,3);f.deploy([]);
const ice=f.getStructure(4,6);
assert(ice.cooldown>=.3&&ice.cooldown<=.75);
const biter=actor(ice.x+4,ice.y-21);
const bite=()=>{biter.y=ice.y-21;f.resolve(biter,biter.x,ice.y-23,.79)};
bite();assert.equal(ice.hp,15.5);
ice.cooldown=0;f.tickDevices(.05,[biter],1,{});assert(ice.run);
bite();assert.equal(ice.hp,14.5);
assert(fs.readFileSync('dist/index.html','utf8').includes('꽁꽁 포획기</span><b>◆ 3'));
f.reset();f.begin([],1);place('lure',5,10,4);f.deploy([]);
const duck=f.getStructure(5,10),origin={x:duck.x+22,y:duck.y+44*18/64};
const front=actor(origin.x+14,origin.y-55),side=actor(origin.x-50,origin.y-59);
const behind=actor(origin.x,origin.y+33),outside=actor(origin.x-80,origin.y-43),far=actor(origin.x-8,origin.y-150),contacts=[];
duck.cooldown=0;
for(let i=0;i<90;i++){
 f.tickDevices(.01,[front,side,behind,outside,far],i*.01,{push(z,dx,dy){contacts.push(z);assert(dy<0&&Math.abs(dx)<=-dy+1e-9);return true}});
 if(duck.run){assert.equal(duck.run.dx,0);assert.equal(duck.run.dy,-1)}
}
assert.deepEqual(contacts,[front,side],'both inside fan, neither side/back nor distant target, no repeated hit');
assert(!duck.run&&duck.cooldown>0,'lands and returns to idle');
const lead=actor(132,205),second=actor(144,179),third=actor(156,153);
const spare=actor(200,195),plans=f.duckKnockPlan(lead,.45,-Math.sqrt(1-.45**2),[lead,second,third,spare],()=>true);
assert.equal(plans.size,3);
for(const [depth,z] of [lead,second,third].entries()){
 const pos=plans.get(z);assert.equal(pos.chainDepth,depth);assert(pos.x>z.x+12&&pos.y<z.y-25);
}
console.log('PASS vertical spring jump, forward 90-degree fan exclusion and three-body diagonal chain');
f.reset();f.begin([],1);place('bollard',16,19,2);f.deploy([]);
const post=f.getStructure(16,19),rider=actor(post.x+2,post.y-1);
const neighbor=actor(post.x-21,post.y),far=actor(post.x-70,post.y);
const group=[rider,neighbor,far],bumped=new Set();
const bump={push(z,dx,dy){bumped.add(z);z.x+=dx*55;z.y+=dy*55;return true}};
const ballAtPost=()=>f.bounceBall({x:post.x+1,y:post.y+10,vx:60,vy:0},post.x-6,post.y+10,3);
assert.equal(f.getStructure(15,19),undefined);assert.equal(f.getStructure(14,19),undefined);
assert(f.isOpen(rider,rider.x,rider.y));assert.equal(ballAtPost(),null);
post.cooldown=0;f.tickDevices(.02,group,1,bump);
assert.deepEqual(bumped,new Set([rider,neighbor]));
assert(post.raised&&post.cooldown>=4.5&&post.cooldown<=7);assert.equal(post.hp,12);
assert(!f.isOpen(rider,post.x,post.y));assert.equal(ballAtPost().nx,-1);
post.cooldown=.01;f.tickDevices(.02,group,2,bump);
assert(!post.raised);assert(f.isOpen(rider,post.x,post.y));assert.equal(ballAtPost(),null);
post.cooldown=0;rider.x=post.x;rider.y=post.y;
f.tickDevices(.02,[rider],3,{push:()=>false,canMove:()=>false});
assert(!post.raised,'blocked hatch must never trap an overlapping zombie');
console.log('PASS one-cell retractable bollard, adjacent shove, timed wall and ball collision');
f.reset();f.begin([],1);f.selectBuild('bollard');
f.down(p(1,2),canvas);f.move(p(5,2),canvas);f.up(p(5,2),canvas);
assert.equal(f.getPreview().builds,5);assert.equal(f.getPreview().cost,10);
nodes['fortress-confirm'].click();
for(let col=1;col<=5;col++)assert.equal(f.getStructure(col,2).kind,'bollard');

// v387: stationary contact damages an exposed mole at real frame intervals.
f.reset();f.begin([],1);assert(f.selectBuild('bollard'));f.down(p(4,6),canvas);f.up(p(4,6),canvas);nodes['fortress-confirm'].click();f.deploy([]);
const mole=f.getStructure(4,6),attacker=actor(mole.x+3,mole.y-24);
const gnaw=()=>f.resolve(attacker,attacker.x,attacker.y,1/60);
for(let i=0;i<60;i++)gnaw();assert.equal(mole.hp,12);
mole.cooldown=0;f.tickDevices(.02,[],1,{});
assert(mole.raised);
for(let i=0;i<30;i++)gnaw();assert.equal(mole.hp,11);assert.equal(mole.biteShake,.18);
for(let i=0;i<290;i++)gnaw();assert.equal(mole.hp,1);for(let i=0;i<30;i++)gnaw();assert.equal(f.getStructure(4,6),undefined);
assert.equal(f.getPendingRefund(),1);
f.reset();f.begin([],1);place('ice',4,6,3);f.deploy([]);
const trap=f.getStructure(4,6),victim=actor(trap.x+125,trap.y+4),events=[];
trap.cooldown=0;
for(let i=1;i<=85;i++)f.tickDevices(.01,[victim],i*.01,{canMove:(z,x,y)=>f.isPathClear(z,z.x,z.y,x,y),contact:(z,k)=>events.push([z,k]),freezeFX:(z,w)=>{assert.equal(z,victim);assert.equal(w,trap);assert(z.fortressFrozenUntil>0);assert.equal(w.fxImpact,.20);}});
assert.equal(events.length,1);assert.deepEqual(events[0],[victim,'ice']);assert(victim.fortressFrozenUntil>0);
console.log('PASS v386: vulnerable long-exposure mole, single capture contact and freeze.');


f.reset();f.begin([],1);place('saw',5,8,5);f.deploy([]);
const blade=f.getStructure(5,8),large={x:blade.x+44+25,y:blade.y-20,w:66,h:88,hp:40,boss:true};
blade.cooldown=0;let bossHits=0;
for(let i=0;i<120;i++)f.tickDevices(.01,[large],i*.01,{damage(z,n,kind){assert.equal(z,large);assert.equal(kind,'saw');z.hp-=n;bossHits++}});
assert.equal(bossHits,1);assert.equal(large.hp,37);
f.reset();f.begin([],1);place('lure',5,10,4);f.deploy([]);
const duckBoss=f.getStructure(5,10),targetBoss={x:duckBoss.x-10,y:duckBoss.y-82,w:66,h:70,hp:40,boss:true};
duckBoss.cooldown=0;let duckHits=0;
for(let i=0;i<90;i++)f.tickDevices(.01,[targetBoss],i*.01,{push(z){assert.equal(z,targetBoss);duckHits++;return false}});
assert.equal(duckHits,1);assert.equal(targetBoss.hp,40);
f.reset();f.begin([],1);place('ice',5,8,3);f.deploy([]);
const iceBoss=f.getStructure(5,8),capturedBoss={x:iceBoss.x+44+100,y:iceBoss.y-10,w:66,h:88,hp:40,boss:true};
iceBoss.cooldown=0;let bossCapture=0;
for(let i=0;i<85;i++)f.tickDevices(.01,[capturedBoss],i*.01,{canMove:(z,x,y)=>f.isPathClear(z,z.x,z.y,x,y),contact(z,k){assert.equal(k,'ice');bossCapture++}});
assert.equal(bossCapture,1);assert(capturedBoss.fortressFrozenUntil>0);
console.log('PASS v392: large boss body-edge saw damage, direct duck hit, ice capture.');


for(const [kind,hp,expected] of [['lure',12,2],['saw',14,2],['ice',16,2],['wall',30,4]]){
 f.reset();f.begin([],1);
 if(kind==='wall'){f.selectBuild(kind);f.down(p(5,8),canvas);f.up(p(5,8),canvas);nodes['fortress-confirm'].click()}
 else place(kind,5,8,kind==='lure'?4:kind==='saw'?5:3);
 f.deploy([]);
 const device=f.getStructure(5,8),boss={x:device.x+2,y:device.y-60-3,w:33,h:60,hp:50,boss:true};
 assert.equal(device.hp,hp);
 let destroyed=0;const hit=()=>f.resolve(boss,boss.x,boss.y,.35,()=>destroyed++,1);
 for(let i=1;i<expected;i++){hit();assert.equal(device.hp,hp-i*8)}
 hit();assert.equal(f.getStructure(5,8),undefined);assert.equal(destroyed,1);
}
f.reset();f.begin([],1);place('ice',5,8,3);f.deploy([]);
const armor=f.getStructure(5,8),frozen={x:armor.x+2,y:armor.y-63,w:33,h:60,hp:50,boss:true,fortressFrozenUntil:3};
f.resolve(frozen,frozen.x,frozen.y,.35,null,1);assert.equal(armor.hp,16);


 // v394: deterministic late crossing is interrupted by the rising hatch.
f.reset();f.begin([],1);assert(f.selectBuild('bollard'));f.down(p(5,8),canvas);f.up(p(5,8),canvas);nodes['fortress-confirm'].click();f.deploy([]);
const hatch=f.getStructure(5,8),runner=actor(hatch.x+3,hatch.y-24);
hatch.cooldown=.18;hatch.lift=0;let pop=0;
const hopOps={canMove:(z,x,y)=>y+z.h<550&&f.isPathClear(z,z.x,z.y,x,y),molePush(z,w,dir){pop++;z.y=dir>0?w.y+47:w.y-z.h-3;return true}};
const originalRandom=Math.random;Math.random=()=>.1;
try{
 f.tickDevices(.01,[runner],1,hopOps);assert(runner.moleHop);
 const firstY=runner.y;
 for(let i=1;i<=20;i++)f.tickDevices(.01,[runner],1+i*.01,hopOps);
 assert(runner.y!==firstY);assert(hatch.raised);assert.equal(pop,1);assert(!runner.moleHop);
}finally{Math.random=originalRandom}
console.log('PASS v394: risky fast crossing and rising mole interruption.');

const source=fs.readFileSync('dist/fortress-mode.js','utf8');
const renderWin={};const renderDoc={getElementById:id=>nodes[id]||null,createElement:()=>({getContext:()=>null})};
new Function('window','document',source.replace('window.ZZFortress={','parts={};window.ZZFortress={drawDevice,'))(renderWin,renderDoc);
for(const kind of ['bollard','ice','saw','lure']){
 let bars=0,flashes=0,translations=[];
 const g={save(){},restore(){},translate(x,y){translations.push([x,y])},scale(){},rotate(){},drawImage(){if(this.filter?.startsWith('brightness('))flashes++},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},fillRect(){bars++}};
 renderWin.ZZFortress.drawDevice(g,{kind,x:100,y:100,id:43,hp:1,biteShake:.15,lift:1,moleTime:0},false);
 assert(flashes>0,kind+' flashes');assert(translations[0][0]!==100||translations[0][1]!==100,kind+' shakes');
 assert.equal(bars,kind==='bollard'?0:2,kind+' durability bar');
}
console.log('PASS v387: stationary mole bites, no mole gauge, all machines flash and shake.');

for(const [kind,hp] of [['lure',12],['saw',14],['ice',16]]){
 const rects=[];let glowCount=0;
 const ctx={save(){},restore(){},translate(){},scale(){},rotate(){},drawImage(){},fillRect(...r){rects.push(r)}};
 renderWin.ZZFortress.drawDevice(ctx,{kind,x:100,y:100,id:1,hp},false,paint=>{glowCount++;paint(ctx)});
 assert.equal(rects[0][1],144,'bar below sprite');assert.equal(rects[1][2],24,'full health bar');
 assert.equal(glowCount,1);
}
console.log('PASS v393: weaker machines, stationary boss breaks in 2-4 strikes, frozen boss cannot bite, full-health glowing bars below sprites.');

const opening=Array.from({length:36},(_,i)=>({x:45+(i%9)*42,y:70+Math.floor(i/9)*60,w:33,h:44,hp:10}));
const expected=['wall','bollard','ice','lure','saw'];
function supportList(){const result=new Set();for(let row=0;row<20;row++)for(let col=0;col<17;col++){const w=f.getStructure(col,row);if(w)result.add(w)}return [...result]}
for(let wave=1;wave<=14;wave++){
 const count=Math.min(5,Math.ceil(wave/2));
 const placed=f.setupEndless(wave,opening,565);assert(placed>=(count===1?4:8+count-2)&&placed<=(count===1?6:12+count-2));
 const devices=supportList(),kinds=new Set(devices.map(w=>w.kind));
 assert.deepEqual(kinds,new Set(expected.slice(0,count)));
 assert.equal(f.getStock(),0);
 assert.equal(nodes['fortress-builder'].hidden,true);
 for(const w of devices){
  const size=f.structureSize(w);
  assert.equal(f.bounds().tile,22);
  assert(w.y>=710/3&&w.y+size<=710*2/3);
  for(const z of opening)assert(z.x+z.w<=w.x||z.x>=w.x+size||z.y+z.h<=w.y||z.y>=w.y+size);
 }
}
{const count=f.setupEndless(100,opening,565);assert(count>=12&&count<=21);}
f.reset();assert.equal(f.getWallCount(),0);assert.equal(f.bounds().tile,22);
console.log('PASS v412: endless support progression, fresh unobstructed placement, bounded count, no construction UI.');

// V469: actual hit events set an independent visual timer without changing HP or cooldown.
assert(source.includes('w.fxImpact=.20;ops.damage?.('));
assert(source.includes('w.fxImpact=.20;ops.freezeFX?.(z,w)'));
assert(source.includes('w.fxImpact=Math.max(0,(w.fxImpact||0)-dt)'));
const punchSrc=source.slice(source.indexOf('function devicePunch('),source.indexOf('function drawDevice(',source.indexOf('function devicePunch(')));
const punch=new Function(punchSrc+';return devicePunch')();
assert.equal(punch({kind:'bollard',raised:true,moleTime:0}),1);
assert.equal(punch({kind:'saw',fxImpact:.20}),1);
assert.equal(punch({kind:'saw',fxImpact:.20},true),0);
assert.equal(punch({kind:'ice',run:{time:0}}),.55);
console.log('PASS v469: local visual impact envelopes, building isolation and unchanged hit callbacks.');
