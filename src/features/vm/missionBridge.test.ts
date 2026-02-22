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

  it('parses window name probe metrics', () => {
    expect(parseProbeMetricFromLine('[[TMUXWEB_PROBE:windowName:dev]]')).toEqual({
      key: 'windowName',
      value: 'dev',
    });
  });

  it('ignores embedded probe markers inside shell command echoes', () => {
    const echoedLine =
      'tuto@tmux-tuto:~$ echo "[[TMUXWEB_PROBE:windowName:$TMUXWEB_WINDOW_NAME]]" >/dev/ttyS1';
    expect(parseProbeMetricFromLine(echoedLine)).toBeNull();
  });

  it('parses probe markers even when escape residue prefixes the line', () => {
    expect(parseProbeMetricFromLine('6n[[TMUXWEB_PROBE:session:1]]')).toEqual({
      key: 'session',
      value: 1,
    });
  });

  it('parses probe markers even when prompt residue trails the line', () => {
    expect(parseProbeMetricFromLine('[[TMUXWEB_PROBE:session:2]]tuto@tmux-tuto:~$')).toEqual({
      key: 'session',
      value: 2,
    });
  });

  it('parses probe markers when shell prompt residue prefixes the line', () => {
    expect(parseProbeMetricFromLine('tuto@tmux-tuto:~$ [[TMUXWEB_PROBE:session:3]]')).toEqual({
      key: 'session',
      value: 3,
    });
  });

  it('parses probe markers embedded in printf command echoes when value is concrete', () => {
    expect(parseProbeMetricFromLine('tuto@tmux-tuto:~$ printf "[[TMUXWEB_PROBE:session:4]]\\n" >/dev/ttyS1')).toEqual({
      key: 'session',
      value: 4,
    });
  });

  it('ignores text probe markers with unresolved placeholders', () => {
    expect(parseProbeMetricFromLine('[[TMUXWEB_PROBE:windowName:%s]]')).toBeNull();
    expect(parseProbeMetricFromLine('[[TMUXWEB_PROBE:windowName:$TMUXWEB_WINDOW_NAME]]')).toBeNull();
  });
});

describe('parseTmuxActionsFromCommand', () => {
  it('extracts advanced tmux actions', () => {
    const actions = parseTmuxActionsFromCommand(
      'tmux join-pane -hb -s :.3 -t :.0; tmux rename-window dev; tmux rename-session -t main work; tmux select-layout even-horizontal; tmux resize-pane -Z; tmux set-window-option synchronize-panes on',
    );

    expect(actions).toContain('sim.pane.join');
    expect(actions).toContain('sim.window.rename');
    expect(actions).toContain('sim.session.rename');
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
        windowName: '1',
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
        windowName: '1',
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
