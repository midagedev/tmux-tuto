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
    return (<PagePlaceholder eyebrow="Playbooks" title={__tx("\uD50C\uB808\uC774\uBD81 \uB77C\uC774\uBE0C\uB7EC\uB9AC")} description={__tx("\uB808\uD37C\uB7F0\uC2A4 \uD5C8\uBE0C\uC5D0\uC11C \uCC3E\uC740 \uD56D\uBAA9\uC744 \uC2E4\uC81C \uC6B4\uC601 \uC808\uCC28\uB85C \uC774\uC5B4\uC8FC\uB294 \uB2E8\uACC4\uD615 \uD50C\uB808\uC774\uBD81 \uBAA8\uC74C\uC785\uB2C8\uB2E4.")}>
      <section className="home-stage-grid">
        <article className="home-stage-card">
          <h2>{__tx("\uAD8C\uC7A5 \uC0AC\uC6A9 \uD750\uB984")}</h2>
          <p>{__tx("1) \uB808\uD37C\uB7F0\uC2A4 \uD5C8\uBE0C\uC5D0\uC11C \uBA85\uB839/\uB2E8\uCD95\uD0A4 \uAC80\uC0C9")}</p>
          <p>{__tx("2) \uAD00\uB828 \uD50C\uB808\uC774\uBD81\uC73C\uB85C \uC6B4\uC601 \uC808\uCC28 \uD655\uC778")}</p>
          <p>{__tx("3) \uC2E4\uC2B5 \uC6CC\uD06C\uBCA4\uCE58\uC5D0\uC11C \uBC14\uB85C \uAC80\uC99D")}</p>
          <div className="inline-actions">
            <Link to="/cheatsheet" className="secondary-btn">{__tx("\uB808\uD37C\uB7F0\uC2A4 \uD5C8\uBE0C\uB85C \uC774\uB3D9")}</Link>
            <Link to="/practice?lesson=hello-tmux" className="secondary-btn">{__tx("\uC2E4\uC2B5 \uBC14\uB85C \uC5F4\uAE30")}</Link>
          </div>
        </article>
      </section>

      {playbooks.length === 0 ? (<EmptyState title={__tx("\uD50C\uB808\uC774\uBD81\uC774 \uC5C6\uC2B5\uB2C8\uB2E4")} description={__tx("\uCF58\uD150\uCE20 \uB85C\uB4DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.")}/>) : (<div className="reference-playbook-groups">
          {categories.map((category) => (<section key={category} className="reference-section">
              <h2>{category}</h2>
              <div className="reference-playbook-grid">
                {(groupedPlaybooks[category] ?? []).map((playbook) => (<article key={playbook.slug} className="reference-playbook-card">
                    <h3>{playbook.title}</h3>
                    <p className="muted">
                      {playbook.estimatedMinutes}{__tx("\uBD84 \u00B7 \uB2E8\uACC4")}{playbook.steps.length}{__tx("\uAC1C")}</p>
                    <p className="muted">{__tx("\uC120\uD589 \uC9C0\uC2DD:")}{playbook.prerequisites.join(', ') || __tx("\uC5C6\uC74C")}</p>
                    <Link to={`/playbooks/${playbook.slug}`} className="text-link">{__tx("\uC0C1\uC138 \uAC00\uC774\uB4DC \uC5F4\uAE30")}</Link>
                  </article>))}
              </div>
            </section>))}
        </div>)}
    </PagePlaceholder>);
}
