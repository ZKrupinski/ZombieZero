'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const prefix=path.resolve(__dirname,'../dist');
const png=fs.readFileSync(path.join(prefix,'assets/ip/zombie-zero-bi-v75.png'));
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','real approved PNG, not vector or data placeholder');
assert.equal(png.readUInt32BE(16),1495,'approved logo width after alpha-only trim');
assert.equal(png.readUInt32BE(20),926,'approved logo height after alpha-only trim');
assert.equal(png[25],3,'lossless indexed transparent PNG is used as the BI asset');
assert(png.includes(Buffer.from('tRNS')),'alpha transparency maintained');
assert.equal(crypto.createHash('sha256').update(png).digest('hex'),
 '987e90e281a92e51a4faa5a50534021e5986c3ccffebaeff34b7184f6093f78e',
 'logo pixels match the approved exported bitmap');
const oldAlias=fs.readFileSync(path.join(prefix,'zombie-balls-bi.png'));
assert(oldAlias.equals(png),'legacy BI path resolves to the newly approved artwork');
const html=fs.readFileSync(path.join(prefix,'index.html'),'utf8');
const css=fs.readFileSync(path.join(prefix,'style.css'),'utf8');
const sw=fs.readFileSync(path.join(prefix,'sw.js'),'utf8');
const file='assets/ip/zombie-zero-bi-v75.png';
assert.equal((html.match(new RegExp('src="'+file+'"','g'))||[]).length,3,
 'desktop masthead, hero selection and title attract screen all use this BI');
assert(html.includes('class="game-logo zz-brand-image"'));
assert(html.includes('class="overlay-logo zz-brand-image"'));
assert(html.includes('class="boot-logo-image zz-brand-image"'));
assert(html.includes('alt="ZOMBIE ZERO"'),'accessible logo label retained');
assert(!html.includes('class="zero-title"'),'old text-based BI completely removed');
assert(!html.includes('class="boot-logo"'),'old CSS-built first-screen BI completely removed');
assert(html.includes('id="boot-start"')&&html.includes('GAME START'),'start UX unchanged');
assert(html.includes('style.css?v=78-responsive-layout'),'updated title styles loaded');
assert(css.includes('.boot-content>.boot-logo-image')&&css.includes('image-rendering:auto!important'),
 'approved graphic is sharp and responsive without pixelation or glowing border');
assert(css.includes('max-height:min(35svh,260px)'),'small mobile title view keeps game button visible');
assert(sw.includes('zombie-zero-shell-v79-speech-tail-skill-auras'),'offline cache version refreshed');
assert(sw.includes("'./"+file+"'"),'approved title asset precached');
console.log('PASS: approved transparent Zombie Zero BI replaces desktop, hero selection and startup logo, alpha/pixels/size/PWA validated');
