'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const window={};vm.runInNewContext(fs.readFileSync(__dirname+'/native-performance.js','utf8'),{window});
const p=window.ZZNativePerf;
const dimensions=()=>Array.from(Object.values(p.backingSize(475,475*710/450,3)));
assert.deepEqual(dimensions(),[1080,1704]);
assert.equal(p.backingSize(390,615.333,2).width,780);
const slow={fps:30,workMs:25,updateMs:5,drawMs:20},fast={fps:60,workMs:9,updateMs:3,drawMs:6};
let t=0;function frames(n,s,mode='playing',dt=1/30){for(let i=0;i<n;i++){t+=dt*1000;p.observe(t,dt,s,mode,{},null)}}
frames(100,slow,'menu');assert.equal(p.tier,0);
frames(30,slow);assert.equal(p.tier,0,'isolated/short slowdown ignored');
frames(20,slow);assert.equal(p.tier,1);assert(p.takeResize());assert(!p.takeResize());assert.equal(dimensions()[0],918);
frames(50,slow);assert.equal(p.tier,2);assert.equal(dimensions()[0],778);
assert.equal(p.backingSize(300,473.333,2).width,600,'small devices never forced larger or smaller');
assert.equal(p.backingSize(390,615.333,2).width,720);
frames(500,fast,'playing',1/60);assert.equal(p.tier,2,'no quick oscillation');
frames(450,fast,'playing',1/60);assert.equal(p.tier,1);
console.log('PASS: native resolution budget, slow hysteresis, stable world aspect and no menu adaptation');
