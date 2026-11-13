'use strict';
const c=document.getElementById('game');let g=c.getContext('2d');const $=id=>document.getElementById(id),W=450,H=710,PY=604;
// Preserve normal drawing; collect only luminous shapes for the additive pass.
let fxRenderer=null;
function luminous(draw){
 draw();
 if(!fxEnabled||!fxRenderer)return;
 const original=g;
 fxRenderer.capture(original,context=>{g=context;try{draw()}finally{g=original}});
}
const TYPES=[{color:'#a9d67c',top:'#dcf3b1',side:'#60945b',hp:1,name:'그린'},{color:'#78d4e5',top:'#bbf3f6',side:'#367e98',hp:2,name:'블루'},{color:'#eabb58',top:'#ffdf96',side:'#a57932',hp:3,name:'골드'},{color:'#df87b5',top:'#ffc3e3',side:'#92527c',hp:4,name:'퍼플'},{color:'#ed7966',top:'#ffb091',side:'#a1403f',hp:5,name:'레드'}];
const SKILLS={bazooka:{name:'시민 바주카',duration:12,color:'#ffd16c',desc:'시민이 3초마다 희귀 광역 로켓 · 피해 8',icon:'<path d="m5 21 15-15 7 7-15 15zM18 8l6 6M6 22l-2 6 6-2M19 3l2-2M28 10l3-1M26 3l3-3"/>'},dual:{name:'더블볼',duration:16,color:'#aee8ff',desc:'공 2개',icon:'<circle cx="9" cy="12" r="5"/><circle cx="23" cy="20" r="5"/>'},triple:{name:'트리플볼',duration:16,color:'#c0a5ff',desc:'공 3개',icon:'<circle cx="16" cy="7" r="4"/><circle cx="7" cy="23" r="4"/><circle cx="25" cy="23" r="4"/>'},power:{name:'파워볼',duration:14,color:'#f5d470',desc:'크기·공격력 ×2',icon:'<circle cx="16" cy="16" r="12"/><path d="m17 6-7 12h6l-1 8 8-13h-6z"/>'},fire:{name:'화염볼',duration:14,color:'#ff9763',desc:'주변 화염 전염',icon:'<path d="M17 3c4 9-4 9 2 14l5-6c9 12 1 19-8 18S3 21 8 13l3 5c4-4 0-8 6-15Z"/>'},slow:{name:'슬로우',duration:12,color:'#86f2e0',desc:'공·좀비 감속',icon:'<circle cx="16" cy="17" r="11"/><path d="M16 10v8l6 3M12 2h8M16 2v4"/>'},shield:{name:'보호막',duration:18,color:'#b9f684',desc:'바닥에서 공 반사',icon:'<path d="m16 3 11 4v10c0 6-11 12-11 12S5 23 5 17V7Z"/><path d="m10 16 4 4 8-9"/>'}};
let mode='menu',score=0,wave=1,lives=3,best=0,car=225,target=225,balls=[],foes=[],items=[],particles=[],keys={},swing=0,combo=0,clock=0,last=0,active={},sound=true,toastTimer,stageDelay=0,audio,master,musicBus,nextBeat=0,beat=0,lastSkillMarkup='';
try{best=+(localStorage.getItem('zr-best')||0)}catch{}
const HEROES=[
{id:'ace',name:'생존자 소년',role:'안정형',color:'#ed684c',hair:'#503627',skin:'#ffd4a0',speed:500,paddle:68,damage:1,lives:3,duration:1,desc:'넓은 라켓 · 목숨 3',stats:'이동 500 · 공격 1 · 라켓 136'},
{id:'ruby',name:'금발 소녀',role:'기동형',color:'#5ecba7',hair:'#e7843c',skin:'#ffe0ba',speed:660,paddle:51,damage:1,lives:3,duration:1.25,desc:'이동 +32% · 스킬 시간 +25%',stats:'이동 660 · 공격 1 · 라켓 102'},
{id:'liam',name:'빨간 안경 소녀',role:'공격형',color:'#f0b84e',hair:'#ed6c34',skin:'#f1bc87',speed:390,paddle:55,damage:2,lives:2,duration:1,desc:'공격력 2배 · 목숨 2',stats:'이동 390 · 공격 2 · 라켓 110'}];
let touchUsed=false,lastBuzz=0,bubbles=[],bubbleTimer=.25;
let selectedHero=0,clearTime=0,clearBurst=0,resumeMode='playing',crowdTimer=3.5,junk=[],cheerTime=0;
const hero=()=>HEROES[selectedHero];
const ZOMBIE_FORMS=[{name:'그린 좀비',unlock:1},{name:'드럼통 좀비 · 레드',unlock:2},{name:'드럼통 좀비 · 블랙',unlock:4},{name:'브레인 큐브 · 레드',unlock:5},{name:'일회용 포장 박스 좀비',unlock:7},{name:'나무 상자 좀비',unlock:8},{name:'브레인 큐브 · 블랙',unlock:10},{name:'브레인 큐브 · 옐로',unlock:12}];
const BOSS_FORMS=['빅 좀비','쓰레기통 좀비','빅 좀비','쓰레기통 좀비'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const has=k=>(active[k]||0)>0;
function rect(x,y,w,h,color){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function poly(p,color){g.fillStyle=color;g.beginPath();p.forEach((v,i)=>i?g.lineTo(...v):g.moveTo(...v));g.closePath();g.fill()}
function cube(x,y,w,h,front,top,side){rect(x-2,y-1,w+4,h+3,'#111724');rect(x,y,w,h,front);poly([[x,y],[x+6,y-6],[x+w+6,y-6],[x+w,y]],top);poly([[x+w,y],[x+w+6,y-6],[x+w+6,y+h-6],[x+w,y+h]],side)}
let musicEnabled=true,fxEnabled=true,fx=[],cameraKick=0,musicTheme='',noiseBuffer,echo,lastSfx={};
const hz=n=>440*Math.pow(2,(n-69)/12);
function audioRunning(){return !!(audio&&master&&musicBus&&(!audio.state||audio.state==='running'))}
function audioUI(){const blocked=sound&&!audioRunning();$('sound').textContent=!sound?'♫ OFF':blocked?'♫ 재생':'♫ ON';$('sound').setAttribute('aria-label',!sound?'음악과 효과음 켜기':blocked?'소리 재생 다시 시도':'음악과 효과음 끄기')}
function unlockAudio(){
 try{
  if(!audio||audio.state==='closed'||!master||!musicBus){
   const AudioCtor=window.AudioContext||window.webkitAudioContext;if(!AudioCtor){audioUI();return}
   const ctx=new AudioCtor(),main=ctx.createGain(),bus=ctx.createGain();
   // Keep the essential output path independent of optional effects.
   main.connect(ctx.destination);bus.connect(main);
   audio=ctx;master=main;musicBus=bus;noiseBuffer=null;echo=null;lastSfx={};nextBeat=0;musicTheme='';
   try{if(ctx.createDelay){const delay=ctx.createDelay(),wet=ctx.createGain();delay.delayTime.value=.18;wet.gain.value=.16;bus.connect(delay);delay.connect(wet);wet.connect(main);echo=delay}}catch{}
   ctx.onstatechange=()=>{if(audio!==ctx)return;if(ctx.state==='running'){nextBeat=ctx.currentTime;lastSfx={}}audioUI()};
  }
  master.gain.value=sound?.58:0;
  if(!audioRunning()){
   const ctx=audio;
   const ready=()=>{if(audio!==ctx)return;nextBeat=ctx.currentTime;lastSfx={};audioUI();if(audioRunning()){music();if(sound)sfx('serve')}};
   const pending=ctx.resume();if(pending?.then)pending.then(ready).catch(()=>audioUI());else ready();
  }
  audioUI();
 }catch{audioUI()}
}
// Touch release is a user activation even when dragging suppresses synthetic clicks.
function recoverAudio(e){if(e?.target?.closest?.('#sound,#bgm'))return;if(sound&&!audioRunning())unlockAudio()}
for(const event of ['touchend','pointerup','click','keydown'])document.addEventListener(event,recoverAudio,{passive:true});
window.addEventListener('pageshow',()=>{if(audio&&sound)unlockAudio()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&audio&&sound)unlockAudio()});

function tone(f,d=.1,type='square',vol=.08,delay=0,music=false,endFreq=0){if(!audioRunning()||!sound)return;let t=audio.currentTime+delay,o=audio.createOscillator(),v=audio.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(15,endFreq),t+d);o.connect(v);v.connect(music?musicBus:master);v.gain.setValueAtTime(vol,t);v.gain.exponentialRampToValueAtTime(.001,t+d);o.start(t);o.stop(t+d+.01)}
function noise(d=.09,vol=.08,delay=0,mus=false){if(!audioRunning()||!sound||!audio.createBuffer)return;if(!noiseBuffer){noiseBuffer=audio.createBuffer(1,audio.sampleRate*.5,audio.sampleRate);let a=noiseBuffer.getChannelData(0),hold=0;for(let i=0;i<a.length;i++){if(i%5===0)hold=Math.random()*2-1;a[i]=hold}}let o=audio.createBufferSource(),v=audio.createGain(),t=audio.currentTime+delay;o.buffer=noiseBuffer;o.connect(v);v.connect(mus?musicBus:master);v.gain.setValueAtTime(vol,t);v.gain.exponentialRampToValueAtTime(.001,t+d);o.start(t);o.stop(t+d)}
function sfx(name){if(!audioRunning()||!sound)return;let now=audio.currentTime;if(now-(lastSfx[name]??-10)<({wall:.085,hit:.065,kill:.065,fire:.15}[name]||0))return;lastSfx[name]=now;
const sounds={launch:[55,67,79],blast:[36,48,55],serve:[72,79,84],wall:[67],racket:[79,86,91],car:[76,83,88],citizen:[84,79,67],return:[72,76,79,84,91],bosshit:[43,55,62],powerhit:[55,67,79],hit:[60,67],kill:[72,76,79],item:[72,76,79,84,88],expire:[72,67],miss:[64,60,55],start:[60,64,67,72,76,79],wave:[60,64,67,72,79,84],boss:[43,50,55,62],bosskill:[60,67,72,76,79,84,88],fire:[55,62],shield:[79,84,91],pause:[72,67],over:[67,64,60,55]};const notes=sounds[name]||[72],rise=['kill','hit','powerhit'].includes(name)?Math.min(7,Math.floor(combo/2)):0,comboGain=1+Math.min(combo,10)*.025,spacing=Math.max(.024,.045-Math.min(combo,10)*.002),accent=['item','return','wave','bosskill','start'].includes(name);
notes.forEach((n,i)=>{tone(hz(n+rise),accent?.16:.085,'triangle',name==='wall'?.035:.1*comboGain,i*spacing);if(name!=='wall')tone(hz(n+rise),.055,'square',.023*comboGain,i*spacing)});
if(['racket','car','citizen'].includes(name))tone(500,.065,'square',.045,0,false,1250);
if(['hit','kill','powerhit','bosshit'].includes(name)){tone(name==='kill'?160:110,.07,'triangle',.15,0,false,45);noise(.035,.04)}
if(name==='launch'){tone(180,.14,'sawtooth',.07,0,false,650);noise(.06,.08)}if(name==='blast'){tone(110,.22,'sine',.2,0,false,30);noise(.18,.1)}if(name==='fire'){noise(.07,.055);tone(160,.08,'triangle',.07,0,false,420)}
if(accent){[0,4,7].forEach(n=>tone(hz(60+n),.35,'triangle',.045,.07));tone(145,.19,'sine',.18,0,false,42);if(name==='wave'||name==='bosskill')noise(.16,.06,.12)}
if(name==='boss'){tone(82,.32,'triangle',.16,0,false,41);noise(.13,.055)}
if(name==='bosshit'){tone(95,.11,'triangle',.18,0,false,35);noise(.045,.065)}if(name==='powerhit')tone(165,.09,'triangle',.18,0,false,50);
if(name==='miss')tone(250,.18,'triangle',.12,0,false,70);}
const THEMES=[{name:'SUNNY RALLY',root:60,chords:[0,5,7,0],mel:[12,19,16,19,24,19,16,14,12,16,19,21,19,16,14,7]}, {name:'TURBO PARADE',root:57,chords:[0,5,7,5],mel:[12,16,19,21,24,21,19,16,14,17,21,24,23,19,16,14]}, {name:'VICTORY DRIVE',root:62,chords:[0,7,5,0],mel:[19,19,21,19,16,12,14,16,24,23,21,19,16,14,11,12]}, {name:'BOSS RUSH',root:50,chords:[0,5,7,0],mel:[24,19,24,27,24,19,22,19,24,27,31,27,26,22,19,15]}];
function music(){if(!audioRunning())return;musicBus.gain.value=mode==='playing'&&sound&&musicEnabled?.6:0;if(mode!=='playing'||!sound||!musicEnabled)return;const boss=foes.some(z=>z.boss),theme=THEMES[boss?3:(wave-1-Math.floor(wave/3))%3],tempo=boss?172:146+((wave-1)%3)*4,step=60/tempo/4;if(musicTheme!==theme.name){musicTheme=theme.name;beat=0;nextBeat=audio.currentTime;$('track').textContent='♫ '+theme.name}if(nextBeat<audio.currentTime-.2)nextBeat=audio.currentTime;
let guard=0;while(nextBeat<audio.currentTime+.09&&guard++<4){let i=beat%64,bar=Math.floor(i/16),sub=i%16,root=theme.root+theme.chords[bar],delay=Math.max(0,nextBeat-audio.currentTime),arp=boss?[0,7,12,15,19,15,12,7]:[0,7,12,16,19,16,12,7];
if([0,2,4,6,7,10,12,14].includes(sub)){let phrase=Math.floor(beat/64)%4,melody=root+theme.mel[(Math.floor(i/2)+(phrase%2)*4)%16]+(phrase===3&&sub>=12?12:0);tone(hz(melody),step*1.45,'square',.046,delay,true);if(bar===3||Math.floor(beat/64)%4===2)tone(hz(melody-12),step*1.6,'triangle',.065,delay,true)}
tone(hz(root+12+arp[sub%8]),step*.72,'square',.024,delay,true);
if(sub%2===0)tone(hz(root-12+([0,0,7,12][Math.floor(sub/4)])),step*1.7,'triangle',.23,delay,true);
if(sub===0||sub===6||sub===8||boss&&sub===10)tone(130,.13,'sine',.31,delay,true,32);
if(sub===4||sub===12){noise(.065,.105,delay,true);tone(200,.055,'triangle',.1,delay,true,85)}else noise(sub===14?.06:.018,sub%2===0?.028:.014,delay,true);if(bar===3&&sub>=13){noise(.035,.06,delay,true);tone(hz(root+12+(sub-13)*3),.055,'triangle',.055,delay,true)}
if(sub===0&&bar%2===0){[0,boss?3:4,7,12].forEach(n=>tone(hz(root+n),step*7,'triangle',.036,delay,true))}beat++;nextBeat+=step;}}
function effect(x,y,color,size=45,text=''){if(!fxEnabled)return;fx.push({x,y,color,size,text,t:0,life:text?.85:.48});if(fx.length>45)fx.shift();cameraKick=Math.max(cameraKick,size>=120?5.2:size>=70?3.2:size>=45?2:.9)}
function drawEffects(labels=false){if(!fxEnabled)return;for(const f of fx){let a=1-f.t/f.life,r=8+f.t/f.life*f.size;g.globalAlpha=a;if(!labels){g.strokeStyle=f.color;g.lineWidth=3;g.beginPath();for(let i=0;i<=8;i++){let ang=i*Math.PI/4;let x=f.x+Math.cos(ang)*r,y=f.y+Math.sin(ang)*r;i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke();for(let i=0;i<8;i++){let ang=i*Math.PI/4;rect(f.x+Math.cos(ang)*r*1.3,f.y+Math.sin(ang)*r*1.3,4,4,f.color)}}if(labels&&f.text){g.font='bold 15px monospace';g.textAlign='center';g.fillStyle='#081322';g.fillText(f.text,f.x+2,f.y-18-f.t*36+2);g.fillStyle=f.color;g.fillText(f.text,f.x,f.y-18-f.t*36)}}g.globalAlpha=1}
function icon(k){return '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+SKILLS[k].icon+'</svg>'}
function skillUI(){const markup=Object.keys(SKILLS).filter(has).map(k=>{let s=SKILLS[k],pct=active[k]/(s.duration*hero().duration)*100;return '<div class="skill" style="--skill:'+s.color+'" title="'+s.desc+'">'+icon(k)+'<span>'+s.name+'<b>'+Math.ceil(active[k])+'s</b></span><i style="width:'+Math.ceil(pct)+'%"></i></div>'}).join('');if(markup!==lastSkillMarkup){$('skills').innerHTML=markup;lastSkillMarkup=markup}$('skills').hidden=!markup}
const DEFENSE_Y=565;
let runMode='campaign',endlessUnlocked=false,lastStandUsed=false,resistFlash=0,failureScene=null,lastLostBall=null;
try{endlessUnlocked=localStorage.getItem('zb-endless-unlocked')==='1'}catch{}
function endlessUI(){const el=$('endless');el.hidden=!endlessUnlocked||!['menu','over'].includes(mode);el.textContent='∞ 무한 모드 시작';el.onclick=()=>start('endless')}
function triggerLastStand(){if(wave<20||lastStandUsed)return false;lastStandUsed=true;resistFlash=1.4;
 const sorted=[...foes].sort((a,b)=>a.y-b.y),placed=[];
 for(const z of sorted){const old=z.y;let y=Math.max(36,z.y-180);for(const above of placed)if(z.x-8<above.x+above.w+8&&z.x+z.w+8>above.x-8)y=Math.max(y,above.y+above.h+(z.boss?28:19));z.y=Math.min(old,y);z.flash=.12;z.recoil=.22;z.hitAt=clock;z.hitHold=.05;placed.push(z);burst(z.x+z.w/2,z.y+z.h/2,'#9debea',8)}
 // Crowded late-stage boss formations may hit the upper packing boundary and
 // leave a front enemy too close after the first push. Translate the entire
 // already-spaced formation to guarantee a visible 125px recovery window,
 // preserving collision order and every zombie's HP.
 if(foes.length){
  const furthest=Math.max(...foes.map(z=>z.y+z.h));
  const extra=Math.max(0,furthest-(DEFENSE_Y-125));
  if(extra>0)for(const z of foes)z.y-=extra;
 }
 effect(225,DEFENSE_Y,'#b3fff0',140,'LAST STAND!');sfx('bosskill');haptic([20,30,20]);toast('최후의 저항! · 좀비 전원 밀쳐내기 · 이번 판 1회');return true}
function finishCampaign(){endlessUnlocked=true;try{localStorage.setItem('zb-endless-unlocked','1')}catch{}mode='over';best=Math.max(best,score);try{localStorage.setItem('zr-best',best)}catch{}$('result-stage').textContent='50 스테이지 완주';$('result-cleared').textContent='50개 스테이지 클리어';$('result-score').textContent=score.toLocaleString('ko-KR');$('result-best').textContent=best.toLocaleString('ko-KR');overlay('50 STAGES<br><em>CLEAR!</em>','도시를 지켜냈습니다! 무한 모드가 해금되었습니다.','일반 모드 다시 시작','VICTORY');endlessUI();sfx('wave')}
function drawDanger(){if(mode!=='playing'||balls[0]?.held||!foes.length)return;const nearest=foes.reduce((a,b)=>a.y+a.h>b.y+b.h?a:b);if(nearest.y+nearest.h<DEFENSE_Y-70)return;g.save();g.globalAlpha=.55+.25*Math.sin(clock*9);rect(20,DEFENSE_Y-2,410,4,'#ff6278');g.fillStyle='#ffe5ba';g.textAlign='center';g.font='bold 13px Arial, sans-serif';g.fillText('위험! 좀비가 방어선에 접근 중',225,DEFENSE_Y-12);g.restore()}
function drawOutcome(){if(resistFlash>0){const t=1-resistFlash/1.4;g.save();g.globalAlpha=(1-t)*.75;g.strokeStyle='#a7ffea';g.lineWidth=8;g.beginPath();g.arc(225,DEFENSE_Y,30+t*560,Math.PI,Math.PI*2);g.stroke();g.fillStyle='#caffef';g.font='bold 24px Arial, sans-serif';g.textAlign='center';g.fillText('LAST STAND!',225,400);g.font='bold 14px Arial, sans-serif';g.fillText('최후의 저항 · 전원 밀쳐내기',225,426);g.restore()}
 if(!failureScene)return;const f=failureScene;g.save();rect(20,16,410,690,'#160d2444');g.strokeStyle='#ff6278';g.lineWidth=4;
 if(f.type==='breach'){rect(20,DEFENSE_Y-3,410,6,'#ff546c');g.beginPath();g.arc(f.x,f.y,42+Math.sin(f.t*15)*4,0,Math.PI*2);g.stroke();g.fillStyle='#ffd8ce';g.font='bold 14px Arial, sans-serif';g.textAlign='center';g.fillText('이 적이 방어선을 돌파했습니다',225,DEFENSE_Y+26)}else{g.beginPath();g.moveTo(f.x,615);g.lineTo(f.x,699);g.stroke();poly([[f.x-12,682],[f.x,702],[f.x+12,682]],'#ff7182');g.textAlign='center';g.font='bold 25px Arial, sans-serif';g.fillStyle='#ff9b9b';g.fillText('♡  0',225,655)}
 rect(38,264,374,142,'#251827ed');g.fillStyle='#ffad9f';g.font='bold 25px Arial, sans-serif';g.textAlign='center';g.fillText(f.type==='breach'?'방어선 돌파!':'마지막 공을 놓쳤습니다!',225,299);g.font='bold 14px Arial, sans-serif';g.fillStyle='#fff0d4';g.fillText(f.type==='breach'?'하트가 남아 있어도':'남은 하트가 0이 되어',225,329);g.fillText(f.type==='breach'?'방어선이 뚫리면 패배합니다.':'게임이 종료됩니다.',225,350);g.fillText((runMode==='endless'?'ENDLESS '+(wave-50):'STAGE '+wave)+' · SCORE '+score.toLocaleString('ko-KR'),225,382);g.restore()}
function hud(){$('score').textContent=score.toLocaleString('ko-KR');$('wave').textContent=runMode==='endless'?'∞ '+(wave-50):String(wave).padStart(2,'0');$('progress').textContent=runMode==='endless'?'ENDLESS · '+(wave-51)+' 웨이브 생존':(wave-1)+'/50 스테이지 클리어';$('lives').textContent='♥ '.repeat(lives)+'♡ '.repeat(Math.max(0,hero().lives-lives));$('status').textContent=balls[0]?.held?'TAP TO SERVE':'BALLS '+balls.length;skillUI()}
function toast(t){$('toast').textContent=t;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,1400)}
function rack(){foes=[];stageDelay=0;const rows=Math.min(5,3+Math.floor(wave/2)),bossStage=wave%3===0,available=ZOMBIE_FORMS.map((v,i)=>({v,i})).filter(x=>x.v.unlock<=wave),latest=available[available.length-1].i;for(let r=0;r<rows;r++)for(let col=0;col<7;col++){if(bossStage&&r<2&&col>=2&&col<=4)continue;let maxKind=Math.min(4,1+Math.floor(wave/2)),kind=Math.floor(Math.pow(Math.random(),Math.max(.45,1.7-wave*.12))*(maxKind+1)),hp=TYPES[kind].hp,form=col===0&&r===0?latest:available[Math.floor(Math.random()*available.length)].i;foes.push({x:40+col*55,y:64+r*65,w:33,h:44,hp,max:hp,kind,form,flash:0,seed:Math.random()*20,burn:0,burnTick:0,spreadTick:0})}if(bossStage){let hp=Math.round(24+Math.min(wave,10)*4+Math.max(0,wave-10)*1.2),bossForm=(wave/3-1)%BOSS_FORMS.length;foes.push({x:192,y:68,w:66,h:88,hp,max:hp,kind:4,form:3,bossForm,boss:true,flash:0,seed:0,burn:0,burnTick:0,spreadTick:0});sfx('boss');effect(225,130,'#ff687e',145,BOSS_FORMS[bossForm])}$('encounter').textContent=(runMode==='endless'?'ENDLESS '+(wave-50):'STAGE '+wave)+' · '+(bossStage?BOSS_FORMS[(wave/3-1)%4]:ZOMBIE_FORMS[latest].name)+' / 진군 속도 '+marchBase().toFixed(1);}
function marchBase(){const stage=Math.min(50,wave),n=Math.min(9,Math.max(0,stage-1)),late=Math.max(0,stage-10);return 2.7+.22*n+.006*n*n+.07*late+.0008*late*late+(runMode==='endless'?Math.min(9,Math.max(0,wave-50)*.035):0)}
function enemySpeed(z){return marchBase()*(z.boss?.62:[1.1,1.04,.97,.89,.82][z.kind])*(has('slow')?.4:1)}
function march(dt){const sorted=[...foes].sort((a,b)=>b.y-a.y),done=[];for(const z of sorted){
 // Gentle horizontal lane drift makes the authored left/right diagonal walks
 // correspond to actual movement. Bound +/-6px; collision positions move too.
 // Does not alter enemy vertical speed, form HP, spacing or boss routes.
 if(!z.boss&&(z.form??0)>0&&wave>=3){
  if(z.laneX===undefined)z.laneX=z.x;
  const radius=2+((z.form??0)%3)*2;
  const nx=clamp(z.laneX+Math.sin(clock*1.4+(z.seed||0))*radius,8,W-z.w-8);
  z.moveDir=(nx-z.x)/Math.max(.001,dt);
  z.x=nx;
 }else z.moveDir=0;
 let next=z.y+enemySpeed(z)*dt;for(const front of done){if(z.x-8<front.x+front.w+8&&z.x+z.w+8>front.x-8)next=Math.min(next,front.y-z.h-(front.boss?28:19))}z.y=Math.max(z.y,next);done.push(z)}}
function beginClear(){if(mode!=='playing')return;mode='clearing';clearTime=0;clearBurst=0;items=[];balls=[];junk=[];rockets=[];for(const p of citizens)p.shooting=0;active={};score+=500;cheerTime=3;sfx('wave');effect(225,340,'#edfc8d',130,'STAGE CLEAR');$('toast').style.opacity=0;hud();$('status').textContent='CITIZENS SAVED!'}
function advanceStage(){if(runMode==='campaign'&&wave===50){finishCampaign();return}wave++;if((wave-1)%5===0)lives=Math.min(hero().lives,lives+1);mode='playing';clearTime=0;clearSkills();rack();resetBalls();crowdTimer=3.5;toast(wave%3===0?'WARNING · '+BOSS_FORMS[(wave/3-1)%4]:(runMode==='endless'?'ENDLESS '+(wave-50):'STAGE '+String(wave).padStart(2,'0'))+' · '+ZOMBIE_FORMS.filter(v=>v.unlock<=wave).at(-1).name)}
function newBall(x=car,y=PY-17,vx=0,vy=0,held=true){return{x,y,vx,vy,held,trail:[],lastHit:null,hitLock:0}}
function resetBalls(){killCombo=0;killTimer=0;comboPop=0;balls=[newBall()];combo=0;hud()}
function clearSkills(){active={};items=[];rockets=[];bazookaBlasts=[];bazookaTimer=0;skillUI()}
function start(selectedMode='campaign'){if(selectedMode==='endless'&&!endlessUnlocked)return;runMode=selectedMode;lastStandUsed=false;resistFlash=0;failureScene=null;lastLostBall=null;lastSupportAt=clock-60;supportDangerTime=0;resetCitizens();releaseInput();$('results').hidden=true;unlockAudio();score=0;wave=runMode==='endless'?51:1;lives=hero().lives;car=target=225;clearTime=0;junk=[];crowdTimer=3.5;cheerTime=0;particles=[];fx=[];enemyDeaths=[];enemyPieces=[];cameraKick=0;clearSkills();rack();resetBalls();mode='playing';$('overlay').hidden=true;$('heroes').hidden=true;nextBeat=0;beat=0;sfx('start');hud();endlessUI();toast(runMode==='endless'?'ENDLESS · 끝없는 생존 도전!':'STAGE 01 · 준비!')}
function serve(){unlockAudio();if(mode==='playing'&&balls[0]?.held){balls[0].held=false;balls[0].vx=125;balls[0].vy=-365;syncMulti();sfx('serve');hud()}}
function overlay(title,message,button,label){$('overlay').setAttribute('data-title','false');$('results').hidden=!['GAME OVER','VICTORY'].includes(label);$('heroes').hidden=!['GAME OVER','VICTORY'].includes(label);$('title').innerHTML=title;$('message').innerHTML=message;$('start').innerHTML=button+' <span>↗</span>';$('label').textContent=label;$('overlay').hidden=false;endlessUI()}
function pause(){releaseInput();if(mode==='playing'||mode==='clearing'){resumeMode=mode;mode='paused';sfx('pause');overlay('잠깐,<br><em>숨 고르기.</em>','게임과 스킬 지속시간이 멈췄습니다.','계속하기','PAUSED')}else if(mode==='paused'){unlockAudio();mode=resumeMode;$('overlay').hidden=true;nextBeat=0}}
function end(reason,detail=null){if(mode==='over')return;releaseInput();mode='over';best=Math.max(best,score);try{localStorage.setItem('zr-best',best)}catch{}$('result-stage').textContent=runMode==='endless'?'무한 '+(wave-50)+' 웨이브':wave+' 스테이지';$('result-cleared').textContent=runMode==='endless'?(wave-51)+' 웨이브 생존':(wave-1)+'개 클리어';$('result-score').textContent=score.toLocaleString('ko-KR');$('result-best').textContent=best.toLocaleString('ko-KR');overlay('게임 오버',reason,'다시 시작','GAME OVER');sfx('over');if(detail){failureScene={...detail,t:0};$('overlay').hidden=true;cameraKick=fxEnabled?4:0;haptic([30,40,30])}}
function burst(x,y,color,n=12){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*230,vy:(Math.random()-.6)*230,t:.5+Math.random()*.3,color,size:3+Math.random()*4});if(particles.length>400)particles.splice(0,particles.length-400)}
function multiCount(){return (has('dual')?2:1)*(has('triple')?3:1)}
function syncMulti(){if(!balls.length||balls[0].held)return;const n=multiCount(),src=balls[0];while(balls.length<n){const angles=[-1.1,...balls.map(b=>clamp(Math.atan2(b.vx,Math.abs(b.vy)),-1.1,1.1)),1.1].sort((a,b)=>a-b);let gap=0,a=0;for(let i=1;i<angles.length;i++)if(angles[i]-angles[i-1]>gap){gap=angles[i]-angles[i-1];a=(angles[i]+angles[i-1])/2}const sp=Math.max(350,Math.hypot(src.vx,src.vy));balls.push(newBall(src.x,src.y,Math.sin(a)*sp,-Math.cos(a)*sp,false))}if(balls.length>n)balls=balls.slice(0,n);hud()}
function activate(k){active[k]=SKILLS[k].duration*hero().duration;if(k==='dual'||k==='triple'){syncMulti()}if(k==='bazooka'){bazookaTimer=0;lastSupportAt=clock}sfx('item');effect(car,PY-20,SKILLS[k].color,95,SKILLS[k].name);burst(car,PY,SKILLS[k].color,22);toast(k==='bazooka'&&!citizens.some(p=>p.alive)?'시민 바주카 · 복귀할 시민을 기다리는 중':SKILLS[k].name+' · '+SKILLS[k].desc);hud()}
// Support is rare while safe, weighted toward danger, and rate-limited per run.
let lastSupportAt=-60,supportDangerTime=0;
function supportRisk(){if(!foes.length)return 0;const bottom=Math.max(...foes.map(z=>z.y+z.h)),alive=citizens.filter(p=>p.alive).length;return bottom>=475||(bottom>=380&&(lives===1||alive<=5))?2:bottom>=390||lives===1||alive<=8?1:0}
function supportAvailable(){return citizens.some(p=>p.alive)&&clock-lastSupportAt>=45&&!has('bazooka')&&!items.some(i=>i.k==='bazooka')&&!rockets.length}
function supportChance(){return supportAvailable()?[.005,.1,.28][supportRisk()]:0}
function updateEmergencySupport(dt){if(mode!=='playing'||balls[0]?.held||!supportAvailable()||supportRisk()<2){supportDangerTime=0;return}supportDangerTime+=dt;if(supportDangerTime<3)return;items.push({x:car,y:485,k:'bazooka',phase:0});lastSupportAt=clock;supportDangerTime=0;toast('긴급 지원! · 바주카를 받아주세요');sfx('item')}
function drop(z){if(z.max<2&&!z.boss)return;if(z.boss||Math.random()<.45){let ks=Object.keys(SKILLS).filter(k=>k!=='bazooka'),chance=supportChance(),roll=Math.random(),k=roll<chance?'bazooka':ks[Math.min(ks.length-1,Math.floor((roll-chance)/(1-chance)*ks.length))];items.push({x:z.x+z.w/2,y:z.y+z.h/2,k,phase:Math.random()*6});if(k==='bazooka')lastSupportAt=clock}}
function damage(z,n=1,burning=false,impact=null){if(!foes.includes(z))return;z.hp-=n;z.flash=.12;enemyReaction(z,n,impact);effect(z.x+z.w/2,z.y+z.h/2,burning?'#ffac48':TYPES[z.kind].color,z.hp<=0?(z.boss?150:55):24,z.hp<=0?(z.boss?'BOSS BREAK!':'+'+(100*z.max)):('-'+n));score+=z.hp<=0?(z.boss?1500:100*z.max)+Math.min(combo,10)*10:25;burst(z.x+z.w/2,z.y+z.h/2,burning?'#ff985f':TYPES[z.kind].color,z.boss?20:8);if(!burning&&n>=2&&z.hp<=0&&!z.boss){sfx('powerhit');cameraKick=fxEnabled?Math.max(cameraKick,2.6):0;haptic(10)}if(!burning&&z.hp>0){if(z.boss){cameraKick=fxEnabled?Math.max(cameraKick,3.3):0;sfx('bosshit');haptic(14)}else if(n>=2){cameraKick=fxEnabled?Math.max(cameraKick,2.4):0;sfx('powerhit');haptic(10)}}if(z.hp<=0){
 const criticalGreen=!burning&&!z.boss&&(z.form??0)===0&&n>=2;
 // A strong lethal strike triggers the authored finisher for the other object types.
 const criticalObject=!burning&&window.ZZObjectSprite?.available(z)===true&&n>=(z.boss?8:2);
 enemyDeath(z,criticalGreen||criticalObject);
 if(criticalGreen){burst(z.x+z.w/2,z.y+8,'#ff8ab4',7)}
 recordKill();foes.splice(foes.indexOf(z),1);drop(z);sfx(z.boss?'boss':'kill');if(z.boss){toast('BOSS DOWN · +1500');haptic([18,25,28])}}else if(!burning&&!z.boss&&n<2)sfx('hit');hud();if(foes.length===0)beginClear()}
