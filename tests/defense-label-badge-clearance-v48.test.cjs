'use strict';
/* v49 regression: remove redundant defense dashes and caption; preserve
 * the real collision boundary and shield behavior. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const code=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const between=(a,b)=>{const x=code.indexOf(a),y=code.indexOf(b,x+a.length);assert(x>=0&&y>x,a+' -> '+b);return code.slice(x,y)};
const fallback=between('function proceduralBackground(){','const STAGE_ART_COUNT=18');
const bitmap=between('function background(){','function player(){');
for(const [name,body] of [['procedural',fallback],['bitmap',bitmap]]){
 assert(!body.includes('DEFENSE LINE / 넘기면 끝!'),name+' removes defense caption');
 assert(!body.includes('setLineDash('),name+' no duplicated CSS/Canvas dash path');
 assert(!body.includes('g.moveTo(23,DEFENSE_Y)'),name+' no duplicate line across the road');
}
assert(code.includes('z.y+z.h>=DEFENSE_Y'),'actual zombie breach collision remains intact');
assert(code.includes('const SHIELD_LINE_Y=H-58'),'protective shield remains physically unchanged');
assert(code.includes("rect(21,SHIELD_LINE_Y,408,3,'#b9f684')"),'shield light and rendering remain intact');
const icons=between('function drawActiveItemIcons(){','function drawIcon(');
assert(icons.includes('const y=SHIELD_LINE_Y-15+VIEW_DELTA;'),'equipped icons lifted 12px to sit directly under wheels');
assert(icons.includes('const size=22,step=24;'),'approved icon size and spacing retained');
assert(icons.includes('g.arc(x,y,12.2'),'remaining duration ring retained');
const iconBottom=652-15+12.2+.7;
assert(iconBottom<652-2,'the 12.2px arc plus stroke does not touch shield Y=652');
const draw=between('function draw(){','function frame(');
const player=draw.indexOf('player();');
const bloom=draw.indexOf('fxRenderer.composite(g);');
const iconDraw=draw.indexOf('drawActiveItemIcons();');
assert(player>=0&&bloom>player&&iconDraw>bloom,'icons render last, above shield and bloom FX');
assert.equal(draw.split('drawActiveItemIcons();').length-1,1,'only one final icon pass');
assert(html.includes('src="game.js?v=71-boss-open-space"'),'new gameplay script bypasses old cache');
assert(sw.includes('zombie-zero-shell-v71-boss-open-space'),'PWA shell invalidated');
console.log('PASS: duplicate defense dashes removed in both paths, collision/text intact, equipped icons clear shield Bloom.');
