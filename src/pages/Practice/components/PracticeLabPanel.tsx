import type { RefObject } from 'react';
import type { TFunction } from 'i18next';
import type { VmMetricHighlightState, VmMetricKey } from '../vmMetrics';

type MetricStatusItem = {
  key: VmMetricKey;
  label: string;
  value: string | number;
};

type PracticeLabPanelProps = {
  t: TFunction;
  metricStatusItems: MetricStatusItem[];
  metricHighlightState: VmMetricHighlightState;
  isTerminalFlashActive: boolean;
  terminalHostRef: RefObject<HTMLDivElement>;
  actionHistory: string[];
  commandHistory: string[];
  debugLines: string[];
  onRestartVm: () => void;
};

export function PracticeLabPanel({
  t,
  metricStatusItems,
  metricHighlightState,
  isTerminalFlashActive,
  terminalHostRef,
  actionHistory,
  commandHistory,
  debugLines,
  onRestartVm,
}: PracticeLabPanelProps) {
  return (
    <section className="vm-lab-panel">
      <section
        className={`vm-terminal-shell${isTerminalFlashActive ? ' is-probe-flash' : ''}`}
        aria-label="VM terminal"
      >
        <div className="vm-terminal-probe-flash" aria-hidden="true" />
        <div className="vm-terminal-host" ref={terminalHostRef} />
      </section>

      <section className="vm-practice-controls">
        <p className="vm-practice-status" aria-live="polite">
          <span className="vm-practice-status-prefix">metrics</span>
          {metricStatusItems.map((metricItem) => (
            <span
              key={metricItem.key}
              className={`vm-practice-status-item${metricHighlightState[metricItem.key] ? ' is-highlighted' : ''}`}
            >
              <span>{metricItem.label}</span>
              <strong>{metricItem.value}</strong>
            </span>
          ))}
        </p>

        <div className="inline-actions">
          <button type="button" className="secondary-btn" onClick={onRestartVm}>
            {t('VM 재시작')}
          </button>
        </div>
      </section>

      <details className="vm-practice-debug">
        <summary>{t('브리지 디버그')}</summary>
        <div className="vm-debug-grid">
          <article>
            <h3>Recent Action History</h3>
            <pre className="vm-practice-debug-text">{actionHistory.slice(-20).join('\n') || '(empty)'}</pre>
          </article>
          <article>
            <h3>Recent Command History</h3>
            <pre className="vm-practice-debug-text">{commandHistory.slice(-20).join('\n') || '(empty)'}</pre>
          </article>
          <article>
            <h3>Recent VM Output Lines</h3>
            <pre className="vm-practice-debug-text">{debugLines.slice(-50).join('\n') || '(empty)'}</pre>
          </article>
        </div>
      </details>
    </section>
  );
}