function ignite(z){if(!foes.includes(z))return;z.burn=Math.max(z.burn,3);}
function hit(z,impact=null){combo++;damage(z,hero().damage*(has('power')?2:1),false,impact);if(has('fire')){ignite(z);for(const other of foes)if(Math.hypot(other.x+other.w/2-z.x-z.w/2,other.y+other.h/2-z.y-z.h/2)<82)ignite(other);sfx('fire')}}
function update(dt){if(mode==='over'&&failureScene){failureScene.t+=dt;clock+=dt;cameraKick*=Math.exp(-dt*10);if(failureScene.t>=1.8){failureScene=null;$('overlay').hidden=false}return}if(mode!=='playing'&&mode!=='clearing')return;clock+=dt;resistFlash=Math.max(0,resistFlash-dt);updateEnemyVisuals(dt);cameraKick*=Math.exp(-dt*23);if(cameraKick<.06)cameraKick=0;fx=fx.filter(f=>(f.t+=dt)<f.life);swing=Math.max(0,swing-dt);particles=particles.filter(p=>p.t>0);for(const p of particles){p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt}
if(mode==='playing'){killTimer=Math.max(0,killTimer-dt);if(!killTimer)killCombo=0;comboPop=Math.max(0,comboPop-dt)}
updateCrowd(dt);updateEmergencySupport(dt);
if(mode==='clearing'){clearTime+=dt;clearBurst+=dt;car+=(225-car)*Math.min(1,dt*3);if(fxEnabled&&clearBurst>.22){clearBurst=0;burst(35+Math.random()*380,160+Math.random()*200,['#ffe97a','#8df3c8','#f9a2de'][Math.floor(Math.random()*3)],14)}if(clearTime>=2.8)advanceStage();return}
if(!foes.length){beginClear();return}
const previousCar=car;if(keys.ArrowLeft||keys.a)target-=hero().speed*dt;if(keys.ArrowRight||keys.d)target+=hero().speed*dt;target=clamp(target,72,W-72);car+=clamp(target-car,-hero().speed*dt,hero().speed*dt);
for(const k of Object.keys(active)){active[k]-=dt;if(active[k]<=0){delete active[k];if(k==='dual'||k==='triple')balls=balls.slice(0,multiCount());sfx('expire');hud()}}skillUI();
for(const item of [...items]){item.y+=105*dt;if(item.y>=602&&item.y<=665&&Math.abs(item.x-car)<65){items.splice(items.indexOf(item),1);activate(item.k)}else if(item.y>H+20)items.splice(items.indexOf(item),1)}
if(balls[0]?.held){balls[0].x=car;balls[0].y=PY-17;return}
march(dt);for(const z of [...foes]){z.flash=Math.max(0,z.flash-dt);if(z.burn>0){z.burn-=dt;z.burnTick+=dt;z.spreadTick+=dt;if(z.spreadTick>=.8){z.spreadTick=0;for(const other of foes)if(other!==z&&other.burn<=0&&Math.hypot(other.x-z.x,other.y-z.y)<70)ignite(other)}if(z.burnTick>=.75){z.burnTick=0;damage(z,1,true);if(mode!=='playing')return}}if(foes.includes(z)&&z.y+z.h>=DEFENSE_Y){if(triggerLastStand())return;end(z.boss?'보스가 방어선을 돌파했습니다. 하트와 관계없이 패배합니다.':'좀비가 방어선을 돌파했습니다. 하트와 관계없이 패배합니다.',{type:'breach',x:z.x+z.w/2,y:z.y+z.h/2});return}}
for(const b of [...balls]){const radius=has('power')?16:8,rate=has('slow')?.66:1,steps=Math.max(1,Math.ceil(Math.max(Math.hypot(b.vx,b.vy)*dt*rate,Math.abs(car-previousCar))/4)),d=dt*rate/steps;
for(let s=0;s<steps;s++){const ox=b.x,oy=b.y;b.hitLock=Math.max(0,b.hitLock-d);b.x+=b.vx*d;b.y+=b.vy*d;if(b.x<20+radius){b.x=20+radius;b.vx=Math.abs(b.vx);sfx('wall')}if(b.x>430-radius){b.x=430-radius;b.vx=-Math.abs(b.vx);sfx('wall')}if(b.y<16+radius){b.y=16+radius;b.vy=Math.abs(b.vy);sfx('wall')}
for(const z of foes){if(b.lastHit===z&&b.hitLock>0)continue;if(b.x+radius>z.x&&b.x-radius<z.x+z.w&&b.y+radius>z.y&&b.y-radius<z.y+z.h){const impact={x:b.vx,y:b.vy};if(ox+radius<=z.x||ox-radius>=z.x+z.w){b.vx*=-1;b.x=ox}else{b.vy*=-1;b.y=oy}b.lastHit=z;b.hitLock=.1;hit(z,impact);if(mode!=='playing')return;break}}
if(b.vy>0&&oy+radius<=PY&&b.y+radius>=PY&&Math.abs(b.x-car)<hero().paddle+radius/2){const offset=clamp((b.x-car)/hero().paddle,-1,1),speed=Math.min(600,Math.hypot(b.vx,b.vy)+7),angle=offset*1.06;b.vx=Math.sin(angle)*speed;b.vy=-Math.cos(angle)*speed;b.y=PY-radius-1;swing=.22;combo=0;effect(b.x,PY,'#e8ff93',30);burst(b.x,PY,'#e4ff9c',8);sfx('racket');haptic(8)}
carCollision(b,radius,previousCar+(car-previousCar)*(s+1)/steps);
if(has('shield')&&b.vy>0&&b.y+radius>=675){b.y=675-radius;b.vy=-Math.abs(b.vy);sfx('shield');effect(b.x,675,'#a1fbe6',75,'SAVE!');burst(b.x,675,'#b9f684',10)}
if(!has('shield'))citizenCollision(b,radius);
if(b.y>H+20){lastLostBall={x:clamp(b.x,28,422),y:699};balls.splice(balls.indexOf(b),1);hud();break}}
b.trail.unshift({x:b.x,y:b.y});if(b.trail.length>13)b.trail.pop()}
if(!balls.length){lives--;effect(car,PY,'#ff7089',85,'MISS');sfx('miss');clearSkills();if(!lives){if(triggerLastStand()){lives=1;resetBalls();active.shield=4;hud();return}hud();end('마지막 공이 떨어져 하트가 모두 소진되었습니다.',{type:'ball',x:lastLostBall?.x||car,y:699});return}resetBalls();toast('공 낙하! · 하트 '+lives+'개 남음 · 탭해서 서브')}
}
function background(){const palette=[['#131d38','#1c2945','#273650','#5cd9de'],['#261a38','#352444','#463157','#e791e9'],['#162b32','#1d3940','#294952','#85e7bb']][(wave-1)%3];rect(0,0,W,H,palette[0]);for(let row=0;row<15;row++)for(let col=0;col<9;col++){let x=20+col*47,y=row*49,k=(row*7+col*13)%5;rect(x,y,45,47,palette[k%2+1]);rect(x,y,45,2,'#b2ced512');if(k===1){rect(x+7,y+25,11,2,'#111a30');rect(x+16,y+27,2,7,'#111a30')}}
for(let side of [0,432]){rect(side,0,18,H,'#101224');for(let y=0;y<H;y+=42){rect(side+4,y,10,24,palette[3]);rect(side+6,y+2,3,18,'#e4fbef')}}
g.globalAlpha=.22;for(let y=-60;y<H;y+=92)rect(222,y+(clock*12)%92,6,34,palette[3]);g.globalAlpha=1;g.strokeStyle=palette[3]+'30';g.lineWidth=2;g.strokeRect(29,27,392,520);
for(let i=0;i<24;i++){let x=25+(i*137)%400,y=(i*97+clock*9)%550;rect(x,y,2,2,palette[3]+'55')}
g.setLineDash([8,7]);g.strokeStyle='#ff947b99';g.beginPath();g.moveTo(23,DEFENSE_Y);g.lineTo(427,DEFENSE_Y);g.stroke();g.setLineDash([]);g.fillStyle='#ffc794aa';g.font='10px Arial, sans-serif';g.textAlign='left';g.fillText('DEFENSE LINE / 넘기면 끝!',30,579);rect(20,660,410,50,'#0d182a99');
if(has('slow')){g.strokeStyle='#86f2e050';g.strokeRect(24,22,402,535)}
}
function player(){let x=car;const h=hero(),win=mode==='clearing'||mode==='paused'&&resumeMode==='clearing';g.save();if(win)g.translate(0,-Math.abs(Math.sin(clearTime*7))*4);/* no baked vehicle ground shadow */rect(x-57,626,13,24,'#14251f');rect(x+44,626,13,24,'#14251f');cube(x-52,621,104,25,h.color,'#ffbc72','#54313a');rect(x-45,625,90,5,'#ff9c58');cube(x-27,612,53,18,'#182e2a','#3d5441','#18221d');heroSprite(x,600,1,win);rect(x-46,635,18,6,'#fff2b2');rect(x+29,635,18,6,'#fff2b2');rect(x-47,649,95,5,'#b1b59b');g.strokeStyle='#e6d399';g.lineWidth=6;g.beginPath();g.moveTo(x+14,611);g.lineTo(x+32,602);g.stroke();g.save();g.translate(x+34,PY-5);g.rotate(swing>0?-.25:0);g.strokeStyle='#e7c696';g.lineWidth=5;g.beginPath();g.ellipse(0,0,24,13,0,0,Math.PI*2);g.stroke();g.lineWidth=.8;g.strokeStyle='#f7f4dbaa';for(let i=-16;i<=16;i+=8){g.beginPath();g.moveTo(i,-9);g.lineTo(i,9);g.stroke()}for(let i=-6;i<=6;i+=6){g.beginPath();g.moveTo(-19,i);g.lineTo(19,i);g.stroke()}g.restore();g.strokeStyle=swing>0?'#e5ff9e':'#c9ed9366';g.lineWidth=swing>0?4:2;g.beginPath();g.moveTo(x-h.paddle,PY);g.lineTo(x+h.paddle,PY);g.stroke();g.restore()}
// Cosmetic poses only: no pose or death fragment participates in physics.
let enemyDeaths=[],enemyPieces=[];
const ENEMY_CLOTH=['#65535a','#242b39','#302139','#574b66','#68415a','#e4d6b0','#d49b39','#733e65'];
const fract=n=>n-Math.floor(n);
function enemyAnim(z){if(z.anim)return z.anim;const seed=(z.seed||0)*13.71+z.x*.31+z.y*.17+(z.form||0)*7.13;const r=n=>fract(Math.sin(seed+n*19.17)*43758.5453);return z.anim={type:Math.floor(r(1)*6),phase:r(2)*6.28,speed:2.5+r(3)*1.8,amp:.7+r(4)*.6,period:3+r(5)*3,side:r(6)>.5?1:-1,seed}}
function enemyPose(z){const a=enemyAnim(z),t=z.hitHold>0?z.hitAt:clock,b=z.boss,person=b?[1,3,2,5][z.bossForm||0]:a.type,speed=b?[1.7,3.2,2.3,2.7][z.bossForm||0]:a.speed,q=t*speed+a.phase,low=b&&z.hp/z.max<.3?1.35:1,amp=a.amp*low*(fxEnabled?1:.6),cycle=Math.floor((t+a.phase)/a.period),u=(t+a.phase)%a.period,gate=fract(Math.sin(a.seed+cycle*8.3)*919.1),twitch=(person===2||person===5)&&u<.2?Math.sin(u*65)*.08:0,roar=b&&u>.5&&u<1.2?Math.sin((u-.5)/.7*Math.PI):0;
const hit=clamp((z.recoil||0)/.22,0,1),dx=z.impactX||0,dy=z.impactY||-1,neighbor=(z.flinch||0)/.3;
return {lean:clamp(Math.sin(q)*(person===0?.068:.037)*amp+twitch+neighbor*.035*(z.flinchSide||1)+hit*dx*.06,-.13,.13),bob:Math.sin(q*1.8)*.8*amp,head:clamp(Math.sin(q-.65)*.045*amp+(person===4?.04:0)*a.side+twitch*(person===2?1.3:.8)-hit*.09, -.16,.16),left:Math.sin(q*.91)*.24*amp+(person===1?.28:person===3?-.28:0)+hit*.35,right:Math.sin(q*1.13+1.8)*.24*amp+(person===3?-.3:0)-hit*.3,shoulder:Math.sin(q*2.31)*.7+roar*1.5,jaw:clamp((person===1?2:person===5?2.5:.4)+Math.max(0,Math.sin(q*.64))*1.7+(gate>.4&&u<.5?Math.sin(u*42)*.7:0)+roar*4,0,7),lidL:person===4?4:((gate<.65&&u<.23)?7*Math.sin(u/.23*Math.PI):1),lidR:person===1?3:((gate>.65&&u>.3&&u<.53)?8*Math.sin((u-.3)/.23*Math.PI):0),eye:gate>.45&&u>1.3&&u<1.7?a.side*2:0,legL:Math.sin(q+1.1)*1.3,legR:Math.sin(q*.94+3)*1.1,hit,dx,dy,roar};}
function enemyReaction(z,n,impact){const length=Math.hypot(impact?.x??0,impact?.y??-1)||1;z.impactX=(impact?.x??0)/length;z.impactY=(impact?.y??-1)/length;z.recoil=.22;z.hitHold=z.boss?.065:.04;z.hitAt=clock;if(n>=2||z.boss)for(const other of foes){if(other!==z&&Math.hypot(other.x+other.w/2-z.x-z.w/2,other.y+other.h/2-z.y-z.h/2)<100){other.flinch=.3;other.flinchSide=other.x<z.x?-1:1}}}
function enemyDeath(z,critical=false){
 enemyAnim(z);
 const objectSprite=window.ZZObjectSprite?.available(z)===true;
 const greenSprite=!z.boss&&(z.form??0)===0&&window.ZZGreenDeath?.ready===true;
 const spriteMode=objectSprite||greenSprite;
 const split=objectSprite?(z.boss?(critical?.94:.78):(critical?.58:.52)):(greenSprite?(critical?.580:.520):(critical?.580:(z.boss?.32:.12)));
 enemyDeaths.push({z:{...z,flash:.1},critical,spriteMode,t:0,split,done:false});if(enemyDeaths.length>24)enemyDeaths.shift()}
