import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';

export function OnboardingFirstMissionPassedPage() {
  return (
    <PagePlaceholder
      eyebrow="Onboarding"
      title="첫 미션 완료"
      description="온보딩 첫 미션 통과(분석 라우트) 후 완료 화면으로 이동합니다."
    >
      <Link to="/onboarding/done" className="primary-btn">
        온보딩 완료
      </Link>
    </PagePlaceholder>
  );
}
