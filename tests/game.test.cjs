const vm=require('node:vm'),fs=require('node:fs');
const noop=()=>{},els={},tones=[];const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,addEventListener:noop,setAttribute:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}resume(){}createBuffer(n,len,sr){return{getChannelData:()=>new Float32Array(len)}}createBufferSource(){return{connect:noop,start:noop,stop:noop}}createDelay(){return{delayTime:{value:0},connect:noop}}createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}createOscillator(){return{frequency:{setValueAtTime:f=>tones.push(f),exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},window:{AudioContext:AudioMock,addEventListener:noop},localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/game.js','utf8')+`
function check(v,m){if(!v)throw Error(m)}
start();serve();check(balls.length===1&&!balls[0].held,'serve');
check(foes.every(z=>z.hp===zombieHP(z.form,z.kind,wave)&&z.hp===z.max),'form-dependent HP contract');
let b=balls[0];b.x=car;b.y=PY-9;b.vy=380;b.vx=0;update(.02);check(b.vy<0,'racket bounce');
activate('dual');check(balls.length===2,'double ball');active.dual=9;activate('triple');check(balls.length===6&&has('dual')&&active.dual===9,'stacked six balls with independent timers');check(new Set(balls.map(b=>b.vx.toFixed(3))).size===6,'distinct split directions');check($('skills').innerHTML.includes('더블볼')&&$('skills').innerHTML.includes('트리플볼'),'both skill timers displayed');activate('triple');check(balls.length===6&&active.dual===9,'repeat pickup capped at six');active.triple=.01;update(.02);check(balls.length===2&&has('dual'),'triple expiry leaves double');active.dual=.01;update(.02);check(balls.length===1,'both expire to one');
activate('triple');active.triple=8;activate('dual');check(balls.length===6&&active.triple===8,'reverse pickup order');active.dual=.01;update(.02);check(balls.length===3&&has('triple'),'double expiry leaves triple');balls=balls.slice(0,1);active.triple=.01;update(.02);check(balls.length===1,'expiry never resurrects lost balls');
activate('dual');activate('triple');active.dual=active.triple=.01;update(.02);check(balls.length===1&&!has('dual')&&!has('triple'),'simultaneous expiry');
activate('triple');balls[0].y=740;balls[0].vy=380;balls[0].vx=0;let oldLives=lives;update(.02);check(balls.length===2&&lives===oldLives,'one lost ball does not cost life');
clearSkills();balls=[newBall(100,300,0,-360,false)];let z={x:150,y:100,w:33,h:44,hp:5,max:5,kind:4,flash:0,burn:0,burnTick:0,spreadTick:0};foes=[z];activate('power');hit(z);check(z.hp===3,'power doubles damage');
clearSkills();z.hp=5;let near={...z,x:205,hp:5},far={...z,x:370,hp:5};foes=[z,near,far];activate('fire');hit(z);check(z.burn>0&&near.burn>0&&far.burn===0,'fire hits nearby only');for(let i=0;i<42;i++)update(.033);check(near.hp<5,'burn ticks');
clearSkills();foes=[{...far,y:100,hp:5,burn:0}];balls=[newBall(100,400,100,-300,false)];let y0=foes[0].y;update(.03);let normal=foes[0].y-y0;activate('slow');y0=foes[0].y;let bx=balls[0].x;update(.03);check(foes[0].y-y0<normal*.5&&balls[0].x-bx<3,'slow affects ball and enemies');
clearSkills();activate('shield');balls=[newBall(100,666,0,400,false)];update(.02);check(balls[0].vy<0,'shield bounce');
let time=active.shield;pause();update(1);check(active.shield===time,'pause freezes duration');pause();
clearSkills();items=[{x:car,y:601,k:'power',phase:0}];update(.02);check(has('power')&&items.length===0,'pickup activates');
let oldRandom=Math.random;Math.random=()=>0;items=[];drop({max:1,boss:false});check(items.length===0,'weak enemy no drop');drop({max:2,x:50,y:50,w:33,h:44});check(items.length===1,'strong enemy random drop');Math.random=()=>.9;drop({max:2,x:50,y:50,w:33,h:44});check(items.length===1,'drop not guaranteed');Math.random=oldRandom;
wave=3;rack();let boss=foes.find(z=>z.boss);check(boss&&boss.w===66&&boss.h===88&&boss.max===36,'boss dimensions and HP');clearSkills();balls=[newBall(100,400,0,-300,false)];let bossY=boss.y,normalZ=foes.find(z=>!z.boss),normalY=normalZ.y;update(.02);check(boss.y-bossY<normalZ.y-normalY,'boss slower than regular');damage(boss,100);check(!foes.includes(boss)&&items.length===1,'boss death and guaranteed item');
items=[{x:20,y:70,k:'power',phase:0}];foes=[];update(.02);check(mode==='clearing'&&items.length===0&&balls.length===0,'immediate clear discards items');for(let i=0;i<90;i++)update(.033);check(wave===4&&balls[0].held,'stage advance after ceremony');serve();for(let i=0;i<3;i++){balls=[newBall(100,740,0,380,false)];update(.02);if(mode==='playing')serve()}check(mode==='over'&&lives===0,'life loss game over');
start();serve();for(const k of Object.keys(SKILLS))activate(k);draw();music();check(audio&&beat>0,'music sequence starts');check($('skills').innerHTML.includes('svg')&&$('skills').innerHTML.includes('s</b>'),'skill icon and timer HUD');
fx=[];for(let i=0;i<100;i++)effect(100,100,'#fff',60,'HIT');check(fx.length<=45,'effect cap');let fxt=fx[0].t;mode='playing';update(.02);check(fx[0].t>fxt,'effect lifetime');$('fx').onclick();check(!fxEnabled&&fx.length===0,'FX light clears overlays');$('fx').onclick();
for(const w of [1,2,4,3]){wave=w;rack();audio.currentTime+=2;music();check(musicTheme===THEMES[({1:0,2:1,4:2,3:3})[w]].name,'theme selection '+w)}
$('bgm').onclick();music();check(musicBus.gain.value===0,'BGM off');$('bgm').onclick();music();check(musicBus.gain.value>0,'BGM on');check(noiseBuffer,'noise percussion buffer');
// All hero stat choices must affect real gameplay, including touch movement.
for(let i=0;i<3;i++){mode='menu';$('hero-'+i).onclick();check(selectedHero===i,'hero selection');start();check(lives===HEROES[i].lives,'hero life count');serve();let x0=car;target=400;update(.1);check(Math.abs(car-x0-HEROES[i].speed*.1)<.01,'hero movement speed');activate('fire');check(active.fire===10*hero().duration,'hero duration bonus');clearSkills();let targetZ={x:100,y:100,w:33,h:44,hp:8,max:8,kind:4};foes=[targetZ];hit(targetZ);check(targetZ.hp===8-hero().damage,'hero damage')}
selectedHero=0;start();serve();let lastEnemy=foes[0];foes=[lastEnemy];items=[{x:20,y:70,k:'dual',phase:0}];damage(lastEnemy,100);check(mode==='clearing'&&items.length===0&&balls.length===0,'last hit clears immediately');let bonusScore=score;beginClear();check(score===bonusScore,'single clear reward');update(.1);pause();let clearT=clearTime;update(1);check(clearTime===clearT,'ceremony pause');pause();for(let i=0;i<90;i++)update(.033);check(wave===2&&mode==='playing','ceremony resumes and advances');
// Nine close-packed lanes visually cover the road from left to right.
{
 check(ENEMY_COLUMNS===9&&ENEMY_PITCH===46.375&&ENEMY_LEFT_X===23,'nine edge-packed lanes at 46.375px pitch');
 for(const [w,total] of [[1,27],[2,27],[3,22],[4,36],[6,31]]){
  wave=w;rack();
  check(foes.length===total,'stage '+w+' crowded without runaway enemy counts');
  let normals=foes.filter(z=>!z.boss);
  let first=normals.filter(z=>z.row===0);
  check(first.length===(w%3===0?6:9),'row 0 fills nine lanes except boss clearance');
  check(Math.min(...normals.map(z=>z.x))===ENEMY_LEFT_X,'left side populated');
  check(Math.max(...normals.map(z=>z.x))===ENEMY_LEFT_X+8*ENEMY_PITCH,'right side populated');
  check(normals.every(z=>z.x>=20&&z.x+z.w<=430),'collision bounds remain inside road');
  const positions=normals.map(z=>({z,y:z.y}));
  for(let i=0;i<10;i++)march(.033);
  check(positions.every(v=>v.z.y>v.y),'same-row neighbors do not block forward march');
  if(w===3||w===6)check(foes.filter(z=>z.boss).length===1,'single centered boss');
 }
}
for(const w of [1,2,4,5,6,8,9,10,12,16,18,24,28,32,35,50]){wave=w;rack();let normals=foes.filter(z=>!z.boss);let eligible=ZOMBIE_FORMS.map((f,i)=>({f,i})).filter(o=>o.f.unlock<=w).map(o=>o.i);check(normals.every(z=>eligible.includes(z.form)),'stage '+w+' never spawns locked forms');check(normals.filter(z=>z.form===0).length>normals.length/2,'green remains dominant at stage '+w);for(let i=0;i<600;i++)march(.025);for(let a of foes)for(let b of foes){if(a===b)continue;check(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'no enemy overlap stage '+w)}}
wave=1;let speed1=enemySpeed({kind:0});wave=8;check(enemySpeed({kind:0})>speed1*1.5&&enemySpeed({kind:0})<speed1*2,'gentle early-stage speed scaling');check(enemySpeed({kind:0})>enemySpeed({kind:4}),'grade speed differs');
start();serve();crowdTimer=0;update(.02);check(junk.length===1&&citizens.length===18,'crowd throws');let thrown=junk[0];let victim=thrown.target;victim.y=thrown.ty-victim.h/2;let hpBefore=victim.hp;updateCrowd(1.5);check(victim.hp===hpBefore-.25,'crowd weak damage');
for(let f=0;f<8;f++)zombie({x:100,y:100,w:33,h:44,kind:3,form:f,hp:4,max:4,seed:0,burn:0});for(let f=0;f<4;f++)zombie({x:100,y:100,w:66,h:88,kind:4,boss:true,bossForm:f,hp:36,max:36,seed:0,burn:1});drawCrowd();beginClear();draw();
start();let blank={closest:()=>null};let prevent=0;const event=(id,x,target=blank)=>({pointerId:id,clientX:x,pointerType:'touch',button:0,target,preventDefault:()=>prevent++});inputDown(event(31,50));check(!balls[0].held&&target===car,'touch anywhere serves without teleport');inputMove(event(31,110));check(target===car+60,'screenwide drag delta');inputDown(event(32,250));inputMove(event(32,300));check(target===car+60,'secondary pointer ignored');inputEnd(event(31,110));check(inputPointer===null,'pointer release');inputDown(event(33,100,{closest:()=>({})}));check(inputPointer===null,'buttons excluded');inputDown(event(34,100));pause();check(inputPointer===null,'pause releases drag');pause();
wave=7;score=12345;hud();check($('score').textContent==='12,345'&&$('wave').textContent==='07'&&$('progress').textContent.startsWith('6'),'HUD cumulative score and progress');end('test');check($('result-stage').textContent==='7 스테이지'&&$('result-score').textContent==='12,345'&&!$('results').hidden,'game over results');start();check($('results').hidden&&score===0&&wave===1,'restart clears results');window.devicePixelRatio=2;resizeCanvas();check(c.width===900&&c.height===1420,'high DPI rendering');window.devicePixelRatio=3;resizeCanvas();check(c.width===1350&&c.height===2130,'DPR 3 rendering');
active={};for(const w of [1,5,10]){wave=w;let old=3.6+(w-1)*1.5+Math.pow(w-1,1.12)*.15;check(marchBase()<old,'reduced descent '+w)}wave=10;check(marchBase()<5.3,'stage 10 approachable speed cap');let ten=marchBase();wave=11;check(marchBase()>ten&&marchBase()-ten<.7,'smooth post-10 ramp');fxEnabled=true;cameraKick=0;effect(100,100,'#fff',150);let kick=cameraKick;for(let i=0;i<20;i++)effect(100,100,'#fff',20);check(cameraKick===kick,'no additive shake saturation');start();serve();effect(100,100,'#fff',150);for(let i=0;i<12;i++)update(.02);check(cameraKick<.1,'short shake decay');
// Late car saves: top, side/wheel, large ball and a moving car.
function scenario(x,y,vx=0,vy=600){selectedHero=0;start();serve();car=target=225;balls=[newBall(x,y,vx,vy,false)];return balls[0]}
for(const x of [225,165,285]){let b=scenario(x,633);let life=lives;update(.025);check(b.vy<0&&b.y<621&&lives===life,'car late save '+x);check(citizens.every(p=>p.alive),'car does not consume citizen')}
let powerB=scenario(289,632);activate('power');update(.02);check(powerB.vy<0,'large ball car collision');
let moveB=scenario(150,630,0,350);car=72;target=378;update(.033);check(moveB.vy<0,'moving car catches ball');
let left=scenario(185,632);update(.02);check(left.vx<0,'left car reflection');let right=scenario(265,632);update(.02);check(right.vx>0,'right car reflection');
let below=scenario(225,650,0,-350);update(.01);check(below.vy<0&&below.y<621,'embedded upward ball ejected above body');
let saved=scenario(citizens[0].x,662);let life=lives;update(.02);check(saved.vy<0&&!citizens[0].alive&&citizens[0].dying>0&&lives===life,'citizen save and hit animation');
let consumed=citizens[0];let upward=saved.vy;citizenCollision(saved,8);check(saved.vy===upward&&citizens.filter(p=>!p.alive).length===1,'no duplicate citizen hit');
balls=[newBall(consumed.x,662,0,600,false)];for(let i=0;i<20;i++)update(.01);check(lives===life-1&&balls[0].held,'dead citizen gap loses ball once');check(!consumed.alive,'citizen stays gone after life loss');
advanceStage();check(!consumed.alive,'citizen stays gone between stages');start();check(citizens.every(p=>p.alive),'new game restores crowd');
scenario(citizens[2].x,662);activate('shield');update(.02);check(balls[0].vy<0&&citizens.every(p=>p.alive),'shield prevents citizen consumption');
scenario(citizens[0].x,662);balls.push(newBall(citizens[0].x,662,0,600,false));life=lives;for(let i=0;i<15;i++)update(.01);check(lives===life&&balls.length===1&&citizens.filter(p=>!p.alive).length===1,'simultaneous balls consume citizen once');
scenario(28,710);for(const p of citizens)p.alive=false;lives=1;let endCalls=0,originalEnd=end;end=function(r){endCalls++;originalEnd(r)};for(let i=0;i<20;i++)update(.01);check(lives===0&&mode==='over'&&endCalls===1,'empty crowd gameover exactly once');end=originalEnd;
start();for(let i=0;i<80;i++)updateBubbles(.05);check(bubbles.length<=2&&bubbles.length>0,'cheer frequency/cap');for(let a of bubbles)for(let b of bubbles)if(a!==b)check(Math.abs(a.x-b.x)>=88,'bubble separation');check(bubbles.every(q=>q.y+29<q.citizen.y-13),'bubbles above heads');let t=bubbles[0].t;mode='paused';update(.5);check(bubbles[0].t===t,'bubble pause');mode='playing';drawBubbles();
// Device haptics are optional and safely throttled.
let buzz=0;navigator={vibrate:()=>{buzz++;return true}};touchUsed=true;lastBuzz=0;haptic(10);haptic(10);check(buzz===1,'haptic throttle');navigator={};haptic(10);touchUsed=false;
// Kill streak, recovery cooldown, pause, and reused citizen defense.
start();serve();crowdTimer=999;let reserve=foes[0];reserve.hp=999;reserve.max=999;
function killOne(){let v={...reserve,hp:1,max:1};foes.push(v);damage(v,1)}
citizens[0].alive=false;citizens[0].absent=0;citizens[1].alive=false;citizens[1].absent=9;
for(let i=0;i<4;i++)killOne();check(killCombo===4&&!citizens[1].alive,'kills accumulate, no early recovery');
killOne();check(killCombo===5&&citizens[1].alive&&!citizens[0].alive,'five kills restore only one eligible citizen');
let streak=killCombo;damage(reserve,1);check(killCombo===streak,'nonlethal hits do not count');
let rebound=newBall(car,640,0,400,false);upwardBounce(rebound,car,60,620,8);check(killCombo===streak,'car bounce preserves kill streak');
let savedTimer=killTimer;mode='paused';update(2);check(killTimer===savedTimer&&citizens[0].absent===0,'pause freezes combo and recovery');mode='playing';
let rescue=newBall(citizens[1].x,citizens[1].y,0,300,false);check(citizenCollision(rescue,8)&&rescue.vy<0&&!citizens[1].alive,'returned citizen saves again');check(!citizenCollision(rescue,8),'no duplicate rescue');
citizens[0].absent=9;for(let i=0;i<5;i++)killOne();check(killCombo===10&&citizens[0].alive&&!citizens[1].alive,'next five restore one, new death respects cooldown');
killTimer=.01;balls=[newBall()];update(.02);check(killCombo===0,'idle gap expires combo');killOne();check(killCombo===1,'new kill starts fresh');
killCombo=30;killTimer=6;drawKillCombo();resetBalls();check(killCombo===0&&killTimer===0,'ball loss or new stage resets chain');
start();check(citizens.every(p=>p.alive&&p.absent===0)&&killCombo===0,'new run resets recovery');
start();citizens[0].alive=false;citizens[0].dying=.8;citizenCue(citizens[0],false);updateBubbles(.6);check(bubbles.some(q=>q.event==='save'),'save speech survives citizen disappearance');drawCrowd();drawBubbles();
citizens[0].alive=true;citizens[0].dying=0;citizens[0].returning=1.1;citizenCue(citizens[0],true);check(bubbles.filter(q=>q.citizen===citizens[0]).length===1&&bubbles[0].event==='return','return replaces stale farewell');drawCrowd();drawBubbles();
for(const p of citizens)citizenCue(p,true);check(bubbles.length<=2&&bubbles.every(q=>q.x>=22&&q.x+q.w<=W-22),'event bubble cap and screen bounds');for(const a of bubbles)for(const b of bubbles)if(a!==b)check(a.x+a.w+8<=b.x||b.x+b.w+8<=a.x,'event bubble separation');
mode='paused';let cueT=bubbles[0].t;update(1);check(bubbles[0].t===cueT,'event animation pauses');mode='playing';updateBubbles(2.2);check(!bubbles.some(q=>q.event),'event speech expires');start();check(bubbles.length===0,'restart clears event speech');
console.log('PASS: kill combo tiers, expiry, pause, nonlethal hits, rebound continuity, five-kill single recovery, cooldown, repeat defense, restart');
console.log('PASS: car body/wheels/moving car, citizen rescue/consumption/gaps, multiball and shield precedence, one gameover, bubble layout, optional haptics, forgiving difficulty curve, capped short shake, full-screen drag, touch cancellation, button exclusions, stage/score results, high-DPI rendering, heroes, immediate clear, ceremony pause, eight enemy unlocks, four bosses, no overlap, speed scaling, crowd throws, color HP, serve, reflection, multiball lifecycle, power damage, spreading fire, slow, shield, timer pause, pickups, random drops, boss dimensions/speed/death, stage advance, game over, draw, audio sequencing, UI');
`,sandbox);if(tones.length<10)throw Error('sound effects not scheduled');console.log('PASS: audio effects generated');
