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
assert.equal(f.getStock(),14);assert.equal(f.getWallCount(),3);
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
f.begin([],2);assert.equal(f.getStructure(12,5).hp,30);
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
bite();assert.equal(ice.hp,29.5);
ice.cooldown=0;f.tickDevices(.05,[biter],1,{});assert(ice.run);
bite();assert.equal(ice.hp,28.5);
assert(fs.readFileSync('dist/index.html','utf8').includes('꽁꽁 포획기</span><b>◆ 3'));
f.reset();f.begin([],1);place('lure',5,10,4);f.deploy([]);
const duck=f.getStructure(5,10),origin={x:duck.x+22,y:duck.y+44*18/64};
const front=actor(origin.x+14,origin.y-55),side=actor(origin.x-50,origin.y-59);
const behind=actor(origin.x,origin.y+33),contacts=[];
duck.cooldown=0;
for(let i=0;i<60;i++)f.tickDevices(.01,[front,side,behind],i*.01,{push(z,dx,dy){contacts.push(z);assert(dx>0&&dy<0&&dx<=-dy);return true}});
assert.deepEqual(contacts,[front]);
const lead=actor(132,205),second=actor(144,179),third=actor(156,153);
const spare=actor(200,195),plans=f.duckKnockPlan(lead,.45,-Math.sqrt(1-.45**2),[lead,second,third,spare],()=>true);
assert.equal(plans.size,3);
for(const [depth,z] of [lead,second,third].entries()){
 const pos=plans.get(z);assert.equal(pos.chainDepth,depth);assert(pos.x>z.x+12&&pos.y<z.y-25);
}
console.log('PASS directional spring contact, off-axis exclusion and three-body diagonal chain');
f.reset();f.begin([],1);place('bollard',16,19,2);f.deploy([]);
const post=f.getStructure(16,19),rider=actor(post.x+2,post.y-1);
const neighbor=actor(post.x-21,post.y),far=actor(post.x-48,post.y);
const group=[rider,neighbor,far],bumped=new Set();
const bump={push(z,dx,dy){bumped.add(z);z.x+=dx*55;z.y+=dy*55;return true}};
const ballAtPost=()=>f.bounceBall({x:post.x+1,y:post.y+10,vx:60,vy:0},post.x-6,post.y+10,3);
assert.equal(f.getStructure(15,19),undefined);
assert(f.isOpen(rider,rider.x,rider.y));assert.equal(ballAtPost(),null);
post.cooldown=0;f.tickDevices(.02,group,1,bump);
assert.deepEqual(bumped,new Set([rider,neighbor]));
assert(post.raised&&post.cooldown>=6&&post.cooldown<=9);assert.equal(post.hp,2);
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
for(let i=0;i<60;i++)gnaw();assert.equal(mole.hp,2);
mole.cooldown=0;f.tickDevices(.02,[],1,{});
assert(mole.raised);
for(let i=0;i<20;i++)gnaw();assert.equal(mole.hp,1);assert.equal(mole.biteShake,.18);
for(let i=0;i<20;i++)gnaw();assert.equal(f.getStructure(4,6),undefined);
assert.equal(f.getPendingRefund(),1);
f.reset();f.begin([],1);place('ice',4,6,3);f.deploy([]);
const trap=f.getStructure(4,6),victim=actor(trap.x+125,trap.y+4),events=[];
trap.cooldown=0;
for(let i=1;i<=85;i++)f.tickDevices(.01,[victim],i*.01,{canMove:(z,x,y)=>f.isPathClear(z,z.x,z.y,x,y),contact:(z,k)=>events.push([z,k])});
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
