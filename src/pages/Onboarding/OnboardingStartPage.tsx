import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useOnboardingStore } from '../../features/onboarding/onboardingStore';

export function OnboardingStartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startedAt = useOnboardingStore((store) => store.startedAt);
  const completedAt = useOnboardingStore((store) => store.completedAt);
  const startOnboarding = useOnboardingStore((store) => store.startOnboarding);

  return (
    <PagePlaceholder
      eyebrow={t('Onboarding')}
      title={t('실습 중심 tmux 온보딩')}
      description={t('3분 안에 첫 패인 분할을 완료하고, 개인화된 트랙 추천까지 연결합니다.')}
    >
      <div className="onboarding-layout">
        <section className="onboarding-card">
          <h2>{t('이 사이트가 해주는 것')}</h2>
          <ul className="link-list">
            <li>{t('커리큘럼 기반 tmux 실습 (Track A~C)')}</li>
            <li>{t('고충실도 tmux 시뮬레이터 실습')}</li>
            <li>{t('단축키 검색, 북마크, 진행도 추적')}</li>
          </ul>
        </section>

        <section className="onboarding-card">
          <h2>{t('해주지 않는 것')}</h2>
          <ul className="link-list">
            <li>{t('실제 서버/셸 프로세스 실행')}</li>
            <li>{t('계정 기반 클라우드 동기화')}</li>
            <li>{t('백엔드 로그 수집')}</li>
          </ul>
          <p className="muted">
            {t('실제 tmux와의 차이는 실습 화면의')} <strong>SIMULATED</strong>{' '}
            {t('안내에서 항상 확인할 수 있습니다.')}
          </p>
        </section>
      </div>

      <div className="inline-actions">
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            startOnboarding();
            navigate('/onboarding/goal');
          }}
        >
          {t('온보딩 시작')}
        </button>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => navigate('/learn')}
        >
          {t('바로 커리큘럼 보기')}
        </button>
      </div>

      <p className="muted">
        {t('시작 상태: {{status}} | 완료 상태: {{completion}}', {
          status: startedAt ? t('진행 중') : t('미시작'),
          completion: completedAt ? t('완료됨') : t('미완료'),
        })}
      </p>
    </PagePlaceholder>
  );
}
