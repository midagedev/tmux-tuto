import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
    return (<PagePlaceholder eyebrow="Reference Hub" title={__tx("\uCE58\uD2B8\uC2DC\uD2B8 + \uD50C\uB808\uC774\uBD81 \uD1B5\uD569 \uB808\uD37C\uB7F0\uC2A4")} description={__tx("\uC9E7\uC740 \uBA85\uB839\uC740 \uC2E4\uC2B5 \uC6CC\uD06C\uBCA4\uCE58\uC5D0\uC11C \uBC14\uB85C \uAC80\uC99D\uD558\uACE0, \uC6B4\uC601 \uC808\uCC28\uD615 \uC8FC\uC81C\uB294 \uD50C\uB808\uC774\uBD81\uC73C\uB85C \uAE4A\uAC8C \uD559\uC2B5\uD558\uC138\uC694.")}>
      <section className="reference-hub-head">
        <p className="muted">{__tx("\uB2E8\uCD95\uD0A4 \uD45C\uAE30 \uC548\uB0B4: `Ctrl+b`\uB294 tmux \uAE30\uBCF8 prefix \uD0A4\uC785\uB2C8\uB2E4. \uBB38\uC11C\uC758 `prefix`\uB294 \uBCF4\uD1B5 `Ctrl+b`\uB97C \uC758\uBBF8\uD569\uB2C8\uB2E4.")}</p>
        <input className="sim-input reference-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={__tx("\uC608: split, tmux.conf, session, copy-mode")} aria-label="Reference search"/>
        <div className="reference-chip-row">
          {QUICK_QUERY_PRESETS.map((preset) => (<button key={preset} type="button" className="secondary-btn reference-chip" onClick={() => setQuery(preset)}>
              {preset}
            </button>))}
        </div>
      </section>

      <section className="reference-section">
        <h2>{normalizedQuery.length > 0 ? __tx("\uAC80\uC0C9 \uACB0\uACFC (") + results.length + ")" : __tx("\uC790\uC8FC \uC4F0\uB294 \uB808\uD37C\uB7F0\uC2A4")}</h2>
        {featuredReferences.length === 0 ? (<EmptyState title={__tx("\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4")} description={__tx("\uB2E4\uB978 \uD0A4\uC6CC\uB4DC\uB85C \uB2E4\uC2DC \uAC80\uC0C9\uD574 \uBCF4\uC138\uC694.")}/>) : (<div className="reference-grid">
            {featuredReferences.map((item) => (<article key={item.id} className="reference-card">
                <p className="reference-type">{item.contentType}</p>
                <h3>{item.title}</h3>
                <p className="muted">{item.description}</p>
                <div className="inline-actions">
                  {item.contentType === 'playbook' && item.playbookSlug ? (<Link to={`/playbooks/${item.playbookSlug}`} className="secondary-btn">{__tx("\uD50C\uB808\uC774\uBD81 \uB2E8\uACC4 \uBCF4\uAE30")}</Link>) : (<Link to={resolvePracticePath(item)} className="secondary-btn">{__tx("\uC2E4\uC2B5 \uC6CC\uD06C\uBCA4\uCE58 \uC5F4\uAE30")}</Link>)}
                </div>
                {item.command ? <code className="playbook-command">{item.command}</code> : null}
                {item.shortcut ? <code className="playbook-command">{item.shortcut}</code> : null}
              </article>))}
          </div>)}
      </section>

      <section className="reference-section">
        <h2>{__tx("\uD575\uC2EC \uD50C\uB808\uC774\uBD81")}</h2>
        {playbooks.length === 0 ? (<EmptyState title={__tx("\uD50C\uB808\uC774\uBD81 \uB370\uC774\uD130 \uC5C6\uC74C")} description={__tx("\uCF58\uD150\uCE20 \uB85C\uB4DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.")}/>) : (<div className="reference-playbook-grid">
            {playbooks.slice(0, 6).map((playbook) => (<article key={playbook.slug} className="reference-playbook-card">
                <p className="reference-type">{playbook.category}</p>
                <h3>{playbook.title}</h3>
                <p className="muted">
                  {playbook.estimatedMinutes}{__tx("\uBD84 \u00B7 \uB2E8\uACC4")}{playbook.steps.length}{__tx("\uAC1C")}</p>
                <p className="muted">{__tx("\uC120\uD589:")}{playbook.prerequisites.join(', ') || __tx("\uC5C6\uC74C")}</p>
                <Link to={`/playbooks/${playbook.slug}`} className="text-link">{__tx("\uC0C1\uC138 \uAC00\uC774\uB4DC \uBCF4\uAE30")}</Link>
              </article>))}
          </div>)}
        <div className="inline-actions">
          <Link to="/playbooks" className="secondary-btn">{__tx("\uB808\uD37C\uB7F0\uC2A4 \uB77C\uC774\uBE0C\uB7EC\uB9AC \uC804\uCCB4 \uBCF4\uAE30")}</Link>
        </div>
      </section>
    </PagePlaceholder>);
}
