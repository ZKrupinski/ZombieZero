# Zombie Balls — 개발 인수인계 패키지

현재 플레이 가능한 게임을 그대로 보존한 2026-10-11 소스 스냅샷입니다. 이 폴더 전체를 다른 개발자에게 전달하면 됩니다.

## 가장 먼저 실행하기

Python 3가 설치된 환경에서 이 폴더를 터미널로 열고 실행하세요.

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

macOS/Linux에서 `python`이 없으면 `python3`를 사용하세요. Windows는 `py`도 가능합니다.
브라우저에서 http://localhost:8000 을 엽니다. 종료는 Ctrl+C입니다.
HTML 파일을 직접 더블클릭하는 대신 HTTP 서버를 사용하세요. 서비스워커와 앱 설치 기능은 HTTPS 또는 localhost 환경에서 확인합니다.

## 개발과 테스트

게임은 HTML/CSS/일반 JavaScript로 구성되어 있습니다. npm 설치, 빌드, API 키, 데이터베이스가 필요하지 않습니다. `dist`가 배포 파일이자 편집 가능한 원본 소스입니다.

Node.js가 설치된 환경에서:

```sh
node tools/test.cjs
```

테스트 실행기는 포함된 6개 회귀 테스트를 실행합니다. Node 24에서 검증했습니다. Node 20 이상을 권장하며 이 패키지는 외부 npm 패키지를 사용하지 않습니다.

## 포함 내용

| 경로 | 내용 |
|---|---|
| dist/ | 게임 전체 소스, 실행용 투명 BI, 앱 아이콘, PWA 파일 |
| tests/ | 충돌·오디오·지원 스킬·애니메이션·진행 회귀 테스트 |
| assets-source/branding/ | 현재 BI의 고해상도 투명 PNG 원본 |
| docs/01-game-design.md | 현재 구현 기준 기획서와 밸런스 |
| docs/02-development.md | 코드 구조, 수정 위치, 배포·디버깅 안내 |
| docs/03-assets-and-audio.md | 그래픽·음악·효과음 리소스 설명 |
| docs/04-qa-and-handoff.md | 검증 범위와 인수인계 체크리스트 |
| docs/function-index.md | JavaScript 함수 위치 색인 |
| docs/asset-manifest.json | 런타임 및 BI 원본 파일 목록·크기·해시 |
| docs/test-results.txt | 이 패키지에서 실행한 테스트 결과 |
| VERSION.json | 원본 커밋 및 배포 버전 식별 정보 |
| SHA256SUMS.txt | 모든 포함 파일의 무결성 확인값 |

## 음악과 그림 파일에 관하여

음악/효과음은 Web Audio 합성 방식이며 캐릭터/배경/이펙트도 Canvas/SVG 코드로 제작되어 있습니다. 따라서 별도 MP3/WAV, 캐릭터 스프라이트 시트, PSD 파일은 현재 프로젝트에 없습니다. 편집 가능한 생성 원본은 `dist/game.js`, `dist/style.css`, `dist/index.html`에 모두 포함했습니다. 상세 위치는 리소스 문서를 확인하세요.

과거에 대화에 첨부했던 외부 컨셉 참고 이미지 전체는 이 ZIP에 포함되어 있지 않습니다. 현재 게임 실행에 필요한 리소스는 전부 포함되어 있습니다. 참고 이미지 원본까지 전달하려면 소유한 원본을 별도로 추가하세요.

실서비스 계정, 인증 정보, Git 저장소 내부 설정과 과거 커밋 이력은 포함하지 않았습니다. 이 패키지는 현재 상태의 독립적인 개발용 사본입니다. 새 개발자는 자신의 저장소와 호스팅에서 이어서 개발할 수 있습니다.
