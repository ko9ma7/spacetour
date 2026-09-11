# SpaceTour Static

평면도 · 일반 사진 · 360° 파노라마 · 외부 3D 투어를 한 링크로 공유하는 **GitHub Pages 전용 부동산 인터랙티브 뷰어**입니다.

이 프로젝트는 런타임 외부 라이브러리, 데이터베이스, 웹서버가 없습니다. `public/content/` 폴더가 콘텐츠 저장소이며 GitHub Actions가 폴더를 스캔해 목록 인덱스를 만든 뒤 Pages에 배포합니다.

## Preview

첫 실행부터 `성수 리버뷰 84A` 데모가 포함됩니다.

- Home: 매물 목록, 검색, 서비스 설명
- Viewer: 사진, WebGL 360°, 평면도 Hotspot, 공유, 문의, 지도/로드뷰 링크
- Studio: 매물 작성, 이미지 업로드, WebP 최적화, 평면도 좌표 편집, 기존 프로젝트 재열기, 폴더 직접 저장, ZIP Export

## Features

- 서버/DB 없는 정적 아키텍처
- **런타임 dependency 0개**
- 폴더 단위 매물 관리
- Build-time `content/index.json` 자동 생성
- 파일명 규칙만으로 기본 `project.json` 자동 생성
- 평면도 0~1 상대좌표 Hotspot
- 자체 WebGL equirectangular 360° viewer
- 일반 사진 / 동영상 / 외부 3D iframe
- Web Share API / Clipboard fallback
- Studio의 File System Access API 기반 로컬 폴더 직접 저장
- 미지원 브라우저용 자체 ZIP Export
- 이미지 WebP 변환 및 리사이즈
- Hash route로 GitHub Pages 새로고침 404 회피
- 반응형 UI / Dark mode / reduced-motion 대응
- Favicon / PWA manifest / OG image / Repository preview
- GitHub Actions 자동 배포

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript ES Modules
- WebGL
- Canvas / WebP
- File System Access API
- GitHub Pages + GitHub Actions
- Node.js 표준 라이브러리 기반 build script

## Project Structure

```text
/
├─ public/
│  ├─ index.html
│  ├─ styles.css
│  ├─ app.js
│  ├─ lib/
│  │  ├─ panorama.js
│  │  ├─ image.js
│  │  └─ zip.js
│  ├─ content/
│  │  ├─ index.json              # build 시 자동 생성
│  │  └─ demo-seongsu/
│  │     ├─ project.json
│  │     ├─ cover.webp
│  │     ├─ floorplan.webp
│  │     ├─ panorama-01.webp
│  │     └─ photo-*.webp
│  ├─ icons/
│  ├─ favicon.svg
│  ├─ og-image.png
│  ├─ repository-preview.png
│  ├─ manifest.webmanifest
│  ├─ robots.txt
│  └─ 404.html
├─ scripts/
│  ├─ generate-content-index.mjs
│  ├─ build.mjs
│  └─ serve.mjs
├─ .github/workflows/deploy.yml
├─ CONTENT_GUIDE.md
└─ package.json
```

## Local Development

```bash
npm install
npm run dev
```

`http://localhost:5173/`에서 실행됩니다. 패키지 의존성이 없으므로 `npm install`은 lockfile 확인 용도입니다.

## Build

```bash
npm run build
```

빌드 과정:

```text
public/content/* 스캔
        ↓
content/index.json 생성
        ↓
정적 파일 dist/ 복사
```

## 가장 쉬운 콘텐츠 추가 방법 — Studio

1. `#/admin` 또는 상단 **Studio**를 엽니다.
2. 매물명, 주소, 가격, 연락처를 입력합니다.
3. 사진과 360° 이미지를 여러 장 업로드합니다.
4. 평면도를 올리고 원하는 위치를 클릭해 Hotspot을 만듭니다.
5. 각 Hotspot에 연결할 사진/360°를 지정합니다.
6. **폴더에 저장**을 선택합니다.
7. 로컬 Git Repository의 `public/content` 폴더를 선택합니다.
8. Studio가 `public/content/<slug>/` 아래에 WebP와 `project.json`을 씁니다.
9. `git push` 합니다.

Chrome/Edge 등 File System Access API 지원 브라우저에서는 직접 저장합니다. 미지원 브라우저에서는 **ZIP 만들기**를 눌러 같은 구조를 내려받을 수 있습니다.

기존 매물을 수정하려면 Studio의 **기존 폴더 열기**에서 `project.json`이 들어 있는 해당 매물 폴더를 선택합니다.

## 파일명만으로 추가

Studio 없이 다음처럼 폴더만 만들어도 됩니다.

```text
public/content/gangnam-84a/
├─ cover.webp
├─ floorplan.webp
├─ panorama-01.webp
├─ photo-01.webp
├─ photo-02.webp
└─ info.json        # 선택
```

인식 규칙:

- `cover.*`, `hero.*`, `main.*` → 대표 이미지
- `floorplan.*`, `floor-plan.*`, `plan.*` → 평면도
- `panorama-*`, `pano-*`, `360-*` → 360° 이미지
- 나머지 이미지 → 일반 사진
- `.mp4`, `.webm` → 동영상

