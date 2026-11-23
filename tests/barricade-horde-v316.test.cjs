'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('dist/fortress-mode.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const ids=['fortress-builder','fortress-actions','fortress-confirm','fortress-cancel','fortress-ready','fortress-stock','fortress-tip'];
const elements={};
for(const id of ids)elements[id]={hidden:false,textContent:'',addEventListener(k,fn){this[k]=fn}};
const document={getElementById:id=>elements[id]||null,createElement:()=>({getContext:()=>null})};
const win={};
new Function('window','document',src)(win,document);
const fort=win.ZZFortress;
const canvas={getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),setPointerCapture(){}};
const p=(col,row)=>({clientX:49+col*22+10,clientY:82+row*22+10,pointerId:7,button:0});
fort.reset();
const enemies=Array.from({length:144},(_,i)=>({
 x:45+(i%18)*343.5/17,y:70+Math.floor(i/18)*29,
 w:16.5,h:22,row:Math.floor(i/18),col:i%18
}));
fort.begin(enemies,1);
assert.equal(enemies.length,0,'zombies must not exist during preparation');
assert.equal(fort.getQueueCount(),144,'roster count preserved');
assert.equal(fort.getStock(),26,'initial material allowance');
fort.down(p(0,0),canvas);
fort.move(p(2,0),canvas);
fort.up(p(2,0),canvas);
assert.equal(elements['fortress-ready'].hidden,true,'must confirm/cancel preview first');
elements['fortress-cancel'].click();
assert.equal(fort.getWallCount(),0,'cancel consumes no material');
assert.equal(fort.getStock(),26);
fort.down(p(0,0),canvas);fort.move(p(2,0),canvas);fort.up(p(2,0),canvas);
elements['fortress-confirm'].click();
assert.equal(fort.getWallCount(),3,'drag paints continuous block cells');
assert.equal(fort.getStock(),23,'one material per cell');
let launched=0,assigned=[];
fort.bind(()=>{launched++;fort.deploy(assigned)});
fort.ready();
assert.equal(launched,1);
assert.equal(assigned.length,144,'all 144 mini zombies are deployed after ready');
assert.equal(elements['fortress-builder'].hidden,true);
for(const z of assigned)for(let col=0;col<3;col++){
 const wall={x:49+22*col,y:82,w:22,h:22};
 assert(!(z.x<wall.x+wall.w&&z.x+z.w>wall.x&&z.y<wall.y+wall.h&&z.y+z.h>wall.y),
  'spawn colliders must avoid built walls');
}
fort.begin(assigned,2);
assert.equal(assigned.length,0);
assert.equal(fort.getWallCount(),3,'surviving walls persist to next stage');
assert.equal(fort.getStock(),31,'wave 2 material added to unused stock');
const attacker={x:52,y:90,w:16,h:22};
let broken=0;
for(let i=0;i<32;i++){
 attacker.x=30;attacker.y=90;
 fort.resolve(attacker,52,57,.9,()=>broken++);
}
assert(broken>=1,'stronger cubes still eventually break from repeated zombie bites');
assert(fort.getWallCount()<3);
assert(html.includes('id="fortress-horde"')&&html.includes('id="fortress-builder"'));
assert(html.indexOf('src="fortress-mode.js')<html.indexOf('src="game.js'));
assert(game.includes("const isFortress=()=>runMode==='fortress'"));
assert(game.includes("fortress.begin(foes,wave)"));
assert(sw.includes("'./fortress-mode.js'")&&sw.includes("'./fortress-mode.css'"));
console.log('PASS V316: construction preview/cancel, material cost, 144-enemy avoidance, carry-over and zombie bite destruction');
