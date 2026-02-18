import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../components/system/PagePlaceholder';
import { BRAND } from '../app/brand';

const STAGE_ITEMS = [
  {
    title: '초급 코어 루프',
    summary: 'session/window/pane 조작과 detach/attach 루틴을 빠르게 체득합니다.',
    detail: '핵심 레슨을 짧게 끝내고 바로 실습으로 연결합니다.',
    actionLabel: '초급 경로 보기',
    to: '/learn',
  },
  {
    title: '심화 운영 루프',
    summary: 'copy-mode, command-mode, tmux 설정 적용과 원격 운영 루틴으로 확장합니다.',
    detail: '실무에서 자주 부딪히는 상황 중심으로 반복 훈련합니다.',
    actionLabel: '심화 실습 시작',
    to: '/practice?lesson=copy-search',
  },
] as const;

const MENU_ITEMS = [
  {
    title: '학습 경로',
    description: '초급/심화 레슨 구조를 확인하고 현재 위치를 명확히 잡습니다.',
    cta: '경로 열기',
    to: '/learn',
  },
  {
    title: '실습 워크벤치',
    description: '레슨, 미션, 명령 제안을 한 화면에서 관리하며 바로 실행합니다.',
    cta: '실습 열기',
    to: '/practice?lesson=hello-tmux',
  },
  {
    title: '레퍼런스 허브',
    description: '명령/단축키/플레이북을 한 메뉴에서 검색하고 바로 실습으로 연결합니다.',
    cta: '검색 시작',
    to: '/cheatsheet',
  },
  {
    title: '진행도',
    description: '보조 메뉴입니다. 필요할 때만 XP/트랙 진행률/업적을 확인합니다.',
    cta: '진행도(선택) 보기',
    to: '/progress',
  },
] as const;

export function HomePage() {
  return (
    <PagePlaceholder
      eyebrow={BRAND.name}
      title="tmux를 실전 운영 루틴으로 익히는 가장 빠른 학습 플로우"
      description="설명보다 실행을 앞세우고, 초급 코어에서 심화 루틴까지 자연스럽게 이어지는 실습 중심 구조로 설계했습니다."
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
              바로 실습 시작
            </Link>
            <Link to="/learn" className="secondary-btn">
              초급/심화 경로 보기
            </Link>
          </div>
        </div>

        <aside className="home-hero-panel" aria-label="학습 핵심 포인트">
          <p className="page-eyebrow">핵심 운영 원칙</p>
          <div className="home-stat-grid">
            <article className="home-stat-card">
              <strong>실습 우선</strong>
              <span>명령 입력과 즉시 피드백 중심</span>
            </article>
            <article className="home-stat-card">
              <strong>짧은 루프</strong>
              <span>복잡한 이론보다 반복 가능한 행동 루틴</span>
            </article>
            <article className="home-stat-card">
              <strong>실무 전환</strong>
              <span>로컬에서 원격 세션 운영으로 확장</span>
            </article>
          </div>
        </aside>
      </section>

      <section className="home-stage-grid" aria-label="학습 단계">
        {STAGE_ITEMS.map((item) => (
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

      <section className="home-surface-grid" aria-label="메뉴 구성">
        {MENU_ITEMS.map((menu) => (
          <article key={menu.title} className="home-surface-card">
            <h2>{menu.title}</h2>
            <p>{menu.description}</p>
            <Link to={menu.to} className="text-link">
              {menu.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="home-links-card" aria-label="프로젝트 링크">
        <h2>프로젝트 링크</h2>
        <ul className="link-list">
          <li>
            소스코드: {' '}
            <a href="https://github.com/midagedev/tmux-tuto" target="_blank" rel="noreferrer">
              github.com/midagedev/tmux-tuto
            </a>
          </li>
          <li>
            X (Twitter): {' '}
            <a href="https://x.com/midagedev" target="_blank" rel="noreferrer">
              x.com/midagedev
            </a>
          </li>
        </ul>
      </section>
    </PagePlaceholder>
  );
}
