import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useEffect, useState } from 'react';
import { getActivePane, getActiveSession, getActiveWindow } from '../../features/simulator/model';
import { useSimulatorStore } from '../../features/simulator/simulatorStore';
import { normalizeKeyboardEvent } from '../../features/simulator/input';
import { useSearchParams } from 'react-router-dom';

export function PracticePage() {
  const [manualKey, setManualKey] = useState('');
  const [copySearchQuery, setCopySearchQuery] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const simulatorState = useSimulatorStore((store) => store.state);
  const handleKeyInput = useSimulatorStore((store) => store.handleKeyInput);
  const runCopySearch = useSimulatorStore((store) => store.runCopySearch);
  const saveSnapshotToStorage = useSimulatorStore((store) => store.saveSnapshotToStorage);
  const restoreLatestSnapshotFromStorage = useSimulatorStore(
    (store) => store.restoreLatestSnapshotFromStorage,
  );
  const resetSimulator = useSimulatorStore((store) => store.reset);
  const applyQuickPreset = useSimulatorStore((store) => store.applyQuickPreset);

  const activeSession = getActiveSession(simulatorState);
  const activeWindow = getActiveWindow(simulatorState);
  const activePane = getActivePane(simulatorState);
  const presetId = searchParams.get('from');

  useEffect(() => {
    if (!presetId) {
      return;
    }

    applyQuickPreset(presetId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('from');
    setSearchParams(nextParams, { replace: true });
  }, [applyQuickPreset, presetId, searchParams, setSearchParams]);
  const sendPrefixed = (key: string) => {
    handleKeyInput(simulatorState.prefixKey);
    handleKeyInput(key);
  };
  const runCommand = () => {
    const command = commandInput.trim();
    if (!command) {
      return;
    }
    handleKeyInput(simulatorState.prefixKey);
    handleKeyInput(':');
    command.split('').forEach((char) => handleKeyInput(char));
    handleKeyInput('Enter');
    setCommandInput('');
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
            <strong>Mode:</strong> {simulatorState.mode}
          </p>
          <p>
            <strong>Prefix:</strong> {simulatorState.prefixKey}
          </p>
          <p>
            <strong>Session/Window/Pane:</strong> {activeSession.name} / {activeWindow.name} /{' '}
            {activePane.id}
          </p>
          <p>
            <strong>Panes:</strong> {activeWindow.panes.length} ({activeWindow.layout})
          </p>
        </div>

        <div className="sim-controls">
          <div className="inline-actions">
            <button type="button" className="secondary-btn" onClick={() => handleKeyInput(simulatorState.prefixKey)}>
              Prefix
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

          <form
            className="inline-actions"
            onSubmit={(event) => {
              event.preventDefault();
              runCommand();
            }}
          >
            <input
              className="sim-input"
              value={commandInput}
              onChange={(event) => setCommandInput(event.target.value)}
              placeholder="명령 예: new-window, split-window -h, kill-pane"
              aria-label="Command mode input"
            />
            <button type="submit" className="secondary-btn">
              Run Command
            </button>
          </form>
        </div>

        <div
          className="sim-capture"
          role="application"
          tabIndex={0}
          onKeyDown={(event) => {
            const key = normalizeKeyboardEvent(event.nativeEvent);
            handleKeyInput(key);
            event.preventDefault();
          }}
        >
          키보드 캡처 영역 (클릭 후 단축키 입력)
        </div>

        <div className="sim-log">
          <h2>Sessions</h2>
          <ul className="link-list">
            {simulatorState.sessions.map((session) => (
              <li key={session.id}>
                {session.id === simulatorState.activeSessionId ? '● ' : ''}{session.name} (
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
            <li>query: {simulatorState.copyMode.searchQuery || '(none)'}</li>
            <li>executed: {simulatorState.copyMode.searchExecuted ? 'yes' : 'no'}</li>
            <li>match: {simulatorState.copyMode.lastMatchFound ? 'found' : 'not found'}</li>
          </ul>

          <h2>Command Mode</h2>
          <ul className="link-list">
            <li>buffer: {simulatorState.commandBuffer || '(empty)'}</li>
            <li>supported: new-window, new-session, split-window -h/-v, copy-mode, kill-pane</li>
          </ul>

          <h2>Action History</h2>
          <ul className="link-list">
            {simulatorState.actionHistory.slice(-8).reverse().map((log, index) => (
              <li key={`${log}-${index}`}>{log}</li>
            ))}
          </ul>
        </div>
      </div>
    </PagePlaceholder>
  );
}
