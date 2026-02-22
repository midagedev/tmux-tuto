import { describe, expect, it } from 'vitest';
import {
  evaluateMissionWithVmSnapshot,
  extractCommandFromPromptLine,
  isInternalProbeLine,
  parseProbeMetricFromLine,
  parseProbeStateFromLine,
  parseTmuxActionsFromCommand,
  PROBE_SCROLL_MARKER,
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
  it('detects probe state marker lines', () => {
    expect(isInternalProbeLine('[[TMUXWEB_STATE_V2:1\t1\t1\t1\t0\tmain\t1\t0\tlayout\t0\t0\t0\t0]]')).toBe(true);
  });

  it('does not treat normal tmux command as internal probe', () => {
    expect(isInternalProbeLine('(none):~# tmux -V')).toBe(false);
  });
});

describe('parseProbeStateFromLine', () => {
  it('parses full probe state snapshot with scroll position field', () => {
    expect(parseProbeStateFromLine('[[TMUXWEB_STATE_V2:1\t2\t3\t4\t7\t1\twork\tdev\t1\tbb2d,237x63,0,0,0\t1\t0\t1\t1]]')).toEqual({
      tmux: 1,
      session: 2,
      window: 3,
      pane: 4,
      scrollPosition: 7,
      mode: 1,
      sessionName: 'work',
      windowName: 'dev',
      activeWindow: 1,
      layout: 'bb2d,237x63,0,0,0',
      zoomed: 1,
      sync: 0,
      search: 1,
      searchMatched: 1,
    });
  });

  it('parses full probe state snapshot', () => {
    expect(parseProbeStateFromLine('[[TMUXWEB_STATE_V2:1\t2\t3\t4\t1\twork\tdev\t1\tbb2d,237x63,0,0,0\t1\t0\t1\t1]]')).toEqual({
      tmux: 1,
      session: 2,
      window: 3,
      pane: 4,
      mode: 1,
      sessionName: 'work',
      windowName: 'dev',
      activeWindow: 1,
      layout: 'bb2d,237x63,0,0,0',
      zoomed: 1,
      sync: 0,
      search: 1,
      searchMatched: 1,
    });
  });

  it('parses snapshot when prompt residue prefixes the line', () => {
    expect(parseProbeStateFromLine('tuto@tmux-tuto:~$ [[TMUXWEB_STATE_V2:1\t1\t1\t1\t0\tmain\t1\t0\tlayout\t0\t0\t0\t0]]')).toEqual({
      tmux: 1,
      session: 1,
      window: 1,
      pane: 1,
      mode: 0,
      sessionName: 'main',
      windowName: '1',
      activeWindow: 0,
      layout: 'layout',
      zoomed: 0,
      sync: 0,
      search: 0,
      searchMatched: 0,
    });
  });

  it('ignores embedded echoed state marker command lines', () => {
    const echoedLine =
      'tuto@tmux-tuto:~$ printf "[[TMUXWEB_STATE_V2:%s\\t%s\\t%s]]\\n" "$TMUXWEB_TMUX" "$TMUXWEB_SESSION"';
    expect(parseProbeStateFromLine(echoedLine)).toBeNull();
  });

  it('rejects invalid field counts', () => {
    expect(parseProbeStateFromLine('[[TMUXWEB_STATE_V2:1\t2\t3]]')).toBeNull();
  });

  it('rejects non-numeric numeric fields', () => {
    expect(parseProbeStateFromLine('[[TMUXWEB_STATE_V2:x\t2\t3\t4\t1\twork\tdev\t1\tlayout\t1\t0\t1\t1]]')).toBeNull();
  });
});

describe('parseProbeMetricFromLine', () => {
  it('parses scroll position metric line', () => {
    expect(parseProbeMetricFromLine('[[TMUXWEB_SCROLL_V1:17]]')).toEqual({
      key: 'scrollPosition',
      value: 17,
    });
  });

  it('ignores embedded echoed metric marker command lines', () => {
    const echoedLine = `tuto@tmux-tuto:~$ printf '[[${PROBE_SCROLL_MARKER}:%s]]\\n' "$TMUXWEB_SCROLL"`;
    expect(parseProbeMetricFromLine(echoedLine)).toBeNull();
  });

  it('rejects invalid scroll position metric payloads', () => {
    expect(parseProbeMetricFromLine('[[TMUXWEB_SCROLL_V1:abc]]')).toBeNull();
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

  it('extracts rename action even when rename-window has no explicit name argument', () => {
    const actions = parseTmuxActionsFromCommand('tmux rename-window');
    expect(actions).toContain('sim.window.rename');
  });

  it('extracts actions from bare tmux subcommands entered in command-prompt', () => {
    const actions = parseTmuxActionsFromCommand('rename-window dev');
    expect(actions).toContain('sim.window.rename');
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
        scrollPosition: 0,
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
        scrollPosition: 0,
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
