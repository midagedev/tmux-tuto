import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { resolveLessonPracticeType } from '../../features/curriculum/lessonPracticeType';
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
  const { t } = useTranslation();
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
      <PagePlaceholder eyebrow="Lesson" title={t('레슨 로딩 중')} description={t('레슨 정보를 불러오고 있습니다.')} />
    );
  }

  if (pageState.status === 'not-found') {
    return (
      <PagePlaceholder
        eyebrow="Lesson"
        title={t('레슨을 찾을 수 없습니다')}
        description={t('잘못된 경로이거나 콘텐츠가 변경되었습니다.')}
      >
        <EmptyState title={t('유효한 레슨이 없습니다')} description={t('커리큘럼 페이지에서 다시 선택해 주세요.')} />
        <div className="inline-actions">
          <Link className="secondary-btn" to="/learn">
            {t('커리큘럼으로 이동')}
          </Link>
        </div>
      </PagePlaceholder>
    );
  }

  if (pageState.status === 'error') {
    return (
      <PagePlaceholder
        eyebrow="Lesson"
        title={t('레슨 로드 실패')}
        description={t('콘텐츠를 읽는 중 오류가 발생했습니다.')}
      >
        <EmptyState title={t('레슨 정보를 읽지 못했습니다')} description={t('잠시 후 다시 시도해 주세요.')} />
      </PagePlaceholder>
    );
  }

  const { track, chapter, lesson, missions, termGlossary } = pageState;
  const lessonTerms = resolveLessonTerms(lesson, missions, termGlossary ?? null);
  const isGuideLesson = resolveLessonPracticeType(lesson) === 'guide';
  const guideSymptoms = lesson.guide?.symptoms ?? lesson.failureStates ?? [];
  const guideChecks = lesson.guide?.checks ?? [];
  const guideWorkarounds = lesson.guide?.workarounds ?? [];
  const guideChecklist = lesson.guide?.checklist ?? lesson.successCriteria ?? [];
  const guideCommands = lesson.guide?.commands ?? [];

  return (
    <PagePlaceholder
      eyebrow="Lesson"
      title={`${t(track.title)} · ${t(chapter.title)}`}
      description={t('{{title}} · 예상 {{minutes}}분', { title: t(lesson.title), minutes: lesson.estimatedMinutes })}
    >
      <section className="lesson-section lesson-action-panel">
        <ul className="lesson-pill-row">
          <li className="lesson-pill">{t('예상 {{minutes}}분', { minutes: lesson.estimatedMinutes })}</li>
          <li className="lesson-pill">{t('학습 목표 {{count}}개', { count: lesson.objectives.length })}</li>
          <li className={`lesson-pill ${isGuideLesson ? 'is-guide' : 'is-mission'}`}>
            {isGuideLesson ? t('실습형 레슨') : t('미션 {{count}}개', { count: missions.length })}
          </li>
        </ul>
        <div className="inline-actions">
          <Link className="primary-btn" to={`/practice?lesson=${lesson.slug}`}>
            {t('시뮬레이터에서 레슨 시작')}
          </Link>
          <Link className="secondary-btn" to="/learn">
            {t('커리큘럼 목록')}
          </Link>
        </div>
      </section>

      <section className="lesson-section lesson-brief">
        <h2>{t('레슨 가이드')}</h2>
        <div className="lesson-summary">
          {lesson.overview ? (
            <p>
              <strong>{t('레슨 소개:')}</strong> {renderTextWithShortcutTooltip(t(lesson.overview), 'lesson-overview')}
            </p>
          ) : null}
          {lesson.goal ? (
            <p>
              <strong>{t('이 레슨의 목표:')}</strong> {renderTextWithShortcutTooltip(t(lesson.goal), 'lesson-goal')}
            </p>
          ) : null}
        </div>

        <h3>{t('학습 목표')}</h3>
        <ul className="link-list">
          {lesson.objectives.map((objective, index) => (
            <li key={`${lesson.id}-objective-${index}`}>
              {renderTextWithShortcutTooltip(t(objective), `objective-${index}`)}
            </li>
          ))}
        </ul>

        {lesson.successCriteria && lesson.successCriteria.length > 0 ? (
          <details className="lesson-detail-group">
            <summary>{t('완료 기준 {{count}}개', { count: lesson.successCriteria.length })}</summary>
            <ul className="link-list">
              {lesson.successCriteria.map((item, index) => (
                <li key={`${lesson.id}-success-${index}`}>{renderTextWithShortcutTooltip(t(item), `success-${index}`)}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {lesson.failureStates && lesson.failureStates.length > 0 ? (
          <details className="lesson-detail-group">
            <summary>{t('부족 상태 {{count}}개', { count: lesson.failureStates.length })}</summary>
            <ul className="link-list">
              {lesson.failureStates.map((item, index) => (
                <li key={`${lesson.id}-failure-${index}`}>{renderTextWithShortcutTooltip(t(item), `failure-${index}`)}</li>
              ))}
            </ul>
          </details>
        ) : null}

        {lessonTerms.length > 0 ? (
          <>
            <h3>{t('용어 빠른 설명')}</h3>
            <ul className="link-list">
              {lessonTerms.map((term) => (
                <li key={term.id}>
                  <strong>{t(term.title)}:</strong> {t(term.description)}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {isGuideLesson ? (
          <>
            <h3>{t('실습 진행 순서')}</h3>
            <div className="lesson-guide-grid">
              <article className="lesson-guide-card">
                <h4>{t('증상')}</h4>
                {guideSymptoms.length === 0 ? (
                  <p className="muted">{t('등록된 항목이 없습니다.')}</p>
                ) : (
                  <ul className="link-list">
                    {guideSymptoms.map((item, index) => (
                      <li key={`guide-symptom-${index}`}>{renderTextWithShortcutTooltip(t(item), `guide-symptom-${index}`)}</li>
                    ))}
                  </ul>
                )}
              </article>
              <article className="lesson-guide-card">
                <h4>{t('확인 명령')}</h4>
                {guideChecks.length === 0 && guideCommands.length === 0 ? (
                  <p className="muted">{t('등록된 항목이 없습니다.')}</p>
                ) : (
                  <ul className="link-list">
                    {guideChecks.map((item, index) => (
                      <li key={`guide-check-${index}`}>{renderTextWithShortcutTooltip(t(item), `guide-check-${index}`)}</li>
                    ))}
                    {guideCommands.map((command, index) => (
                      <li key={`guide-command-${index}`}>
                        <code>{command}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              <article className="lesson-guide-card">
                <h4>{t('우회책')}</h4>
                {guideWorkarounds.length === 0 ? (
                  <p className="muted">{t('등록된 항목이 없습니다.')}</p>
                ) : (
                  <ul className="link-list">
                    {guideWorkarounds.map((item, index) => (
                      <li key={`guide-workaround-${index}`}>
                        {renderTextWithShortcutTooltip(t(item), `guide-workaround-${index}`)}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              <article className="lesson-guide-card">
                <h4>{t('체크리스트')}</h4>
                {guideChecklist.length === 0 ? (
                  <p className="muted">{t('등록된 항목이 없습니다.')}</p>
                ) : (
                  <ul className="link-list">
                    {guideChecklist.map((item, index) => (
                      <li key={`guide-checklist-${index}`}>
                        {renderTextWithShortcutTooltip(t(item), `guide-checklist-${index}`)}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </>
        ) : (
          <>
            <h3>{t('미션 실행 순서 ({{count}})', { count: missions.length })}</h3>
            {missions.length === 0 ? (
              <p className="muted">{t('등록된 미션이 없습니다.')}</p>
            ) : (
          <div className="lesson-mission-grid">
            {missions.map((mission) => {
              const previewHints = mission.hints.slice(0, 2);
              const restHints = mission.hints.slice(2);

              return (
                <article key={mission.id} className="lesson-mission-card">
                  <h4>{t(mission.title)}</h4>
                  <p className="lesson-mission-meta">
                    {t('난이도 {{difficulty}} · 초기 시나리오 {{scenario}}', {
                      difficulty: mission.difficulty,
                      scenario: mission.initialScenario,
                    })}
                  </p>
                  {previewHints.length > 0 ? (
                    <ul className="link-list lesson-mission-hints">
                      {previewHints.map((hint, index) => (
                        <li key={`${mission.id}-hint-preview-${index}`}>
                          {renderTextWithShortcutTooltip(t(hint), `${mission.id}-hint-preview-${index}`)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">{t('힌트가 없습니다.')}</p>
                  )}
                  {restHints.length > 0 ? (
                    <details className="lesson-mission-more">
                      <summary>{t('힌트 {{count}}개 더 보기', { count: restHints.length })}</summary>
                      <ul className="link-list lesson-mission-hints">
                        {restHints.map((hint, index) => (
                          <li key={`${mission.id}-hint-rest-${index}`}>
                            {renderTextWithShortcutTooltip(t(hint), `${mission.id}-hint-rest-${index}`)}
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
          </>
        )}
      </section>
    </PagePlaceholder>
  );
}
