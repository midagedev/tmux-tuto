import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/system/EmptyState';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { BRAND } from '../../app/brand';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppContent, AppLesson, AppMission } from '../../features/curriculum/contentSchema';

type LearnPageData = {
  lessons: AppLesson[];
  missionCounts: Record<string, number>;
  learningJourney: AppContent['learningJourney'] | null;
};

const BEGINNER_LESSON_ORDER = ['hello-tmux', 'basics', 'attach-detach', 'split-resize'] as const;
const ADVANCED_LESSON_ORDER = ['pane-focus-flow', 'copy-search', 'command-subset'] as const;

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
  const [pageData, setPageData] = useState<LearnPageData>({
    lessons: [],
    missionCounts: {},
    learningJourney: null,
  });

  useEffect(() => {
    loadAppContent()
      .then((content) => {
        setPageData({
          lessons: content.lessons,
          missionCounts: buildMissionCountMap(content.missions),
          learningJourney: content.learningJourney ?? null,
        });
      })
      .catch(() => {
        setPageData({
          lessons: [],
          missionCounts: {},
          learningJourney: null,
        });
      });
  }, []);

  const beginnerLessons = useMemo(
    () => sortLessonsByOrder(pageData.lessons, BEGINNER_LESSON_ORDER),
    [pageData.lessons],
  );
  const advancedLessons = useMemo(
    () => sortLessonsByOrder(pageData.lessons, ADVANCED_LESSON_ORDER),
    [pageData.lessons],
  );

  const beginnerEntry = beginnerLessons[0] ?? null;
  const advancedEntry = advancedLessons[0] ?? null;

  return (
    <PagePlaceholder
      eyebrow={`${BRAND.name} Learn`}
      title="학습 경로: 초급 / 심화"
      description="복잡한 선택 없이 초급 코어를 먼저 완료하고, 이후 심화 루틴으로 확장합니다."
    >
      {pageData.lessons.length === 0 ? (
        <EmptyState title="로드된 레슨이 없습니다" description="콘텐츠 파일을 확인해 주세요." />
      ) : (
        <div className="curriculum-track-list">
          {pageData.learningJourney ? (
            <section className="learning-journey-card" aria-label="Learning Journey">
              <p className="page-eyebrow">tmux-tuto 방식</p>
              <h2>{pageData.learningJourney.title}</h2>
              <p>{pageData.learningJourney.intro}</p>
              <p>
                <strong>최종 목표:</strong> {pageData.learningJourney.targetOutcome}
              </p>
              <div className="inline-actions">
                {beginnerEntry ? (
                  <Link className="primary-btn" to={`/practice?lesson=${beginnerEntry.slug}`}>
                    초급 실습 바로 시작
                  </Link>
                ) : null}
                {advancedEntry ? (
                  <Link className="secondary-btn" to={`/practice?lesson=${advancedEntry.slug}`}>
                    심화 실습 바로 시작
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="curriculum-track-card learning-level-card">
            <header className="curriculum-track-head">
              <div>
                <h2>초급 코어</h2>
                <p className="muted">
                  목표: session/window/pane 기본 조작과 detach/attach 복귀 루틴을 혼자 수행
                </p>
              </div>
              {beginnerEntry ? (
                <Link className="primary-btn" to={`/practice?lesson=${beginnerEntry.slug}`}>
                  초급 시작
                </Link>
              ) : null}
            </header>
            <div className="curriculum-lesson-list">
              {beginnerLessons.map((lesson) => (
                <div key={lesson.id} className="curriculum-lesson-row">
                  <Link
                    className="curriculum-lesson-link"
                    to={`/learn/${lesson.trackSlug}/${lesson.chapterSlug}/${lesson.slug}`}
                  >
                    <strong>{lesson.title}</strong>
                    <span>{lesson.estimatedMinutes}분 · 미션 {pageData.missionCounts[lesson.slug] ?? 0}개</span>
                  </Link>
                  <Link className="secondary-btn" to={`/practice?lesson=${lesson.slug}`}>
                    실습
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className="curriculum-track-card learning-level-card">
            <header className="curriculum-track-head">
              <div>
                <h2>심화 과정</h2>
                <p className="muted">목표: copy-mode/command-mode/원격 루틴까지 실무형으로 확장</p>
              </div>
              {advancedEntry ? (
                <Link className="secondary-btn" to={`/practice?lesson=${advancedEntry.slug}`}>
                  심화 시작
                </Link>
              ) : null}
            </header>
            <div className="curriculum-lesson-list">
              {advancedLessons.map((lesson) => (
                <div key={lesson.id} className="curriculum-lesson-row">
                  <Link
                    className="curriculum-lesson-link"
                    to={`/learn/${lesson.trackSlug}/${lesson.chapterSlug}/${lesson.slug}`}
                  >
                    <strong>{lesson.title}</strong>
                    <span>{lesson.estimatedMinutes}분 · 미션 {pageData.missionCounts[lesson.slug] ?? 0}개</span>
                  </Link>
                  <Link className="secondary-btn" to={`/practice?lesson=${lesson.slug}`}>
                    실습
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

