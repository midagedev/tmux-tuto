import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../components/system/PagePlaceholder';
import { BRAND } from '../app/brand';

export function HomePage() {
  const { t } = useTranslation();
  const stageItems = [
    {
      title: t('기초 운영 루프'),
      summary: t('session/window/pane 조작, detach/attach, pane 이동까지 빠르게 체득합니다.'),
      detail: t('핵심 레슨을 짧게 끝내고 바로 실습으로 연결합니다.'),
      actionLabel: t('학습 경로 보기'),
      to: '/learn',
    },
    {
      title: t('운영 확장 루프'),
      summary: t('copy-mode, command-mode, tmux 설정 적용과 원격 운영 루틴으로 확장합니다.'),
      detail: t('실무에서 자주 부딪히는 상황 중심으로 반복 훈련합니다.'),
      actionLabel: t('운영 루프 시작'),
      to: '/practice?lesson=copy-search',
    },
  ] as const;
  const menuItems = [
    {
      title: t('학습 경로'),
      description: t('하나의 통합 레슨 경로에서 현재 위치를 확인하고 다음 실습을 이어갑니다.'),
      cta: t('경로 열기'),
      to: '/learn',
    },
    {
      title: t('실습 워크벤치'),
      description: t('레슨, 미션, 명령 제안을 한 화면에서 관리하며 바로 실행합니다.'),
      cta: t('실습 열기'),
      to: '/practice?lesson=hello-tmux',
    },
    {
      title: t('기본·명령 가이드'),
      description: t('기본 사용법과 자주 쓰는 명령/단축키를 빠르게 찾아 바로 실습으로 연결합니다.'),
      cta: t('명령 찾기'),
      to: '/cheatsheet',
    },
    {
      title: t('유즈케이스 가이드'),
      description: t('원격 작업 유지, 로그 조사, 복구 절차 같은 상황별 운영 루틴을 확인합니다.'),
      cta: t('시나리오 보기'),
      to: '/playbooks',
    },
    {
      title: t('진행도'),
      description: t('보조 메뉴입니다. 필요할 때만 XP/트랙 진행률/업적을 확인합니다.'),
      cta: t('진행도(선택) 보기'),
      to: '/progress',
    },
  ] as const;
  const tmuxStartLinks = [
    {
      label: t('tmux 공식 저장소 (개요/README)'),
      href: 'https://github.com/tmux/tmux',
    },
    {
      label: t('tmux Getting Started (공식 위키)'),
      href: 'https://github.com/tmux/tmux/wiki/Getting-Started',
    },
    {
      label: t('tmux 설치 가이드 (공식 위키)'),
      href: 'https://github.com/tmux/tmux/wiki/Installing',
    },
    {
      label: t('macOS/Homebrew 설치 페이지'),
      href: 'https://formulae.brew.sh/formula/tmux',
    },
  ] as const;
  const changelogItems = [
    {
      date: '2026-02-21',
      title: t('유즈케이스 가이드 대폭 확장'),
      summary: t(
        '원격 운영, 로그 조사, 입력/렌더링 트러블슈팅, 코딩에이전트 CLI 연동 시나리오를 추가하고 유즈케이스 페이지 중심으로 구조를 정리했습니다.',
      ),
      to: '/playbooks',
      actionLabel: t('유즈케이스 확인'),
    },
    {
      date: '2026-02-19',
      title: t('실습 UX 개선: 업적 피드/미션 네비게이션 개편'),
      summary: t(
        '업적 팝업을 인라인 피드로 전환하고, 미션/레슨 이동 버튼과 미션 완료 안내를 추가해 다음 단계 이동 흐름을 더 명확하게 만들었습니다.',
      ),
      to: '/practice?lesson=hello-tmux',
      actionLabel: t('실습 열기'),
    },
    {
      date: '2026-02-19',
      title: t('레이아웃/워크스페이스 병합 레슨 추가'),
      summary: t('pane 리사이즈/재배치 레슨 2종과 윈도우/세션 병합 중심 workspace-compose 레슨 2종을 추가했습니다.'),
      to: '/practice?lesson=workspace-compose',
      actionLabel: t('실습 열기'),
    },
    {
      date: '2026-02-18',
      title: t('서비스 오픈'),
      summary: t('2026-02-18 저녁에 tmux-tuto를 첫 공개했습니다.'),
      to: '/practice?lesson=hello-tmux',
      actionLabel: t('바로 실습 시작'),
    },
  ] as const;

  return (
    <PagePlaceholder
      eyebrow={BRAND.name}
      title={t('tmux를 실전 운영 루틴으로 익히는 가장 빠른 학습 플로우')}
      description={t(
        '설명보다 실행을 앞세우고, 첫 레슨부터 운영 루틴까지 하나의 흐름으로 이어지는 실습 중심 구조로 설계했습니다.',
      )}
    >
      <section className="home-hero">
        <div className="home-hero-main">
          <p className="home-brand-kicker">{t('tmux 실습 학습')}</p>
          <p className="home-hero-summary">
            {t('학습이 끝나면 로컬과 원격 터미널에서 tmux를 자연스럽게 운영하는 개발자가 됩니다.')}
          </p>
          <ul className="home-pillar-list">
            <li>{t('시뮬레이터를 먼저 만나고, 필요한 설명은 바로 옆에서 확인')}</li>
            <li>{t('초급 코어 루틴을 먼저 완성하고, 이후 심화로 확장')}</li>
            <li>{t('복잡한 선택보다 짧은 실행 루프를 반복')}</li>
          </ul>
          <div className="inline-actions">
            <Link to="/practice?lesson=hello-tmux" className="primary-btn">
              {t('바로 실습 시작')}
            </Link>
            <Link to="/learn" className="secondary-btn">
              {t('학습 경로 보기')}
            </Link>
          </div>
          <p className="home-desktop-hint">
            {t('원활한 실습을 위해 데스크톱 환경을 권장합니다.')}
          </p>
        </div>

        <aside className="home-hero-panel" aria-label={t('학습 핵심 포인트')}>
          <p className="page-eyebrow">{t('핵심 운영 원칙')}</p>
          <div className="home-stat-grid">
            <article className="home-stat-card">
              <strong>{t('실습 우선')}</strong>
              <span>{t('명령 입력과 즉시 피드백 중심')}</span>
            </article>
            <article className="home-stat-card">
              <strong>{t('짧은 루프')}</strong>
              <span>{t('복잡한 이론보다 반복 가능한 행동 루틴')}</span>
            </article>
            <article className="home-stat-card">
              <strong>{t('실무 전환')}</strong>
              <span>{t('로컬에서 원격 세션 운영으로 확장')}</span>
            </article>
          </div>
        </aside>
      </section>

      <section className="home-stage-grid" aria-label={t('학습 단계')}>
        {stageItems.map((item) => (
          <article key={item.title} className="home-stage-card">
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <p className="muted">{item.detail}</p>
            <Link to={item.to} className="secondary-btn">
              {item.actionLabel}
            </Link>
          </article>
        ))}
      </section>

      <section className="home-surface-grid" aria-label={t('메뉴 구성')}>
        {menuItems.map((menu) => (
          <article key={menu.title} className="home-surface-card">
            <h2>{menu.title}</h2>
            <p>{menu.description}</p>
            <Link to={menu.to} className="text-link">
              {menu.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="home-changelog-card" aria-label={t('최근 변경 사항')}>
        <div className="home-changelog-head">
          <h2>{t('업데이트 로그')}</h2>
          <p className="muted">{t('최근 반영된 변경 사항입니다. 새로운 흐름부터 먼저 확인하세요.')}</p>
        </div>
        <ul className="home-changelog-list">
          {changelogItems.map((item) => (
            <li key={`${item.date}-${item.title}`} className="home-changelog-item">
              <p className="home-changelog-date">{item.date}</p>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <Link to={item.to} className="text-link">
                {item.actionLabel}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-links-card" aria-label={t('프로젝트 링크')}>
        <h2>{t('tmux 시작 링크')}</h2>
        <p className="muted">
          {t(
            'tmux는 하나의 터미널에서 여러 작업을 유지/전환하고, 연결이 끊겨도 세션을 복구할 수 있게 해주는 terminal multiplexer입니다. 먼저 공식 개론을 읽고, 본인 OS에 맞는 설치 가이드를 확인한 뒤 실습을 시작하세요.',
          )}
        </p>
        <ul className="link-list">
          {tmuxStartLinks.map((item) => (
            <li key={item.href}>
              <a href={item.href} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <h3>{t('프로젝트 링크')}</h3>
        <ul className="link-list">
          <li>
            {t('소스코드')}: {' '}
            <a href="https://github.com/midagedev/tmux-tuto" target="_blank" rel="noreferrer">
              github.com/midagedev/tmux-tuto
            </a>
          </li>
          <li>
            {t('X (Twitter)')}: {' '}
            <a href="https://x.com/midagedev" target="_blank" rel="noreferrer">
              x.com/midagedev
            </a>
          </li>
        </ul>
      </section>
    </PagePlaceholder>
  );
}
