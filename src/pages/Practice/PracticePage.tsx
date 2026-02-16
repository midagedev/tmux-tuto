import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { LoadingState } from '../../components/system/LoadingState';

export function PracticePage() {
  return (
    <PagePlaceholder
      eyebrow="Practice"
      title="tmux Simulator"
      description="고충실도 tmux 시뮬레이터가 이 영역에 렌더링됩니다."
    >
      <LoadingState message="시뮬레이터 초기화를 준비 중입니다..." />
    </PagePlaceholder>
  );
}
