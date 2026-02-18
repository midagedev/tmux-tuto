import { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { AnalyticsConsentBanner } from '../../components/system/AnalyticsConsentBanner';
import { useAnalyticsConsentState, useCloudflareAnalytics } from '../../features/analytics';
import { useSimulatorStore } from '../../features/simulator/simulatorStore';
import { BRAND } from '../brand';

const mainLinks = [
  { to: '/learn', label: '학습 경로' },
  { to: '/practice', label: '실습' },
  { to: '/cheatsheet', label: '레퍼런스' },
];

export function AppShell() {
  const { consent, setGranted, setDenied } = useAnalyticsConsentState();
  useCloudflareAnalytics(consent);
  const hydrateSimulatorFromStorage = useSimulatorStore((store) => store.hydrateFromStorage);

  useEffect(() => {
    void hydrateSimulatorFromStorage();
  }, [hydrateSimulatorFromStorage]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <div className="app-shell">
        <header className="left-panel app-header" aria-label="Primary Navigation">
          <div className="app-header-brand-row">
            <NavLink to="/" className="brand">
              <span className="brand-name">{BRAND.name}</span>
              <small className="brand-subtitle">{BRAND.descriptor}</small>
            </NavLink>
            <p className="app-header-summary">{BRAND.tagline}</p>
          </div>

          <div className="app-header-nav-row">
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
            <div className="app-header-controls" aria-label="Header Controls">
              <Link to="/practice?lesson=hello-tmux" className="primary-btn app-start-btn">
                실습 시작
              </Link>
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
