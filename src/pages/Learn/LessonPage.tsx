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

  return (
    <PagePlaceholder
      eyebrow="Lesson"
      title={`${track.title} · ${chapter.title}`}
      description={`${lesson.title} · 예상 ${lesson.estimatedMinutes}분`}
    >
      {lesson.overview ||
      lesson.goal ||
      (lesson.successCriteria?.length ?? 0) > 0 ||
      (lesson.failureStates?.length ?? 0) > 0 ? (
        <section className="lesson-section lesson-brief">
          {lesson.overview ? (
            <p>
              <strong>레슨 소개:</strong> {lesson.overview}
            </p>
          ) : null}
          {lesson.goal ? (
            <p>
              <strong>이 레슨의 목표:</strong> {lesson.goal}
            </p>
          ) : null}
          {lesson.successCriteria && lesson.successCriteria.length > 0 ? (
            <>
              <h2>완료 기준</h2>
              <ul className="link-list">
                {lesson.successCriteria.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
          {lesson.failureStates && lesson.failureStates.length > 0 ? (
            <>
              <h2>부족 상태</h2>
              <ul className="link-list">
                {lesson.failureStates.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      <section className="lesson-section">
        <h2>학습 목표</h2>
        <ul className="link-list">
          {lesson.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </section>

      <div className="inline-actions">
        <Link className="primary-btn" to={`/practice?lesson=${lesson.slug}`}>
          시뮬레이터에서 레슨 시작
        </Link>
        <Link className="secondary-btn" to="/learn">
          커리큘럼 목록
        </Link>
      </div>

      <section className="lesson-section">
        <h2>미션 목록 ({missions.length})</h2>
        {missions.length === 0 ? (
          <p className="muted">등록된 미션이 없습니다.</p>
        ) : (
          <div className="lesson-mission-grid">
            {missions.map((mission) => (
              <article key={mission.id} className="lesson-mission-card">
                <h3>{mission.title}</h3>
                <p className="muted">
                  난이도 {mission.difficulty} · 초기 시나리오 {mission.initialScenario}
                </p>
                <ul className="link-list">
                  {mission.hints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </PagePlaceholder>
  );
}
