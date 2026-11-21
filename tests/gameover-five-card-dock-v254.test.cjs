'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ui=fs.readFileSync('dist/garage-ui.js','utf8');
const css=fs.readFileSync('dist/garage.css','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const results={dataset:{screen:'results'}};
const sources=['에이스','루비','리아','정비사'].map((name,i)=>({
 id:'hero-'+i,dataset:{},innerHTML:'<span class="hero-vehicle-portrait row-'+i+'"></span><b>'+name+'</b><div class="hero-mini-stats">gear bonus</div>',
 textContent:name,style:{},setAttribute(){},querySelector(sel){
  if(sel==='.hero-vehicle-portrait')return{outerHTML:'<span class="hero-vehicle-portrait row-'+i+'"></span>'};
  if(sel==='.hero-mini-stats')return{outerHTML:'<div class="hero-mini-stats">gear bonus '+i+'</div>'};
  return null;
 },click(){app.selectedHero=i;app.window.ZZRefreshHeroReel?.()}
}));
class Node{
 constructor(){this.dataset={};this.style={};this.children=[];this.clientWidth=450;this.parentNode=null;this.innerHTML='';}
 appendChild(node){this.children.push(node);node.parentNode=this;return node}
 setAttribute(key,val){this[key]=val}
 querySelectorAll(sel){
  if(sel==='.hero-reel-proxy')return this.children.filter(x=>x.className==='hero-card hero-reel-proxy');
  if(sel==='.hero-card:not(.hero-reel-proxy)')return sources;
  return [];
 }
}
const stage=new Node(),heroes=new Node(),empty=new Node(),events={};
heroes.querySelector=s=>s==='.hero-options'?stage:null;
heroes.addEventListener=(event,callback)=>{events[event]=callback};
heroes.setPointerCapture=()=>{};
empty.querySelector=()=>null;empty.addEventListener=()=>{};
const el=id=>id==='overlay'?results:id==='heroes'?heroes:id.startsWith('hero-')?sources[Number(id.slice(5))]:empty;
const data={mechanic:false,levels:{},loads:[{},{},{},{}],xp:[0,0,0,0]};
const app={
 window:{ZZGarage:{parts:[{id:'grip',slot:0,name:'Grip'}],value:()=>10},ZZProgression:{garage:()=>data,chips:()=>0}},
 HEROES:sources.map((s,i)=>({name:s.textContent,role:['안정형','기동형','공격형','지원형'][i]})),
 mode:'over',selectedHero:0,$:el,document:{createElement:()=>new Node()},
 cancelAnimationFrame(){},console,Math,Number,Array
};
vm.createContext(app);vm.runInContext(ui,app);
assert.equal(heroes.dataset.fiveReel,'true','result screen mounts the same virtual wheel as title');
const slot=offset=>stage.children.find(n=>Number(n.dataset.reelOffset)===offset);
assert.equal(stage.children.length,7,'5 visible hero cards plus two buffer slots');
for(let offset=-2;offset<=2;offset++){
 const item=slot(offset);
 assert(item,'game-over carousel includes offset '+offset);
 assert(Number(item.style.opacity)>.01,'side card not blank / hidden '+offset);
 assert(item.innerHTML.includes('hero-reel-artwork')&&item.innerHTML.includes('hero-reel-bottom'),
  'full car portrait and stats in slot '+offset);
 assert(item.innerHTML.includes('hero-vehicle-portrait'),
  'existing approved hero bitmap preserved in slot '+offset);
 assert(item.innerHTML.includes('hero-mini-stats'),'all selectable result cards show stats '+offset);
}
assert.equal(slot(0).dataset.reelHero,'0','first selected survivor centered');
const focus=()=>stage.children.filter(x=>x.dataset.reelFocus==='true').map(x=>Number(x.dataset.reelOffset));
assert.deepEqual(focus(),[0],'only settled center glows');
events.click({timeStamp:1200,target:{closest:selector=>selector==='[data-step]'?{dataset:{step:'1'}}:null}});
assert.equal(app.selectedHero,1,'game-over arrow selects a different survivor');
assert.equal(slot(0).dataset.reelHero,'1','center result card updates after arrow');
events.click({timeStamp:1800,target:{closest:selector=>selector==='[data-step]'?null:selector==='[data-reel-hero],.hero-card'?slot(2):null}});
assert.equal(app.selectedHero,0,'tapping second-right card updates survivor by two slots');
assert.equal(slot(0).dataset.reelHero,'0','tapped survivor centers');
const touchTarget={closest:selector=>selector==='.hero-options'?stage:null};
events.pointerdown({type:'pointerdown',button:0,pointerId:10,clientX:260,clientY:150,timeStamp:2000,target:touchTarget});
events.pointermove({type:'pointermove',pointerId:10,clientX:200,clientY:150,timeStamp:2100,preventDefault(){},target:touchTarget});
assert.equal(focus().length,0,'swipe does not flash neighboring card outlines');
events.pointerup({type:'pointerup',pointerId:10,clientX:200,clientY:150,timeStamp:2130,target:touchTarget});
assert.equal(app.selectedHero,1,'dragging on game-over screen selects the next survivor');
assert.deepEqual(focus(),[0],'new central result card alone regains focus');
data.mechanic=true;app.window.ZZRefreshHeroReel();
assert(slot(-2).innerHTML.includes('hero-reel-id'),'recruited mechanic is eligible for full result card');
assert(ui.includes("const heroScreen=()=>['selection','results'].includes("),'both title and results paint the same five-card layout');
assert(game.includes("if(mode==='menu'||mode==='over')el.innerHTML+=heroMiniStats(h)"),
 'game over cards refresh their real equipped stats');
assert(game.includes("if(['GAME OVER','VICTORY'].includes(label)){")&&
 game.includes("window.ZZRefreshHeroReel?.()"),'both game over and victory refresh the reel when visible');
assert(game.includes("start(mode==='over'?runMode:'campaign')"),
 'TRY AGAIN uses newly selected survivor while preserving normal/endless mode');
assert(css.includes('/* v254 — GAME OVER: the same five full hero cards as the title.'),
 'game-over uses the same real card presentation');
assert(css.includes('#overlay[data-screen="results"] #heroes[data-five-reel="true"] .hero-options'),
 'v254 result card specificity outranks old hidden/blank carousel rules');
assert(css.includes('> .hero-card:not(.hero-reel-proxy){\n display:none!important;'),
 'obsolete result buttons are hidden behind live five card proxies');
assert(css.includes('> .hero-card.hero-reel-proxy:not([hidden]){\n box-sizing:border-box!important;\n display:flex!important;'),
 'real full game-over cards override the old hide rule');
assert(css.includes('/* v254 result dock = title dock:'),
 'result dock uses title visual system');
const dock=css.slice(css.indexOf('/* v254 result dock = title dock:'));
assert(dock.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),
 'garage, radio and upgrade results buttons are a compact row');
assert(dock.includes('width:min(79%,calc(310px * var(--ui-scale,1)))'),
 'result icon trio is horizontally centered');
assert(dock.includes('column-gap:calc(2px * var(--ui-scale,1))'),
 'spacing matches the title icon row');
assert(dock.includes('background:transparent!important')&&dock.includes('border:0!important'),
 'result buttons have no rectangular background plates');
assert(dock.includes('assets/ui/main-dock.webp'),
 'approved large raster menu icons reused without re-illustrating');
assert(html.includes('garage.css?v=15-v254-gameover-reel')&&
 html.includes('garage-ui.js?v=13-v254-gameover-reel')&&
 html.includes('v254-results-five-card-refresh'),'updated CSS and both JS files loaded');
assert(sw.includes('v254-results-five-card-reel'),'installed PWA receives new assets');
console.log('PASS v254: Game over and victory have full five-hero carousel, drag, arrows, tap, stats, retry selected character, and centered title-style icon dock.');
