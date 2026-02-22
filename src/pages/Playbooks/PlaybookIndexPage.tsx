import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppLesson, AppPlaybook } from '../../features/curriculum/contentSchema';

type UseCaseCard = {
  id: string;
  label: string;
  title: string;
  problem: string;
  action: string;
  command?: string;
  lessonSlugs: string[];
  playbookSlugs?: string[];
};

const TMUX_USE_CASES: UseCaseCard[] = [
  {
    id: 'uc-recommended-conf',
    label: 'config',
    title: '권장 tmux.conf 베이스',
    problem: '기본 사용 루틴',
    action: '마우스, 인덱스(1 시작), 히스토리, copy-mode 키 체계를 기본 운영값으로 넣습니다.',
    command: 'tmux show -g default-terminal\ntmux show -g mouse\ntmux show -g focus-events',
    lessonSlugs: ['key-input-guide', 'terminal-render-guide'],
    playbookSlugs: ['recommended-config'],
  },
  {
    id: 'uc-session-recover',
    label: 'session',
    title: '다시 붙었을 때 이전 상태 복구',
    problem: 'SSH 재접속 후 어디서 작업했는지 놓치기 쉽다.',
    action: '세션 이름을 고정하고 재사용한다.',
    command: 'tmux new -As main\ntmux ls',
    lessonSlugs: ['attach-detach', 'attach-detach-shortcuts'],
    playbookSlugs: ['session-persistence'],
  },
  {
    id: 'uc-split-log-dev',
    label: 'layout',
    title: '코드/로그를 같은 화면에서 운영',
    problem: '창 전환이 많아지면 확인 누락이 생긴다.',
    action: '패인 분할 후 포커스를 짧게 순환한다.',
    command: 'tmux split-window -h\ntmux select-layout even-horizontal',
    lessonSlugs: ['split-resize', 'pane-focus-flow'],
    playbookSlugs: ['code-log-3pane-loop'],
  },
  {
    id: 'uc-copy-search',
    label: 'copy-mode',
    title: '긴 로그에서 에러 문자열 추출',
    problem: '터미널 스크롤만으로는 재탐색이 느리다.',
    action: 'copy-mode에서 검색하고 필요한 줄만 복사한다.',
    command: 'Ctrl+b [\n/ERROR',
    lessonSlugs: ['copy-search', 'copy-search-shortcuts'],
    playbookSlugs: ['scrollback-clipboard-osc52'],
  },
  {
    id: 'uc-layout-reset',
    label: 'focus',
    title: '레이아웃이 흐트러졌을 때 빠른 복구',
    problem: '리사이즈를 반복하면 균형이 무너진다.',
    action: '레이아웃을 규격 형태로 리셋한다.',
    command: 'tmux select-layout tiled',
    lessonSlugs: ['layout-craft', 'workspace-compose'],
    playbookSlugs: ['code-log-3pane-loop', 'terminal-render-troubleshooting'],
  },
  {
    id: 'uc-key-input',
    label: 'keys',
    title: 'prefix 입력 지연/충돌 점검',
    problem: 'prefix 이후 키가 늦게 반응하거나 충돌한다.',
    action: 'prefix, escape-time, 중첩 전달 순서로 확인한다.',
    command: 'tmux show -g prefix\ntmux show -sg escape-time',
    lessonSlugs: ['command-subset-shortcuts', 'pane-focus-flow-shortcuts'],
    playbookSlugs: ['key-input-troubleshooting'],
  },
];

