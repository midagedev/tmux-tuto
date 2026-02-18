import { Link, useParams } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useEffect, useState } from 'react';
import { EmptyState } from '../../components/system/EmptyState';
import { getChapterBySlug, getLessonBySlug, getTrackBySlug, loadAppContent, } from '../../features/curriculum/contentLoader';
import type { AppChapter, AppContent, AppLesson, AppMission, AppTrack } from '../../features/curriculum/contentSchema';
type LessonPageState = {
    status: 'loading';
} | {
    status: 'ready';
    track: AppTrack;
    chapter: AppChapter;
    lesson: AppLesson;
    missions: AppMission[];
    termGlossary: AppContent['termGlossary'] | null;
} | {
    status: 'not-found';
} | {
    status: 'error';
};
const SHORTCUT_TOOLTIPS: Record<string, string> = {
    'Ctrl+b': __tx("Ctrl\uB97C \uB204\uB978 \uC0C1\uD0DC\uC5D0\uC11C b\uB97C \uB204\uB978 \uB4A4 \uC190\uC744 \uB5BC\uACE0 \uB2E4\uC74C \uD0A4\uB97C \uC785\uB825\uD558\uC138\uC694."),
    c: __tx("Ctrl+b \uB2E4\uC74C c: \uC0C8 window\uB97C \uB9CC\uB4ED\uB2C8\uB2E4."),
    d: __tx("Ctrl+b \uB2E4\uC74C d: \uD604\uC7AC \uC138\uC158\uC5D0\uC11C \uBD84\uB9AC(detach)\uD569\uB2C8\uB2E4."),
    ':': __tx("Ctrl+b \uB2E4\uC74C : : command prompt\uB97C \uC5FD\uB2C8\uB2E4."),
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
        aliases: ['session', __tx("\uC138\uC158")],
        description: __tx("\uC791\uC5C5 \uCEE8\uD14D\uC2A4\uD2B8\uB97C \uC720\uC9C0\uD558\uB294 \uCD5C\uC0C1\uC704 \uB2E8\uC704\uC785\uB2C8\uB2E4. SSH\uAC00 \uB04A\uACA8\uB3C4 \uB2E4\uC2DC \uBD99\uC5B4 \uC774\uC5B4\uC11C \uC791\uC5C5\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
    },
    {
        id: 'window',
        title: 'Window',
        aliases: ['window', __tx("\uC708\uB3C4\uC6B0")],
        description: __tx("\uC138\uC158 \uC548\uC758 \uD0ED \uB2E8\uC704 \uC791\uC5C5 \uACF5\uAC04\uC785\uB2C8\uB2E4. \uC11C\uBE44\uC2A4/\uC5ED\uD560\uBCC4\uB85C \uBD84\uB9AC\uD574 \uC804\uD658\uD569\uB2C8\uB2E4."),
    },
    {
        id: 'pane',
        title: 'Pane',
        aliases: ['pane', __tx("\uD328\uC778")],
        description: __tx("\uD55C \uC708\uB3C4\uC6B0\uB97C \uBD84\uD560\uD55C \uD130\uBBF8\uB110 \uC601\uC5ED\uC785\uB2C8\uB2E4. \uCF54\uB4DC/\uB85C\uADF8/\uD14C\uC2A4\uD2B8\uB97C \uBCD1\uB82C\uB85C \uBCFC \uB54C \uC0AC\uC6A9\uD569\uB2C8\uB2E4."),
    },
    {
        id: 'prefix',
        title: 'Prefix Key',
        aliases: ['prefix', 'ctrl+b', 'ctrl+a'],
        description: __tx("tmux \uB2E8\uCD95\uD0A4 \uC785\uB825\uC758 \uC2DC\uC791 \uD0A4\uC785\uB2C8\uB2E4. \uAE30\uBCF8\uAC12\uC740 `Ctrl+b`\uC785\uB2C8\uB2E4."),
    },
    {
        id: 'detach-attach',
        title: 'Detach / Attach',
        aliases: ['detach', 'attach', __tx("\uBD84\uB9AC"), __tx("\uC7AC\uC811\uC18D")],
        description: __tx("\uC138\uC158\uC5D0\uC11C \uBE60\uC838\uB098\uC654\uB2E4\uAC00 \uB2E4\uC2DC \uBD99\uB294 \uB3D9\uC791\uC785\uB2C8\uB2E4. \uC138\uC158 \uBCF5\uAD6C \uB8E8\uD2F4\uC758 \uD575\uC2EC\uC785\uB2C8\uB2E4."),
    },
    {
        id: 'copy-mode',
        title: 'Copy Mode',
        aliases: ['copy-mode', 'copy mode', __tx("\uAC80\uC0C9"), 'scroll'],
        description: __tx("\uC2A4\uD06C\uB864, \uAC80\uC0C9, \uC120\uD0DD \uBCF5\uC0AC\uB97C \uC704\uD55C \uBAA8\uB4DC\uC785\uB2C8\uB2E4. \uAE34 \uB85C\uADF8 \uD0D0\uC0C9\uC5D0 \uC0AC\uC6A9\uD569\uB2C8\uB2E4."),
    },
    {
        id: 'command-mode',
        title: 'Command Mode',
        aliases: ['command mode', 'command-mode', 'command-prompt', 'choose-tree'],
        description: __tx("tmux \uBA85\uB839\uC744 \uC9C1\uC811 \uC2E4\uD589\uD558\uB294 \uBAA8\uB4DC\uC785\uB2C8\uB2E4. \uBCF5\uD569 \uB3D9\uC791 \uC790\uB3D9\uD654\uC5D0 \uC720\uC6A9\uD569\uB2C8\uB2E4."),
    },
    {
        id: 'layout',
        title: 'Layout',
        aliases: ['layout', __tx("\uB808\uC774\uC544\uC6C3"), 'resize', 'split'],
        description: __tx("\uD328\uC778 \uBC30\uCE58\uB97C \uC758\uBBF8\uD569\uB2C8\uB2E4. \uC791\uC5C5 \uC131\uACA9\uC5D0 \uB9DE\uCDB0 \uBD84\uD560/\uD06C\uAE30/\uD3EC\uCEE4\uC2A4\uB97C \uC870\uC815\uD569\uB2C8\uB2E4."),
    },
];
function renderTextWithShortcutTooltip(text: string, keyPrefix: string) {
    return text.split(/(`[^`]+`)/g).map((segment, index) => {
        if (segment.startsWith('`') && segment.endsWith('`')) {
            const token = segment.slice(1, -1);
            const tooltip = SHORTCUT_TOOLTIPS[token];
            return (<code key={`${keyPrefix}-token-${index}`} className={`shortcut-token${tooltip ? ' shortcut-token-tooltip' : ''}`} title={tooltip}>
          {token}
        </code>);
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
            const isValidRelation = track?.slug === lesson?.trackSlug &&
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
        return (<PagePlaceholder eyebrow="Lesson" title={__tx("\uB808\uC2A8 \uB85C\uB529 \uC911")} description={__tx("\uB808\uC2A8 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uACE0 \uC788\uC2B5\uB2C8\uB2E4.")}/>);
    }
    if (pageState.status === 'not-found') {
        return (<PagePlaceholder eyebrow="Lesson" title={__tx("\uB808\uC2A8\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4")} description={__tx("\uC798\uBABB\uB41C \uACBD\uB85C\uC774\uAC70\uB098 \uCF58\uD150\uCE20\uAC00 \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4.")}>
        <EmptyState title={__tx("\uC720\uD6A8\uD55C \uB808\uC2A8\uC774 \uC5C6\uC2B5\uB2C8\uB2E4")} description={__tx("\uCEE4\uB9AC\uD058\uB7FC \uD398\uC774\uC9C0\uC5D0\uC11C \uB2E4\uC2DC \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.")}/>
        <div className="inline-actions">
          <Link className="secondary-btn" to="/learn">{__tx("\uCEE4\uB9AC\uD058\uB7FC\uC73C\uB85C \uC774\uB3D9")}</Link>
        </div>
      </PagePlaceholder>);
    }
    if (pageState.status === 'error') {
        return (<PagePlaceholder eyebrow="Lesson" title={__tx("\uB808\uC2A8 \uB85C\uB4DC \uC2E4\uD328")} description={__tx("\uCF58\uD150\uCE20\uB97C \uC77D\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.")}>
        <EmptyState title={__tx("\uB808\uC2A8 \uC815\uBCF4\uB97C \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4")} description={__tx("\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.")}/>
      </PagePlaceholder>);
    }
    const { track, chapter, lesson, missions, termGlossary } = pageState;
    const lessonTerms = resolveLessonTerms(lesson, missions, termGlossary ?? null);
    return (<PagePlaceholder eyebrow="Lesson" title={`${track.title} · ${chapter.title}`} description={lesson.title + __tx(" \u00B7 \uC608\uC0C1 ") + lesson.estimatedMinutes + __tx("\uBD84")}>
      <section className="lesson-section lesson-action-panel">
        <ul className="lesson-pill-row">
          <li className="lesson-pill">{__tx("\uC608\uC0C1")}{lesson.estimatedMinutes}{__tx("\uBD84")}</li>
          <li className="lesson-pill">{__tx("\uD559\uC2B5 \uBAA9\uD45C")}{lesson.objectives.length}{__tx("\uAC1C")}</li>
          <li className="lesson-pill">{__tx("\uBBF8\uC158")}{missions.length}{__tx("\uAC1C")}</li>
        </ul>
        <div className="inline-actions">
          <Link className="primary-btn" to={`/practice?lesson=${lesson.slug}`}>{__tx("\uC2DC\uBBAC\uB808\uC774\uD130\uC5D0\uC11C \uB808\uC2A8 \uC2DC\uC791")}</Link>
          <Link className="secondary-btn" to="/learn">{__tx("\uCEE4\uB9AC\uD058\uB7FC \uBAA9\uB85D")}</Link>
        </div>
      </section>

      <section className="lesson-section lesson-brief">
        <h2>{__tx("\uB808\uC2A8 \uAC00\uC774\uB4DC")}</h2>
        <div className="lesson-summary">
          {lesson.overview ? (<p>
              <strong>{__tx("\uB808\uC2A8 \uC18C\uAC1C:")}</strong> {renderTextWithShortcutTooltip(lesson.overview, 'lesson-overview')}
            </p>) : null}
          {lesson.goal ? (<p>
              <strong>{__tx("\uC774 \uB808\uC2A8\uC758 \uBAA9\uD45C:")}</strong> {renderTextWithShortcutTooltip(lesson.goal, 'lesson-goal')}
            </p>) : null}
        </div>

        <h3>{__tx("\uD559\uC2B5 \uBAA9\uD45C")}</h3>
        <ul className="link-list">
          {lesson.objectives.map((objective, index) => (<li key={`${lesson.id}-objective-${index}`}>
              {renderTextWithShortcutTooltip(objective, `objective-${index}`)}
            </li>))}
        </ul>

        {lesson.successCriteria && lesson.successCriteria.length > 0 ? (<details className="lesson-detail-group">
            <summary>{__tx("\uC644\uB8CC \uAE30\uC900")}{lesson.successCriteria.length}{__tx("\uAC1C")}</summary>
            <ul className="link-list">
              {lesson.successCriteria.map((item, index) => (<li key={`${lesson.id}-success-${index}`}>{renderTextWithShortcutTooltip(item, `success-${index}`)}</li>))}
            </ul>
          </details>) : null}
        {lesson.failureStates && lesson.failureStates.length > 0 ? (<details className="lesson-detail-group">
            <summary>{__tx("\uBD80\uC871 \uC0C1\uD0DC")}{lesson.failureStates.length}{__tx("\uAC1C")}</summary>
            <ul className="link-list">
              {lesson.failureStates.map((item, index) => (<li key={`${lesson.id}-failure-${index}`}>{renderTextWithShortcutTooltip(item, `failure-${index}`)}</li>))}
            </ul>
          </details>) : null}

        {lessonTerms.length > 0 ? (<>
            <h3>{__tx("\uC6A9\uC5B4 \uBE60\uB978 \uC124\uBA85")}</h3>
            <ul className="link-list">
              {lessonTerms.map((term) => (<li key={term.id}>
                  <strong>{term.title}:</strong> {term.description}
                </li>))}
            </ul>
          </>) : null}

        <h3>{__tx("\uBBF8\uC158 \uC2E4\uD589 \uC21C\uC11C (")}{missions.length})</h3>
        {missions.length === 0 ? (<p className="muted">{__tx("\uB4F1\uB85D\uB41C \uBBF8\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.")}</p>) : (<div className="lesson-mission-grid">
            {missions.map((mission) => {
                const previewHints = mission.hints.slice(0, 2);
                const restHints = mission.hints.slice(2);
                return (<article key={mission.id} className="lesson-mission-card">
                  <h4>{mission.title}</h4>
                  <p className="lesson-mission-meta">{__tx("\uB09C\uC774\uB3C4")}{mission.difficulty}{__tx("\u00B7 \uCD08\uAE30 \uC2DC\uB098\uB9AC\uC624")}{mission.initialScenario}
                  </p>
                  {previewHints.length > 0 ? (<ul className="link-list lesson-mission-hints">
                      {previewHints.map((hint, index) => (<li key={`${mission.id}-hint-preview-${index}`}>
                          {renderTextWithShortcutTooltip(hint, `${mission.id}-hint-preview-${index}`)}
                        </li>))}
                    </ul>) : (<p className="muted">{__tx("\uD78C\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.")}</p>)}
                  {restHints.length > 0 ? (<details className="lesson-mission-more">
                      <summary>{__tx("\uD78C\uD2B8")}{restHints.length}{__tx("\uAC1C \uB354 \uBCF4\uAE30")}</summary>
                      <ul className="link-list lesson-mission-hints">
                        {restHints.map((hint, index) => (<li key={`${mission.id}-hint-rest-${index}`}>
                            {renderTextWithShortcutTooltip(hint, `${mission.id}-hint-rest-${index}`)}
                          </li>))}
                      </ul>
                    </details>) : null}
                </article>);
            })}
          </div>)}
      </section>
    </PagePlaceholder>);
}
