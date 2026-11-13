'use strict';
(()=>{
const root=document.documentElement,main=document.querySelector('main'),machine=document.querySelector('.machine'),stage=document.querySelector('.stage'),bar=document.querySelector('.app-bar'),button=id=>document.getElementById(id);
let installPrompt=null;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
function inform(title,message){if(mode==='playing'||mode==='clearing')pause();button('app-title').textContent=title;button('app-message').textContent=message;button('app-dialog').showModal()}
const options=button('options-dialog'),optionsActions=button('options-actions');
const originalLocations=new Map();
for(const id of ['sound','bgm','fx','fullscreen','install','share','help']){
 const item=button(id);if(item?.parentNode)originalLocations.set(item,{parent:item.parentNode,next:item.nextSibling});
}
function moveSettings(intoOptions){
 for(const [element,original] of originalLocations){
  if(intoOptions)optionsActions.appendChild(element);
  else if(original.next&&original.next.parentNode===original.parent)original.parent.insertBefore(element,original.next);
  else original.parent.appendChild(element);
 }
}
function fit(){
 const compact=window.innerWidth<=760||window.matchMedia('(pointer: coarse)').matches||!!document.fullscreenElement||standalone();
 const height=window.visualViewport?.height||window.innerHeight,width=window.visualViewport?.width||window.innerWidth;
 const portrait=compact&&height>=width*1.3;
 root.classList.toggle('compact-app',compact);
 root.classList.toggle('portrait-play',portrait);
 root.style.setProperty('--app-height',height+'px');
 moveSettings(portrait);
 if(portrait){
  root.style.setProperty('--board-width',width+'px');
  root.style.setProperty('--board-height',height+'px');
  resizeCanvas();
  return;
 }
 if(!compact){resizeCanvas();return}
 const style=getComputedStyle(main),padding=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
 const chrome=[...machine.children].filter(e=>e!==stage).reduce((sum,e)=>sum+e.getBoundingClientRect().height,0);
 const room=Math.max(100,height-padding-bar.getBoundingClientRect().height-chrome-4);
 const boardWidth=Math.min(450,width-12,room*450/710);
 root.style.setProperty('--board-width',boardWidth+'px');
 root.style.setProperty('--board-height',boardWidth*710/450+'px');
 resizeCanvas();
}
function updateLabels(){button('fullscreen').textContent=document.fullscreenElement?'⛶ 화면 복귀':'⛶ 전체화면';button('install').textContent=standalone()?'✓ 설치 실행 중':'↓ 앱 설치'}
button('fullscreen').onclick=async()=>{try{if(document.fullscreenElement){await document.exitFullscreen()}else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen({navigationUI:'hide'})}else{inform('주소창 없이 플레이','이 브라우저에서는 전체화면 버튼을 지원하지 않습니다. Safari는 공유 → 홈 화면에 추가, Android Chrome은 메뉴 → 앱 설치 또는 홈 화면에 추가를 사용해 주세요.')}}catch{inform('전체화면 실행 안내','현재 브라우저에서 전체화면 요청이 허용되지 않았습니다. Chrome 또는 Safari에서 이 링크를 직접 열고, 홈 화면에 추가한 아이콘으로 실행해 주세요.')}fit();updateLabels()};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;button('install').textContent='↓ 앱 설치'});
window.addEventListener('appinstalled',()=>{installPrompt=null;button('install').textContent='✓ 설치됨'});
button('install').onclick=async()=>{if(mode==='playing'||mode==='clearing')pause();if(standalone()){inform('설치형으로 실행 중','현재 주소창 없는 앱 모드입니다. 홈 화면의 ZOMBIE ZERO 아이콘으로 다시 실행할 수 있습니다.');return}if(installPrompt){const prompt=installPrompt;installPrompt=null;try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted')button('install').textContent='✓ 설치됨'}catch{inform('앱 설치 안내','브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택해 주세요.')}return}const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;inform('홈 화면에 설치',ios?'Safari에서 게임 링크를 열고 공유 버튼 → 홈 화면에 추가 → 추가를 누르세요. 생성된 아이콘으로 실행하면 주소창 없이 플레이합니다.':'Android Chrome에서 게임 링크를 직접 열고 ⋮ 메뉴 → 앱 설치 또는 홈 화면에 추가를 선택하세요. PC Chrome/Edge는 주소창의 설치 아이콘을 사용할 수 있습니다. 앱 내부 브라우저라면 먼저 외부 브라우저로 열어 주세요.')};
let resumeAfterOptions=false;
button('options-toggle').onclick=()=>{
 if(options.open)return;
 resumeAfterOptions=mode==='playing'||mode==='clearing';
 if(resumeAfterOptions)pause();
 options.showModal();
};
button('options-close').onclick=()=>options.close();
options.addEventListener?.('close',()=>{
 if(resumeAfterOptions&&mode==='paused'&&!button('help-dialog').open&&!button('app-dialog').open)pause();
 resumeAfterOptions=false;
});
button('help').onclick=()=>{
 resumeAfterOptions=false;
 if(options.open)options.close();
 if(mode==='playing'||mode==='clearing')pause();
 document.querySelector('.guide').open=true;
 button('help-dialog').showModal();
};
button('collection-shortcut').onclick=()=>{
 resumeAfterOptions=false;
 if(options.open)options.close();
 button('object-cast-demo-open')?.click();
};
button('help-close').onclick=()=>button('help-dialog').close();button('app-close').onclick=()=>button('app-dialog').close();
// Prevent vertical browser gestures on the play surface; modal contents keep their own scroll.
document.addEventListener('touchmove',e=>{if(root.classList.contains('compact-app')&&!e.target.closest('dialog,.overlay'))e.preventDefault()},{passive:false});
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);document.addEventListener('fullscreenchange',()=>{fit();updateLabels()});
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
fit();updateLabels();requestAnimationFrame(fit);
})();
