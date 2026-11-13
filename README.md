# ZOMBIE ZERO · 좀비 제로

아케이드 공 반사로 사물 좀비를 막는 모바일·PC 웹 게임. 플레이 영역은 450×710이고 50스테이지 이후 무한 모드가 제공됩니다.

## 실행 · 미리보기
- 공개 플레이: https://zkrupinski.github.io/ZombieZero/
- 게임 안에서 원작 좀비 애니메이션 9종 미리보기: https://zkrupinski.github.io/ZombieZero/?demo=cast
- 기존 그린 좀비 사망 모션 검수: https://zkrupinski.github.io/ZombieZero/?demo=death
- 로컬: `python3 -m http.server 8000 --directory dist` → http://localhost:8000
- 자동 테스트: `node tools/test.cjs`

## 원작 아트 복원 현황 (2026-11-13)
- 사물 좀비 10종: 기존 그린 좀비 1종 + 신규 **원작풍 9종 투명 PNG 아틀라스**, 실제 게임 렌더러에 연결.
- 신규 9종은 각 128×128 프레임 30장(총 **270프레임**). 기본 하강/좌하/우하 각 8프레임, 피격 2, 일반 사망 2, 크리티컬 사망 2.
- 8개 일반 적 외형과 2개 보스 외형(빅 좀비 / 쓰레기통 좀비)에 매핑. 고유색을 체력 색으로 덮지 않고 등급은 작은 별도 표시 사용.
- 대각선 이동은 일부 일반 좀비가 실제 게임에서 ±6px 이하로 가볍게 횡이동할 때 해당 방향으로 프레임을 재생. 충돌 위치도 동일하게 변경.
- 강한 공격으로 죽을 때 캐릭터별 크리티컬 키프레임을 사용. 그린 좀비는 기존 8프레임 일반 사망 / 10프레임 작은 뇌 '뿅' 크리티컬 사망을 유지.
- 프레임 주변 색상 노이즈 및 발밑 그림자 제거, 브라우저 이미지 로드 실패 시 Canvas 폴백 유지.
- 생존자 3인과 기존 아이소메트릭 원본은 도감 레퍼런스용으로 보존. 3인의 실제 플레이 신규 애니메이션은 향후 별도 작업입니다.

## 주요 파일
- `dist/game.js` 게임 로직/적 렌더링.
- `dist/assets/ip/v2/*.png` 9종 원작풍 이동·피격·사망 시트.
- `dist/assets/ip/v2/object-zombies.js` 로더와 프레임 재생.
- `dist/assets/ip/v2/cast-demo.js` 게임 내 캐릭터 검수 화면.
- `dist/assets/ip/green-death.png`, `green-death-loader.js` 승인된 그린 좀비 사망 연출.
- `dist/sw.js` 오프라인 PWA 캐시.
- `docs/11-original-object-zombies-2026.md` 아트 스펙/프레임 매핑/제약.

## 품질 검수와 IP
자동 테스트는 리소스 파일 무결성, 프레임 매핑, 기존 전투·스테이지 진행을 검사합니다. 실제 모바일 환경에서 FPS/가독성 최종 QA가 별도로 필요합니다.

ZOMBIE ZERO 2026 원작 자료는 NOVALIGHT / Artist Andante 크레딧을 포함합니다. 상업적 배포/라이선싱 범위는 별도 확인해야 합니다.
