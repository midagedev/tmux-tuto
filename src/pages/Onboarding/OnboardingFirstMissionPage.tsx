import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
        }
        else {
            resetSimulator();
        }
        setSimulatorPrefix(prefixKey);
    }, [initMissionScenario, mission, prefixKey, resetSimulator, setSimulatorPrefix]);
    const activeWindow = useMemo(() => getActiveWindow(simulatorState), [simulatorState]);
    const liveGrade = useMemo(() => (mission ? evaluateMission(simulatorState, mission) : null), [mission, simulatorState]);
    const liveHint = useMemo(() => (mission && liveGrade ? getLiveHintForMission(mission, liveGrade) : null), [liveGrade, mission]);
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
        setFeedback(grade.failedRules[0]?.reason ?? __tx("\uC870\uAC74\uC744 \uCDA9\uC871\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
    };
    return (<PagePlaceholder eyebrow="Onboarding" title={__tx("\uCCAB \uC2E4\uC2B5: \uD328\uC778 2\uAC1C \uB9CC\uB4E4\uAE30")} description={__tx("2~3\uBD84\uC9DC\uB9AC \uBBF8\uC158\uC785\uB2C8\uB2E4. \uBD84\uD560 \uD6C4 \uC81C\uCD9C\uD558\uBA74 \uC989\uC2DC \uD1B5\uACFC \uC5EC\uBD80\uB97C \uD655\uC778\uD569\uB2C8\uB2E4.")}>
      {!mission ? (<EmptyState title={__tx("\uBBF8\uC158 \uB85C\uB4DC \uC2E4\uD328")} description={__tx("\uCD08\uAE30 \uBBF8\uC158 \uB370\uC774\uD130\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uD648\uC73C\uB85C \uC774\uB3D9 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.")}/>) : (<div className="sim-panel">
          <section className="onboarding-card">
            <h2>{__tx("\uBAA9\uD45C")}</h2>
            <ul className="link-list">
              <li>{__tx("\uD604\uC7AC \uC708\uB3C4\uC6B0\uC5D0\uC11C pane \uC218\uB97C 2\uAC1C \uC774\uC0C1\uC73C\uB85C \uB9CC\uB4E0\uB2E4.")}</li>
              <li>{__tx("\uC644\uB8CC \uD6C4 \uC81C\uCD9C \uBC84\uD2BC\uC73C\uB85C \uCC44\uC810\uD55C\uB2E4.")}</li>
            </ul>
            <p className="muted">
              현재 상태: pane {activeWindow.panes.length}개 / mode {simulatorState.mode.value}
            </p>
          </section>

          <section className="onboarding-card" aria-live="polite">
            <h2>{__tx("\uC2E4\uC2DC\uAC04 \uD78C\uD2B8")}</h2>
            <p className="page-description">{liveHint?.hintText ?? __tx("\uD604\uC7AC \uC0C1\uD0DC\uB97C \uBD84\uC11D \uC911\uC785\uB2C8\uB2E4.")}</p>
          </section>

          <div className="inline-actions">
            <button type="button" className="secondary-btn" onClick={() => sendPrefixKey('%')}>
              Prefix + % (세로 분할)
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixKey('"')}>
              Prefix + " (가로 분할)
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixKey('h')}>
              Prefix + h (패인 이동)
            </button>
            <button type="button" className="secondary-btn" onClick={() => {
                if (mission) {
                    initMissionScenario(mission);
                }
                else {
                    resetSimulator();
                }
                setSimulatorPrefix(prefixKey);
                setFeedback(null);
                setHintText(null);
                setAttemptCount(0);
                setMaxHintLevelUsed(0);
            }}>
              미션 상태 초기화
            </button>
          </div>

          <section className="onboarding-card">
            <h2>{__tx("\uD604\uC7AC \uD328\uC778")}</h2>
            <ul className="link-list">
              {activeWindow.panes.map((pane) => (<li key={pane.id}>
                  {pane.id === activeWindow.activePaneId ? '● ' : ''}
                  {pane.id} ({pane.width}x{pane.height})
                </li>))}
            </ul>
          </section>

          {feedback ? (<section className="onboarding-card">
              <h2>{__tx("\uC2E4\uD328 \uD53C\uB4DC\uBC31")}</h2>
              <p className="page-description">{feedback}</p>
              {hintText ? (<p className="muted">{__tx("\uD78C\uD2B8 Lv.")}{maxHintLevelUsed}: {hintText}
                </p>) : null}
            </section>) : null}

          <div className="inline-actions">
            <button type="button" className="primary-btn" onClick={handleCheck}>
              제출하고 채점하기
            </button>
            <Link to="/onboarding/preferences" className="secondary-btn">
              이전 단계
            </Link>
          </div>
        </div>)}
    </PagePlaceholder>);
}
