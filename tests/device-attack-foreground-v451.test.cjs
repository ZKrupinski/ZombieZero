'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/fortress-mode.js','utf8'),game=fs.readFileSync('dist/game.js','utf8');
const calls=[];const g={save(){},restore(){},translate(){},rotate(){}};
const env={g,part:(g,n)=>calls.push(n),linkage:(g,n)=>calls.push(n)};
const section=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)+a.length));
vm.createContext(env);vm.runInContext(section('function paintMachine(','// Dedicated high-DPI')+section('function frontAttack(','function draw(g,building'),env);
for(const [kind,base,attack] of [['lure',[5],[10,4]],['saw',[6],[11,7]]]){
 for(const [layer,expected] of [['base',base],['attack',attack],['all',[...base,...attack]]]){
  calls.length=0;env.kind=kind;env.layer=layer;
  vm.runInContext("paintMachine(g,kind,.3,.4,{x:8,y:-12,combat:true,airborne:true,spring:12},layer)",env);
  assert.deepEqual(calls,expected);
 }
 assert.equal(env.frontAttack({kind,run:{}}),true);
 assert.equal(env.frontAttack({kind,run:null}),false);
}
for(const kind of ['ice','bollard','wall'])assert.equal(env.frontAttack({kind,run:{}}),false);
env.parts={};env.walls=new Map([['duck',{kind:'lure',run:{}}],['idle',{kind:'saw'}],['saw',{kind:'saw',run:{}}],['ice',{kind:'ice',run:{}}]]);
const painted=[];env.drawDevice=(g,w,building,glow,gauge,layer)=>painted.push([w.kind,building,gauge,layer]);env.drawAttackForeground(g);
assert.deepEqual(painted,[['lure',false,false,'attack'],['saw',false,false,'attack']]);
const draw=game.slice(game.indexOf('function draw(){recordSlowEchoHistory()'));
assert(draw.indexOf('fortress?.draw(g,')<draw.indexOf('drawStruckZombie(z)'));
assert(draw.indexOf('drawStruckZombie(z)')<draw.indexOf('fortress?.drawAttackForeground?.(g)'));
assert(draw.indexOf('fortress?.drawAttackForeground?.(g)')<draw.indexOf('drawImpactFlashes()'));
assert(src.includes("!building&&splitAttacks&&frontAttack(w)?'base':'all'"));
console.log('PASS v451: attack-only moving parts above enemies, intact idle/building/base and impact layers.');

