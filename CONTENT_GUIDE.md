# SpaceTour Content Guide

운영자가 기억할 규칙은 두 가지뿐입니다.

1. `public/content/<매물폴더>/` 아래에 데이터를 둡니다.
2. 상세 편집이 필요하면 `project.json`, 단순 갤러리면 파일명 규칙만 사용합니다.

## 최소 폴더

```text
public/content/my-property/
├─ cover.webp
└─ photo-01.webp
```

빌드 시 `project.json`과 `content/index.json`이 자동 생성됩니다.

## 추천 폴더

```text
public/content/my-property/
├─ project.json
├─ cover.webp
├─ floorplan.webp
├─ panorama-01.webp
├─ photo-01.webp
└─ photo-02.webp
```

Hotspot/정확한 제목/연락처/외부 링크는 Studio에서 관리하는 것을 권장합니다.

---

## v7: 지도/위치 데이터

Admin에서 지도를 이용해 선택하면 `project.json`에 다음 구조가 자동 생성됩니다.

```json
{
  "location": {
    "lat": 37.5665,
    "lng": 126.9780,
    "address": "서울특별시 ...",
    "placeName": "선택한 장소명"
  }
}
```

직접 `mapUrl`, `roadviewUrl`을 입력할 필요가 없습니다.

지도사의 공개 SDK 설정은 루트의 `public/site-config.json`에서 관리합니다.

```json
{
  "siteName": "SpaceTour",
  "map": {
    "provider": "kakao",
    "kakaoJavaScriptKey": "",
    "naverNcpKeyId": ""
  }
}
```

일반 운영자는 이 파일을 직접 수정하지 않고 Admin > 지도 설정을 사용합니다.

## v7: 원클릭 게시

`SpaceTour-Publisher.cmd`로 Admin을 연 경우 `저장하고 게시하기` 버튼이 아래를 한 번에 처리합니다.

```text
WebP 변환
→ public/content/{slug} 저장
→ content/index.json 갱신
→ npm run build
→ git commit
→ git push origin main
```

따라서 평소에는 `public/content` 폴더를 직접 찾거나 `UPLOAD-NOW.cmd`를 실행하지 않아도 됩니다.
