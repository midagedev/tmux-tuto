import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';

export function OnboardingStartPage() {
  return (
    <PagePlaceholder
      eyebrow="Onboarding"
      title="시작 안내"
      description="이 제품이 제공하는 범위와 학습 흐름을 안내합니다."
    >
      <Link to="/onboarding/goal" className="primary-btn">
        다음 단계
      </Link>
    </PagePlaceholder>
  );
}
