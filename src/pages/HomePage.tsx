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
      title: t('레퍼런스 허브'),
      description: t('명령/단축키/플레이북을 한 메뉴에서 검색하고 바로 실습으로 연결합니다.'),
      cta: t('검색 시작'),
      to: '/cheatsheet',
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
          <p className="home-brand-kicker">{BRAND.descriptor}</p>
          <p className="home-hero-summary">{BRAND.valuePromise}</p>
          <ul className="home-pillar-list">
            {BRAND.valuePillars.map((item) => (
              <li key={item}>{item}</li>
            ))}
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
