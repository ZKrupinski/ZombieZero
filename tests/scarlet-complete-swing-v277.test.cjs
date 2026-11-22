'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/garage.css','utf8');
const ui=fs.readFileSync('dist/garage-ui.js','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const expected=[
 ['scarlet-idle-v278.webp',768,384],
 ['scarlet-attack-v280.webp',768,384],
 ['scarlet-portrait-v277.webp',256,256]
];
for(const [file,width,height] of expected){
 const p='dist/assets/ip/'+file,buf=fs.readFileSync(p);
 assert(buf.length>19000,file+' contains authored bitmap pixels');
 assert.equal(buf.toString('ascii',0,4),'RIFF');
 assert.equal(buf.toString('ascii',8,12),'WEBP');
 if(file==='scarlet-idle-v278.webp'||file==='scarlet-attack-v280.webp'){
  assert.equal(buf.toString('ascii',12,16),'VP8L','lossless WebP prevents white fringes');
  const packed=buf.readUInt32LE(21);
  assert.equal((packed&0x3fff)+1,width);
  assert.equal(((packed>>>14)&0x3fff)+1,height);
  assert((packed>>>28)&1,'lossless alpha preserved');
 }else{
  assert.equal(buf.toString('ascii',12,16),'VP8X');
  assert(buf[20]&16,file+' preserves transparency');
  assert.equal(buf[24]+(buf[25]<<8)+(buf[26]<<16)+1,width);
  assert.equal(buf[27]+(buf[28]<<8)+(buf[29]<<16)+1,height);
 }
 assert(html.includes('src="assets/ip/'+file+'"'),file+' actively loaded');
 assert(sw.includes("'./assets/ip/"+file+"'"),file+' PWA pre-cached');
}
assert(game.includes('if(i===4)return \'<img class="hero-portrait hero-vehicle-portrait hero-vehicle-scarlet'),
 'Scarlet portrait is a real <img>, never animated CSS background cropping');
assert(game.includes('const sheet=$(attacking?\'scarlet-attack\':\'scarlet-idle\')'),
 'game draws entire authored 192px attack frames with all limbs, not a loose bag');
assert(css.includes('/* v277: Scarlet is a true image, NEVER a background atlas.'),
 'targeted CSS disables old atlas animation');
assert(css.includes('>img.hero-vehicle-scarlet')&&css.includes('object-fit:contain!important')&&css.includes('background-image:none!important'),
 'both title and game-over cards show the whole portrait without zoom');
assert(ui.includes('scarlet-portrait-v277.webp'),
 'garage and radio use the same corrected portrait');
assert(html.includes('v277-complete-swing-portrait-fix')&&sw.includes('v277-complete-swing-portrait-fix'),
 'mobile cache invalidated for final image replacement');
console.log('PASS v277: full-body handbag swing, real portrait image, 192px atlases, no old zoom/atlas cache');
