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

const koToEnFallbackPhrases: Array<[string, string]> = [
  ['학습', 'Learning'],
  ['실습', 'Practice'],
  ['미션', 'Mission'],
  ['레슨', 'Lesson'],
  ['진행도', 'Progress'],
  ['업적', 'Achievement'],
  ['공유', 'Share'],
  ['온보딩', 'Onboarding'],
  ['북마크', 'Bookmark'],
  ['레퍼런스', 'Reference'],
  ['플레이북', 'Playbook'],
  ['검색', 'Search'],
  ['설정', 'Settings'],
  ['목표', 'Goal'],
  ['완료', 'Completed'],
  ['시작', 'Start'],
  ['이동', 'Move'],
  ['다음', 'Next'],
  ['이전', 'Previous'],
  ['레벨', 'Level'],
  ['닉네임', 'Nickname'],
  ['링크 복사', 'Copy link'],
  ['홈으로 이동', 'Go home'],
  ['난이도', 'Difficulty'],
  ['조건', 'Condition'],
  ['오류', 'Error'],
  ['성공', 'Success'],
  ['실패', 'Failed'],
  ['세션', 'Session'],
  ['윈도우', 'Window'],
  ['패인', 'Pane'],
  ['단축키', 'Shortcut'],
  ['없음', 'None'],
  ['분', 'min'],
  ['개', ''],
];

function hasKorean(text: string) {
  return /[가-힣]/.test(text);
}

function deriveEnglishFromKorean(source: string) {
  let out = source;
  for (const [ko, en] of koToEnFallbackPhrases) {
    out = out.split(ko).join(en);
  }
  return out;
}

export function tx(source: string): string {
  const language = resolveLanguageFromRuntime();
  const dictionary = dictionaries[language] as Record<string, string>;
  const fallback = dictionaries.en as Record<string, string>;
  const localized = dictionary[source];
  if (localized && !(language !== 'ko' && hasKorean(localized))) {
    return localized;
  }

  const english = fallback[source];
  if (english && !hasKorean(english)) {
    return english;
  }

  if (language !== 'ko') {
    return deriveEnglishFromKorean(source);
  }

  return source;
}

export function txf(template: string, params: Record<string, string | number>): string {
  const translated = tx(template);
  return translated.replace(/\{(\w+)\}/g, (_match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : `{${key}}`,
  );
}
