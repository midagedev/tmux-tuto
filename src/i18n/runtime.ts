import type { SupportedLanguage } from './messages';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'ko', 'ja', 'zh'];

export function normalizeLanguage(rawLanguage: string | null | undefined): SupportedLanguage | null {
  if (!rawLanguage) {
    return null;
  }

  const normalized = rawLanguage.toLowerCase();
  const [base] = normalized.split(/[-_]/);
  if (SUPPORTED_LANGUAGES.includes(base as SupportedLanguage)) {
    return base as SupportedLanguage;
  }

  return null;
}

export function resolveLanguageFromRuntime(): SupportedLanguage {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'en';
  }

  const query = new URLSearchParams(window.location.search).get('lang');
  const fromQuery = normalizeLanguage(query);
  if (fromQuery) {
    return fromQuery;
  }

  for (const locale of navigator.languages ?? []) {
    const candidate = normalizeLanguage(locale);
    if (candidate) {
      return candidate;
    }
  }

  const fromNavigatorLanguage = normalizeLanguage(navigator.language);
  if (fromNavigatorLanguage) {
    return fromNavigatorLanguage;
  }

  return 'en';
}
