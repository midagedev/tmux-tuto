import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useEffect, useRef, useState } from 'react';
import { getActivePane, getActiveSession, getActiveShellSession, getActiveWindow } from '../../features/simulator/model';
import { useSimulatorStore } from '../../features/simulator/simulatorStore';
import { normalizeKeyboardEvent } from '../../features/simulator/input';
import { useSearchParams } from 'react-router-dom';
import { PaneView } from './PaneView';

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

export function PracticePage() {
  const [manualKey, setManualKey] = useState('');
  const [copySearchQuery, setCopySearchQuery] = useState('');
  const [recoverySource, setRecoverySource] = useState<'latest' | 'lesson-default'>('latest');
  const [recoveryLessonSlug, setRecoveryLessonSlug] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const simulatorState = useSimulatorStore((store) => store.state);
  const hydratedFromStorage = useSimulatorStore((store) => store.hydratedFromStorage);
  const handleKeyInput = useSimulatorStore((store) => store.handleKeyInput);
  const setCommandBuffer = useSimulatorStore((store) => store.setCommandBuffer);
  const runCopySearch = useSimulatorStore((store) => store.runCopySearch);
  const focusPaneById = useSimulatorStore((store) => store.focusPaneById);
  const scrollPane = useSimulatorStore((store) => store.scrollPane);
  const saveSnapshotToStorage = useSimulatorStore((store) => store.saveSnapshotToStorage);
  const restoreSnapshotByIdFromStorage = useSimulatorStore((store) => store.restoreSnapshotByIdFromStorage);
  const restoreLessonDefaultScenario = useSimulatorStore((store) => store.restoreLessonDefaultScenario);
  const restoreLatestSnapshotFromStorage = useSimulatorStore(
    (store) => store.restoreLatestSnapshotFromStorage,
  );
  const resetSimulator = useSimulatorStore((store) => store.reset);
  const applyQuickPreset = useSimulatorStore((store) => store.applyQuickPreset);
  const terminalShellRef = useRef<HTMLElement | null>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const previousModeRef = useRef(simulatorState.mode.value);

  const activeSession = getActiveSession(simulatorState);
  const activeShellSession = getActiveShellSession(simulatorState);
  const activeWindow = getActiveWindow(simulatorState);
  const activePane = getActivePane(simulatorState);
  const copyMatchLineSet = new Set(simulatorState.mode.copyMode.matchLineIndices);
  const activeMatchLine =
    simulatorState.mode.copyMode.activeMatchIndex >= 0
      ? simulatorState.mode.copyMode.matchLineIndices[simulatorState.mode.copyMode.activeMatchIndex]
      : -1;
  const presetId = searchParams.get('from');
  const snapshotId = searchParams.get('snapshot');
  const lessonSlug = searchParams.get('lesson');
  const mouseEnabled = simulatorState.tmux.config.mouse;
  const commandBuffer = simulatorState.mode.commandBuffer;
  const commandCursor = simulatorState.mode.commandCursor;
  const commandPreview = `${commandBuffer.slice(0, commandCursor)}|${commandBuffer.slice(commandCursor)}`;
  const modeClass = simulatorState.mode.value.toLowerCase().replace('_', '-');
  const liveAnnouncement = `Mode ${simulatorState.mode.value}. Active pane ${activePane.id}. Panes ${activeWindow.panes.length}.`;
  const isSinglePane = activeWindow.panes.length === 1;

  useEffect(() => {
    if (!hydratedFromStorage) {
      return;
    }

    if (snapshotId) {
      void restoreSnapshotByIdFromStorage(snapshotId).then(() => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('snapshot');
        setSearchParams(nextParams, { replace: true });
      });
      return;
    }

    if (lessonSlug) {
      setRecoveryLessonSlug(lessonSlug);
      void restoreLessonDefaultScenario(lessonSlug).then(() => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('lesson');
        setSearchParams(nextParams, { replace: true });
      });
      return;
    }

    if (!presetId) {
      return;
    }

    applyQuickPreset(presetId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('from');
    setSearchParams(nextParams, { replace: true });
  }, [
    applyQuickPreset,
    hydratedFromStorage,
    lessonSlug,
    presetId,
    restoreLessonDefaultScenario,
    restoreSnapshotByIdFromStorage,
    searchParams,
    setSearchParams,
    snapshotId,
  ]);

  useEffect(() => {
    const previousMode = previousModeRef.current;
    if (simulatorState.mode.value === 'COMMAND_MODE' && previousMode !== 'COMMAND_MODE') {
      commandInputRef.current?.focus();
      commandInputRef.current?.select();
    }

    if (previousMode === 'COMMAND_MODE' && simulatorState.mode.value !== 'COMMAND_MODE') {
      terminalShellRef.current?.focus();
    }

    previousModeRef.current = simulatorState.mode.value;
  }, [simulatorState.mode.value]);

  const sendPrefixed = (key: string) => {
    handleKeyInput(simulatorState.tmux.config.prefixKey);
    handleKeyInput(key);
  };
  const runCommand = () => {
    const command = commandBuffer.trim();
    if (!command) {
      return;
    }
    if (simulatorState.mode.value !== 'COMMAND_MODE') {
      handleKeyInput(simulatorState.tmux.config.prefixKey);
      handleKeyInput(':');
      setCommandBuffer(command);
    }
    handleKeyInput('Enter');
  };

  return (
    <PagePlaceholder
      eyebrow="Practice"
      title="tmux Simulator"
      description="고충실도 tmux 시뮬레이터가 이 영역에 렌더링됩니다."
    >
      <div className="sim-panel">
        <div className="simulated-note" role="note" aria-label="Simulated behavior notice">
          <p>
            <span className="simulated-badge">SIMULATED</span> 실제 tmux 프로세스/셸은 실행되지 않습니다.
          </p>
          <ul className="link-list">
            <li>attach/detach는 개념 모델로 동작합니다.</li>
            <li>copy-mode 검색은 학습용 버퍼 기준으로 동작합니다.</li>
            <li>실제 환경 검증은 Playbook 단계에서 원격 SSH와 함께 확인합니다.</li>
          </ul>
        </div>

        <div className="sim-summary">
          <p>
            <strong>Mode:</strong> {simulatorState.mode.value}
          </p>
          <p>
            <strong>Prefix:</strong> {simulatorState.tmux.config.prefixKey}
          </p>
          <p>
            <strong>Session/Window/Pane:</strong> {activeSession.name} / {activeWindow.name} /{' '}
            {activePane.id}
          </p>
          <p>
            <strong>Panes:</strong> {activeWindow.panes.length} ({activeWindow.layout})
          </p>
          <p>
            <strong>Prompt:</strong> {activeShellSession.workingDirectory} {activeShellSession.prompt}
          </p>
          <p>
            <strong>Repeat Table:</strong> {simulatorState.mode.repeatUntil ? 'active' : 'idle'}
          </p>
          <p>
            <strong>Config:</strong> mouse {mouseEnabled ? 'on' : 'off'} / mode-keys {simulatorState.tmux.config.modeKeys}
          </p>
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic="true" aria-label="Simulator live region">
          {liveAnnouncement}
        </div>

        <section
          className="terminal-shell"
          aria-label="Terminal skin"
          ref={terminalShellRef}
          role="application"
          tabIndex={0}
          onKeyDown={(event) => {
            if (isEditableTarget(event.target)) {
              return;
            }

            const key = normalizeKeyboardEvent(event.nativeEvent);
            handleKeyInput(key);
            event.preventDefault();
            setTimeout(() => {
              terminalShellRef.current?.focus();
            }, 0);
          }}
        >
          <div className="terminal-window-bar">
            {activeSession.windows.map((window) => (
              <span
                key={window.id}
                className={`terminal-window-tab${window.id === activeSession.activeWindowId ? ' is-active' : ''}`}
              >
                {window.name}
              </span>
            ))}
            <span className="terminal-window-meta">session: {activeSession.name}</span>
          </div>

          <div className="terminal-stage">
            <div
              className={`sim-pane-grid${isSinglePane ? ' is-single' : ''}`}
              aria-label="Pane viewport grid"
            >
              {activeWindow.panes.map((pane) => {
                const isActive = pane.id === activeWindow.activePaneId;
                return (
                  <PaneView
                    key={pane.id}
                    pane={pane}
                    isActive={isActive}
                    mouseEnabled={mouseEnabled}
                    copyMatchLineSet={copyMatchLineSet}
                    activeMatchLine={activeMatchLine}
                    onFocusPane={focusPaneById}
                    onScrollPane={scrollPane}
                  />
                );
              })}
            </div>
            <div className="terminal-overlay" aria-live="polite">
              <div className={`terminal-mode-indicator is-${modeClass}`}>
                mode: {simulatorState.mode.value}
                {simulatorState.mode.repeatUntil ? ' (repeat)' : ''}
              </div>
              <form
                className={`terminal-command-overlay${simulatorState.mode.value === 'COMMAND_MODE' ? ' is-active' : ''}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  runCommand();
                }}
              >
                <span className="terminal-command-prefix">:</span>
                <input
                  ref={commandInputRef}
                  className="terminal-command-input"
                  value={commandBuffer}
                  onChange={(event) => setCommandBuffer(event.target.value)}
                  placeholder="new-window, split-window -h, kill-pane"
                  aria-label="Command mode input"
                />
                <button type="submit" className="secondary-btn">
                  Run Command
                </button>
              </form>
              <div className="terminal-command-preview">{commandPreview || '|'}</div>
            </div>
          </div>

          <div className="terminal-status-bar">
            <span>{activeShellSession.workingDirectory} {activeShellSession.prompt}</span>
            <span>mode: {simulatorState.mode.value}</span>
            <span>active-pane: {activePane.id}</span>
            <span>mouse: {mouseEnabled ? 'on' : 'off'}</span>
          </div>
        </section>

        <div className="sim-controls">
          <div className="inline-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => handleKeyInput(simulatorState.tmux.config.prefixKey)}
            >
              Prefix
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => terminalShellRef.current?.focus()}
            >
              Focus Terminal
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('%')}>
              Split Vertical
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('"')}>
              Split Horizontal
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('c')}>
              New Window
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('s')}>
              New Session
            </button>
          </div>

          <div className="inline-actions">
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('h')}>
              Focus Left
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('j')}>
              Focus Down
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('k')}>
              Focus Up
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('l')}>
              Focus Right
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('H')}>
              Resize -X
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('L')}>
              Resize +X
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('K')}>
              Resize -Y
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('J')}>
              Resize +Y
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('n')}>
              Next Window
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('p')}>
              Prev Window
            </button>
            <button type="button" className="secondary-btn" onClick={() => sendPrefixed('[')}>
              Enter Copy Mode
            </button>
            <button type="button" className="secondary-btn" onClick={() => handleKeyInput('Escape')}>
              Exit Mode
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                void saveSnapshotToStorage();
              }}
            >
              Save Snapshot
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                void restoreLatestSnapshotFromStorage();
              }}
            >
              Restore Latest Snapshot
            </button>
            <button type="button" className="secondary-btn" onClick={() => resetSimulator()}>
              Reset Simulator
            </button>
          </div>

          <div className="inline-actions">
            <select
              className="sim-input"
              value={recoverySource}
              onChange={(event) => setRecoverySource(event.target.value as typeof recoverySource)}
              aria-label="Recovery source"
            >
              <option value="latest">latest snapshot</option>
              <option value="lesson-default">lesson default</option>
            </select>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                const normalizedLessonSlug = recoveryLessonSlug.trim();
                if (recoverySource === 'latest') {
                  void restoreLatestSnapshotFromStorage().then((restored) => {
                    if (!restored && normalizedLessonSlug) {
                      void restoreLessonDefaultScenario(normalizedLessonSlug);
                    }
                  });
                  return;
                }

                void restoreLessonDefaultScenario(normalizedLessonSlug || null);
              }}
            >
              Run Recovery
            </button>
            <input
              className="sim-input"
              value={recoveryLessonSlug}
              onChange={(event) => setRecoveryLessonSlug(event.target.value)}
              placeholder="lesson slug (예: copy-search)"
              aria-label="Recovery lesson slug"
            />
            <span className="muted">fallback: latest -&gt; lesson default</span>
          </div>

          <form
            className="inline-actions"
            onSubmit={(event) => {
              event.preventDefault();
              if (!manualKey.trim()) {
                return;
              }
              handleKeyInput(manualKey.trim());
              setManualKey('');
            }}
          >
            <input
              className="sim-input"
              value={manualKey}
              onChange={(event) => setManualKey(event.target.value)}
              placeholder="키 입력 예: C-b, %, c, ["
              aria-label="Manual key input"
            />
            <button type="submit" className="primary-btn">
              Send Key
            </button>
          </form>

          <form
            className="inline-actions"
            onSubmit={(event) => {
              event.preventDefault();
              if (!copySearchQuery.trim()) {
                return;
              }
              runCopySearch(copySearchQuery.trim());
            }}
          >
            <input
              className="sim-input"
              value={copySearchQuery}
              onChange={(event) => setCopySearchQuery(event.target.value)}
              placeholder="Copy mode search query"
              aria-label="Copy mode search query"
            />
            <button type="submit" className="secondary-btn">
              Run Search
            </button>
          </form>

        </div>

        <div className="sim-capture">터미널 영역에 포커스를 두고 키보드 단축키를 입력하세요.</div>

        <div className="sim-log">
          <h2>Sessions</h2>
          <ul className="link-list">
            {simulatorState.tmux.sessions.map((session) => (
              <li key={session.id}>
                {session.id === simulatorState.tmux.activeSessionId ? '● ' : ''}{session.name} (
                {session.windows.length} windows)
              </li>
            ))}
          </ul>

          <h2>Active Window Panes</h2>
          <ul className="link-list">
            {activeWindow.panes.map((pane) => (
              <li key={pane.id}>
                {pane.id === activeWindow.activePaneId ? '● ' : ''}{pane.id} ({pane.width}x{pane.height})
              </li>
            ))}
          </ul>

          <h2>Copy Mode</h2>
          <ul className="link-list">
            <li>query: {simulatorState.mode.copyMode.searchQuery || '(none)'}</li>
            <li>executed: {simulatorState.mode.copyMode.searchExecuted ? 'yes' : 'no'}</li>
            <li>match: {simulatorState.mode.copyMode.lastMatchFound ? 'found' : 'not found'}</li>
            <li>matches: {simulatorState.mode.copyMode.matchLineIndices.length}</li>
            <li>
              active: {simulatorState.mode.copyMode.activeMatchIndex >= 0 ? simulatorState.mode.copyMode.activeMatchIndex + 1 : '(none)'}
            </li>
          </ul>

          <h2>Command Mode</h2>
          <ul className="link-list">
            <li>buffer: {simulatorState.mode.commandBuffer || '(empty)'}</li>
            <li>cursor: {simulatorState.mode.commandCursor}</li>
            <li>supported: new-window, new-session, split-window -h/-v, copy-mode, kill-pane</li>
            <li>config load: tmux source-file .tmux.conf</li>
          </ul>

          <h2>Tmux Config</h2>
          <ul className="link-list">
            <li>source: {simulatorState.tmux.config.lastAppliedSource ?? '(none)'}</li>
            <li>binds: {Object.keys(simulatorState.tmux.config.binds).length}</li>
            <li>errors: {simulatorState.tmux.config.errors.length}</li>
          </ul>

          <h2>Action History</h2>
          <ul className="link-list">
            {simulatorState.actionHistory.slice(-8).reverse().map((log, index) => (
              <li key={`${log}-${index}`}>{log}</li>
            ))}
          </ul>

          <h2>Shell History</h2>
          <ul className="link-list">
            {activeShellSession.history.length === 0 ? (
              <li>(empty)</li>
            ) : (
              activeShellSession.history.slice(-8).reverse().map((command, index) => (
                <li key={`${command}-${index}`}>{command}</li>
              ))
            )}
          </ul>
        </div>
      </div>
    </PagePlaceholder>
  );
}
