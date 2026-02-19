import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      eyebrow={t('Playbooks')}
      title={t('플레이북 라이브러리')}
      description={t('레퍼런스 허브에서 찾은 항목을 실제 운영 절차로 이어주는 단계형 플레이북 모음입니다.')}
    >
      <section className="home-stage-grid">
        <article className="home-stage-card">
          <h2>{t('권장 사용 흐름')}</h2>
          <p>{t('1) 레퍼런스 허브에서 명령/단축키 검색')}</p>
          <p>{t('2) 관련 플레이북으로 운영 절차 확인')}</p>
          <p>{t('3) 실습 워크벤치에서 바로 검증')}</p>
          <div className="inline-actions">
            <Link to="/cheatsheet" className="secondary-btn">
              {t('레퍼런스 허브로 이동')}
            </Link>
            <Link to="/practice?lesson=hello-tmux" className="secondary-btn">
              {t('실습 바로 열기')}
            </Link>
          </div>
        </article>
      </section>

      {playbooks.length === 0 ? (
        <EmptyState title={t('플레이북이 없습니다')} description={t('콘텐츠 로드를 확인해 주세요.')} />
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
                      {t('{{minutes}}분 · 단계 {{steps}}개', {
                        minutes: playbook.estimatedMinutes,
                        steps: playbook.steps.length,
                      })}
                    </p>
                    <p className="muted">
                      {t('선행 지식: {{prerequisites}}', {
                        prerequisites: playbook.prerequisites.join(', ') || t('없음'),
                      })}
                    </p>
                    <Link to={`/playbooks/${playbook.slug}`} className="text-link">
                      {t('상세 가이드 열기')}
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
