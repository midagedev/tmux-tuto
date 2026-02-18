import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import type { KeyboardLayout } from '../../features/onboarding/onboardingStore';
import { useOnboardingStore } from '../../features/onboarding/onboardingStore';
import { useSimulatorStore } from '../../features/simulator/simulatorStore';
export function OnboardingPreferencesPage() {
    const navigate = useNavigate();
    const startedAt = useOnboardingStore((store) => store.startedAt);
    const goal = useOnboardingStore((store) => store.goal);
    const savedPrefixKey = useOnboardingStore((store) => store.prefixKey);
    const savedKeyboardLayout = useOnboardingStore((store) => store.keyboardLayout);
    const setPreferences = useOnboardingStore((store) => store.setPreferences);
    const setSimulatorPrefix = useSimulatorStore((store) => store.setPrefixKey);
    const [prefixKey, setPrefixKey] = useState<'C-b' | 'C-a'>(savedPrefixKey);
    const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayout>(savedKeyboardLayout);
    useEffect(() => {
        if (!startedAt) {
            navigate('/onboarding/start', { replace: true });
            return;
        }
        if (!goal) {
            navigate('/onboarding/goal', { replace: true });
        }
    }, [goal, navigate, startedAt]);
    return (<PagePlaceholder eyebrow="Onboarding" title={__tx("\uC785\uB825/\uD658\uACBD \uC120\uD638 \uC124\uC815")} description={__tx("prefix\uC640 \uD0A4\uBCF4\uB4DC \uB808\uC774\uC544\uC6C3\uC744 \uB9DE\uCDB0 \uC2E4\uC2B5 \uC785\uB825\uC744 \uC2E4\uC81C \uD658\uACBD\uACFC \uAC00\uAE5D\uAC8C \uB9CC\uB4ED\uB2C8\uB2E4.")}>
      <div className="onboarding-layout">
        <section className="onboarding-card">
          <h2>{__tx("Prefix \uD0A4")}</h2>
          <div className="onboarding-control-group">
            <label className="onboarding-radio">
              <input type="radio" name="prefixKey" value="C-b" checked={prefixKey === 'C-b'} onChange={() => setPrefixKey('C-b')}/>
              <span>
                <strong>{__tx("Ctrl+b (\uAD8C\uC7A5)")}</strong>
                <small>{__tx("tmux \uAE30\uBCF8\uAC12")}</small>
              </span>
            </label>

            <label className="onboarding-radio">
              <input type="radio" name="prefixKey" value="C-a" checked={prefixKey === 'C-a'} onChange={() => setPrefixKey('C-a')}/>
              <span>
                <strong>Ctrl+a</strong>
                <small>{__tx("GNU screen \uD638\uD658 \uC120\uD638 \uC2DC")}</small>
              </span>
            </label>
          </div>
        </section>

        <section className="onboarding-card">
          <h2>{__tx("\uD0A4\uBCF4\uB4DC \uB808\uC774\uC544\uC6C3")}</h2>
          <div className="onboarding-control-group">
            <label className="onboarding-radio">
              <input type="radio" name="keyboardLayout" value="mac" checked={keyboardLayout === 'mac'} onChange={() => setKeyboardLayout('mac')}/>
              <span>
                <strong>Mac</strong>
                <small>{__tx("Option/Command \uD0A4 \uD45C\uAE30 \uAE30\uC900")}</small>
              </span>
            </label>

            <label className="onboarding-radio">
              <input type="radio" name="keyboardLayout" value="windows" checked={keyboardLayout === 'windows'} onChange={() => setKeyboardLayout('windows')}/>
              <span>
                <strong>Windows/Linux</strong>
                <small>{__tx("Ctrl/Alt \uD45C\uAE30 \uAE30\uC900")}</small>
              </span>
            </label>
          </div>
        </section>
      </div>

      <div className="inline-actions">
        <button type="button" className="primary-btn" onClick={() => {
            setPreferences({ prefixKey, keyboardLayout });
            setSimulatorPrefix(prefixKey);
            navigate('/onboarding/first-mission');
        }}>
          첫 미션 시작
        </button>
        <button type="button" className="secondary-btn" onClick={() => navigate('/onboarding/goal')}>
          이전 단계
        </button>
      </div>
    </PagePlaceholder>);
}
