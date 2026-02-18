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
import type { AppChapter, AppLesson, AppMission, AppTrack } from '../../features/curriculum/contentSchema';

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
    }
  | {
      status: 'not-found';
    }
  | {
      status: 'error';
    };

const SHORTCUT_TOOLTIPS: Record<string, string> = {
  'Ctrl+b': 'Ctrl를 누른 상태에서 b를 누른 뒤 손을 떼고 다음 키를 입력하세요.',
  c: 'Ctrl+b 다음 c: 새 window를 만듭니다.',
  d: 'Ctrl+b 다음 d: 현재 세션에서 분리(detach)합니다.',
  ':': 'Ctrl+b 다음 : : command prompt를 엽니다.',
  '%': 'Shift+5',
  '"': "Shift+'",
};

function renderTextWithShortcutTooltip(text: string, keyPrefix: string) {
  return text.split(/(`[^`]+`)/g).map((segment, index) => {
    if (segment.startsWith('`') && segment.endsWith('`')) {
      const token = segment.slice(1, -1);
      const tooltip = SHORTCUT_TOOLTIPS[token];

      return (
        <code
          key={`${keyPrefix}-token-${index}`}
          className={`shortcut-token${tooltip ? ' shortcut-token-tooltip' : ''}`}
          title={tooltip}
        >
          {token}
        </code>
      );
    }

    return <span key={`${keyPrefix}-text-${index}`}>{segment}</span>;
  });
}

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

  const { track, chapter, lesson, missions } = pageState;
  const hasLessonBrief =
    Boolean(lesson.overview) ||
    Boolean(lesson.goal) ||
    (lesson.successCriteria?.length ?? 0) > 0 ||
    (lesson.failureStates?.length ?? 0) > 0;

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

      {hasLessonBrief ? (
        <section className="lesson-section lesson-brief">
          <h2>레슨 요약</h2>
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
          {lesson.successCriteria && lesson.successCriteria.length > 0 ? (
            <details className="lesson-detail-group">
              <summary>완료 기준 {lesson.successCriteria.length}개</summary>
              <ul className="link-list">
                {lesson.successCriteria.map((item, index) => (
                  <li key={item}>{renderTextWithShortcutTooltip(item, `success-${index}`)}</li>
                ))}
              </ul>
            </details>
          ) : null}
          {lesson.failureStates && lesson.failureStates.length > 0 ? (
            <details className="lesson-detail-group">
              <summary>부족 상태 {lesson.failureStates.length}개</summary>
              <ul className="link-list">
                {lesson.failureStates.map((item, index) => (
                  <li key={item}>{renderTextWithShortcutTooltip(item, `failure-${index}`)}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}

      <section className="lesson-section">
        <h2>학습 목표</h2>
        <ul className="link-list">
          {lesson.objectives.map((objective, index) => (
            <li key={objective}>{renderTextWithShortcutTooltip(objective, `objective-${index}`)}</li>
          ))}
        </ul>
      </section>

      <section className="lesson-section">
        <h2>미션 목록 ({missions.length})</h2>
        {missions.length === 0 ? (
          <p className="muted">등록된 미션이 없습니다.</p>
        ) : (
          <div className="lesson-mission-grid">
            {missions.map((mission) => {
              const previewHints = mission.hints.slice(0, 2);
              const restHints = mission.hints.slice(2);

              return (
                <article key={mission.id} className="lesson-mission-card">
                  <h3>{mission.title}</h3>
                  <p className="lesson-mission-meta">
                    난이도 {mission.difficulty} · 초기 시나리오 {mission.initialScenario}
                  </p>
                  {previewHints.length > 0 ? (
                    <ul className="link-list lesson-mission-hints">
                      {previewHints.map((hint, index) => (
                        <li key={hint}>{renderTextWithShortcutTooltip(hint, `${mission.id}-hint-preview-${index}`)}</li>
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
                          <li key={hint}>{renderTextWithShortcutTooltip(hint, `${mission.id}-hint-rest-${index}`)}</li>
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
