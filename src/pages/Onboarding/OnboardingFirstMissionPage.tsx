import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { EmptyState } from '../../components/system/EmptyState';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppMission } from '../../features/curriculum/contentSchema';
import { getHintForMission, getLiveHintForMission } from '../../features/grading/hintEngine';
import { evaluateMission } from '../../features/grading/ruleEngine';
import { useOnboardingStore } from '../../features/onboarding/onboardingStore';
import { useProgressStore } from '../../features/progress/progressStore';
import { getActiveWindow } from '../../features/simulator/model';
import { useSimulatorStore } from '../../features/simulator/simulatorStore';

export function OnboardingFirstMissionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mission, setMission] = useState<AppMission | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxHintLevelUsed, setMaxHintLevelUsed] = useState<0 | 1 | 2 | 3>(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const startedAt = useOnboardingStore((store) => store.startedAt);
  const goal = useOnboardingStore((store) => store.goal);
  const prefixKey = useOnboardingStore((store) => store.prefixKey);
  const markFirstMissionPassed = useOnboardingStore((store) => store.markFirstMissionPassed);
  const simulatorState = useSimulatorStore((store) => store.state);
  const handleKeyInput = useSimulatorStore((store) => store.handleKeyInput);
  const resetSimulator = useSimulatorStore((store) => store.reset);
  const initMissionScenario = useSimulatorStore((store) => store.initMissionScenario);
  const setSimulatorPrefix = useSimulatorStore((store) => store.setPrefixKey);
  const recordMissionPass = useProgressStore((store) => store.recordMissionPass);

  useEffect(() => {
    if (!startedAt) {
      navigate('/onboarding/start', { replace: true });
      return;
    }

    if (!goal) {
      navigate('/onboarding/goal', { replace: true });
    }
  }, [goal, navigate, startedAt]);

  useEffect(() => {
    loadAppContent()
      .then((content) => {
        const firstMission = content.missions.find((item) => item.slug === 'split-two-panes') ?? null;
        setMission(firstMission);
      })
      .catch(() => setMission(null));
  }, []);

  useEffect(() => {
    if (mission) {
      initMissionScenario(mission);
    } else {
      resetSimulator();
    }
    setSimulatorPrefix(prefixKey);
  }, [initMissionScenario, mission, prefixKey, resetSimulator, setSimulatorPrefix]);

  const activeWindow = useMemo(() => getActiveWindow(simulatorState), [simulatorState]);
  const liveGrade = useMemo(
    () => (mission ? evaluateMission(simulatorState, mission) : null),
    [mission, simulatorState],
  );
  const liveHint = useMemo(
    () => (mission && liveGrade ? getLiveHintForMission(mission, liveGrade) : null),
    [liveGrade, mission],
  );

  const sendPrefixKey = (key: string) => {
    handleKeyInput(prefixKey);
    handleKeyInput(key);
  };

  const handleCheck = () => {
    if (!mission) {
      return;
    }

    const grade = evaluateMission(simulatorState, mission);
    if (grade.passed) {
      const gainedXp = recordMissionPass({
        missionSlug: mission.slug,
        difficulty: mission.difficulty,
        hintLevel: maxHintLevelUsed,
        attemptNumber: Math.max(1, attemptCount + 1),
      });
      markFirstMissionPassed();
      navigate(`/onboarding/first-mission/passed?missionSlug=${mission.slug}&xp=${gainedXp}`);
      return;
    }

    const nextAttempt = attemptCount + 1;
    setAttemptCount(nextAttempt);
    const hint = getHintForMission(mission, grade, nextAttempt);
    setMaxHintLevelUsed((prev) => (hint.hintLevel > prev ? hint.hintLevel : prev));
    setHintText(hint.hintText);
    setFeedback(grade.failedRules[0]?.reason ?? t('조건을 충족하지 못했습니다.'));
  };

  return (
    <PagePlaceholder
      eyebrow={t('Onboarding')}
      title={t('첫 실습: 패인 2개 만들기')}
      description={t('2~3분짜리 미션입니다. 분할 후 제출하면 즉시 통과 여부를 확인합니다.')}
    >
      {!mission ? (
        <EmptyState
          title={t('미션 로드 실패')}
          description={t('초기 미션 데이터를 찾지 못했습니다. 홈으로 이동 후 다시 시도해 주세요.')}
        />
      ) : (
        <div className="sim-panel">
          <section className="onboarding-card">
            <h2>{t('목표')}</h2>
            <ul className="link-list">
              <li>{t('현재 윈도우에서 pane 수를 2개 이상으로 만든다.')}</li>
              <li>{t('완료 후 제출 버튼으로 채점한다.')}</li>
            </ul>
            <p className="muted">
              {t('현재 상태: pane {{paneCount}}개 / mode {{mode}}', {
                paneCount: activeWindow.panes.length,
                mode: simulatorState.mode.value,
              })}
            </p>
          </section>

          <section className="onboarding-card" aria-live="polite">
            <h2>{t('실시간 힌트')}</h2>
            <p className="page-description">{liveHint?.hintText ?? t('현재 상태를 분석 중입니다.')}</p>
          </section>

          <div className="inline-actions">
            <button type="button" className="secondary-btn" onClick={() => sendPrefixKey('%')}>
              {t('Prefix + % (세로 분할)')}
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixKey('"')}>
              {t('Prefix + " (가로 분할)')}
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixKey('h')}>
              {t('Prefix + h (패인 이동)')}
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                if (mission) {
                  initMissionScenario(mission);
                } else {
                  resetSimulator();
                }
                setSimulatorPrefix(prefixKey);
                setFeedback(null);
                setHintText(null);
                setAttemptCount(0);
                setMaxHintLevelUsed(0);
              }}
            >
              {t('미션 상태 초기화')}
            </button>
          </div>

          <section className="onboarding-card">
            <h2>{t('현재 패인')}</h2>
            <ul className="link-list">
              {activeWindow.panes.map((pane) => (
                <li key={pane.id}>
                  {pane.id === activeWindow.activePaneId ? '● ' : ''}
                  {pane.id} ({pane.width}x{pane.height})
                </li>
              ))}
            </ul>
          </section>

          {feedback ? (
            <section className="onboarding-card">
              <h2>{t('실패 피드백')}</h2>
              <p className="page-description">{feedback}</p>
              {hintText ? (
                <p className="muted">
                  {t('힌트 Lv.{{level}}: {{hint}}', { level: maxHintLevelUsed, hint: hintText })}
                </p>
              ) : null}
            </section>
          ) : null}

          <div className="inline-actions">
            <button type="button" className="primary-btn" onClick={handleCheck}>
              {t('제출하고 채점하기')}
            </button>
            <Link to="/onboarding/preferences" className="secondary-btn">
              {t('이전 단계')}
            </Link>
          </div>
        </div>
      )}
    </PagePlaceholder>
  );
}
