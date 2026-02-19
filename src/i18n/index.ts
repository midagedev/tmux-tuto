import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';

export const SUPPORTED_LANGUAGE_CODES = ['ko', 'en', 'ja', 'zh'] as const;
export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];
const SUPPORTED_LANGUAGES = new Set(SUPPORTED_LANGUAGE_CODES);
export const LANGUAGE_STORAGE_KEY = 'tmux-tuto-lang';

function isSupportedLanguage(value: string): value is SupportedLanguageCode {
  return SUPPORTED_LANGUAGES.has(value as SupportedLanguageCode);
}

function setDocumentLanguage(lang: SupportedLanguageCode) {
  document.documentElement.lang = lang;
}

function resolveLanguage(): SupportedLanguageCode {
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang && isSupportedLanguage(urlLang)) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, urlLang);
    return urlLang;
  }

  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && isSupportedLanguage(stored)) {
    return stored;
  }

  const base = navigator.language.toLowerCase().split('-')[0] ?? 'ko';
  if (isSupportedLanguage(base)) {
    return base;
  }

  return 'ko';
}

const initialLanguage = resolveLanguage();
void i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
    ja: { translation: ja },
    zh: { translation: zh },
  },
  lng: initialLanguage,
  fallbackLng: 'ko',
  interpolation: {
    escapeValue: false,
  },
  keySeparator: false,
  nsSeparator: false,
  returnEmptyString: false,
  returnNull: false,
});
setDocumentLanguage(initialLanguage);
i18n.on('languageChanged', (lang) => {
  if (!isSupportedLanguage(lang)) {
    return;
  }
  setDocumentLanguage(lang);
});

export { i18n };
