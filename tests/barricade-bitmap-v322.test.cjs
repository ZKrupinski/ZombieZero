'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('dist/fortress-mode.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const asset='assets/ip/v2/barricades/barricade-damage-v323-aligned.png';
const png=fs.readFileSync('dist/'+asset);
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(png.readUInt32BE(16),280,'five 56px damage-state columns');
assert.equal(png.readUInt32BE(20),56,'all sprite frames same height');
assert(png.includes(Buffer.from('tRNS')),'PNG retains alpha transparency');
const ids=['fortress-builder','fortress-actions','fortress-confirm','fortress-cancel',
 'fortress-ready','fortress-stock','fortress-tip','fortress-build-count',
 'fortress-supply','fortress-preview-summary','fortress-tool'];
const nodes={};
for(const id of ids)nodes[id]={hidden:false,disabled:false,style:{},dataset:{},
 addEventListener(k,fn){this[k]=fn},setAttribute(){},
 getBoundingClientRect(){return {left:0,top:0,width:450,height:710}}};
let imageSrc='';
class FakeImage{
 constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0}
 set src(v){imageSrc=v;this.complete=true;this.naturalWidth=280;this.naturalHeight=56;this.onload?.()}
 get src(){return imageSrc}
}
const doc={getElementById:id=>nodes[id]||null,
 createElement:()=>({getContext:()=>null})},win={};
new Function('window','document','Image',src)(win,doc,FakeImage);
const fort=win.ZZFortress,c={
 getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),
 setPointerCapture(){}
};
const ptr=(col)=>({pointerId:7,button:0,clientX:37+col*22,clientY:92});
fort.reset();fort.begin([],1);
assert.equal(fort.down(ptr(0),c),true);
fort.move(ptr(4),c);fort.up(ptr(4),c);
nodes['fortress-confirm'].click();
assert.equal(fort.getWallCount(),5);
function bite(col,n){
 const x=30+col*22,z={x,y:90,w:16,h:22};
 for(let i=0;i<n;i++){z.x=x;z.y=90;fort.resolve(z,x,57,.79,()=>{})}
}
for(let i=1;i<5;i++)bite(i,i*6);
for(let i=0;i<5;i++)assert.equal(fort.getWallHP(i,0),30-i*6);
const g={drawn:[],filter:'none',save(){this._stack??=[];this._stack.push(this.filter)},
 restore(){this.filter=this._stack.pop()},drawImage(...a){this.drawn.push({a,filter:this.filter})}};
fort.draw(g,false);g.drawn.length=0;
fort.draw(g,false);
assert(imageSrc.endsWith(asset),'new bitmap atlas requested by browser');
assert.equal(g.drawn.length,5);
for(let i=0;i<5;i++){
 const call=g.drawn[i];
 assert(call.a[0] instanceof FakeImage,'use real bitmap rather than procedural tile');
 assert.deepEqual(call.a.slice(1,5),[i*56,0,56,56],'HP maps to its own art frame');
 assert.equal(call.a[7],22);assert.equal(call.a[8],22);
 if(i===0)assert.equal(call.filter,'none','undamaged block unaffected by neighbor bite');
 else assert(call.filter.includes('brightness('),'bitten block flashes independently');
}
assert.notEqual(g.drawn[1].a[5],49,'bite shaking displaces bitten wall only');
fort.tick(.30);g.drawn.length=0;fort.draw(g,false);
assert(g.drawn.every(d=>d.filter==='none'),'bite flash expires');
for(let i=0;i<5;i++)assert.equal(g.drawn[i].a[5],27+i*22,'shake ends without shifting actual collisions');
assert(html.includes('fortress-mode.js?v=323-aligned-damage-frames'));
assert(sw.includes('v323-aligned-damage-frames'));
assert(sw.includes("'./"+asset+"'"),'PWA precaches actual bitmap');
console.log('PASS v322/v323: five transparent PNG damage frames, independent wall bite flash/shake, no collision drift, cached asset.');
