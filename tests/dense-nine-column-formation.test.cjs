'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},els={};
const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',hidden:false,style:{},
 addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}};
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{addEventListener:noop},localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/game.js','utf8')+`
function verify(ok,message){if(!ok)throw Error(message)}
{
 // Stage 1: the entire road is filled with exactly nine visually adjacent lanes.
 wave=1;rack();
 verify(foes.length===27,'three full rows * nine columns at stage one');
 verify(ZOMBIE_COLUMNS===9&&ZOMBIE_COLUMN_STEP===45,'nine 45px pitch lanes');
 for(let row=0;row<3;row++){
  const line=foes.filter(z=>z.row===row).sort((a,b)=>a.x-b.x);
  verify(line.length===9,'nine enemies in row '+row);
  verify(line[0].x===29&&line[8].x===389,'edge lanes fill whole road');
  verify(line[0].x>=20&&line[8].x+line[8].w<=430,'collision boxes within road');
  for(let i=1;i<line.length;i++){
   verify(line[i].lane===i,'stable lane id');
   verify(line[i].x-line[i-1].x===45,'tight equal lane pitch');
   verify(line[i].x>line[i-1].x+line[i-1].w,'hitboxes remain distinct');
  }
 }
 const before=foes.map(z=>({z,y:z.y}));march(.1);
 verify(before.every(({z,y})=>z.y>y),'adjacent sprites DO NOT freeze vertical movement');

 // From stage two, the diagonal animations still correspond to actual drift.
 wave=2;rack();const prior=foes.map(z=>({z,y:z.y,x:z.x}));
 march(.25);
 verify(prior.every(({z,y})=>z.y>y),'all close-packed lanes advance when walking diagonally');
 verify(prior.some(({z,x})=>Math.abs(z.x-x)>.01),'diagonal lane wandering retained');
 verify(foes.every(z=>z.x>=8&&z.x+z.w<=W-8),'movement stays inside road');

 // Stage 3: boss clears a central 3-column corridor in first two rows.
 wave=3;rack();
 const boss=foes.find(z=>z.boss);
 verify(!!boss&&boss.x===192&&boss.w===66,'boss original collision intact');
 verify(foes.length===4*9-6+1,'same stage shape, nine columns and clear boss area');
 for(const z of foes.filter(z=>!z.boss&&z.row<2))
  verify(z.lane<3||z.lane>5,'boss front-zone corridor protected');
 const beforeBoss=foes.map(z=>({z,y:z.y}));march(.15);
 verify(beforeBoss.every(({z,y})=>z.y>=y),'all boss-stage enemies move forward or wait, never jump');

 // On the maximum formation, more columns do not change a zombie's hitbox.
 wave=20;rack();
 verify(foes.filter(z=>!z.boss).length===45,'five complete rows * nine at wave 20');
 verify(foes.every(z=>z.boss||(z.w===33&&z.h===44)),'physics size unchanged');
 verify(foes.every(z=>z.x>=20&&z.x+z.w<=430),'wide formation inside playfield');
 console.log('PASS: 9 close-packed lanes, full road width, diagonal advance, no frozen neighbours, boss corridor, original collision sizes');
}
`,sandbox);
