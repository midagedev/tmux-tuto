# VM Warm Start Notes

## What is implemented

- Practice VM now tries to load an `initial_state` snapshot before normal boot.
- If the snapshot is missing or cannot be fetched, it falls back to the existing cold boot flow automatically.
- Default snapshot path:
  - `public/vm/alpine-tmux-ready.bin.zst`
- Optional override:
  - `VITE_VM_INITIAL_STATE_PATH=/custom/path/to/state.bin.zst`

## Current behavior

- Snapshot exists: warm restore path is used.
- Snapshot missing: no error surfaced to learners, normal boot continues.
- Probe bootstrap delay is shorter on warm restore.
- Snapshot generation command:
  - `npm run vm:state:generate`

## Regeneration checklist

- Rebuild VM rootfs first when login/banner behavior changes: `npm run vm:build`
- Regenerate warm snapshot: `npm run vm:state:generate`
- Validate `/practice` warm restore and probe-driven mission completion.
