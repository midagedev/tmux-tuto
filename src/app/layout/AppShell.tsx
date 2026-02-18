import { useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnalyticsConsentBanner } from '../../components/system/AnalyticsConsentBanner';
import { useAnalyticsConsentState, useCloudflareAnalytics } from '../../features/analytics';
import { useSimulatorStore } from '../../features/simulator/simulatorStore';

const mainLinks = [
  { to: '/learn', label: 'Learn' },
  { to: '/practice', label: 'Practice' },
  { to: '/cheatsheet', label: 'Cheatsheet' },
  { to: '/playbooks', label: 'Playbooks' },
  { to: '/bookmarks', label: 'Bookmarks' },
  { to: '/progress', label: 'Progress' },
];

type RouteContext = {
  title: string;
  objective: string;
  nextActions: string[];
};

function resolveRouteContext(pathname: string): RouteContext {
  if (pathname === '/') {
    return {
      title: '시작 안내',
      objective: '3분 안에 첫 실습 성공을 만들고 학습 루프를 시작합니다.',
      nextActions: ['온보딩 시작', '첫 레슨(hello-tmux) 열기', '실습 화면에서 첫 미션 통과'],
    };
  }

  if (pathname.startsWith('/learn')) {
    return {
      title: '커리큘럼 학습',
      objective: '레슨 목표를 확인하고 즉시 실습으로 연결합니다.',
      nextActions: ['레슨 목표 확인', '완료 기준 확인', '시뮬레이터에서 레슨 시작'],
    };
  }

  if (pathname.startsWith('/practice')) {
    return {
      title: '실습 모드',
      objective: '레슨 내용을 바로 명령 실행으로 검증해 미션을 완료합니다.',
      nextActions: ['Lesson/Mission 선택', '명령 실행', '판정 상태 확인'],
    };
  }

  if (pathname.startsWith('/playbooks')) {
    return {
      title: '실무 플레이북',
      objective: '학습 내용을 실제 운영 루틴으로 옮깁니다.',
      nextActions: ['상황에 맞는 플레이북 선택', '명령 순서대로 실행', '검증 항목 체크'],
    };
  }

  if (pathname.startsWith('/progress')) {
    return {
      title: '진행도 점검',
      objective: '완료 현황을 확인하고 다음 미션을 결정합니다.',
      nextActions: ['트랙 진행률 확인', '추천 미션 확인', '다음 학습 경로 선택'],
    };
  }

  return {
    title: '학습 컨텍스트',
    objective: '현재 화면의 목표를 확인하고 다음 액션을 진행합니다.',
    nextActions: ['현재 화면 목적 확인', '실행 가능한 액션 선택', '완료 결과 점검'],
  };
}

export function AppShell() {
  const { consent, setGranted, setDenied } = useAnalyticsConsentState();
  useCloudflareAnalytics(consent);
  const hydrateSimulatorFromStorage = useSimulatorStore((store) => store.hydrateFromStorage);
  const location = useLocation();

  const routeContext = useMemo(() => resolveRouteContext(location.pathname), [location.pathname]);

  useEffect(() => {
    void hydrateSimulatorFromStorage();
  }, [hydrateSimulatorFromStorage]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <div className="app-shell">
        <aside className="left-panel" aria-label="Primary Navigation">
          <NavLink to="/" className="brand">
            tmux-tuto
          </NavLink>
          <nav className="main-nav">
            {mainLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main id="main-content" className="main-panel">
          <Outlet />
        </main>

        <aside className="right-panel" aria-label="Context Panel">
          <h2>{routeContext.title}</h2>
          <p>{routeContext.objective}</p>
          <ul className="context-action-list">
            {routeContext.nextActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
          <p className="muted">
            Analytics: {consent === 'granted' ? '동의됨' : consent === 'denied' ? '거부됨' : '대기중'}
          </p>
          {consent !== 'unknown' ? (
            <button
              type="button"
              className="secondary-btn"
              onClick={consent === 'granted' ? setDenied : setGranted}
            >
              {consent === 'granted' ? '분석 비활성화' : '분석 활성화'}
            </button>
          ) : null}
        </aside>
      </div>

      <AnalyticsConsentBanner consent={consent} onAccept={setGranted} onDecline={setDenied} />
    </>
  );
}
