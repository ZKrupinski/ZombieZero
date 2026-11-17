'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path='dist/assets/fx/impact-bursts-v119.png';
const png=fs.readFileSync(path);
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','real PNG signature');
assert.equal(png.readUInt32BE(16),256,'4 columns of 64px');
assert.equal(png.readUInt32BE(20),192,'3 rows of 64px');
assert(png.length<22000,'12 optimized bitmap contacts stay within the lightweight budget');
const source=fs.readFileSync('dist/game.js','utf8');
const start=source.indexOf('let ballContactFX=[];'),end=source.indexOf('// Nine nearly touching lanes',start);
assert(start>=0&&end>start,'hit FX source is accessible');
let skill='fire',calls=[],rotations=[],loadedSource='';
class MockImage{
 constructor(){this.complete=true;this.naturalWidth=256;this.naturalHeight=192;}
 set src(s){loadedSource=s}
 get src(){return loadedSource}
}
const g={save(){},restore(){},translate(){},rotate(r){rotations.push(r)},scale(){},
 drawImage(...a){calls.push(a)},set globalCompositeOperation(v){},set globalAlpha(v){}};
const ctx={Math,g,clock:1,Image:MockImage,fxEnabled:true,has:k=>k===skill,clamp:(n,a,b)=>Math.max(a,Math.min(b,n))};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end),ctx);
assert.equal(loadedSource,'assets/fx/impact-bursts-v119.png','new sprite atlas preloaded once');
ctx.b={held:false};
vm.runInContext("spawnContact(b,100,100,1,0,'enemy');drawContactFX(1)",ctx);
assert.equal(calls.length,1,'one real sprite draw on hit');
const a=calls[0];
assert.equal(a.length,9,'source-cell bitmap blit, not a generated line image');
assert.equal(a[0].naturalWidth,256,'uses preloaded bitmap atlas');
assert.equal(a[1],0,'fire first variant column');
assert.equal(a[2],64,'fire first variant in second row');
assert.equal(a[3],64);assert.equal(a[4],64);
assert(a[7]>=45&&a[7]<=55,'visual hit footprint covers 16px ball and bounce corner');
assert.equal(a[7],a[8],'proportions preserved');
const index=vm.runInContext("contactAtlasIndex({style:'pierce',kind:'wall',variant:1})",ctx);
assert.equal(index,5,'pierce wall uses bright-blue electric burst');
assert.equal(vm.runInContext("contactAtlasIndex({style:'shield',kind:'enemy',variant:0})",ctx),10,'shield state uses green burst');
assert.equal(vm.runInContext("contactAtlasIndex({style:'power',kind:'enemy',variant:1})",ctx),11,'power variants can show pink burst');
assert.equal(vm.runInContext("contactAtlasIndex({style:'slow',kind:'enemy',variant:2})",ctx),9,'slow uses icy burst');
assert(source.includes("spawnContact(b,b.x,b.y,1,0,'wall')"),'left wall anchors to the actual corner');
assert(source.includes("spawnContact(b,b.x,b.y,-1,0,'wall')"),'right wall anchors to the actual corner');
assert(source.includes("spawnContact(b,b.x,b.y,0,1,'ceiling')"),'ceiling corner is ball center');
assert(source.includes("spawnContact(b,piercing?f[0]:ox,piercing?f[1]:oy"),'enemy bounce covers trail vertex');
assert(source.includes("if(ballContactFX.length)luminous(()=>drawContactFX(1),()=>drawContactFX(.25))"),'all status sprites overlaid with one subtle bloom pass');
console.log('PASS v119: packed 12-state PNG atlas, frame mapping, exact trail-corner overlay, LITE fallback and bloom integration.');
