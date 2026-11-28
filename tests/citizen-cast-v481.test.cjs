'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');

function run(src,loader,assert){
 const section=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+1);assert(i>=0&&j>i);return src.slice(i,j)};
 const sheets=Array.from({length:18},(_,id)=>({id}));
 const window={ZZCitizenCast18:{ready:true,sheets,cell:128}};
 const g={drawImage:(...a)=>draws.push(a)};const draws=[];
 const f=new Function('window','g',section('function shuffleCitizenIdentities','function resetCitizens')+'\nlet clock=0;'+section('function citizenSpriteFrame','// Original crowd railing')+'\nreturn {shuffleCitizenIdentities,assignReturningCitizenIdentity,citizenSpriteFrame,drawCitizenBitmap,setClock:v=>clock=v}')(window,g);
 const crowd=Array.from({length:18},(_,identity)=>({identity,phase:0,alive:true,dying:0}));
 for(let n=0;n<100;n++){
  f.shuffleCitizenIdentities(crowd);assert(new Set(crowd.map(p=>p.identity)).size===18);
  crowd[0].alive=false;crowd[1].alive=false;crowd[1].dying=.4;
  assert(f.assignReturningCitizenIdentity(crowd[0],crowd));crowd[0].alive=true;
  assert(new Set(crowd.map(p=>p.identity)).size===18);crowd[1].alive=true;crowd[1].dying=0;
 }
 for(const p of crowd){assert(f.drawCitizenBitmap(p,100,100,false));assert(draws.at(-1)[0]===sheets[p.identity]);assert(draws.at(-1)[2]===0);}
 const p=crowd[0];f.setClock(1);assert(f.citizenSpriteFrame(p,false).frame===5);
 p.supportTime=.31;assert(f.citizenSpriteFrame(p,false).row===1);assert(f.citizenSpriteFrame(p,false).frame===4);
 p.alive=false;p.dying=.4;assert(f.citizenSpriteFrame(p,false).row===2);assert(f.citizenSpriteFrame(p,false).frame===4);
 const pending=[],w={};class Img{set src(v){this.url=v;pending.push(this)}}
 new Function('window','Image',loader)(w,Img);
 const requests=[];
 while(pending.length){const im=pending.shift();requests.push(im.url);im.naturalWidth=im.url.includes('citizens-v480')?1024:1024;im.naturalHeight=im.url.includes('citizens-v480')?384:512;im.onload();}
 assert(w.ZZCitizenCast18.ready&&w.ZZCitizenCast18.sheets.length===18);
 assert(new Set(requests.filter(x=>x.includes('citizens-v480'))).size===18);
}

const src=fs.readFileSync('dist/game.js','utf8'),loader=fs.readFileSync('dist/assets/ip/citizen-cast-v41.js','utf8');
for(let i=1;i<=18;i++){
 const b=fs.readFileSync('dist/assets/ip/citizens-v480/citizen-'+String(i).padStart(2,'0')+'.webp');
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
 assert.equal(b.toString('ascii',12,16),'VP8X');assert(b[20]&16);
 assert.equal(b.readUIntLE(24,3)+1,1024);assert.equal(b.readUIntLE(27,3)+1,384);
}
run(src,loader,assert);console.log('PASS v481: 18 transparent atlases, unique identities, three 8-frame states, loader');
