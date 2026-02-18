declare module 'v86' {
  export type V86FileSource = {
    url: string;
    size?: number;
    async?: boolean;
    fixed_chunk_size?: number;
    use_parts?: boolean;
  };

  export type V86MemorySource = {
    buffer: ArrayBuffer;
    async?: boolean;
  };

  export type V86Filesystem = {
    baseurl?: string;
    basefs?: V86FileSource;
  };

  export type V86Options = {
    wasm_path?: string;
    wasm_fallback_path?: string;
    memory_size?: number;
    vga_memory_size?: number;
    bios?: V86FileSource;
    vga_bios?: V86FileSource;
    state?: V86FileSource;
    initial_state?: V86FileSource | V86MemorySource;
    bzimage?: V86FileSource;
    initrd?: V86FileSource;
    hda?: V86FileSource;
    cdrom?: V86FileSource;
    filesystem?: V86Filesystem | Record<string, never>;
    cmdline?: string;
    bzimage_initrd_from_filesystem?: boolean;
    net_device_type?: string;
    network_relay_url?: string;
    autostart?: boolean;
    disable_keyboard?: boolean;
    disable_mouse?: boolean;
  };

  export default class V86 {
    constructor(options: V86Options);
    add_listener(event: string, listener: (value?: unknown) => void): void;
    remove_listener(event: string, listener: (value?: unknown) => void): void;
    serial0_send(data: string): void;
    run(): Promise<void> | void;
    stop(): Promise<void> | void;
    destroy(): Promise<void> | void;
    is_running(): boolean;
    save_state(): Promise<ArrayBuffer> | ArrayBuffer;
  }
}
