import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { messages, type MessageKey, type SupportedLanguage } from './messages';
import { resolveLanguageFromRuntime } from './runtime';

type I18nValue = {
  language: SupportedLanguage;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const language = resolveLanguageFromRuntime();
    const t = (key: MessageKey) => messages[language][key] ?? messages.en[key];
    return { language, t };
  }, []);

  useEffect(() => {
    document.documentElement.lang = value.language;
  }, [value.language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  return context;
}