function scatterEnemy(d){const z=d.z,sc=z.boss?2:1,a=enemyAnim(z),count=z.boss&&fxEnabled?20:6;for(let i=0;i<count;i++){const part=i<6?i:6,r=fract(Math.sin(a.seed+i*17.31)*4831.71),angle=-Math.PI+r*Math.PI*2,speed=(z.boss?180:70)+r*(z.boss?170:90),center=[[16.5,14],[16.5,35],[-1,28],[34,28],[8,41],[27,41]][i%6];enemyPieces.push({z,part,criticalGreen:!!d.critical,x:z.x+center[0]*sc,y:z.y+center[1]*sc,vx:Math.cos(angle)*speed,vy:-90-Math.abs(Math.sin(angle))*speed,angle:0,spin:(r-.5)*12,t:0,life:z.boss?1.25:.7,sc,color:i%2?TYPES[z.kind].color:ENEMY_CLOTH[z.boss?[3,4,7,1][z.bossForm||0]:z.form||0]})}if(enemyPieces.length>160)enemyPieces.splice(0,enemyPieces.length-160);effect(z.x+z.w/2,z.y+z.h/2,TYPES[z.kind].top,z.boss?150:48);burst(z.x+z.w/2,z.y+z.h/2,'#c9b99a',z.boss?24:8);if(z.boss){sfx('bosskill');haptic([18,25,28])}}
function updateEnemyVisuals(dt){bazookaBlasts=bazookaBlasts.filter(b=>(b.t+=dt)<b.life);for(const z of foes){z.recoil=Math.max(0,(z.recoil||0)-dt);z.hitHold=Math.max(0,(z.hitHold||0)-dt);z.flinch=Math.max(0,(z.flinch||0)-dt)}for(const d of enemyDeaths){d.t+=dt;if(!d.done&&d.t>=d.split){d.done=true;
 // Final bitmap already depicts lying down / cute brain debris; do not duplicate
 // the old procedural blast or turn a normal backward fall into a side explosion.
 if(!d.spriteMode)scatterEnemy(d)
}}enemyDeaths=enemyDeaths.filter(d=>!d.done);for(const p of enemyPieces){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=420*dt;p.angle+=p.spin*dt}enemyPieces=enemyPieces.filter(p=>p.t<p.life)}
// Original ZOMBIE ZERO mascot critical death: hinged black head lid reveals
// a bright pink brain. Fixed front/elevated-top gameplay camera; NO floor shadow.
// This only changes the cosmetic death queue (never HP, scoring or colliders).
function drawCriticalGreenDeath(d){
 const z=d.z,t=clamp(d.t/d.split,0,1),open=clamp((t-.06)/.29,0,1);
 const rise=clamp((t-.27)/.3,0,1),fall=clamp((t-.42)/.46,0,1);
 g.save();g.translate(z.x+z.w/2,z.y+23);
 g.translate(0,fall*11);g.scale(1+fall*.12,1-fall*.52);
 g.translate(-17,-23);
 // Feet and clothes, held under the face: recognizable as the green mascot.
 rect(5,30,23,10,'#d84851');rect(7,37,7,6,'#25272b');rect(23,37,7,6,'#25272b');
 rect(-4,27,9,7,'#66ce5c');rect(31,27,9,7,'#66ce5c');
 rect(0,0,34,30,'#58c65b');rect(0,1,34,5,'#7fed77');
 // Top cavity must be visible in the game's slight top-down camera.
 if(open>0){rect(3,1,28,Math.max(1,Math.round(9*open)),'#23873f');rect(6,2,22,Math.max(1,Math.round(6*open)),'#17452b')}
 // Two oversized original eyes; two pink pupils + strong separate eyebrows.
 g.fillStyle='#fffaf5';g.beginPath();g.ellipse(9,18,7,9,0,0,Math.PI*2);g.ellipse(25,18,7,9,0,0,Math.PI*2);g.fill();
 rect(9,17,3,5,'#ee5a78');rect(24,17,3,5,'#ee5a78');
 rect(3,9,12,3,'#312b29');rect(20,9,11,3,'#312b29');
 rect(14,24,7,5,'#e95476');rect(3,27,4,6,'#fff1e7');rect(28,27,4,6,'#fff1e7');
 // Pink brain rises from under the hinged lid. No background shadow plate.
 if(rise>0){
  g.save();g.translate(17,2-6*rise);
  g.fillStyle='#fa5b91';g.beginPath();
  g.arc(-3.3,2,3,0,Math.PI*2);g.arc(0,0,3.8,0,Math.PI*2);g.arc(3.3,2,3,0,Math.PI*2);g.fill();
  g.strokeStyle='#c93168';g.lineWidth=1.3;g.beginPath();g.moveTo(-3,3);g.lineTo(-1,1);g.lineTo(1,3);g.lineTo(3,1);g.stroke();
  g.restore();
 }
 // Rigid rectangular black skull cap rotates away from the cavity.
 g.save();g.translate(17,-1);g.rotate(-open*.62);
 rect(-17,-6-7*open,34,9,'#302c29');rect(-15,-6-7*open,30,2,'#403b36');
 g.restore();
 if(t>.49){const glow=Math.max(0,1-Math.abs(t-.68)/.3);
  g.globalAlpha=glow*.85;g.strokeStyle='#ff4d9c';g.lineWidth=2;
  for(let i=0;i<4;i++){const a=i*Math.PI/2;g.beginPath();g.moveTo(17+Math.cos(a)*15,2+Math.sin(a)*11);g.lineTo(17+Math.cos(a)*20,2+Math.sin(a)*14);g.stroke()}
 }
 g.restore();
}
function drawEnemyDeaths(){for(const d of enemyDeaths){
 if(d.spriteMode&&window.ZZObjectSprite?.available(d.z)===true){
   window.ZZObjectSprite.drawDeath(g,d.z,d.critical,d.t,d.split);
 }else if(d.spriteMode&&window.ZZGreenDeath?.ready===true){
   window.ZZGreenDeath.draw(g,d.z,d.critical,d.t);
 }else if(d.critical)drawCriticalGreenDeath(d);
 else zombie(d.z,d)
}for(const p of enemyPieces){g.save();g.globalAlpha=Math.min(1,(p.life-p.t)/.3);g.translate(p.x,p.y);g.rotate(p.angle);g.scale(p.sc,p.sc);const f=p.z.boss?[3,4,7,1][p.z.bossForm||0]:p.z.form||0,col=TYPES[p.z.kind],pose={jaw:2,lidL:3,lidR:0,eye:0};// When original sprites are active, scatter actual sampled character pieces
// instead of switching to the older generic procedural humanoid fragments.
const cast=window.ZZObjectCast,atlas=cast&&cast.gameplayCompatible===true?cast.gameplayAtlas:null;
const artIndex=cast?(p.z.boss?cast.bossIndex[p.z.bossForm??0]:cast.enemyIndex[p.z.form??0]):undefined;
if(p.criticalGreen){
 if(p.part===0){rect(-13,-5,26,8,'#302c29');rect(-11,-5,22,2,'#47413b')}
 else if(p.part===1){g.fillStyle='#f65d92';g.beginPath();g.arc(-2,1,3.4,0,Math.PI*2);g.arc(2,-1,3.9,0,Math.PI*2);g.fill();g.strokeStyle='#c22c68';g.lineWidth=1;g.beginPath();g.moveTo(-2,0);g.lineTo(2,2);g.stroke()}
 else if(p.part<6){rect(-5,-5,10,10,p.part===5?'#d84851':'#61cf61');rect(-5,-5,10,3,'#91ef7a')}
}else if(p.part<6&&atlas&&atlas.complete&&atlas.naturalWidth===256&&Number.isInteger(artIndex)){
 const cuts=[[5,5,54,33],[16,35,32,20],[0,30,25,25],[39,30,25,25],[12,49,24,15],[37,49,24,15]];
 const cut=cuts[p.part],ax=artIndex%4*64+cut[0],ay=Math.floor(artIndex/4)*64+cut[1];
 g.drawImage(atlas,ax,ay,cut[2],cut[3],-cut[2]/2,-cut[3]/2,cut[2],cut[3]);
}else if(p.part===0){g.translate(-16.5,-14);enemyHead(p.z,f,col,col.color,pose)}else if(p.part===1){g.translate(-16.5,-35);enemyTorso(f,col)}else if(p.part===2||p.part===3){g.translate(p.part===2?1:-34,-28);enemyArm(f,col,col.color,p.part===2?0:1,0,0)}else if(p.part<6){rect(-5,-3,10,6,'#273748')}else{rect(-3,-2,6,4,p.color);rect(-3,-2,6,1,col.top)}g.restore()}}
function enemyTorso(f,p){rect(5,30,23,10,ENEMY_CLOTH[f]);if(f===0){rect(6,32,4,7,'#a89478');rect(21,34,6,2,'#9b6d70')}if(f===2){rect(2,30,31,9,'#252638');for(let i=0;i<3;i++)rect(5+i*10,32,3,3,'#bfc8c7')}if(f===3)rect(18,32,10,5,'#b98495');if(f===5){rect(5,30,24,10,'#d9d4b5');rect(17,31,3,8,'#637998')}if(f===6)rect(15,32,5,6,'#202e36');if(f===7){rect(-5,29,43,11,'#944e77');rect(0,31,33,6,'#312b47');for(let i=0;i<5;i++)rect(2+i*6,31,4,4,'#f4d9a5')}}
function enemyArm(f,p,skin,side,angle,lift){const x=side?34:-1;g.save();g.translate(x,24+lift);g.rotate(angle*(side?-1:1));g.translate(-x,-24);rect(side?30:-5,side?23:24,8,9,skin);rect(side?31:-4,31,6,3,p.side);if(f===2&&!side)rect(-5,27,8,5,'#323145');if(f===4)for(let i=0;i<3;i++)rect((side?31:-5)+i*3,side?29:30,2,6,'#e2cdab');if(f===7){rect(side?32:-8,side?26:27,side?11:10,side?13:12,'#708995');rect(side?34:-6,side?29:30,6,side?7:6,'#252c49')}g.restore()}
function enemyHead(z,f,p,skin,a){
rect(0,0,33,29,skin);rect(3,-3,27,4,p.top);rect(0,26,33,3,p.side);
rect(2,6,13,12,'#693c54');rect(19,5,12,13,'#693c54');rect(4,8,9,8,'#f7e6cb');rect(21,7,8,10,'#f7e6cb');rect(8+a.eye,10,3,5,'#5c7899');rect(23+a.eye,10,3,4,'#b44251');rect(4,8,9,a.lidL,skin);rect(21,7,8,a.lidR,skin);rect(13,17,6,3,p.side);
rect(6,21,23,10+a.jaw,'#533043');rect(9,22,4,4,'#fff0c2');rect(20,22,4,3,'#fff0c2');rect(13,28+a.jaw,9,5,'#d76c85');rect(6,31+a.jaw,23,2,p.side);rect(1,16,4,3,p.side);rect(27,19,5,3,p.side);
if(f===0){rect(0,-2,33,6,'#3d353b');rect(3,1,5,7,'#3d353b')}
if(f===1){rect(4,19,27,18+a.jaw,'#543047');rect(6,21,23,12+a.jaw,'#391c35');for(let i=0;i<4;i++)rect(7+i*6,21,4,4,'#efdfb6');rect(11,29+a.jaw,15,6,'#d86087');rect(8,36+a.jaw,23,3,p.side);rect(8,32+a.jaw,3,3,'#f7e4c2')}
if(f===2){rect(12,-8,9,12,'#e8848a');rect(15,-12,6,6,'#f4ad67')}
if(f===3){rect(1,-4,30,7,'#776255');rect(20,0,12,10,'#d58d9f');rect(-7,8,7,4,'#c3bc91');rect(33,8,7,4,'#c3bc91');for(let i=0;i<4;i++){rect(18+i*3,3+i*2,5,1,'#603c56');rect(19+i*3,2+i*2,1,4,'#e0c6a6')}}
if(f===4){poly([[0,7],[-4,-10],[11,0]],skin);poly([[23,0],[37,-10],[33,8]],skin);poly([[2,4],[0,-5],[8,2]],'#ac5c78');poly([[26,2],[34,-5],[31,5]],'#ac5c78');rect(9,15,16,9,p.side);rect(13,15,8,4,'#522d43');rect(4,22,26,12+a.jaw,'#50263e');poly([[7,22],[10,29],[13,22]],'#fff2cd');poly([[23,22],[26,29],[29,22]],'#fff2cd');rect(14,29+a.jaw,10,8,'#e07688')}
if(f===5){rect(3,-5,28,8,'#e49fa7');for(let i=0;i<4;i++)rect(5+i*6,-3,2,5,'#ac617e');rect(6,10,22,3,'#342b4a');rect(6,8,9,7,'#bdd0bb');rect(20,8,9,7,'#bdd0bb');rect(6,8,9,a.lidL,p.side);rect(20,8,9,a.lidR,p.side)}
if(f===6){rect(-2,-4,37,7,'#e8ba5b');rect(-2,0,4,29,'#cf9740');rect(32,0,4,29,'#cf9740');rect(10,20,17,11,'#3b4a55');rect(8,22,5,6,'#b5c9b9');rect(25,22,5,6,'#b5c9b9');rect(13,23+Math.min(1,a.jaw/4),11,2,'#869b8c')}
if(f===7){rect(2,-5,29,8,'#ecaa78');for(let i=0;i<4;i++)rect(5+i*6,-3,2,5,'#a35b70')}
}
function zombie(z,death=null){
const originalObject=window.ZZObjectSprite;
if(!death&&originalObject?.draw(g,z,clock)){
 // The original colours are character identity, not HP tint.
 if(!z.boss){
  g.fillStyle='#131a22bb';g.fillRect(z.x+3,z.y+z.h+2,31,4);
  for(let i=0;i<z.kind+1;i++){g.fillStyle=TYPES[z.kind].color;g.fillRect(z.x+6+i*5,z.y+z.h+3,3,2)}
 }else{
  rect(z.x-14,z.y-32,100,8,'#211e27');
  rect(z.x-14,z.y-32,100*Math.max(0,z.hp/z.max),8,'#f67968');
  g.fillStyle='#ffdec5';g.font='bold 11px Arial, sans-serif';g.textAlign='center';
  g.fillText(BOSS_FORMS[z.bossForm??0]+' '+Math.ceil(Math.max(0,z.hp))+'/'+z.max,z.x+36,z.y-38);
 }
 if(z.burn>0){g.save();g.globalAlpha=.8;g.fillStyle='#ffb066';
  for(let i=0;i<3;i++)g.fillRect(z.x+6+i*11,z.y-9+Math.sin(clock*13+i)*4,3,9);
  g.restore()}
 return;
}
const f=z.boss?[3,4,7,1][z.bossForm??0]:(z.form??0),sc=z.boss?2:1,p=TYPES[z.kind],skin=z.flash>0?'#fff':p.color,a=enemyPose(z);g.save();g.translate(z.x,z.y);g.scale(sc,sc);/* no baked character ground shadow; gameplay floor handles depth */
// Local pivots keep the sprite centered on its unchanged collision rectangle.
g.translate(16.5,25);g.rotate(a.lean);g.translate(a.dx*a.hit*1.5,a.dy*a.hit*1.5+a.bob);let sx=1+a.hit*(Math.abs(a.dy)-Math.abs(a.dx))*.1,sy=1-a.hit*(Math.abs(a.dy)-Math.abs(a.dx))*.1;
if(death){const t=death.t/death.split;const squash=t<.45?Math.sin(t/.45*Math.PI/2):1-(t-.45)/.55;sx*=1+squash*(z.boss?.2:.14);sy*=1-squash*.18;if(z.boss&&t>.55){sx*=1+(t-.55)*.28;sy*=1+(t-.55)*.28}/* no sideways flop: front/back projected collapse */}g.scale(sx,sy);g.translate(-16.5,-25);
// Original art pilot: render the canonical green cube zombie from its transparent
// PNG bitmap. Keep existing pose transforms / collision coordinates unchanged.
// Other types and missing/failed bitmap loads fall back to procedural art.
// Canonical cast atlas: all 10 object zombies use their original identity
// irrespective of numeric HP tier. The old procedural version remains a fallback.
const cast=window.ZZObjectCast;
// The supplied isometric collection atlas is a reference, NOT gameplay art.
const atlas=cast&&cast.gameplayCompatible===true?cast.gameplayAtlas:null;
const artIndex=cast?(z.boss?cast.bossIndex[z.bossForm??0]:cast.enemyIndex[z.form??0]):undefined;
if(atlas&&atlas.complete&&atlas.naturalWidth===256&&Number.isInteger(artIndex)){
 g.save();
 if(z.flash>0)g.filter='brightness(1.7)';
 g.drawImage(atlas,(artIndex%4)*64,Math.floor(artIndex/4)*64,64,64,-4,-8,41,52);
 g.restore();
 if(!z.boss){
  // Identity colour never changes with hit-points; tiny markers encode tier.
  g.fillStyle='#131a22bb';g.fillRect(6,44,31,4);
  for(let i=0;i<z.kind+1;i++){g.fillStyle=TYPES[z.kind].color;g.fillRect(9+i*5,45,3,2)}
 }
 if(z.burn>0){g.globalAlpha=.8;for(let i=0;i<3;i++){let x=4+i*12,h=12+Math.sin(clock*14+i)*5;poly([[x-5,39],[x,39-h],[x+4,31],[x+8,40]],'#ff793c');rect(x,34,4,5,'#ffe68b')}g.globalAlpha=1}
 g.restore();
 if(z.boss&&!death){rect(z.x-14,z.y-32,100,8,'#211e27');rect(z.x-14,z.y-32,100*Math.max(0,z.hp/z.max),8,'#f67968');g.fillStyle='#ffdec5';g.font='bold 11px Arial, sans-serif';g.textAlign='center';g.fillText((BOSS_FORMS[z.bossForm??0])+' '+Math.ceil(Math.max(0,z.hp))+'/'+z.max,z.x+36,z.y-38)}
 return;
}
// Actual top/front-oriented sprite pilot: same approved artwork as normal and
// critical death, so the green enemy does not change drawing style on death.
// No ground shadow, no isometric artwork; physics/HP colliders remain unchanged.
const greenSprite=window.ZZGreenDeath;
if(!death&&!z.boss&&(z.form??0)===0&&greenSprite?.ready===true){
 g.save();
 if(z.flash>0)g.filter='brightness(1.55)';
 greenSprite.draw(g,{x:0,y:0,w:33,h:44},false,0);
 g.restore();
 g.fillStyle='#131a22ba';g.fillRect(6,44,31,4);
 for(let i=0;i<z.kind+1;i++){g.fillStyle=TYPES[z.kind].color;g.fillRect(9+i*5,45,3,2)}
 if(z.burn>0){g.globalAlpha=.8;for(let i=0;i<3;i++){let x=4+i*12,h=12+Math.sin(clock*14+i)*5;poly([[x-5,39],[x,39-h],[x+4,31],[x+8,40]],'#ff793c');rect(x,34,4,5,'#ffe68b')}g.globalAlpha=1}
 g.restore();return;
}
// Legacy isometric green-zombie bitmap intentionally disabled in current gameplay.
// A front-oriented, slightly elevated sprite atlas is required before enabling art.
rect(3,38+a.legL,10,6,'#273748');rect(22,38+a.legR,10,6,'#273748');enemyTorso(f,p);
enemyArm(f,p,skin,0,a.left+(death?Math.sin(death.t*60)*.3:0),a.shoulder);enemyArm(f,p,skin,1,a.right-(death?Math.sin(death.t*49)*.3:0),-a.shoulder*.7);
g.save();g.translate(16.5,23);g.rotate(a.head);g.translate(-16.5,-23-a.hit*1.3);enemyHead(z,f,p,skin,a);g.restore();
if(z.boss){rect(2,34,4,4,'#ffd27b');rect(26,34,4,4,'#ffd27b')}
if(z.burn>0){g.globalAlpha=.8;for(let i=0;i<3;i++){let x=4+i*12,h=12+Math.sin(clock*14+i)*5;poly([[x-5,39],[x,39-h],[x+4,31],[x+8,40]],'#ff793c');rect(x,34,4,5,'#ffe68b')}g.globalAlpha=1}g.restore();if(z.boss&&!death){rect(z.x-14,z.y-32,100,8,'#211e27');rect(z.x-14,z.y-32,100*Math.max(0,z.hp/z.max),8,'#f67968');g.fillStyle='#ffdec5';g.font='bold 11px Arial, sans-serif';g.textAlign='center';g.fillText((BOSS_FORMS[z.bossForm??0])+' '+Math.ceil(Math.max(0,z.hp))+'/'+z.max,z.x+36,z.y-38)}}
function drawIcon(k,x,y){g.save();g.translate(x-12,y-12);g.scale(.75,.75);g.strokeStyle=SKILLS[k].color;g.lineWidth=2.5;g.lineCap='round';g.lineJoin='round';const circle=(x,y,r)=>{g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke()};if(k==='dual'){circle(9,12,5);circle(23,20,5)}if(k==='triple'){circle(16,7,4);circle(7,23,4);circle(25,23,4)}if(k==='power'){circle(16,16,12);g.stroke(new Path2D('M17 6 10 18H16L15 26 23 13H17Z'))}if(k==='fire')g.stroke(new Path2D('M17 3C21 12 13 12 19 17L24 11C33 23 25 30 16 29S3 21 8 13L11 18C15 14 11 10 17 3Z'));if(k==='slow'){circle(16,17,11);g.stroke(new Path2D('M16 10V18L22 21M12 2H20M16 2V4'))}if(k==='bazooka')g.stroke(new Path2D('M5 21 20 6 27 13 12 28ZM18 8 24 14M6 22 4 28 10 26M19 3 21 1M28 10 31 9M26 3 29 0'));if(k==='shield')g.stroke(new Path2D('M16 3 27 7V17C27 23 16 29 16 29S5 23 5 17V7ZM10 16 14 20 22 11'));g.restore()}
function draw(){if(!fxRenderer&&window.FXRenderer)fxRenderer=new window.FXRenderer(W,H);if(fxRenderer)fxRenderer.begin();g.clearRect(0,0,W,H);g.save();if(fxEnabled&&cameraKick>0)g.translate(Math.sin(clock*115)*cameraKick*.7,Math.cos(clock*139)*cameraKick*.4);background();drawCrowd();for(const z of foes)zombie(z);drawEnemyDeaths();if(has('shield'))luminous(()=>{g.shadowColor='#b9f684';g.shadowBlur=15;rect(21,675,408,4,'#b9f684');g.shadowBlur=0});player();drawBazooka();for(const item of items){g.save();g.translate(item.x,item.y);g.rotate(Math.sin(clock*3+item.phase)*.08);rect(-19,-19,38,38,'#142b29');g.strokeStyle=SKILLS[item.k].color;g.lineWidth=2;g.strokeRect(-18,-18,36,36);drawIcon(item.k,0,0);g.restore();if(fxEnabled){g.globalAlpha=.45;rect(item.x-1,item.y-33,3,7,SKILLS[item.k].color);rect(item.x-4,item.y-30,9,2,SKILLS[item.k].color);g.globalAlpha=1}}
drawKillCombo();for(const b of balls){const r=has('power')?16:8,col=has('fire')?'#ff985f':'#d5f45a';b.trail.forEach((p,i)=>{g.globalAlpha=(1-i/b.trail.length)*.35;g.fillStyle=col;g.beginPath();g.arc(p.x,p.y,Math.max(1,r-i*.5),0,Math.PI*2);g.fill()});g.globalAlpha=1;g.shadowColor=col;g.shadowBlur=has('fire')?25:15;g.fillStyle=col;g.beginPath();g.arc(b.x,b.y,r,0,Math.PI*2);g.fill();g.shadowBlur=0;g.strokeStyle='#ffffcf';g.lineWidth=1.5;g.beginPath();g.arc(b.x-r*.7,b.y,r*.85,-1.1,1.1);g.stroke();g.beginPath();g.arc(b.x+r*.7,b.y,r*.85,2,4.3);g.stroke();if(b.held&&mode==='playing'){g.setLineDash([4,6]);g.strokeStyle='#d8fa6370';g.beginPath();g.moveTo(b.x,b.y-22);g.lineTo(b.x+32,b.y-106);g.stroke();g.setLineDash([])}}if(particles.length)luminous(()=>{for(const p of particles){g.globalAlpha=Math.min(1,p.t*2);rect(p.x,p.y,p.size,p.size,p.color)}g.globalAlpha=1});drawJunk();if(fx.length)luminous(()=>drawEffects());if(fxEnabled&&fxRenderer)fxRenderer.composite(g);drawEffects(true);drawBubbles();g.restore();drawDanger();drawOutcome();if(mode==='clearing'||mode==='paused'&&resumeMode==='clearing')drawClear();}
function frame(t){let dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();music();requestAnimationFrame(frame)}
function heroSprite(x,y,scale=1,win=false){let h=hero();
 const cast=window.ZZObjectCast,atlas=cast&&cast.gameplayCompatible===true?cast.gameplayAtlas:null,ix=cast&&cast.heroIndex[selectedHero];
 if(atlas&&atlas.complete&&atlas.naturalWidth===256&&Number.isInteger(ix)){
  g.save();g.translate(x,y);g.scale(scale,scale);
  if(win)g.translate(0,-Math.abs(Math.sin(clearTime*7))*4);
  g.drawImage(atlas,(ix%4)*64,Math.floor(ix/4)*64,64,64,-28,-44,56,65);
  g.restore();return;
 }
 g.save();g.translate(x,y);g.scale(scale,scale);rect(-14,-3,29,22,h.color);rect(-10,4,4,10,'#fcf2cb');rect(5,4,4,10,'#fcf2cb');rect(-19,-27,37,29,h.skin);rect(-20,-31,38,9,h.hair);if(h.id==='ace'){rect(-22,-34,39,10,'#2b7181');rect(-23,-26,47,5,'#214757')}if(h.id==='ruby'){rect(-29,-24,10,13,h.hair);rect(18,-24,10,13,h.hair);rect(-25,-25,6,3,'#d3ef95');rect(20,-25,6,3,'#d3ef95');rect(-20,-29,6,13,h.hair)}if(h.id==='liam'){poly([[-17,-28],[-18,-38],[-9,-32],[-5,-41],[3,-33],[13,-38],[17,-28]],h.hair);rect(-20,-25,39,4,'#fcf0b5')}
if(win){rect(-12,-15,9,2,'#533a39');rect(-10,-17,5,2,'#533a39');rect(4,-15,9,2,'#533a39');rect(6,-17,5,2,'#533a39');rect(-8,-7,18,6,'#7d4546');rect(-6,-7,14,3,'#fff5d3');let waveY=-24+Math.sin(clearTime*14)*5;rect(-27,-2,9,7,h.skin);rect(-29,waveY,7,25-waveY,h.color);rect(-30,waveY-5,9,9,h.skin);rect(18,-6,11,7,h.skin);rect(24,-23,6,22,h.skin)}else{rect(-12,-18,9,10,'#fff4dc');rect(4,-18,9,10,'#fff4dc');rect(-7,-15,3,6,'#34404b');rect(5,-15,3,6,'#34404b');rect(-3,-3,8,2,'#945b4d')}g.restore()}
function portrait(h){
 const cast=window.ZZObjectCast,atlas=cast&&cast.gameplayCompatible===true?cast.gameplayAtlas:null;
 if(atlas&&cast){const ix=cast.heroIndex[HEROES.indexOf(h)];if(Number.isInteger(ix))return '<span role="img" aria-label="'+h.name+'" class="hero-portrait" style="display:block;width:64px;height:64px;margin:0 auto;background-image:url('+atlas.src+');background-size:256px 256px;background-repeat:no-repeat;background-position:-'+(ix%4*64)+'px -'+(Math.floor(ix/4)*64)+'px"></span>'}
 let hair=h.id==='ruby'?'<path fill="'+h.hair+'" d="M4 19h10v18H4zm46 0h10v18H50z"/>':h.id==='liam'?'<path fill="'+h.hair+'" d="M15 17V4l10 7 6-10 7 10 11-6v13Z"/>':'<path fill="#276477" d="M13 7h36v12H10v5h46v-5h-7"/>';return '<svg class="hero-portrait '+h.id+'" viewBox="-8 -10 80 80" shape-rendering="crispEdges" aria-hidden="true"><g class="portrait-body"><path fill="'+h.color+'" d="M13 44h38v20H13z"/><path fill="'+h.skin+'" d="M14 16h36v31H14z"/><path fill="'+h.hair+'" d="M14 10h36v11H14z"/>'+hair+'<path fill="#fff5db" d="M20 27h9v10h-9zm17 0h9v10h-9z"/><path class="portrait-eyes" fill="#233344" d="M25 29h4v6h-4zm12 0h4v6h-4z"/><path fill="#944f45" d="M27 41h12v3H27z"/><g class="portrait-left-arm"><path fill="'+h.color+'" d="M7 44h9v14H7z"/><path fill="'+h.skin+'" d="M5 54h11v9H5z"/></g><g class="portrait-right-arm"><path fill="'+h.color+'" d="M48 44h9v14h-9z"/><path fill="'+h.skin+'" d="M48 54h11v9H48z"/></g><g class="portrait-wink"><path fill="'+h.skin+'" d="M35 26h13v12H35z"/><path fill="#233344" d="M37 31h9v3h-9z"/></g><path class="portrait-heart" fill="#ff88af" d="M53 15h5v-3h5v3h4v7l-7 7-7-7z"/></g></svg>'}
