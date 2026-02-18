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

const SHORTCUT_TOOLTIPS: Record<string, string> = {
  'Ctrl+b': 'Ctrl를 누른 상태에서 b를 누른 뒤 손을 떼고 다음 키를 입력하세요.',
  c: 'Ctrl+b 다음 c: 새 window를 만듭니다.',
  d: 'Ctrl+b 다음 d: 현재 세션에서 분리(detach)합니다.',
  ':': 'Ctrl+b 다음 : : command prompt를 엽니다.',
  '%': 'Shift+5',
  '"': "Shift+'",
};

type LessonTerm = {
  id: string;
  title: string;
  aliases: string[];
  description: string;
};

const DEFAULT_TERM_GLOSSARY: LessonTerm[] = [
  {
    id: 'session',
    title: 'Session',
    aliases: ['session', '세션'],
    description: '작업 컨텍스트를 유지하는 최상위 단위입니다. SSH가 끊겨도 다시 붙어 이어서 작업할 수 있습니다.',
  },
  {
    id: 'window',
    title: 'Window',
    aliases: ['window', '윈도우'],
    description: '세션 안의 탭 단위 작업 공간입니다. 서비스/역할별로 분리해 전환합니다.',
  },
  {
    id: 'pane',
    title: 'Pane',
    aliases: ['pane', '패인'],
    description: '한 윈도우를 분할한 터미널 영역입니다. 코드/로그/테스트를 병렬로 볼 때 사용합니다.',
  },
  {
    id: 'prefix',
    title: 'Prefix Key',
    aliases: ['prefix', 'ctrl+b', 'ctrl+a'],
    description: 'tmux 단축키 입력의 시작 키입니다. 기본값은 `Ctrl+b`입니다.',
  },
  {
    id: 'detach-attach',
    title: 'Detach / Attach',
    aliases: ['detach', 'attach', '분리', '재접속'],
    description: '세션에서 빠져나왔다가 다시 붙는 동작입니다. 세션 복구 루틴의 핵심입니다.',
  },
  {
    id: 'copy-mode',
    title: 'Copy Mode',
    aliases: ['copy-mode', 'copy mode', '검색', 'scroll'],
    description: '스크롤, 검색, 선택 복사를 위한 모드입니다. 긴 로그 탐색에 사용합니다.',
  },
  {
    id: 'command-mode',
    title: 'Command Mode',
    aliases: ['command mode', 'command-mode', 'command-prompt', 'choose-tree'],
    description: 'tmux 명령을 직접 실행하는 모드입니다. 복합 동작 자동화에 유용합니다.',
  },
  {
    id: 'layout',
    title: 'Layout',
    aliases: ['layout', '레이아웃', 'resize', 'split'],
    description: '패인 배치를 의미합니다. 작업 성격에 맞춰 분할/크기/포커스를 조정합니다.',
  },
];

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

function resolveLessonTerms(lesson: AppLesson, missions: AppMission[], termGlossary: LessonTerm[] | null) {
  const corpus = [
    lesson.title,
    lesson.overview ?? '',
    lesson.goal ?? '',
    ...lesson.objectives,
    ...(lesson.successCriteria ?? []),
    ...(lesson.failureStates ?? []),
    ...missions.flatMap((mission) => [mission.title, ...mission.hints]),
  ]
    .join(' ')
    .toLowerCase();

  const source = termGlossary ?? DEFAULT_TERM_GLOSSARY;
  return source.filter((term) => term.aliases.some((alias) => corpus.includes(alias.toLowerCase()))).slice(0, 6);
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
