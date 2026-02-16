import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useEffect, useState } from 'react';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import { EmptyState } from '../../components/system/EmptyState';
import type { AppPlaybook } from '../../features/curriculum/contentSchema';

export function PlaybookIndexPage() {
  const [playbooks, setPlaybooks] = useState<AppPlaybook[]>([]);

  useEffect(() => {
    loadAppContent()
      .then((content) => setPlaybooks(content.playbooks))
      .catch(() => setPlaybooks([]));
  }, []);

  return (
    <PagePlaceholder
      eyebrow="Playbooks"
      title="실무 플레이북"
      description="실전에서 자주 사용하는 설정/루틴을 단계형 가이드로 제공합니다."
    >
      {playbooks.length === 0 ? (
        <EmptyState title="플레이북이 없습니다" description="콘텐츠 로드를 확인해 주세요." />
      ) : (
        <ul className="link-list">
          {playbooks.map((playbook) => (
            <li key={playbook.slug}>
              <Link to={`/playbooks/${playbook.slug}`}>{playbook.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </PagePlaceholder>
  );
}
