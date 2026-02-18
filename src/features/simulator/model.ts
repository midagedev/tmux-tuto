import { appendOutput, createTerminalBuffer, type TerminalBufferState } from './terminalBuffer';
import { loadScenarioTemplate } from './scenarioFs';

export type TmuxMode =
  | 'NORMAL'
  | 'PREFIX_PENDING'
  | 'COMMAND_MODE'
  | 'COPY_MODE'
  | 'SEARCH_MODE';

export type SimulatorMode = TmuxMode;

export type SimulatorLayout = 'single' | 'vertical' | 'horizontal' | 'grid';

export type WorkingDirectory = string;

export type PseudoFileSystem = {
  directories: string[];
  files: Record<string, string>;
};

export type ShellSession = {
  id: string;
  prompt: string;
  workingDirectory: WorkingDirectory;
  history: string[];
  fileSystem: PseudoFileSystem;
};

export type TmuxPane = {
  id: string;
  title: string;
  shellSessionId: string;
  buffer: string[];
  terminal: TerminalBufferState;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TmuxWindow = {
  id: string;
  name: string;
  panes: TmuxPane[];
  activePaneId: string;
  layout: SimulatorLayout;
};

export type TmuxSession = {
  id: string;
  name: string;
  windows: TmuxWindow[];
  activeWindowId: string;
  attached: boolean;
};

export type CopyModeState = {
  searchQuery: string;
  searchExecuted: boolean;
  lastMatchFound: boolean;
};

export type ModeState = {
  value: TmuxMode;
  commandBuffer: string;
  commandCursor: number;
  historyIndex: number | null;
  historyDraft: string;
  copyMode: CopyModeState;
};

export type TmuxConfigState = {
  prefixKey: 'C-b' | 'C-a';
};

export type SimulatorState = {
  scenarioPresetId: string;
  shell: {
    sessions: ShellSession[];
    activeSessionId: string;
  };
  tmux: {
    sessions: TmuxSession[];
    activeSessionId: string;
    config: TmuxConfigState;
  };
  mode: ModeState;
  messages: string[];
  actionHistory: string[];
};

function createId(prefix: string) {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
  return `${prefix}-${random.slice(0, 8)}`;
}

export function createShellSession(scenarioPresetId = 'single-pane'): ShellSession {
  const template = loadScenarioTemplate(scenarioPresetId);

  return {
    id: createId('shell'),
    prompt: '$',
    workingDirectory: template.workingDirectory,
    history: [],
    fileSystem: template.fileSystem,
  };
}

export function createPane(shellSessionId: string, title = 'shell', seedLines?: string[]): TmuxPane {
  const defaultSeedLines = ['welcome to tmux simulator', 'log line: server ready', 'error: sample entry'];
  const lines = seedLines && seedLines.length > 0 ? seedLines : defaultSeedLines;
  const seededTerminal = appendOutput(
    createTerminalBuffer({
      width: 80,
      height: 24,
      scrollbackLimit: 3000,
    }),
    lines.join('\n'),
  );

  return {
    id: createId('pane'),
    title,
    shellSessionId,
    buffer: lines,
    terminal: seededTerminal,
    x: 0,
    y: 0,
    width: 80,
    height: 24,
  };
}

export function createWindow(shellSessionId: string, name = '1', seedLines?: string[]): TmuxWindow {
  const firstPane = createPane(shellSessionId, 'shell', seedLines);

  return {
    id: createId('window'),
    name,
    panes: [firstPane],
    activePaneId: firstPane.id,
    layout: 'single',
  };
}

export function createSession(shellSessionId: string, name = 'main', seedLines?: string[]): TmuxSession {
  const firstWindow = createWindow(shellSessionId, '1', seedLines);

  return {
    id: createId('session'),
    name,
    windows: [firstWindow],
    activeWindowId: firstWindow.id,
    attached: true,
  };
}

export function createInitialSimulatorState(options?: { scenarioPresetId?: string }): SimulatorState {
  const template = loadScenarioTemplate(options?.scenarioPresetId ?? 'single-pane');
  const shellSession = createShellSession(template.id);
  const tmuxSession = createSession(shellSession.id, 'main', template.seedLines);

  return {
    scenarioPresetId: template.id,
    shell: {
      sessions: [shellSession],
      activeSessionId: shellSession.id,
    },
    tmux: {
      sessions: [tmuxSession],
      activeSessionId: tmuxSession.id,
      config: {
        prefixKey: 'C-b',
      },
    },
    mode: {
      value: 'NORMAL',
      commandBuffer: '',
      commandCursor: 0,
      historyIndex: null,
      historyDraft: '',
      copyMode: {
        searchQuery: '',
        searchExecuted: false,
        lastMatchFound: false,
      },
    },
    messages: ['Simulator initialized'],
    actionHistory: [],
  };
}

export function getActiveShellSession(state: SimulatorState) {
  return state.shell.sessions.find((session) => session.id === state.shell.activeSessionId) ?? state.shell.sessions[0];
}

export function getActiveSession(state: SimulatorState) {
  return state.tmux.sessions.find((session) => session.id === state.tmux.activeSessionId) ?? state.tmux.sessions[0];
}

export function getActiveWindow(state: SimulatorState) {
  const session = getActiveSession(state);
  return session.windows.find((window) => window.id === session.activeWindowId) ?? session.windows[0];
}

export function getActivePane(state: SimulatorState) {
  const window = getActiveWindow(state);
  return window.panes.find((pane) => pane.id === window.activePaneId) ?? window.panes[0];
}
