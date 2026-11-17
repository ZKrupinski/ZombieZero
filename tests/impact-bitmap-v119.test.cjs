'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path='dist/assets/fx/impact-bursts-mono-v122.png';
const png=fs.readFileSync(path);
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','real PNG signature');
assert.equal(png.readUInt32BE(16),256,'4 columns of 64px');
assert.equal(png.readUInt32BE(20),192,'3 rows of 64px');
assert(png.length<12000,'12 grayscale transparent bitmap contacts stay within the lightweight budget');
const pal=png.indexOf(Buffer.from('PLTE'));const trns=png.indexOf(Buffer.from('tRNS'));
assert(pal>0&&trns>0,'indexed PNG must retain real transparent alpha');
const palSize=png.readUInt32BE(pal-4);
for(let i=0;i<palSize;i+=3){const p=pal+4+i;assert.equal(png[p],png[p+1],'neutral RGB R=G');assert.equal(png[p+1],png[p+2],'neutral RGB G=B');}
const source=fs.readFileSync('dist/game.js','utf8');
const start=source.indexOf('let ballContactFX=[];'),end=source.indexOf('// Nine nearly touching lanes',start);
assert(start>=0&&end>start,'hit FX source is accessible');
let skill='fire',calls=[],rotations=[],alphas=[],loadedSource='';
class MockImage{
 constructor(){this.complete=true;this.naturalWidth=256;this.naturalHeight=192;}
 set src(s){loadedSource=s}
 get src(){return loadedSource}
}
const g={save(){},restore(){},translate(){},rotate(r){rotations.push(r)},scale(){},
 drawImage(...a){calls.push(a)},set globalCompositeOperation(v){},set globalAlpha(v){alphas.push(v)}};
const ctx={Math,g,clock:1,Image:MockImage,fxEnabled:true,has:k=>k===skill,clamp:(n,a,b)=>Math.max(a,Math.min(b,n))};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end),ctx);
assert.equal(loadedSource,'assets/fx/impact-bursts-mono-v122.png','new monochrome sprite atlas preloaded once');
ctx.b={held:false};
vm.runInContext("spawnContact(b,100,100,1,0,'enemy');drawContactFX(1)",ctx);
assert.equal(calls.length,1,'one real sprite draw on hit');
const a=calls[0];
assert.equal(a.length,9,'source-cell bitmap blit, not a generated line image');
assert.equal(a[0].naturalWidth,256,'uses preloaded bitmap atlas');
assert.equal(a[1],0,'variant 0 uses first monochrome cell');
assert.equal(a[2],0,'atlas is independent of fire skill palette');
assert.equal(a[3],64);assert.equal(a[4],64);
assert(a[7]>=73&&a[7]<=79,'V120 bitmap hit prominently covers trail bend without changing source artwork');
assert.equal(a[7],a[8],'proportions preserved');
assert.equal(vm.runInContext('ballContactFX[0].life',ctx),.30,'enemy contact stays visible for 0.30s');
vm.runInContext('ballContactFX[0].t=.07;drawContactFX(1)',ctx);
assert.equal(calls.length,2,'bitmap still renders several frames later');
assert(Math.abs(alphas.at(-1)-.98)<.001,'first 28% of effect retains full opacity');
vm.runInContext('ballContactFX[0].t=.22;drawContactFX(1)',ctx);
assert(alphas.at(-1)>.35,'contact retains a readable soft falloff late in the animation');
vm.runInContext('ballContactFX[0].t=.30;drawContactFX(1)',ctx);
assert.equal(calls.length,3,'expired effect produces no extra bitmap draws');
for(let v=0;v<12;v++){
 const hit=vm.runInContext("contactAtlasIndex({kind:'wall',style:'fire',variant:"+v+"})",ctx);
 assert.equal(hit,v,'variant '+v+' uses unique black-and-white burst');
}
assert.equal(vm.runInContext("contactAtlasIndex({kind:'enemy',style:'pierce',variant:9})",ctx),9,
 'pierce and all other skill states share the same neutral artwork');
assert(source.includes('variant:Math.floor(Math.abs(x*7+y*3+clock*41))%12'),
 'twelve varied shapes can appear independently of collision type');
assert(!source.includes('CONTACT_ATLAS_FRAMES'),'remove old color/state-specific atlas mapping');
assert(source.includes("spawnContact(b,b.x,b.y,1,0,'wall')"),'left wall anchors to the actual corner');
assert(source.includes("spawnContact(b,b.x,b.y,-1,0,'wall')"),'right wall anchors to the actual corner');
assert(source.includes("spawnContact(b,b.x,b.y,0,1,'ceiling')"),'ceiling corner is ball center');
assert(source.includes("spawnContact(b,piercing?f[0]:ox,piercing?f[1]:oy"),'enemy bounce covers trail vertex');
assert(source.includes("if(ballContactFX.length)luminous(()=>drawContactFX(1),()=>drawContactFX(.10))"),'minimal neutral bloom pass');
assert(!source.includes('g.rotate(angle*.22)'),'no special collision-facing rotation');
console.log('PASS v122: 12 grayscale silhouette frames, transparent PNG, no skill tint or directional spin; V120 timing and layering retained.');
