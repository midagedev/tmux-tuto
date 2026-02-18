import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../components/system/PagePlaceholder';
import { BRAND } from '../app/brand';

export function HomePage() {
  return (
    <PagePlaceholder
      eyebrow={BRAND.name}
      title="바로 실습으로 시작하는 tmux 학습"
      description={BRAND.tagline}
    >
      <section className="home-intro-card home-brand-hero">
        <p className="home-brand-kicker">{BRAND.descriptor}</p>
        <p>
          <strong>학습 약속:</strong> {BRAND.valuePromise}
        </p>
        <ul className="link-list">
          {BRAND.valuePillars.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="inline-actions">
        <Link to="/practice?lesson=hello-tmux" className="primary-btn">
          바로 실습 시작
        </Link>
        <Link to="/learn" className="secondary-btn">
          초급/심화 경로 보기
        </Link>
      </div>

      <section className="home-value-grid home-brand-grid">
        <article className="home-value-card">
          <h2>초급 목표</h2>
          <p className="muted">session 생성, window/pane 분할, detach/attach, 기본 검색까지 혼자 수행</p>
        </article>
        <article className="home-value-card">
          <h2>심화 목표</h2>
          <p className="muted">copy-mode/command-mode, 설정 적용, 원격 세션 루틴까지 실무형으로 확장</p>
        </article>
        <article className="home-value-card">
          <h2>핵심 가치</h2>
          <p className="muted">설명은 짧게, 실습은 바로. 단계는 단순하게 유지해 빠르게 숙련도를 올립니다.</p>
        </article>
      </section>

      <section className="home-tone-card">
        <h2>Tone &amp; Manner</h2>
        <ul className="link-list">
          {BRAND.toneAndManner.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </PagePlaceholder>
  );
}
