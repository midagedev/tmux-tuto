import { Link } from 'react-router-dom';
import type { TFunction } from 'i18next';
import type { AppLesson, AppMission } from '../../../features/curriculum/contentSchema';
import type { evaluateMissionWithVmSnapshot } from '../../../features/vm/missionBridge';
import type { MissionPreconditionItem } from '../practiceVmHelpers';
import { getDifficultyLabel, renderHintTextWithTooltips } from '../practiceVmHelpers';

type MissionEvaluation = ReturnType<typeof evaluateMissionWithVmSnapshot>;

type PracticeMissionPanelProps = {
  t: TFunction;
  selectedMission: AppMission | null;
  selectedMissionOrder: number | null;
  lessonMissions: AppMission[];
  selectedMissionCommands: string[];
  selectedMissionPreconditions: MissionPreconditionItem[];
  missionHintPreview: string[];
  hiddenMissionHintCount: number;
  selectedMissionStatus: MissionEvaluation | null;
  selectedMissionCompleted: boolean;
  lessonCompleted: boolean;
  nextIncompleteMission: AppMission | null;
  nextLesson: AppLesson | null;
  lessonCompletedMissionCount: number;
  missionStatusMap: Map<string, MissionEvaluation>;
  selectedMissionSlug: string;
  completedMissionSlugs: string[];
  onCommandSelect: (command: string) => void;
  onManualMissionComplete: () => void;
  onSelectMission: (missionSlug: string) => void;
  onSelectNextLesson: () => void;
};

