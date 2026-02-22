import type { ChangeEvent } from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnalyticsConsentBanner } from '../../components/system/AnalyticsConsentBanner';
import { setClarityTag, useAnalyticsConsentState, useCloudflareAnalytics, useMicrosoftClarity } from '../../features/analytics';
import { getLessonBySlug, getPlaybookBySlug, loadAppContent } from '../../features/curriculum/contentLoader';
import { useSimulatorStore } from '../../features/simulator/simulatorStore';
import { BRAND } from '../brand';
import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGE_CODES, type SupportedLanguageCode } from '../../i18n';

const LANGUAGE_LABELS: Record<SupportedLanguageCode, string> = {
  ko: 'KO',
  en: 'EN',
  ja: 'JA',
  zh: 'ZH',
};
const DEFAULT_SITE_ORIGIN = 'https://tmux.midagedev.com';
const SITE_ORIGIN = (import.meta.env.VITE_SITE_ORIGIN || DEFAULT_SITE_ORIGIN).replace(/\/$/, '');
const SITE_NAME = 'tmux-tuto';
const DEFAULT_OG_IMAGE_PATH = '/og/default.v1.png';
const INDEX_ROBOTS_POLICY = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const NOINDEX_ROBOTS_POLICY = 'noindex,nofollow,noarchive';
const HREFLANG_MAP: Record<SupportedLanguageCode, string> = {
  ko: 'ko',
  en: 'en',
  ja: 'ja',
  zh: 'zh-Hans',
};
const OG_LOCALE_MAP: Record<SupportedLanguageCode, string> = {
  ko: 'ko_KR',
  en: 'en_US',
  ja: 'ja_JP',
  zh: 'zh_CN',
};

type RouteSeoSnapshot = {
  title: string;
  description: string;
  indexable: boolean;
  ogImagePath?: string;
};

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

function setRepeatedMetaTags(attribute: 'name' | 'property', key: string, contents: string[], marker: string) {
  document.head.querySelectorAll(`meta[data-seo-marker="${marker}"]`).forEach((node) => node.remove());
  contents.forEach((content) => {
    const tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    tag.setAttribute('content', content);
    tag.dataset.seoMarker = marker;
    document.head.appendChild(tag);
  });
}

function setAlternateLanguageLinks(pathname: string) {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((node) => node.remove());
  SUPPORTED_LANGUAGE_CODES.forEach((lang) => {
    const link = document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', HREFLANG_MAP[lang]);
    link.setAttribute('href', buildLocalizedUrl(pathname, lang));
    link.dataset.seoAlternate = 'language';
    document.head.appendChild(link);
  });

  const defaultLink = document.createElement('link');
  defaultLink.setAttribute('rel', 'alternate');
  defaultLink.setAttribute('hreflang', 'x-default');
  defaultLink.setAttribute('href', buildLocalizedUrl(pathname, 'ko'));
  defaultLink.dataset.seoAlternate = 'language';
  document.head.appendChild(defaultLink);
}

function setStructuredData(payload: Record<string, unknown>) {
  let script = document.head.querySelector<HTMLScriptElement>('script[data-seo-jsonld="route"]');
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seoJsonld = 'route';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(payload);
}

function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }
  const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withSlash.replace(/\/+$/, '') || '/';
}

function buildLocalizedUrl(pathname: string, lang: SupportedLanguageCode) {
  const url = new URL(normalizePathname(pathname), SITE_ORIGIN);
  url.searchParams.set('lang', lang);
  return url.toString();
}

function buildStructuredData({
  pathname,
  canonicalUrl,
  pageTitle,
  description,
  language,
}: {
  pathname: string;
  canonicalUrl: string;
  pageTitle: string;
  description: string;
  language: SupportedLanguageCode;
}) {
  const normalizedPath = normalizePathname(pathname);
  const pageType = normalizedPath === '/' || normalizedPath === '/learn' || normalizedPath === '/playbooks' ? 'CollectionPage' : 'WebPage';

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        url: SITE_ORIGIN,
        name: SITE_NAME,
      },
      {
        '@type': pageType,
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: pageTitle,
        description,
        inLanguage: language,
        isPartOf: {
          '@id': `${SITE_ORIGIN}/#website`,
        },
      },
    ],
  };
}

