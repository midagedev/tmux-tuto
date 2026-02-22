export const PROBE_STATE_MARKER = 'TMUXWEB_STATE_V2';

const PROBE_STATE_TRIGGER_LINES = [
  'TMUXWEB_TMUX=0',
  'if tmux -V >/dev/null 2>&1; then TMUXWEB_TMUX=1; fi',
  'TMUXWEB_SESSION=-1',
  'TMUXWEB_WINDOW=-1',
  'TMUXWEB_PANE=-1',
  'TMUXWEB_MODE=0',
  'TMUXWEB_SESSION_NAME=""',
  'TMUXWEB_WINDOW_NAME=""',
  'TMUXWEB_ACTIVE_WINDOW=-1',
  'TMUXWEB_LAYOUT=""',
  'TMUXWEB_ZOOMED=0',
  'TMUXWEB_SYNC=0',
  'TMUXWEB_SEARCH=0',
  'TMUXWEB_SEARCH_MATCHED=0',
  'if [ "$TMUXWEB_TMUX" -eq 1 ]; then',
  'TMUXWEB_SESSION="$(tmux list-sessions -F \'#{session_id}\' 2>/dev/null | wc -l | tr -d \' \\n\\r\')"',
  'if [ -z "${TMUXWEB_SESSION:-}" ]; then TMUXWEB_SESSION=-1; fi',
  'TMUXWEB_WINDOW="$(tmux list-windows -a -F \'#{window_id}\' 2>/dev/null | wc -l | tr -d \' \\n\\r\')"',
  'if [ -z "${TMUXWEB_WINDOW:-}" ]; then TMUXWEB_WINDOW=-1; fi',
  'TMUXWEB_PANE="$(tmux list-panes -a -F \'#{pane_id}\' 2>/dev/null | wc -l | tr -d \' \\n\\r\')"',
  'if [ -z "${TMUXWEB_PANE:-}" ]; then TMUXWEB_PANE=-1; fi',
  'TMUXWEB_MODE="$(tmux display-message -p \'#{?pane_in_mode,1,0}\' 2>/dev/null | tr -d \' \\n\\r\')"',
  'if [ -z "${TMUXWEB_MODE:-}" ]; then TMUXWEB_MODE=0; fi',
  'TMUXWEB_SESSION_NAME="$(tmux display-message -p \'#S\' 2>/dev/null | tr -d \'\\n\\r\\t\')"',
  'if [ -z "${TMUXWEB_SESSION_NAME:-}" ]; then TMUXWEB_SESSION_NAME="$(tmux list-sessions -F \'#{session_name}\' 2>/dev/null | head -n 1 | tr -d \'\\n\\r\\t\')"; fi',
  'TMUXWEB_WINDOW_NAME="$(tmux display-message -p \'#W\' 2>/dev/null | tr -d \'\\n\\r\\t\')"',
  'if [ -z "${TMUXWEB_WINDOW_NAME:-}" ] && [ -n "${TMUXWEB_SESSION_NAME:-}" ]; then TMUXWEB_WINDOW_NAME="$(tmux display-message -p -t "${TMUXWEB_SESSION_NAME}" \'#{window_name}\' 2>/dev/null | tr -d \'\\n\\r\\t\')"; fi',
  'TMUXWEB_ACTIVE_WINDOW="$(tmux display-message -p \'#{window_index}\' 2>/dev/null | tr -d \' \\n\\r\')"',
  'if [ -z "${TMUXWEB_ACTIVE_WINDOW:-}" ]; then TMUXWEB_ACTIVE_WINDOW=-1; fi',
  'TMUXWEB_LAYOUT="$(tmux display-message -p \'#{window_layout}\' 2>/dev/null | tr -d \'\\n\\r\\t\')"',
  'TMUXWEB_ZOOMED="$(tmux display-message -p \'#{window_zoomed_flag}\' 2>/dev/null | tr -d \' \\n\\r\')"',
  'if [ -z "${TMUXWEB_ZOOMED:-}" ]; then TMUXWEB_ZOOMED=0; fi',
  'TMUXWEB_SYNC_RAW="$(tmux show-window-options -v synchronize-panes 2>/dev/null | tr -d \'\\n\\r\')"',
  'if [ "${TMUXWEB_SYNC_RAW:-off}" = "on" ]; then TMUXWEB_SYNC=1; else TMUXWEB_SYNC=0; fi',
  'TMUXWEB_SEARCH_COUNT="$(tmux display-message -p \'#{search_count}\' 2>/dev/null | tr -d \' \\n\\r\')"',
  'TMUXWEB_SEARCH_PRESENT="$(tmux display-message -p \'#{search_present}\' 2>/dev/null | tr -d \' \\n\\r\')"',
  'if [ -n "${TMUXWEB_SEARCH_COUNT:-}" ] && [ "${TMUXWEB_SEARCH_COUNT}" -ge 1 ] 2>/dev/null; then TMUXWEB_SEARCH=1; if [ "${TMUXWEB_SEARCH_PRESENT:-0}" = "1" ]; then TMUXWEB_SEARCH_MATCHED=1; fi; fi',
  'fi',
  `printf "[[${PROBE_STATE_MARKER}:%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s]]\\n" "$TMUXWEB_TMUX" "$TMUXWEB_SESSION" "$TMUXWEB_WINDOW" "$TMUXWEB_PANE" "$TMUXWEB_MODE" "$TMUXWEB_SESSION_NAME" "$TMUXWEB_WINDOW_NAME" "$TMUXWEB_ACTIVE_WINDOW" "$TMUXWEB_LAYOUT" "$TMUXWEB_ZOOMED" "$TMUXWEB_SYNC" "$TMUXWEB_SEARCH" "$TMUXWEB_SEARCH_MATCHED" >/dev/ttyS1`,
];

export const BASE_PROBE_TRIGGER_COMMAND = PROBE_STATE_TRIGGER_LINES.join('\n');

export const SEARCH_PROBE_TRIGGER_COMMAND = BASE_PROBE_TRIGGER_COMMAND;

// Keep the periodic probe command short to avoid noisy shell output on first boot.
export const PROBE_TRIGGER_COMMAND = BASE_PROBE_TRIGGER_COMMAND;

export const PROBE_LOOP_START_COMMAND = `if [ -z "\${TMUXWEB_PROBE_LOOP_PID:-}" ] || ! kill -0 "\${TMUXWEB_PROBE_LOOP_PID}" 2>/dev/null; then (while true; do ${PROBE_TRIGGER_COMMAND}; sleep 0.5; done) </dev/null >/dev/null 2>&1 & TMUXWEB_PROBE_LOOP_PID=$!; export TMUXWEB_PROBE_LOOP_PID; fi`;

export const PROBE_LOOP_STOP_COMMAND =
  'if [ -n "${TMUXWEB_PROBE_LOOP_PID:-}" ]; then kill "${TMUXWEB_PROBE_LOOP_PID}" 2>/dev/null || true; unset TMUXWEB_PROBE_LOOP_PID; fi';

export function buildTerminalGeometrySyncCommand(cols: number, rows: number) {
  return `stty cols ${cols} rows ${rows} 2>/dev/null; tmux resize-window -x ${cols} -y ${rows} 2>/dev/null || true`;
}
