'use strict';
// v82: power-up ball is precisely 1.5× the normal bitmap and collision size.
// No new sprite sheets, outsized aura triangles, or synchronized knockbacks.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert.equal(game.split("has('power')?12:8").length-1,2,'physics and display both use radius 12, not 16');
assert(!game.includes("has('power')?16:8"),'old powered radius 16 removed');
assert(game.includes("if(r>8){sx=clamp(sx,.94,1);sy=clamp(sy,.94,1)}"),
 'powered ball sprite may squash inward but never stretch beyond 1.5x');
assert(game.includes('const CHAIN_KNOCK_STEP=.14,CHAIN_HIT_FREEZE=.125;'),
 'each successive chained target reacts 140 ms later');
const grab=(from,to)=>{
 const a=game.indexOf(from),b=game.indexOf(to,a+from.length);
 assert(a>=0&&b>a,'missing source region '+from);
 return game.slice(a,b);
};
const drawSprite=grab('function drawHeroBallSprite(b,r,col){','// Hit reaction stays attached');
const calls=[];
const g={save(){},restore(){},translate(){},rotate(){},scale(){},
 drawImage(...args){calls.push(args)}};
const source=drawSprite+'\n;drawHeroBallSprite({x:100,y:200},8);drawHeroBallSprite({x:100,y:200},12);';
const context={g,window:{ZZHeroBallsV58:{images:[{naturalWidth:1774,naturalHeight:887}],ready:[true]}},
 selectedHero:0,ballSpritePose:()=>({rotation:0,sx:1,sy:1,spin:0}),Math};
vm.runInNewContext(source,context);
assert.equal(calls.length,2,'normal and powered bitmap both rendered');
const normal=calls[0][7],powered=calls[1][7];
assert(Math.abs(powered/normal-1.5)<1e-10,'powered bitmap draw diameter exactly 1.5x normal');
const aura=grab('function drawBallStateAura(b,r){','// A few bright shards');
const trail=grab('function drawBallSkillTrail(b,r,path=buildBallTrailPath(b,r)){','// V76: per-ball rotational inertia');
assert(aura.includes('createRadialGradient'),'soft, close-range layered aura');
assert(!aura.includes('fillRect(')&&!trail.includes('fillRect('),
 'coarse rectangle particles no longer enlarge the ball silhouette');
assert(trail.includes('g.arc('),'small light motes instead of large square chips');
assert(html.includes('game.js?v=90-continuous-soft-trails'),'new gameplay cache bypass');
assert(sw.includes('zombie-zero-shell-v90-continuous-soft-trails'),'new PWA cache bypass');
console.log('PASS: bitmap exactly 1.5x, physics 1.5x, no outward stretch, refined FX, slower chain ripple.');
