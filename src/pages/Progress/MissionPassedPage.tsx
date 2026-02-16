import { useParams } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';

export function MissionPassedPage() {
  const { missionSlug } = useParams();

  return (
    <PagePlaceholder
      eyebrow="Mission Passed"
      title={missionSlug ?? 'mission'}
      description="미션 통과 라우트(분석용)와 결과 요약 화면입니다."
    />
  );
}
