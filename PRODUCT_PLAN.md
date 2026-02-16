# tmux 인터랙티브 학습 플랫폼 상세 기획서 (Static-Only Production Minimum)

## 1. 문서 목적
- 본 문서는 백엔드 없이 정적 호스팅만으로 운영 가능한 `tmux` 학습 플랫폼의 프로덕션 최소 기준을 정의한다.
- 저장은 브라우저 로컬 저장소만 사용하고, 사용량 파악은 외부 분석 서비스 연동으로 해결한다.
- 배포 대상은 `GitHub Pages` + `Cloudflare Pages` 이중 정적 배포를 기준으로 한다.

## 2. 핵심 제약과 방향
## 2.1 제약
- 서버 애플리케이션 없음 (API/DB/컨테이너/PTY 없음)
- 사용자 데이터는 기기 로컬 저장만 허용
- 실습은 브라우저 내에서만 동작해야 함

## 2.2 제품 방향
- 실제 `tmux` 실행 환경이 아니라, `tmux` 조작법 학습에 특화된 고충실도 시뮬레이터를 제공한다.
- 단축키 숙련, 세션/윈도우/패인 조작 패턴, copy-mode 개념 학습을 최우선으로 설계한다.
- 실전 전이를 위해 "실제 tmux와 다른 점"을 각 레슨에 명시한다.

## 3. 제품 한 줄 정의
- "브라우저만으로 `tmux` 핵심 조작을 반복 실습하고, 학습 데이터는 로컬에 안전하게 저장되는 인터랙티브 트레이너"

## 4. 목표/비목표
## 4.1 목표
- 코스 학습 + 자유 실습 + 치트시트 + 북마크 + 진행도 추적을 오프라인 가능 구조로 제공
- 백엔드 없이도 `Cloudflare Web Analytics` 중심으로 제품 사용량(방문, 세션, 핵심 흐름) 집계
- 정적 배포 환경에서 안정적으로 동작하는 학습 UX 제공
- 커리큘럼 전체 완료/주요 마일스톤 공유 페이지 제공 (소셜 미리보기 포함)

## 4.2 비목표
- 실시간 멀티플레이, 계정 동기화, 서버 기반 개인화 추천
- 실제 원격 서버 접속/실행형 터미널 제공

## 5. 사용자와 JTBD
## 5.1 Primary Persona
- 터미널 멀티태스킹이 필요한 개발자/SRE/DevOps

## 5.2 JTBD
- "나는 `tmux` 단축키를 손에 익혀 실제 업무 터미널에서 망설임 없이 쓰고 싶다."
- "나는 기억 안 나는 기능을 5초 내 검색하고 바로 모의 실습해 확인하고 싶다."

## 6. 정보 구조(IA)
- `Learn` (커리큘럼)
- `Practice` (자유 시뮬레이터)
- `Cheatsheet` (검색형 레퍼런스)
- `Challenges` (미션/퀘스트)
- `Bookmarks` (북마크/노트)
- `Progress` (XP/레벨/스트릭/통계)
- `Settings` (키맵, 데이터 백업/복구, 분석 동의)

## 7. 핵심 기능 요구사항
## 7.1 tmux 시뮬레이터
### 기능
- 터미널 UI는 `xterm.js` 기반
- 내부 엔진은 `tmux` 개념 모델(Session/Window/Pane/Layout/Mode) 상태머신으로 구현
- prefix 기반 단축키 입력 처리 (`Ctrl+b`, 선택형 `Ctrl+a`)
- 핵심 명령 모의 실행:
  - 세션 생성/이동/종료
  - 윈도우 생성/이름변경/순서이동
  - 패인 분할/이동/리사이즈/스왑
  - copy-mode 진입/검색/복사 개념 시뮬레이션

### 범위 원칙
- "실습 목적 충실도"를 우선한다.
- POSIX 셸 전체 재현은 하지 않는다.
- 실제 tmux와 차이가 있는 명령은 UI 배지(`SIMULATED`)로 표시한다.
- 고충실도 시뮬레이터는 선택 기능이 아니라 제품의 P0 필수 기능으로 간주한다.

### 완료 기준 (DoD)
- 학습 트랙 A~C 미션 95% 이상을 시뮬레이터에서 수행 가능
- 주요 단축키 입력 지연 p95 < 80ms (브라우저 기준)
- 사용자가 오프라인 상태에서도 마지막 실습 상태 복원 가능

## 7.2 미션/자동 채점 (클라이언트 로컬)
### 기능
- 미션 목표 상태 정의(JSON)
- 제출 시 현재 시뮬레이터 상태를 룰 엔진으로 검증
- 실패 시 힌트 단계(1차 개념, 2차 힌트, 3차 정답 요약)

