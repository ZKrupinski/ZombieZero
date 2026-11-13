// ZOMBIE ZERO · Approved original IP object-zombie sprite renderer.
// All 10 species: 128x128 source frames, 8-column by 4-row RGBA PNG.
// Frame mapping: 0..7 down, 8..15 down-left, 16..23 down-right,
// 24..25 hit, 26..27 normal death, 28..29 critical death.
// Source files are baked bitmaps, NEVER isometric collection placeholders.
(function(){
  'use strict';
  const root='assets/ip/v2/';
  const normal=['green_zombie','red_barrel','black_barrel','red_brain_cube',
    'cardboard_box','wooden_crate','black_brain_cube','yellow_brain_cube'];
  const bosses=['big_zombie','trash_can','big_zombie','trash_can'];
  const names={
    green_zombie:'그린 좀비',
    red_barrel:'드럼통 좀비 · 레드',black_barrel:'드럼통 좀비 · 블랙',
    red_brain_cube:'브레인 큐브 · 레드',cardboard_box:'일회용 포장 박스 좀비',
    wooden_crate:'나무 상자 좀비',black_brain_cube:'브레인 큐브 · 블랙',
    yellow_brain_cube:'브레인 큐브 · 옐로',
    big_zombie:'빅 좀비',trash_can:'쓰레기통 좀비'
  };
  const frames={
    down:{start:0,count:8,frameMs:110},
    left:{start:8,count:8,frameMs:110},
    right:{start:16,count:8,frameMs:110},
    hurt:{start:24,count:2,frameMs:90},
    normal:{start:26,count:2,frameMs:260},
    critical:{start:28,count:2,frameMs:290}
  };
  const images={};
  for(const key of Object.keys(names)){
    const image=new Image();
    image.decoding='async';
    const entry=images[key]={image,ready:false,failed:false};
    image.onload=()=>{entry.ready=image.naturalWidth===1024&&image.naturalHeight===512;entry.failed=!entry.ready};
    image.onerror=()=>{entry.failed=true;entry.ready=false};
    image.src=root+key+'.png';
  }
  const keyFor=z=>z.boss?bosses[z.bossForm??0]:normal[z.form??0];
  function available(z){return Boolean(images[keyFor(z)]?.ready)}
  function frameFor(z,t){
    if((z.recoil||0)>.015){
      const u=Math.max(0,.22-(z.recoil||0));
      return 24+Math.min(1,Math.floor(u/.11));
    }
    // Actual lane velocity decides which diagonal walk appears.
    const vx=z.moveDir||0;
    const anim=vx<-.3?frames.left:vx>.3?frames.right:frames.down;
    const phase=((z.seed||0)*2.15);
    return anim.start+Math.floor(Math.max(0,t*1000/anim.frameMs+phase)%anim.count);
  }
  function drawFrame(ctx,image,z,frame,alpha=1){
    if(!image?.naturalWidth)return false;
    const sc=z.boss?2:1;
    const w=z.w+8*sc,h=z.h+14*sc;
    const x=z.x+(z.w-w)/2,y=z.y+z.h-h+3*sc;
    ctx.save();
    ctx.globalAlpha*=alpha;
    if(z.flash>0)ctx.filter='brightness(1.55)';
    // Center/pivot are fixed, not rotated. No artificial floor shadow.
    ctx.drawImage(image,(frame%8)*128,Math.floor(frame/8)*128,128,128,x,y,w,h);
    ctx.restore();
    return true;
  }
  function draw(ctx,z,t){
    const entry=images[keyFor(z)];
    if(!entry?.ready)return false;
    return drawFrame(ctx,entry.image,z,frameFor(z,t));
  }
  function drawDeath(ctx,z,critical,elapsed,duration){
    const entry=images[keyFor(z)];
    if(!entry?.ready)return false;
    const t=Math.max(0,Math.min(1,elapsed/Math.max(.001,duration)));
    const a=critical?28:26,b=a+1;
    const blend=Math.max(0,Math.min(1,(t-.28)/.36));
    // Collapse along the character's FRONT/BACK axis.
    // The source sprites preserve visible cubic volume, not sideways rotations.
    if(blend<1)drawFrame(ctx,entry.image,{...z,flash:0},a,1-blend);
    if(blend>0)drawFrame(ctx,entry.image,{...z,flash:0},b,blend);
    return true;
  }
  window.ZZObjectSprite={normal,bosses,names,frames,images,keyFor,available,draw,drawDeath,frameFor};
})();