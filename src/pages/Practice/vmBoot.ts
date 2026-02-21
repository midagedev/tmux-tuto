import type { V86Options } from 'v86';
import { buildTerminalGeometrySyncCommand } from './probeCommands';

const V86_STATE_MAGIC_LE = 0x86768676;
const ZSTD_MAGIC_LE = 0xfd2fb528;

export const DEFAULT_TERMINAL_COLS = 80;
export const DEFAULT_TERMINAL_ROWS = 24;
export const BANNER_TRIGGER_COMMAND = '/usr/bin/tmux-tuto-banner';
export const TERMINAL_GEOMETRY_SYNC_COMMAND = buildTerminalGeometrySyncCommand(
  DEFAULT_TERMINAL_COLS,
  DEFAULT_TERMINAL_ROWS,
);

export type VmBootConfig = {
  wasmPath: string;
  wasmFallbackPath: string;
  biosPath: string;
  vgaBiosPath: string;
  fsBasePath: string;
  fsJsonPath: string;
  initialStatePath: string;
};

export type VmInitialState = {
  buffer: ArrayBuffer;
};

function resolveAssetPath(relativePath: string) {
  const base = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedRelative = relativePath.replace(/^\/+/, '');
  return `${normalizedBase}${normalizedRelative}`;
}

export const VM_BOOT_CONFIG: VmBootConfig = {
  wasmPath: resolveAssetPath('vm/v86.wasm'),
  wasmFallbackPath: resolveAssetPath('vm/v86-fallback.wasm'),
  biosPath: resolveAssetPath('vm/seabios.bin'),
  vgaBiosPath: resolveAssetPath('vm/vgabios.bin'),
  fsBasePath: resolveAssetPath('vm/alpine-tmux-flat/'),
  fsJsonPath: resolveAssetPath('vm/alpine-tmux-fs.json'),
  initialStatePath:
    (import.meta.env.VITE_VM_INITIAL_STATE_PATH as string | undefined)?.trim() ||
    resolveAssetPath('vm/alpine-tmux-ready.bin.zst'),
};

function hasValidVmStateMagic(buffer: ArrayBuffer) {
  if (buffer.byteLength < 4) {
    return false;
  }

  const magic = new DataView(buffer).getUint32(0, true);
  return magic === V86_STATE_MAGIC_LE || magic === ZSTD_MAGIC_LE;
}

export async function loadVmInitialState(initialStatePath: string): Promise<VmInitialState | null> {
  if (!initialStatePath) {
    return null;
  }

  try {
    const response = await fetch(initialStatePath, { cache: 'no-cache' });
    if (!response.ok) {
      return null;
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (contentType.includes('text/html')) {
      return null;
    }

    const stateBuffer = await response.arrayBuffer();
    if (stateBuffer.byteLength < 1024 || !hasValidVmStateMagic(stateBuffer)) {
      return null;
    }

    return { buffer: stateBuffer };
  } catch {
    return null;
  }
}

export function createVmBaseOptions(bootConfig: VmBootConfig): V86Options {
  return {
    wasm_path: bootConfig.wasmPath,
    wasm_fallback_path: bootConfig.wasmFallbackPath,
    memory_size: 256 * 1024 * 1024,
    vga_memory_size: 8 * 1024 * 1024,
    bios: { url: bootConfig.biosPath },
    vga_bios: { url: bootConfig.vgaBiosPath },
    filesystem: {
      basefs: {
        url: bootConfig.fsJsonPath,
      },
      baseurl: bootConfig.fsBasePath,
    },
    bzimage_initrd_from_filesystem: true,
    cmdline:
      'rw root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose console=ttyS0 init=/sbin/init quiet loglevel=3',
    uart1: true,
    uart2: true,
    disable_keyboard: true,
    disable_mouse: true,
    autostart: true,
  };
}
