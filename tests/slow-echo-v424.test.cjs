'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/game.js','utf8');
const defs=src.slice(src.indexOf('let slowEchoHistory='),src.indexOf('\n',src.indexOf('const SLOW_ECHO_DELAY=')));
const code=src.slice(src.indexOf('function resetSlowEchoHistory(){'),src.indexOf('function draw(){recordSlowEchoHistory()'));
const h=new Function(`
 let clock=0,mode='playing',resumeMode='playing',enemyAnimationClock=0,slow=false,foes=[],bossTrashShots=[];
 const draws=[],g={globalAlpha:1,stack:[],save(){this.stack.push(this.globalAlpha)},restore(){this.globalAlpha=this.stack.pop()}};
 const has=k=>k==='slow'&&slow,knockVisualPosition=z=>z,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),knockMotionProgress=()=>.5;
 const bossTrashProjectilePosition=p=>({x:p.x,y:p.y,t:p.t});
 const zombie=z=>draws.push({kind:'zombie',x:z.x,cel:enemyAnimationClock,alpha:g.globalAlpha,dir:z.moveDir});
 const spitSprite=r=>r,paintSpit=(sprite,x,y,angle,a,scale)=>draws.push({kind:'spit',x,alpha:g.globalAlpha,sprite});
 const drawThrowable=(kind,x)=>draws.push({kind:'trash',x,alpha:g.globalAlpha});
 ${defs}
 ${code}
 const z={x:0,y:100,w:33,h:44,moveDir:-1},p={type:'spit',sx:0,sy:0,tx:100,ty:100,t:0,x:0,y:0},q={kind:2,t:0,x:0,y:0};
 foes=[z];bossTrashShots=[p,q];
 return {step(t){clock=t;enemyAnimationClock=t*.1;z.x=t*10;z.moveDir=t<2?-1:1;p.x=t*20;p.t=t/10;q.x=t*30;q.t=t/10;recordSlowEchoHistory()},
  toggle(v){slow=v},draw(){draws.length=0;drawSlowZombieEchoes();drawSlowProjectileEchoes();return draws.slice()},old:()=>slowEchoAt(z),size:()=>slowEchoHistory.get(z).count,
  remove(){foes=[];bossTrashShots=[]},reset:resetSlowEchoHistory,pause(){mode='paused'},getCel:()=>enemyAnimationClock,alpha:()=>g.globalAlpha};
`)();
for(let i=0;i<=25;i++)h.step(i/10);
h.toggle(true);assert.deepEqual(h.draw(),[],'no fake younger samples');
h.toggle(false);for(let i=26;i<=40;i++)h.step(i/10);
assert.deepEqual(h.draw(),[],'inactive slow never paints history');
h.toggle(true);const d=h.draw();assert.equal(d.length,3);
assert.equal(d[0].x,10);assert.equal(d[0].cel,.1);assert.equal(d[0].dir,-1);
assert.equal(d[1].x,20);assert.equal(d[2].x,30);
for(const x of d)assert.equal(x.alpha,.28);
assert.equal(h.getCel(),.4);assert.equal(h.alpha(),1);
for(let i=41;i<=400;i++)h.step(i/10);
assert.equal(h.size(),32);assert.equal(h.draw().length,3);assert(Math.abs(h.old().at-37)<.101);
h.pause();assert.equal(h.draw().length,3);h.toggle(false);assert.equal(h.draw().length,0);
h.toggle(true);h.remove();assert.deepEqual(h.draw(),[]);h.reset();assert.equal(h.old(),null);
assert(src.includes('drawSlowZombieEchoes();for(const z of foes)drawStruckZombie(z)'));
assert(src.includes("if(typeof drawSlowProjectileEchoes==='function')drawSlowProjectileEchoes()"));
console.log('PASS V424: historical pose and clock, hostile projectiles only, one transparent echo per actor, bounded memory and reset.');
