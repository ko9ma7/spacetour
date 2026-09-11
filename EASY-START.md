# SpaceTour 가장 쉬운 운영 방법

## 평소에는 이것 하나만 실행

```text
SpaceTour-Publisher.cmd
```

브라우저에서 Admin이 열립니다.

이후 순서:

1. 새 매물 또는 기존 매물 선택
2. 매물명/가격/연락처 입력
3. 위치/지도에서 아파트명 검색 후 결과 클릭
4. 사진과 360° 이미지 여러 장 선택
5. 필요하면 평면도 업로드 후 방 위치 클릭
6. `저장하고 게시하기` 클릭

끝입니다.

`UPLOAD-NOW.cmd`, Git 명령, JSON 편집, public/content 폴더 선택은 일반 운영에서는 필요하지 않습니다.

---

# 지도 API는 처음 한 번만

Admin 왼쪽 메뉴의 `지도 설정`을 엽니다.

## 카카오 지도

입력할 값:

```text
JavaScript Key
```

입력하지 말아야 할 값:

```text
REST API Key
Admin Key
Client Secret
```

카카오 개발자 콘솔에서 JavaScript SDK 도메인에 다음을 등록합니다.

```text
http://localhost:5173
https://내아이디.github.io
```

예: GitHub 계정이 ko9ma7이면

```text
https://ko9ma7.github.io
```

Admin에서 `지도 설정 저장 + GitHub 반영`을 클릭합니다.

## 네이버 지도

입력할 값:

```text
ncpKeyId
```

Client Secret은 입력하지 않습니다.

NAVER Cloud Maps Application에서 Dynamic Map을 활성화하고, 주소 검색을 사용할 경우 Geocoding / Reverse Geocoding도 활성화합니다.

Web service URL에는 다음을 등록합니다.

```text
http://localhost:5173
https://내아이디.github.io
```

---

# 기존 매물 수정

Admin 상단 `기존 매물 불러오기`에서 선택합니다.

기존 project.json이나 이미지 폴더를 직접 찾아 열 필요가 없습니다.

수정 후 `저장하고 게시하기`만 누릅니다.

---

# 게시가 안 될 때만 사용하는 파일

일반 운영에서는 아래 파일을 사용할 필요가 없습니다.

- `FIRST-SETUP.cmd`: 처음 GitHub 저장소를 만들 때
- `REPAIR-NOW.cmd`: GitHub 이력이 꼬였을 때 복구
- `UPLOAD-NOW.cmd`: 수동 업로드가 필요할 때
- `OPEN-STUDIO.cmd`: SpaceTour-Publisher.cmd와 같은 용도의 기존 이름

현재 이미 GitHub 저장소가 연결되어 있다면 `SpaceTour-Publisher.cmd`만 사용하세요.
