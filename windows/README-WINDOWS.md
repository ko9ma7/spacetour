# SpaceTour Windows 자동 관리 프로그램

SpaceTour는 Windows에서 `.cmd` 파일을 더블클릭해 GitHub 설정, 매물 추가, 로컬 Studio 실행, 빌드 검증, Git 업로드, GitHub Pages 배포를 관리할 수 있습니다.

## 가장 쉬운 사용 순서

### 최초 1회

`FIRST-SETUP.cmd`를 더블클릭합니다.

프로그램이 다음을 순서대로 확인합니다.

1. Git
2. GitHub CLI (`gh`)
3. Node.js LTS
4. GitHub 로그인
5. 로컬 Git 저장소
6. GitHub Repository 생성/연결
7. GitHub Pages를 Actions 방식으로 설정
8. 첫 commit / push

필수 프로그램이 없고 Windows Package Manager(`winget`)를 사용할 수 있으면 자동 설치를 시도합니다. GitHub 비밀번호나 Token은 프로젝트 파일에 저장하지 않으며 `gh auth login --web`의 브라우저 인증을 사용합니다.

### 평소 매물 등록

방법 A — Studio 사용:

1. `OPEN-STUDIO.cmd`
2. 브라우저에서 매물/사진/평면도/Hotspot 편집
3. `public\content`를 저장 폴더로 선택
4. 작업 완료 후 `UPLOAD-NOW.cmd`

방법 B — 폴더 복사:

1. `SpaceTour-Manager.cmd`
2. `2. 매물 폴더 가져오기`
3. 이미지가 들어 있는 폴더 선택
4. 바로 업로드 선택

`project.json`이 없는 폴더도 SpaceTour의 파일명 규칙에 맞으면 빌드 과정에서 자동 생성됩니다.

## 메인 메뉴

- `1` 최초 GitHub / Pages 자동 설정
- `2` 외부 매물 폴더를 `public/content`에 복사
- `3` 로컬 관리자 Studio 실행
- `4` `npm run build` 검증 → `git add` → `commit` → `push`
- `5` 매물 수 / Git 상태 / Pages 주소 확인
- `6` `public/content` 전체 ZIP 백업
- `7` 배포 사이트 열기
- `8` 콘텐츠 폴더 열기

## 자동 업로드 동작

`UPLOAD-NOW.cmd`는 다음 순서로 동작합니다.

```text
npm run build
   ↓
content/index.json 갱신
   ↓
Git 변경사항 확인
   ↓
git add .
   ↓
git commit
   ↓
git push origin main
   ↓
GitHub Actions
   ↓
GitHub Pages 배포
```

변경사항이 없으면 불필요한 commit을 만들지 않습니다.

## 보안

- GitHub Personal Access Token을 `.cmd`, `.ps1`, JSON에 저장하지 않습니다.
- GitHub 인증은 GitHub CLI Credential Store를 사용합니다.
- `.spacetour.local.json`에는 owner/repository/site URL만 저장되며 `.gitignore`에 포함하는 것을 권장합니다.
- 공개 Repository의 `public/content`에 고객 개인정보나 비공개 문서를 넣지 마세요.


## Troubleshooting: `fatal: Needed a single revision`

Manager v2.1.2 and later does not probe `HEAD` before the first commit. It supports a freshly initialized repository with zero commits and no `origin`, including recovery after a setup run stopped midway. Replace `windows/SpaceTour-Manager.ps1` with the latest file and rerun `FIRST-SETUP.cmd`; do not delete `.git`.
