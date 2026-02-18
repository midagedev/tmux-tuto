import { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { AnalyticsConsentBanner } from '../../components/system/AnalyticsConsentBanner';
import { useAnalyticsConsentState, useCloudflareAnalytics } from '../../features/analytics';
import { useSimulatorStore } from '../../features/simulator/simulatorStore';
import { useI18n } from '../../i18n';
import { BRAND_NAME } from '../brand';
export function AppShell() {
    const { t } = useI18n();
    const { consent, setGranted, setDenied } = useAnalyticsConsentState();
    useCloudflareAnalytics(consent);
    const hydrateSimulatorFromStorage = useSimulatorStore((store) => store.hydrateFromStorage);
    const mainLinks = [
        { to: '/learn', label: t('app.nav.learn') },
        { to: '/practice', label: t('app.nav.practice') },
        { to: '/cheatsheet', label: t('app.nav.reference') },
    ];
    useEffect(() => {
        void hydrateSimulatorFromStorage();
    }, [hydrateSimulatorFromStorage]);
    return (<>
      <a className="skip-link" href="#main-content">
        {t('app.skipToContent')}
      </a>
      <div className="app-shell">
        <header className="left-panel app-header" aria-label="Primary Navigation">
          <div className="app-header-brand-row">
            <NavLink to="/" className="brand">
              <span className="brand-name">{BRAND_NAME}</span>
              <small className="brand-subtitle">{t('brand.descriptor')}</small>
            </NavLink>
            <p className="app-header-summary">{t('brand.tagline')}</p>
          </div>

          <div className="app-header-nav-row">
            <nav className="main-nav">
              {mainLinks.map((link) => (<NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                  {link.label}
                </NavLink>))}
            </nav>
            <div className="app-header-controls" aria-label="Header Controls">
              <Link to="/practice?lesson=hello-tmux" className="primary-btn app-start-btn">
                {t('app.startPractice')}
              </Link>
              {consent !== 'unknown' ? (<button type="button" className="secondary-btn app-analytics-toggle" onClick={consent === 'granted' ? setDenied : setGranted}>
                  {consent === 'granted' ? t('app.analyticsOff') : t('app.analyticsOn')}
                </button>) : null}
            </div>
          </div>
        </header>

        <main id="main-content" className="main-panel">
          <Outlet />
        </main>
      </div>

      <AnalyticsConsentBanner consent={consent} onAccept={setGranted} onDecline={setDenied}/>
    </>);
}
