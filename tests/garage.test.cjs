const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const memory=new Map();
const context=vm.createContext({window:{},document:{getElementById:()=>null},localStorage:{
 getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)
}});
function boot(){
 for(const file of ['garage','progression'])vm.runInContext(fs.readFileSync('dist/'+file+'.js','utf8'),context);
 return context.window.ZZProgression;
}
let api=boot();
api.startRun('campaign');
assert.equal(api.grant('wave',1,10,0),true);
assert.equal(api.grant('wave',1,10,0),false);
assert.equal(api.garage().tickets,1);
assert.equal(api.garageAction('radio',null,0),true);
assert.equal(api.garageAction('radio',null,0),false);
assert.equal(api.garageAction('equip','cushion',3),true);
assert.equal(api.garageAction('upgrade','cushion',3),true);
assert.equal(api.chips(),0);
assert.equal(api.garageAction('upgrade','cushion',3),false);
api=boot();
assert.equal(api.garage().mechanic,true);
const system=context.window.ZZGarage;
system.load(3,api.garage());
const ball={bank:true,vx:-1,vy:-1},impact={x:-1,y:-1};
system.contact(ball,3,impact);
assert.equal(impact.x,-1);assert.equal(impact.y,0);
assert(impact.push>1.7);assert.equal(ball.bank,false);
api.startRun('campaign');api.grant('wave',1,10,3);
assert.equal(api.garage().tickets,0);
api.startRun('endless');
for(let n=1;n<=10;n++)api.grant('wave',n,10,3);
assert.equal(api.garage().xp[3],11);
assert.equal(api.garageAction('batch',null,3),true);
assert.equal(api.garage().calls.length,10);
assert.equal(api.garage().badges,10);
assert.equal(Object.keys(api.garage().levels).length,6);
console.log('PASS garage recruitment, shared wallet, per-hero gear, bank shot and persisted rewards');
const inventory=api.garage();
assert.equal(inventory.xp.reduce((a,b)=>a+b,0),22,'12 clears and ten duplicate replies');
for(const [xp,expected] of [[4,0],[5,1],[49,9],[50,10],[100,10]]){
 inventory.xp[3]=xp;
 system.load(3,inventory);
 assert.equal(system.masteryDefense(),expected);
 assert.equal(system.heroStats({paddle:60},inventory,null,3)[3].bonus,expected);
}