function renderHeroes(){for(let i=0;i<HEROES.length;i++){let h=HEROES[i],el=$('hero-'+i);el.innerHTML=portrait(h)+'<b>'+h.name+'</b><small>'+h.role+'</small><span>'+h.desc+'</span>';el.setAttribute('aria-pressed',String(i===selectedHero));el.onclick=()=>{if(mode!=='menu'&&mode!=='over')return;selectedHero=i;renderHeroes();draw()}}$('hero-stats').textContent=hero().stats;$('start').innerHTML=hero().name+'로 시작 <span>↗</span>'}

// Kill streak is independent of the rally hit counter and uses active play time.
let killCombo=0,killTimer=0,comboPop=0;
function recordKill(){
 killCombo=killTimer>0?killCombo+1:1;killTimer=6;comboPop=.22;
 if(killCombo%5!==0)return;
 const p=citizens.filter(p=>!p.alive&&p.absent>=8).sort((a,b)=>b.absent-a.absent)[0];
 if(!p)return;
 p.alive=true;p.dying=0;p.absent=0;p.returning=1.1;cheerTime=1.8;
 citizenCue(p,true);effect(p.x,p.y-12,'#91f4d0',65);burst(p.x,p.y-10,'#91f4d0',24);sfx('return');toast('시민 +1 복귀! · '+killCombo+' COMBO');
}
function drawKillCombo(){
 if(killCombo<2||!['playing','clearing','paused'].includes(mode))return;
 const tier=killCombo>=30?4:killCombo>=20?3:killCombo>=10?2:killCombo>=5?1:0;
 const color=['#d5f48d','#8fe9db','#ffd57a','#f7a6d5','#b8b0ff'][tier];
 const praise=['NICE!','GREAT!','AMAZING!','UNSTOPPABLE!','LEGENDARY!'][tier];
 g.save();g.translate(W/2,48);const scale=1+comboPop*.25;g.scale(scale,scale);
 g.globalAlpha=Math.min(1,killTimer/.4);rect(-88,-34,176,71,'#111b3066');
 g.textAlign='center';g.fillStyle=color;g.font='italic bold 25px Arial, sans-serif';g.fillText(killCombo+' COMBO',0,-7);
 g.font='bold 12px Arial, sans-serif';g.fillText(praise,0,12);rect(-74,24,148,3,'#354153');rect(-74,24,148*killTimer/6,3,color);g.restore();
}

