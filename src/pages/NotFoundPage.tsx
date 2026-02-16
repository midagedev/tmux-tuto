import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../components/system/PagePlaceholder';

export function NotFoundPage() {
  return (
    <PagePlaceholder
      eyebrow="404"
      title="페이지를 찾을 수 없습니다"
      description="경로를 확인하거나 홈으로 이동해 주세요."
    >
      <Link to="/" className="primary-btn">
        홈으로 이동
      </Link>
    </PagePlaceholder>
  );
}
