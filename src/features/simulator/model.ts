export type SimulatorMode =
  | 'NORMAL'
  | 'PREFIX_PENDING'
  | 'COMMAND_MODE'
  | 'COPY_MODE'
  | 'SEARCH_MODE';

export type SimulatorLayout = 'single' | 'vertical' | 'horizontal' | 'grid';

export type SimPane = {
  id: string;
  title: string;
  buffer: string[];
  width: number;
  height: number;
};

export type SimWindow = {
  id: string;
  name: string;
  panes: SimPane[];
  activePaneId: string;
  layout: SimulatorLayout;
};

export type SimSession = {
  id: string;
  name: string;
  windows: SimWindow[];
  activeWindowId: string;
  attached: boolean;
};

export type CopyModeState = {
  searchQuery: string;
  searchExecuted: boolean;
  lastMatchFound: boolean;
};

export type SimulatorState = {
  sessions: SimSession[];
  activeSessionId: string;
  mode: SimulatorMode;
  prefixKey: 'C-b' | 'C-a';
  commandBuffer: string;
  copyMode: CopyModeState;
  messages: string[];
  actionHistory: string[];
};

function createId(prefix: string) {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
  return `${prefix}-${random.slice(0, 8)}`;
}

export function createPane(title = 'shell'): SimPane {
  return {
    id: createId('pane'),
    title,
    buffer: ['welcome to tmux simulator', 'log line: server ready', 'error: sample entry'],
    width: 80,
    height: 24,
  };
}

export function createWindow(name = '1'): SimWindow {
  const firstPane = createPane();

  return {
    id: createId('window'),
    name,
    panes: [firstPane],
    activePaneId: firstPane.id,
    layout: 'single',
  };
}

export function createSession(name = 'main'): SimSession {
  const firstWindow = createWindow('1');

  return {
    id: createId('session'),
    name,
    windows: [firstWindow],
    activeWindowId: firstWindow.id,
    attached: true,
  };
}

export function createInitialSimulatorState(): SimulatorState {
  const session = createSession('main');

  return {
    sessions: [session],
    activeSessionId: session.id,
    mode: 'NORMAL',
    prefixKey: 'C-b',
    commandBuffer: '',
    copyMode: {
      searchQuery: '',
      searchExecuted: false,
      lastMatchFound: false,
    },
    messages: ['Simulator initialized'],
    actionHistory: [],
  };
}

export function getActiveSession(state: SimulatorState) {
  return state.sessions.find((session) => session.id === state.activeSessionId) ?? state.sessions[0];
}

export function getActiveWindow(state: SimulatorState) {
  const session = getActiveSession(state);
  return session.windows.find((window) => window.id === session.activeWindowId) ?? session.windows[0];
}

export function getActivePane(state: SimulatorState) {
  const window = getActiveWindow(state);
  return window.panes.find((pane) => pane.id === window.activePaneId) ?? window.panes[0];
}
