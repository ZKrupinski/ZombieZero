'use strict';
// v95: both current front-facing green death strips are independently sliced,
// correctly alpha-coded and use the live body's palette, timing and foot pivot.
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const root='dist/assets/ip/';
const source=fs.readFileSync(root+'green-death-loader.js','utf8');
for(const kind of ['normal','critical']){
 const buf=fs.readFileSync(root+'green-death-'+kind+'-v95.png');
 assert(buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'real PNG '+kind);
 assert.equal(buf.readUInt32BE(16),768,'8 x 96px frame columns '+kind);
 assert.equal(buf.readUInt32BE(20),128,'padded frame height '+kind);
 assert(buf.includes(Buffer.from('tRNS'))||buf.includes(Buffer.from('RGBA')),
   'transparent palette data '+kind);
}
assert(source.includes("image.src='assets/ip/green-death.png'"),'fallback kept');
assert(source.includes("part.image.src='assets/ip/green-death-'+kind+'-v95.png'"),'both image paths');
assert(source.includes("window.ZZGreenWalk.draw(ctx,z,0)"),'live-to-death silhouette crossfade');
assert(source.includes('palette?.paletteFor(z)??0'),'both use identical palette selection');
assert(source.includes('f*96,0,96,128'),'correct frame boundaries / no bleeding');
assert(source.includes('width=100*scale'),'wide explosion display area');
assert(source.includes('height*(657/800)'),'pivot aligned to living sprite feet');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(sw.includes('zombie-zero-shell-v93-multiball-light-cache-v94-no-dark-shadow-v95-front-death-8f'),'new service-worker cache preserves older cache contract');
assert(sw.includes('./assets/ip/green-death-normal-v95.png'));
assert(sw.includes('./assets/ip/green-death-critical-v95.png'));
assert(fs.readFileSync('dist/index.html','utf8').includes('green-death-loader.js?v=95-front-death-8f'));
const paletteSrc=fs.readFileSync(root+'v2/green-palette.js','utf8');
const paletteEnv={window:{},console};vm.createContext(paletteEnv);vm.runInContext(paletteSrc,paletteEnv);
const palette=paletteEnv.window.ZZGreenPalette;
const images=[];
class Img {
 constructor(){this.decoding='async';images.push(this);this.naturalWidth=0;this.naturalHeight=0}
 set src(s){this._src=s;const modern=s.includes('-v95.png');this.naturalWidth=modern?768:480;
 this.naturalHeight=modern?128:96;this.onload?.()}
 get src(){return this._src}
}
class Canvas{constructor(){this.width=0;this.height=0}getContext(){return{
 drawImage(){},getImageData(){return{data:new Uint8ClampedArray(8)}},
 createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
 putImageData(){}}}}
const env={window:{ZZGreenPalette:palette,ZZGreenWalk:{ready:true,draw(){calls.push('living')}}},
 Image:Img,document:{createElement:()=>new Canvas(),readyState:'loading',addEventListener(){}},console};
const calls=[];
// The palette helper is defined in the browser realm, so give that realm
// the same document before constructing cached tinted atlas canvases.
paletteEnv.document=env.document;
vm.createContext(env);vm.runInContext(source,env);
const pack=env.window.ZZGreenDeath;assert(pack.ready);
assert(pack.remaster.normal.ready&&pack.remaster.critical.ready,'both sheets actually loaded');
assert.equal(pack.remaster.normal.variants.length,5,'five normal palette atlas variants cached');
assert.equal(pack.remaster.critical.variants.length,5,'five critical palette atlas variants cached');
const paint={globalAlpha:1,save(){},restore(){},drawImage(img,...args){calls.push({img,args})}};
const z={form:0,paletteVariant:4,seed:12,x:150,y:160,w:33,h:44};
assert(pack.draw(paint,z,false,.3));let p=calls.pop();
assert.equal(p.img,pack.remaster.normal.variants[4],'normal death uses purple tinted asset');
assert.deepEqual(p.args.slice(0,4),[4*96,0,96,128],'normal slicing frame 4');
assert(p.args[6]>p.args[4]*0,'explosion width positive');
assert(pack.draw(paint,z,true,.35));p=calls.pop();
assert.equal(p.img,pack.remaster.critical.variants[4],'critical death uses same purple variant');
assert.deepEqual(p.args.slice(0,4),[4*96,0,96,128],'critical slicing frame 4');
z.paletteVariant=2;pack.draw(paint,z,true,.35);p=calls.pop();
assert.equal(p.img,pack.remaster.critical.variants[2],'mint death matches mint living body');
calls.length=0;pack.draw(paint,z,false,0);
assert(calls.includes('living'),'first frame crossfades live body instead of snapping');
const last=calls.at(-1);assert.equal(last.img,pack.remaster.normal.variants[2]);
console.log('PASS: two independent 8-frame padded PNGs, transparent colors, 5 stable palettes, frame geometry, live-to-death crossfade, fallbacks.');
