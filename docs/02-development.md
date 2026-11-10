# 개발 가이드

## 파일과 수정 위치

| 파일 | 역할 |
|---|---|
| dist/index.html | 화면 구조, HUD, 타이틀, 결과, 대화상자 |
| dist/style.css | 반응형 레이아웃, 타이틀 캐릭터 애니메이션, 선명한 UI |
| dist/game.js | 규칙·물리·입력·Canvas 그림·음악·게임 상태 전체 |
| dist/app.js | 화면 맞춤, 전체화면, 앱 설치 안내, 서비스워커 등록 |
| dist/sw.js | 오프라인 앱 셸 캐시, 현재 v20 |
| dist/manifest.webmanifest | PWA 이름·아이콘·시작 URL·표시 방식 |

빌드 시스템이나 모듈 번들러가 없습니다. game.js 전역 상태를 app.js도 사용하므로 script 순서를 유지하세요. 변경 시 현재 동작을 보존하는 작은 단위의 수정과 테스트를 권장합니다. 기존 파일은 압축된 한 줄 함수가 많으며 함수 색인을 함께 제공합니다.

| 바꿀 기능 | game.js 검색어 |
|---|---|
| 주인공 능력치 | HEROES |
| 적 체력·외형·스테이지 생성 | TYPES, ZOMBIE_FORMS, BOSS_FORMS, rack |
| 난이도·이동 간격 | marchBase, enemySpeed, march |
| 공·자동차·시민 판정 | update, circleRect, upwardBounce, citizenCollision |
| 피해·처치·점수 | damage, recordKill |
| 스킬·드롭·긴급 지원 | SKILLS, activate, drop, supportRisk, updateEmergencySupport |
| 보스/일반 시각 애니메이션 | enemyAnim, enemyPose, enemyReaction, enemyDeath |
| 시민 응원·복귀 | updateCrowd, drawCrowd, citizenCue, drawBubbles |
| 바주카 | updateBazooka, drawBazooka |
| 진행·패배·구제 | beginClear, advanceStage, triggerLastStand, finishCampaign, drawOutcome |
| 오디오 | unlockAudio, tone, noise, sfx, THEMES, music |
| 터치·화질 | inputDown, inputMove, resizeCanvas |

## 상태 전환

타이틀 menu → start → playing(서브 대기 포함) → clearing → advanceStage → playing을 반복합니다. 일시정지는 paused 상태를 사용합니다. 패배는 over 상태에서 failureScene을 먼저 보여 준 후 결과 UI를 표시합니다. 50단계 완주는 finishCampaign에서 over 결과와 무한 모드 버튼을 표시합니다.

적의 hp가 0 이하가 되는 순간 게임 적 목록에서 제거합니다. 시각적 사망 잔상은 별도 배열입니다. 클리어는 사망 잔상·아이템 종료를 기다리지 않습니다. 배열 순회 도중 damage가 스테이지 종료를 일으킬 수 있으므로 이후 모드 검사를 유지하세요.

## 실행 및 배포

README의 Python 서버는 개발용 localhost 실행입니다. 모바일에서 확인하려면 PC와 같은 네트워크에서 방화벽을 확인하고 `--bind 0.0.0.0`으로 실행해 PC IP:8000에 접속할 수 있습니다. 일반 HTTP LAN 주소에서는 PWA/일부 브라우저 API가 제한될 수 있으므로 최종 검증은 HTTPS 배포에서 진행하세요.

배포 루트에는 dist 폴더 안의 파일과 icons 폴더를 그대로 올립니다. 서버 사이드 런타임은 필요 없습니다. 상대경로와 manifest/service worker 범위를 유지하세요. README, tests, docs, BI 원본은 서비스 배포 대상이 아닙니다.

현재 공개 게임: https://zombie-rally.blondcarp2.chatgpt.site

새 개발자가 별도 사이트를 배포할 때는 자신의 호스팅 계정과 도메인을 사용하세요. 이 패키지에 기존 사이트 관리 권한은 들어 있지 않습니다. 외부 라이브러리/CDN, API 키 없이 게임 자체는 구동됩니다.

## 캐시와 오디오 점검

- sw.js는 network-first 캐시를 사용합니다. 리소스 변경 시 CACHE 이름을 올리세요. 즉시 skipWaiting을 호출하는 구조가 아니므로 모든 기존 탭/설치앱을 닫고 다시 열어 업데이트를 확인합니다.
- 개발 중 예전 코드가 보이면 브라우저 개발자 도구에서 서비스워커 등록과 사이트 캐시를 해제한 후 다시 로드합니다. 저장소 전체 삭제는 최고점·무한 모드 해금도 지웁니다.
- 소리는 사용자의 터치/클릭 후 AudioContext를 재개합니다. 모바일 사운드 미재생 시 UI의 ‘♫ 재생’과 sound/musicEnabled, AudioContext.state를 확인하세요. 자동재생 정책은 장치마다 다릅니다.
- 전체화면 미지원 브라우저는 홈 화면 추가 안내로 대응합니다. 현재 산출물은 웹/PWA이며 APK/IPA 또는 네이티브 클라이언트 소스는 없습니다.

## 다음 개발자가 지켜야 할 조건

현재 캐릭터와 외형을 유지하고, 시각적 흔들림으로 적의 실제 충돌 영역을 움직이지 마세요. 화이트 사각 외곽선이 재발하지 않도록 불필요한 디버그 strokeRect를 적 렌더링에 넣지 마세요. 게임오버 원인은 실제 DEFENSE_Y 값과 표시 선을 일치시켜야 합니다. 점수/시민 소모/구제는 각 사건당 한 번만 처리해야 합니다.
