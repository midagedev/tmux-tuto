import { useParams } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';

export function ShareMilestonePage() {
  const { milestoneSlug } = useParams();

  return (
    <PagePlaceholder
      eyebrow="Share"
      title={milestoneSlug ?? 'milestone'}
      description="마일스톤 공유용 정적 템플릿 페이지입니다."
    />
  );
}
