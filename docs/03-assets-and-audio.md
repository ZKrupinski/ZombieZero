# 그래픽·음악·효과음 리소스 안내

## 비트맵 리소스

| 경로 | 용도 |
|---|---|
| dist/zombie-balls-bi.png | 현재 게임에서 읽는 최적화 투명 도트 BI, 512×384 |
| assets-source/branding/zombie-balls-bi-master.png | 현재 BI의 고해상도 생성 원본, 1448×1086, 투명 PNG |
| dist/icons/icon-192.png | PWA 아이콘 192×192 |
| dist/icons/icon-512.png | PWA 아이콘 512×512 |

고해상도 BI는 게임 배포에 필요하지 않으며 아트 후속 편집용입니다. 원본과 실행용 BI 모두 포함하되 게임은 기존의 작은 파일을 계속 참조합니다. 레이어가 있는 PSD/AI 원본은 없습니다. BI는 기존 디자인을 참고하여 생성·가공한 이미지입니다.

## 코드로 제작된 그래픽

`dist/game.js`가 캐릭터 애니메이션과 그림의 실제 원본입니다. 별도의 누락된 스프라이트 파일을 요구하지 않습니다.

- 좀비: zombie, enemyHead, enemyTorso, enemyArm과 enemyPose.
- 파편과 사망: enemyDeath, scatterEnemy, drawEnemyDeaths.
- 자동차/주인공: player. 시민: drawCrowd.
- 배경: background. 스킬 아이콘: SKILLS.icon 및 drawIcon.
- 바주카·로켓·폭발: drawBazooka. 공/잔상/종합 레이어: draw.
- 타이틀 인물: game.js의 캐릭터 선택 UI 생성 부분과 style.css의 선택 캐릭터 애니메이션.
- 말풍선·콤보·결과 원인: drawBubbles, drawKillCombo, drawOutcome.

Canvas와 UI에는 시스템 폰트가 사용됩니다. 별도 폰트 바이너리나 구매 폰트 패키지는 포함되어 있지 않습니다. 렌더링 결과는 운영체제의 폰트 환경에 따라 약간 다를 수 있습니다.

## 음악 원본

실시간 Web Audio 합성으로 재생합니다. 별도 MP3/WAV/OGG, MIDI, DAW 프로젝트는 원래 존재하지 않습니다. 음표·코드 진행·리듬·악기 정의가 들어 있는 game.js를 음악 원본으로 전달합니다.

| 테마 | 기본 MIDI 루트 | 코드 상대값 | 용도 |
|---|---:|---|---|
| SUNNY RALLY | 60 | 0,5,7,0 | 일반 스테이지 순환 |
| TURBO PARADE | 57 | 0,5,7,5 | 일반 스테이지 순환 |
| VICTORY DRIVE | 62 | 0,7,5,0 | 일반 스테이지 순환 |
| BOSS RUSH | 50 | 0,5,7,0 | 보스 생존 중 |

THEMES의 mel 배열이 멜로디 원본입니다. music()은 16분음표 단위로 약 0.09초 앞을 예약합니다. 일반 템포는 146/150/154 BPM 순환, 보스는 172 BPM입니다. square 리드/아르페지오, triangle 보조·베이스, sine 킥, noise 스네어·하이햇, 지연 에코를 조합합니다. 음원 파일화가 필요하면 다음 개발자가 브라우저의 OfflineAudioContext 등을 이용한 렌더러를 추가할 수 있으나 현재 ZIP에 렌더된 오디오 파일은 없습니다.

## 효과음 원본

sfx(name)의 notes, tone(), noise()가 편집 원본입니다. 이벤트 목록:

`launch`, `blast`, `serve`, `wall`, `racket`, `car`, `citizen`, `return`, `bosshit`, `powerhit`, `hit`, `kill`, `item`, `expire`, `miss`, `start`, `wave`, `boss`, `bosskill`, `fire`, `shield`, `pause`, `over`.

타격 콤보에 따라 음높이·볼륨·노트 간격을 조절합니다. 잦은 벽/피격/화염 효과음에는 최소 재생 간격을 적용합니다. unlockAudio/recoverAudio의 사용자 입력 복구 경로를 보존하세요. 외부 음원 서비스나 라이선스 키에 의존하지 않습니다.

## 포함 범위와 권리 정보

이 패키지는 현재 실행 리소스와 확보된 BI 원본을 제공합니다. 과거 첨부 컨셉 이미지 전체나 존재하지 않는 레이어/음원 파일을 복원한 것은 아닙니다. 외부 컨셉 원본이 필요한 아트 작업에는 사용자가 별도 원본을 제공해야 합니다. 이 인수인계 문서는 제3자 자료의 소유권을 확인하거나 별도 오픈소스 라이선스를 부여하지 않습니다.
