'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/game.js','utf8');
const begin=src.indexOf('let ballContactFX=[];'),end=src.indexOf('// Nine nearly touching lanes',begin);
assert(begin>0&&end>begin,'v114 contact bitmap implementation present');
const created=[],drawn=[],angles=[];
const painter={beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fillRect(){},closePath(){},fill(){},save(){},restore(){},translate(){},scale(){}};
const g={save(){},restore(){},translate(){},scale(){},rotate(a){angles.push(a)},drawImage(...a){drawn.push(a)},set globalCompositeOperation(v){},set globalAlpha(v){}};
const env={Math,g,clock:1,fxEnabled:true,has:k=>k==='pierce',
 clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),
 document:{createElement(tag){assert.equal(tag,'canvas');const v={getContext:()=>painter};created.push(v);return v}}};
vm.createContext(env);vm.runInContext(src.slice(begin,end),env);
const b={held:false,x:125,y:100,vx:390,vy:0},z={x:100,y:80,w:40,h:40};
env.b=b;env.z=z;
assert.deepEqual(Array.from(vm.runInContext('contactFace(b,z,8,90,100)',env)),[100,100,-1,0],'zombie left face');
b.y=72;
assert.deepEqual(Array.from(vm.runInContext('contactFace(b,z,8,125,68)',env)),[125,80,0,-1],'zombie top face');
vm.runInContext("spawnContact(b,100,100,-1,0,'enemy')",env);
vm.runInContext("spawnContact(b,100,100,-1,0,'enemy')",env);
assert.equal(vm.runInContext('ballContactFX.length',env),1,'repeat hits are throttled per ball');
vm.runInContext('drawContactFX(1);drawContactFX(.36)',env);
assert.equal(created.length,1,'same transparent sprite is generated only once');
assert.equal(drawn.length,2,'base alpha and attenuated ADD/Bloom share bitmap');
assert(angles.every(a=>Math.abs(a-Math.PI)<.0001),'left surface points outwards');
env.clock=1.1;
vm.runInContext("spawnContact(b,414,200,-1,0,'wall')",env);
vm.runInContext("spawnContact(b,200,16,0,1,'ceiling')",env);
assert.equal(vm.runInContext('ballContactFX.length',env),2,'cooldown suppresses duplicate immediate hit');
const additional={held:false};env.other=additional;
for(let i=0;i<32;i++){env.clock+=.1;vm.runInContext("spawnContact(other,414,200,-1,0,'wall')",env)}
assert.equal(vm.runInContext('ballContactFX.length',env),20,'active hit effects remain bounded');
assert(src.includes("spawnContact(b,ROAD_LEFT,b.y,1,0,'wall')"),'left wall collision feeds FX');
assert(src.includes("spawnContact(b,ROAD_RIGHT,b.y,-1,0,'wall')"),'right wall collision feeds FX');
assert(src.includes("spawnContact(b,b.x,16,0,1,'ceiling')"),'ceiling uses vertical face');
assert(src.includes("const f=contactFace(b,z,radius,ox,oy);spawnContact("),'enemy collision uses correct collider face');
assert(src.includes("luminous(()=>drawContactFX(1),()=>drawContactFX(.36))"),'all hits share one lightweight bloom capture');
assert(src.includes('ballContactFX=ballContactFX.filter(q=>q.t<q.life)'),'effects expire');
// LITE must still get this essential readable feedback, while Bloom is optional.
env.fxEnabled=false;env.clock+=.2;
vm.runInContext("spawnContact(other,175,130,1,0,'wall')",env);
const before=drawn.length;
vm.runInContext('drawContactFX(1)',env);
assert(drawn.length>before,'LITE mode draws basic contact feedback without FX renderer');
assert(src.includes("g.drawImage(img,-20,-32)"),'bitmap artwork anchored on the collision surface');
assert(src.includes('life:kind===\'enemy\'?.22:kind===\'ceiling\'?.17:.19'),'effect survives enough frames to read');
console.log('PASS v114: 3 face types, normal direction, bitmap cache, per-ball throttle, max FX count, integrated bloom.');
