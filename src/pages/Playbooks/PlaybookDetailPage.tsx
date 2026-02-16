import { useParams } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';

export function PlaybookDetailPage() {
  const { playbookSlug } = useParams();

  return (
    <PagePlaceholder
      eyebrow="Playbook"
      title={playbookSlug ?? 'playbook'}
      description="플레이북 상세 단계, 명령 복사, 검증 체크리스트를 표시합니다."
    />
  );
}