function applyRouteSeo({
  pathname,
  title,
  description,
  language,
  indexable,
  ogImagePath = DEFAULT_OG_IMAGE_PATH,
}: {
  pathname: string;
  title: string;
  description: string;
  language: SupportedLanguageCode;
  indexable: boolean;
  ogImagePath?: string;
}) {
  const canonicalUrl = buildLocalizedUrl(pathname, language);
  const ogImageUrl = new URL(ogImagePath, SITE_ORIGIN).toString();
  const pageTitle = `${title} | ${SITE_NAME}`;
  const robotsPolicy = indexable ? INDEX_ROBOTS_POLICY : NOINDEX_ROBOTS_POLICY;

  document.title = pageTitle;
  setMetaTag('name', 'description', description);
  setMetaTag('name', 'robots', robotsPolicy);
  setMetaTag('property', 'og:type', 'website');
  setMetaTag('property', 'og:site_name', SITE_NAME);
  setMetaTag('property', 'og:title', pageTitle);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('property', 'og:image', ogImageUrl);
  setMetaTag('property', 'og:image:alt', title);
  setMetaTag('property', 'og:locale', OG_LOCALE_MAP[language]);
  setRepeatedMetaTags(
    'property',
    'og:locale:alternate',
    SUPPORTED_LANGUAGE_CODES.filter((lang) => lang !== language).map((lang) => OG_LOCALE_MAP[lang]),
    'og-locale-alt',
  );
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', pageTitle);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', ogImageUrl);
  setMetaTag('name', 'twitter:image:alt', title);
  setCanonicalLink(canonicalUrl);
  setAlternateLanguageLinks(pathname);
  setStructuredData(
    buildStructuredData({
      pathname,
      canonicalUrl,
      pageTitle,
      description,
      language,
    }),
  );
}

function resolveRouteSeo(pathname: string, t: (key: string, options?: Record<string, unknown>) => string): RouteSeoSnapshot {
  const normalizedPath = normalizePathname(pathname);
  const segments = normalizedPath === '/' ? [] : normalizedPath.slice(1).split('/');

  if (normalizedPath === '/') {
    return {
      title: t('tmux를 실전 운영 루틴으로 익히는 가장 빠른 학습 플로우'),
      description: t('설치 없이 브라우저에서 실제 Linux VM으로 tmux를 실습하세요. 세션, 윈도우, 패인, copy-mode까지 단계별 미션 제공.'),
      indexable: true,
    };
  }

  if (normalizedPath === '/learn') {
    return {
      title: t('학습 경로'),
      description: t('초급/심화를 나누지 않고, 하나의 통합 실습 경로로 처음부터 운영 루틴까지 이어집니다.'),
      indexable: true,
    };
  }

  if (segments[0] === 'learn' && segments.length === 4) {
    return {
      title: t('학습 경로'),
      description: t('tmux 레슨 경로를 순서대로 따라가며 기본 동작부터 운영 루틴까지 학습합니다.'),
      indexable: true,
    };
  }

  if (normalizedPath === '/practice') {
    return {
      title: t('실습 워크벤치'),
      description: t('브라우저 VM에서 tmux 명령을 바로 실행하고 미션으로 검증합니다.'),
      indexable: true,
    };
  }

  if (segments[0] === 'practice') {
    return {
      title: t('실습 워크벤치'),
      description: t('브라우저 VM에서 tmux 명령을 바로 실행하고 미션으로 검증합니다.'),
      indexable: false,
    };
  }

  if (normalizedPath === '/cheatsheet') {
    return {
      title: t('기본·명령 가이드'),
      description: t('자주 쓰는 동작만 짧게 정리했습니다. 바로 실습으로 연결하세요.'),
      indexable: true,
    };
  }

  if (normalizedPath === '/playbooks') {
    return {
      title: t('유즈케이스 가이드'),
      description: t('유즈케이스별 실행 루틴을 모았습니다. 필요한 카드만 선택해서 진행하면 됩니다.'),
      indexable: true,
    };
  }

  if (segments[0] === 'playbooks' && segments[2] === 'copied') {
    return {
      title: t('명령 복사 완료'),
      description: t('플레이북 명령 복사가 기록되었습니다. 이 라우트는 KPI 측정용으로도 사용됩니다.'),
      indexable: false,
    };
  }

  if (segments[0] === 'playbooks' && segments.length === 2) {
    return {
      title: t('유즈케이스 상세 가이드'),
      description: t('플레이북 상세 단계, 명령 복사, 검증 체크리스트를 표시합니다.'),
      indexable: true,
    };
  }

  if (segments[0] === 'bookmarks') {
    return {
      title: t('북마크 운영 허브'),
      description: t('북마크를 단순 저장소가 아니라 재실습 큐로 관리할 수 있도록 정리했습니다.'),
      indexable: false,
    };
  }

  if (segments[0] === 'progress') {
    return {
      title: t('학습 진행도'),
      description: t('XP, 레벨, 스트릭, 트랙별 완료 현황을 확인합니다.'),
      indexable: false,
    };
  }

  if (normalizedPath === '/onboarding/start') {
    return {
      title: t('실습 중심 tmux 온보딩'),
      description: t('3분 안에 첫 패인 분할을 완료하고, 개인화된 트랙 추천까지 연결합니다.'),
      indexable: false,
    };
  }

  if (normalizedPath === '/onboarding/goal') {
    return {
      title: t('학습 목표 선택'),
      description: t('당신의 현재 목적에 맞춰 추천 트랙과 플레이북을 결정합니다.'),
      indexable: false,
    };
  }

  if (normalizedPath === '/onboarding/preferences') {
    return {
      title: t('입력/환경 선호 설정'),
      description: t('prefix와 키보드 레이아웃을 맞춰 실습 입력을 실제 환경과 가깝게 만듭니다.'),
      indexable: false,
    };
  }

  if (normalizedPath === '/onboarding/first-mission') {
    return {
      title: t('첫 실습: 패인 2개 만들기'),
      description: t('2~3분짜리 미션입니다. 분할 후 제출하면 즉시 통과 여부를 확인합니다.'),
      indexable: false,
    };
  }

  if (normalizedPath === '/onboarding/first-mission/passed') {
    return {
      title: t('첫 미션 완료'),
      description: t('첫 미션 통과가 기록되었습니다. 추천 트랙으로 바로 이어서 학습하세요.'),
      indexable: false,
    };
  }

  if (normalizedPath === '/onboarding/done') {
    return {
      title: t('온보딩 완료'),
      description: t('첫 실습이 완료되었습니다. 지금 바로 오늘 할 1개 미션을 시작하세요.'),
      indexable: false,
    };
  }

  if (segments[0] === 'share') {
    return {
      title: t('Share'),
      description: t('지원하지 않는 공유 경로입니다. Progress 페이지에서 다시 생성해 주세요.'),
      indexable: false,
    };
  }

  return {
    title: t('페이지를 찾을 수 없습니다'),
    description: t('경로를 확인하거나 홈으로 이동해 주세요.'),
    indexable: false,
  };
}

