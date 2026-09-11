# SpaceTour

방문 전 사진·360°·평면도·지도까지 확인하는 부동산 공간 프레젠테이션

> Property preview platform with photos, 360° tours, floor plans, maps, and selective sharing.

## Overview

SpaceTour — 사진, 360° 파노라마, 평면도 Hotspot, 지도, 선택 공유를 지원하는 GitHub Pages 기반 부동산 공간 프레젠테이션 서비스.

이 프로젝트는 고객용 공개 Viewer와 관리자용 로컬 Studio를 분리하고, 매물 데이터를 정적 파일로 관리하여 GitHub Pages에 배포합니다.

## Current content

- 등록 데이터: **1개**
- 활성 매물: **1개**
- 링크 전용: **1개**
- 360° 포함: **1개**

## Features

- 일반 사진·갤러리·360°·동영상·외부 3D를 공간별로 혼합
- 평면도 Hotspot과 실제 촬영 공간 연결
- 가격·동·호수·주소·지도 등 항목별 공개 범위 설정
- 공개 / 링크 전용 / 컬렉션 / 비공개 노출 모드
- 타입 템플릿과 기존 매물 복제로 반복 등록 단축
- 고객용 Viewer와 로컬 관리자 Studio 완전 분리
- GitHub Actions 기반 정적 빌드와 Pages 자동 배포

## Daily workflow

1. `SpaceTour-Publisher.cmd` 실행
2. 로컬 Studio에서 매물 등록/수정
3. 공개할 정보(가격, 동/호수, 주소, 지도 등) 체크
4. 저장하고 게시
5. README / About / Topics / 콘텐츠 인덱스 / Build / Git push / Pages 배포 자동 처리

## Data structure

- `config/site-config.json` — 사이트/지도 설정
- `config/project-meta.json` — README/About/Topics 자동 생성 원본
- `data/properties/` — 매물 데이터
- `data/templates/` — 반복 사용 템플릿
- `data/collections/` — 고객별 선택 공유 데이터
- `content/projects/` — 실제 이미지/매물 콘텐츠 폴더
- `studio/` — 로컬 관리자 (공개 배포 제외)
- `public/` — 고객용 Viewer

## GitHub metadata

GitHub Repository의 Description, Website, Topics는 `config/project-meta.json`을 기준으로 Publisher가 자동 동기화합니다.

## Build

```bash
npm run build
```

## Deployment

`main` 브랜치 push 또는 GitHub Actions 수동 실행 시 GitHub Pages로 배포합니다. 예약 Workflow도 설정할 수 있습니다.

## Security

관리자 Studio는 localhost에서만 실행되며 GitHub Pages 배포물에 포함되지 않습니다. 링크 전용 공개는 검색/목록 비노출 기능이며 강한 인증 보안과는 구분됩니다.

## v9.2 방향 연동 Viewer

- 평면도 Hotspot에 촬영 위치와 카메라 시선 방향을 함께 표시합니다.
- 360° 파노라마를 돌리면 평면도의 시야 화살표/부채꼴이 실시간으로 같이 회전합니다.
- Studio에서 각 Hotspot의 보는 방향을 5° 단위 또는 8방향 프리셋으로 설정할 수 있습니다.
- 평면도의 북쪽 방향을 선택하면 고객 Viewer에 실제 방위(북/북동/동/남동/남/남서/서/북서)를 함께 표시합니다.
- `#/how`, `#/properties` 라우팅을 명시적으로 처리하고 잘못된 URL에서는 현재 공개 매물을 안내합니다.
