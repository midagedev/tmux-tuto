import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CHEATSHEET_ITEMS } from '../../features/cheatsheet/items';
import { buildCheatsheetIndex, searchCheatsheet } from '../../features/cheatsheet/search';

export function CheatsheetPage() {
  const [query, setQuery] = useState('');
  const index = useMemo(() => buildCheatsheetIndex(CHEATSHEET_ITEMS), []);
  const results = useMemo(() => searchCheatsheet(index, query, 12), [index, query]);

  return (
    <PagePlaceholder
      eyebrow="Cheatsheet"
      title="단축키와 플레이북 검색"
      description="단축키, 명령, 플레이북 항목을 검색해 바로 실습으로 이동합니다."
    >
      <input
        className="sim-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="예: split, tmux.conf, tailscale, session"
        aria-label="Cheatsheet search"
      />
      <div className="page-extra">
        <ul className="link-list">
          {results.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong> <span className="muted">({item.contentType})</span>
              <div className="muted">{item.description}</div>
              <div className="inline-actions">
                {item.contentType === 'playbook' && item.playbookSlug ? (
                  <Link to={`/playbooks/${item.playbookSlug}`} className="secondary-btn">
                    가이드 열기
                  </Link>
                ) : (
                  <Link to={`/practice?from=${item.id}`} className="secondary-btn">
                    바로 실습
                  </Link>
                )}
                {item.command ? <code className="playbook-command">{item.command}</code> : null}
                {item.shortcut ? <code className="playbook-command">{item.shortcut}</code> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PagePlaceholder>
  );
}
