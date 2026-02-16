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
    } catch {
      setCopiedCommand(null);
    }
  };

  return (
    <PagePlaceholder
      eyebrow="Playbook"
      title={playbookSlug ?? 'playbook'}
      description="플레이북 상세 단계, 명령 복사, 검증 체크리스트를 표시합니다."
    >
      {!playbook ? (
        <EmptyState title="플레이북을 찾을 수 없습니다" description="잘못된 경로이거나 로드 중입니다." />
      ) : (
        <div className="playbook-grid">
          <section className="playbook-section">
            <h2>Steps</h2>
            <ol className="link-list">
              {playbook.steps.map((step) => (
                <li key={step.id}>
                  <strong>{step.title}</strong>
                  {step.description ? <div className="muted">{step.description}</div> : null}
                  {step.command ? (
                    <div className="playbook-command-row">
                      <code className="playbook-command">{step.command}</code>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          void onCopyCommand(step.command as string, step.id);
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
            {hasCommands && copiedCommand ? (
              <p className="muted" role="status" aria-live="polite">
                copied: <code>{copiedCommand}</code>
              </p>
            ) : null}
          </section>

          <section className="playbook-section">
            <h2>Verification</h2>
            <ul className="link-list">
              {playbook.verification.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h2>Troubleshooting</h2>
            <ul className="link-list">
              {playbook.troubleshooting.map((item) => (
                <li key={item.issue}>
                  <strong>{item.issue}</strong>
                  <div className="muted">{item.resolution}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </PagePlaceholder>
  );
}
