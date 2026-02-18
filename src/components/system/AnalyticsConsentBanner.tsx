import type { AnalyticsConsent } from '../../features/analytics';
import { useI18n } from '../../i18n';
type AnalyticsConsentBannerProps = {
    consent: AnalyticsConsent;
    onAccept: () => void;
    onDecline: () => void;
};
export function AnalyticsConsentBanner({ consent, onAccept, onDecline, }: AnalyticsConsentBannerProps) {
    const { t } = useI18n();
    if (consent !== 'unknown') {
        return null;
    }
    return (<div className="analytics-banner" role="region" aria-label="Analytics consent">
      <p>
        {t('analytics.banner.message')}
      </p>
      <div className="inline-actions">
        <button type="button" className="primary-btn" onClick={onAccept}>
          {t('analytics.banner.accept')}
        </button>
        <button type="button" className="secondary-btn" onClick={onDecline}>
          {t('analytics.banner.decline')}
        </button>
      </div>
    </div>);
}
