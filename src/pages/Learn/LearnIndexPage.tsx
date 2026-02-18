import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/system/EmptyState';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { BRAND_NAME } from '../../app/brand';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppContent, AppLesson, AppMission } from '../../features/curriculum/contentSchema';
import { useI18n } from '../../i18n';
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
    const { t } = useI18n();
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
    const orderedLessons = useMemo(() => sortLessonsByOrder(pageData.lessons, learningPathOrder), [learningPathOrder, pageData.lessons]);
    const learningPathEntry = orderedLessons.find((lesson) => lesson.slug === pageData.learningPath?.entryLessonSlug) ??
        orderedLessons[0] ??
        null;
    const paneNavigationEntry = orderedLessons.find((lesson) => lesson.slug === pageData.learningPath?.paneNavigationLessonSlug) ??
        orderedLessons.find((lesson) => lesson.slug === 'pane-focus-flow') ??
        null;
    return (<PagePlaceholder eyebrow={`${BRAND_NAME} Learn`} title={t('learn.title')} description={t('learn.description')}>
      {pageData.lessons.length === 0 ? (<EmptyState title={t('learn.empty.title')} description={t('learn.empty.description')}/>) : (<div className="curriculum-track-list">
          {pageData.learningJourney ? (<section className="learning-journey-card" aria-label="Learning Journey">
              <p className="page-eyebrow">{__tx("tmux-tuto \uBC29\uC2DD")}</p>
              <h2>{pageData.learningJourney.title}</h2>
              <p>{pageData.learningJourney.intro}</p>
              <p>
                <strong>{__tx("\uCD5C\uC885 \uBAA9\uD45C:")}</strong> {pageData.learningJourney.targetOutcome}
              </p>
              <div className="inline-actions">
                {learningPathEntry ? (<Link className="primary-btn" to={`/practice?lesson=${learningPathEntry.slug}`}>
                    통합 경로 바로 시작
                  </Link>) : null}
                {paneNavigationEntry ? (<Link className="secondary-btn" to={`/practice?lesson=${paneNavigationEntry.slug}`}>
                    pane 이동부터 시작
                  </Link>) : null}
              </div>
            </section>) : null}

          <section className="curriculum-track-card learning-level-card">
            <header className="curriculum-track-head">
              <div>
                <h2>{pageData.learningPath?.title ?? __tx("\uD1B5\uD569 \uB808\uC2A8 \uACBD\uB85C")}</h2>
                <p className="muted">
                  목표: {pageData.learningPath?.description ?? __tx("session/window/pane \uAE30\uCD08 \uC870\uC791\uBD80\uD130 pane \uC774\uB3D9, copy-mode, command-mode, \uC6D0\uACA9 \uC6B4\uC601\uAE4C\uC9C0 \uD55C \uD750\uB984\uC73C\uB85C \uC644\uB8CC")}
                </p>
              </div>
              {learningPathEntry ? (<Link className="primary-btn" to={`/practice?lesson=${learningPathEntry.slug}`}>
                  처음부터 시작
                </Link>) : null}
            </header>
            <div className="curriculum-lesson-list">
              {orderedLessons.map((lesson) => (<div key={lesson.id} className="curriculum-lesson-row">
                  <Link className="curriculum-lesson-link" to={`/learn/${lesson.trackSlug}/${lesson.chapterSlug}/${lesson.slug}`}>
                    <strong>{lesson.title}</strong>
                    <span>{lesson.estimatedMinutes}분 · 미션 {pageData.missionCounts[lesson.slug] ?? 0}{__tx("\uAC1C")}</span>
                  </Link>
                  <Link className="secondary-btn" to={`/practice?lesson=${lesson.slug}`}>
                    실습
                  </Link>
                </div>))}
            </div>
          </section>
        </div>)}
    </PagePlaceholder>);
}
