export const BASE_PROBE_TRIGGER_COMMAND = [
  '/usr/bin/tmux-tuto-probe >/dev/ttyS1 2>/dev/null',
  'TMUXWEB_SESSION_COUNT="$( (tmux list-sessions -F \'#{session_id}\' 2>/dev/null || TMUX= tmux list-sessions -F \'#{session_id}\' 2>/dev/null) | wc -l | tr -d \' \\n\\r\')"',
  'if [ -n "${TMUXWEB_SESSION_COUNT:-}" ]; then printf "[[TMUXWEB_PROBE:session:%s]]\\n" "${TMUXWEB_SESSION_COUNT}" >/dev/ttyS1; fi',
  'TMUXWEB_WINDOW_COUNT="$( (tmux list-windows -a -F \'#{window_id}\' 2>/dev/null || TMUX= tmux list-windows -a -F \'#{window_id}\' 2>/dev/null) | wc -l | tr -d \' \\n\\r\')"',
  'if [ -n "${TMUXWEB_WINDOW_COUNT:-}" ]; then printf "[[TMUXWEB_PROBE:window:%s]]\\n" "${TMUXWEB_WINDOW_COUNT}" >/dev/ttyS1; fi',
  'TMUXWEB_SESSION_NAME="$(tmux display-message -p \'#S\' 2>/dev/null | tr -d \'\\n\\r\')"',
  'if [ -z "${TMUXWEB_SESSION_NAME:-}" ]; then TMUXWEB_SESSION_NAME="$(TMUX= tmux display-message -p \'#S\' 2>/dev/null | tr -d \'\\n\\r\')"; fi',
  'if [ -z "${TMUXWEB_SESSION_NAME:-}" ]; then TMUXWEB_SESSION_NAME="$( (tmux list-sessions -F \'#{session_name}\' 2>/dev/null || TMUX= tmux list-sessions -F \'#{session_name}\' 2>/dev/null) | tail -n 1 | tr -d \'\\n\\r\')"; fi',
  'printf "[[TMUXWEB_PROBE:sessionName:%s]]\\n" "${TMUXWEB_SESSION_NAME:-}" >/dev/ttyS1',
  'TMUXWEB_WINDOW_NAME="$(tmux display-message -p \'#W\' 2>/dev/null | tr -d \'\\n\\r\')"',
  'if [ -z "${TMUXWEB_WINDOW_NAME:-}" ]; then TMUXWEB_WINDOW_NAME="$(TMUX= tmux display-message -p \'#W\' 2>/dev/null | tr -d \'\\n\\r\')"; fi',
  'if [ -z "${TMUXWEB_WINDOW_NAME:-}" ] && [ -n "${TMUXWEB_SESSION_NAME:-}" ]; then TMUXWEB_WINDOW_NAME="$(tmux display-message -p -t "${TMUXWEB_SESSION_NAME}" \'#{window_name}\' 2>/dev/null | tr -d \'\\n\\r\')"; fi',
  'if [ -z "${TMUXWEB_WINDOW_NAME:-}" ] && [ -n "${TMUXWEB_SESSION_NAME:-}" ]; then TMUXWEB_WINDOW_NAME="$(TMUX= tmux display-message -p -t "${TMUXWEB_SESSION_NAME}" \'#{window_name}\' 2>/dev/null | tr -d \'\\n\\r\')"; fi',
  'printf "[[TMUXWEB_PROBE:windowName:%s]]\\n" "${TMUXWEB_WINDOW_NAME:-}" >/dev/ttyS1',
].join('; ');

const SEARCH_PROBE_TRIGGER_LINES = [
  'TMUXWEB_SEARCH_COUNT="$(tmux display-message -p \'#{search_count}\' 2>/dev/null | tr -d \' \')"',
  'TMUXWEB_SEARCH_PRESENT="$(tmux display-message -p \'#{search_present}\' 2>/dev/null | tr -d \' \')"',
  'if [ -n "${TMUXWEB_SEARCH_COUNT:-}" ] && [ "${TMUXWEB_SEARCH_COUNT}" -ge 1 ] 2>/dev/null; then',
  'TMUXWEB_SEARCH_MATCHED=0',
  'if [ "${TMUXWEB_SEARCH_PRESENT:-0}" = "1" ]; then TMUXWEB_SEARCH_MATCHED=1; fi',
  'printf "[[TMUXWEB_PROBE:search:1]]\\n[[TMUXWEB_PROBE:searchMatched:%s]]\\n" "${TMUXWEB_SEARCH_MATCHED}" >/dev/ttyS1',
  'else',
  'printf "[[TMUXWEB_PROBE:search:0]]\\n[[TMUXWEB_PROBE:searchMatched:0]]\\n" >/dev/ttyS1',
  'fi',
];

export const SEARCH_PROBE_TRIGGER_COMMAND = SEARCH_PROBE_TRIGGER_LINES.join('\n');

// Keep the periodic probe command short to avoid noisy shell output on first boot.
export const PROBE_TRIGGER_COMMAND = BASE_PROBE_TRIGGER_COMMAND;

export const PROBE_LOOP_START_COMMAND = `if [ -z "\${TMUXWEB_PROBE_LOOP_PID:-}" ] || ! kill -0 "\${TMUXWEB_PROBE_LOOP_PID}" 2>/dev/null; then (while true; do ${PROBE_TRIGGER_COMMAND}; sleep 0.5; done) </dev/null >/dev/null 2>&1 & TMUXWEB_PROBE_LOOP_PID=$!; export TMUXWEB_PROBE_LOOP_PID; fi`;

export const PROBE_LOOP_STOP_COMMAND =
  'if [ -n "${TMUXWEB_PROBE_LOOP_PID:-}" ]; then kill "${TMUXWEB_PROBE_LOOP_PID}" 2>/dev/null || true; unset TMUXWEB_PROBE_LOOP_PID; fi';

export function buildTerminalGeometrySyncCommand(cols: number, rows: number) {
  return `stty cols ${cols} rows ${rows} 2>/dev/null; tmux resize-window -x ${cols} -y ${rows} 2>/dev/null || true`;
}
