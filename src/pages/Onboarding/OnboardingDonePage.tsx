import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppContent } from '../../features/curriculum/contentSchema';
import { getGoalLabel, getRecommendationByGoal, } from '../../features/onboarding/recommendations';
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
    const recommendedTrackTitle = content?.tracks.find((track) => track.slug === recommendation.trackSlug)?.title ??
        recommendation.trackSlug;
    const recommendedPlaybookTitle = content?.playbooks.find((playbook) => playbook.slug === recommendation.playbookSlug)?.title ??
        recommendation.playbookSlug;
    return (<PagePlaceholder eyebrow="Onboarding" title={__tx("\uC628\uBCF4\uB529 \uC644\uB8CC")} description={__tx("\uCCAB \uC2E4\uC2B5\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC9C0\uAE08 \uBC14\uB85C \uC624\uB298 \uD560 1\uAC1C \uBBF8\uC158\uC744 \uC2DC\uC791\uD558\uC138\uC694.")}>
      <div className="onboarding-layout">
        <section className="onboarding-card">
          <h2>{__tx("\uC124\uC815 \uC694\uC57D")}</h2>
          <ul className="link-list">
            <li>목표: {goal ? getGoalLabel(goal) : __tx("\uC5C5\uBB34\uC6A9 \uAE30\uCD08 \uBE68\uB9AC \uC775\uD788\uAE30")}</li>
            <li>Prefix: {prefixKey}</li>
            <li>키보드: {keyboardLayout === 'mac' ? 'Mac' : 'Windows/Linux'}</li>
          </ul>
        </section>

        <section className="onboarding-card">
          <h2>{__tx("\uAC1C\uC778\uD654 \uCD94\uCC9C")}</h2>
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
    </PagePlaceholder>);
}
