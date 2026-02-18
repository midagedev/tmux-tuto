#!/bin/sh

case "$-" in
  *i*) ;;
  *) return 0 ;;
esac

if [ "${TMUX_TUTO_BANNER_SHOWN:-0}" = "1" ]; then
  return 0
fi

TMUX_TUTO_BANNER_SHOWN=1
export TMUX_TUTO_BANNER_SHOWN

if [ -n "${TMUX:-}" ]; then
  return 0
fi

RESET='\033[0m'
BOLD='\033[1m'
CYAN='\033[38;5;44m'
MINT='\033[38;5;79m'
WHITE='\033[38;5;255m'
DIM='\033[38;5;246m'
GOLD='\033[38;5;220m'

tmux_version="$(tmux -V 2>/dev/null | awk '{print $2}')"
if [ -z "$tmux_version" ]; then
  tmux_version="not-found"
fi

kernel="$(uname -r 2>/dev/null || echo unknown)"
arch="$(uname -m 2>/dev/null || echo unknown)"
host="$(hostname 2>/dev/null || echo vm)"
uptime_s="$(cut -d. -f1 /proc/uptime 2>/dev/null || echo 0)"
uptime_m=$((uptime_s / 60))
mem_mb="$(awk '/MemTotal/ {printf "%d", $2/1024}' /proc/meminfo 2>/dev/null)"
if [ -z "$mem_mb" ]; then
  mem_mb="?"
fi

printf '\n'
printf "%b  _______ __  __ _   _ __   __     _______ _   _ _______ ___ %b\n" "$CYAN" "$RESET"
printf "%b |__   __|  \\/  | | | |\\ \\ / /    |__   __| | | |__   __/ _ \\%b\n" "$CYAN" "$RESET"
printf "%b    | |  | \\  / | | | | \\ V / ______ | |  | | | |  | | | | | |%b\n" "$MINT" "$RESET"
printf "%b    | |  | |\\/| | | | |  > < |______|| |  | | | |  | | | | | |%b\n" "$MINT" "$RESET"
printf "%b    | |  | |  | | |_| | / . \\        | |  | |_| |  | | | |_| |%b\n" "$WHITE" "$RESET"
printf "%b    |_|  |_|  |_|\\___/ /_/ \\_\\       |_|   \\___/   |_|  \\___/ %b\n" "$WHITE" "$RESET"
printf '\n'
printf "%b%s%b\n" "${BOLD}${GOLD}" "Build faster in terminals. Keep every context alive." "$RESET"
printf "%bHost%b: %s   %bKernel%b: %s (%s)\n" "$DIM" "$RESET" "$host" "$DIM" "$RESET" "$kernel" "$arch"
printf "%btmux%b: %s   %bMemory%b: %s MB   %bUptime%b: %s min\n" "$DIM" "$RESET" "$tmux_version" "$DIM" "$RESET" "$mem_mb" "$DIM" "$RESET" "$uptime_m"
printf "%bQuick start%b: tmux new -As main\n" "$DIM" "$RESET"
printf "%bGoal%b: from first session to split/search/recover loop in one run.\n\n" "$DIM" "$RESET"