### 채점 방식
- 상태 스냅샷 비교:
  - session/window/pane 개수
  - active pane 위치
  - 레이아웃/모드 상태
  - 사용한 명령 이력(선택)

### DoD
- 로컬 채점 로직의 결정성 보장 (같은 입력=같은 결과)
- 레슨 작성자가 코드 수정 없이 JSON 룰만으로 과제 정의 가능

## 7.3 커리큘럼 엔진
### 구조
- Track > Chapter > Lesson > Mission
- 선행 조건/스킵 테스트 지원
- 난이도 태그(`beginner`, `daily`, `advanced`, `scenario`)

### DoD
- 콘텐츠 파일만 교체해 신규 레슨 배포 가능
- 콘텐츠 버전 업 시 로컬 진행도 마이그레이션 스크립트 제공

## 7.4 Cheatsheet + 검색
### 기능
- 단축키/작업목표/문제상황 기반 검색
- 예: "패인 세로 분할", "세션 살리고 나가기", "복사모드 검색"
- 결과 카드에서 바로 "Practice로 열기"

### DoD
- 검색 응답 즉시(클라이언트 인메모리 인덱스)
- 상위 3개 결과 내 문제 해결률 80% 이상

## 7.5 북마크/개인 노트
### 기능
- 레슨/치트시트/미션/커맨드 북마크
- 태그/메모/중요도 표시
- 북마크에서 즉시 재실습 진입

### DoD
- 저장/조회 실패율 0%에 가깝게 (스토리지 예외 처리 필수)
- 데이터 export/import(JSON) 지원

## 7.6 게이미피케이션
### 요소
- XP, 레벨, 스트릭, 업적 배지
- 복습 퀘스트 (망각 곡선 대응)
- "실수 감소" 보너스

### 안티-파밍 룰
- 동일 쉬운 미션 반복 XP 감쇠
- 힌트 과다 사용 시 보상 축소

## 7.7 공유 페이지 (Milestone Share)
### 기능
- 공유 트리거:
  - Track A/B/C 완료
  - 주요 마일스톤(첫 챕터 완료, 첫 스트릭 7일, 첫 챌린지 클리어)
  - 전체 커리큘럼 완료
- 공유 페이지 경로 예시:
  - `/share/track-a-complete`
  - `/share/track-b-complete`
  - `/share/final-complete`
- 공유 데이터:
  - 로컬에서 생성한 공유 payload(닉네임, 레벨, 완료일, 대표 배지)를 URL query로 인코딩
  - 예: `?d=<base64url-json>`
- 페이지 표시:
  - 상단은 정적 OG 카드와 동일한 핵심 메시지
  - 본문에서 query payload를 파싱해 사용자별 상세 정보 렌더링

### DoD
- 주요 마일스톤마다 공유 버튼 노출
- 공유 URL을 새 브라우저에서 열었을 때 payload가 정상 파싱되어 본문 표시
- payload가 없거나 손상되어도 기본 공유 페이지가 깨지지 않음

## 8. 사용자 플로우
## 8.1 첫 방문
1. 수준 선택
2. 키맵 선택 (`Ctrl+b` 기본)
3. 분석 동의 배너 선택
4. 첫 미션 시작

## 8.2 학습 반복 루프
1. 레슨 진입
2. 시뮬레이터 실습
3. 자동 채점
4. 힌트/재도전
5. 완료 보상 + 복습 큐 추가

## 8.3 기억 안 나는 단축키 조회
1. Cheatsheet 검색
2. 예시 확인
3. "바로 실습"
4. 미니 미션으로 확인

## 9. 기술 아키텍처 (Static-Only)
## 9.1 프론트엔드
- `React + TypeScript + Vite` (정적 배포 최적화)
- 라우팅: `react-router`
- 터미널 렌더링: `xterm.js`
- 상태관리: `zustand` + 파생 selector
- 데이터 검증: `zod`

## 9.2 로컬 데이터 저장
- `IndexedDB` (주 저장소)
  - progress, mission_attempts, bookmarks, notes, simulator_state
- `localStorage` (경량 설정)
  - theme, keymap, analytics_consent, install_prompt_dismissed
- 버전 마이그레이션
  - `db_version` 기준으로 시작 시 자동 migration 수행

## 9.3 콘텐츠 배포
- `content/*.json` 정적 파일
- 앱 시작 시 콘텐츠 로드 -> 인메모리 인덱스 생성
- 콘텐츠 버전 키(`content_version`)로 로컬 진행도 호환 처리

## 9.4 오프라인/PWA
- Service Worker로 정적 자산 캐시
- 최근 학습 페이지/치트시트 오프라인 접근
- 오프라인 구간의 분석은 수집 공백이 발생할 수 있으며, 온라인 복귀 후 정상 라우트 측정을 재개

