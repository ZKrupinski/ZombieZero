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
const ids=['upgrade-open','upgrade-close','upgrade-dialog','upgrade-tabs','upgrade-list','upgrade-chip-count','upgrade-wallet','overlay'];
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
assert(api&&api.defs.length===23,'all 23 growth upgrades exist');
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
assert(nodes['upgrade-list'].innerHTML.includes('더블볼'),'weapon tab renders existing skills');
listeners['upgrade-tabs:click']({target:{closest:()=>({dataset:{growthTab:'citizen'}})}});
assert(nodes['upgrade-list'].innerHTML.includes('시민 방어훈련'),'citizen tab renders');
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
console.log('PASS v194: 23 upgrades, 3-tab shop, permanent wallet, purchase, duplicate reward protection, campaign/endless and gameplay hooks');
