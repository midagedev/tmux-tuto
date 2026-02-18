import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../components/system/PagePlaceholder';

export function HomePage() {
  return (
    <PagePlaceholder
      eyebrow="tmux Interactive Trainer"
      title="터미널 실전형 tmux 학습"
      description="초보자도 바로 시작하고, 끝까지 학습하면 실무에서 tmux를 자연스럽게 쓰도록 설계한 실습형 커리큘럼입니다."
    >
      <section className="home-intro-card">
        <p>
          <strong>이 사이트의 목표:</strong> 한번 쭉 경험해보면, 이후 로컬/원격 터미널 어디서든 tmux 세션을 안정적으로 운영하는
          개발자가 되는 것.
        </p>
        <p className="muted">학습 방식은 단순합니다. 짧은 레슨을 보고, 바로 같은 화면에서 실습하고, 미션 통과로 확인합니다.</p>
      </section>

      <div className="inline-actions">
        <Link to="/onboarding/start" className="primary-btn">
          3분 온보딩 시작
        </Link>
        <Link to="/learn" className="secondary-btn">
          커리큘럼 보기
        </Link>
        <Link to="/practice" className="secondary-btn">
          바로 실습 화면 열기
        </Link>
      </div>

      <section className="home-value-grid">
        <article className="home-value-card">
          <h2>1. 가장 쉬운 첫 성공</h2>
          <p className="muted">첫 레슨은 명령 1개 실행으로 통과하도록 설계해 진입 장벽을 낮췄습니다.</p>
        </article>
        <article className="home-value-card">
          <h2>2. 레슨과 실습의 결합</h2>
          <p className="muted">레슨 설명과 tmux 시뮬레이터를 한 화면에서 보고 바로 연습합니다.</p>
        </article>
        <article className="home-value-card">
          <h2>3. 실무 루틴 중심</h2>
          <p className="muted">단축키 암기보다 세션 유지, 분할, 검색, 명령 모드 루틴을 먼저 내재화합니다.</p>
        </article>
      </section>
    </PagePlaceholder>
  );
}