const CLI_TMUX_USE_CASES: UseCaseCard[] = [
  {
    id: 'cc-worktree-sessions',
    label: 'claude code',
    title: '에이전트 병렬 작업 충돌 줄이기',
    problem: '같은 repo에서 다중 에이전트를 돌리면 충돌이 난다.',
    action: 'worktree와 tmux 세션을 1:1로 묶는다.',
    command: 'git worktree add ../app-auth feature/auth\ntmux new -s agent-auth -c ../app-auth',
    lessonSlugs: ['workspace-compose', 'attach-detach'],
    playbookSlugs: ['claude-worktree-sessions'],
  },
  {
    id: 'cc-dev-server-detach',
    label: 'claude code',
    title: '대화 세션과 dev server 분리',
    problem: 'long-running 프로세스가 대화를 막는다.',
    action: '서버는 detached 세션에서 띄우고 출력만 가져온다.',
    command: "tmux new-session -d -s dev-server 'pnpm dev'\ntmux capture-pane -t dev-server -p | tail -50",
    lessonSlugs: ['command-subset', 'split-resize'],
    playbookSlugs: ['claude-dev-server-split'],
  },
  {
    id: 'cc-agent-monitor',
    label: 'agent teams',
    title: '여러 에이전트 상태를 빠르게 점검',
    problem: '어느 세션이 실행 중인지 추적이 어렵다.',
    action: '세션/패인 목록을 주기적으로 확인한다.',
    command: "tmux ls\ntmux list-panes -a -F '#S:#I.#P #{pane_current_command}'",
    lessonSlugs: ['pane-focus-flow', 'workspace-compose-shortcuts'],
    playbookSlugs: ['agent-teams-tmux-mode'],
  },
  {
    id: 'cc-remote-resume',
    label: 'remote',
    title: '원격 CLI 세션을 끊김 없이 유지',
    problem: '모바일/원격 전환 중 세션이 끊긴다.',
    action: '원격 접속 시 tmux 세션 재사용을 기본으로 둔다.',
    command: 'tailscale ssh user@host "tmux new -As work"',
    lessonSlugs: ['attach-detach', 'command-subset-shortcuts'],
    playbookSlugs: ['tailscale-ssh-workflow'],
  },
  {
    id: 'cc-ghostty-profile',
    label: 'ghostty',
    title: 'Ghostty에서 Claude Code + tmux 충돌 줄이기',
    problem: 'Ctrl+b 충돌과 TERM 차이로 흐름이 끊긴다.',
    action: 'prefix 분리 + terminal-features 오버레이를 적용한다.',
    command: 'tmux show -g prefix\necho $TERM',
    lessonSlugs: ['key-input-guide', 'terminal-render-guide'],
    playbookSlugs: ['claude-ghostty-profile'],
  },
  {
    id: 'cc-terminal-matrix',
    label: 'terminal apps',
    title: '터미널 앱별 설정 차이를 운영 기준으로 통일',
    problem: '터미널을 바꾸면 키/색/클립보드 동작이 달라진다.',
    action: '공통 베이스와 앱별 오버레이를 분리한다.',
    command: 'echo $TERM\ntmux display-message -p "#{client_termname}"',
    lessonSlugs: ['terminal-render-guide', 'key-input-guide'],
    playbookSlugs: ['terminal-app-profile-matrix'],
  },
  {
    id: 'cc-render-check',
    label: 'tui',
    title: 'statusline/렌더 깨짐 점검',
    problem: 'tmux split 환경에서 UI 렌더가 깨질 때가 있다.',
    action: 'TERM, refresh, 상태줄 옵션을 순서대로 분리 점검한다.',
    command: 'echo $TERM\ntmux refresh-client -S',
    lessonSlugs: ['command-subset', 'layout-craft'],
    playbookSlugs: ['terminal-render-troubleshooting'],
  },
];

function buildPracticePath(lessonSlug: string) {
  return `/practice?lesson=${encodeURIComponent(lessonSlug)}`;
}

function firstLessonPath(lessonSlugs: string[]) {
  const firstLesson = lessonSlugs[0];
  if (!firstLesson) {
    return '/practice?lesson=hello-tmux';
  }

  return buildPracticePath(firstLesson);
}

