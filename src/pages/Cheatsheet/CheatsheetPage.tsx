import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../components/system/EmptyState';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppLesson } from '../../features/curriculum/contentSchema';
import { CHEATSHEET_ITEMS, type CheatsheetItem } from '../../features/cheatsheet/items';
import { buildCheatsheetIndex, searchCheatsheet } from '../../features/cheatsheet/search';

type BasicGuideItem = {
  id: string;
  title: string;
  summary: string;
  command?: string;
  shortcut?: string;
  lessonSlugs: string[];
};

type QuickStartStep = {
  id: string;
  title: string;
  command: string;
  lessonSlug: string;
};

const QUICK_QUERY_PRESETS = ['session', 'split', 'copy-mode', 'layout', 'escape-time'] as const;
const DEFAULT_PRACTICE_PATH = '/practice?lesson=hello-tmux';
const BASIC_CHEATSHEET_ITEMS = CHEATSHEET_ITEMS.filter((item) => item.contentType !== 'playbook');

const BASIC_GUIDE_ITEMS: BasicGuideItem[] = [
  {
    id: 'basic-session-entry',
    title: '세션 진입',
    summary: '시작은 한 줄로 고정한다.',
    command: 'tmux new -As main',
    lessonSlugs: ['hello-tmux', 'attach-detach'],
  },
  {
    id: 'basic-window-pane',
    title: '창 분리',
    summary: '윈도우와 패인을 먼저 나눈다.',
    command: 'tmux new-window -n logs',
    shortcut: 'Ctrl+b % / Ctrl+b "',
    lessonSlugs: ['basics', 'split-resize'],
  },
  {
    id: 'basic-navigation',
    title: '이동 루틴',
    summary: '포커스 이동 키를 고정한다.',
    shortcut: 'Ctrl+b o / Ctrl+b n',
    lessonSlugs: ['pane-focus-flow', 'layout-craft'],
  },
  {
    id: 'basic-copy-search',
    title: '로그 검색/복사',
    summary: '긴 로그는 copy-mode로 처리한다.',
    shortcut: 'Ctrl+b [',
    lessonSlugs: ['copy-search', 'command-subset'],
  },
];

const QUICK_START_STEPS: QuickStartStep[] = [
  {
    id: 'step-open',
    title: '세션 생성 또는 재사용',
    command: 'tmux new -As main',
    lessonSlug: 'hello-tmux',
  },
  {
    id: 'step-split',
    title: '작업/로그 분할',
    command: 'Ctrl+b %  또는  tmux split-window -h',
    lessonSlug: 'split-resize',
  },
  {
    id: 'step-focus',
    title: '포커스 이동',
    command: 'Ctrl+b o',
    lessonSlug: 'pane-focus-flow',
  },
  {
    id: 'step-detach',
    title: '작업 유지 후 이탈',
    command: 'Ctrl+b d',
    lessonSlug: 'attach-detach',
  },
];

function resolvePracticePath(item: CheatsheetItem) {
  return item.practicePath ?? DEFAULT_PRACTICE_PATH;
}

function buildLessonPracticePath(lessonSlug: string) {
  return `/practice?lesson=${encodeURIComponent(lessonSlug)}`;
}