// V475: exact approved bitmap layers; every direction has its rage counterpart.
const duckDraws=[];env.part=(g,...args)=>duckDraws.push(args);
vm.runInContext("paintMachine(g,'lure',0,0,null,'attack')",env);
assert.deepEqual(duckDraws,[ [4,11,-11,43,43,0,1] ],'picker/build ducks face chassis with unchanged compact height');
for(let direction=0;direction<5;direction++){
 vm.runInContext("paintMachine(g,'lure',.3,.3,{x:8,y:-12,combat:true,airborne:true,spring:12,angry:true,direction:"+direction+"},'attack')",env);
 // Even a diagonal offset may never translate the duck horizontally.
 assert.deepEqual(duckDraws.at(-1),[4,11,1.5-43*188/192,43,43,1,direction]);
}
const pose=new Function(section('function duckPose(','function drawDevice(')+';return duckPose')();
const directions=new Set();
for(let i=0;i<180;i++){const p=pose({id:0,duckIdleTime:i/60},null,0);directions.add(p.direction);assert(p.bob<=0&&p.bob>=-4.2&&!p.angry)}
assert.equal(directions.size,5);
for(const [dx,d] of [[-.7071,0],[-.35,1],[0,2],[.35,3],[.7071,4]]){
 const a=pose({},{dx:0,aimDx:dx,time:.3},.35),b=pose({},{dx:0,aimDx:dx,time:.32},.35);
 assert.equal(a.direction,d);assert(a.angry&&b.angry&&a.jitterX===-b.jitterX);
}
assert(!pose({},{dx:0,time:.8},.95).angry);
const motion=new Function('BUILD_TYPES',section('function duckTravel(','function strikeDuck(')+';return {duckTravel,duckSpringLength,duckVisualTravel}')({lure:{range:100}});
assert(Math.abs(motion.duckTravel(0))<1e-8);assert(motion.duckTravel(.09)<0);
assert.equal(motion.duckTravel(.43),100);assert(Math.abs(motion.duckTravel(.74))<1e-8);assert(Math.abs(motion.duckTravel(1))<1e-8);
assert(motion.duckSpringLength(.09)<12&&motion.duckSpringLength(.28)>40);
duckDraws.length=0;
vm.runInContext("paintMachine(g,'lure',.3,.3,{x:8,y:-12,combat:true,angry:true,direction:4},'base')",env);
assert.deepEqual(duckDraws,[[5,2,3,60,60,1]]);
// V477: the cap and duck share the same anchor at all idle and rebound heights.
for(const spring of [4,8,12,14,16.2,30,46]){
 duckDraws.length=0;
 vm.runInContext("paintMachine(g,'lure',0,0,{combat:true,spring:"+spring+",direction:3},'all')",env);
 const [base,cap,duck]=duckDraws;
 assert.deepEqual(base,[5,2,3,60,60,1]);
 assert.equal(cap[0],10);assert.equal(cap[2],24-spring-5);
 assert.equal(cap[4],spring+12);
 assert(Math.abs(duck[2]+43*188/192-(cap[2]+6.5))<1e-9,'duck is seated on cap throughout the bounce');
}
duckDraws.length=0;
vm.runInContext("paintMachine(g,'lure',0,0,{combat:false,direction:4},'all')",env);
assert.deepEqual(duckDraws,[[5,2,3,60,60,0],[4,11,-11,43,43,0,1]]);
assert.equal(pose({},null,0,true).direction,1);
assert(src.includes("combat:!building,airborne:!!run&&progress>=.18&&progress<.74"));
console.log('PASS v477: compact build pose and shared dynamic spring-cap seat, fixed chassis.');
const approved=fs.readFileSync('dist/assets/ip/v2/barricades/duck-approved-v475.webp');
assert.equal(approved.toString('ascii',0,4),'RIFF');assert.equal(approved.toString('ascii',8,12),'WEBP');
assert.equal(approved[24]+(approved[25]<<8)+(approved[26]<<16)+1,1152);
assert.equal(approved[27]+(approved[28]<<8)+(approved[29]<<16)+1,384);
assert(src.includes('duck-approved-v475.webp'));
console.log('PASS v475: original approved directional cels, fixed base, vertical jump and spring compression/landing.');

// V478: saw rotates around a raised centre; placement stays compact.
const bladeCenters=[],bladeAngles=[],bladeLinks=[];
g.translate=(x,y)=>bladeCenters.push([x,y]);g.rotate=a=>bladeAngles.push(a);
env.linkage=(g,...args)=>bladeLinks.push(args);
vm.runInContext("paintMachine(g,'saw',0,0,{x:0,y:0,lift:10,spin:1.2},'attack')",env);
assert.deepEqual(bladeCenters.at(-1),[32,12]);assert.equal(bladeAngles.at(-1),1.2);
assert.deepEqual(bladeLinks.at(-1),[11,32,38,0,-26,7]);
vm.runInContext("paintMachine(g,'saw',0,0,null,'attack')",env);
assert.deepEqual(bladeCenters.at(-1),[32,22]);assert.equal(bladeAngles.at(-1),.3);
const tickSrc=section('function tick(dt)','if(confirmButton)');
const rotor={kind:'saw'};
const tickRotor=new Function('walls','tickStructureDebris',tickSrc+';return tick') (new Map([[0,rotor]]),()=>{});
tickRotor(.1);assert(Math.abs(rotor.sawSpin-.52)<1e-9);
rotor.run={};const beforeAttack=rotor.sawSpin;tickRotor(.02);
assert(Math.abs(rotor.sawSpin-(beforeAttack+1.02))<1e-9);
rotor.run=null;const afterAttack=rotor.sawSpin;tickRotor(.1);
assert(Math.abs(rotor.sawSpin-(afterAttack+.22))<1e-9);
console.log('PASS v478: raised saw centre, continuous idle/attack phase, unchanged compact build pose.');

// V479: half of the old airborne travel, without changing the hit fan or spring.
assert.equal(motion.duckVisualTravel(.43),50);
for(let i=0;i<=100;i++){
 const p=i/100,d=motion.duckTravel(p);
 assert(Math.abs(motion.duckVisualTravel(p)-(d>0?d*.5:d))<1e-9);
}
assert(src.includes('duckVisualTravel(progress)*64/size'));
assert(src.includes('reach=duckTravel(Math.min(.43,progress))+12'));
console.log('PASS v479: half-height duck leap, original hit fan, compression and rebound.');