export function PracticeMissionPanel({
  t,
  selectedMission,
  selectedMissionOrder,
  lessonMissions,
  selectedMissionCommands,
  selectedMissionPreconditions,
  missionHintPreview,
  hiddenMissionHintCount,
  selectedMissionStatus,
  selectedMissionCompleted,
  lessonCompleted,
  nextIncompleteMission,
  nextLesson,
  lessonCompletedMissionCount,
  missionStatusMap,
  selectedMissionSlug,
  completedMissionSlugs,
  onCommandSelect,
  onManualMissionComplete,
  onSelectMission,
  onSelectNextLesson,
}: PracticeMissionPanelProps) {
  return (
    <>
      {selectedMission ? (
        <article className="vm-mission-card vm-mission-priority-card">
          <p className="vm-mission-priority-eyebrow">Priority 1</p>
          <h2>
            {t('현재 미션')}
            {selectedMissionOrder ? ` ${selectedMissionOrder}/${lessonMissions.length}` : ''}
          </h2>
          <p className="muted">
            {t(selectedMission.title)} · {t('난이도')} {getDifficultyLabel(t, selectedMission.difficulty)}
          </p>

          <section className="vm-mission-command-block">
            <h3>{t('이 미션에서 입력할 명령')}</h3>
            {selectedMissionCommands.length > 0 ? (
              <div className="vm-mission-command-list">
                {selectedMissionCommands.map((command) => (
                  <button
                    key={command}
                    type="button"
                    className="vm-mission-command-chip"
                    onClick={() => {
                      onCommandSelect(command);
                    }}
                  >
                    <code>{command}</code>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">{t('추천 명령을 찾지 못했습니다. 아래 힌트를 기준으로 직접 입력해 주세요.')}</p>
            )}
            <p className="muted">{t('명령을 클릭하면 입력창에 채워지고 터미널 탭으로 전환됩니다.')}</p>
          </section>

          <section className="vm-mission-precondition-block">
            <h3>{t('실행 전 프리컨디션')}</h3>
            <ul className="vm-precondition-list">
              {selectedMissionPreconditions.map((item) => (
                <li key={item.key} className={`vm-precondition-row ${item.satisfied ? 'is-satisfied' : 'is-pending'}`}>
                  <span>{item.label}</span>
                  <small>{item.current}</small>
                </li>
              ))}
            </ul>
          </section>

          <ul className="link-list">
            {missionHintPreview.map((hint, index) => (
              <li key={hint}>{renderHintTextWithTooltips(t(hint), `hint-preview-${index}`, t)}</li>
            ))}
          </ul>
          {hiddenMissionHintCount > 0 ? (
            <details className="vm-mission-hints-more">
              <summary>{t('힌트 {{count}}개 더 보기', { count: hiddenMissionHintCount })}</summary>
              <ul className="link-list">
                {selectedMission.hints.slice(missionHintPreview.length).map((hint, index) => (
                  <li key={hint}>{renderHintTextWithTooltips(t(hint), `hint-more-${index}`, t)}</li>
                ))}
              </ul>
            </details>
          ) : null}
          {selectedMissionStatus ? (
            <div className="vm-mission-status">
              <p>
                <strong>{t('판정:')}</strong> {selectedMissionStatus.status} · {t(selectedMissionStatus.reason)}
              </p>
              {selectedMissionStatus.status === 'manual' ? (
                <button type="button" className="secondary-btn" onClick={onManualMissionComplete}>
                  {t('수동 완료 처리')}
                </button>
              ) : null}
            </div>
          ) : null}
          {selectedMissionCompleted ? (
            <section className="vm-next-action-card" aria-live="polite">
              <p className="vm-next-action-eyebrow">{t('추천 다음 단계')}</p>
              {nextIncompleteMission ? (
                <>
                  <h2>{t('다음 미션 진행')}</h2>
                  <p>{t('방금 완료한 흐름을 이어서 바로 진행할 수 있습니다.')}</p>
                  <button type="button" className="primary-btn vm-next-action-btn" onClick={() => onSelectMission(nextIncompleteMission.slug)}>
                    {t('다음 미션')}
                  </button>
                  <p className="vm-next-action-meta">{t('다음: {{title}}', { title: nextIncompleteMission.title })}</p>
                </>
              ) : null}
              {!nextIncompleteMission && lessonCompleted && nextLesson ? (
                <>
                  <h2>{t('다음 레슨 진행')}</h2>
                  <p>{t('현재 레슨을 모두 완료했습니다. 바로 다음 레슨으로 이동하세요.')}</p>
                  <button type="button" className="primary-btn vm-next-action-btn" onClick={onSelectNextLesson}>
                    {t('다음 레슨')}
                  </button>
                  <p className="vm-next-action-meta">{t('다음: {{title}}', { title: nextLesson.title })}</p>
                </>
              ) : null}
              {!nextIncompleteMission && lessonCompleted && !nextLesson ? (
                <>
                  <h2>{t('학습 경로 완료')}</h2>
                  <p>{t('모든 레슨을 마쳤습니다. 완료 현황에서 진행률과 업적을 확인하세요.')}</p>
                  <Link className="primary-btn vm-next-action-btn" to="/progress">
                    {t('완료 현황')}
                  </Link>
                </>
              ) : null}
            </section>
          ) : null}
        </article>
      ) : null}

      <section className="vm-mission-list-card">
        <div className="vm-mission-list-header">
          <h2>{t('미션 {{completed}}/{{total}}', { completed: lessonCompletedMissionCount, total: lessonMissions.length })}</h2>
          <span className="vm-mission-list-action">
            {selectedMission && selectedMissionCompleted && nextIncompleteMission ? (
              <button type="button" className="primary-btn vm-next-action-btn" onClick={() => onSelectMission(nextIncompleteMission.slug)}>
                {t('다음 미션')}
              </button>
            ) : null}
            {selectedMission && selectedMissionCompleted && !nextIncompleteMission && lessonCompleted && nextLesson ? (
              <button type="button" className="primary-btn vm-next-action-btn" onClick={onSelectNextLesson}>
                {t('다음 레슨')}
              </button>
            ) : null}
            {selectedMission && selectedMissionCompleted && !nextIncompleteMission && lessonCompleted && !nextLesson ? (
              <Link className="primary-btn vm-next-action-btn" to="/progress">
                {t('완료 현황')}
              </Link>
            ) : null}
            {selectedMission && !selectedMissionCompleted && selectedMissionStatus?.status === 'manual' ? (
              <button type="button" className="secondary-btn vm-next-action-btn" onClick={onManualMissionComplete}>
                {t('수동 완료')}
              </button>
            ) : null}
          </span>
        </div>
        {selectedMissionStatus ? (
          <p className="vm-mission-list-status">
            {t('판정:')} {selectedMissionStatus.status} · {t(selectedMissionStatus.reason)}
          </p>
        ) : null}
        <div className="vm-mission-list">
          {lessonMissions.map((mission, index) => {
            const missionStatus = missionStatusMap.get(mission.slug);
            const isSelected = mission.slug === selectedMissionSlug;
            const isCompleted = completedMissionSlugs.includes(mission.slug);

            let badgeClass = 'is-pending';
            let badgeLabel = t('대기');

            if (isCompleted) {
              badgeClass = 'is-complete';
              badgeLabel = t('완료');
            } else if (missionStatus?.status === 'complete') {
              badgeClass = 'is-live-complete';
              badgeLabel = t('실시간 통과');
            } else if (missionStatus?.status === 'manual') {
              badgeClass = 'is-manual';
              badgeLabel = t('수동');
            }

            return (
              <button
                key={mission.id}
                type="button"
                className={`vm-mission-row ${isSelected ? 'is-active' : ''}`}
                onClick={() => onSelectMission(mission.slug)}
              >
                <span className="vm-mission-row-main">
                  <strong>
                    {index + 1}. {t(mission.title)}
                  </strong>
                  <small>
                    {t('난이도')} {getDifficultyLabel(t, mission.difficulty)}
                  </small>
                </span>
                <span className={`vm-mission-row-badge ${badgeClass}`}>{badgeLabel}</span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
