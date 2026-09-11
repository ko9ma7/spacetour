# SpaceTour v9 데이터 모델

## 제품 원칙

SpaceTour는 360 전용 서비스가 아니라 **현장 방문 전에 매물을 최대한 이해할 수 있게 하는 부동산 공간 프레젠테이션 서비스**다.

한 매물 안에서도 공간별로 사진, 갤러리, 360°, 동영상, 외부 3D를 섞어 사용할 수 있다. 고객 화면에서는 기술 형식보다 `거실 / 주방 / 안방 / 조망` 같은 공간 단위 탐색을 우선한다.

## 공개 범위

`listingMode`:

- `public`: 홈페이지 목록/검색 + 직접 링크
- `link`: 목록/검색 제외, 직접 링크로 조회
- `collection`: 선택 공유 페이지에서만 노출
- `private`: 공개 산출물에서 제외

`link`는 편의상 숨김에 가깝고 강한 인증 수단이 아니다. 진짜 비공개/비밀번호/특정 고객 인증이 필요하면 정적 GitHub Pages 외부의 인증 계층이 필요하다.

## 필드별 표시 여부

`visibility`는 관리자 UI에서 체크박스로 편집한다.

예: 가격, 정확한 주소, 동, 호수, 층, 방향, 면적, 관리비, 주차, 지도, 로드뷰, 연락처, 설명.

주소는 `addressPrecision`으로 `exact / complex / district / hidden` 수준을 선택한다. 가격은 `priceMode`로 `exact / range / inquiry`를 선택한다.

## Scene

Scene은 고객이 선택하는 공간 단위다.

예: 거실, 주방, 안방, 욕실, 발코니, 조망, 단지 외부.

각 Scene은 다음 형식을 지원한다.

- `photo`
- `gallery`
- `panorama`
- `video`
- `external3d`
- `mixed`

`preferredMedia`로 첫 화면에 사용할 콘텐츠를 결정한다. 360이 없는 공간은 사진만 있어도 정상적인 매물로 게시할 수 있다.

## 템플릿과 복제

`data/templates`의 템플릿을 기준으로 단지/평형 타입별 Scene 이름과 기본 공개범위를 저장한다.

같은 단지 84A를 새로 등록할 때는 템플릿 또는 기존 매물을 복제하고 사진과 가격/층 등만 교체하는 운영을 권장한다.

## 공유 Collection

여러 매물 중 고객에게 보여줄 것만 선택해 별도 공유 페이지를 만든다.

Collection에서 `showSearch:false`, `showOtherProperties:false`로 지정하면 공유받은 고객은 선택된 매물만 볼 수 있다.
