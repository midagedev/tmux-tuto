import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../components/system/PagePlaceholder';
import { useI18n } from '../i18n';
export function NotFoundPage() {
    const { t } = useI18n();
    return (<PagePlaceholder eyebrow="404" title={t('notFound.title')} description={t('notFound.description')}>
      <Link to="/" className="primary-btn">
        {t('error.goHome')}
      </Link>
    </PagePlaceholder>);
}
