'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const garageSource=fs.readFileSync('dist/garage.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');

const context=vm.createContext({window:{}});
vm.runInContext(garageSource,context);
const garage=context.window.ZZGarage;
const data=garage.blank();
data.levels.heavy=5;
data.loads[0][1]='heavy';
garage.load(0,data);
const base=Math.hypot(125,365);
const ball={vx:Math.sin(.3)*base,vy:-Math.cos(.3)*base,first:true,bank:false,returns:0};
let previous=base;
for(let rally=0;rally<42;rally++){
  garage.strike(ball,0,.21);
  const before=Math.hypot(ball.vx,ball.vy);
  const impact={x:ball.vx,y:ball.vy};
  garage.contact(ball,0,impact);
  const after=Math.hypot(ball.vx,ball.vy);
  assert(Math.abs(before-after)<1e-8,'heavy must not drain velocity at rally '+rally);
  assert(impact.power>1.4,'heavy first-hit damage buff survives rally '+rally);
  assert(after+1e-8>=previous,'no slow drift between rallies');
  // Existing Ace paddle boosts speed by 7 per return and caps it at 600.
  const next=Math.min(600,after+7);
  ball.vx=Math.sin(.3)*next;
  ball.vy=-Math.cos(.3)*next;
  previous=next;
}
assert(Math.hypot(ball.vx,ball.vy)>595,'extended normal rally still reaches the original speed cap');

// Use the exact live source for the normalizer instead of a copied algorithm.
const begin=game.indexOf('const BASE_BALL_CRUISE_SPEED=');
const end=game.indexOf('function resetBalls(){',begin);
assert(begin>0&&end>begin,'real cruise-floor helper exists');
const physics=vm.createContext({Math,ball:{vx:80,vy:-190,held:false,cruiseFloor:base}});
vm.runInContext(game.slice(begin,end),physics);
const angleBefore=Math.atan2(physics.ball.vy,physics.ball.vx);
const restored=vm.runInContext('ensureBallCruiseSpeed(ball)',physics);
assert(Math.abs(restored-base)<1e-9,'slow in-flight ball returns to launch speed');
assert(Math.abs(Math.hypot(physics.ball.vx,physics.ball.vy)-base)<1e-9,'velocity is truly restored');
assert(Math.abs(Math.atan2(physics.ball.vy,physics.ball.vx)-angleBefore)<1e-9,'flight angle never changes');
physics.ball.vx=500;physics.ball.vy=-400;
const fast=vm.runInContext('ensureBallCruiseSpeed(ball)',physics);
assert(Math.abs(fast-Math.hypot(500,400))<1e-9,'fast rally is not capped or slowed');
assert.equal(physics.ball.vx,500);assert.equal(physics.ball.vy,-400);
physics.ball.held=true;physics.ball.vx=0;physics.ball.vy=0;
assert.equal(vm.runInContext('ensureBallCruiseSpeed(ball)',physics),0,'held ball stays held');
physics.ball.held=false;physics.ball.vx=100;physics.ball.vy=-150;delete physics.ball.cruiseFloor;
assert(Math.abs(vm.runInContext('ensureBallCruiseSpeed(ball)',physics)-Math.hypot(100,150))<1e-9,
 'scripted low-speed colliders are not accelerated');
assert.equal(physics.ball.vx,100,'scripted collision speed remains untouched');
assert(game.includes('balls[0].cruiseFloor=speed')&&
 game.includes('extra.cruiseFloor=BASE_BALL_CRUISE_SPEED')&&
 game.includes('split.cruiseFloor=BASE_BALL_CRUISE_SPEED'),
 'actual serve and multi-ball launch set cruise floor');
assert(game.includes('for(const b of [...balls]){updateBallSpin(b,dt);const cruise=ensureBallCruiseSpeed(b);'),
 'live update normalizes speed before collision substeps');
assert(game.includes('const enemySlowRate=()=>has(\'slow\')?SLOW_ENEMY_SPEED_RATE:1;'),
 'SLOW remains enemy-only');
assert(html.includes('v273-ball-cruise-floor')&&sw.includes('v273-ball-cruise-floor'),
 'mobile cache loads fixed physics');
console.log('PASS v273: heavy core no speed decay over 42 rallies, in-flight speed floor, unchanged angle and skill isolation');
