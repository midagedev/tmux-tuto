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
    return (<PagePlaceholder eyebrow="Onboarding" title={__tx("\uCCAB \uBBF8\uC158 \uC644\uB8CC")} description={__tx("\uCCAB \uBBF8\uC158 \uD1B5\uACFC\uAC00 \uAE30\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uCD94\uCC9C \uD2B8\uB799\uC73C\uB85C \uBC14\uB85C \uC774\uC5B4\uC11C \uD559\uC2B5\uD558\uC138\uC694.")}>
      <div className="onboarding-layout">
        <section className="onboarding-card">
          <h2>{__tx("\uD1B5\uACFC \uC694\uC57D")}</h2>
          <ul className="link-list">
            <li>미션: {missionSlug}</li>
            <li>{__tx("\uD68D\uB4DD XP: +")}{gainedXp}</li>
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
    </PagePlaceholder>);
}
