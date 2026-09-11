# SpaceTour

부동산 매물을 사진 목록이 아니라 **평면도 + 360° 공간 + 지도 + 문의 정보**가 연결된 하나의 인터랙티브 링크로 만드는 GitHub Pages 기반 정적 웹서비스입니다.

별도 DB나 상시 웹서버 없이 동작하며, Windows에서는 로컬 Publisher가 파일 저장·빌드·Git commit·push를 대신 처리합니다.

## 가장 쉬운 사용법

Windows에서 프로젝트 폴더의 다음 파일을 더블클릭합니다.

```text
SpaceTour-Publisher.cmd
```

그러면 `http://localhost:5173/admin.html`이 열립니다.

Admin에서:

```text
매물 정보
→ 위치/지도
→ 사진/360°
→ 평면도
→ 저장하고 게시하기
```

순서로 처리하면 됩니다.

일반 운영에서는 JSON 편집, 폴더 선택, Git 명령 입력이 필요하지 않습니다.

자세한 초간단 설명은 `EASY-START.md`를 참고하세요.

## 주요 기능

- 매물 등록/수정 Admin
- 기존 매물 드롭다운 불러오기
- 카카오/네이버 지도 선택
- 장소/주소 검색 후 지도에서 위치 지정
- 주소, 위도, 경도 자동 저장
- 카카오 사용 시 고객 뷰어에서 로드뷰 표시
- 여러 사진/동영상 일괄 업로드
- 2:1 이미지 360° 후보 자동 인식
- WebP 자동 최적화
- 평면도 클릭 Hotspot 제작
- Matterport 등 외부 3D Embed 연결
- 모바일/PC 반응형 Viewer
- 로컬 Publisher의 원클릭 GitHub 게시
- GitHub Pages Actions 자동 배포
- ZIP/폴더 방식 백업 지원

## 지도 설정

Admin 왼쪽 `지도 설정`에서 지도사를 선택합니다.

### Kakao

필요한 값은 **JavaScript Key**입니다. REST API Key나 Admin Key를 넣지 않습니다.

등록 도메인 예:

```text
http://localhost:5173
https://USERNAME.github.io
```

### NAVER

필요한 값은 **ncpKeyId**입니다. Client Secret은 웹에 저장하지 않습니다.

Maps Application에서 Dynamic Map을 활성화하고, 주소 검색이 필요하면 Geocoding / Reverse Geocoding도 활성화합니다.

등록 Web service URL 예:

```text
http://localhost:5173
https://USERNAME.github.io
```

지도 설정은 `public/site-config.json`에 저장됩니다. JavaScript SDK용 공개 식별자만 저장하도록 설계되어 있습니다.

## 데이터 구조

각 매물은 여전히 정적 폴더로 저장되므로 GitHub Pages에서 그대로 서비스할 수 있습니다.

```text
public/content/
└─ seongsu-84a/
   ├─ project.json
   ├─ cover.webp
   ├─ floorplan.webp
   ├─ photo-01.webp
   ├─ photo-02.webp
   └─ panorama-01.webp
```

Admin을 이용하면 이 구조를 직접 만들 필요가 없습니다.

## project.json 위치 정보

```json
{
  "location": {
    "lat": 37.5445,
    "lng": 127.0560,
    "address": "서울 성동구 ...",
    "placeName": "아파트/건물명"
  }
}
```

고객 Viewer는 이 좌표를 이용해 선택한 지도 SDK를 렌더링합니다.

## 로컬 개발

```bash
npm install
npm run dev
```

브라우저:

```text
http://localhost:5173/
http://localhost:5173/admin.html
```

## Build

```bash
npm run build
```

결과물은 `dist/`에 생성됩니다.

## GitHub Pages

`.github/workflows/deploy.yml`이 `main` push 시 다음을 수행합니다.

```text
content index 생성
→ 정적 build
→ Pages artifact 업로드
→ github-pages 배포
```

Repository Settings > Pages의 Source는 `GitHub Actions`로 설정합니다.

## Windows 파일

- `SpaceTour-Publisher.cmd` — 평소 사용하는 파일
- `FIRST-SETUP.cmd` — 최초 GitHub 연결
- `REPAIR-NOW.cmd` — Git 원격 이력 복구
- `UPLOAD-NOW.cmd` — 수동 게시 대안
- `SpaceTour-Manager.cmd` — 전체 관리 메뉴

## GitHub About / Topics

복사해서 사용할 Description, Website, Topics는 `GITHUB_TOPICS.md`에 정리되어 있습니다.

## 이미지 용량

Admin 게시 시 기본값:

- 일반 사진: 최대 2200px WebP
- 360° 이미지: 최대 4096px WebP
- 대표 이미지: 최대 1400px WebP
- 평면도: 최대 2200px WebP

매물 수가 많아져 Repository가 지나치게 커지면 이미지 URL만 Cloudflare R2/S3/CDN 등으로 옮기는 구조로 확장할 수 있습니다.

## License

MIT
