# ZOMBIE ZERO · 좀비 제로

Zombie Balls 배포 버전 19의 독립 개발 사본입니다. 기존 게임 코드, 기획, 그래픽 생성 코드, 사운드 합성 코드, 테스트와 확보한 로고 원본을 보존했습니다.

## 실행
```sh
python3 -m http.server 8000 --directory dist
```
http://localhost:8000 에서 실행합니다.

## 검증
```sh
node tools/test.cjs
```

## 자료
- `dist/`: 게임 소스와 실행 리소스. 새 이름, 공유 주소, PWA 식별자/캐시 적용.
- `docs/`: 기존 구현의 기획·개발·리소스 문서.
- `assets-source/`: 기존 고해상도 BI.
- `archive/`: 원본 인계 ZIP, 원본 버전 정보, 로고 3종. 원본 파일은 수정하지 않음.

## 아트 리뉴얼 상태
현재는 독립 복사 기반 버전입니다. 새 타이틀은 임시 텍스트이며 기존 게임 아트는 보존되어 있습니다. 원작의 정확한 캐릭터·배경·UI 참고 자료 확인 후 비트맵 아트워크로 교체할 예정입니다. 과거 대화의 모든 첨부 이미지 또는 원작 프로젝트 파일 전체를 확보한 것은 아닙니다.

## GitHub
저장소: https://github.com/ZKrupinski/ZombieZero

`dist/`를 정적 웹 서버로 제공하면 실행됩니다. GitHub Pages 배포는 별도 설정이 필요합니다.
