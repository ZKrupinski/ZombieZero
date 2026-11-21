'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ui=fs.readFileSync('dist/garage-ui.js','utf8');
const css=fs.readFileSync('dist/garage.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const sources=['에이스','루비','리아','정비사'].map((name,i)=>({
 id:'hero-'+i,dataset:{},innerHTML:'<b>'+name+'</b>',textContent:name,
 style:{},hidden:false,setAttribute(){},click(){app.selectedHero=i;app.window.ZZRefreshHeroReel?.()}
}));
class Node {
 constructor(tag='div'){
  this.tagName=tag;this.dataset={};this.style={};this.attrs={};this.children=[];
  this.innerHTML='';this.clientWidth=450;this.parentNode=null;
 }
 appendChild(node){this.children.push(node);node.parentNode=this;return node}
 setAttribute(key,val){this.attrs[key]=String(val)}
 querySelectorAll(sel){
  if(sel==='.hero-reel-proxy')return this.children.filter(n=>n.className?.includes('hero-reel-proxy'));
  if(sel==='.hero-card:not(.hero-reel-proxy)')return sources;
  return [];
 }
}
const stage=new Node(),events={};
const heroes=new Node();heroes.querySelector=sel=>sel==='.hero-options'?stage:null;
heroes.addEventListener=(kind,cb)=>{events[kind]=cb};
heroes.setPointerCapture=()=>{};
const dock=new Node();dock.querySelector=()=>null;dock.addEventListener=()=>{};
const fallback=new Node();fallback.addEventListener=()=>{};
const el=id=>id==='heroes'?heroes:id==='garage-body'?dock:id==='overlay'?{dataset:{screen:'selection'}}:
 id.startsWith('hero-')?sources[Number(id.slice(5))]:fallback;
const doc={createElement:tag=>new Node(tag)};
const gameData={mechanic:false,loads:[{},{},{},{}],levels:{},xp:[0,0,0,0],tickets:0,badges:0};
const app={
 window:{ZZGarage:{parts:[{id:'grip',slot:0,name:'Grip'}],prices:[10],
  heroStatMarkup:()=>'',value:()=>10},ZZProgression:{garage:()=>gameData,chips:()=>0}},
 HEROES:sources.map(s=>({name:s.textContent})),selectedHero:0,mode:'menu',$:el,
 document:doc,cancelAnimationFrame(){},Math,Number,Array,console
};
vm.createContext(app);vm.runInContext(ui,app);
assert.equal(stage.children.length,7,'7 stable virtual cells support up to five visible plus 2 buffer');
assert.equal(heroes.dataset.fiveReel,'true','main only uses virtual slots');
const at=offset=>stage.children.find(n=>Number(n.dataset.reelOffset)===offset);
for(let i=-2;i<=2;i++){
 const node=at(i);assert(node&&Number(node.style.opacity)>0,'all five card positions visible at offset '+i);
 assert(node.innerHTML,'all five contain actual owned hero resources');
}
assert.equal(at(0).dataset.reelHero,'0');
assert.deepEqual([-2,-1,0,1,2].map(n=>at(n).dataset.reelHero),['1','2','0','1','2'],
 'three owned characters wrap through five visible slots rather than showing fake characters');
// During a swipe, no transient pass-through card may flash the selected border.
const selectedBorders=()=>stage.children.filter(node=>node.dataset.reelFocus==='true')
 .map(node=>Number(node.dataset.reelOffset));
assert.deepEqual(selectedBorders(),[0],'only centered card is highlighted at rest');
const touchTarget={closest:sel=>sel==='.hero-options'?stage:null};
events.pointerdown({type:'pointerdown',button:0,pointerId:7,clientX:300,clientY:200,timeStamp:0,target:touchTarget});
events.pointermove({type:'pointermove',pointerId:7,clientX:240,clientY:200,timeStamp:160,target:touchTarget,preventDefault(){}});
assert.deepEqual(selectedBorders(),[],'no neighbor lights while moving between cards');
events.pointermove({type:'pointermove',pointerId:7,clientX:180,clientY:200,timeStamp:310,target:touchTarget,preventDefault(){}});
assert.deepEqual(selectedBorders(),[],'side slot at passing center cannot briefly turn lime');
events.pointerup({type:'pointerup',pointerId:7,clientX:180,clientY:200,timeStamp:340,target:touchTarget});
assert.equal(app.selectedHero,1,'release selects the next character');
assert.deepEqual(selectedBorders(),[0],'only final centered card regains its selected glow');
sources[0].click();
assert.deepEqual(selectedBorders(),[0],'other cards stay unlit after switching selection');
const identity=[...stage.children];
events.click({timeStamp:900,target:{closest:sel=>sel==='[data-step]'?{dataset:{step:'1'}}:null}});
assert.equal(app.selectedHero,1,'arrow advances selected hero');
assert.equal(at(0).dataset.reelHero,'1','center card synchronizes after selection');
assert(identity.every((node,i)=>stage.children[i]===node),'buttons never rebuild virtual cards');
const tapped=at(2);
events.click({timeStamp:1200,target:{closest:sel=>sel==='[data-step]'?null:sel==='[data-reel-hero],.hero-card'?tapped:null}});
assert.equal(app.selectedHero,0,'tapping second-right virtual card travels exactly two slots');
assert.equal(at(0).dataset.reelHero,'0','second-right tap resolves to focused survivor');
gameData.mechanic=true;
app.window.ZZRefreshHeroReel();
assert.equal(at(-2).dataset.reelHero,'2','newly recruited fourth survivor joins five-slot cycle');
assert.equal(at(2).dataset.reelHero,'2','four owned portraits still wrap naturally');
assert(css.includes('width:41%!important'),'main cards are genuinely tall portrait windows, not old 68%');
assert(css.includes('data-five-reel="true"'),'original button frames are hidden only while the five-slot menu is active');
assert(css.includes('#overlay[data-screen="results"] #heroes[data-five-reel="true"]'),'game-over selection uses the same real virtual cards');
assert(css.includes('position:absolute!important')&&css.includes('top:calc(3px * var(--ui-scale,1))!important'),
 'both arcade labels are pinned to the top edge');
assert(css.includes('width:min(94%,calc(360px * var(--ui-scale,1)))!important'),
 'original bitmap game logo enlarged');
assert(css.includes('background:transparent!important')&&css.includes('border:0!important'),
 'dock has no rectangular button backing');
assert(css.includes('assets/ui/main-dock.webp'),'approved original bitmap dock icons retained');
assert(/garage\.css\?v=(12-v244-five-portrait-dock|13-v245-clear-top-centered-icons|14-v248-complete-hero-cards|15-v254-gameover-reel)/.test(html)&&/garage-ui\.js\?v=(10-v244-five-portrait|11-v247-stable-border-focus|12-v248-complete-hero-cards|13-v254-gameover-reel)/.test(html));
assert(/v24[4-7]-(five-portrait-no-dock-box|clear-top-centered-icons|stable-border-focus)/.test(sw),'mobile PWA cache refreshed');
console.log('PASS v244: five mounted portrait windows, 3/4-owned wrap, arrows & second-card tap, unchanged game-over, larger top logo and boxless icon dock.');
