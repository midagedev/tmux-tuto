import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { PagePlaceholder } from './PagePlaceholder';

export function RouteErrorBoundary() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : '예상치 못한 오류가 발생했습니다.';

  return (
    <PagePlaceholder
      eyebrow="Error"
      title="페이지를 렌더링할 수 없습니다"
      description={message}
    >
      <div className="inline-actions">
        <Link to="/" className="primary-btn">
          홈으로 이동
        </Link>
      </div>
    </PagePlaceholder>
  );
}
