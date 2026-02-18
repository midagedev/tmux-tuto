import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import type { OnboardingGoal } from '../../features/onboarding/onboardingStore';
import { useOnboardingStore } from '../../features/onboarding/onboardingStore';
const GOAL_OPTIONS: Array<{
    value: OnboardingGoal;
    title: string;
    description: string;
}> = [
    {
        value: 'fast-foundations',
        title: __tx("\uC5C5\uBB34\uC6A9 \uAE30\uCD08 \uBE68\uB9AC \uC775\uD788\uAE30"),
        description: __tx("\uC138\uC158/\uC708\uB3C4\uC6B0/\uD328\uC778 \uD544\uC218 \uC870\uC791\uC744 \uC9E7\uC740 \uBBF8\uC158\uC73C\uB85C \uBA3C\uC800 \uC775\uD799\uB2C8\uB2E4."),
    },
    {
        value: 'shortcut-review',
        title: __tx("\uB2E8\uCD95\uD0A4 \uBCF5\uC2B5 \uC911\uC2EC"),
        description: __tx("\uC790\uC8FC \uAE4C\uBA39\uB294 \uC774\uB3D9/\uC804\uD658 \uB2E8\uCD95\uD0A4\uB97C \uBE60\uB974\uAC8C \uC7AC\uD559\uC2B5\uD569\uB2C8\uB2E4."),
    },
    {
        value: 'advanced-routine',
        title: __tx("\uACE0\uAE09 \uB8E8\uD2F4\uAE4C\uC9C0 \uC644\uC8FC"),
        description: __tx("command-mode\uC640 \uC7A5\uC2DC\uAC04 \uC791\uC5C5 \uB8E8\uD2F4\uAE4C\uC9C0 \uD655\uC7A5\uD569\uB2C8\uB2E4."),
    },
];
export function OnboardingGoalPage() {
    const navigate = useNavigate();
    const startedAt = useOnboardingStore((store) => store.startedAt);
    const goal = useOnboardingStore((store) => store.goal);
    const setGoal = useOnboardingStore((store) => store.setGoal);
    useEffect(() => {
        if (!startedAt) {
            navigate('/onboarding/start', { replace: true });
        }
    }, [navigate, startedAt]);
    return (<PagePlaceholder eyebrow="Onboarding" title={__tx("\uD559\uC2B5 \uBAA9\uD45C \uC120\uD0DD")} description={__tx("\uB2F9\uC2E0\uC758 \uD604\uC7AC \uBAA9\uC801\uC5D0 \uB9DE\uCDB0 \uCD94\uCC9C \uD2B8\uB799\uACFC \uD50C\uB808\uC774\uBD81\uC744 \uACB0\uC815\uD569\uB2C8\uB2E4.")}>
      <div className="onboarding-layout">
        {GOAL_OPTIONS.map((option) => {
            const selected = goal === option.value;
            return (<button key={option.value} type="button" className={selected ? 'onboarding-choice selected' : 'onboarding-choice'} onClick={() => setGoal(option.value)} aria-pressed={selected}>
              <strong>{option.title}</strong>
              <p>{option.description}</p>
            </button>);
        })}
      </div>

      <div className="inline-actions">
        <button type="button" className="primary-btn" onClick={() => {
            if (!goal) {
                return;
            }
            navigate('/onboarding/preferences');
        }} disabled={!goal}>
          입력 선호 설정으로 이동
        </button>
        <button type="button" className="secondary-btn" onClick={() => navigate('/onboarding/start')}>
          이전 단계
        </button>
      </div>
    </PagePlaceholder>);
}
