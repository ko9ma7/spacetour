# SpaceTour 자동 메타데이터 / 업로드

평상시에는 `SpaceTour-Publisher.cmd` 또는 `PUBLISH-ALL.cmd`만 사용합니다.

## 자동으로 갱신되는 항목

게시할 때 `config/project-meta.json`을 기준으로 다음이 자동 처리됩니다.

- `README.md` 재생성
- `GITHUB_TOPICS.md` 재생성
- GitHub Repository About / Description 갱신
- GitHub Repository Website를 Pages 주소로 갱신
- GitHub Repository Topics 갱신
- 매물 통계(등록, 활성, 링크전용, 360 포함) README 반영
- 콘텐츠 index / 정적 사이트 build
- Git commit / push
- GitHub Pages workflow 실행

## 수정할 곳

`config/project-meta.json`

```json
{
  "productName": "SpaceTour",
  "description": "저장소 About에 표시할 설명",
  "topics": ["real-estate", "proptech", "virtual-tour"]
}
```

이 파일만 바꾸고 게시하면 나머지는 자동입니다.

## 메타데이터만 다시 반영

`SYNC-GITHUB-META.cmd`를 실행합니다.

## 전체 게시

`PUBLISH-ALL.cmd`를 실행합니다.

## GitHub Actions 자동 문서 갱신

`data/**` 또는 `config/project-meta.json`을 GitHub에서 직접 변경해도 `.github/workflows/metadata.yml`이 README와 Topics 안내 파일을 다시 생성해 커밋합니다.

GitHub의 실제 About/Website/Topics UI 값은 권한 정책 때문에 로컬 Publisher/`SYNC-GITHUB-META.cmd`에서 GitHub CLI 인증으로 동기화하는 방식을 사용합니다.
