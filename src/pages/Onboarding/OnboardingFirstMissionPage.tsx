import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';

export function OnboardingFirstMissionPage() {
  return (
    <PagePlaceholder
      eyebrow="Onboarding"
      title="첫 미션"
      description="2~3분짜리 미니 미션을 수행하고 성공 라우트로 이동합니다."
    >
      <Link to="/onboarding/first-mission/passed" className="primary-btn">
        미션 통과 처리
      </Link>
    </PagePlaceholder>
  );
}
