'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const css=fs.readFileSync('dist/fortress-mode.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
const source=fs.readFileSync('dist/fortress-mode.js','utf8');
for(const [name,sha,w,h] of [
 ['fortress-picker-v414.webp','29de08e9213603aa41a291958b9c8186a5924a18',450,144],
 ['fortress-selected-v414.webp','1195300ed1fa2a318c40060c0cd7476968caecf8',112,112]
]){
 const path='assets/ui/'+name,b=fs.readFileSync('dist/'+path);
 assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length),Buffer.from([0]),b])).digest('hex'),sha);
 assert.equal(b.toString('ascii',0,4),'RIFF');
 assert.equal(b.toString('ascii',8,12),'WEBP');
 assert.equal(b.toString('ascii',12,16),'VP8X');
 assert(b[20]&16,'alpha channel present');
 assert.equal(b.readUIntLE(24,3)+1,w);assert.equal(b.readUIntLE(27,3)+1,h);
 assert(css.includes(path));assert(sw.includes("'./"+path+"'"));
}
assert(css.includes('button::after')&&css.includes('button[aria-pressed="true"]::after{opacity:1}'));
const ids=['wall','bollard','ice','lure','saw'],nodes={};
for(const kind of ids)nodes['build-pick-'+kind]={dataset:{},setAttribute(k,v){this[k]=v},addEventListener(k,v){this[k]=v}};
for(const id of ['fortress-builder','fortress-actions','fortress-ready','fortress-confirm','fortress-cancel','fortress-tip'])nodes[id]={dataset:{},addEventListener(k,v){this[k]=v}};
const window={},document={getElementById:id=>nodes[id]||null,createElement:()=>({getContext:()=>null})};
new Function('window','document',source)(window,document);
window.ZZFortress.begin([],1);
for(const kind of ids){
 assert(window.ZZFortress.selectBuild(kind));
 assert.equal(ids.filter(k=>nodes['build-pick-'+k]['aria-pressed']==='true').length,1);
 assert.equal(nodes['build-pick-'+kind]['aria-pressed'],'true');
 assert(html.includes('id="build-pick-'+kind+'"'));
 assert(css.includes('#build-pick-'+kind+'{left:'));
}
assert(html.includes('v414-bitmap-picker')&&sw.includes('v414-bitmap-picker'));
console.log('PASS V414: byte-verified transparent art, five live slots, exactly one selection overlay, versioned offline assets.');

// V468 live pointer-release path: direct icon drop, budget, occupied cells,
// cancellation and the existing continuous battlefield stroke.
const f=window.ZZFortress;
const canvas={getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),setPointerCapture(){}};
const p=(col,row,type='pointerup')=>({clientX:49+col*22,clientY:93+row*22,pointerId:1,button:0,type,pointerType:'mouse'});
f.reset();f.begin([],1);
assert(f.iconDown('ice',p(0,25,'pointerdown'),canvas));
assert(f.move(p(3,3,'pointermove'),canvas));assert.equal(f.getPreview().builds,1);
assert(f.move(p(4,4,'pointermove'),canvas));assert.equal(f.getPreview().builds,1);
assert(f.finish(p(4,4),canvas));assert.equal(f.getWallCount(),1);assert.equal(f.getStock(),13);
assert.equal(f.getStructure(4,4).kind,'ice');assert.equal(f.getStructure(5,5).kind,'ice');
assert(f.iconDown('wall',p(0,25,'pointerdown'),canvas));f.finish(p(4,4),canvas);
assert.equal(f.getWallCount(),1);assert.equal(f.getStock(),13);
assert(f.iconDown('saw',p(0,25,'pointerdown'),canvas));f.move(p(7,7,'pointermove'),canvas);f.finish(p(0,25),canvas);
assert.equal(f.getWallCount(),1);assert.equal(f.getStock(),13);
assert(f.iconDown('wall',p(0,25,'pointerdown'),canvas));f.move(p(7,7,'pointermove'),canvas);f.finish(p(7,7,'pointercancel'),canvas);
assert.equal(f.getWallCount(),1);assert.equal(f.getStock(),13);
assert(f.selectBuild('wall'));assert(f.down(p(0,0,'pointerdown'),canvas));f.move(p(2,0,'pointermove'),canvas);f.finish(p(2,0),canvas);
assert.equal(f.getWallCount(),4);assert.equal(f.getStock(),10);
f.down(p(0,0,'pointerdown'),canvas);f.finish(p(0,0),canvas);assert.equal(f.getStock(),11);assert.equal(f.getWallCount(),3);
assert(!html.includes('id="fortress-confirm"')&&!html.includes('id="fortress-cancel"'));
assert(css.includes('touch-action:none;user-select:none'));
assert(fs.readFileSync('dist/game.js','utf8').includes('fortress?.finish(e,c)'));
console.log('PASS V468: direct picker drag, single drop, occupied/outside/cancel safety and instant field strokes.');

assert(css.includes('#fortress-preview-summary[hidden]{display:none!important}'));
assert(html.includes('id="fortress-preview-summary" hidden'));
