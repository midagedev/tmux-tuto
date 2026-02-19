import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../components/system/EmptyState';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { loadAppContent } from '../../features/curriculum/contentLoader';
import type { AppPlaybook } from '../../features/curriculum/contentSchema';
import { CHEATSHEET_ITEMS, type CheatsheetItem } from '../../features/cheatsheet/items';
import { buildCheatsheetIndex, searchCheatsheet } from '../../features/cheatsheet/search';

const QUICK_QUERY_PRESETS = ['session', 'split', 'copy-mode', 'tmux.conf', 'remote'] as const;
const DEFAULT_PRACTICE_PATH = '/practice?lesson=hello-tmux';

function resolvePracticePath(item: CheatsheetItem) {
  return item.practicePath ?? DEFAULT_PRACTICE_PATH;
}

export function CheatsheetPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [playbooks, setPlaybooks] = useState<AppPlaybook[]>([]);
  const index = useMemo(() => buildCheatsheetIndex(CHEATSHEET_ITEMS), []);

  useEffect(() => {
    loadAppContent()
      .then((content) => setPlaybooks(content.playbooks))
      .catch(() => setPlaybooks([]));
  }, []);

  const normalizedQuery = query.trim();
  const results = useMemo(() => searchCheatsheet(index, normalizedQuery, 18), [index, normalizedQuery]);
  const featuredReferences = useMemo(() => {
    if (normalizedQuery.length > 0) {
      return results;
    }

    return CHEATSHEET_ITEMS.slice(0, 10);
  }, [normalizedQuery, results]);

  return (
    <PagePlaceholder
      eyebrow="Reference Hub"
      title={t('치트시트 + 플레이북 통합 레퍼런스')}
      description={t('짧은 명령은 실습 워크벤치에서 바로 검증하고, 운영 절차형 주제는 플레이북으로 깊게 학습하세요.')}
    >
      <section className="reference-hub-head">
        <p className="muted">
          {t(
            '단축키 표기 안내: `Ctrl+b`는 tmux 기본 prefix 키입니다. 문서의 `prefix`는 보통 `Ctrl+b`를 의미합니다.',
          )}
        </p>
        <input
          className="sim-input reference-search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('예: split, tmux.conf, session, copy-mode')}
          aria-label={t('Reference search')}
        />
        <div className="reference-chip-row">
          {QUICK_QUERY_PRESETS.map((preset) => (
            <button key={preset} type="button" className="secondary-btn reference-chip" onClick={() => setQuery(preset)}>
              {preset}
            </button>
          ))}
        </div>
      </section>

      <section className="reference-section">
        <h2>
          {normalizedQuery.length > 0
            ? t('검색 결과 ({{count}})', { count: results.length })
            : t('자주 쓰는 레퍼런스')}
        </h2>
        {featuredReferences.length === 0 ? (
          <EmptyState title={t('검색 결과가 없습니다')} description={t('다른 키워드로 다시 검색해 보세요.')} />
        ) : (
          <div className="reference-grid">
            {featuredReferences.map((item) => (
              <article key={item.id} className="reference-card">
                <p className="reference-type">{item.contentType}</p>
                <h3>{item.title}</h3>
                <p className="muted">{item.description}</p>
                <div className="inline-actions">
                  {item.contentType === 'playbook' && item.playbookSlug ? (
                    <Link to={`/playbooks/${item.playbookSlug}`} className="secondary-btn">
                      {t('플레이북 단계 보기')}
                    </Link>
                  ) : (
                    <Link to={resolvePracticePath(item)} className="secondary-btn">
                      {t('실습 워크벤치 열기')}
                    </Link>
                  )}
                </div>
                {item.command ? <code className="playbook-command">{item.command}</code> : null}
                {item.shortcut ? <code className="playbook-command">{item.shortcut}</code> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="reference-section">
        <h2>{t('핵심 플레이북')}</h2>
        {playbooks.length === 0 ? (
          <EmptyState title={t('플레이북 데이터 없음')} description={t('콘텐츠 로드를 확인해 주세요.')} />
        ) : (
          <div className="reference-playbook-grid">
            {playbooks.slice(0, 6).map((playbook) => (
              <article key={playbook.slug} className="reference-playbook-card">
                <p className="reference-type">{playbook.category}</p>
                <h3>{playbook.title}</h3>
                <p className="muted">
                  {t('{{minutes}}분 · 단계 {{count}}개', {
                    minutes: playbook.estimatedMinutes,
                    count: playbook.steps.length,
                  })}
                </p>
                <p className="muted">
                  {t('선행: {{prerequisites}}', {
                    prerequisites: playbook.prerequisites.join(', ') || t('없음'),
                  })}
                </p>
                <Link to={`/playbooks/${playbook.slug}`} className="text-link">
                  {t('상세 가이드 보기')}
                </Link>
              </article>
            ))}
          </div>
        )}
        <div className="inline-actions">
          <Link to="/playbooks" className="secondary-btn">
            {t('레퍼런스 라이브러리 전체 보기')}
          </Link>
        </div>
      </section>
    </PagePlaceholder>
  );
}
