'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/game.js','utf8');
const section=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)+a.length));
const env={fxEnabled:true,has:()=>false,clock:0,selectedHero:0,balls:[{}],calls:[],sampleBallTrail:(p,d)=>({x:200-d,y:100}),drawProjectedLightSpill:(...a)=>env.calls.push(a)};
vm.createContext(env);vm.runInContext(section('const TRAIL_GROUND_HERO_COLORS=','// V89:'),env);
let geometry;
for(let hero=0;hero<5;hero++){
 env.selectedHero=hero;env.calls=[];
 vm.runInContext('drawTrailGroundReflections({held:false},8,[{x:200,y:100,s:0},{x:30,y:100,s:170}])',env);
 const current=JSON.stringify(env.calls.map(v=>[v[0],v[1],v[2],...v.slice(4)]));
 if(hero===0)geometry=current;else{assert.equal(current,geometry);assert.notDeepEqual(env.calls[0][3],env.calls.at(-1)[3]);}
}
assert(src.includes('g.save();g.globalAlpha=1;g.fillStyle=grad||col.main'));
assert(src.includes('if(fxEnabled)luminous(()=>drawTrailEdgeHalo'));
assert(!src.includes('selectedHero===4?.42:1'));
console.log('PASS v402: every hero uses identical basic wake density, opacity, geometry and halo, with distinct head color.');
