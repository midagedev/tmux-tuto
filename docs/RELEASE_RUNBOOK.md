# 릴리즈 런북

## 1. 목적
- 정적 SPA 기준으로 릴리즈 전/중/후 체크를 일관되게 수행한다.
- GitHub Pages, Cloudflare Pages 양 채널 배포를 동일 기준으로 검증한다.

## 2. 현재 서비스 엔드포인트 (2026-02-18)
- 운영 도메인(권장): `https://tmux.midagedev.com`
- Cloudflare Pages 기본 도메인: `https://tmux-tuto.pages.dev`
- GitHub Pages 백업 도메인: `https://midagedev.github.io/tmux-tuto/`

## 3. 사전 준비
- GitHub Secrets
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
- GitHub Variables
  - `CLOUDFLARE_PAGES_PROJECT_NAME`
  - `CLOUDFLARE_PAGES_URL` (예: `https://tmux-tuto.pages.dev`)
- GitHub Pages 활성화
  - Repository Settings > Pages > Source: GitHub Actions
- Cloudflare Pages 프로젝트
  - `CLOUDFLARE_PAGES_PROJECT_NAME=tmux-tuto`
  - custom domain: `tmux.midagedev.com`
- GitHub Actions workflow 권한
  - `Deploy Cloudflare Pages`에 `deployments: write` 필요
  - 파일: `/Users/hckim/repo/tmux-tuto/.github/workflows/deploy-cloudflare-pages.yml`

## 4. 릴리즈 전 게이트 (로컬)
1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run test:e2e:smoke`
6. `npm run verify:kpi-routes`
7. `npm run build`

## 5. 배포 절차
1. `main` 브랜치에 머지
2. GitHub Actions 실행 확인:
   - `CI`
   - `Deploy GitHub Pages`
   - `Deploy Cloudflare Pages`
3. 각 워크플로 완료 후 URL 헬스체크
4. Cloudflare custom domain 상태 확인
   - `pending`이어도 실제 HTTPS 응답과 앱 렌더링이 정상인지 먼저 확인
   - DNS/인증 전파 후 `active`로 전환되는지 추적

## 6. 배포 후 검증
- 라우트 접근:
  - `/practice`
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
- SPA fallback 주의:
  - deep-link(`/<route>`) 요청은 정적 호스팅 특성상 네트워크에서 `404`가 보일 수 있음
  - 렌더 결과(`h1`, 핵심 UI) 기준으로 정상 여부를 판정

## 7. 롤백 절차
1. 마지막 안정 커밋 SHA 확인
2. 해당 SHA로 `main`에 롤백 PR 생성
3. 배포 워크플로 재실행
4. 장애 공지 문구를 홈/온보딩에 임시 노출

## 8. 운영 이슈 대응
- 증상 분류:
  - 라우팅 실패
  - 시뮬레이터 입력 불가
  - 공유 미리보기 누락
  - 분석 미집계
- 대응:
  - 브라우저/OS/재현 단계 수집
  - 최근 배포 커밋과 비교
  - 필요 시 즉시 롤백