async function resolveContentDrivenSeo(
  pathname: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): Promise<Partial<RouteSeoSnapshot> | null> {
  const normalizedPath = normalizePathname(pathname);
  const segments = normalizedPath === '/' ? [] : normalizedPath.slice(1).split('/');

  if (segments[0] === 'learn' && segments.length === 4) {
    const [, rawTrackSlug, rawChapterSlug, rawLessonSlug] = segments;
    const trackSlug = decodeURIComponent(rawTrackSlug);
    const chapterSlug = decodeURIComponent(rawChapterSlug);
    const lessonSlug = decodeURIComponent(rawLessonSlug);
    const content = await loadAppContent();
    const lesson = getLessonBySlug(content, lessonSlug);
    if (!lesson || lesson.trackSlug !== trackSlug || lesson.chapterSlug !== chapterSlug) {
      return null;
    }

    return {
      title: t(lesson.title),
      description: t(lesson.overview ?? lesson.goal ?? 'tmux 레슨 경로를 순서대로 따라가며 기본 동작부터 운영 루틴까지 학습합니다.'),
    };
  }

  if (segments[0] === 'playbooks' && segments.length === 2) {
    const playbookSlug = decodeURIComponent(segments[1]);
    const content = await loadAppContent();
    const playbook = getPlaybookBySlug(content, playbookSlug);
    if (!playbook) {
      return null;
    }

    const stepDescription = playbook.steps.find((step) => Boolean(step.description))?.description;
    return {
      title: t(playbook.title),
      description: stepDescription ? t(stepDescription) : t('플레이북 상세 단계, 명령 복사, 검증 체크리스트를 표시합니다.'),
    };
  }

  if (segments[0] === 'practice' && segments.length === 2 && segments[1] !== 'vm') {
    const lessonSlug = decodeURIComponent(segments[1]);
    const content = await loadAppContent();
    const lesson = getLessonBySlug(content, lessonSlug);
    if (!lesson) {
      return null;
    }

    return {
      title: t(lesson.title),
      description: t(lesson.overview ?? '브라우저 VM에서 tmux 명령을 바로 실행하고 미션으로 검증합니다.'),
    };
  }

  return null;
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
    const normalizedLang = i18n.language.split('-')[0] as SupportedLanguageCode;
    if (!SUPPORTED_LANGUAGE_CODES.includes(normalizedLang)) {
      return;
    }

    const baseSeo = resolveRouteSeo(location.pathname, t);
    let cancelled = false;

    const applySeo = async () => {
      let resolvedSeo = baseSeo;
      try {
        const dynamicSeo = await resolveContentDrivenSeo(location.pathname, t);
        if (dynamicSeo) {
          resolvedSeo = { ...resolvedSeo, ...dynamicSeo };
        }
      } catch {
        // Keep the route-level fallback when content metadata lookup fails.
      }

      if (cancelled) {
        return;
      }

      applyRouteSeo({
        pathname: location.pathname,
        title: resolvedSeo.title,
        description: resolvedSeo.description,
        language: normalizedLang,
        indexable: resolvedSeo.indexable,
        ogImagePath: resolvedSeo.ogImagePath,
      });
    };

    void applySeo();

    return () => {
      cancelled = true;
    };
  }, [i18n.language, location.pathname, t]);

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
