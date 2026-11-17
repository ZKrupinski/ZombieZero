'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('dist/game.js','utf8');
const start=code.indexOf('function drawWorldGroundShadows(){');
const end=code.indexOf('// The real 192px car atlas',start);
assert(start>=0&&end>start,'must find the actual in-game shadow renderer');
assert(code.includes('z.arrivalTime/.62'),'new sprite opacity uses the 0.62s reveal');
const scene=[
 {x:20,y:40,w:33,h:44,arrivalTime:-.25},
 {x:70,y:40,w:33,h:44,arrivalTime:0},
 {x:120,y:40,w:33,h:44,arrivalTime:.31},
 {x:170,y:40,w:33,h:44,arrivalTime:.62},
 {x:220,y:40,w:33,h:44},
 {x:270,y:40,w:66,h:88,boss:true,arrivalTime:.155}
];
const shadows=[];
const ctx={
 foes:scene,enemyDeaths:[],
 knockVisualPosition:z=>z,
 drawHardGroundShadow:(cx,foot,width,depth,cast,alpha)=>shadows.push({cx,alpha}),
 Math,Number
};
vm.runInNewContext(code.slice(start,end)+'\ndrawWorldGroundShadows();',ctx);
assert.equal(shadows.length,4,'no shadow at all until the matching zombie is visible');
assert(Math.abs(shadows[0].alpha-.31*.5)<1e-8,'half-visible zombie casts a half-strength shadow');
assert(Math.abs(shadows[1].alpha-.31)<1e-8,'fully visible newcomer casts a normal shadow');
assert(Math.abs(shadows[2].alpha-.31)<1e-8,'ordinary zombie shadow is unchanged');
assert(Math.abs(shadows[3].alpha-.34*.25)<1e-8,'boss arrival and its larger shadow synchronize');
shadows.length=0;
ctx.foes=[{x:10,y:10,w:33,h:44,arrivalTime:-.2}];
ctx.enemyDeaths=[{z:{x:50,y:30,w:33,h:44,boss:false},t:.1,split:.5}];
vm.runInNewContext(code.slice(start,end)+'\ndrawWorldGroundShadows();',ctx);
assert.equal(shadows.length,1,'existing defeated-zombie shadow timing is unchanged');
console.log('PASS v142: shadows remain absent before the sprite appears; synchronized fade for zombies and bosses, normal/death shadows preserved.');
