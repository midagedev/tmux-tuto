import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { PagePlaceholder } from './PagePlaceholder';
export function RouteErrorBoundary() {
    const { t } = useI18n();
    const error = useRouteError();
    const message = isRouteErrorResponse(error)
        ? `${error.status} ${error.statusText}`
        : t('error.unexpected');
    return (<PagePlaceholder eyebrow="Error" title={t('error.renderTitle')} description={message}>
      <div className="inline-actions">
        <Link to="/" className="primary-btn">
          {t('error.goHome')}
        </Link>
      </div>
    </PagePlaceholder>);
}
