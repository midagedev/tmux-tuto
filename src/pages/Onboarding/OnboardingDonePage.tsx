import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppContent } from '../../features/curriculum/contentSchema';
import {
  getGoalLabel,
  getRecommendationByGoal,
} from '../../features/onboarding/recommendations';
import { useOnboardingStore } from '../../features/onboarding/onboardingStore';

export function OnboardingDonePage() {
  const navigate = useNavigate();
  const [content, setContent] = useState<AppContent | null>(null);
  const goal = useOnboardingStore((store) => store.goal);
  const prefixKey = useOnboardingStore((store) => store.prefixKey);
  const keyboardLayout = useOnboardingStore((store) => store.keyboardLayout);
  const startedAt = useOnboardingStore((store) => store.startedAt);
  const firstMissionPassedAt = useOnboardingStore((store) => store.firstMissionPassedAt);
  const completedAt = useOnboardingStore((store) => store.completedAt);
  const completeOnboarding = useOnboardingStore((store) => store.completeOnboarding);

  useEffect(() => {
    if (!startedAt) {
      navigate('/onboarding/start', { replace: true });
      return;
    }

    if (!firstMissionPassedAt) {
      navigate('/onboarding/first-mission', { replace: true });
    }
  }, [firstMissionPassedAt, navigate, startedAt]);

  useEffect(() => {
    loadAppContent()
      .then((loaded) => setContent(loaded))
      .catch(() => setContent(null));
  }, []);

  useEffect(() => {
    if (firstMissionPassedAt && !completedAt) {
      completeOnboarding();
    }
  }, [completeOnboarding, completedAt, firstMissionPassedAt]);

  const recommendation = useMemo(() => getRecommendationByGoal(goal), [goal]);
  const recommendedTrackTitle =
    content?.tracks.find((track) => track.slug === recommendation.trackSlug)?.title ??
    recommendation.trackSlug;
  const recommendedPlaybookTitle =
    content?.playbooks.find((playbook) => playbook.slug === recommendation.playbookSlug)?.title ??
    recommendation.playbookSlug;

  return (
    <PagePlaceholder
      eyebrow="Onboarding"
      title="온보딩 완료"
      description="첫 실습이 완료되었습니다. 지금 바로 오늘 할 1개 미션을 시작하세요."
    >
      <div className="onboarding-layout">
        <section className="onboarding-card">
          <h2>설정 요약</h2>
          <ul className="link-list">
            <li>목표: {goal ? getGoalLabel(goal) : '업무용 기초 빨리 익히기'}</li>
            <li>Prefix: {prefixKey}</li>
            <li>키보드: {keyboardLayout === 'mac' ? 'Mac' : 'Windows/Linux'}</li>
          </ul>
        </section>

        <section className="onboarding-card">
          <h2>개인화 추천</h2>
          <ul className="link-list">
            <li>
              추천 트랙: <strong>{recommendedTrackTitle}</strong>
              <p className="muted">{recommendation.trackReason}</p>
            </li>
            <li>
              추천 플레이북: <strong>{recommendedPlaybookTitle}</strong>
              <p className="muted">{recommendation.playbookReason}</p>
            </li>
          </ul>
        </section>
      </div>

      <div className="inline-actions">
        <Link to="/learn" className="primary-btn">
          오늘 1개 미션 시작
        </Link>
        <Link to={`/playbooks/${recommendation.playbookSlug}`} className="secondary-btn">
          추천 플레이북 열기
        </Link>
      </div>
    </PagePlaceholder>
  );
}
