import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';

export function MissionPassedPage() {
  const { t } = useTranslation();
  const { missionSlug } = useParams();

  return (
    <PagePlaceholder
      eyebrow={t('Mission Passed')}
      title={missionSlug ?? t('mission')}
      description={t('미션 통과 라우트(분석용)와 결과 요약 화면입니다.')}
    />
  );
}
