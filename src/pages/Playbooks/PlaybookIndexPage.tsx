import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';

const playbooks = [
  { slug: 'recommended-config', label: '권장 tmux.conf 베이스' },
  { slug: 'session-persistence', label: 'tmux 세션 유지 루틴' },
  { slug: 'tailscale-ssh-workflow', label: 'Tailscale SSH 원격 작업' },
];

export function PlaybookIndexPage() {
  return (
    <PagePlaceholder
      eyebrow="Playbooks"
      title="실무 플레이북"
      description="실전에서 자주 사용하는 설정/루틴을 단계형 가이드로 제공합니다."
    >
      <ul className="link-list">
        {playbooks.map((playbook) => (
          <li key={playbook.slug}>
            <Link to={`/playbooks/${playbook.slug}`}>{playbook.label}</Link>
          </li>
        ))}
      </ul>
    </PagePlaceholder>
  );
}