`project.json`이 없으면 `npm run build` 시 자동으로 생성합니다. 정확한 Hotspot 연결은 Studio가 만드는 `project.json`을 사용하는 것이 좋습니다.

### 선택적 info.json

```json
{
  "title": "강남 84A",
  "subtitle": "APARTMENT · 84A",
  "status": "공급중",
  "address": "서울 강남구 ...",
  "priceLabel": "분양 상담",
  "areaLabel": "전용 84.9㎡",
  "orientation": "남향",
  "description": "매물 소개",
  "mapUrl": "https://...",
  "roadviewUrl": "https://...",
  "contact": {
    "name": "담당자",
    "phone": "010-0000-0000",
    "message": "https://open.kakao.com/..."
  }
}
```

## project.json 핵심 구조

```json
{
  "version": 1,
  "id": "gangnam-84a",
  "slug": "gangnam-84a",
  "title": "강남 84A",
  "cover": "cover.webp",
  "floorPlan": {
    "image": "floorplan.webp",
    "hotspots": [
      {
        "id": "living",
        "x": 0.48,
        "y": 0.56,
        "label": "거실 360°",
        "targetMediaId": "pano-living"
      }
    ]
  },
  "media": [
    {
      "id": "pano-living",
      "type": "panorama",
      "title": "거실 360°",
      "src": "panorama-01.webp"
    }
  ]
}
```

`x`, `y`는 픽셀이 아니라 0~1 상대좌표입니다.

## 이미지 용량 정책

Studio 저장 기준:

- 일반 사진: 최대 2200px / WebP 약 82%
- 360°: 최대 4096px / WebP 약 84%
- 대표 이미지: 16:10 crop / 최대 1400px / 약 78%
- 평면도: 최대 2200px / 약 90%

Git은 이미지 교체가 반복되면 history가 커질 수 있습니다. 규모가 커지면 코드와 JSON은 GitHub Pages에 두고 이미지 파일만 R2/S3/CDN으로 이전하면 됩니다. `project.json`의 `src`는 HTTPS 절대 URL도 지원합니다.

## GitHub Pages Deployment

1. GitHub에 Repository를 만듭니다.
2. 전체 프로젝트를 `main` 브랜치에 push 합니다.
3. **Settings → Pages → Source**에서 `GitHub Actions`를 선택합니다.
4. 이후 push마다 `.github/workflows/deploy.yml`이 실행됩니다.
5. `npm ci → npm run build → dist upload → Pages deploy` 순으로 자동 배포됩니다.

접속 주소:

```text
https://USERNAME.github.io/REPOSITORY/
```

사이트 내부 route는 `#/view/...`, `#/admin` 형식을 사용하므로 Repository 하위 경로에서도 안정적으로 동작합니다.

## Update

```bash
git add public/content
git commit -m "update property content"
git push
```

## Custom Domain

**Settings → Pages → Custom domain**에서 연결합니다. GitHub가 관리하는 `CNAME`을 유지하고 DNS 연결 후 **Enforce HTTPS**를 켜세요.

## Security

GitHub Pages와 Public Repository는 공개 영역입니다. API Secret, Private Key, PAT, 비밀번호, 민감 개인정보는 `project.json`이나 JavaScript에 넣지 마세요.

## Browser Support

Viewer: 최신 Chrome / Edge / Firefox / Safari.

Studio 폴더 직접 저장/열기: File System Access API 지원 브라우저. 지원하지 않으면 ZIP Export를 사용합니다.

## Social Preview

- `public/og-image.png` — 1200×630
- `public/repository-preview.png` — 1280×640

Repository **Settings → General → Social preview**에서 `repository-preview.png`를 업로드할 수 있습니다.

## License

MIT License.

## Windows 원클릭 관리 프로그램

Windows에서는 루트의 `SpaceTour-Manager.cmd`를 더블클릭해 운영할 수 있습니다.

빠른 실행 파일:

- `FIRST-SETUP.cmd` — 최초 1회 Git/GitHub/Pages 자동 설정
- `OPEN-STUDIO.cmd` — 로컬 Studio 관리자 화면 실행
- `UPLOAD-NOW.cmd` — 변경사항 빌드 검증 → commit → push → Pages 자동 배포
- `SpaceTour-Manager.cmd` — 위 기능과 매물 폴더 가져오기/상태 확인/ZIP 백업을 제공하는 메뉴형 관리자

최초 설정은 Git, GitHub CLI, Node.js LTS를 확인하고, 설치되어 있지 않으며 `winget`을 사용할 수 있으면 자동 설치를 시도합니다. GitHub 인증은 `gh auth login --web` 방식이며 토큰을 프로젝트 파일에 기록하지 않습니다.

자세한 내용은 [`windows/README-WINDOWS.md`](windows/README-WINDOWS.md)를 참고하세요.

## Windows recovery for an existing GitHub repository

If a previous setup already created the GitHub repository, do not delete the repository or the local `.git` folder. Run `REPAIR-NOW.cmd`. The manager will detect `origin`, fetch `main`, reconcile unrelated history created by a fresh ZIP while preserving local project files, verify GitHub Pages, and then push the repaired branch.
