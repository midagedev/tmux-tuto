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

function resolveRouteLabel(pathname: string): string {
  if (pathname === '/') {
    return '홈';
  }

  if (pathname.startsWith('/learn')) {
    return '학습 경로';
  }

  if (pathname.startsWith('/practice')) {
    return '실습';
  }

  if (pathname.startsWith('/playbooks')) {
    return '플레이북';
  }

  if (pathname.startsWith('/progress')) {
    return '진행도';
  }

  return '안내';
}

export function AppShell() {
  const { consent, setGranted, setDenied } = useAnalyticsConsentState();
  useCloudflareAnalytics(consent);
  const hydrateSimulatorFromStorage = useSimulatorStore((store) => store.hydrateFromStorage);
  const location = useLocation();
  const routeLabel = useMemo(() => resolveRouteLabel(location.pathname), [location.pathname]);
  const analyticsStatus = consent === 'granted' ? '켜짐' : consent === 'denied' ? '꺼짐' : '대기';

  useEffect(() => {
    void hydrateSimulatorFromStorage();
  }, [hydrateSimulatorFromStorage]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <div className="app-shell">
        <header className="left-panel app-top-row app-header" aria-label="Primary Navigation">
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
          <div className="app-header-meta" aria-label="Page Context">
            <span className="app-route-chip">{routeLabel}</span>
            <span className="app-analytics-chip">Analytics {analyticsStatus}</span>
            {consent !== 'unknown' ? (
              <button
                type="button"
                className="secondary-btn app-analytics-toggle"
                onClick={consent === 'granted' ? setDenied : setGranted}
              >
                {consent === 'granted' ? '분석 끄기' : '분석 켜기'}
              </button>
            ) : null}
          </div>
        </header>

        <main id="main-content" className="main-panel">
          <Outlet />
        </main>
      </div>

      <AnalyticsConsentBanner consent={consent} onAccept={setGranted} onDecline={setDenied} />
    </>
  );
}
