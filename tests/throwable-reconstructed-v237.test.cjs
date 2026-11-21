'use strict';
// The Pages build generates this 1536×1536 sprite atlas BEFORE tests run.
// Verify that all 36 frames exist and the user's eight approved images are
// byte-for-byte unchanged in the centered area.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {decodePNG,GOOD,FLAGS}=require('../tools/rebuild-throwables-atlas-v237.cjs');
const oldPath='dist/assets/ip/v2/throwables-36-v159.png',newPath='dist/assets/ip/v2/throwables-36-v237.png';
assert(fs.existsSync(newPath),'rebuilt 6x6 projectile atlas must be produced before tests');
const oldPNG=fs.readFileSync(oldPath);
assert.equal(crypto.createHash('sha256').update(oldPNG).digest('hex'),
 '703d45a500d2fa00e589e4d1be87477a8d06e38d44fca235d744aeccc61bac5a',
 'original approved PNG has not been edited or recompressed');
const old=decodePNG(oldPath,1024),latest=decodePNG(newPath,1536);
assert.equal(latest.length,1536*1536*4,'new atlas is square, with 256px integer frame cells');
assert.equal(Object.keys(FLAGS).length,28,'the exact 28 user-reported items are targeted');
assert.equal(GOOD.size,8,'the other eight items are protected');
for(const id of GOOD){
 const col=id%6,row=Math.floor(id/6),start=Math.round(row*1024/6),end=Math.round((row+1)*1024/6);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const offset=((row*256+y)*1536+col*256+x)*4;
  const source=(y>=43&&y<43+end-start)?((start+y-43)*1536+col*256+x)*4:-1;
  for(let k=0;k<4;k++)assert.equal(latest[offset+k],source>=0?old[source+k]:0,
    'unchanged frame '+(id+1)+' has a modified pixel at '+x+','+y);
 }
}
const report=JSON.parse(fs.readFileSync('dist/assets/ip/v2/throwables-36-v237-report.json','utf8'));
assert.equal(report.stats.length,36);
const recovered=report.stats.filter(s=>!!FLAGS[s.slot]&&s.restored>0);
assert(recovered.length>=8,'seam analysis must actually restore source pixels across several user-reported items');
assert(report.nonlocalPixelCandidates>500,'rebuild must detect real cross-frame overlaps in original contact sheet');
const html=fs.readFileSync('dist/index.html','utf8'),qa=fs.readFileSync('dist/throwable-qa.html','utf8');
assert(html.includes('throwables-v237.js?v=237-reconstructed-36-frames'),'game loads rebuilt atlas renderer');
assert(qa.includes('throwables-v237.js?v=237-reconstructed-36-frames'),'QA compares original with rebuilt artwork');
const loader=fs.readFileSync('dist/assets/ip/v2/throwables-v237.js','utf8');
assert(loader.includes("throwables-36-v237.png"),'new runtime draws actual rebuilt artwork');
console.log('PASS v237: new 36-sprite atlas, eight approved cells exactly retained, 28 user issues targeted, cross-seam pixels reassigned in '+recovered.length+' cells');
