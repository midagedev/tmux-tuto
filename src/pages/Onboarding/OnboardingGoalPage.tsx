import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';

export function OnboardingGoalPage() {
  return (
    <PagePlaceholder
      eyebrow="Onboarding"
      title="학습 목표 선택"
      description="업무형 기초/복습 중심/완주 목표 중 하나를 선택합니다."
    >
      <Link to="/onboarding/preferences" className="primary-btn">
        입력 선호 설정으로 이동
      </Link>
    </PagePlaceholder>
  );
}
