# SpaceTour Security Model

- GitHub Pages는 정적 read-only Viewer만 제공합니다.
- Studio는 `127.0.0.1`에서만 실행되며 빌드 산출물에 포함되지 않습니다.
- 로컬 쓰기 API는 실행 시 생성한 임시 세션 토큰을 요구합니다.
- GitHub PAT, 비밀번호, Client Secret을 브라우저 소스에 포함하지 않습니다.
- 지도 JavaScript용 공개 키는 각 제공자 콘솔에서 허용 도메인을 제한해야 합니다.
- 공개 Repository를 사용하는 경우 `content/projects`에 민감 개인정보나 비공개 문서를 넣지 마세요.
