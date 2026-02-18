import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
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
          <h2>Context</h2>
          <p>현재 화면의 목표, 단축키 힌트, 최근 진행 정보를 이 영역에 표시합니다.</p>
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