export function PlaybookIndexPage() {
  const { t } = useTranslation();
  const [playbooks, setPlaybooks] = useState<AppPlaybook[]>([]);
  const [lessons, setLessons] = useState<AppLesson[]>([]);

  useEffect(() => {
    loadAppContent()
      .then((content) => {
        setPlaybooks(content.playbooks);
        setLessons(content.lessons);
      })
      .catch(() => {
        setPlaybooks([]);
        setLessons([]);
      });
  }, []);

  const lessonTitleMap = useMemo(() => {
    return new Map(lessons.map((lesson) => [lesson.slug, lesson.title]));
  }, [lessons]);

  const playbookMap = useMemo(() => {
    return new Map(playbooks.map((playbook) => [playbook.slug, playbook]));
  }, [playbooks]);

  const renderUseCaseCard = (useCase: UseCaseCard) => {
    const linkedPlaybooks = (useCase.playbookSlugs ?? [])
      .map((playbookSlug) => playbookMap.get(playbookSlug))
      .filter((playbook): playbook is AppPlaybook => Boolean(playbook));

    return (
      <article key={useCase.id} className="reference-guide-card">
        <p className="reference-type">{useCase.label}</p>
        <h3>{t(useCase.title)}</h3>
        <p className="muted">{t(useCase.problem)}</p>
        <p className="muted">{t(useCase.action)}</p>
        {useCase.command ? <code className="reference-command-block">{useCase.command}</code> : null}

        <div className="reference-link-row">
          {useCase.lessonSlugs.map((lessonSlug) => (
            <Link key={`${useCase.id}-${lessonSlug}`} to={buildPracticePath(lessonSlug)} className="text-link">
              {t(lessonTitleMap.get(lessonSlug) ?? lessonSlug)}
            </Link>
          ))}
        </div>

        {linkedPlaybooks.length > 0 ? (
          <div className="reference-usecase-playbook-block">
            <p className="muted">{t('관련 유즈케이스 가이드')}</p>
            <ul className="reference-usecase-playbook-list">
              {linkedPlaybooks.map((playbook) => (
                <li key={`${useCase.id}-${playbook.slug}`}>
                  <Link to={`/playbooks/${playbook.slug}`} className="text-link">
                    {t(playbook.title)}
                  </Link>
                  <span className="muted">
                    {t('{{minutes}}분 · 단계 {{steps}}개', {
                      minutes: playbook.estimatedMinutes,
                      steps: playbook.steps.length,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="inline-actions">
          <Link to={firstLessonPath(useCase.lessonSlugs)} className="secondary-btn">
            {t('관련 레슨 열기')}
          </Link>
          {linkedPlaybooks[0] ? (
            <Link to={`/playbooks/${linkedPlaybooks[0].slug}`} className="secondary-btn">
              {t('관련 가이드 열기')}
            </Link>
          ) : null}
        </div>
      </article>
    );
  };

  return (
    <PagePlaceholder
      eyebrow={t('Use Cases')}
      title={t('유즈케이스 가이드')}
      description={t('유즈케이스별 실행 루틴을 모았습니다. 필요한 카드만 선택해서 진행하면 됩니다.')}
    >
      <section className="home-stage-grid">
        <article className="home-stage-card">
          <h2>{t('권장 사용 흐름')}</h2>
          <p>{t('1) 기본·명령 가이드에서 동작 확인')}</p>
          <p>{t('2) 유즈케이스 카드에서 상황 선택')}</p>
          <p>{t('3) 관련 레슨과 가이드로 실행')}</p>
          <div className="inline-actions">
            <Link to="/cheatsheet" className="secondary-btn">
              {t('기본·명령 가이드로 이동')}
            </Link>
            <Link to="/practice?lesson=hello-tmux" className="secondary-btn">
              {t('실습 바로 열기')}
            </Link>
          </div>
        </article>
      </section>

      <section className="reference-section">
        <h2>{t('핵심 tmux 유즈케이스')}</h2>
        <div className="reference-guide-grid">{TMUX_USE_CASES.map(renderUseCaseCard)}</div>
      </section>

      <section className="reference-section">
        <h2>{t('코딩에이전트 CLI + tmux')}</h2>
        <div className="reference-guide-grid">{CLI_TMUX_USE_CASES.map(renderUseCaseCard)}</div>
      </section>
    </PagePlaceholder>
  );
}
