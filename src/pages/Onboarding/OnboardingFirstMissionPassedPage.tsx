import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useOnboardingStore } from '../../features/onboarding/onboardingStore';

export function OnboardingFirstMissionPassedPage() {
  const { t } = useTranslation();
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
      eyebrow={t('Onboarding')}
      title={t('첫 미션 완료')}
      description={t('첫 미션 통과가 기록되었습니다. 추천 트랙으로 바로 이어서 학습하세요.')}
    >
      <div className="onboarding-layout">
        <section className="onboarding-card">
          <h2>{t('통과 요약')}</h2>
          <ul className="link-list">
            <li>{t('미션: {{missionSlug}}', { missionSlug })}</li>
            <li>{t('획득 XP: +{{gainedXp}}', { gainedXp })}</li>
          </ul>
          <p className="muted">
            {t('이 페이지는 Cloudflare 분석에서 온보딩 첫 성공 이벤트 라우트로 사용됩니다.')}
          </p>
        </section>
      </div>

      <div className="inline-actions">
        <Link to="/onboarding/done" className="primary-btn">
          {t('온보딩 완료 화면으로')}
        </Link>
        <Link to="/practice" className="secondary-btn">
          {t('연습 계속하기')}
        </Link>
      </div>
    </PagePlaceholder>
  );
}
