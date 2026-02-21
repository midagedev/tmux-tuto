import type { TFunction } from 'i18next';
import type { LessonFilter, LessonProgressRow } from '../lessonProgress';
import { getLessonStatusClass, getLessonStatusLabel, getMetricBadgeClass } from '../practiceVmHelpers';

type VmStatus = 'idle' | 'booting' | 'running' | 'stopped' | 'error';

type PracticeLessonCatalogPanelProps = {
  t: TFunction;
  lessonFilter: LessonFilter;
  lessonFilterOptions: Array<{ value: LessonFilter; label: string }>;
  filteredLessonRows: LessonProgressRow[];
  selectedLessonSlug: string;
  trackTitleMap: Map<string, string>;
  chapterTitleMap: Map<string, string>;
  lessonCompletedMissionCount: number;
  lessonMissionCount: number;
  manualMissionCandidatesCount: number;
  vmStatus: VmStatus;
  vmStatusText: string;
  onSelectLearningPathEntry: () => void;
  onLessonFilterChange: (filter: LessonFilter) => void;
  onSelectLesson: (lessonSlug: string) => void;
};

export function PracticeLessonCatalogPanel({
  t,
  lessonFilter,
  lessonFilterOptions,
  filteredLessonRows,
  selectedLessonSlug,
  trackTitleMap,
  chapterTitleMap,
  lessonCompletedMissionCount,
  lessonMissionCount,
  manualMissionCandidatesCount,
  vmStatus,
  vmStatusText,
  onSelectLearningPathEntry,
  onLessonFilterChange,
  onSelectLesson,
}: PracticeLessonCatalogPanelProps) {
  return (
    <section className="vm-curriculum-panel vm-curriculum-row-layout">
      <div className="inline-actions">
        <button type="button" className="secondary-btn" onClick={onSelectLearningPathEntry}>
          {t('통합 학습 경로 처음으로')}
        </button>
      </div>
      <div className="vm-lesson-filter" role="tablist" aria-label={t('레슨 필터')}>
        {lessonFilterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`secondary-btn vm-lesson-filter-btn ${lessonFilter === option.value ? 'is-active' : ''}`}
            onClick={() => onLessonFilterChange(option.value)}
          >
            {t(option.label)}
          </button>
        ))}
      </div>
      <section className="vm-lesson-catalog" aria-label={t('레슨 목록')}>
        {filteredLessonRows.length === 0 ? (
          <p className="muted">{t('선택한 필터에 해당하는 레슨이 없습니다.')}</p>
        ) : (
          filteredLessonRows.map((row) => {
            const isActive = row.lesson.slug === selectedLessonSlug;
            const trackTitle = trackTitleMap.get(row.lesson.trackSlug) ?? row.lesson.trackSlug;
            const chapterTitle = chapterTitleMap.get(row.lesson.chapterSlug) ?? row.lesson.chapterSlug;

            return (
              <button
                key={row.lesson.id}
                type="button"
                className={`vm-lesson-row ${isActive ? 'is-active' : ''}`}
                onClick={() => onSelectLesson(row.lesson.slug)}
                aria-pressed={isActive}
              >
                <span className="vm-lesson-row-main">
                  <strong>{t(row.lesson.title)}</strong>
                  <small>
                    {t(trackTitle)} · {t(chapterTitle)}
                  </small>
                </span>
                <span className="vm-lesson-row-meta">
                  <small>
                    {row.completedMissionCount}/{row.totalMissionCount}
                  </small>
                  <span className={`vm-lesson-row-status ${getLessonStatusClass(row.status)}`}>
                    {getLessonStatusLabel(t, row.status)}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </section>
      <div className="vm-lesson-progress">
        <p>
          <strong>{t('Lesson 진행:')}</strong> {lessonCompletedMissionCount}/{lessonMissionCount}
        </p>
        <p className="muted">{t('manual 판정 미션: {{count}}', { count: manualMissionCandidatesCount })}</p>
      </div>
      <div className={`vm-runtime-badge ${getMetricBadgeClass(vmStatus)}`}>
        <span>{t('VM 상태: {{vmStatus}}', { vmStatus })}</span>
        <span>{vmStatusText}</span>
      </div>
    </section>
  );
}
