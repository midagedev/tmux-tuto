import { useNavigate } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useOnboardingStore } from '../../features/onboarding/onboardingStore';

export function OnboardingStartPage() {
  const navigate = useNavigate();
  const startedAt = useOnboardingStore((store) => store.startedAt);
  const completedAt = useOnboardingStore((store) => store.completedAt);
  const startOnboarding = useOnboardingStore((store) => store.startOnboarding);

  return (
    <PagePlaceholder
      eyebrow="Onboarding"
      title="실습 중심 tmux 온보딩"
      description="3분 안에 첫 패인 분할을 완료하고, 개인화된 트랙 추천까지 연결합니다."
    >
      <div className="onboarding-layout">
        <section className="onboarding-card">
          <h2>이 사이트가 해주는 것</h2>
          <ul className="link-list">
            <li>커리큘럼 기반 tmux 실습 (Track A~C)</li>
            <li>고충실도 tmux 시뮬레이터 실습</li>
            <li>단축키 검색, 북마크, 진행도 추적</li>
          </ul>
        </section>

        <section className="onboarding-card">
          <h2>해주지 않는 것</h2>
          <ul className="link-list">
            <li>실제 서버/셸 프로세스 실행</li>
            <li>계정 기반 클라우드 동기화</li>
            <li>백엔드 로그 수집</li>
          </ul>
          <p className="muted">
            실제 tmux와의 차이는 실습 화면의 <strong>SIMULATED</strong> 안내에서 항상 확인할 수 있습니다.
          </p>
        </section>
      </div>

      <div className="inline-actions">
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            startOnboarding();
            navigate('/onboarding/goal');
          }}
        >
          온보딩 시작
        </button>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => navigate('/learn')}
        >
          바로 커리큘럼 보기
        </button>
      </div>

      <p className="muted">
        시작 상태: {startedAt ? '진행 중' : '미시작'} | 완료 상태:{' '}
        {completedAt ? '완료됨' : '미완료'}
      </p>
    </PagePlaceholder>
  );
}
