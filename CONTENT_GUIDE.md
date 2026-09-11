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
