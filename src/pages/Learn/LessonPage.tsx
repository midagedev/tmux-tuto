import { Link, useParams } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useEffect, useState } from 'react';
import { EmptyState } from '../../components/system/EmptyState';
import {
  getChapterBySlug,
  getLessonBySlug,
  getTrackBySlug,
  loadAppContent,
} from '../../features/curriculum/contentLoader';
import type { AppChapter, AppContent, AppLesson, AppMission, AppTrack } from '../../features/curriculum/contentSchema';
import { resolveLessonTerms } from '../../features/curriculum/lessonTerms';
import { renderTextWithShortcutTooltip } from '../../features/curriculum/shortcutTooltip';

type LessonPageState =
  | {
      status: 'loading';
    }
  | {
      status: 'ready';
      track: AppTrack;
      chapter: AppChapter;
      lesson: AppLesson;
      missions: AppMission[];
      termGlossary: AppContent['termGlossary'] | null;
    }
  | {
      status: 'not-found';
    }
  | {
      status: 'error';
    };

export function LessonPage() {
  const { trackSlug, chapterSlug, lessonSlug } = useParams();
  const [pageState, setPageState] = useState<LessonPageState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;

    if (!trackSlug || !chapterSlug || !lessonSlug) {
      setPageState({ status: 'not-found' });
      return undefined;
    }

    loadAppContent()
      .then((content) => {
        if (!isMounted) {
          return;
        }

        const track = getTrackBySlug(content, trackSlug);
        const chapter = getChapterBySlug(content, chapterSlug);
        const lesson = getLessonBySlug(content, lessonSlug);
        const isValidRelation =
          track?.slug === lesson?.trackSlug &&
          chapter?.slug === lesson?.chapterSlug &&
          chapter?.trackSlug === track?.slug;

        if (!track || !chapter || !lesson || !isValidRelation) {
          setPageState({ status: 'not-found' });
          return;
        }

        const missions = content.missions.filter((mission) => mission.lessonSlug === lesson.slug);
        setPageState({
          status: 'ready',
          track,
          chapter,
          lesson,
          missions,
          termGlossary: content.termGlossary ?? null,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setPageState({ status: 'error' });
      });

    return () => {
      isMounted = false;
    };
  }, [chapterSlug, lessonSlug, trackSlug]);

  if (pageState.status === 'loading') {
    return (
      <PagePlaceholder eyebrow="Lesson" title="레슨 로딩 중" description="레슨 정보를 불러오고 있습니다." />
    );
  }

  if (pageState.status === 'not-found') {
    return (
      <PagePlaceholder
        eyebrow="Lesson"
        title="레슨을 찾을 수 없습니다"
        description="잘못된 경로이거나 콘텐츠가 변경되었습니다."
      >
        <EmptyState title="유효한 레슨이 없습니다" description="커리큘럼 페이지에서 다시 선택해 주세요." />
        <div className="inline-actions">
          <Link className="secondary-btn" to="/learn">
            커리큘럼으로 이동
          </Link>
        </div>
      </PagePlaceholder>
    );
  }

  if (pageState.status === 'error') {
    return (
      <PagePlaceholder
        eyebrow="Lesson"
        title="레슨 로드 실패"
        description="콘텐츠를 읽는 중 오류가 발생했습니다."
      >
        <EmptyState title="레슨 정보를 읽지 못했습니다" description="잠시 후 다시 시도해 주세요." />
      </PagePlaceholder>
    );
  }

  const { track, chapter, lesson, missions, termGlossary } = pageState;
  const lessonTerms = resolveLessonTerms(lesson, missions, termGlossary ?? null);

  return (
    <PagePlaceholder
      eyebrow="Lesson"
      title={`${track.title} · ${chapter.title}`}
      description={`${lesson.title} · 예상 ${lesson.estimatedMinutes}분`}
    >
      <section className="lesson-section lesson-action-panel">
        <ul className="lesson-pill-row">
          <li className="lesson-pill">예상 {lesson.estimatedMinutes}분</li>
          <li className="lesson-pill">학습 목표 {lesson.objectives.length}개</li>
          <li className="lesson-pill">미션 {missions.length}개</li>
        </ul>
        <div className="inline-actions">
          <Link className="primary-btn" to={`/practice?lesson=${lesson.slug}`}>
            시뮬레이터에서 레슨 시작
          </Link>
          <Link className="secondary-btn" to="/learn">
            커리큘럼 목록
          </Link>
        </div>
      </section>

      <section className="lesson-section lesson-brief">
        <h2>레슨 가이드</h2>
        <div className="lesson-summary">
          {lesson.overview ? (
            <p>
              <strong>레슨 소개:</strong> {renderTextWithShortcutTooltip(lesson.overview, 'lesson-overview')}
            </p>
          ) : null}
          {lesson.goal ? (
            <p>
              <strong>이 레슨의 목표:</strong> {renderTextWithShortcutTooltip(lesson.goal, 'lesson-goal')}
            </p>
          ) : null}
        </div>

        <h3>학습 목표</h3>
        <ul className="link-list">
          {lesson.objectives.map((objective, index) => (
            <li key={`${lesson.id}-objective-${index}`}>
              {renderTextWithShortcutTooltip(objective, `objective-${index}`)}
            </li>
          ))}
        </ul>

        {lesson.successCriteria && lesson.successCriteria.length > 0 ? (
          <details className="lesson-detail-group">
            <summary>완료 기준 {lesson.successCriteria.length}개</summary>
            <ul className="link-list">
              {lesson.successCriteria.map((item, index) => (
                <li key={`${lesson.id}-success-${index}`}>{renderTextWithShortcutTooltip(item, `success-${index}`)}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {lesson.failureStates && lesson.failureStates.length > 0 ? (
          <details className="lesson-detail-group">
            <summary>부족 상태 {lesson.failureStates.length}개</summary>
            <ul className="link-list">
              {lesson.failureStates.map((item, index) => (
                <li key={`${lesson.id}-failure-${index}`}>{renderTextWithShortcutTooltip(item, `failure-${index}`)}</li>
              ))}
            </ul>
          </details>
        ) : null}

        {lessonTerms.length > 0 ? (
          <>
            <h3>용어 빠른 설명</h3>
            <ul className="link-list">
              {lessonTerms.map((term) => (
                <li key={term.id}>
                  <strong>{term.title}:</strong> {term.description}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <h3>미션 실행 순서 ({missions.length})</h3>
        {missions.length === 0 ? (
          <p className="muted">등록된 미션이 없습니다.</p>
        ) : (
          <div className="lesson-mission-grid">
            {missions.map((mission) => {
              const previewHints = mission.hints.slice(0, 2);
              const restHints = mission.hints.slice(2);

              return (
                <article key={mission.id} className="lesson-mission-card">
                  <h4>{mission.title}</h4>
                  <p className="lesson-mission-meta">
                    난이도 {mission.difficulty} · 초기 시나리오 {mission.initialScenario}
                  </p>
                  {previewHints.length > 0 ? (
                    <ul className="link-list lesson-mission-hints">
                      {previewHints.map((hint, index) => (
                        <li key={`${mission.id}-hint-preview-${index}`}>
                          {renderTextWithShortcutTooltip(hint, `${mission.id}-hint-preview-${index}`)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">힌트가 없습니다.</p>
                  )}
                  {restHints.length > 0 ? (
                    <details className="lesson-mission-more">
                      <summary>힌트 {restHints.length}개 더 보기</summary>
                      <ul className="link-list lesson-mission-hints">
                        {restHints.map((hint, index) => (
                          <li key={`${mission.id}-hint-rest-${index}`}>
                            {renderTextWithShortcutTooltip(hint, `${mission.id}-hint-rest-${index}`)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </PagePlaceholder>
  );
}
