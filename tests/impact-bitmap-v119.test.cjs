'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path='dist/assets/fx/impact-bursts-mono-v123.png';
const png=fs.readFileSync(path);
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','real PNG signature');
assert.equal(png.readUInt32BE(16),256,'4 columns of 64px');
assert.equal(png.readUInt32BE(20),192,'3 rows of 64px');
assert(png.length<17000,'12 grayscale transparent bitmap contacts stay within the lightweight budget');
const pal=png.indexOf(Buffer.from('PLTE'));const trns=png.indexOf(Buffer.from('tRNS'));
assert(pal>0&&trns>0,'indexed PNG must retain real transparent alpha');
const palSize=png.readUInt32BE(pal-4);
for(let i=0;i<palSize;i+=3){const p=pal+4+i;assert.equal(png[p],png[p+1],'neutral RGB R=G');assert.equal(png[p+1],png[p+2],'neutral RGB G=B');}
const source=fs.readFileSync('dist/game.js','utf8');
const approved=fs.readFileSync('art-source/impact-bursts-v457-approved.png');
assert.equal(approved.readUInt32BE(16),1536);assert.equal(approved.readUInt32BE(20),1024);
assert.equal(approved[25],6,'approved original RGBA source');
assert.equal(require('node:crypto').createHash('sha1').update('blob '+approved.length+'\0').update(approved).digest('hex'),'5caa050ea68bb18c601a17684e16a845131dc6ab');
const start=source.indexOf('let ballContactFX=[];'),end=source.indexOf('// Nine nearly touching lanes',start);
assert(start>=0&&end>start,'hit FX source is accessible');
let skill='fire',calls=[],rotations=[],alphas=[],scales=[],translations=[],loadedSource='';
class MockImage{
 constructor(){this.complete=true;this.naturalWidth=256;this.naturalHeight=192;}
 set src(s){loadedSource=s;if(s.includes('v457-approved')){this.naturalWidth=1536;this.naturalHeight=1152}}
 get src(){return loadedSource}
}
const g={save(){},restore(){},translate(x,y){translations.push([x,y])},rotate(r){rotations.push(r)},scale(x,y){scales.push([x,y])},
 drawImage(...a){calls.push(a)},set globalCompositeOperation(v){},set globalAlpha(v){alphas.push(v)}};
const ctx={trashContactFX:[],Math,g,clock:1,Image:MockImage,fxEnabled:true,has:k=>k===skill,clamp:(n,a,b)=>Math.max(a,Math.min(b,n))};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end),ctx);
assert.equal(loadedSource,'assets/fx/impact-bursts-mono-v123.png','new monochrome sprite atlas preloaded once');
ctx.b={held:false};
vm.runInContext("spawnContact(b,100,100,1,0,'enemy');drawContactFX(1)",ctx);
assert.equal(calls.length,2,'one base and one restrained ADD bitmap draw on hit');
assert.equal(alphas[0],1,'instant full-opacity entrance');assert.equal(alphas[1],.09,'fixed restrained ADD overlay');
const a=calls[0];
assert.equal(a.length,9,'source-cell bitmap blit, not a generated line image');
assert.equal(a[0].naturalWidth,1536,'uses preloaded bitmap atlas');
const selected=vm.runInContext('contactAtlasIndex(ballContactFX[0])',ctx);
assert.equal(selected,9,'sample collision chooses one of all 12 varied bursts');
assert.equal(a[1],(selected%4)*384,'source column matches selected collision silhouette');
assert.equal(a[2],Math.floor(selected/4)*384,'source row matches selected collision silhouette');
assert.equal(a[3],384);assert.equal(a[4],384);
assert(a[7]>=73&&a[7]<=79,'V120 bitmap hit prominently covers trail bend without changing source artwork');
assert.equal(a[7],a[8],'proportions preserved');
assert.equal(vm.runInContext('ballContactFX[0].life',ctx),.30,'enemy contact stays visible for 0.30s');
const initialAngle=rotations[0],initialPosition=translations[0];
vm.runInContext('ballContactFX[0].t=.04;drawContactFX(1)',ctx);
assert.equal(calls.length,4,'bitmap still renders several frames later');
assert.equal(alphas.at(-2),1,'no fade during shaking');
assert(Math.hypot(translations[1][0]-initialPosition[0],translations[1][1]-initialPosition[1])>8,'visible alternating shake');
assert(Math.abs(rotations[1]-initialAngle)>.2,'visible alternating rotation');
vm.runInContext('ballContactFX[0].t=.22;drawContactFX(1)',ctx);
assert.equal(alphas.at(-2),1,'no late fade before snap-out');
const settledAngle=rotations.at(-1);
vm.runInContext('ballContactFX[0].t=.26;drawContactFX(1)',ctx);
assert.equal(calls.length,9,'exit adds one afterimage to base and ADD');
assert.deepEqual(alphas.slice(-3),[.23,1,.09],'exit afterimage and main remain at fixed alpha');
assert.deepEqual(scales.slice(-3),[[1,1],[.83,.83],[.64,.64]],'hard scale step');
assert(Math.abs(rotations.at(-1)-settledAngle)>=.35,'exit switches to another angle');
vm.runInContext('drawContactFX(.22,ballContactFX,null,true)',ctx);
assert.equal(calls.length,10,'bloom only draws the primary bitmap once');
assert.equal(alphas.at(-1),.22);
assert.equal(rotations.at(-1),rotations.at(-2),'bloom uses the same exit rotation');
vm.runInContext('ballContactFX[0].t=.30;drawContactFX(1)',ctx);
assert.equal(calls.length,10,'expired effect produces no extra bitmap draws');
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
assert(source.includes("if(ballContactFX.length)luminous(()=>drawContactFX(1),()=>drawContactFX(.22,ballContactFX,null,true))"),'restrained neutral bloom pass');
assert(!source.includes('g.rotate(angle*.22)'),'no special collision-facing rotation');
console.log('PASS v123: 12 grayscale silhouette frames, transparent PNG, no skill tint or directional spin; V460 hard-cut shake and rotated snap-out verified.');