export function CheatsheetPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [lessons, setLessons] = useState<AppLesson[]>([]);
  const index = useMemo(() => buildCheatsheetIndex(BASIC_CHEATSHEET_ITEMS), []);

  useEffect(() => {
    loadAppContent()
      .then((content) => setLessons(content.lessons))
      .catch(() => {
        setLessons([]);
      });
  }, []);

  const lessonTitleMap = useMemo(() => {
    return new Map(lessons.map((lesson) => [lesson.slug, lesson.title]));
  }, [lessons]);

  const normalizedQuery = query.trim();
  const results = useMemo(() => searchCheatsheet(index, normalizedQuery, 18), [index, normalizedQuery]);
  const featuredReferences = useMemo(() => {
    if (normalizedQuery.length > 0) {
      return results;
    }

    return BASIC_CHEATSHEET_ITEMS.slice(0, 12);
  }, [normalizedQuery, results]);

  return (
    <PagePlaceholder
      eyebrow="Basics + Commands"
      title={t('기본·명령 가이드')}
      description={t('자주 쓰는 동작만 짧게 정리했습니다. 바로 실습으로 연결하세요.')}
    >
      <section className="reference-hub-head">
        <p className="muted">
          {t('단축키 표기 안내: `Ctrl+b`는 tmux 기본 prefix 키입니다. `prefix`는 보통 `Ctrl+b`를 뜻합니다.')}
        </p>
        <p className="muted">
          {t('상황별 운영 절차와 코딩에이전트 CLI 연동은 `유즈케이스 가이드`에서 확인하세요.')}
        </p>
        <div className="inline-actions">
          <Link to="/playbooks" className="secondary-btn">
            {t('유즈케이스 가이드로 이동')}
          </Link>
        </div>
      </section>

      <section className="reference-section">
        <h2>{t('기본 사용 루틴')}</h2>
        <div className="reference-guide-grid">
          {BASIC_GUIDE_ITEMS.map((item) => (
            <article key={item.id} className="reference-guide-card">
              <h3>{t(item.title)}</h3>
              <p className="muted">{t(item.summary)}</p>
              {item.command ? <code className="reference-command-block">{item.command}</code> : null}
              {item.shortcut ? <code className="reference-command-block">{item.shortcut}</code> : null}
              <div className="reference-link-row">
                {item.lessonSlugs.map((lessonSlug) => (
                  <Link key={`${item.id}-${lessonSlug}`} to={buildLessonPracticePath(lessonSlug)} className="text-link">
                    {t(lessonTitleMap.get(lessonSlug) ?? lessonSlug)}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="reference-section">
        <h2>{t('10분 시작 순서')}</h2>
        <div className="reference-guide-grid">
          {QUICK_START_STEPS.map((step, indexValue) => (
            <article key={step.id} className="reference-guide-card">
              <p className="reference-type">{t('STEP {{index}}', { index: indexValue + 1 })}</p>
              <h3>{t(step.title)}</h3>
              <code className="reference-command-block">{step.command}</code>
              <div className="reference-link-row">
                <Link to={buildLessonPracticePath(step.lessonSlug)} className="text-link">
                  {t(lessonTitleMap.get(step.lessonSlug) ?? step.lessonSlug)}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="reference-section">
        <h2>{normalizedQuery.length > 0 ? t('검색 결과 ({{count}})', { count: results.length }) : t('자주 쓰는 기본·명령')}</h2>
        <input
          className="sim-input reference-search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('예: split, session, copy-mode, escape-time')}
          aria-label={t('Reference search')}
        />
        <div className="reference-chip-row">
          {QUICK_QUERY_PRESETS.map((preset) => (
            <button key={preset} type="button" className="secondary-btn reference-chip" onClick={() => setQuery(preset)}>
              {preset}
            </button>
          ))}
        </div>

        {featuredReferences.length === 0 ? (
          <EmptyState title={t('검색 결과가 없습니다')} description={t('다른 키워드로 다시 검색해 보세요.')} />
        ) : (
          <div className="reference-grid">
            {featuredReferences.map((item) => (
              <article key={item.id} className="reference-card">
                <p className="reference-type">{t(item.contentType)}</p>
                <h3>{t(item.title)}</h3>
                <p className="muted">{t(item.description)}</p>
                <div className="inline-actions">
                  <Link to={resolvePracticePath(item)} className="secondary-btn">
                    {t('실습 워크벤치 열기')}
                  </Link>
                </div>
                {item.command ? <code className="playbook-command">{t(item.command)}</code> : null}
                {item.shortcut ? <code className="playbook-command">{t(item.shortcut)}</code> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </PagePlaceholder>
  );
}
