import { useNavigate, useParams } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useEffect, useMemo, useState } from 'react';
import { getPlaybookBySlug, loadAppContent } from '../../features/curriculum/contentLoader';
import { EmptyState } from '../../components/system/EmptyState';
import type { AppPlaybook } from '../../features/curriculum/contentSchema';
import { copyTextToClipboard } from '../../utils/clipboard';
export function PlaybookDetailPage() {
    const { playbookSlug } = useParams();
    const navigate = useNavigate();
    const [playbook, setPlaybook] = useState<AppPlaybook | null>(null);
    const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
    useEffect(() => {
        if (!playbookSlug) {
            setPlaybook(null);
            return;
        }
        loadAppContent()
            .then((content) => setPlaybook(getPlaybookBySlug(content, playbookSlug) ?? null))
            .catch(() => setPlaybook(null));
    }, [playbookSlug]);
    const hasCommands = useMemo(() => playbook?.steps.some((step) => Boolean(step.command)), [playbook]);
    const onCopyCommand = async (command: string, stepId: string) => {
        try {
            await copyTextToClipboard(command);
            setCopiedCommand(command);
            if (playbookSlug) {
                navigate(`/playbooks/${playbookSlug}/copied?step=${encodeURIComponent(stepId)}`);
            }
        }
        catch {
            setCopiedCommand(null);
        }
    };
    return (<PagePlaceholder eyebrow="Playbook" title={playbookSlug ?? 'playbook'} description={__tx("\uD50C\uB808\uC774\uBD81 \uC0C1\uC138 \uB2E8\uACC4, \uBA85\uB839 \uBCF5\uC0AC, \uAC80\uC99D \uCCB4\uD06C\uB9AC\uC2A4\uD2B8\uB97C \uD45C\uC2DC\uD569\uB2C8\uB2E4.")}>
      {!playbook ? (<EmptyState title={__tx("\uD50C\uB808\uC774\uBD81\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4")} description={__tx("\uC798\uBABB\uB41C \uACBD\uB85C\uC774\uAC70\uB098 \uB85C\uB4DC \uC911\uC785\uB2C8\uB2E4.")}/>) : (<div className="playbook-grid">
          <section className="playbook-section">
            <h2>Steps</h2>
            <ol className="link-list">
              {playbook.steps.map((step) => (<li key={step.id}>
                  <strong>{step.title}</strong>
                  {step.description ? <div className="muted">{step.description}</div> : null}
                  {step.command ? (<div className="playbook-command-row">
                      <code className="playbook-command">{step.command}</code>
                      <button type="button" className="secondary-btn" onClick={() => {
                        void onCopyCommand(step.command as string, step.id);
                    }}>
                        Copy
                      </button>
                    </div>) : null}
                </li>))}
            </ol>
            {hasCommands && copiedCommand ? (<p className="muted" role="status" aria-live="polite">
                copied: <code>{copiedCommand}</code>
              </p>) : null}
          </section>

          <section className="playbook-section">
            <h2>Verification</h2>
            <ul className="link-list">
              {playbook.verification.map((item) => (<li key={item}>{item}</li>))}
            </ul>

            <h2>Troubleshooting</h2>
            <ul className="link-list">
              {playbook.troubleshooting.map((item) => (<li key={item.issue}>
                  <strong>{item.issue}</strong>
                  <div className="muted">{item.resolution}</div>
                </li>))}
            </ul>
          </section>
        </div>)}
    </PagePlaceholder>);
}
