# SpaceTour 가장 쉬운 사용법

## 평소 사용

1. `SpaceTour-Publisher.cmd` 실행
2. 로컬 Studio에서 매물 등록/수정
3. 가격, 동, 호수, 주소, 지도 등 고객에게 보여줄 항목 체크
4. 사진 / 360° / 평면도 / 외부 3D 연결
5. 저장하고 게시

게시 과정에서 README, GitHub About, Website, Topics, 콘텐츠 index, build, commit, push, Pages 배포까지 자동 처리합니다.

## GitHub 소개문구 수정

`config/project-meta.json`만 수정합니다. README를 직접 고칠 필요가 없습니다.

## 메타데이터만 동기화

`SYNC-GITHUB-META.cmd`

## 수동 전체 게시

`PUBLISH-ALL.cmd`

## 고객용 / 관리자용

- 고객용: GitHub Pages 공개 Viewer
- 관리자용: `127.0.0.1`에서만 열리는 로컬 Studio
- Studio는 GitHub Pages에 배포되지 않습니다.
