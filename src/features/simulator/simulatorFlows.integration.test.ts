import { beforeEach, describe, expect, it } from 'vitest';
import { getActivePane, getActiveSession, getActiveWindow } from './model';
import { useSimulatorStore } from './simulatorStore';
import { resetDbForTests } from '../storage/db';

function runCommand(command: string) {
  const store = useSimulatorStore.getState();
  store.setMode('COMMAND_MODE');
  store.setCommandBuffer(command);
  store.handleKeyInput('Enter');
}

function getPaneCount() {
  return getActiveWindow(useSimulatorStore.getState().state).panes.length;
}

describe('simulator flow integration', () => {
  beforeEach(async () => {
    await resetDbForTests();
    const store = useSimulatorStore.getState();
    store.reset();
    useSimulatorStore.setState({ hydratedFromStorage: false });
  });

  it('applies shell command output into active pane buffer', () => {
    runCommand('echo "integration-check"');

    const state = useSimulatorStore.getState().state;
    const activePane = getActivePane(state);
    const activeShellSession = state.shell.sessions[0];
    const latestHistory =
      activeShellSession && activeShellSession.history.length > 0
        ? activeShellSession.history[activeShellSession.history.length - 1]
        : undefined;

    expect(activePane.buffer).toContain('integration-check');
    expect(latestHistory).toBe('echo "integration-check"');
  });

  it('applies tmux commands into pane/window/session graph', () => {
    runCommand('split-window -h');
    expect(getPaneCount()).toBe(2);
    expect(getActiveWindow(useSimulatorStore.getState().state).layout).toBe('vertical');

    runCommand('new-window');
    const afterWindow = useSimulatorStore.getState().state;
    expect(getActiveSession(afterWindow).windows.length).toBe(2);

    runCommand('new-session');
    const afterSession = useSimulatorStore.getState().state;
    expect(afterSession.tmux.sessions.length).toBe(2);
  });

  it('restores latest snapshot into simulator state', async () => {
    runCommand('split-window -h');
    expect(getPaneCount()).toBe(2);

    await useSimulatorStore.getState().saveSnapshotToStorage();
    useSimulatorStore.getState().reset();
    expect(getPaneCount()).toBe(1);

    const restored = await useSimulatorStore.getState().restoreLatestSnapshotFromStorage();
    expect(restored).toBe(true);
    expect(getPaneCount()).toBe(2);
  });
});
