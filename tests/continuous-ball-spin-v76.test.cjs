'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('game.js?v=76-smooth-ball-spin'),'new game JS cache key');
assert(sw.includes('zombie-zero-shell-v76-smooth-ball-spin'),'new offline cache key');
assert(source.includes('g.rotate(pose.spin-pose.rotation)'),'bitmap spin counter-rotates pose squash axes');
assert(source.includes('for(const b of [...balls]){updateBallSpin(b,dt);'),'spin updated once per ball each simulation step');
const take=(start,end)=>{const i=source.indexOf(start),j=source.indexOf(end,i+start.length);assert(i>=0&&j>i,'source boundary '+start);return source.slice(i,j)};
const helpers=take('function newBall(','function resetBalls()')
 +take('function ballImpact(','// Nine nearly touching lanes')
 +take('const HERO_BALL_SPIN_FACTORS=','/* V77: Single original base bitmap')
 +take('const BALL_MATERIAL_SPRING=','function drawHeroBallSprite(');
const context={Math,Set,car:225,PY:584,heldBallOffset:()=>({x:0,y:-20}),selectedHero:0,clock:0,
 clamp:(x,lo,hi)=>Math.min(hi,Math.max(lo,x))};
vm.createContext(context);
vm.runInContext(helpers+"\nfunction verify(ok,msg){if(!ok)throw new Error(msg)}\nconst idle=newBall(150,300,0,0,true);\nconst a=newBall(160,280,240,-360,false),b=newBall(170,280,-240,-360,false);\nverify(a.spinDirection===1&&b.spinDirection===-1,'independent opposite spin directions');\nverify(ballSpritePose(a,8,0,0).index===0&&ballSpritePose(a,8,0,1).index===0,\n 'normal flying bitmap does not jump between discrete idle frames');\nlet oldA=a.spinAngle,oldB=b.spinAngle;\nfor(let i=0;i<35;i++){\n updateBallSpin(a,1/60);updateBallSpin(b,1/60);updateBallSpin(idle,1/60);\n verify(a.spinAngle>oldA,'clockwise spin angle advances smoothly frame-to-frame');\n verify(b.spinAngle<oldB,'counterclockwise spin angle advances smoothly frame-to-frame');\n verify(a.spinAngle-oldA<.16&&oldB-b.spinAngle<.16,'no visible angular jumps');\n oldA=a.spinAngle;oldB=b.spinAngle;\n}\nverify(idle.spinAngle>.1,'held ball still slowly rotates');\nconst before=a.spinAngle;\nballImpact(a,'x',-1,'wall');\nverify(a.spinAngle===before,'impact never resets spinning phase');\nupdateBallSpin(a,1/60);\nverify(a.spinAngle>before,'post-impact rotating remains continuous');\nverify(ballSpritePose(a,8,0,clock).spin===a.spinAngle,'impact pose retains independent rotation');\nconst spinStored=a.spinAngle;\nupdateBallSpin(a,0);\nverify(a.spinAngle===spinStored,'no angle advance without game time');\nselectedHero=1;\nconst baseball=newBall(160,280,240,-360,false);\nfor(let i=0;i<30;i++)updateBallSpin(baseball,1/60);\nselectedHero=2;\nconst toy=newBall(160,280,240,-360,false);\nfor(let i=0;i<30;i++)updateBallSpin(toy,1/60);\nverify(baseball.spinAngle<a.spinAngle&&toy.spinAngle>baseball.spinAngle,\n 'baseball rotates more firmly/slower; toy ball faster');\nconsole.log('PASS: seamless angular motion on all three balls, no idle-frame flicker, impact-safe rotation and held-ball spin');\n",context,{timeout:1500});
