import { useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnalyticsConsentBanner } from '../../components/system/AnalyticsConsentBanner';
import { useAnalyticsConsentState, useCloudflareAnalytics } from '../../features/analytics';
import { useSimulatorStore } from '../../features/simulator/simulatorStore';
import { BRAND } from '../brand';

const mainLinks = [
  { to: '/learn', label: '학습 경로' },
  { to: '/practice', label: '실습' },
  { to: '/cheatsheet', label: '치트시트' },
  { to: '/playbooks', label: '플레이북' },
  { to: '/progress', label: '진행도' },
];

type RouteContext = {
  title: string;
  objective: string;
  nextAction: string;
};

function resolveRouteContext(pathname: string): RouteContext {
  if (pathname === '/') {
    return {
      title: '시작',
      objective: '바로 실습으로 들어가 초급 코어를 빠르게 완료합니다.',
      nextAction: '실습 시작 버튼 클릭',
    };
  }

  if (pathname.startsWith('/learn')) {
    return {
      title: '학습 경로',
      objective: '초급 코어 완료 후 심화로 넘어갑니다.',
      nextAction: '레슨 선택 후 실습 열기',
    };
  }

  if (pathname.startsWith('/practice')) {
    return {
      title: '실습',
      objective: '현재 미션을 명령 실행으로 통과합니다.',
      nextAction: '명령 실행 후 판정 확인',
    };
  }

  if (pathname.startsWith('/playbooks')) {
    return {
      title: '플레이북',
      objective: '학습 내용을 실제 운영 루틴으로 전환합니다.',
      nextAction: '상황에 맞는 플레이북 실행',
    };
  }

  if (pathname.startsWith('/progress')) {
    return {
      title: '진행도',
      objective: '완료 현황을 점검하고 다음 레슨을 결정합니다.',
      nextAction: '다음 미완료 레슨 선택',
    };
  }

  return {
    title: '안내',
    objective: '현재 화면의 핵심 작업을 짧게 수행합니다.',
    nextAction: '현재 화면의 주요 버튼 실행',
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
        <header className="left-panel app-top-row" aria-label="Primary Navigation">
          <NavLink to="/" className="brand">
            <span className="brand-name">{BRAND.name}</span>
            <small className="brand-subtitle">{BRAND.descriptor}</small>
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
        </header>

        <section className="right-panel app-context-row" aria-label="Context Panel">
          <p>
            <strong>{routeContext.title}</strong> · {routeContext.objective}
          </p>
          <p className="muted">다음 행동: {routeContext.nextAction}</p>
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
        </section>

        <main id="main-content" className="main-panel">
          <Outlet />
        </main>
      </div>

      <AnalyticsConsentBanner consent={consent} onAccept={setGranted} onDecline={setDenied} />
    </>
  );
}

