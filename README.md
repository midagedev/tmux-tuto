# tmux-tuto

브라우저에서 바로 실습하는 tmux 인터랙티브 학습 플랫폼.

설치 없이 실제 Linux VM(v86) 위에서 tmux를 조작하며 단축키와 개념을 익힐 수 있습니다.

**https://tmux.midagedev.com**

## 주요 기능

- **브라우저 내 실제 VM** — v86 + Alpine Linux + tmux가 브라우저 안에서 실행됩니다
- **미션 기반 학습** — 세션/윈도우/패인/copy-mode 등 단계별 커리큘럼
- **자동 채점** — VM 상태를 실시간 probe하여 미션 달성 여부를 자동 판별
- **치트시트** — tmux 명령/단축키 검색형 레퍼런스
- **진행도 추적** — 학습 진행률, 업적, 스트릭 등 (브라우저 로컬 저장)
- **완전 정적 배포** — 백엔드 없음, Cloudflare Pages에서 서빙

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 18, TypeScript, Vite |
| Terminal | xterm.js |
| VM | v86 (x86 에뮬레이터), Alpine Linux 3.21 |
| State | Zustand, IndexedDB |
| Test | Vitest, Playwright |
| Deploy | Cloudflare Pages |

## 로컬 개발

```bash
npm install
npm run dev
```

### VM 이미지 빌드

VM 파일시스템 이미지를 재빌드하려면 Docker가 필요합니다.

```bash
npm run vm:build
```

빌드 후 warm start 스냅샷도 갱신해야 합니다 (Playwright 필요):

```bash
npm run vm:state:generate
```

### 테스트

```bash
npm test              # unit (vitest)
npm run test:e2e      # e2e (playwright)
npm run typecheck     # tsc
npm run lint          # eslint
```

### 빌드

```bash
npm run build         # production build (Cloudflare Pages)
```

### 분석 도구 설정 (선택)

동의 기반으로 분석 스크립트가 로드됩니다.

- `VITE_CF_WEB_ANALYTICS_TOKEN`: Cloudflare Web Analytics 토큰
- `VITE_MS_CLARITY_PROJECT_ID`: Microsoft Clarity 프로젝트 ID

## 프로젝트 구조

```
src/
  pages/           # 페이지 컴포넌트 (Practice, Learn, Cheatsheet, ...)
  features/        # 도메인 로직 (curriculum, vm, progress, ...)
  components/      # 공용 UI 컴포넌트
  content/         # 커리큘럼 콘텐츠 데이터
scripts/
  vm/              # VM 이미지 빌드 (Dockerfile, init scripts, 데몬)
  *.mjs            # 빌드/생성 스크립트
public/
  vm/              # v86 런타임, BIOS, VM 파일시스템, 스냅샷
```

## 기여

PR 환영합니다. 이슈나 아이디어가 있으면 GitHub Issues에 남겨주세요.
