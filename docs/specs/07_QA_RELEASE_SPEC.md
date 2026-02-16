# 스펙: QA/릴리즈/운영

## 1. 목표
- 정적 앱 기준 프로덕션 최소 품질을 검증하고, 안정적으로 배포/운영한다.

## 2. 테스트 전략
## 2.1 Unit
- 시뮬레이터 reducer
- 키맵 파서
- 채점 룰 엔진
- XP/스트릭 계산
- payload encode/decode

## 2.2 Integration
- IndexedDB repository
- 콘텐츠 로드/검증/마이그레이션
- 라우팅 전환 + 분석 측정 트리거

## 2.3 E2E (Playwright)
- 온보딩 -> 첫 미션 완료
- practice 분할/이동/리사이즈 시나리오
- cheatsheet 검색 -> 바로 실습
- 북마크 저장/재진입
- milestone 달성 -> share 페이지 생성

## 3. 브라우저 테스트 매트릭스
- Chrome 최신
- Edge 최신
- Firefox 최신
- Safari 최신
- iOS Safari (최신 2버전)
- Android Chrome (최신 2버전)

## 4. 성능/접근성 기준
- 첫 로드 p95 < 2.5s
- 입력 반응 p95 < 80ms (Practice)
- Lighthouse:
  - Performance >= 90
  - Accessibility >= 90
  - Best Practices >= 90

## 5. CI 파이프라인
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e` (핵심 smoke)
- `npm run build`

## 6. 배포 파이프라인
## 6.1 GitHub Pages
- main merge 시 자동 빌드/배포
- 배포 후 URL health check

## 6.2 Cloudflare Pages
- same commit으로 자동 배포
- production alias URL health check

## 7. 릴리즈 체크리스트
1. 스키마/콘텐츠 버전 상향 여부 확인
2. 마이그레이션 테스트 결과 확인
3. share/OG 미리보기 검증
4. Cloudflare Analytics 계측 확인
5. 롤백 대상 이전 아티팩트 확인

## 8. 운영 런북
## 8.1 장애 유형
- 페이지 진입 불가
- 시뮬레이터 입력 불가
- 로컬 데이터 파손 증가
- share 미리보기 누락

## 8.2 대응
- 직전 안정 릴리즈로 롤백
- 공지 배너 표시(정적 공지 페이지)
- 재현 브라우저/버전 수집

## 9. 품질 게이트
- P0 테스트 실패 0건
- 크리티컬 버그 0건
- 경고 수준 버그는 릴리즈 노트에 명시

## 10. DoD
- 테스트 자동화 + 수동 QA 체크리스트 완료
- GitHub/Cloudflare 양 채널 배포 성공
- 운영 문서(런북/릴리즈 노트 템플릿) 준비 완료
