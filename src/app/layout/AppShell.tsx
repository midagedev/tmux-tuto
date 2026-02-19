import type { ChangeEvent } from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnalyticsConsentBanner } from '../../components/system/AnalyticsConsentBanner';
import { useAnalyticsConsentState, useCloudflareAnalytics, useMicrosoftClarity } from '../../features/analytics';
import { useSimulatorStore } from '../../features/simulator/simulatorStore';
import { BRAND } from '../brand';
import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGE_CODES, type SupportedLanguageCode } from '../../i18n';

const LANGUAGE_LABELS: Record<SupportedLanguageCode, string> = {
  ko: 'KO',
  en: 'EN',
  ja: 'JA',
  zh: 'ZH',
};

export function AppShell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { consent, setGranted, setDenied } = useAnalyticsConsentState();
  useCloudflareAnalytics(consent);
  useMicrosoftClarity(consent);
  const hydrateSimulatorFromStorage = useSimulatorStore((store) => store.hydrateFromStorage);
  const mainLinks = [
    { to: '/learn', label: t('학습 경로') },
    { to: '/practice', label: t('실습') },
    { to: '/cheatsheet', label: t('레퍼런스') },
  ];

  useEffect(() => {
    void hydrateSimulatorFromStorage();
  }, [hydrateSimulatorFromStorage]);
  useEffect(() => {
    const nextParams = new URLSearchParams(location.search);
    const urlLang = nextParams.get('lang');
    const normalized = i18n.language.split('-')[0] as SupportedLanguageCode;

    if (!SUPPORTED_LANGUAGE_CODES.includes(normalized)) {
      return;
    }

    if (urlLang !== normalized) {
      nextParams.set('lang', normalized);
      navigate(
        {
          pathname: location.pathname,
          search: `?${nextParams.toString()}`,
          hash: location.hash,
        },
        { replace: true },
      );
      return;
    }

    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  }, [i18n.language, location.hash, location.pathname, location.search, navigate]);

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as SupportedLanguageCode;
    if (!SUPPORTED_LANGUAGE_CODES.includes(next)) {
      return;
    }
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    void i18n.changeLanguage(next);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('본문으로 건너뛰기')}
      </a>
      <div className="app-shell">
        <header className="left-panel app-header" aria-label="Primary Navigation">
          <div className="app-header-brand-row">
            <NavLink to="/" className="brand">
              <span className="brand-name">{BRAND.name}</span>
              <small className="brand-subtitle">{t('tmux 실습 학습')}</small>
            </NavLink>
            <p className="app-header-summary">{t('초급부터 심화까지, tmux를 단순하고 실전적으로 익힙니다.')}</p>
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
                {t('실습 시작')}
              </Link>
              <label className="sr-only" htmlFor="app-language-select">
                {t('언어')}
              </label>
              <select
                id="app-language-select"
                className="secondary-btn app-analytics-toggle"
                value={SUPPORTED_LANGUAGE_CODES.includes(i18n.language as SupportedLanguageCode)
                  ? (i18n.language as SupportedLanguageCode)
                  : 'ko'}
                onChange={handleLanguageChange}
                aria-label={t('언어')}
              >
                {SUPPORTED_LANGUAGE_CODES.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang]}
                  </option>
                ))}
              </select>
              {consent !== 'unknown' ? (
                <button
                  type="button"
                  className="secondary-btn app-analytics-toggle"
                  onClick={consent === 'granted' ? setDenied : setGranted}
                >
                  {consent === 'granted' ? t('분석 끄기') : t('분석 켜기')}
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
