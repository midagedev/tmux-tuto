import type { SimulatorAction } from './reducer';
import type { SimulatorState } from './model';

function action(type: SimulatorAction['type'], payload?: unknown): SimulatorAction {
  if (payload === undefined) {
    return { type } as SimulatorAction;
  }

  return { type, payload } as SimulatorAction;
}

export function normalizeKeyboardEvent(event: KeyboardEvent) {
  if (event.ctrlKey && event.key.toLowerCase() === 'b') {
    return 'C-b';
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'a') {
    return 'C-a';
  }

  if (event.key === 'Escape') {
    return 'Escape';
  }

  if (event.key === 'Enter') {
    return 'Enter';
  }

  if (event.key === 'Backspace') {
    return 'Backspace';
  }

  if (event.key.length === 1) {
    return event.key;
  }

  return event.key;
}

function resolvePrefixKey(key: string): SimulatorAction[] {
  const prefixTail: SimulatorAction[] = [action('SET_MODE', 'NORMAL')];

  switch (key) {
    case '%':
      return [action('SPLIT_PANE', 'vertical'), ...prefixTail];
    case '"':
      return [action('SPLIT_PANE', 'horizontal'), ...prefixTail];
    case 'h':
      return [action('FOCUS_PANE', 'left'), ...prefixTail];
    case 'j':
      return [action('FOCUS_PANE', 'down'), ...prefixTail];
    case 'k':
      return [action('FOCUS_PANE', 'up'), ...prefixTail];
    case 'l':
      return [action('FOCUS_PANE', 'right'), ...prefixTail];
    case 'H':
      return [action('RESIZE_PANE', { axis: 'x', delta: -5 }), ...prefixTail];
    case 'L':
      return [action('RESIZE_PANE', { axis: 'x', delta: 5 }), ...prefixTail];
    case 'K':
      return [action('RESIZE_PANE', { axis: 'y', delta: -2 }), ...prefixTail];
    case 'J':
      return [action('RESIZE_PANE', { axis: 'y', delta: 2 }), ...prefixTail];
    case 'c':
      return [action('NEW_WINDOW'), ...prefixTail];
    case 'n':
      return [action('NEXT_WINDOW'), ...prefixTail];
    case 'p':
      return [action('PREV_WINDOW'), ...prefixTail];
    case 's':
      return [action('NEW_SESSION'), ...prefixTail];
    case '[':
      return [action('ENTER_COPY_MODE'), ...prefixTail];
    case ':':
      return [action('CLEAR_COMMAND_BUFFER'), action('SET_MODE', 'COMMAND_MODE')];
    case 'd':
      return [action('ADD_MESSAGE', 'Detached (simulated)'), ...prefixTail];
    default:
      return [
        action('ADD_MESSAGE', `Unmapped prefix key: ${key}`),
        action('RECORD_ACTION', 'sim.key.unmapped'),
        ...prefixTail,
      ];
  }
}

function resolveCommandMode(state: SimulatorState, key: string): SimulatorAction[] {
  if (key === 'Escape') {
    return [action('CLEAR_COMMAND_BUFFER'), action('SET_MODE', 'NORMAL')];
  }

  if (key === 'Backspace') {
    return [action('SET_COMMAND_BUFFER', state.commandBuffer.slice(0, -1))];
  }

  if (key === 'Enter') {
    return [
      action('EXECUTE_COMMAND', state.commandBuffer),
      action('CLEAR_COMMAND_BUFFER'),
      action('SET_MODE', 'NORMAL'),
    ];
  }

  if (key.length === 1) {
    return [action('SET_COMMAND_BUFFER', `${state.commandBuffer}${key}`)];
  }

  return [];
}

function resolveCopyMode(state: SimulatorState, key: string): SimulatorAction[] {
  if (key === 'Escape') {
    return [action('EXIT_COPY_MODE')];
  }

  if (key === '/') {
    return [action('RUN_COPY_SEARCH', state.copyMode.searchQuery || 'error')];
  }

  if (key.length === 1 && key !== state.prefixKey) {
    return [action('RUN_COPY_SEARCH', key)];
  }

  return [];
}

export function resolveSimulatorInput(state: SimulatorState, key: string): SimulatorAction[] {
  if (!key) {
    return [];
  }

  if (state.mode === 'COMMAND_MODE') {
    return resolveCommandMode(state, key);
  }

  if (state.mode === 'COPY_MODE' || state.mode === 'SEARCH_MODE') {
    return resolveCopyMode(state, key);
  }

  if (state.mode === 'PREFIX_PENDING') {
    return resolvePrefixKey(key);
  }

  if (key === state.prefixKey) {
    return [action('SET_MODE', 'PREFIX_PENDING')];
  }

  return [action('RECORD_ACTION', `sim.key.raw.${key}`)];
}
