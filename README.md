# SpaceTour v8 — Read-only Public Viewer + Local Studio

부동산 매물의 평면도, 일반 사진, 360° 파노라마, 지도/로드뷰를 한 링크에서 보여주는 GitHub Pages 기반 정적 웹서비스입니다.

v8의 가장 중요한 변경점은 **고객용 Viewer와 관리자용 Studio의 완전 분리**입니다.

- GitHub Pages: 읽기 전용 Viewer만 배포
- Local Studio: 관리자 PC의 `127.0.0.1`에서만 실행
- 콘텐츠 원본: `content/projects/<매물폴더>/`
- GitHub Actions: 원본 폴더를 읽어 `dist/content`를 생성하고 Pages에 배포
- 예약 배포: 기본 30분 간격
- 즉시 배포: Local Studio의 `저장하고 게시하기` 버튼 또는 `UPLOAD-NOW.cmd`

## 가장 쉬운 사용법

### 관리자 화면으로 등록

1. `SpaceTour-Publisher.cmd` 실행
2. 브라우저에 `http://127.0.0.1:5173/studio/#/admin` 자동 오픈
3. 매물 정보 / 지도 / 사진 / 360° / 평면도 등록
4. `저장하고 게시하기`
5. 자동 WebP 변환 → `content/projects` 저장 → Git commit/push → GitHub Actions 즉시 실행

Studio는 `studio/` 폴더에만 있으며 `dist/`에 복사되지 않습니다.

### 폴더만 만들어 등록

`ADD-PROPERTY-FOLDER.cmd`를 실행해 매물 폴더를 선택하거나 직접 아래 위치에 폴더를 넣습니다.

```text
content/projects/
└─ raemian-84a/
   ├─ cover.webp
   ├─ floorplan.webp
   ├─ photo-01.webp
   ├─ photo-02.webp
   ├─ panorama-01.webp
   └─ info.json        # 선택사항
```

`project.json`이 없어도 파일명 규칙으로 자동 추론됩니다.

- `cover.*`, `hero.*`, `main.*` → 대표 이미지
- `floorplan.*`, `floor-plan.*`, `plan.*` → 평면도
- `panorama-*`, `pano-*`, `360-*` → 360°
- 나머지 이미지 → 일반 사진
- `.mp4`, `.webm` → 영상

폴더를 push만 한 경우 GitHub Actions의 30분 예약 실행이 최신 폴더를 읽어 배포합니다.

## 보안 구조

공개 `dist/`에는 다음이 존재하지 않습니다.

```text
admin.html
studio/
/api/publish 호출 코드
이미지 편집/ZIP 관리자 코드
관리자 세션 토큰
GitHub 인증정보
```

Local Publisher는 `127.0.0.1`에만 바인딩하며 실행할 때마다 임시 세션 토큰을 생성합니다. 저장/게시 API는 이 토큰 없이는 거절됩니다.

카카오 JavaScript Key / 네이버 ncpKeyId는 브라우저 지도 SDK용 공개 식별자만 사용하며 Secret/PAT/비밀번호는 정적 사이트에 넣지 않습니다. 각 지도 콘솔에서 허용 도메인을 제한하세요.

## 콘텐츠와 배포물 분리

```text
content/projects/       # 관리자가 보관하는 원본
        ↓
GitHub Actions / build
        ↓
Validation + index 생성
        ↓
dist/content/           # 고객이 읽는 결과
        ↓
GitHub Pages
```

`public/`은 Viewer 프로그램 자산만 보관합니다. 매물 원본은 `public/`에 직접 넣지 않습니다.

## 배포 주기

`.github/workflows/deploy.yml` 기본값:

```yaml
schedule:
  - cron: '*/30 * * * *'
```

10분마다 확인하려면 `*/30`을 `*/10`으로 바꾸면 됩니다.

Local Studio의 게시 버튼은 예약 시간을 기다리지 않고 `workflow_dispatch`로 즉시 배포를 요청합니다.

## 기존 v7 이하에서 업그레이드

v8 빌드는 레거시 구조를 자동 정리합니다.

- `public/content/*` → `content/projects/*`로 이전
- 기존 지도 설정 → `config/site-config.json`로 이전
- `public/admin.html` 삭제
- 공개 관리자용 `image.js`, `zip.js` 삭제

따라서 저장소를 새로 만들지 않아도 됩니다.

## 개발/검증

```bash
npm install
npm run build
npm run dev
```

Viewer:

```text
http://127.0.0.1:5173/
```

Local Studio:

```text
http://127.0.0.1:5173/studio/#/admin
```

## 주요 파일

```text
/
├─ public/                    # 공개 Viewer 전용
├─ studio/                    # 로컬 관리자 전용, 배포 제외
├─ content/projects/          # 매물 원본
├─ config/site-config.json    # 지도/사이트 공개 설정
├─ scripts/
│  ├─ migrate-legacy.mjs
│  ├─ generate-content-index.mjs
│  ├─ build.mjs
│  └─ serve.mjs
├─ .github/workflows/deploy.yml
├─ SpaceTour-Publisher.cmd
├─ ADD-PROPERTY-FOLDER.cmd
└─ UPLOAD-NOW.cmd
```

## GitHub Pages

Repository의 `Settings → Pages → Build and deployment → Source`는 `GitHub Actions`로 설정합니다.

공개 URL 예:

```text
https://USERNAME.github.io/spacetour/
```

관리자 URL은 GitHub Pages에 존재하지 않습니다.
