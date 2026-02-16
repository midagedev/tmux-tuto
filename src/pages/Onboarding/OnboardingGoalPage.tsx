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
    title: '업무용 기초 빨리 익히기',
    description: '세션/윈도우/패인 필수 조작을 짧은 미션으로 먼저 익힙니다.',
  },
  {
    value: 'shortcut-review',
    title: '단축키 복습 중심',
    description: '자주 까먹는 이동/전환 단축키를 빠르게 재학습합니다.',
  },
  {
    value: 'advanced-routine',
    title: '고급 루틴까지 완주',
    description: 'command-mode와 장시간 작업 루틴까지 확장합니다.',
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

  return (
    <PagePlaceholder
      eyebrow="Onboarding"
      title="학습 목표 선택"
      description="당신의 현재 목적에 맞춰 추천 트랙과 플레이북을 결정합니다."
    >
      <div className="onboarding-layout">
        {GOAL_OPTIONS.map((option) => {
          const selected = goal === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={selected ? 'onboarding-choice selected' : 'onboarding-choice'}
              onClick={() => setGoal(option.value)}
              aria-pressed={selected}
            >
              <strong>{option.title}</strong>
              <p>{option.description}</p>
            </button>
          );
        })}
      </div>

      <div className="inline-actions">
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            if (!goal) {
              return;
            }
            navigate('/onboarding/preferences');
          }}
          disabled={!goal}
        >
          입력 선호 설정으로 이동
        </button>
        <button type="button" className="secondary-btn" onClick={() => navigate('/onboarding/start')}>
          이전 단계
        </button>
      </div>
    </PagePlaceholder>
  );
}
