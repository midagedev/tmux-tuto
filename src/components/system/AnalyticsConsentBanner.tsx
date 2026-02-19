import type { AnalyticsConsent } from '../../features/analytics';
import { useTranslation } from 'react-i18next';

type AnalyticsConsentBannerProps = {
  consent: AnalyticsConsent;
  onAccept: () => void;
  onDecline: () => void;
};

export function AnalyticsConsentBanner({
  consent,
  onAccept,
  onDecline,
}: AnalyticsConsentBannerProps) {
  const { t } = useTranslation();
  if (consent !== 'unknown') {
    return null;
  }

  return (
    <div className="analytics-banner" role="region" aria-label={t('Analytics consent')}>
      <p>
        {t('사용성 개선을 위해 Cloudflare Web Analytics를 사용합니다. 동의하면 라우트 기반 이용량이 수집됩니다.')}
      </p>
      <div className="inline-actions">
        <button type="button" className="primary-btn" onClick={onAccept}>
          {t('동의하고 계속')}
        </button>
        <button type="button" className="secondary-btn" onClick={onDecline}>
          {t('동의하지 않음')}
        </button>
      </div>
    </div>
  );
}
