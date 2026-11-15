/* ZOMBIE ZERO · three 8-frame player vehicle animations (1536×576 PNG).
 * Each cell is 192×192; rows 0/1 are preserved byte-for-byte at render time.
 * Ria (internally liam, row 2): pixel inspection of the SOURCE PNG showed
 * every red-haired frame starts with an unnaturally flat 37-48px forehead
 * silhouette at source Y=2, even BEFORE CSS cropping.
 * Restore a compact, faceted voxel top-crown on all eight original frames.
 * Preserve 93% size and 18px headroom, but align to INTEGER pixels and
 * disable interpolation so the restored hard cube edges do not blur.
 * Only row 2 is altered. Ace, Ruby, cars, physics and hitboxes stay unchanged.
 */
(function(){
 'use strict';
 if(typeof window==='undefined'||typeof Image==='undefined')return;
 const atlas=new Image();atlas.decoding='async';
 const CELL=192, COLUMNS=8, ROWS=3, LIAM_ROW=2;
 const pack={image:atlas,ready:false,cell:CELL,columns:COLUMNS,rows:ROWS,liamReframed:false,riaHeadroomVersion:53};
 window.ZZHeroCarAttack=pack;


 // Accurate source-alpha spans at source row 2 (row-local y=2), measured for
 // all eight frames. These are red HAIR pixels, not generated circular masks.
 // The original y=2 roof is a flat 37-48px-wide slice; adding only transparent
 // margin (v46/v52) could never restore its missing cube-top silhouette.
 const RIA_CROWN_EDGES=[
  [93,132],[94,139],[100,147],[112,148],
  [112,150],[106,147],[115,152],[109,148]
 ];
 function facet(ctx,pts,color){
  ctx.fillStyle=color;ctx.beginPath();
  for(let k=0;k<pts.length;k++){
   const p=pts[k];if(k===0)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);
  }
  ctx.closePath();ctx.fill();
 }
 function restoreRiaCrown(ctx,frameIndex,cellX,cellY,insetX,size){
  // Rebuild the FRONT/TOP/RIGHT 3D facets in the atlas itself, so gameplay
  // and hero-selection previews share precisely the same corrected pixels.
  // No per-frame animated offset and no replacement for face, hair sides,
  // weapon, car or other characters.
  if(typeof ctx.beginPath!=='function'||typeof ctx.fillRect!=='function')return;
  const [sourceLeft,sourceRight]=RIA_CROWN_EDGES[frameIndex];
  const scale=size/CELL;
  const l=cellX+Math.round(insetX+sourceLeft*scale);
  const r=cellX+Math.round(insetX+(sourceRight+1)*scale);
  const top=cellY+10,lip=cellY+23;
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  // Angular outline and underside: four corners rather than a rounded dome.
  facet(ctx,[[l+4,top],[r-7,top],[r+3,top+7],
             [r+4,lip],[l-5,lip],[l-5,top+8]],'#bd3541');
  // Broad front-facing red voxel plane; overlap the existing source roof.
  facet(ctx,[[l-4,top+7],[r-1,top+7],[r+3,lip],
             [l-5,lip]],'#e65350');
  // Distinct lit upper face with bevel, retaining the original warm red tone.
  facet(ctx,[[l+4,top],[r-7,top],[r-1,top+7],
             [l-4,top+7]],'#f16b5b');
  // Right side is a darker planar facet, not blurred round hair shading.
  facet(ctx,[[r-7,top],[r+3,top+7],[r+4,lip],
             [r-1,top+7]],'#b62e3d');
  // Tiny square voxel details break up the large flat plane without smoothing.
  ctx.fillStyle='#ff8265';ctx.fillRect(l+10,top+2,8,2);
  ctx.fillStyle='#e85b4d';ctx.fillRect(l+21,top+4,7,2);
  ctx.fillStyle='#d84947';ctx.fillRect(l+1,top+9,5,3);
  ctx.restore();
 }

 function makeCorrectedAtlas(){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');
  canvas.width=atlas.naturalWidth;canvas.height=atlas.naturalHeight;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  ctx.imageSmoothingEnabled=false; // crisp low-poly pixel edges; no 93% interpolation
  ctx.drawImage(atlas,0,0);
  ctx.clearRect(0,LIAM_ROW*CELL,canvas.width,CELL);
  const size=Math.round(CELL*.93); // 179px, no sub-pixel sampling of voxel corners
  const insetX=Math.round((CELL-size)/2); // 7px, integer centered
  const insetY=18;           // preserve corrected wheel baseline
  for(let i=0;i<COLUMNS;i++){
   const sx=i*CELL, sy=LIAM_ROW*CELL;
   ctx.drawImage(atlas,sx,sy,CELL,CELL,sx+insetX,sy+insetY,size,size);
   restoreRiaCrown(ctx,i,sx,sy,insetX,size);
  }
  return canvas;
 }
 function applyPortraitSheet(canvas){
  // Hero-selection CSS uses the same corrected atlas as in-game canvas.
  // Blob URL avoids placing a huge base64 image string into DOM styles.
  if(typeof document==='undefined'||!document.documentElement)return;
  const install=blob=>{
   if(!blob||!window.URL||typeof window.URL.createObjectURL!=='function')return;
   const objectUrl=window.URL.createObjectURL(blob);
   document.documentElement.style.setProperty('--zz-hero-car-frames','url("'+objectUrl+'")');
   pack.portraitBlobUrl=objectUrl;
  };
  if(typeof canvas.toBlob==='function'){
   try{canvas.toBlob(install,'image/png');}catch(e){/* original CSS atlas is fallback */}
  }
 }
 atlas.onload=()=>{
  const correctSize=atlas.naturalWidth===COLUMNS*CELL&&atlas.naturalHeight===ROWS*CELL;
  if(correctSize){
   try{
    const corrected=makeCorrectedAtlas();
    if(corrected){
     pack.image=corrected;
     pack.liamReframed=true;
     applyPortraitSheet(corrected);
    }
   }catch(e){pack.image=atlas;pack.liamReframed=false;}
  }
  pack.ready=correctSize;
  if(typeof document!=='undefined'&&document.documentElement)
   document.documentElement.dataset.zzHeroAtlas=pack.ready?(pack.liamReframed?'aligned':'ready'):'bad-size';
 };
 atlas.onerror=()=>{
  pack.ready=false;
  if(typeof document!=='undefined'&&document.documentElement)
   document.documentElement.dataset.zzHeroAtlas='load-error';
 };
 atlas.src='assets/ip/hero-car-attack.png?v=53-voxel-crown';
})();
