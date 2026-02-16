# 스펙: Practical Playbooks (권장 설정/세션 유지/원격 SSH)

## 1. 목표
- 학습 내용을 실전 환경으로 전이하기 위한 절차형 가이드를 제공한다.
- 입문자도 바로 복사-적용-검증 가능한 수준의 실무 플레이북을 제공한다.

## 2. 범위
- `Playbook A`: 권장 `tmux.conf` 베이스
- `Playbook B`: 세션 유지 운영 루틴
- `Playbook C`: Tailscale SSH 원격 작업 루틴

## 3. 공통 UI 요구사항
- 플레이북 페이지 경로: `/playbooks/:playbookSlug`
- 모든 단계에 `복사` 버튼 제공
- 모든 단계에 `검증 체크` 항목 제공
- 실패 시 `트러블슈팅` 아코디언 제공

## 4. Playbook A: 권장 tmux.conf 베이스
## 4.1 목적
- tmux 기본 사용성을 빠르게 개선하는 안전한 설정 제공

## 4.2 기본 스니펫
```tmux
# Prefix
set -g prefix C-b
unbind C-b
bind C-b send-prefix

# Quality of life
set -g mouse on
set -g history-limit 100000
setw -g mode-keys vi

# Numbering starts at 1
set -g base-index 1
setw -g pane-base-index 1

# Easier pane split keys
bind | split-window -h
bind - split-window -v

# Vim-like pane navigation
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# Reload config
bind r source-file ~/.tmux.conf \; display-message "tmux.conf reloaded"
```

## 4.3 적용 절차
1. `~/.tmux.conf` 파일에 스니펫 저장
2. tmux 세션에서 `prefix + r` 실행
3. 분할/이동/스크롤 동작 확인

## 4.4 검증 체크리스트
- 마우스 스크롤과 pane 선택 동작 확인
- pane/window 번호가 1부터 시작하는지 확인
- `prefix + r`로 설정 리로드 메시지 확인

## 5. Playbook B: 세션 유지 운영 루틴
## 5.1 목적
- SSH 연결이 끊겨도 작업 컨텍스트를 유지하는 습관 확립

## 5.2 기본 명령 세트
```bash
# 세션이 없으면 만들고, 있으면 붙기
tmux new -As main

# 세션 목록 확인
tmux ls

# 특정 세션 다시 붙기
tmux attach -t main

# 세션 종료
tmux kill-session -t main
```

## 5.3 권장 루틴
1. 원격 접속 직후 `tmux new -As main`
2. 작업 중 연결 종료 시 `prefix + d`로 detach
3. 재접속 후 `tmux attach -t main`
4. 장기 작업은 window명을 용도별로 명확히 지정

## 5.4 트러블슈팅
- `no sessions`: 먼저 `tmux new -As main` 실행
- 예상과 다른 세션 접속: `tmux ls` 후 정확한 이름 attach
- 세션이 사라짐: 호스트 재부팅 여부/사용자 환경 초기화 정책 점검

## 6. Playbook C: Tailscale SSH 원격 작업 루틴
## 6.1 목적
- 공인망 공개 없이 안전하게 원격 SSH 접속 후 tmux 작업 지속

## 6.2 사전 조건
- 로컬/원격 장비 모두 Tailscale 로그인 완료
- 동일 Tailnet 또는 ACL 허용 경로 확인
- 원격 장비에서 SSH 정책 준비

## 6.3 기본 명령 세트
```bash
# 로컬에서 네트워크 상태 확인
tailscale status

# Tailscale SSH 사용(환경에 따라 일반 ssh도 가능)
tailscale ssh user@host
# 또는
ssh user@host

# 원격에서 tmux 세션 진입
tmux new -As work
```

## 6.4 권장 운영 플로우
1. 로컬 장비에서 Tailscale 연결 상태 확인
2. 원격 호스트에 SSH 접속
3. `tmux new -As work`로 작업 시작
4. 작업 종료 시 detach
5. 다른 장비에서 동일 호스트 재접속 후 attach

## 6.5 보안 가이드
- 가능한 한 Tailscale SSH/ACL 정책 사용
- 공개 SSH 포트 직접 노출 최소화
- root 직접 로그인보다 일반 사용자 + 최소 권한 운영 권장

## 7. 콘텐츠 표현 규칙
- 각 플레이북은 `개요 -> 사전 조건 -> 명령 -> 검증 -> 트러블슈팅` 고정 구조
- 명령 블록은 운영체제별 차이가 있으면 탭 분리(`macOS`, `Linux`)
- 실제 tmux와 시뮬레이터 차이는 `SIMULATED` 배지로 표시

## 8. 검색/북마크 연계
- 치트시트 검색 키워드:
  - `recommended config`
  - `tmux.conf`
  - `keep session alive`
  - `tailscale ssh`
- 플레이북은 북마크 타입 `playbook`으로 저장 가능

## 9. 분석 라우트
- `/playbooks/recommended-config`
- `/playbooks/session-persistence`
- `/playbooks/tailscale-ssh-workflow`
- `/playbooks/*/copied` (명령 복사 동작 대체 라우트)

## 10. 테스트 요구사항
- 명령 복사 버튼 동작
- 플레이북 단계 전환 상태 유지
- 각 체크리스트 항목 저장/복원
- 모바일에서 코드블록 가독성

## 11. DoD
- 플레이북 3종 본문/명령/검증/트러블슈팅 완성
- 치트시트 검색과 북마크에서 플레이북 진입 가능
- 첫 실습 완료 후 추천 플레이북으로 자연스럽게 전환 가능