const citizens=Array.from({length:18},(_,i)=>({x:26+i*23.4,y:682+(i%2)*5,skin:['#ffd6a4','#c48b68','#f3bb92','#92624f'][i%4],shirt:['#e69a72','#78b5cc','#b692d6','#e7cd72','#a5d398','#e58da7'][i%6],hair:['#49332f','#d89343','#d8d8cc','#333d50','#875645'][i%5],style:i%6,phase:i*.9,alive:true,dying:0}));
function resetCitizens(){for(const p of citizens){p.alive=true;p.dying=0;p.absent=0;p.returning=0;p.shooting=0}bubbles=[];bubbleTimer=.25}
function haptic(pattern){if(!fxEnabled||!touchUsed||typeof navigator==='undefined'||typeof navigator.vibrate!=='function')return;const now=Date.now();if(now-lastBuzz<100)return;lastBuzz=now;try{navigator.vibrate(pattern)}catch{}}
function circleRect(x,y,r,box){const dx=x-clamp(x,box.x,box.x+box.w),dy=y-clamp(y,box.y,box.y+box.h);return dx*dx+dy*dy<=r*r}
function upwardBounce(b,center,half,top,r){const speed=clamp(Math.hypot(b.vx,b.vy),350,600),angle=clamp((b.x-center)/half,-1,1)*.95;b.vx=Math.sin(angle)*speed;b.vy=-Math.max(210,Math.cos(angle)*speed);b.y=top-r-1;b.lastHit=null;b.hitLock=0;combo=0;b.trail=[]}
function carCollision(b,r,cx=car){const boxes=[{x:cx-52,y:621,w:104,h:33},{x:cx-57,y:626,w:13,h:24},{x:cx+44,y:626,w:13,h:24}];if(!boxes.some(box=>circleRect(b.x,b.y,r,box)))return false;upwardBounce(b,cx,57,621,r);swing=.18;effect(b.x,623,'#fff49a',38,'NICE SAVE');burst(b.x,625,'#f8d87d',7);sfx('car');haptic(10);return true}
function citizenCollision(b,r){if(b.vy<=0)return false;for(const p of citizens){if(!p.alive)continue;const box={x:p.x-10,y:p.y-13,w:20,h:34};if(!circleRect(b.x,b.y,r,box))continue;p.alive=false;p.dying=.8;p.returning=0;p.absent=0;bubbles=bubbles.filter(q=>q.citizen!==p);upwardBounce(b,p.x,16,box.y,r);citizenCue(p,false);effect(p.x,box.y,'#ffb16f',65);burst(p.x,p.y-10,'#ffda86',22);sfx('citizen');haptic(14);return true}return false}
function citizenCue(p,back,text=null){
 const w=112,x=clamp(p.x-w/2,22,W-22-w);
 bubbles=bubbles.filter(q=>q.citizen!==p&&(q.x+(q.w||80)+8<=x||q.x>=x+w+8)).slice(-1);
 const lines=back?['다시 왔어!','나만 믿어!','한 번 더!']:['내가 막을게!','뒤를 부탁해!','으악! 막았다!'];
 bubbles.push({citizen:p,x,y:p.y-100,w,event:text?'bazooka':back?'return':'save',t:0,life:2.1,text:text||lines[Math.floor(Math.random()*lines.length)]});bubbleTimer=1;
}
const CHEERS=['파이팅!','막아줘!','멋져!','최고야!','조심해!','가자!'];
function updateBubbles(dt){bubbles=bubbles.filter(q=>(q.t+=dt)<q.life&&(q.event||q.citizen.alive));bubbleTimer-=dt;if(bubbleTimer>0||bubbles.length>=2)return;bubbleTimer=.7+Math.random()*.4;const options=citizens.filter(p=>p.alive&&Math.abs(p.x-car)>85).map(p=>({p,x:clamp(p.x-40,22,348)})).filter(o=>bubbles.every(q=>o.x+88<=q.x||o.x>=q.x+(q.w||80)+8));if(!options.length)return;const o=options[Math.floor(Math.random()*options.length)];bubbles.push({citizen:o.p,x:o.x,y:o.p.y-75,t:0,life:1.6,text:mode==='clearing'?'고마워!':CHEERS[Math.floor(Math.random()*CHEERS.length)]});cheerTime=Math.max(cheerTime,1)}
function drawBubbles(){for(const q of bubbles){const a=Math.min(1,q.t/.12,(q.life-q.t)/.3),x=q.x,y=q.y-(q.event?Math.sin(Math.min(1,q.t/.3)*Math.PI)*5:0),w=q.w||80,h=q.event?46:29,tail=clamp(q.citizen.x,x+10,x+w-10);g.save();g.globalAlpha=Math.max(0,a);g.fillStyle=q.event==='return'?'#c5ffe5':q.event?'#ffe2ae':'#fff6d8';g.strokeStyle=q.event==='return'?'#287760':q.event?'#974c35':'#28374b';g.lineWidth=q.event?3:2;g.beginPath();g.moveTo(x,y);g.lineTo(x+w,y);g.lineTo(x+w,y+h);g.lineTo(tail+6,y+h);g.lineTo(q.citizen.x,q.citizen.y-19);g.lineTo(tail-4,y+h);g.lineTo(x,y+h);g.closePath();g.fill();g.stroke();g.fillStyle='#263449';g.font='bold 15px Arial, sans-serif';g.textAlign='center';g.fillText(q.text,x+w/2,y+20);if(q.event){g.font='bold 11px Arial, sans-serif';g.fillText(q.event==='return'?'시민 +1 복귀!':q.event==='bazooka'?'광역 지원 사격!':'공을 지켜냈다!',x+w/2,y+37)}g.restore()}}
function updateCrowd(dt){updateBubbles(dt);for(const p of citizens){if(p.dying>0)p.dying=Math.max(0,p.dying-dt);if(!p.alive&&mode==='playing')p.absent=(p.absent||0)+dt;p.returning=Math.max(0,(p.returning||0)-dt);}cheerTime=Math.max(0,cheerTime-dt);if(mode==='clearing')return;updateBazooka(dt);if(mode!=='playing')return;for(const j of [...junk]){j.t+=dt;if(j.t>=j.duration){junk.splice(junk.indexOf(j),1);burst(j.tx,j.ty,'#d9c28b',4);if(foes.includes(j.target)&&Math.hypot(j.target.x+j.target.w/2-j.tx,j.target.y+j.target.h/2-j.ty)<32){damage(j.target,.25,true);if(mode!=='playing')return}}}if(balls[0]?.held||!foes.length)return;crowdTimer-=dt;if(crowdTimer<=0){crowdTimer=3.5+Math.random()*2;const alive=citizens.filter(p=>p.alive);if(!alive.length)return;let citizen=alive[Math.floor(Math.random()*alive.length)],target=foes[Math.floor(Math.random()*foes.length)];junk.push({sx:citizen.x,sy:citizen.y-15,tx:target.x+target.w/2,ty:target.y+target.h/2,target,t:0,duration:1.4,kind:Math.floor(Math.random()*4)});cheerTime=1.4;sfx('serve')}}
function drawCrowd(){rect(20,659,410,4,'#7189a2');rect(20,663,410,3,'#182d40');for(const p of citizens){if(!p.alive&&p.dying<=0)continue;g.save();if(p.returning>0){const t=1-p.returning/1.1;g.globalAlpha=Math.min(1,t*5);if(fxEnabled){g.strokeStyle='#91f4d0';g.lineWidth=3;g.beginPath();g.ellipse(p.x,p.y+12,12+t*24,5+t*8,0,0,Math.PI*2);g.stroke();for(let i=0;i<4;i++){const a=i*Math.PI/2+t*4;rect(p.x+Math.cos(a)*25,p.y-15+Math.sin(a)*23,4,4,'#ffed9b')}}g.translate(0,-Math.sin(t*Math.PI)*22)}if(!p.alive){const t=1-p.dying/.8;g.globalAlpha=Math.min(1,p.dying/.35);g.translate(p.x,p.y);g.rotate(Math.sin(t*13)*.22);g.scale(1+t*.15,1-t*.15);g.translate(-p.x,-p.y-30*Math.sin(t*Math.PI/2))}let cheer=mode==='clearing'||cheerTime>0||Math.sin(clock*1.5+p.phase)>.82,bob=cheer?Math.abs(Math.sin(clock*7+p.phase))*3:0,x=p.x,y=p.y-bob;rect(x-9,y+4,18,17,p.shirt);rect(x-8,y-10,16,16,p.skin);rect(x-9,y-13,18,5,p.hair);if(p.style===0){rect(x-11,y-15,22,4,p.shirt);rect(x-7,y-20,15,6,p.shirt)}if(p.style===1){rect(x-10,y-8,4,17,p.hair);rect(x+7,y-8,4,17,p.hair)}if(p.style===2){rect(x-8,y-7,16,2,'#263441');rect(x-7,y-5,5,4,'#d3ece1');rect(x+3,y-5,5,4,'#d3ece1')}else{rect(x-5,y-5,2,3,'#394149');rect(x+3,y-5,2,3,'#394149')}rect(x-3,y+1,6,2,'#984f4d');if(p.style===3){rect(x-6,y+12,13,3,'#f0e9c9');rect(x-2,y+4,4,14,'#f0e9c9')}if(p.style===4)rect(x-7,y,14,4,'#d3d4c0');if(cheer){rect(x-13,y-4,5,14,p.skin);rect(x+10,y-8,5,17,p.skin);rect(x-14,y-7,6,5,p.skin);rect(x+9,y-11,6,5,p.skin)}else{rect(x-12,y+7,4,12,p.skin);rect(x+9,y+7,4,12,p.skin)}g.restore()}}
// Citizen support uses its own projectiles; tennis ball physics stays unchanged.
const BAZOOKA_RADIUS=120,BAZOOKA_DAMAGE=8;
let rockets=[],bazookaTimer=0,bazookaBlasts=[];
function updateBazooka(dt){
 for(const p of citizens)p.shooting=Math.max(0,(p.shooting||0)-dt);
 for(const r of [...rockets]){r.t+=dt;if(r.t<r.duration)continue;rockets.splice(rockets.indexOf(r),1);bazookaBlasts.push({x:r.tx,y:r.ty,t:0,life:.85});if(bazookaBlasts.length>6)bazookaBlasts.shift();effect(r.tx,r.ty,'#ffd16c',115,'BAZOOKA!');burst(r.tx,r.ty,'#ffae65',40);sfx('blast');haptic(16);
  for(const z of [...foes]){const dx=r.tx-clamp(r.tx,z.x,z.x+z.w),dy=r.ty-clamp(r.ty,z.y,z.y+z.h);if(dx*dx+dy*dy<=BAZOOKA_RADIUS*BAZOOKA_RADIUS){damage(z,BAZOOKA_DAMAGE,false,{x:z.x+z.w/2-r.tx,y:z.y+z.h/2-r.ty});if(mode!=='playing')return}}
 }
 if(!has('bazooka')||!foes.length||balls[0]?.held)return;
 bazookaTimer-=dt;if(bazookaTimer>0)return;
 const alive=citizens.filter(p=>p.alive);if(!alive.length)return;
 const p=alive[Math.floor(Math.random()*alive.length)],z=foes[Math.floor(Math.random()*foes.length)],tx=z.x+z.w/2,ty=z.y+z.h/2;
 p.shooting=1.15;p.aim=Math.atan2(ty-(p.y-16),tx-p.x);bazookaTimer=3;
 rockets.push({sx:p.x,sy:p.y-16,tx,ty,t:0,duration:.7});citizenCue(p,false,'한 방 간다!');sfx('launch');burst(p.x,p.y-16,'#ffd16c',6);
}
function drawBazooka(){
 for(const p of citizens){if(!p.alive||!(p.shooting>0))continue;const elapsed=1.15-p.shooting,recoil=Math.max(0,1-elapsed/.2)*8;g.save();g.globalAlpha=Math.min(1,p.shooting/.2);g.strokeStyle='#ffe99b';g.lineWidth=2;g.beginPath();g.ellipse(p.x,p.y+17,20,6,0,0,Math.PI*2);g.stroke();g.translate(p.x,p.y-14);g.rotate(p.aim??-Math.PI/2);g.translate(-recoil,0);
 // Shoulder-stock, large tube, sight, front grip and two supporting hands.
 rect(-23,-9,53,18,'#1a2936');rect(-20,-7,48,14,'#708e57');rect(-18,-7,44,4,'#b9cd83');rect(-23,-11,10,22,'#415440');rect(23,-11,11,22,'#d3dda0');rect(29,-8,6,16,'#263640');rect(-5,-13,13,5,'#303d42');rect(-3,-14,5,2,'#ffdb81');rect(5,-6,5,12,'#36473a');rect(-9,7,7,11,'#374936');rect(13,7,6,9,'#374936');rect(-10,8,10,7,p.skin);rect(11,7,10,7,p.skin);
 if(elapsed<.2)luminous(()=>{poly([[35,-13],[52,-8],[65,0],[49,7],[35,13],[40,0]],'#ffab43');poly([[35,-6],[52,0],[35,6]],'#fff6c6');poly([[-24,-7],[-41,0],[-24,7]],'#ffbc60')});g.restore()}
 for(const r of rockets){const t=clamp(r.t/r.duration,0,1),x=r.sx+(r.tx-r.sx)*t,y=r.sy+(r.ty-r.sy)*t,travel=Math.hypot(x-r.sx,y-r.sy),trail=Math.min(155,travel);g.save();g.translate(x,y);g.rotate(Math.atan2(r.ty-r.sy,r.tx-r.sx));luminous(()=>{for(let i=12;i>=1;i--){const d=trail*i/12,fade=1-i/13;g.globalAlpha=fade*.8;rect(-d-10,-5-i*.3,13,10+i*.6,i%2?'#ff9b46':'#ffd777');g.globalAlpha=fade*.65;rect(-d-6,-2,10,4,'#fff0ab')}g.globalAlpha=1;poly([[-17,-7],[-38-Math.sin(clock*40)*8,0],[-17,7]],'#ff9f43');poly([[-17,-4],[-31,0],[-17,4]],'#fff6b0')});rect(-16,-8,29,16,'#1e3440');rect(-14,-6,26,12,'#dceb9b');rect(-10,-5,12,10,'#78995c');rect(2,-6,5,12,'#e69b54');poly([[13,-8],[24,0],[13,8]],'#ffae79');rect(-17,-12,7,24,'#618476');rect(-16,-11,5,3,'#dce8b4');g.restore()}
 if(bazookaBlasts.length)luminous(()=>{for(const b of bazookaBlasts){const t=b.t/b.life,fade=1-t;g.save();g.translate(b.x,b.y);g.globalAlpha=fade*.16;g.fillStyle='#ffb34d';g.beginPath();g.arc(0,0,BAZOOKA_RADIUS,0,Math.PI*2);g.fill();g.globalAlpha=fade*.85;g.strokeStyle='#ffe49a';g.lineWidth=3;g.setLineDash([10,6]);g.beginPath();g.arc(0,0,BAZOOKA_RADIUS,0,Math.PI*2);g.stroke();g.setLineDash([]);
 const rings=fxEnabled?3:1;for(let j=0;j<rings;j++){const radius=Math.min(BAZOOKA_RADIUS,12+t*170-j*18);if(radius<0)continue;g.globalAlpha=fade*(j?.5:.8);g.strokeStyle=j%2?'#ff9356':'#fff1b0';g.lineWidth=7-j*2;g.beginPath();g.arc(0,0,radius,0,Math.PI*2);g.stroke()}
 if(fxEnabled)for(let i=0;i<12;i++){const a=i*Math.PI/6,rr=(24+t*88),size=(1-t)*18;g.globalAlpha=fade*.7;rect(Math.cos(a)*rr-size/2,Math.sin(a)*rr-size/2,size,size,i%2?'#ffd172':'#ff8155')}
 g.globalAlpha=fade*.8;rect(-22*(1-t),-22*(1-t),44*(1-t),44*(1-t),'#fff5bc');g.restore()}});
}
function drawJunk(){for(const j of junk){let t=clamp(j.t/j.duration,0,1),x=j.sx+(j.tx-j.sx)*t,y=j.sy+(j.ty-j.sy)*t-Math.sin(Math.PI*t)*85;g.save();g.translate(x,y);g.rotate(t*10);if(j.kind===0){rect(-4,-6,8,12,'#9fc5cf');rect(-4,-6,8,2,'#eaf6da')}else if(j.kind===1){rect(-7,-2,13,6,'#cbb68e');rect(2,-6,4,5,'#ba9974')}else if(j.kind===2){rect(-4,-7,8,13,'#e8d6b0');rect(-2,-9,4,4,'#758496')}else{rect(-6,-4,12,8,'#c89f65');rect(-3,-6,6,3,'#f1cf84')}g.restore()}}
function drawClear(){g.fillStyle='#101a36df';g.fillRect(48,290,354,124);g.strokeStyle='#eff39e';g.lineWidth=2;g.strokeRect(48,290,354,124);g.textAlign='center';g.fillStyle='#eaf98a';g.font='bold 27px monospace';g.fillText((runMode==='endless'?'WAVE '+(wave-50):'STAGE '+String(wave).padStart(2,'0'))+' CLEAR',225,330);g.fillStyle='#faf1d1';g.font='bold 13px monospace';g.fillText('시민들을 지켜냈습니다!',225,357);g.fillStyle='#96e3cd';g.font='12px monospace';g.fillText('+500 BONUS  ·  '+hero().name+' WIN!',225,385)}
let inputPointer=null,inputX=0;
function releaseInput(){inputPointer=null}
function blocksInput(e){return !!e.target?.closest?.('button,a,input,select,textarea,summary,[role="button"],.overlay,.guide')}
function inputDown(e){if(mode!=='playing'||blocksInput(e)||inputPointer!==null||(e.button!==undefined&&e.button!==0))return;inputPointer=e.pointerId;inputX=e.clientX;touchUsed=e.pointerType==='touch';target=car;e.preventDefault?.();try{c.setPointerCapture?.(e.pointerId)}catch{}serve()}
function inputMove(e){if(mode!=='playing')return;if(inputPointer===e.pointerId){const r=c.getBoundingClientRect(),width=r.width||W;target=clamp(target+(e.clientX-inputX)*W/width,72,W-72);inputX=e.clientX;e.preventDefault?.()}else if(inputPointer===null&&e.pointerType==='mouse'&&e.target===c){const r=c.getBoundingClientRect();target=clamp((e.clientX-r.left)/(r.width||W)*W,72,W-72)}}
function inputEnd(e){if(e.pointerId===inputPointer)releaseInput()}
document.addEventListener('pointerdown',inputDown,{passive:false});document.addEventListener('pointermove',inputMove,{passive:false});document.addEventListener('pointerup',inputEnd);document.addEventListener('pointercancel',inputEnd);c.addEventListener('lostpointercapture',inputEnd);
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys[e.key]=true;if(e.code==='Space'){if(mode==='menu'||mode==='over')start();else if(mode==='paused')pause();else serve()}if(e.code==='Escape')pause()});window.addEventListener('keyup',e=>keys[e.key]=false);window.addEventListener('blur',()=>{keys={};if(mode==='playing'||mode==='clearing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause()});$('start').onclick=()=>mode==='paused'?pause():start();$('pause').onclick=pause;$('sound').onclick=()=>{sound=sound&&!audioRunning()?true:!sound;unlockAudio();audioUI();if(sound)sfx('item')};$('legend').innerHTML=Object.entries(SKILLS).map(([k,s])=>'<div style="--skill:'+s.color+'">'+icon(k)+'<span><b>'+s.name+'</b><small>'+s.desc+' · '+s.duration+'초</small></span></div>').join('');rack();resetBalls();renderHeroes();endlessUI();requestAnimationFrame(frame);

$('bgm').onclick=()=>{musicEnabled=!musicEnabled;unlockAudio();$('bgm').textContent=musicEnabled?'BGM ON':'BGM OFF';$('bgm').setAttribute('aria-pressed',String(musicEnabled));nextBeat=0};
$('fx').onclick=()=>{fxEnabled=!fxEnabled;$('fx').textContent=fxEnabled?'FX FULL':'FX LIGHT';$('fx').setAttribute('aria-pressed',String(fxEnabled));if(!fxEnabled){fx=[];cameraKick=0}};
$('share').onclick=async()=>{const url=new URL('./',location.href).href;try{if(navigator.share){await navigator.share({title:'ZOMBIE ZERO',text:'테니스공으로 좀비를 물리쳐 보세요!',url});return}await navigator.clipboard.writeText(url);$('share').textContent='링크 복사 완료!'}catch(e){if(e.name==='AbortError')return;$('share-url').hidden=false;$('share-url').value=url;$('share-url').select()}};
// Keep the pixel-art shapes but render geometry and text at native display density.
function resizeCanvas(){const bounds=c.getBoundingClientRect(),dpr=clamp(window.devicePixelRatio||1,1,3),width=Math.max(1,Math.round((bounds.width||W)*dpr)),height=Math.max(1,Math.round((bounds.height||(bounds.width||W)*H/W)*dpr));if(c.width!==width||c.height!==height){c.width=width;c.height=height}g.setTransform(width/W,0,0,height/H,0,0);g.imageSmoothingEnabled=true;draw()}
resizeCanvas();window.addEventListener('resize',resizeCanvas);if(typeof ResizeObserver!=='undefined')new ResizeObserver(resizeCanvas).observe(c);

