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
            <li>{__tx("\uBBF8\uC158:")}{missionSlug}</li>
            <li>{__tx("\uD68D\uB4DD XP: +")}{gainedXp}</li>
          </ul>
          <p className="muted">{__tx("\uC774 \uD398\uC774\uC9C0\uB294 Cloudflare \uBD84\uC11D\uC5D0\uC11C \uC628\uBCF4\uB529 \uCCAB \uC131\uACF5 \uC774\uBCA4\uD2B8 \uB77C\uC6B0\uD2B8\uB85C \uC0AC\uC6A9\uB429\uB2C8\uB2E4.")}</p>
        </section>
      </div>

      <div className="inline-actions">
        <Link to="/onboarding/done" className="primary-btn">{__tx("\uC628\uBCF4\uB529 \uC644\uB8CC \uD654\uBA74\uC73C\uB85C")}</Link>
        <Link to="/practice" className="secondary-btn">{__tx("\uC5F0\uC2B5 \uACC4\uC18D\uD558\uAE30")}</Link>
      </div>
    </PagePlaceholder>);
}
