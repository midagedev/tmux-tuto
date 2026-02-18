import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/system/EmptyState';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppPlaybook } from '../../features/curriculum/contentSchema';

function buildGroupedPlaybooks(playbooks: AppPlaybook[]) {
  return playbooks.reduce<Record<string, AppPlaybook[]>>((accumulator, playbook) => {
    const category = playbook.category || 'uncategorized';
    accumulator[category] = [...(accumulator[category] ?? []), playbook];
    return accumulator;
  }, {});
}

export function PlaybookIndexPage() {
  const [playbooks, setPlaybooks] = useState<AppPlaybook[]>([]);

  useEffect(() => {
    loadAppContent()
      .then((content) => setPlaybooks(content.playbooks))
      .catch(() => setPlaybooks([]));
  }, []);

  const groupedPlaybooks = useMemo(() => buildGroupedPlaybooks(playbooks), [playbooks]);
  const categories = useMemo(() => Object.keys(groupedPlaybooks).sort(), [groupedPlaybooks]);

  return (
    <PagePlaceholder
      eyebrow="Playbooks"
      title="플레이북 라이브러리"
      description="레퍼런스 허브에서 찾은 항목을 실제 운영 절차로 이어주는 단계형 플레이북 모음입니다."
    >
      <section className="home-stage-grid">
        <article className="home-stage-card">
          <h2>권장 사용 흐름</h2>
          <p>1) 레퍼런스 허브에서 명령/단축키 검색</p>
          <p>2) 관련 플레이북으로 운영 절차 확인</p>
          <p>3) 실습 워크벤치에서 바로 검증</p>
          <div className="inline-actions">
            <Link to="/cheatsheet" className="secondary-btn">
              레퍼런스 허브로 이동
            </Link>
            <Link to="/practice?lesson=hello-tmux" className="secondary-btn">
              실습 바로 열기
            </Link>
          </div>
        </article>
      </section>

      {playbooks.length === 0 ? (
        <EmptyState title="플레이북이 없습니다" description="콘텐츠 로드를 확인해 주세요." />
      ) : (
        <div className="reference-playbook-groups">
          {categories.map((category) => (
            <section key={category} className="reference-section">
              <h2>{category}</h2>
              <div className="reference-playbook-grid">
                {(groupedPlaybooks[category] ?? []).map((playbook) => (
                  <article key={playbook.slug} className="reference-playbook-card">
                    <h3>{playbook.title}</h3>
                    <p className="muted">
                      {playbook.estimatedMinutes}분 · 단계 {playbook.steps.length}개
                    </p>
                    <p className="muted">선행 지식: {playbook.prerequisites.join(', ') || '없음'}</p>
                    <Link to={`/playbooks/${playbook.slug}`} className="text-link">
                      상세 가이드 열기
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PagePlaceholder>
  );
}
