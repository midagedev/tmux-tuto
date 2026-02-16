import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { EmptyState } from '../../components/system/EmptyState';

export function BookmarksPage() {
  return (
    <PagePlaceholder
      eyebrow="Bookmarks"
      title="북마크/노트"
      description="저장한 항목을 태그/정렬로 관리하고 재실습합니다."
    >
      <EmptyState
        title="아직 저장된 항목이 없습니다"
        description="학습 중 북마크한 레슨/플레이북이 여기에 표시됩니다."
      />
    </PagePlaceholder>
  );
}
