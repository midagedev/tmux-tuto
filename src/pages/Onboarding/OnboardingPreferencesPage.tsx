import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import type { KeyboardLayout } from '../../features/onboarding/onboardingStore';
import { useOnboardingStore } from '../../features/onboarding/onboardingStore';
import { useSimulatorStore } from '../../features/simulator/simulatorStore';

export function OnboardingPreferencesPage() {
  const { t } = useTranslation();
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

  return (
    <PagePlaceholder
      eyebrow={t('Onboarding')}
      title={t('입력/환경 선호 설정')}
      description={t('prefix와 키보드 레이아웃을 맞춰 실습 입력을 실제 환경과 가깝게 만듭니다.')}
    >
      <div className="onboarding-layout">
        <section className="onboarding-card">
          <h2>{t('Prefix 키')}</h2>
          <div className="onboarding-control-group">
            <label className="onboarding-radio">
              <input
                type="radio"
                name="prefixKey"
                value="C-b"
                checked={prefixKey === 'C-b'}
                onChange={() => setPrefixKey('C-b')}
              />
              <span>
                <strong>{t('Ctrl+b (권장)')}</strong>
                <small>{t('tmux 기본값')}</small>
              </span>
            </label>

            <label className="onboarding-radio">
              <input
                type="radio"
                name="prefixKey"
                value="C-a"
                checked={prefixKey === 'C-a'}
                onChange={() => setPrefixKey('C-a')}
              />
              <span>
                <strong>Ctrl+a</strong>
                <small>{t('GNU screen 호환 선호 시')}</small>
              </span>
            </label>
          </div>
        </section>

        <section className="onboarding-card">
          <h2>{t('키보드 레이아웃')}</h2>
          <div className="onboarding-control-group">
            <label className="onboarding-radio">
              <input
                type="radio"
                name="keyboardLayout"
                value="mac"
                checked={keyboardLayout === 'mac'}
                onChange={() => setKeyboardLayout('mac')}
              />
              <span>
                <strong>Mac</strong>
                <small>{t('Option/Command 키 표기 기준')}</small>
              </span>
            </label>

            <label className="onboarding-radio">
              <input
                type="radio"
                name="keyboardLayout"
                value="windows"
                checked={keyboardLayout === 'windows'}
                onChange={() => setKeyboardLayout('windows')}
              />
              <span>
                <strong>Windows/Linux</strong>
                <small>{t('Ctrl/Alt 표기 기준')}</small>
              </span>
            </label>
          </div>
        </section>
      </div>

      <div className="inline-actions">
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            setPreferences({ prefixKey, keyboardLayout });
            setSimulatorPrefix(prefixKey);
            navigate('/onboarding/first-mission');
          }}
        >
          {t('첫 미션 시작')}
        </button>
        <button type="button" className="secondary-btn" onClick={() => navigate('/onboarding/goal')}>
          {t('이전 단계')}
        </button>
      </div>
    </PagePlaceholder>
  );
}
