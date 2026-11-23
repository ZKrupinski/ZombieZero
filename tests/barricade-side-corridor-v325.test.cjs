'use strict';
// BARRICADE HORDE only: one whole 22px construction column is removed
// on each side, and every enemy path shares exactly those protected limits.
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('dist/fortress-mode.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const ids=['fortress-builder','fortress-actions','fortress-confirm','fortress-cancel',
 'fortress-ready','fortress-stock','fortress-tip','fortress-build-count',
 'fortress-supply','fortress-preview-summary','fortress-tool'];
const dom={};
for(const id of ids)dom[id]={hidden:false,style:{},dataset:{},
 addEventListener(k,fn){this[k]=fn},setAttribute(){},
 getBoundingClientRect(){return {left:0,top:0,width:450,height:710}}};
const doc={getElementById:k=>dom[k],createElement:()=>({getContext:()=>null})},win={};
new Function('window','document',src)(win,doc);
const f=win.ZZFortress;
assert.deepEqual(f.bounds(),{
 left:49,right:401,enemyLeft:53,enemyRight:397,columns:16,rows:20,tile:22
},'one 22px column removed from the original 27..423 build field on each side');
const canvas={getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),
 setPointerCapture(){}};
const point=x=>({button:0,pointerId:9,clientX:x,clientY:92});
f.reset();f.begin([],1);
assert.equal(f.down(point(37),canvas),false,'the old leftmost outside column cannot be built');
assert.equal(f.down(point(411),canvas),false,'the old rightmost outside column cannot be built');
assert.equal(f.down(point(59),canvas),true,'new first inboard column builds');
f.move(point(389),canvas);f.up(point(389),canvas);
assert.equal(f.getPreview().builds,16,'a full construction row contains only 16 cells');
dom['fortress-confirm'].click();
assert.equal(f.getWallCount(),16);
assert.equal(f.getStock(),10);
f.reset();
// All 18 lanes of miniature zombies fit in the narrower corridor without
// shrinking the creatures or changing their per-row count.
const cols=18,rows=8,w=16.5,h=22,left=53,right=397;
const pitch=(right-w-left)/(cols-1);
const mobs=Array.from({length:cols*rows},(_,i)=>({
 x:left+(i%cols)*pitch,y:70+Math.floor(i/cols)*29,w,h,
 row:Math.floor(i/cols),col:i%cols
}));
f.begin(mobs,1);
assert.equal(mobs.length,0,'enemies wait for Ready');
const deployed=[];
assert.equal(f.deploy(deployed),true);
assert.equal(deployed.length,144,'full 18x8 horde preserved');
for(const z of deployed){
 assert(z.x>=left-1e-6&&z.x+z.w<=right+1e-6,
  'deployed zombie collider must stay behind wall art');
}
for(const m of [
 'const zombieMinX=()=>isFortress()&&fortress?fortress.bounds().enemyLeft',
 'const zombieMaxX=z=>isFortress()&&fortress?fortress.bounds().enemyRight-z.w',
 'const foeStartX=()=>isFortress()?zombieMinX():ENEMY_LEFT_X',
 'fortress.bounds().enemyRight-foeW()-foeStartX()',
 'foeStartX()+col*foePitch()',
 'foeStartX()+z.col*foePitch()',
 'foeStartX()+foePitch()*destCol'
])assert(game.includes(m),'spawn, dash, strafe and patrol must share wall-safe geometry: '+m);
assert(!game.includes('x:ENEMY_LEFT_X+col*foePitch()'),
 'initial stage spawn must use narrowed fortress lanes');
assert(src.includes('x<FIELD_LEFT||x+z.w>FIELD_RIGHT'),
 'spawning and nearest-placement fallback bound to same inset');
assert(src.includes('Math.min(FIELD_RIGHT-z.w,ox+dx*T)'),
 'relocations cannot spawn over the right wall');
assert(html.includes('fortress-mode.js?v=325-wall-safe-center'));
assert(html.includes('v325-wall-safe-center'));
assert(sw.includes('v325-wall-safe-center'));
console.log('PASS v325: 16-column center build grid, 22px side margins, all 144 mini-zombies inside walls and unified movement bounds.');
