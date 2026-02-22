import type { ChangeEvent } from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnalyticsConsentBanner } from '../../components/system/AnalyticsConsentBanner';
import { setClarityTag, useAnalyticsConsentState, useCloudflareAnalytics, useMicrosoftClarity } from '../../features/analytics';
import { useSimulatorStore } from '../../features/simulator/simulatorStore';
import { BRAND } from '../brand';
import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGE_CODES, type SupportedLanguageCode } from '../../i18n';

const LANGUAGE_LABELS: Record<SupportedLanguageCode, string> = {
  ko: 'KO',
  en: 'EN',
  ja: 'JA',
  zh: 'ZH',
};
const SITE_ORIGIN = 'https://tmux.midagedev.com';
const SITE_NAME = 'tmux-tuto';

function setMetaTag(attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setCanonicalLink(url: string) {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', url);
}

function applyRouteSeo(pathname: string, title: string, description: string) {
  const canonicalUrl = new URL(pathname, SITE_ORIGIN).toString();
  const pageTitle = `${title} | ${SITE_NAME}`;

  document.title = pageTitle;
  setMetaTag('name', 'description', description);
  setMetaTag('property', 'og:title', pageTitle);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('name', 'twitter:title', pageTitle);
  setMetaTag('name', 'twitter:description', description);
  setCanonicalLink(canonicalUrl);
}

export function AppShell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isPracticeRoute = location.pathname.startsWith('/practice');
  const { consent, setGranted, setDenied } = useAnalyticsConsentState();
  useCloudflareAnalytics(consent);
  useMicrosoftClarity(consent);
  const hydrateSimulatorFromStorage = useSimulatorStore((store) => store.hydrateFromStorage);
  const mainLinks = [
    { to: '/learn', label: t('학습 경로') },
    { to: '/practice', label: t('실습') },
    { to: '/cheatsheet', label: t('기본·명령 가이드') },
    { to: '/playbooks', label: t('유즈케이스 가이드') },
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

  useEffect(() => {
    const normalized = i18n.language.split('-')[0] as SupportedLanguageCode;
    if (!SUPPORTED_LANGUAGE_CODES.includes(normalized)) {
      return;
    }
    setClarityTag('language', normalized);
  }, [i18n.language]);

  useEffect(() => {
    let routeTitle = t('tmux를 실전 운영 루틴으로 익히는 가장 빠른 학습 플로우');
    let routeDescription = t('설치 없이 브라우저에서 실제 Linux VM으로 tmux를 실습하세요. 세션, 윈도우, 패인, copy-mode까지 단계별 미션 제공.');

    if (location.pathname.startsWith('/learn')) {
      routeTitle = t('학습 경로');
      routeDescription = t('tmux 레슨 경로를 순서대로 따라가며 기본 동작부터 운영 루틴까지 학습합니다.');
    } else if (location.pathname.startsWith('/practice')) {
      routeTitle = t('실습 워크벤치');
      routeDescription = t('브라우저 VM에서 tmux 명령을 바로 실행하고 미션으로 검증합니다.');
    } else if (location.pathname === '/cheatsheet') {
      routeTitle = t('기본·명령 가이드');
      routeDescription = t('tmux 기본 사용법과 자주 쓰는 명령/단축키를 빠르게 찾아 바로 실습으로 연결합니다.');
    } else if (location.pathname === '/playbooks') {
      routeTitle = t('유즈케이스 가이드');
      routeDescription = t('실무 상황별 tmux 운영 루틴과 코딩에이전트 CLI 연동 패턴을 짧게 확인합니다.');
    } else if (location.pathname.startsWith('/playbooks/')) {
      routeTitle = t('유즈케이스 상세 가이드');
      routeDescription = t('선택한 tmux 유즈케이스를 단계별로 실행하고 문제 상황별 대응 방법을 확인합니다.');
    } else if (location.pathname.startsWith('/progress')) {
      routeTitle = t('학습 진행도');
      routeDescription = t('레슨 완료, 미션 통과, 업적 진행 상태를 한 화면에서 확인합니다.');
    }

    applyRouteSeo(location.pathname, routeTitle, routeDescription);
  }, [location.pathname, t]);

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
      <div className={`app-shell${isPracticeRoute ? ' app-shell-practice' : ''}`}>
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
              <Link to="/practice/hello-tmux" className="primary-btn app-start-btn">
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
