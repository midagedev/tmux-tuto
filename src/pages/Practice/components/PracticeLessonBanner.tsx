import type { TFunction } from 'i18next';
import type { AppChapter, AppLesson, AppMission, AppTrack } from '../../../features/curriculum/contentSchema';
import type { LessonTerm } from '../../../features/curriculum/lessonTerms';
import { renderTextWithShortcutTooltip } from '../../../features/curriculum/shortcutTooltip';

type PracticeLessonBannerProps = {
  t: TFunction;
  selectedLesson: AppLesson;
  selectedLessonTrack: AppTrack | null;
  selectedLessonChapter: AppChapter | null;
  lessonMissions: AppMission[];
  bannerLessonTerms: LessonTerm[];
};

export function PracticeLessonBanner({
  t,
  selectedLesson,
  selectedLessonTrack,
  selectedLessonChapter,
  lessonMissions,
  bannerLessonTerms,
}: PracticeLessonBannerProps) {
  return (
    <section className="vm-lesson-banner">
      <div className="vm-lesson-banner-header">
        <span className="vm-lesson-banner-path">
          {t(selectedLessonTrack?.title ?? selectedLesson.trackSlug)} · {t(selectedLessonChapter?.title ?? selectedLesson.chapterSlug)}
        </span>
        <h2 className="vm-lesson-banner-title">{t(selectedLesson.title)}</h2>
        <span className="vm-lesson-banner-meta">
          {t('{{minutes}}분 · 목표 {{objectiveCount}} · 미션 {{missionCount}}', {
            minutes: selectedLesson.estimatedMinutes,
            objectiveCount: selectedLesson.objectives.length,
            missionCount: lessonMissions.length,
          })}
        </span>
      </div>
      <div className="vm-lesson-banner-body">
        <div className="vm-lesson-banner-col">
          {selectedLesson.overview ? <p>{renderTextWithShortcutTooltip(t(selectedLesson.overview), 'banner-overview')}</p> : null}
          {selectedLesson.goal ? (
            <p className="vm-lesson-banner-goal">
              <strong>{t('목표:')}</strong> {renderTextWithShortcutTooltip(t(selectedLesson.goal), 'banner-goal')}
            </p>
          ) : null}
        </div>
        <div className="vm-lesson-banner-col">
          <ul className="vm-lesson-banner-objectives">
            {selectedLesson.objectives.map((objective, index) => (
              <li key={`banner-obj-${index}`}>{renderTextWithShortcutTooltip(t(objective), `banner-obj-${index}`)}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="vm-lesson-banner-footer">
        {selectedLesson.successCriteria && selectedLesson.successCriteria.length > 0 ? (
          <span className="vm-lesson-banner-tag">
            <strong>{t('완료:')}</strong>{' '}
            {selectedLesson.successCriteria.map((item, index) => (
              <span key={`banner-sc-${index}`}>
                {index > 0 ? ' · ' : ''}
                {renderTextWithShortcutTooltip(t(item), `banner-sc-${index}`)}
              </span>
            ))}
          </span>
        ) : null}
        {selectedLesson.failureStates && selectedLesson.failureStates.length > 0 ? (
          <span className="vm-lesson-banner-tag is-warn">
            <strong>{t('부족:')}</strong>{' '}
            {selectedLesson.failureStates.map((item, index) => (
              <span key={`banner-fs-${index}`}>
                {index > 0 ? ' · ' : ''}
                {renderTextWithShortcutTooltip(t(item), `banner-fs-${index}`)}
              </span>
            ))}
          </span>
        ) : null}
      </div>
      {bannerLessonTerms.length > 0 ? (
        <div className="vm-lesson-banner-terms-row">
          <span className="vm-lesson-banner-terms-label">{t('용어사전')}</span>
          {bannerLessonTerms.map((term) => (
            <span key={term.id} className="vm-lesson-banner-term">
              <strong>{t(term.title)}</strong> {t(term.description)}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
