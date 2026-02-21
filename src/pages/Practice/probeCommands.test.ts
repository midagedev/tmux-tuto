import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  BASE_PROBE_TRIGGER_COMMAND,
  PROBE_LOOP_START_COMMAND,
  PROBE_TRIGGER_COMMAND,
  SEARCH_PROBE_TRIGGER_COMMAND,
  buildTerminalGeometrySyncCommand,
} from './probeCommands';

function expectValidShellSyntax(command: string) {
  const result = spawnSync('sh', ['-n', '-c', command], { encoding: 'utf-8' });
  expect(result.status).toBe(0);
}

describe('probeCommands', () => {
  it('keeps periodic probe command short and stable', () => {
    expect(PROBE_TRIGGER_COMMAND).toBe(BASE_PROBE_TRIGGER_COMMAND);
    expect(PROBE_LOOP_START_COMMAND).toContain(BASE_PROBE_TRIGGER_COMMAND);
    expect(PROBE_TRIGGER_COMMAND).toContain('TMUXWEB_PROBE:windowName');
    expect(PROBE_TRIGGER_COMMAND).toContain('tmux list-sessions');
    expect(PROBE_TRIGGER_COMMAND).toContain('display-message -p -t');
    expect(PROBE_LOOP_START_COMMAND).not.toContain('TMUXWEB_SEARCH_COUNT');
    expectValidShellSyntax(PROBE_TRIGGER_COMMAND);
  });

  it('builds search probe command with valid shell syntax', () => {
    expectValidShellSyntax(SEARCH_PROBE_TRIGGER_COMMAND);
  });

  it('builds geometry sync command with valid shell syntax', () => {
    const command = buildTerminalGeometrySyncCommand(80, 24);
    expectValidShellSyntax(command);
    expect(command).toContain('stty cols 80 rows 24');
    expect(command).toContain('tmux resize-window -x 80 -y 24');
  });
});
