'use strict';
// Barricade Horde v317: every ordinary, powered and piercing ball rebounds
// off durable cube walls while only zombie bites can damage their HP.
const assert=require('node:assert/strict'),fs=require('node:fs');
const game=fs.readFileSync('dist/game.js','utf8');
const mod=fs.readFileSync('dist/fortress-mode.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const elements={};
for(const id of ['fortress-builder','fortress-actions','fortress-confirm','fortress-cancel','fortress-ready','fortress-stock','fortress-tip'])
 elements[id]={hidden:false,addEventListener(k,fn){this[k]=fn}};
const fakeWindow={},fakeDocument={
 getElementById:id=>elements[id]||null,
 createElement:()=>({getContext:()=>null})
};
new Function('window','document',mod)(fakeWindow,fakeDocument);
const fort=fakeWindow.ZZFortress;
assert.equal(typeof fort.bounceBall,'function');
const canvas={
 getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),
 setPointerCapture(){}
};
fort.reset();fort.begin([],1);
const pointer={clientX:38,clientY:94,pointerId:1,button:0};
assert.equal(fort.down(pointer,canvas),true);fort.up(pointer,canvas);
elements['fortress-confirm'].click();fort.ready();
assert.equal(fort.getWallCount(),1);
const cases=[
 ['left',21,92,25,92,230,0,4,'x',-1],
 ['right',56,92,52,92,-230,0,4,'x',1],
 ['top',37,76,37,80,0,230,4,'y',-1],
 ['bottom',37,111,37,107,0,-230,4,'y',1],
 ['powered',37,74,37,78,0,230,6,'y',-1],
 ['piercing',21,92,25,92,230,0,4,'x',-1]
];
for(const [name,ox,oy,x,y,vx,vy,r,axis,expected] of cases){
 const ball={x,y,vx,vy,held:false,piercing:name==='piercing'};
 const hit=fort.bounceBall(ball,ox,oy,r);
 assert(hit&&hit.axis===axis, name+' collides on correct face');
 assert.equal(Math.sign(axis==='x'?ball.vx:ball.vy),expected,name+' reflects');
 assert.equal(fort.getWallCount(),1,name+' cannot break barricade');
}
const miss={x:210,y:350,vx:100,vy:0};
assert.equal(fort.bounceBall(miss,206,350,4),null,'no phantom collisions');
// 120 impacts must not chip a block, even under piercing or power.
for(let i=0;i<120;i++){
 const ball={x:37,y:80,vx:0,vy:450,piercing:true};
 assert(fort.bounceBall(ball,37,76,4));
}
assert.equal(fort.getWallCount(),1,'durability unaffected by repeated ball impacts');
const attacker={x:30,y:90,w:16,h:22};
let bites=0;
for(let i=0;i<9;i++){
 attacker.x=30;attacker.y=90;
 fort.resolve(attacker,30,57,.79,()=>bites++);
}
assert.equal(bites,0,'zombie still needs full 12 bites after ball hits');
for(let i=0;i<4;i++){
 attacker.x=30;attacker.y=90;
 fort.resolve(attacker,30,57,.79,()=>bites++);
}
assert.equal(bites,1,'zombie attacks do damage to wall');
assert(game.includes('fortress.bounceBall(b,ox,oy,radius)'),'live ball substeps call cube collision');
assert(game.includes("ballImpact(b,wallHit.axis"),'existing elastic ball feedback reused');
assert(game.includes("spawnContact(b,wallHit.x,wallHit.y"),'wall collision visual effect reused');
assert(html.includes('src="fortress-mode.js?v=')&&html.includes('v317-barricade-ball-reflect'),'versioned module and game loaded by document');
assert(sw.includes('v317-barricade-ball-reflect'),'PWA cache version advanced');
console.log('PASS v317: four directional rebounds, power/pierce, collision FX integration, durable walls, zombie-only damage.');
