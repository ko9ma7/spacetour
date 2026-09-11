# SpaceTour v8 초간단 사용법

## 평소에는 이것만

### 매물을 화면에서 등록

`SpaceTour-Publisher.cmd` 더블클릭 → 등록 → **저장하고 게시하기**

관리자 화면 주소는 로컬 PC 전용입니다.

```text
http://127.0.0.1:5173/studio/#/admin
```

`https://...github.io/.../#/admin` 같은 공개 관리자 주소는 v8부터 없습니다.

## 폴더째 등록하고 싶을 때

`ADD-PROPERTY-FOLDER.cmd` 실행 → 사진이 들어 있는 매물 폴더 선택 → 업로드

또는 직접:

```text
content/projects/매물명/
```

안에 사진을 넣고 GitHub에 push합니다.

예:

```text
content/projects/84a-river-view/
  cover.webp
  floorplan.webp
  photo-01.webp
  photo-02.webp
  panorama-01.webp
```

파일명만으로도 자동 연결됩니다.

## 언제 사이트에 반영되나요?

- Studio에서 **저장하고 게시하기** → 즉시 배포 요청
- `UPLOAD-NOW.cmd` → 즉시 배포 요청
- 폴더만 GitHub에 올림 → 기본 30분마다 자동 스캔/배포

## 지도

Studio → 지도 설정에서 처음 한 번만 선택합니다.

- 카카오: JavaScript Key
- 네이버: ncpKeyId

Secret이나 관리자 키는 넣지 않습니다.

이후에는 주소를 직접 타이핑할 필요 없이 장소 검색 또는 지도 클릭으로 좌표를 저장합니다.
