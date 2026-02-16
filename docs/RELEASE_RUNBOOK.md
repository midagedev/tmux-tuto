# 릴리즈 런북

## 1. 목적
- 정적 SPA 기준으로 릴리즈 전/중/후 체크를 일관되게 수행한다.
- GitHub Pages, Cloudflare Pages 양 채널 배포를 동일 기준으로 검증한다.

## 2. 사전 준비
- GitHub Secrets
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
- GitHub Variables
  - `CLOUDFLARE_PAGES_PROJECT_NAME`
  - `CLOUDFLARE_PAGES_URL` (예: `https://tmux-tuto.pages.dev`)
- GitHub Pages 활성화
  - Repository Settings > Pages > Source: GitHub Actions

## 3. 릴리즈 전 게이트 (로컬)
1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run test:e2e:smoke`
6. `npm run verify:kpi-routes`
7. `npm run build`

## 4. 배포 절차
1. `main` 브랜치에 머지
2. GitHub Actions 실행 확인:
   - `CI`
   - `Deploy GitHub Pages`
   - `Deploy Cloudflare Pages`
3. 각 워크플로 완료 후 URL 헬스체크

## 5. 배포 후 검증
- 라우트 접근:
  - `/onboarding/start`
  - `/playbooks/recommended-config`
  - `/playbooks/recommended-config/copied`
  - `/share/track-a-complete`
- OG/Twitter 메타:
  - `public/share/*/index.html` 메타 태그 반영 여부
  - `og:image` 접근 가능 여부
- Analytics:
  - 동의 배너 표시/거부/재동의 동작
  - Cloudflare Web Analytics 대시보드 페이지뷰 반영

## 6. 롤백 절차
1. 마지막 안정 커밋 SHA 확인
2. 해당 SHA로 `main`에 롤백 PR 생성
3. 배포 워크플로 재실행
4. 장애 공지 문구를 홈/온보딩에 임시 노출

## 7. 운영 이슈 대응
- 증상 분류:
  - 라우팅 실패
  - 시뮬레이터 입력 불가
  - 공유 미리보기 누락
  - 분석 미집계
- 대응:
  - 브라우저/OS/재현 단계 수집
  - 최근 배포 커밋과 비교
  - 필요 시 즉시 롤백
