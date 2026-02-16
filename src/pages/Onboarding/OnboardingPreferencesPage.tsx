import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';

export function OnboardingPreferencesPage() {
  return (
    <PagePlaceholder
      eyebrow="Onboarding"
      title="입력/환경 선호 설정"
      description="prefix(`Ctrl+b`/`Ctrl+a`)와 키보드 환경을 선택합니다."
    >
      <Link to="/onboarding/first-mission" className="primary-btn">
        첫 미션 시작
      </Link>
    </PagePlaceholder>
  );
}
