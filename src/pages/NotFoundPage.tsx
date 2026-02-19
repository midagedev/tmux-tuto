import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../components/system/PagePlaceholder';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <PagePlaceholder
      eyebrow="404"
      title={t('페이지를 찾을 수 없습니다')}
      description={t('경로를 확인하거나 홈으로 이동해 주세요.')}
    >
      <Link to="/" className="primary-btn">
        {t('홈으로 이동')}
      </Link>
    </PagePlaceholder>
  );
}
