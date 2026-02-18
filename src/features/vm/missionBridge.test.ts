import { describe, expect, it } from 'vitest';
import {
  evaluateMissionWithVmSnapshot,
  extractCommandFromPromptLine,
  isInternalProbeLine,
  parseProbeMetricFromLine,
  parseTmuxActionsFromCommand,
} from './missionBridge';

describe('extractCommandFromPromptLine', () => {
  it('extracts a normal shell command', () => {
    const result = extractCommandFromPromptLine('(none):~# tmux -V');
    expect(result).toBe('tmux -V');
  });

  it('ignores internal probe command even when line is wrapped', () => {
    const result = extractCommandFromPromptLine('(none):~# TMUXWEB_TMUX=0; tmux -V >/dev/null 2>&1 && TMUXWEB_TMUX=1');
    expect(result).toBeNull();
  });
});

describe('isInternalProbeLine', () => {
  it('detects probe metric markers', () => {
    expect(isInternalProbeLine('[[TMUXWEB_PROBE:session:1]]')).toBe(true);
  });

  it('does not treat normal tmux command as internal probe', () => {
    expect(isInternalProbeLine('(none):~# tmux -V')).toBe(false);
  });
});

describe('parseProbeMetricFromLine', () => {
  it('parses numeric probe metrics', () => {
    expect(parseProbeMetricFromLine('[[TMUXWEB_PROBE:zoomed:1]]')).toEqual({
      key: 'zoomed',
      value: 1,
    });
  });

  it('parses text probe metrics', () => {
    expect(parseProbeMetricFromLine('[[TMUXWEB_PROBE:layout:bb2d,237x63,0,0,0]]')).toEqual({
      key: 'layout',
      value: 'bb2d,237x63,0,0,0',
    });
  });
});

describe('parseTmuxActionsFromCommand', () => {
  it('extracts advanced tmux actions', () => {
    const actions = parseTmuxActionsFromCommand(
      'tmux select-layout even-horizontal; tmux resize-pane -Z; tmux set-window-option synchronize-panes on',
    );

    expect(actions).toContain('sim.layout.select');
    expect(actions).toContain('sim.pane.resize');
    expect(actions).toContain('sim.pane.zoom.toggle');
    expect(actions).toContain('sim.panes.sync.toggle');
  });
});

describe('evaluateMissionWithVmSnapshot', () => {
  it('treats null metric values as incomplete, not manual', () => {
    const result = evaluateMissionWithVmSnapshot(
      {
        id: 'm1',
        lessonSlug: 'copy-search',
        slug: 'copy-mode-search-keyword',
        title: 'Copy mode search',
        type: 'state-check',
        difficulty: 'advanced',
        initialScenario: 'log-buffer',
        passRules: [{ kind: 'modeIs', operator: 'equals', value: 'COPY_MODE' }],
        hints: [],
      },
      {
        sessionCount: 1,
        windowCount: 1,
        paneCount: 1,
        modeIs: null,
        sessionName: 'main',
        activeWindowIndex: 0,
        windowLayout: null,
        windowZoomed: false,
        paneSynchronized: false,
        searchExecuted: null,
        searchMatchFound: null,
        actionHistory: [],
        commandHistory: [],
      },
    );

    expect(result.status).toBe('incomplete');
    expect(result.unsupportedKinds).toEqual([]);
  });

  it('keeps unknown rule kinds as manual', () => {
    const result = evaluateMissionWithVmSnapshot(
      {
        id: 'm2',
        lessonSlug: 'custom',
        slug: 'unknown-rule',
        title: 'Unknown rule kind',
        type: 'state-check',
        difficulty: 'beginner',
        initialScenario: 'single-pane',
        passRules: [{ kind: 'totallyUnknownKind', operator: 'equals', value: 1 }],
        hints: [],
      },
      {
        sessionCount: 1,
        windowCount: 1,
        paneCount: 1,
        modeIs: 'NORMAL',
        sessionName: 'main',
        activeWindowIndex: 0,
        windowLayout: null,
        windowZoomed: false,
        paneSynchronized: false,
        searchExecuted: false,
        searchMatchFound: false,
        actionHistory: [],
        commandHistory: [],
      },
    );

    expect(result.status).toBe('manual');
    expect(result.unsupportedKinds).toEqual(['totallyUnknownKind']);
  });
});
