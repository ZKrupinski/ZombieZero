# ZOMBIE BALLS — Android / Web 병행 개발

## 단일 게임 소스

- 웹/PWA는 기존 `dist/`와 Pages 배포 워크플로를 유지한다.
- Android는 같은 커밋의 `dist/`를 복사하고 Pages와 같은 이미지 보정 파이프라인을 실행한다.
- `native/android-shell/`은 Capacitor 7.4.4 기반의 생성 가능한 네이티브 셸이다. 생성된 Android 프로젝트나 웹 리소스 복사본은 커밋하지 않는다.
- Android 앱 ID: `com.rebeltree.zombieballs` (테스트용으로 선정; 출시 전 확정).
- Android는 네이티브 WindowInsetsControllerCompat로 상태/내비게이션 바를 숨기고, 앱 복귀와 포커스 복원 시 다시 적용한다. 시스템 제스처로 잠시 표시되는 바는 Android 정책에 따른다.
- Android 빌드 복사본에서만 브라우저 fullscreen 호출 및 service worker 등록을 차단한다. 웹 원본을 바꾸지 않는다.
- 승인된 v446 앱 아이콘을 사용한다. 기기 진동 권한을 추가했으나 네이티브 햅틱 브리지 개선은 별도 작업이다.

## 빌드 및 설치

GitHub Actions → Build ZOMBIE BALLS Android APK → 성공한 실행 → Artifacts → ZOMBIE-BALLS-Android-APK. ZIP을 풀고 APK를 설치한다. GitHub 로그인이 필요할 수 있다. 출처를 확인하고 테스트용 기기에서 설치한다.

main의 게임/셸 변경은 Android 빌드를 자동으로 실행하며 기존 Pages 배포와 독립적으로 진행한다. Node 22, JDK 21, Android SDK 35, Python/Pillow를 사용한다.

APK는 로컬 리소스를 포함하는 디버그 테스트 빌드이며 Play Store 출시용이 아니다. 서명 키는 GitHub 캐시에 유지하되 캐시 삭제 시 업데이트 호환성이 깨질 수 있다. 정식 배포에는 별도 보호된 지속 서명 키와 릴리스 빌드가 필요하다.

PWA의 로컬 저장 데이터와 Android 앱의 저장 공간은 다르다. 자동 이전 기능은 아직 없다. 기존 PWA 데이터는 유지하고, 앱 삭제/데이터 초기화 전에 주의한다.

## 실기기 QA (미검증)

- 앱 최초 실행 및 배경 복귀 시 시스템 바 자동 숨김
- 폴더블 펼침/접힘 및 게임 화면 비율
- 터치/공 타격/카메라/사운드/진동/모든 모드
- 비행기 모드에서 내장 이미지/만화/스테이지 로딩
- 저장 데이터 유지 및 동일 키 APK 업데이트

## Android 성능 진단 v452

APK 전용 GPU 가속 명시 및 WebView 검사 모드 비활성화. 공통 게임 소스/웹 렌더링에는 변경 없음. Canvas backing width는 최대 1080px, 지속 프레임 저하 시 최대 2단계로 점진 조절 (일반적으로 900~780px, 720px 미만으로 강제 축소하지 않음). 해상도는 게임 로직이나 CSS 크기를 바꾸지 않음. 게임 모드에서 옵션 → FPS 진단으로 FPS, JS update/draw 시간, backing resolution, Bloom WebGL/fallback 상태 표시. 실제 GPU 시간/기기 FPS 향상은 기기 검증 필요. 모든 스프라이트, 트레일, Bloom, 그림자, 애니메이션은 기존 유지.
