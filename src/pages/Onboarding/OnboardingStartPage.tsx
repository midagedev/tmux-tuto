import { useNavigate } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useOnboardingStore } from '../../features/onboarding/onboardingStore';
export function OnboardingStartPage() {
    const navigate = useNavigate();
    const startedAt = useOnboardingStore((store) => store.startedAt);
    const completedAt = useOnboardingStore((store) => store.completedAt);
    const startOnboarding = useOnboardingStore((store) => store.startOnboarding);
    return (<PagePlaceholder eyebrow="Onboarding" title={__tx("\uC2E4\uC2B5 \uC911\uC2EC tmux \uC628\uBCF4\uB529")} description={__tx("3\uBD84 \uC548\uC5D0 \uCCAB \uD328\uC778 \uBD84\uD560\uC744 \uC644\uB8CC\uD558\uACE0, \uAC1C\uC778\uD654\uB41C \uD2B8\uB799 \uCD94\uCC9C\uAE4C\uC9C0 \uC5F0\uACB0\uD569\uB2C8\uB2E4.")}>
      <div className="onboarding-layout">
        <section className="onboarding-card">
          <h2>{__tx("\uC774 \uC0AC\uC774\uD2B8\uAC00 \uD574\uC8FC\uB294 \uAC83")}</h2>
          <ul className="link-list">
            <li>{__tx("\uCEE4\uB9AC\uD058\uB7FC \uAE30\uBC18 tmux \uC2E4\uC2B5 (Track A~C)")}</li>
            <li>{__tx("\uACE0\uCDA9\uC2E4\uB3C4 tmux \uC2DC\uBBAC\uB808\uC774\uD130 \uC2E4\uC2B5")}</li>
            <li>{__tx("\uB2E8\uCD95\uD0A4 \uAC80\uC0C9, \uBD81\uB9C8\uD06C, \uC9C4\uD589\uB3C4 \uCD94\uC801")}</li>
          </ul>
        </section>

        <section className="onboarding-card">
          <h2>{__tx("\uD574\uC8FC\uC9C0 \uC54A\uB294 \uAC83")}</h2>
          <ul className="link-list">
            <li>{__tx("\uC2E4\uC81C \uC11C\uBC84/\uC178 \uD504\uB85C\uC138\uC2A4 \uC2E4\uD589")}</li>
            <li>{__tx("\uACC4\uC815 \uAE30\uBC18 \uD074\uB77C\uC6B0\uB4DC \uB3D9\uAE30\uD654")}</li>
            <li>{__tx("\uBC31\uC5D4\uB4DC \uB85C\uADF8 \uC218\uC9D1")}</li>
          </ul>
          <p className="muted">
            실제 tmux와의 차이는 실습 화면의 <strong>SIMULATED</strong> 안내에서 항상 확인할 수 있습니다.
          </p>
        </section>
      </div>

      <div className="inline-actions">
        <button type="button" className="primary-btn" onClick={() => {
            startOnboarding();
            navigate('/onboarding/goal');
        }}>
          온보딩 시작
        </button>
        <button type="button" className="secondary-btn" onClick={() => navigate('/learn')}>
          바로 커리큘럼 보기
        </button>
      </div>

      <p className="muted">
        시작 상태: {startedAt ? __tx("\uC9C4\uD589 \uC911") : __tx("\uBBF8\uC2DC\uC791")}{__tx("| \uC644\uB8CC \uC0C1\uD0DC:")}{' '}
        {completedAt ? __tx("\uC644\uB8CC\uB428") : __tx("\uBBF8\uC644\uB8CC")}
      </p>
    </PagePlaceholder>);
}
