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
  vm.runInContext("paintMachine(g,kind,.3,.4,{x:8,y:-12},layer)",env);
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

// V472: all five directional poses and red rage bitmap row preserve feet.
const duckDraws=[];env.part=(g,...args)=>duckDraws.push(args);
vm.runInContext("paintMachine(g,'lure',0,0,null,'attack')",env);
assert.deepEqual(duckDraws.at(-1),[4,11,-11,43,47,0,2]);
for(let direction=0;direction<5;direction++){
 vm.runInContext("paintMachine(g,'lure',.3,.3,{x:8,y:-12,angry:true,direction:"+direction+"},'attack')",env);
 assert.deepEqual(duckDraws.at(-1),[4,19,-23,43,47,1,direction]);
}
const pose=new Function(section('function duckPose(','function drawDevice(')+';return duckPose')();
const directions=new Set();
for(let i=0;i<180;i++){const p=pose({id:0,duckIdleTime:i/60},null,0);directions.add(p.direction);assert(p.bob<=0&&p.bob>=-4.2&&!p.angry)}
assert.equal(directions.size,5);
for(const [dx,d] of [[-.7071,0],[-.35,1],[0,2],[.35,3],[.7071,4]]){
 const a=pose({},{dx,time:.3},.35),b=pose({},{dx,time:.32},.35);
 assert.equal(a.direction,d);assert(a.angry&&b.angry&&a.jitterX===-b.jitterX);
}
assert(!pose({},{dx:0,time:.8},.95).angry);
assert(src.includes('duck-faces-v472.png'));
console.log('PASS v472: five directions, idle bob, direction-specific angry cels and local attack shake.');

// V473: the chassis has its own bitmap and stays on the ground during a lunge.
duckDraws.length=0;
vm.runInContext("paintMachine(g,'lure',.3,.3,{x:8,y:-12,angry:true,direction:4},'base')",env);
assert.deepEqual(duckDraws,[ [5,2,21,60,42] ]);
assert.equal(duckDraws[0][2]+duckDraws[0][4],63);
assert(src.includes('duck-chassis-v473.png'));
assert(fs.existsSync('dist/assets/ip/v2/barricades/duck-tire-v473.webp'));
console.log('PASS v473: red tire source committed, independent chassis and unchanged ground anchor.');
