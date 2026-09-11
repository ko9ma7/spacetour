# SpaceTour 콘텐츠 폴더 규칙

모든 매물 원본은 `content/projects` 아래에 한 폴더씩 둡니다.

```text
content/projects/
├─ apartment-84a/
├─ apartment-59b/
└─ commercial-201/
```

## 가장 단순한 매물

```text
apartment-84a/
├─ cover.webp
├─ floorplan.webp
├─ photo-01.webp
├─ photo-02.webp
└─ panorama-01.webp
```

이 정도만 있어도 빌드 시 `project.json`을 자동 생성합니다.

## 정보도 넣고 싶으면 `info.json`

```json
{
  "title": "래미안 84A",
  "status": "공급중",
  "address": "서울 ...",
  "priceLabel": "상담",
  "areaLabel": "전용 84.9㎡",
  "description": "남향, 거실 조망이 좋은 타입입니다."
}
```

## Studio로 만든 매물

Studio는 더 상세한 `project.json`을 자동 생성합니다. 평면도 Hotspot, 지도 좌표, 연락처, 사진 제목 등도 함께 저장됩니다.

## 중요한 점

`content/projects` = 관리자 원본

`dist/content` = 빌드된 고객용 결과

`dist/content`를 직접 수정하지 마세요. 다음 빌드에서 다시 생성됩니다.
