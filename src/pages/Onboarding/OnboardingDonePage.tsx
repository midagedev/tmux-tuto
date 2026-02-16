import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';

export function OnboardingDonePage() {
  return (
    <PagePlaceholder
      eyebrow="Onboarding"
      title="온보딩 완료"
      description="추천 트랙과 플레이북을 확인하고 학습을 시작합니다."
    >
      <div className="inline-actions">
        <Link to="/learn" className="primary-btn">
          Track 시작
        </Link>
        <Link to="/playbooks" className="secondary-btn">
          플레이북 보기
        </Link>
      </div>
    </PagePlaceholder>
  );
}
