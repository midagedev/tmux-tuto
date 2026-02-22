import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export type VmProbeMetricInput =
  | {
      key: 'session' | 'window' | 'pane' | 'tmux' | 'mode' | 'search' | 'searchMatched' | 'activeWindow' | 'zoomed' | 'sync';
      value: number;
    }
  | {
      key: 'sessionName' | 'windowName' | 'layout';
      value: string;
    };

export async function dismissAnalyticsBanner(page: Page) {
  const decline = page.getByRole('button', { name: '동의하지 않음' });
  if (await decline.isVisible().catch(() => false)) {
    await decline.click();
  }
}

export type VmBridgeStatus = {
  status: 'idle' | 'booting' | 'running' | 'stopped' | 'error';
  text: string;
  metrics: {
    sessionCount: number | null;
    windowCount: number | null;
    paneCount: number | null;
    modeIs: string | null;
    sessionName: string | null;
    windowName: string | null;
    activeWindowIndex: number | null;
    windowLayout: string | null;
    windowZoomed: boolean | null;
    paneSynchronized: boolean | null;
    searchExecuted: boolean | null;
    searchMatchFound: boolean | null;
  };
  actionHistory: string[];
  commandHistory: string[];
  debugLineCount: number;
  lastDebugLine: string | null;
};

export async function getVmBridgeStatus(page: Page): Promise<VmBridgeStatus> {
  return page.evaluate(() => {
    const bridge = (window as Window & { __tmuxwebVmBridge?: { getStatus: () => VmBridgeStatus } }).__tmuxwebVmBridge;
    if (!bridge) {
      throw new Error('VM bridge is not installed');
    }

    return bridge.getStatus();
  });
}

export async function waitForVmReady(page: Page, options?: { timeout?: number }) {
  const timeout = options?.timeout ?? 90_000;
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const bridge = (window as Window & {
            __tmuxwebVmBridge?: {
              isReady: () => boolean;
              getStatus: () => VmBridgeStatus;
            };
          }).__tmuxwebVmBridge;
          if (!bridge) {
            return false;
          }

          const status = bridge.getStatus();
          return bridge.isReady() && status.status === 'running';
        }),
      { timeout },
    )
    .toBe(true);
}

export async function sendVmCommand(page: Page, command: string) {
  await page.evaluate((payload) => {
    const bridge = (window as Window & {
      __tmuxwebVmBridge?: {
        sendCommand: (command: string) => void;
      };
    }).__tmuxwebVmBridge;
    if (!bridge) {
      throw new Error('VM bridge is not installed');
    }
    bridge.sendCommand(payload);
  }, command);
}

export async function injectVmProbeMetric(page: Page, metric: VmProbeMetricInput) {
  await page.evaluate((payload) => {
    const bridge = (window as Window & {
      __tmuxwebVmBridge?: {
        injectProbeMetric: (metric: VmProbeMetricInput) => void;
      };
    }).__tmuxwebVmBridge;
    if (!bridge) {
      throw new Error('VM bridge is not installed');
    }
    bridge.injectProbeMetric(payload);
  }, metric);
}

export async function injectVmCommandHistory(page: Page, command: string) {
  await page.evaluate((payload) => {
    const bridge = (window as Window & {
      __tmuxwebVmBridge?: {
        injectCommandHistory: (command: string) => void;
      };
    }).__tmuxwebVmBridge;
    if (!bridge) {
      throw new Error('VM bridge is not installed');
    }
    bridge.injectCommandHistory(payload);
  }, command);
}

export async function injectVmActionHistory(page: Page, action: string) {
  await page.evaluate((payload) => {
    const bridge = (window as Window & {
      __tmuxwebVmBridge?: {
        injectActionHistory: (action: string) => void;
      };
    }).__tmuxwebVmBridge;
    if (!bridge) {
      throw new Error('VM bridge is not installed');
    }
    bridge.injectActionHistory(payload);
  }, action);
}

export async function sendVmProbe(page: Page) {
  await page.evaluate(() => {
    const bridge = (window as Window & {
      __tmuxwebVmBridge?: {
        sendProbe: () => void;
      };
    }).__tmuxwebVmBridge;
    if (!bridge) {
      throw new Error('VM bridge is not installed');
    }
    bridge.sendProbe();
  });
}
