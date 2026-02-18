import localeEn from './locales/en.json';
import localeKo from './locales/ko.json';
import localeJa from './locales/ja.json';
import localeZh from './locales/zh.json';
import { resolveLanguageFromRuntime } from './runtime';

const dictionaries = {
  en: localeEn,
  ko: localeKo,
  ja: localeJa,
  zh: localeZh,
} as const;

export function tx(source: string): string {
  const language = resolveLanguageFromRuntime();
  const dictionary = dictionaries[language] as Record<string, string>;
  const fallback = dictionaries.en as Record<string, string>;
  return dictionary[source] ?? fallback[source] ?? source;
}
