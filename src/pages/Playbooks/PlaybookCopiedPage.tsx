import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
export function PlaybookCopiedPage() {
    const { playbookSlug } = useParams();
    const [searchParams] = useSearchParams();
    const copiedStep = searchParams.get('step');
    return (<PagePlaceholder eyebrow="Playbook Copied" title={__tx("\uBA85\uB839 \uBCF5\uC0AC \uC644\uB8CC")} description={__tx("\uD50C\uB808\uC774\uBD81 \uBA85\uB839 \uBCF5\uC0AC\uAC00 \uAE30\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC774 \uB77C\uC6B0\uD2B8\uB294 KPI \uCE21\uC815\uC6A9\uC73C\uB85C\uB3C4 \uC0AC\uC6A9\uB429\uB2C8\uB2E4.")}>
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
    </PagePlaceholder>);
}
