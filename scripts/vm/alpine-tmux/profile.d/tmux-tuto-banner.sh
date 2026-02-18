#!/bin/sh

case "$-" in
  *i*) ;;
  *) return 0 ;;
esac

if [ "${TMUX_TUTO_BANNER_SHOWN:-0}" = "1" ]; then
  current_user="$(id -un 2>/dev/null || echo tuto)"
  PS1="${current_user}@tmux-tuto:\\w\\$ "
  export PS1
  return 0
fi

TMUX_TUTO_BANNER_SHOWN=1
export TMUX_TUTO_BANNER_SHOWN

current_user="$(id -un 2>/dev/null || echo tuto)"
PS1="${current_user}@tmux-tuto:\\w\\$ "
export PS1

if [ -n "${TMUX:-}" ]; then
  return 0
fi

if [ -x /usr/bin/tmux-tuto-banner ]; then
  /usr/bin/tmux-tuto-banner
fi
