# OG 이미지 버저닝 정책

## 1. 파일명 규칙
- 경로: `public/og/<milestone-slug>.v<major>.png`
- 예시:
  - `public/og/track-a-complete.v1.png`
  - `public/og/final-complete.v2.png`

## 2. 버전 증가 조건
- `v+1`이 필요한 경우:
  - 카드 레이아웃 변경
  - 컬러/브랜딩 변경
  - 텍스트 구조 변경(제목/설명 위치, 크기)
- 필요 없는 경우:
  - 동일 비주얼의 재생성
  - 압축률만 미세 조정

## 3. 생성/반영 절차
1. `src/content/v1/share-meta.json`의 `ogImage` 파일명을 새 버전으로 갱신
2. `npm run generate:og` 실행
3. `npm run generate:share-meta` 실행
4. `public/share/*/index.html`의 `og:image`, `twitter:image` 갱신 확인

## 4. 캐시 전략
- 새 버전을 배포할 때 기존 파일은 즉시 삭제하지 않는다.
- 배포 후 링크가 안정화된 다음 이전 버전을 정리한다.