## 10. 분석(사용량 파악) 설계
## 10.1 요구사항
- 백엔드 없이 최소한의 제품 사용량 파악
- 페이지뷰뿐 아니라 핵심 학습 이벤트 추적

## 10.2 측정 원칙
1. 기본 원칙: `Cloudflare Web Analytics`를 측정의 단일 소스로 사용한다.
2. 백엔드 없는 제약에서 "이벤트"는 라우트 설계로 최대한 대체한다.
3. 추가 SDK 도입은 금지하고, 필요한 경우에만 후순위 옵션으로 분리 검토한다.

## 10.3 Cloudflare Web Analytics 중심 설계
### 수집 대상
- 페이지뷰/세션/리퍼러/국가/디바이스
- SPA 라우트별 화면 진입(`Learn`, `Practice`, `Cheatsheet`, `Progress`)
- 공유 페이지 유입/조회(`/share/*`)

### 이벤트를 라우트로 치환하는 규칙
- 미션 완료, 마일스톤 달성 같은 핵심 이벤트는 "전용 라우트 진입"으로 기록한다.
- 예시:
  - `mission_passed` -> `/progress/missions/<mission-slug>/passed`
  - `milestone_track_a` -> `/share/track-a-complete`
  - `curriculum_complete` -> `/share/final-complete`
- 사용자 경험을 해치지 않도록 실제 페이지는 같은 레이아웃을 재사용한다.

### KPI 계산 방식
- 코스 시작률: `/learn/*` 최초 진입 사용자 / 전체 방문 사용자
- 마일스톤 도달률: `/share/<milestone>` 페이지뷰 기반
- 완주율: `/share/final-complete` 페이지뷰 기반
- 공유 확산: 공유 페이지의 외부 리퍼러(`x.com`, `twitter.com`) 비율

## 10.4 익명 식별 전략
- 첫 방문 시 `anon_id` 생성 후 `localStorage` 저장
- 로그인 기능이 없으므로 기기 단위 식별로 간주
- `anon_id`는 앱 내부 로컬 통계/공유 payload 표시에만 사용하고 외부 전송하지 않는다.
- 사용자가 원하면 `Settings > 데이터 초기화`로 즉시 삭제

## 10.5 프라이버시/동의
- 첫 진입 시 분석 동의 배너 제공
- 동의 전에는 필수 기능 이벤트만 로컬 큐에 보관하고 외부 전송 금지
- 개인정보(이메일, IP 원문, 자유입력 민감정보) 수집 금지

## 10.6 한계와 보완
- Cloudflare Web Analytics만으로는 사용자 단위 퍼널/정밀 커스텀 이벤트 분석이 제한된다.
- 따라서 초기 단계에서는 라우트 기반 KPI로 운영하고, 추후 필요 시 별도 분석 도구를 선택적으로 검토한다.

## 11. 배포 아키텍처 (GitHub Pages + Cloudflare Pages)
## 11.1 소스 오브 트루스
- GitHub 저장소의 `main` 브랜치

## 11.2 배포 채널
1. `GitHub Pages`
- 기본 퍼블릭 미러/백업 채널

2. `Cloudflare Pages`
- 주 서비스 채널(권장)
- 커스텀 도메인 연결, 글로벌 CDN, 헤더 제어 용이

## 11.3 권장 운영 방식
- 사용자 트래픽은 Cloudflare 도메인으로 집중
- GitHub Pages는 failover/검증 용도로 유지
- 두 채널 모두 같은 빌드 아티팩트를 사용해 동작 일치 보장

## 11.4 정적 라우팅 주의점
- SPA fallback 설정 필요 (`404.html` -> `index.html`)
- 상대경로 자산 참조 일관화
- 베이스 경로(`/tmux-tuto/` 등) 환경별 변수화

## 11.5 소셜 미리보기(OG/Twitter Card)
- 공유용 경로(`/share/*`)는 정적 HTML을 사전 생성한다.
- 각 공유 페이지에 고정 메타 태그 설정:
  - `og:title`
  - `og:description`
  - `og:image`
  - `og:url`
  - `twitter:card` (`summary_large_image`)
  - `twitter:title`
  - `twitter:description`
  - `twitter:image`
- `og:image`는 milestone별 정적 이미지 파일을 제공한다.
  - 예: `/og/track-a-complete.png`, `/og/final-complete.png`
