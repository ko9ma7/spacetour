# SpaceTour v8 Windows 운영

평소에는 `SpaceTour-Publisher.cmd`만 실행하세요.

관리자 Studio는 오직 로컬에서 열립니다.

```text
http://127.0.0.1:5173/studio/#/admin
```

GitHub Pages에는 관리자 페이지가 배포되지 않습니다.

## 자주 쓰는 파일

- `SpaceTour-Publisher.cmd` — 로컬 Studio 열기
- `ADD-PROPERTY-FOLDER.cmd` — 기존 사진 폴더를 매물로 가져오기
- `UPLOAD-NOW.cmd` — 변경 내용을 GitHub에 올리고 즉시 배포 요청
- `REPAIR-NOW.cmd` — Git 이력이 꼬인 경우에만 사용

매물 원본 위치:

```text
content\projects\매물폴더명\
```

GitHub Actions는 기본 30분마다 이 폴더를 읽어 고객용 사이트를 다시 생성합니다.
