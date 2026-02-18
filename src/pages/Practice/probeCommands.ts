export const BASE_PROBE_TRIGGER_COMMAND = '/usr/bin/tmux-tuto-probe >/dev/ttyS1 2>/dev/null';
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
export const PROBE_LOOP_STOP_COMMAND = 'if [ -n "${TMUXWEB_PROBE_LOOP_PID:-}" ]; then kill "${TMUXWEB_PROBE_LOOP_PID}" 2>/dev/null || true; unset TMUXWEB_PROBE_LOOP_PID; fi';
export function buildTerminalGeometrySyncCommand(cols: number, rows: number) {
    return `stty cols ${cols} rows ${rows} 2>/dev/null; tmux resize-window -x ${cols} -y ${rows} 2>/dev/null || true`;
}
