import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';

export function PlaybookCopiedPage() {
  const { playbookSlug } = useParams();
  const [searchParams] = useSearchParams();
  const copiedStep = searchParams.get('step');

  return (
    <PagePlaceholder
      eyebrow="Playbook Copied"
      title="명령 복사 완료"
      description="플레이북 명령 복사가 기록되었습니다. 이 라우트는 KPI 측정용으로도 사용됩니다."
    >
      <ul className="link-list">
        <li>playbook: {playbookSlug ?? 'unknown'}</li>
        <li>step: {copiedStep ?? 'n/a'}</li>
      </ul>

      <div className="inline-actions">
        <Link to={`/playbooks/${playbookSlug ?? ''}`} className="primary-btn">
          플레이북으로 돌아가기
        </Link>
        <Link to="/playbooks" className="secondary-btn">
          플레이북 목록
        </Link>
      </div>
    </PagePlaceholder>
  );
}
