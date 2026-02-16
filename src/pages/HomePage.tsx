import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../components/system/PagePlaceholder';

export function HomePage() {
  return (
    <PagePlaceholder
      eyebrow="tmux Interactive Trainer"
      title="실무형 tmux 학습"
      description="과장 없는 실습 중심 구조로 tmux 사용을 익히는 정적 웹앱입니다."
    >
      <div className="inline-actions">
        <Link to="/onboarding/start" className="primary-btn">
          3분 온보딩 시작
        </Link>
        <Link to="/learn" className="secondary-btn">
          커리큘럼 보기
        </Link>
      </div>
    </PagePlaceholder>
  );
}
