import { Link } from 'react-router-dom';
import type { RefObject } from 'react';
import type { TFunction } from 'i18next';
import type { VmMetricHighlightState, VmMetricKey } from '../vmMetrics';

type VmStatus = 'idle' | 'booting' | 'running' | 'stopped' | 'error';

type MetricStatusItem = {
  key: VmMetricKey;
  label: string;
  value: string | number;
};

type QuickCommandItem = {
  label: string;
  command: string;
};

type PracticeLabPanelProps = {
  t: TFunction;
  autoProbe: boolean;
  commandInput: string;
  vmStatus: VmStatus;
  quickCommands: readonly QuickCommandItem[];
  metricStatusItems: MetricStatusItem[];
  metricHighlightState: VmMetricHighlightState;
  isTerminalFlashActive: boolean;
  terminalHostRef: RefObject<HTMLDivElement>;
  actionHistory: string[];
  commandHistory: string[];
  debugLines: string[];
  onRestartVm: () => void;
  onAutoProbeChange: (enabled: boolean) => void;
  onProbeNow: () => void;
  onSubmitCommand: () => void;
  onCommandInputChange: (value: string) => void;
  onSendCommand: (command: string) => void;
};

export function PracticeLabPanel({
  t,
  autoProbe,
  commandInput,
  vmStatus,
  quickCommands,
  metricStatusItems,
  metricHighlightState,
  isTerminalFlashActive,
  terminalHostRef,
  actionHistory,
  commandHistory,
  debugLines,
  onRestartVm,
  onAutoProbeChange,
  onProbeNow,
  onSubmitCommand,
  onCommandInputChange,
  onSendCommand,
}: PracticeLabPanelProps) {
  return (
    <section className="vm-lab-panel">
      <section className="vm-practice-controls">
        <div className="inline-actions">
          <Link className="secondary-btn" to="/learn">
            {t('커리큘럼으로 이동')}
          </Link>
          <button type="button" className="secondary-btn" onClick={onRestartVm}>
            {t('VM 재시작')}
          </button>
          <label className="vm-practice-check" htmlFor="auto-probe-toggle">
            <input
              id="auto-probe-toggle"
              type="checkbox"
              checked={autoProbe}
              onChange={(event) => onAutoProbeChange(event.target.checked)}
            />
            Auto probe
          </label>
          <button type="button" className="secondary-btn" onClick={onProbeNow}>
            {t('Probe 지금 실행')}
          </button>
        </div>

        <form
          className="vm-practice-command-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitCommand();
          }}
        >
          <input
            className="vm-practice-command-input"
            value={commandInput}
            onChange={(event) => onCommandInputChange(event.target.value)}
            placeholder="tmux new-session -d -s lesson"
            aria-label="VM shell command"
          />
          <button type="submit" className="primary-btn" disabled={vmStatus === 'error'}>
            {t('명령 실행')}
          </button>
        </form>

        <details className="vm-practice-quick-wrap">
          <summary>{t('자주 쓰는 명령 빠르게 실행')}</summary>
          <div className="vm-practice-quick">
            {quickCommands.map((item) => (
              <button key={item.label} type="button" className="secondary-btn" onClick={() => onSendCommand(item.command)}>
                {t(item.label)}
              </button>
            ))}
          </div>
        </details>

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
      </section>

      <section
        className={`vm-terminal-shell${isTerminalFlashActive ? ' is-probe-flash' : ''}`}
        aria-label="VM terminal"
      >
        <div className="vm-terminal-probe-flash" aria-hidden="true" />
        <div className="vm-terminal-host" ref={terminalHostRef} />
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
