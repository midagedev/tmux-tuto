import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useEffect, useState } from 'react';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import { EmptyState } from '../../components/system/EmptyState';
import type { AppChapter, AppContent, AppLesson, AppMission, AppTrack } from '../../features/curriculum/contentSchema';
import { Link } from 'react-router-dom';

type ChapterWithLessons = AppChapter & {
  lessons: AppLesson[];
};

type TrackWithCurriculum = AppTrack & {
  chapters: ChapterWithLessons[];
  firstLesson: AppLesson | null;
};

type LearnPageData = {
  tracks: TrackWithCurriculum[];
  missionCounts: Record<string, number>;
  learningJourney: AppContent['learningJourney'] | null;
};

function toTrackWithCurriculum(
  track: AppTrack,
  chapters: AppChapter[],
  lessons: AppLesson[],
): TrackWithCurriculum {
  const chaptersForTrack = chapters
    .filter((chapter) => chapter.trackSlug === track.slug)
    .sort((left, right) => left.order - right.order);

  const chaptersWithLessons = chaptersForTrack.map((chapter) => ({
    ...chapter,
    lessons: lessons
      .filter((lesson) => lesson.trackSlug === track.slug && lesson.chapterSlug === chapter.slug)
      .sort((left, right) => left.slug.localeCompare(right.slug)),
  }));

  const firstLesson = chaptersWithLessons.find((chapter) => chapter.lessons.length > 0)?.lessons[0] ?? null;

  return {
    ...track,
    chapters: chaptersWithLessons,
    firstLesson,
  };
}

function buildMissionCountMap(missions: AppMission[]) {
  return missions.reduce<Record<string, number>>((accumulator, mission) => {
    accumulator[mission.lessonSlug] = (accumulator[mission.lessonSlug] ?? 0) + 1;
    return accumulator;
  }, {});
}

export function LearnIndexPage() {
  const [pageData, setPageData] = useState<LearnPageData>({
    tracks: [],
    missionCounts: {},
    learningJourney: null,
  });

  useEffect(() => {
    loadAppContent()
      .then((content) => {
        const activeTracks = content.tracks
          .filter((track) => track.status === 'active')
          .sort((left, right) => left.order - right.order)
          .map((track) => toTrackWithCurriculum(track, content.chapters, content.lessons));

        setPageData({
          tracks: activeTracks,
          missionCounts: buildMissionCountMap(content.missions),
          learningJourney: content.learningJourney ?? null,
        });
      })
      .catch(() => {
        setPageData({ tracks: [], missionCounts: {}, learningJourney: null });
      });
  }, []);

  const firstTrack = pageData.tracks[0] ?? null;
  const firstLesson = firstTrack?.firstLesson ?? null;

  return (
    <PagePlaceholder
      eyebrow="Learn"
      title="tmux 커리큘럼"
      description="초간단 온램프부터 실무 루틴까지, 레슨과 실습을 한 흐름으로 학습합니다."
    >
      {pageData.tracks.length === 0 ? (
        <EmptyState title="로드된 트랙이 없습니다" description="콘텐츠 파일을 확인해 주세요." />
      ) : (
        <div className="curriculum-track-list">
          {pageData.learningJourney ? (
            <section className="learning-journey-card" aria-label="Learning Journey">
              <p className="page-eyebrow">Start Here</p>
              <h2>{pageData.learningJourney.title}</h2>
              <p>{pageData.learningJourney.intro}</p>
              <p>
                <strong>최종 목표:</strong> {pageData.learningJourney.targetOutcome}
              </p>
              <ul className="link-list">
                {pageData.learningJourney.principles.map((principle) => (
                  <li key={principle}>{principle}</li>
                ))}
              </ul>
              {firstLesson ? (
                <div className="inline-actions">
                  <Link
                    className="primary-btn"
                    to={`/learn/${firstLesson.trackSlug}/${firstLesson.chapterSlug}/${firstLesson.slug}`}
                  >
                    첫 3분 레슨 시작
                  </Link>
                  <Link className="secondary-btn" to={`/practice?lesson=${firstLesson.slug}`}>
                    바로 실습 열기
                  </Link>
                </div>
              ) : null}
            </section>
          ) : null}

          {pageData.tracks.map((track) => (
            <section key={track.id} className="curriculum-track-card" aria-label={`${track.title} curriculum`}>
              <header className="curriculum-track-head">
                <div>
                  <h2>{track.title}</h2>
                  <p className="muted">{track.summary}</p>
                </div>
                {track.firstLesson ? (
                  <Link
                    className="primary-btn"
                    to={`/learn/${track.slug}/${track.firstLesson.chapterSlug}/${track.firstLesson.slug}`}
                  >
                    트랙 시작
                  </Link>
                ) : (
                  <span className="muted">시작 가능한 레슨 없음</span>
                )}
              </header>

              <div className="curriculum-chapter-list">
                {track.chapters.map((chapter) => (
                  <article key={chapter.id} className="curriculum-chapter-card">
                    <h3>{chapter.title}</h3>
                    {chapter.lessons.length === 0 ? (
                      <p className="muted">등록된 레슨이 없습니다.</p>
                    ) : (
                      <div className="curriculum-lesson-list">
                        {chapter.lessons.map((lesson) => {
                          const missionCount = pageData.missionCounts[lesson.slug] ?? 0;
                          return (
                            <div key={lesson.id} className="curriculum-lesson-row">
                              <Link
                                className="curriculum-lesson-link"
                                to={`/learn/${lesson.trackSlug}/${lesson.chapterSlug}/${lesson.slug}`}
                              >
                                <strong>{lesson.title}</strong>
                                <span>{lesson.estimatedMinutes}분 · 미션 {missionCount}개</span>
                              </Link>
                              <Link className="secondary-btn" to={`/practice?lesson=${lesson.slug}`}>
                                실습 시작
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PagePlaceholder>
  );
}
