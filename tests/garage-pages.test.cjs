const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();
function element(id){
 if(!elements.has(id))elements.set(id,{showModal(){this.open=true},close(){this.open=false},addEventListener(){},querySelector(){return null}});
 return elements.get(id);
}
const data={mechanic:false,levels:{grip:0},loads:[{},{},{}],xp:[0,4,0],tickets:2,badges:0};
let edit;
const app=vm.createContext({window:{},$:element,selectedHero:0,mode:'menu',HEROES:['에이스','루비','리아','정비사'].map(name=>({name})),cancelAnimationFrame(){}});
vm.runInContext(fs.readFileSync('dist/garage.js','utf8'),app);
app.window.ZZProgression={garage:()=>data,chips:()=>20,garageAction:(action,id,hero)=>{edit={action,id,hero};return true}};
vm.runInContext(fs.readFileSync('dist/garage-ui.js','utf8'),app);
element('garage-open').onclick();
const body=element('garage-body');
assert(element('garage-dialog').open);
assert(!body.innerHTML.includes('data-driver="3"'));
const click=dataset=>body.onclick({target:{closest:()=>({dataset})}});
click({driver:'1'});
assert.match(body.innerHTML,/data-driver="1" aria-pressed="true"/);
click({action:'equip'});
assert.deepEqual(edit,{action:'equip',id:'grip',hero:1});
assert.equal(app.selectedHero,0);
element('garage-close').onclick();
element('radio-open').onclick();
assert(element('radio-dialog').open);
assert.match(element('radio-body').innerHTML,/1회 호출/);
assert(!element('radio-body').innerHTML.includes('data-part='));
console.log('PASS independent garage/radio entries and garage driver selection');
