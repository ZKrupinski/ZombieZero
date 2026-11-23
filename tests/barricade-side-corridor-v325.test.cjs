'use strict';
// BARRICADE HORDE only: a half-sized 11px column is removed on each side.
// Every enemy movement route uses the resulting protected center corridor.
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
 left:38,right:412,enemyLeft:42,enemyRight:408,columns:17,rows:20,tile:22
},'one 11px half-cell removed from the original 27..423 field per side');
const canvas={getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),
 setPointerCapture(){}};
const point=x=>({button:0,pointerId:9,clientX:x,clientY:92});
f.reset();f.begin([],1);
assert.equal(f.down(point(37),canvas),false,'the old leftmost outside column cannot be built');
assert.equal(f.down(point(417),canvas),false,'the old rightmost outside column cannot be built');
assert.equal(f.down(point(49),canvas),true,'new first inboard column builds');
f.move(point(401),canvas);f.up(point(401),canvas);
assert.equal(f.getPreview().builds,17,'a full construction row contains 17 cells');
dom['fortress-confirm'].click();
assert.equal(f.getWallCount(),17);
assert.equal(f.getStock(),9);
f.reset();
// All 18 lanes of miniature zombies fit in the narrower corridor without
// shrinking the creatures or changing their per-row count.
const cols=18,rows=8,w=16.5,h=22,left=42,right=408;
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
assert(html.includes('fortress-mode.js?v=326-mini-half-cell'));
assert(html.includes('v326-mini-half-cell'));
assert(sw.includes('v326-mini-half-cell'));
console.log('PASS v326: 17-column center build grid, 11px side margins, all 144 mini-zombies inside walls and unified movement bounds.');
