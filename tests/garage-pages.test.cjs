const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();
function element(id){
 if(!elements.has(id))elements.set(id,{showModal(){this.open=true},close(){this.open=false},events:{},addEventListener(k,fn){this.events[k]=fn},setPointerCapture(){},querySelector(sel){return sel==='.garage-driver'?{clientWidth:300,style:{setProperty(){}},querySelector(){return null}}:null}});
 return elements.get(id);
}
const data={mechanic:false,levels:{grip:0},loads:[{},{},{},{}],xp:[0,4,0],tickets:2,badges:0};
let edit;
const app=vm.createContext({window:{},$:element,selectedHero:0,mode:'menu',HEROES:['에이스','루비','리아','정비사'].map(name=>({name})),cancelAnimationFrame(){}});
vm.runInContext(fs.readFileSync('dist/garage.js','utf8'),app);
app.window.ZZProgression={garage:()=>data,chips:()=>20,garageAction:(action,id,hero)=>{edit={action,id,hero};return true}};
vm.runInContext(fs.readFileSync('dist/garage-ui.js','utf8'),app);
element('garage-open').onclick();
const body=element('garage-body');
assert(element('garage-dialog').open);
assert.equal((body.innerHTML.match(/class="garage-reel-card"/g)||[]).length,3,'three mounted owned windows');
assert.match(body.innerHTML,/data-selected-hero="0"/,'the first owned survivor is initially centered');
assert(!body.innerHTML.includes('data-driver="3"'));
const click=dataset=>body.onclick({target:{closest:()=>({dataset})}});
const arrow=dir=>body.events.click({target:{closest:()=>({dataset:{step:String(dir)}})}});
arrow(-1);assert.match(body.innerHTML,/data-selected-hero="2"/);
arrow(1);assert.match(body.innerHTML,/data-selected-hero="0"/);
data.mechanic=true;arrow(-1);assert.match(body.innerHTML,/data-selected-hero="3"/);
assert.equal((body.innerHTML.match(/class="garage-reel-card"/g)||[]).length,4,'recruited mechanic joins mounted reel');
arrow(1);data.mechanic=false;
const pointer=(type,x,t)=>body.events[type]({type,button:0,pointerId:1,clientX:x,timeStamp:t,target:{closest:sel=>sel==='.garage-driver'}});
pointer('pointerdown',180,0);
const mountedBefore=body.innerHTML;
pointer('pointermove',88,200);
assert.equal(body.innerHTML,mountedBefore,'drag cannot rebuild cards in pointermove');
pointer('pointerup',88,360);
assert.match(body.innerHTML,/data-selected-hero="1"/);
click({action:'equip'});
assert.deepEqual(edit,{action:'equip',id:'grip',hero:1});
assert.equal(app.selectedHero,0);
element('garage-close').onclick();
element('radio-open').onclick();
assert(element('radio-dialog').open);
assert.match(element('radio-body').innerHTML,/1회 호출/);
assert(!element('radio-body').innerHTML.includes('data-part='));
console.log('PASS independent garage/radio entries and garage driver selection');

// A ten-call first recruitment contains one new survivor and nine duplicates.
let inventory={...data,tickets:11,badges:2,mechanic:false};
app.window.ZZProgression.garage=()=>inventory;
app.window.ZZProgression.garageAction=(action,id,hero)=>{
 const draft=JSON.parse(JSON.stringify(inventory));
 if(app.window.ZZGarage.modify(draft,action,id,hero,20)===undefined)return false;
 inventory=draft;return true;
};
app.renderHeroes=()=>{};
element('hero-3').click=()=>{app.selectedHero=3};
app.setTimeout=()=>1;
app.clearTimeout=()=>{};
const radio=element('radio-body');
const press=action=>radio.onclick({target:{closest:()=>({dataset:{action}})}});
press('batch');
assert.match(radio.innerHTML,/주파수 동조 중/);
press('batch');
assert.equal(inventory.tickets,1);
press('reveal');
assert.match(radio.innerHTML,/신규 생존자 합류/);
assert.match(radio.innerHTML,/제작 너트 \+9/);
assert.match(radio.innerHTML,/응답 10건/);
assert.equal(app.selectedHero,3);
press('signal');
press('radio');
element('radio-dialog').close();
element('radio-dialog').events.close();
element('radio-open').onclick();
assert.match(radio.innerHTML,/아군 응답 확인/);
assert.match(radio.innerHTML,/제작 너트 \+1/);
assert.equal(inventory.badges,12);
console.log('PASS radio batch unlock, duplicate reward, double press and interrupted reveal');


// v271 — selecting a card and actually equipping a part are two different
// states. One distinct equipped marker must remain visible per occupied slot.
let equippedData={
 mechanic:false,levels:{grip:3,wide:4,cushion:1,heavy:1,steer:1,filter:1},
 loads:[{0:'wide',1:'heavy',2:'steer'},{},{},{}],xp:[0,0,0,0],tickets:0,badges:0
};
app.selectedHero=0;
app.window.ZZProgression.garage=()=>equippedData;
app.window.ZZProgression.garageAction=(action,id,hero)=>{
 const draft=JSON.parse(JSON.stringify(equippedData));
 const changed=app.window.ZZGarage.modify(draft,action,id,hero,1000);
 if(changed===undefined)return false;
 equippedData=draft;return true;
};
element('garage-open').onclick();
const listMarkup=()=>body.innerHTML;
const equippedCount=()=> (listMarkup().match(/data-equipped="true"/g)||[]).length;
const badgeCount=()=> (listMarkup().match(/class="garage-equip-badge"/g)||[]).length;
assert.equal(equippedCount(),3,'each occupied weapon/ball/vehicle slot has a marked equipped choice');
assert.equal(badgeCount(),3,'only three equipped cards receive the permanent badge');
assert.match(listMarkup(),/data-part="wide" data-equipped="true"/,'wide is actually equipped');
assert.match(listMarkup(),/data-part="grip" data-equipped="false" aria-pressed="true"/,'inspected grip is NOT equipped');
assert.match(listMarkup(),/data-part="heavy" data-equipped="true"/);
assert.match(listMarkup(),/data-part="steer" data-equipped="true"/);
assert.equal((listMarkup().match(/class="garage-slot-current"/g)||[]).length,3,'all three slot headings show equipped state');
assert.equal((listMarkup().match(/class="garage-slot-empty"/g)||[]).length,0);
click({part:'filter'});
assert.match(listMarkup(),/data-part="filter" data-equipped="false" aria-pressed="true"/,
 'inspection of an unequipped module changes the amber selection only');
assert.equal(badgeCount(),3,'inspection does not move equipped indicators');
click({part:'grip'});
click({action:'equip'});
assert.equal(equippedData.loads[0][0],'grip','equipping grip replaces wide in exactly its weapon slot');
assert.equal(equippedCount(),3,'switching one slot never equips two cards within that slot');
assert.match(listMarkup(),/data-part="grip" data-equipped="true" aria-pressed="true"/);
assert.match(listMarkup(),/data-part="wide" data-equipped="false"/);
assert.match(listMarkup(),/data-part="heavy" data-equipped="true"/);
assert.match(listMarkup(),/data-part="steer" data-equipped="true"/);
element('garage-close').onclick();
console.log('PASS v271: persistent equipment badge, 3 exclusive slots, inspection highlight distinct from equipped state');
