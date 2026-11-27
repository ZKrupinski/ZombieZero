'use strict';
// APK-only. Preserve all artwork and effects; budget raster resolution only.
(function(root){
 let tier=0,slowTime=0,fastTime=0,pending=false,show=false,tag=null,lastUI=-Infinity;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const scale=[1,.85,.72];
 function backingSize(cssWidth,cssHeight,dpr){
  const natural=Math.max(1,cssWidth*dpr);
  const top=Math.min(natural,1080);
  const floor=Math.min(top,720);
  const width=Math.max(1,Math.round(Math.max(floor,top*scale[tier])));
  const height=Math.max(1,Math.round(cssHeight*width/cssWidth));
  return {width,height};
 }
 function observe(t,elapsed,stats,mode,canvas,renderer){
  const valid=elapsed>0&&elapsed<.2;
  // Do not adapt during menu/loading/pause, or from one isolated spike.
  if(mode==='playing'&&valid){
   const ms=elapsed*1000;
   const slow=stats.fps<49&&ms>19;
   const fast=stats.fps>57&&ms<19&&stats.workMs<12;
   if(slow){slowTime+=elapsed;fastTime=0}
   else if(fast){fastTime+=elapsed;slowTime=0}
   else{slowTime=Math.max(0,slowTime-elapsed);fastTime=0}
   if(slowTime>=1.5&&tier<2){
    tier++;pending=true;slowTime=0;fastTime=0;
   }else if(fastTime>=15&&tier>0){
    tier--;pending=true;slowTime=0;fastTime=0;
   }
  }else{slowTime=0;fastTime=0}
  if(show&&t-lastUI>=500){
   lastUI=t;
   if(!tag&&typeof document!=='undefined'){
    tag=document.createElement('div');
    tag.style.cssText='position:fixed;top:env(safe-area-inset-top,0px);left:4px;z-index:2147483647;pointer-events:none;background:#000c;color:#d5ffc4;font:11px monospace;padding:4px;white-space:pre-line';
    document.body.appendChild(tag);
   }
   if(tag)tag.textContent='APK FPS '+stats.fps.toFixed(0)+' | JS '+stats.updateMs.toFixed(1)+' / '+stats.drawMs.toFixed(1)+' ms\n'+canvas.width+'×'+canvas.height+' | R'+tier+' | Bloom '+(renderer?.gl?'WebGL':renderer?'2D fallback':'off');
  }
 }
 function takeResize(){const value=pending;pending=false;return value}
 function attach(){
  const options=document.getElementById('options-actions');
  if(!options||document.getElementById('native-perf-toggle'))return;
  const button=document.createElement('button');
  button.id='native-perf-toggle';button.type='button';button.className='option-tile';
  const label=()=>{button.textContent=show?'FPS 진단 ON':'FPS 진단 OFF';button.setAttribute('aria-pressed',String(show))};
  button.addEventListener('click',()=>{show=!show;if(tag)tag.hidden=!show;lastUI=-Infinity;label()});
  label();options.appendChild(button);
 }
 root.ZZNativePerf={backingSize,observe,takeResize,get tier(){return tier}};
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
 }
})(window);
