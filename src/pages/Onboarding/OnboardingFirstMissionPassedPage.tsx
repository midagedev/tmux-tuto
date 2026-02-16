import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useOnboardingStore } from '../../features/onboarding/onboardingStore';

export function OnboardingFirstMissionPassedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const firstMissionPassedAt = useOnboardingStore((store) => store.firstMissionPassedAt);
  const missionSlug = searchParams.get('missionSlug') ?? 'split-two-panes';
  const gainedXp = searchParams.get('xp') ?? '0';

  useEffect(() => {
    if (!firstMissionPassedAt) {
      navigate('/onboarding/first-mission', { replace: true });
    }
  }, [firstMissionPassedAt, navigate]);

  return (
    <PagePlaceholder
      eyebrow="Onboarding"
      title="첫 미션 완료"
      description="첫 미션 통과가 기록되었습니다. 추천 트랙으로 바로 이어서 학습하세요."
    >
      <div className="onboarding-layout">
        <section className="onboarding-card">
          <h2>통과 요약</h2>
          <ul className="link-list">
            <li>미션: {missionSlug}</li>
            <li>획득 XP: +{gainedXp}</li>
          </ul>
          <p className="muted">
            이 페이지는 Cloudflare 분석에서 온보딩 첫 성공 이벤트 라우트로 사용됩니다.
          </p>
        </section>
      </div>

      <div className="inline-actions">
        <Link to="/onboarding/done" className="primary-btn">
          온보딩 완료 화면으로
        </Link>
        <Link to="/practice" className="secondary-btn">
          연습 계속하기
        </Link>
      </div>
    </PagePlaceholder>
  );
}
