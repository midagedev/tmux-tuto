import { PagePlaceholder } from '../../components/system/PagePlaceholder';
import { useState } from 'react';
import { getActivePane, getActiveSession, getActiveWindow } from '../../features/simulator/model';
import { useSimulatorStore } from '../../features/simulator/simulatorStore';
import { normalizeKeyboardEvent } from '../../features/simulator/input';

export function PracticePage() {
  const [manualKey, setManualKey] = useState('');
  const simulatorState = useSimulatorStore((store) => store.state);
  const handleKeyInput = useSimulatorStore((store) => store.handleKeyInput);

  const activeSession = getActiveSession(simulatorState);
  const activeWindow = getActiveWindow(simulatorState);
  const activePane = getActivePane(simulatorState);

  return (
    <PagePlaceholder
      eyebrow="Practice"
      title="tmux Simulator"
      description="고충실도 tmux 시뮬레이터가 이 영역에 렌더링됩니다."
    >
      <div className="sim-panel">
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
            <button type="button" className="secondary-btn" onClick={() => handleKeyInput('%')}>
              Split Vertical
            </button>
            <button type="button" className="secondary-btn" onClick={() => handleKeyInput('"')}>
              Split Horizontal
            </button>
            <button type="button" className="secondary-btn" onClick={() => handleKeyInput('c')}>
              New Window
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
