import { describe, expect, it } from 'vitest';
import { loadScenarioTemplate } from './scenarioFs';

describe('scenarioFs', () => {
  it('loads single-pane template by default fallback', () => {
    const unknown = loadScenarioTemplate('unknown-scenario');
    const single = loadScenarioTemplate('single-pane');

    expect(unknown.id).toBe('single-pane');
    expect(single.fileSystem.files['/home/user/README.md']).toBeDefined();
  });

  it('loads log-buffer template with deterministic log content', () => {
    const logBuffer = loadScenarioTemplate('log-buffer');

    expect(logBuffer.workingDirectory).toBe('/home/user/logs');
    expect(logBuffer.fileSystem.files['/home/user/logs/app.log']).toContain('ERROR payment gateway timeout');
    expect(logBuffer.seedLines.some((line) => line.includes('ERROR'))).toBe(true);
  });
});
