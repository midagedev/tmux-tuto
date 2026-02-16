# 스펙: 공유 페이지 + OG/Twitter 미리보기

## 1. 목표
- 커리큘럼 전체 완료/마일스톤 달성 결과를 외부에 공유할 수 있어야 한다.
- X(Twitter) 공유 시 카드 미리보기가 안정적으로 노출되어야 한다.

## 2. 공유 시점
- 첫 챕터 완료
- Track A/B/C 완료
- 7일 스트릭 달성
- 전체 커리큘럼 완료

## 3. URL 설계
## 3.1 정적 경로
- `/share/first-chapter-complete`
- `/share/track-a-complete`
- `/share/track-b-complete`
- `/share/track-c-complete`
- `/share/streak-7`
- `/share/final-complete`

## 3.2 사용자 payload
- query 파라미터 `d` 사용
- 형식: `base64url(JSON)`
- 예시 JSON:
```json
{
  "name": "hckim",
  "level": 12,
  "xp": 1840,
  "date": "2026-02-16",
  "badge": "track_a_complete"
}
```

## 4. 렌더링 규칙
- 서버가 없으므로 기본 미리보기는 milestone 템플릿 기준으로 고정한다.
- 상세 데이터는 클라이언트 렌더에서만 반영한다.
- payload가 없거나 파손된 경우 기본 메시지로 안전 폴백한다.

## 5. 메타 태그 요구사항
- `og:title`
- `og:description`
- `og:image`
- `og:url`
- `twitter:card=summary_large_image`
- `twitter:title`
- `twitter:description`
- `twitter:image`

## 6. OG 이미지 전략
- milestone별 정적 이미지 파일 생성:
  - `/og/track-a-complete.png`
  - `/og/final-complete.png`
- 빌드 단계에서 이미지 생성 스크립트 실행 가능
- 캐시 무효화 위해 파일명 버전 정책 사용 (`final-complete.v2.png`)

## 7. 공유 UX
- 미션/마일스톤 완료 모달에 공유 버튼 제공
- 버튼 액션:
  1. 공유 URL 생성
  2. 클립보드 복사
  3. `https://x.com/intent/tweet` 링크 오픈 옵션 제공

## 8. 보안/프라이버시
- payload에 PII 포함 금지(이메일, 상세 위치, 자유 텍스트 로그 금지)
- name은 닉네임/익명 별칭 권장
- payload 최대 길이 제한(예: 1KB)

## 9. 호환성 주의
- X/Twitter/Slack/Discord는 쿼리 기반 동적 OG를 반영하지 않는다.
- 따라서 OG는 경로 단위 고정 콘텐츠로 운영한다.

## 10. 검증 절차
1. 각 `/share/*` URL에 직접 접속해 메타 확인
2. Twitter Card Validator 확인
3. OpenGraph 디버거 확인
4. OG 이미지 링크 접근/캐시 반영 확인

## 11. 테스트 항목
- payload encode/decode 정상
- payload 파손 시 폴백
- 공유 URL 생성 정확성
- X intent 링크 정상 동작

## 12. DoD
- 주요 마일스톤 공유 페이지 전부 동작
- 트위터 카드 미리보기 정상 확인
- 메타/이미지 갱신 시 캐시 전략 문서화 완료
