import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../components/system/EmptyState';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { BRAND } from '../../app/brand';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppContent, AppLesson, AppMission } from '../../features/curriculum/contentSchema';

type LearnPageData = {
  lessons: AppLesson[];
  missionCounts: Record<string, number>;
  learningJourney: AppContent['learningJourney'] | null;
  learningPath: AppContent['learningPath'] | null;
};

const LEARNING_PATH_ORDER = [
  'hello-tmux',
  'basics',
  'basics-shortcuts',
  'attach-detach',
  'attach-detach-shortcuts',
  'split-resize',
  'split-resize-shortcuts',
  'layout-craft',
  'layout-craft-shortcuts',
  'workspace-compose',
  'workspace-compose-shortcuts',
  'pane-focus-flow',
  'pane-focus-flow-shortcuts',
  'copy-search',
  'copy-search-shortcuts',
  'command-subset',
  'command-subset-shortcuts',
] as const;

function buildMissionCountMap(missions: AppMission[]) {
  return missions.reduce<Record<string, number>>((accumulator, mission) => {
    accumulator[mission.lessonSlug] = (accumulator[mission.lessonSlug] ?? 0) + 1;
    return accumulator;
  }, {});
}

function sortLessonsByOrder(lessons: AppLesson[], order: readonly string[]) {
  const orderIndex = new Map(order.map((slug, index) => [slug, index]));
  return lessons
    .filter((lesson) => orderIndex.has(lesson.slug))
    .sort((left, right) => (orderIndex.get(left.slug) ?? 0) - (orderIndex.get(right.slug) ?? 0));
}

export function LearnIndexPage() {
  const { t } = useTranslation();
  const [pageData, setPageData] = useState<LearnPageData>({
    lessons: [],
    missionCounts: {},
    learningJourney: null,
    learningPath: null,
  });

  useEffect(() => {
    loadAppContent()
      .then((content) => {
        setPageData({
          lessons: content.lessons,
          missionCounts: buildMissionCountMap(content.missions),
          learningJourney: content.learningJourney ?? null,
          learningPath: content.learningPath ?? null,
        });
      })
      .catch(() => {
        setPageData({
          lessons: [],
          missionCounts: {},
          learningJourney: null,
          learningPath: null,
        });
      });
  }, []);

  const learningPathOrder = pageData.learningPath?.lessonSlugs?.length
    ? pageData.learningPath.lessonSlugs
    : LEARNING_PATH_ORDER;
  const orderedLessons = useMemo(
    () => sortLessonsByOrder(pageData.lessons, learningPathOrder),
    [learningPathOrder, pageData.lessons],
  );

  const learningPathEntry =
    orderedLessons.find((lesson) => lesson.slug === pageData.learningPath?.entryLessonSlug) ??
    orderedLessons[0] ??
    null;
  const paneNavigationEntry =
    orderedLessons.find((lesson) => lesson.slug === pageData.learningPath?.paneNavigationLessonSlug) ??
    orderedLessons.find((lesson) => lesson.slug === 'pane-focus-flow') ??
    null;

  return (
    <PagePlaceholder
      eyebrow={`${BRAND.name} Learn`}
      title={t('학습 경로')}
      description={t('초급/심화를 나누지 않고, 하나의 통합 실습 경로로 처음부터 운영 루틴까지 이어집니다.')}
    >
      {pageData.lessons.length === 0 ? (
        <EmptyState title={t('로드된 레슨이 없습니다')} description={t('콘텐츠 파일을 확인해 주세요.')} />
      ) : (
        <div className="curriculum-track-list">
          {pageData.learningJourney ? (
            <section className="learning-journey-card" aria-label={t('Learning Journey')}>
              <p className="page-eyebrow">{t('tmux-tuto 방식')}</p>
              <h2>{t(pageData.learningJourney.title)}</h2>
              <p>{t(pageData.learningJourney.intro)}</p>
              <p>
                <strong>{t('최종 목표:')}</strong> {t(pageData.learningJourney.targetOutcome)}
              </p>
              <div className="inline-actions">
                {learningPathEntry ? (
                  <Link className="primary-btn" to={`/practice?lesson=${learningPathEntry.slug}`}>
                    {t('통합 경로 바로 시작')}
                  </Link>
                ) : null}
                {paneNavigationEntry ? (
                  <Link className="secondary-btn" to={`/practice?lesson=${paneNavigationEntry.slug}`}>
                    {t('pane 이동부터 시작')}
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="curriculum-track-card learning-level-card">
            <header className="curriculum-track-head">
              <div>
                <h2>{pageData.learningPath?.title ? t(pageData.learningPath.title) : t('통합 레슨 경로')}</h2>
                <p className="muted">
                  {t('목표: {{description}}', {
                    description:
                      (pageData.learningPath?.description ? t(pageData.learningPath.description) : null) ??
                      t(
                        'session/window/pane 기초 조작부터 pane 이동, copy-mode, command-mode, 원격 운영까지 한 흐름으로 완료',
                      ),
                  })}
                </p>
              </div>
              {learningPathEntry ? (
                <Link className="primary-btn" to={`/practice?lesson=${learningPathEntry.slug}`}>
                  {t('처음부터 시작')}
                </Link>
              ) : null}
            </header>
            <div className="curriculum-lesson-list">
              {orderedLessons.map((lesson) => (
                <div key={lesson.id} className="curriculum-lesson-row">
                  <Link
                    className="curriculum-lesson-link"
                    to={`/learn/${lesson.trackSlug}/${lesson.chapterSlug}/${lesson.slug}`}
                  >
                    <strong>{t(lesson.title)}</strong>
                    <span>
                      {t('{{minutes}}분 · 미션 {{count}}개', {
                        minutes: lesson.estimatedMinutes,
                        count: pageData.missionCounts[lesson.slug] ?? 0,
                      })}
                    </span>
                  </Link>
                  <Link className="secondary-btn" to={`/practice?lesson=${lesson.slug}`}>
                    {t('실습')}
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </PagePlaceholder>
  );
}