- query 문자열은 미리보기에 반영되지 않으므로, 미리보기는 "마일스톤 템플릿 카드" 기준으로 설계한다.
- 배포 후 검증:
  - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
  - [OpenGraph Debugger](https://www.opengraph.xyz/)
- 운영 주의:
  - X/Twitter 캐시 특성상 메타 변경 후 즉시 반영되지 않을 수 있다.
  - OG 이미지 갱신 시 파일명 버저닝(`final-complete.v2.png`)을 사용한다.

## 12. 보안/신뢰성 설계 (정적 앱 관점)
## 12.1 보안
- CSP 헤더 적용 (`script-src` 허용 도메인 최소화)
- 서드파티 스크립트 최소화 (analytics 1~2개 제한)
- 콘텐츠 파일 무결성 검증(hash/version)

## 12.2 신뢰성
- 저장 실패/쿼터 초과 예외 처리
- 손상된 로컬 데이터 감지 시 자동 복구(백업 스냅샷)
- 치명 오류 시 안전모드 진입(읽기 전용 학습 모드)

## 12.3 성능
- 코드 스플리팅/지연 로딩
- xterm 초기화 지연(Practice 진입 시)
- Lighthouse 성능 점수 목표 90+

## 13. 로컬 데이터 모델 (초안)
## 13.1 스토어 목록 (IndexedDB)
- `profile`
- `progress`
- `mission_attempts`
- `bookmarks`
- `notes`
- `achievements`
- `simulator_snapshots`

## 13.2 핵심 필드 예시
- `progress`: `lesson_id`, `status`, `best_score`, `updated_at`
- `mission_attempts`: `mission_id`, `result`, `duration_ms`, `hint_level`, `created_at`
- `simulator_snapshots`: `session_graph`, `active_cursor`, `mode`, `saved_at`

## 13.3 백업 포맷
- 단일 JSON export
- 포맷 버전 포함: `backup_format_version`
- import 시 스키마 검증 후 병합/교체 선택

## 14. 품질 보증 전략
## 14.1 테스트
- Unit: 시뮬레이터 상태머신, 채점 룰 엔진, XP 계산
- Integration: IndexedDB 저장/복구, 콘텐츠 로딩/마이그레이션
- E2E: 학습 완주 플로우, 북마크, 검색, 오프라인 모드

## 14.2 필수 검증 항목
- 브라우저 호환: 최신 Chrome/Safari/Edge/Firefox
- 모바일 최소 지원: iOS Safari, Android Chrome
- 오프라인 재진입 시 데이터 보존 확인

## 14.3 SLO
- 첫 화면 로드 p95 < 2.5s
- 시뮬레이터 키 입력 반응 p95 < 80ms
- 로컬 저장 작업 성공률 >= 99.9%

## 15. 콘텐츠 운영
## 15.1 콘텐츠 포맷
- 레슨/미션/치트시트는 JSON로 버전 관리
- 난이도/태그/선행조건 포함

## 15.2 검수 기준
1. 기술 정확성: tmux 개념/단축키 설명 일치
2. 학습 품질: 단계 난이도 상승 자연스러움
3. 시뮬레이션 일치도: 기대 동작과 엔진 결과 일치

## 16. Production Minimum Gate (정적 버전)
- Learn/Practice/Cheatsheet/Bookmarks/Progress 전부 동작
- 브라우저 새로고침/재방문 후 학습 상태 복원
- 데이터 export/import 정상 동작
- Cloudflare Web Analytics 대시보드에서 핵심 KPI 확인 가능
- GitHub Pages + Cloudflare Pages 동시 배포 성공
- 핵심 트랙 A~C 완료 콘텐츠 탑재
- 주요 마일스톤 공유 페이지 + OG/Twitter 미리보기 검증 완료

## 17. 우선 구현 순서
1. 시뮬레이터 상태머신 + 키입력 엔진
2. 미션/채점 룰 엔진
3. 로컬 저장소/마이그레이션/백업복구
4. Cheatsheet 검색/북마크/노트
5. 공유 페이지/OG 이미지 생성 + Cloudflare Web Analytics 연동 + 배포 이중화

## 18. 남은 의사결정 포인트
1. Cloudflare Web Analytics 라우트 기반 측정만으로 운영을 고정할지, 추후 보조 도구 여지를 열어둘지
2. 모바일에서 Practice를 "읽기+미니실습"으로 제한할지
3. 데이터 초기화 시 업적까지 전부 삭제할지, 선택 삭제 옵션을 줄지
4. GitHub Pages를 공식 URL로 노출할지, 내부 백업 URL로만 둘지

## 19. 바로 구현 가능한 산출물
- 시뮬레이터 도메인 스키마(TypeScript interfaces)
- 미션 DSL(JSON Schema)
- 로컬 DB 스키마 및 migration 계획
- 분석 이벤트 사전(Event Taxonomy)
- 배포 설정 문서(GitHub Actions + Cloudflare Pages)
