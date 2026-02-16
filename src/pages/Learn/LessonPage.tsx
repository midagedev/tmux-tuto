import { useParams } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';

export function LessonPage() {
  const { trackSlug, chapterSlug, lessonSlug } = useParams();

  return (
    <PagePlaceholder
      eyebrow="Lesson"
      title={`${trackSlug ?? 'track'} / ${chapterSlug ?? 'chapter'} / ${lessonSlug ?? 'lesson'}`}
      description="레슨 목표, 미션 목록, 힌트 및 완료 조건을 표시합니다."
    />
  );
}
