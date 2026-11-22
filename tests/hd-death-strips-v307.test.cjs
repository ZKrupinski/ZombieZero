'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root='dist/assets/ip/';
const script=p=>fs.readFileSync(root+p,'utf8');
class Image {
 set src(url){
  this.url=url;
  const file=fs.readFileSync('dist/'+url.split('?')[0]);
  if(file.toString('ascii',0,4)==='RIFF'){
   assert.equal(file.toString('ascii',12,16),'VP8X');
   this.naturalWidth=file.readUIntLE(24,3)+1;
   this.naturalHeight=file.readUIntLE(27,3)+1;
  }else{
   this.naturalWidth=file.readUInt32BE(16);
   this.naturalHeight=file.readUInt32BE(20);
  }
  this.complete=true;
  this.onload?.();
 }
}
const world={window:{},Image,document:{readyState:'loading',addEventListener(){}}};
vm.createContext(world);
for(const path of ['death-strips-v307.js','green-death-loader.js','v2/object-zombies.js',
 'v2/elite-zombies-v145.js','v2/large-bosses-v146.js'])vm.runInContext(script(path),world);
const {ZZGreenDeath:green,ZZObjectSprite:object,ZZEliteSprites:elite,ZZLargeBossSprites:boss}=world.window;
const drawn=[];
const ctx={globalAlpha:1,save(){},restore(){},drawImage(image,sx,sy,sw,sh,x,y,w,h){
 assert(sx>=0&&sy>=0&&sx+sw<=image.naturalWidth&&sy+sh<=image.naturalHeight);
 assert(Number.isFinite(x+y)&&w>0&&h>0);
 drawn.push({url:image.url,sx});
}};
function checkFrames(name,count,draw){
 for(let i=0;i<count;i++){
  drawn.length=0;
  draw((i+.94)/count);
  assert(drawn.length>0&&drawn.every(d=>d.url.includes('/deaths-v307/'+name)),name);
  assert.equal(drawn[0].sx===0,i===0,name+' frame '+i);
 }
}
const actor={x:20,y:40,w:33,h:44};
for(const critical of [false,true]){
 const kind=critical?'critical':'normal';
 checkFrames('green-'+kind,8,t=>green.draw(ctx,{...actor,hairColor:'blond'},critical,t*green[kind].duration));
 for(let form=1;form<8;form++)
  checkFrames(object.normal[form]+'-'+kind,8,t=>object.drawDeath(ctx,{...actor,form},critical,t,1));
 for(let bossForm=0;bossForm<2;bossForm++)
  checkFrames(object.bosses[bossForm]+'-'+kind,12,t=>object.drawDeath(ctx,{...actor,boss:true,bossForm},critical,t,1));
}
for(let i=0;i<3;i++){
 elite.request(i);
 checkFrames(elite.SPECS[i].id+'-death',8,t=>elite.drawDeath(ctx,{...actor,eliteKind:i},t,1));
}
for(let i=0;i<2;i++){
 boss.requestByForm(i+2);
 checkFrames(boss.SPECS[i].id+'-death',8,t=>boss.drawDeath(ctx,{...actor,boss:true,bossForm:i+2},t,1));
}
console.log('All 15 species draw valid HD death frames using the production loaders and committed atlases.');
