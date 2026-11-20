'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/progression.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
const store=new Map(),listeners={};
function node(id){
 return {
  id,hidden:false,textContent:'',dataset:{},style:{},innerHTML:'',open:false,
  setAttribute(){},classList:{toggle(){}},
  addEventListener(name,fn){listeners[id+':'+name]=fn},
  querySelector(){return null},querySelectorAll(){return []},
  showModal(){this.open=true},close(){this.open=false}
 };
}
const ids=['upgrade-open','upgrade-close','upgrade-dialog','upgrade-list','upgrade-chip-count','upgrade-wallet','overlay','upgrade-detail-name','upgrade-detail-level','upgrade-detail-current','upgrade-detail-next','upgrade-detail-buy'];
const nodes=Object.fromEntries(ids.map(id=>[id,node(id)]));
nodes.overlay.dataset.screen='selection';
const sandbox={
 window:{},document:{getElementById:id=>nodes[id]||null},
 localStorage:{getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,String(val))},
 Date,Math,console
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);
let api=sandbox.window.ZZProgression;
assert(api&&api.defs.length===22,'all 22 growth upgrades exist');
assert.equal(api.chips(),0);
assert.equal(api.level('dual'),0);
assert.equal(api.purchase('dual'),false,'insufficient chips cannot buy');
api.startRun('campaign');
assert.equal(api.grant('wave',1,10),true);
assert.equal(api.grant('wave',1,10),false,'same wave cannot pay twice');
assert.equal(api.grant('boss',3,25),true);
assert.equal(api.chips(),35);
assert.equal(api.purchase('dual'),true);
assert.equal(api.chips(),20);
assert.equal(api.level('dual'),1);
assert.equal(api.duration('dual',1),16*1.06);
assert.equal(api.duration('dual',1.25),20*1.06);
assert.equal(api.purchase('dual'),false,'Lv2 cost must be 30');
assert.equal(api.lastStandDistance(),60);
assert.equal(api.lastStandUses(),1);
assert.equal(api.rescueKills(),5);
assert.equal(api.poisonFactor(),1);
assert.equal(api.citizenCriticalChance(),0);
assert.equal(api.bazookaInterval(),3);
assert.equal(api.pickupWidth(),65);
assert.equal(api.open(),true,'shop opens in character selection');
assert(nodes['upgrade-dialog'].open,'native dialog opens');
assert(nodes['upgrade-list'].innerHTML.includes('더블볼'),'weapon column renders');
assert(nodes['upgrade-list'].innerHTML.includes('안죽어요!'),'citizen column renders with approved comic label');
assert(nodes['upgrade-list'].innerHTML.includes('최후의 저항'),'survival column renders');
assert.equal((nodes['upgrade-list'].innerHTML.match(/data-select="/g)||[]).length,22,'all 22 skills visible simultaneously');
assert.equal((nodes['upgrade-list'].innerHTML.match(/zz-upgrade-column /g)||[]).length,3,'exactly 3 groups');
listeners['upgrade-list:click']({target:{closest:()=>({dataset:{select:'citizenArmor'}})}});
assert.equal(nodes['upgrade-detail-name'].textContent,'안죽어요!');
assert.equal(nodes['upgrade-detail-level'].textContent,'LV1/5');
assert(nodes['upgrade-detail-next'].textContent.includes('20%'),'details show next effect');
assert.equal(nodes['upgrade-detail-buy'].disabled,false,'cost affordable');
nodes['upgrade-dialog'].close();
nodes.overlay.dataset.screen='pause';
assert.equal(api.open(),false,'shop remains unavailable during a live pause');
vm.runInContext(source,sandbox);
api=sandbox.window.ZZProgression;
assert.equal(api.chips(),20,'wallet is persisted');
assert.equal(api.level('dual'),1,'purchases persist across reload');
api.startRun('endless');
assert.equal(api.grant('wave',1,10),true,'new run earns waves separately');
assert.equal(api.grant('wave',1,10),false,'endless intermission never duplicates rewards');
assert.equal(api.chips(),30);
for(const text of [
 "window.ZZProgression?.startRun?.(selectedMode)",
 "window.ZZProgression?.grant?.('wave',wave,10)",
 "window.ZZProgression?.grant?.('wave',wave-50,10)",
 "window.ZZProgression?.grant?.('boss',wave,25)",
 "growth('citizenArmor')","growth('citizenCrit')","growth('citizenPower')",
 "growth('bazookaPower')","growth('bazookaReload')",
 "growth('poisonResist')","growth('detox')","growth('recover')",
 "growth('mental')","growth('rescue')","growth('lastStand')"
])assert(game.includes(text)||text==="growth('lastStand')"&&game.includes("lastStandDistance"),'missing gameplay hook '+text);
assert(html.includes('id="upgrade-open"')&&html.includes('id="upgrade-dialog"'));
assert(html.indexOf('progression.js?v=')<html.indexOf('game.js?v='),'growth module loads before game');
assert(sw.includes("'./progression.js'"),'PWA caches progression');

// Fully upgraded profile: numeric end-caps must match the stored design.
const rich=JSON.parse(store.get('zz-growth-v1'));
rich.chips=30000;
store.set('zz-growth-v1',JSON.stringify(rich));
vm.runInContext(source,sandbox);
api=sandbox.window.ZZProgression;
for(const def of api.defs){
 for(let lv=api.level(def.id)+1;lv<=5;lv++)assert.equal(api.purchase(def.id),true,def.id+' Lv'+lv);
 assert.equal(api.purchase(def.id),false,'cannot exceed Lv5 '+def.id);
}
assert.equal(api.defs.reduce((sum,d)=>sum+api.level(d.id),0),22*5);
assert.equal(api.duration('fire',1),13);
assert.equal(api.duration('fire',1.25),16.25);
assert.equal(api.rescueKills(),4);
assert.equal(api.rescueAbsent(),5.5);
assert.equal(api.citizenGuardChance(),1);
assert.equal(api.citizenCriticalChance(),.15);
assert.equal(api.citizenDamage(),.5);
assert.equal(api.bazookaDamage(),10);
assert.equal(api.bazookaRadiusBonus(),8);
assert.equal(api.bazookaInterval(),2.6);
assert.equal(api.lastStandDistance(),170);
assert.equal(api.lastStandUses(),3);
assert(Math.abs(api.poisonFactor()-.7)<1e-10);
assert.equal(api.detoxRate(),8.8);
assert.equal(api.poisonGrace(),1.25);
assert.equal(api.groggySeconds(),1.35);
assert.equal(api.comboSeconds(),7.2);
assert.equal(api.pickupWidth(),85);
assert.equal(api.paddleBonus(),10);
assert.equal(api.purchase('earlyWarning'),false);
assert.equal(api.defs.find(d=>d.id==='itemMagnet').group,'citizen');
assert.equal(api.defs.find(d=>d.id==='sweetSpot').group,'survival');
assert.equal(new Set(api.defs.filter(d=>d.atlas===undefined).map(d=>d.passiveIcon)).size,14);
const retired=JSON.parse(store.get('zz-growth-v1'));
retired.levels.earlyWarning=3;
store.set('zz-growth-v1',JSON.stringify(retired));
vm.runInContext(source,sandbox);
assert.equal(sandbox.window.ZZProgression.chips(),retired.chips+100);

vm.runInContext(source,sandbox);
api=sandbox.window.ZZProgression;
assert.equal(api.chips(),retired.chips+100,'refund occurs once');
assert.equal(api.level('citizenArmor'),5,'max ranks survive reload');
assert.equal(api.level('lastStand'),5,'last stand persists');

console.log('PASS v196: 22 upgrades in 3 visible columns, selected purchase detail, permanent wallet and gameplay hooks');
