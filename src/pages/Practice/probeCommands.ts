export const PROBE_STATE_MARKER = 'TMUXWEB_STATE_V2';
export const PROBE_SCROLL_MARKER = 'TMUXWEB_SCROLL_V1';

// Keep probe dispatch short and deterministic over the ttyS2 relay.
// Runtime probe shape is defined by /usr/bin/tmux-tuto-probe inside VM assets.
export const BASE_PROBE_TRIGGER_COMMAND = '/usr/bin/tmux-tuto-probe >/dev/ttyS1 2>/dev/null';

export const SEARCH_PROBE_TRIGGER_COMMAND = BASE_PROBE_TRIGGER_COMMAND;

export const SCROLL_PROBE_TRIGGER_COMMAND =
  `TMUXWEB_SCROLL="$(tmux display-message -p '#{?pane_in_mode,#{scroll_position},0}' 2>/dev/null | tr -d ' \\t\\n\\r')"; ` +
  'case "$TMUXWEB_SCROLL" in ""|*[!0-9-]*) TMUXWEB_SCROLL=0 ;; esac; ' +
  'if [ "$TMUXWEB_SCROLL" -eq 0 ]; then ' +
  `TMUXWEB_HISTORY="$(tmux display-message -p '#{?pane_in_mode,#{history_size},0}' 2>/dev/null | tr -d ' \\t\\n\\r')"; ` +
  'case "$TMUXWEB_HISTORY" in ""|*[!0-9-]*) TMUXWEB_HISTORY=0 ;; esac; ' +
  'if [ "$TMUXWEB_HISTORY" -gt 0 ]; then TMUXWEB_SCROLL=1; fi; ' +
  'fi; ' +
  `printf '[[${PROBE_SCROLL_MARKER}:%s]]\\n' "$TMUXWEB_SCROLL" >/dev/ttyS1`;

// Keep the periodic probe command short to avoid noisy shell output on first boot.
export const PROBE_TRIGGER_COMMAND = BASE_PROBE_TRIGGER_COMMAND;

export const PROBE_LOOP_START_COMMAND = `if [ -z "\${TMUXWEB_PROBE_LOOP_PID:-}" ] || ! kill -0 "\${TMUXWEB_PROBE_LOOP_PID}" 2>/dev/null; then (while true; do ${PROBE_TRIGGER_COMMAND}; sleep 0.5; done) </dev/null >/dev/null 2>&1 & TMUXWEB_PROBE_LOOP_PID=$!; export TMUXWEB_PROBE_LOOP_PID; fi`;

export const PROBE_LOOP_STOP_COMMAND =
  'if [ -n "${TMUXWEB_PROBE_LOOP_PID:-}" ]; then kill "${TMUXWEB_PROBE_LOOP_PID}" 2>/dev/null || true; unset TMUXWEB_PROBE_LOOP_PID; fi';

export function buildTerminalGeometrySyncCommand(cols: number, rows: number) {
  return `stty cols ${cols} rows ${rows} 2>/dev/null; tmux resize-window -x ${cols} -y ${rows} 2>/dev/null || true`;
}
