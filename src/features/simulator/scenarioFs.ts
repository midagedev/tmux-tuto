import type { PseudoFileSystem } from './model';

export type ScenarioPresetId = 'single-pane' | 'log-buffer';

export type ScenarioTemplate = {
  id: ScenarioPresetId;
  workingDirectory: string;
  fileSystem: PseudoFileSystem;
  seedLines: string[];
};

const SINGLE_PANE_TEMPLATE: ScenarioTemplate = {
  id: 'single-pane',
  workingDirectory: '/home/user',
  fileSystem: {
    directories: ['/', '/home', '/home/user', '/home/user/logs'],
    files: {
      '/home/user/README.md': 'tmux-tuto practice workspace',
      '/home/user/logs/app.log': 'boot completed\nworker ready\nerror sample line',
    },
  },
  seedLines: ['welcome to tmux simulator', 'log line: server ready', 'error: sample entry'],
};

const LOG_BUFFER_TEMPLATE: ScenarioTemplate = {
  id: 'log-buffer',
  workingDirectory: '/home/user/logs',
  fileSystem: {
    directories: ['/', '/home', '/home/user', '/home/user/logs', '/home/user/tmp'],
    files: {
      '/home/user/README.md': 'copy-mode scenario workspace',
      '/home/user/logs/app.log': [
        '2026-02-17T09:00:00Z INFO boot completed',
        '2026-02-17T09:00:01Z INFO worker ready',
        '2026-02-17T09:01:12Z WARN retrying job sync',
        '2026-02-17T09:03:44Z ERROR payment gateway timeout',
        '2026-02-17T09:03:45Z INFO fallback queue enqueued',
      ].join('\n'),
    },
  },
  seedLines: [
    'log snapshot loaded',
    'ERROR payment gateway timeout',
    'INFO fallback queue enqueued',
  ],
};

const TEMPLATE_BY_ID: Record<ScenarioPresetId, ScenarioTemplate> = {
  'single-pane': SINGLE_PANE_TEMPLATE,
  'log-buffer': LOG_BUFFER_TEMPLATE,
};

function cloneTemplate(template: ScenarioTemplate): ScenarioTemplate {
  return {
    ...template,
    fileSystem: {
      directories: [...template.fileSystem.directories],
      files: { ...template.fileSystem.files },
    },
    seedLines: [...template.seedLines],
  };
}

export function loadScenarioTemplate(scenarioPresetId: string): ScenarioTemplate {
  if (scenarioPresetId in TEMPLATE_BY_ID) {
    return cloneTemplate(TEMPLATE_BY_ID[scenarioPresetId as ScenarioPresetId]);
  }

  return cloneTemplate(SINGLE_PANE_TEMPLATE);
}
