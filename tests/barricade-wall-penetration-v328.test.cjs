'use strict';
// A wall must be solid to zombie movement and to rendered knockback, not
// merely to the ball; even a fast teleport-like step cannot tunnel a cube.
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('dist/fortress-mode.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const index=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const ids=['fortress-builder','fortress-actions','fortress-confirm','fortress-cancel',
 'fortress-ready','fortress-stock','fortress-tip','fortress-build-count',
 'fortress-supply','fortress-preview-summary','fortress-tool'];
const dom={};
for(const id of ids)dom[id]={hidden:false,disabled:false,style:{},dataset:{},
 addEventListener(k,fn){this[k]=fn},setAttribute(){},
 getBoundingClientRect(){return {left:0,top:0,width:450,height:710}}};
const fakeDoc={getElementById:id=>dom[id]||null,
 createElement:()=>({getContext:()=>null})},win={};
new Function('window','document',src)(win,fakeDoc);
const f=win.ZZFortress;
const canvas={getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),
 setPointerCapture(){}};
const xy=(col,row)=>({clientX:38+col*22+11,clientY:82+row*22+11,
 pointerId:1,button:0});
function build(col,r0,r1){
 assert(f.down(xy(col,r0),canvas));
 f.move(xy(col,r1),canvas);f.up(xy(col,r1),canvas);
 dom['fortress-confirm'].click();
}
f.reset();f.begin([],1);build(5,3,10);
assert.equal(f.getWallCount(),8);
const wallX=38+5*22,wallY=82+5*22;
const zombie={x:wallX+40,y:wallY+1,w:16.5,h:22};
assert.equal(f.isOpen(zombie,wallX+1,wallY+1),false,'wall solid at center');
assert.equal(f.isPathClear(zombie,wallX-55,wallY+1,wallX+40,wallY+1),false,
 'long step with two open endpoints still intersects the wall');
assert.equal(f.isPathClear(zombie,wallX-55,wallY+1,wallX-45,wallY+1),true,
 'movement entirely before the wall stays free');
const startX=wallX-55;
assert.equal(f.resolve(zombie,startX,wallY+1,.9,()=>{}),true,
 'crossing a wall is blocked even when landing past its far side');
assert(zombie.x+zombie.w<=wallX+.001,'zombie stopped at near face, not far face');
assert(f.isOpen(zombie,zombie.x,zombie.y),'the corrected zombie is not embedded');
assert.equal(f.getWallHP(5,5),29,'one actual bite damages one cube');
const up={x:wallX+2,y:wallY+60,w:16,h:22};
assert(f.resolve(up,wallX+2,wallY-45,.9,()=>{}),'a long vertical dash is blocked');
assert(up.y+up.h<=wallY+.001,'zombie lands above the cube, not inside it');
assert(f.isOpen(up,up.x,up.y));
const alreadyInside={x:wallX+3,y:wallY+3,w:16,h:22};
assert.equal(f.escapeWall(alreadyInside,alreadyInside.x,alreadyInside.y),true);
assert(f.isOpen(alreadyInside,alreadyInside.x,alreadyInside.y),
 'an already overlapping collider is ejected from wall instantly');
// A blocked start is also recoverable directly via the resolve code path.
const invalid={x:wallX+5,y:wallY+5,w:16,h:22};
f.resolve(invalid,invalid.x,invalid.y,.1,()=>{});
assert(f.isOpen(invalid,invalid.x,invalid.y));
// A fast lateral knockback must not create a visual tween THROUGH the cube.
for(const marker of [
 'fortress.isPathClear(z,z.x,z.y,x,y)',
 '!fortress.isPathClear(z,z.x,z.y,pos.x,pos.y)',
 '!fortress.isPathClear(z,z.x,z.y,x,y)',
 '!fortress.isOpen(z,x,y)',
 '!fortress.isPathClear(z,z.knockFromX,z.knockFromY,x,y)',
 '!fortress.isPathClear(z,z.knockFromX,z.knockFromY,z.x,z.y)',
 'fortress.resolve(z,z.fortressPreviousX,z.fortressPreviousY,dt'
])assert(game.includes(marker),'wall-safe movement/render path missing: '+marker);
// Crowd scenario: 144 queued enemies all start near a barricaded choke point.
// Every assigned position must be clear, even if the nearest free slots fill.
f.reset();
const crowded=Array.from({length:144},(_,i)=>({
 x:wallX+3,y:wallY+1,w:16.5,h:22,row:Math.floor(i/18),col:i%18
}));
f.begin(crowded,1);build(5,3,10);
const targets=[];
assert.equal(f.deploy(targets),true);
assert.equal(targets.length,144,'all enemies retained when barricades are crowded');
for(const z of targets){
 assert(f.isOpen(z,z.x,z.y),'enemy never initially spawns onto a barricade');
 assert(z.x>=f.bounds().enemyLeft-1e-6&&
        z.x+z.w<=f.bounds().enemyRight+1e-6,'all enemies stay behind side walls');
}
assert(index.includes('fortress-mode.js?v=328-zombie-wall-collision'));
assert(index.includes('v328-zombie-wall-collision'));
assert(sw.includes('v328-zombie-wall-collision'));
console.log('PASS v328: swept collision, fast dash, trapped ejection, knockback render clip, and 144 safe stage spawns.');
