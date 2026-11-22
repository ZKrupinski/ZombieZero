'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const files={
 garage:fs.readFileSync('dist/garage.js','utf8'),
 game:fs.readFileSync('dist/game.js','utf8'),
 ui:fs.readFileSync('dist/garage-ui.js','utf8'),
 css:fs.readFileSync('dist/garage.css','utf8'),
 html:fs.readFileSync('dist/index.html','utf8'),
 sw:fs.readFileSync('dist/sw.js','utf8')
};
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(files.garage,ctx);
const system=ctx.window.ZZGarage,h={name:'에이스',speed:500,damage:1,lives:3,paddle:68};
const data=system.blank(),progression={level:id=>id==='sweetSpot'?2:0};
const stats=()=>system.heroStats(h,data,progression,0);
let rows=stats();
assert.equal(rows[0].base,500);
assert.equal(rows[0].bonus,0,'unequipped stat has no illusory growth');
assert.equal(rows[1].name,'공격','garage core attack is shown separately from special first-hit damage');
assert.equal(rows[1].bonus,0);
assert.equal(rows[2].base,3);
assert.equal(rows[2].bonus,0);
assert.equal(rows[3].bonus,4,'permanent sweet-spot stat is included in actual defense range');
const emptyMarkup=system.heroStatMarkup(h,data,{level:()=>0},0);
assert.equal((emptyMarkup.match(/hero-stat-cell /g)||[]).length,60,'12 segmented slots for each of five categories including resistance');
assert(!emptyMarkup.includes('hero-mini-bonus active'),'no upgrade bars for unequipped clean hero');
data.levels.steer=0;data.loads[0][2]='steer';
data.levels.heavy=3;data.loads[0][1]='heavy';
data.levels.wide=3;data.loads[0][0]='wide';
rows=stats();
assert.equal(rows[0].bonus,40,'base +8% car speed uses real gear level');
assert(Math.abs(rows[1].bonus-.095)<.00001,'heavy adds +9.5% permanent damage; +38% first hit remains unique');
assert.equal(rows[2].bonus,0,'heart health does not falsely improve from weapons');
assert.equal(rows[3].bonus,22,'wide +10px, passive guard +5px, steering guard +3px and sweet +4px');
let markup=system.heroStatMarkup(h,data,progression,0);
assert(markup.includes('hero-stat-cell boost'),'equipped bonuses use golden segment color');
assert(markup.includes('hero-mini-bonus active'),'equipped upgrades show numeric boost');
assert(markup.includes('>+40<')&&markup.includes('>+0.10<')&&markup.includes('>+22<'),'permanent stat boosts and unique effects appear separately');
data.levels.steer=5;
assert.equal(stats()[0].bonus,90,'upgrading the same equipped car gear updates speed instantly');
data.loads[0][2]='filter';
assert.equal(stats()[0].bonus,0,'unequipped steer module never affects hero speed');
const other=system.heroStats(h,data,progression,1);
assert.equal(other[0].bonus,0,'garage character selection uses individual gear loadouts');
assert(files.ui.includes('system.heroStatMarkup?.(HEROES[h],data,progress,h)'),'garage readout uses exactly the same stat renderer');
assert(files.ui.includes("['equip','upgrade','craft'].includes(action))renderHeroes()"),'garage actions refresh main stats');
assert(files.ui.includes("숙련 Lv.'+rank"),'proficiency no longer promises an inappropriate character recolor');
assert(files.css.includes('order:-5!important')&&files.css.includes('order:-4!important')&&files.css.includes('order:-3!important'),
 'eyebrow and compact slogan sit above enlarged original bitmap logo');
assert(files.css.includes('flex:0 0 30%!important')&&files.css.includes('height:30%!important'),
 'hero reel height is about two-thirds of its previous screenshot');
assert(files.css.includes('height:calc(77px * var(--ui-scale,1))!important'),
 'three menu icon buttons are taller');
assert(files.html.includes('<small id="hint" hidden aria-hidden="true"></small>'),'bottom touch instruction removed');
assert(files.css.includes('12-cell gauges')&&files.css.includes('.hero-stat-cell.boost'),
 'base and upgrade segments are visually distinguishable');
assert(/garage\.css\?v=(11-v243-compact-dock-stats|12-v244-five-portrait-dock|13-v245-clear-top-centered-icons|14-v248-complete-hero-cards|15-v254-gameover-reel)/.test(files.html)&&
 files.html.includes('garage.js?v=4-v243-real-bonus-stats')&&
 /garage-ui\.js\?v=(9-v243-garage-stats|10-v244-five-portrait|11-v247-stable-border-focus|12-v248-complete-hero-cards|13-v254-gameover-reel)/.test(files.html),
 'all updated assets cache-busted');
assert(/v24[3-5]-(layout-stats-dock|five-portrait-no-dock-box|clear-top-centered-icons)/.test(files.sw),'offline cache invalidated');
console.log('PASS v243: 9:16 arcade hierarchy, 30% reel, tall dock, 12-cell true base+upgrade stats shared by garage/menu.');
