import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from './PagePlaceholder';

export function RouteErrorBoundary() {
  const { t } = useTranslation();
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : t('예상치 못한 오류가 발생했습니다.');

  return (
    <PagePlaceholder
      eyebrow={t('Error')}
      title={t('페이지를 렌더링할 수 없습니다')}
      description={message}
    >
      <div className="inline-actions">
        <Link to="/" className="primary-btn">
          {t('홈으로 이동')}
        </Link>
      </div>
    </PagePlaceholder>
  );
}
