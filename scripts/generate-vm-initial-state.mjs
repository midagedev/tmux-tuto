import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, rmSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const devServerUrl = 'http://127.0.0.1:4173';
const practiceUrl = `${devServerUrl}/practice?lesson=hello-tmux&mission=hello-tmux-version-check&warm=0`;
const outputPath = path.resolve(repoRoot, 'public/vm/alpine-tmux-ready.bin.zst');
const tempDir = path.resolve(repoRoot, 'tmp');
const rawStatePath = path.resolve(tempDir, 'alpine-tmux-ready.raw.bin');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        return;
      }
    } catch {
      // wait and retry
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function spawnDevServer() {
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: repoRoot,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[dev] ${chunk}`);
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[dev] ${chunk}`);
  });

  return child;
}

async function stopDevServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  if (process.platform !== 'win32' && child.pid) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // ignore and try regular kill path below
    }
  } else {
    child.kill('SIGTERM');
  }

  const exitedGracefully = await Promise.race([once(child, 'exit').then(() => true), sleep(3000).then(() => false)]);
  if (exitedGracefully) {
    return;
  }

  if (process.platform !== 'win32' && child.pid) {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      // ignore
    }
  } else {
    child.kill('SIGKILL');
  }

  await once(child, 'exit').catch(() => undefined);
}

async function compressRawState(rawPath, outPath) {
  const compress = spawn('zstd', ['-T0', '-19', '-f', rawPath, '-o', outPath], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  const [code] = await once(compress, 'exit');
  if (code !== 0) {
    throw new Error(`zstd failed with exit code ${code}`);
  }
}

async function generateInitialStateRaw(page, sink) {
  let writtenBytes = 0;
  await page.exposeFunction('__tmuxwebWriteStateChunk', async (base64Chunk) => {
    const buffer = Buffer.from(base64Chunk, 'base64');
    writtenBytes += buffer.byteLength;
    if (!sink.write(buffer)) {
      await once(sink, 'drain');
    }
  });

  page.on('pageerror', (error) => {
    process.stderr.write(`[state-gen] pageerror: ${error.message}\n`);
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    process.stderr.write(
      `[state-gen] requestfailed: ${request.url()} (${failure?.errorText ?? 'unknown error'})\n`,
    );
  });
  page.on('request', (request) => {
    if (request.url().includes('undefined')) {
      process.stderr.write(`[state-gen] suspicious request URL: ${request.url()}\n`);
    }
  });

  await page.goto(practiceUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__tmuxwebVmBridge), undefined, { timeout: 120_000 });
  const bootConfig = await page.evaluate(() => window.__tmuxwebVmBridge?.getBootConfig?.() ?? null);
  const initialOptions = await page.evaluate(() => window.__tmuxwebVmBridge?.getLastEmulatorOptions?.() ?? null);
  process.stdout.write(`[state-gen] bootConfig=${JSON.stringify(bootConfig)}\n`);
  process.stdout.write(`[state-gen] initialOptions=${JSON.stringify(initialOptions)}\n`);
  const readyDeadline = Date.now() + 15 * 60 * 1000;
  let pollCount = 0;
  let loggedRuntimeOptions = false;
  while (Date.now() < readyDeadline) {
    const status = await page.evaluate(() => {
      const bridge = window.__tmuxwebVmBridge;
      if (!bridge) {
        return { status: 'idle', text: 'bridge-missing', metrics: null };
      }
      bridge.sendProbe();
      return bridge.getStatus();
    });

    const hasProbeMetrics = Boolean(status.metrics && status.metrics.sessionCount !== null);
    if (status.status === 'running' || hasProbeMetrics) {
      break;
    }

    pollCount += 1;
    if (pollCount % 8 === 0) {
      if (!loggedRuntimeOptions) {
        const runtimeOptions = await page.evaluate(() => window.__tmuxwebVmBridge?.getLastEmulatorOptions?.() ?? null);
        if (runtimeOptions) {
          loggedRuntimeOptions = true;
          process.stdout.write(`[state-gen] runtimeOptions=${JSON.stringify(runtimeOptions)}\n`);
        }
      }
      process.stdout.write(
        `[state-gen] waiting VM ready... status=${status.status} text=${status.text} debugLines=${status.debugLineCount ?? 0}\n`,
      );
    }

    await page.waitForTimeout(2500);
  }

  const finalStatus = await page.evaluate(() => window.__tmuxwebVmBridge?.getStatus?.() ?? null);
  const finalHasMetrics = Boolean(finalStatus?.metrics && finalStatus.metrics.sessionCount !== null);
  if (!finalStatus || (finalStatus.status !== 'running' && !finalHasMetrics)) {
    throw new Error(`VM did not become ready in time (status=${finalStatus?.status ?? 'unknown'})`);
  }
  await page.waitForTimeout(1200);

  const stateSize = await page.evaluate(async () => {
    const bridge = window.__tmuxwebVmBridge;
    if (!bridge) {
      throw new Error('VM bridge is not available');
    }

    // Run a no-op command so snapshot is captured with an interactive shell prompt.
    bridge.sendCommand(':');
    await new Promise((resolve) => setTimeout(resolve, 250));

    const state = await bridge.saveState();
    if (!state) {
      throw new Error('save_state returned null');
    }

    const bytes = new Uint8Array(state);
    const chunkSize = 256 * 1024;
    const base64FromBytes = (slice) => {
      let binary = '';
      const step = 0x8000;
      for (let index = 0; index < slice.length; index += step) {
        binary += String.fromCharCode(...slice.subarray(index, index + step));
      }
      return btoa(binary);
    };

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
      await window.__tmuxwebWriteStateChunk(base64FromBytes(chunk));
    }

    return bytes.length;
  });

  return {
    writtenBytes,
    stateSize,
  };
}

async function main() {
  mkdirSync(tempDir, { recursive: true });
  rmSync(rawStatePath, { force: true });

  const server = spawnDevServer();
  let browser = null;
  let serverExitCode = null;

  server.on('exit', (code) => {
    serverExitCode = code;
  });

  try {
    await waitForHttp(devServerUrl, 120_000);

    const sink = createWriteStream(rawStatePath, { flags: 'w' });
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    const { writtenBytes, stateSize } = await generateInitialStateRaw(page, sink);
    sink.end();
    await once(sink, 'finish');

    if (writtenBytes <= 0 || stateSize <= 0) {
      throw new Error('Generated state is empty');
    }
    if (writtenBytes !== stateSize) {
      throw new Error(`Written state mismatch: expected ${stateSize}, got ${writtenBytes}`);
    }

    await compressRawState(rawStatePath, outputPath);
    const compressed = await stat(outputPath);
    const raw = await stat(rawStatePath);

    // Keep raw file for debugging only when needed by developer
    rmSync(rawStatePath, { force: true });

    process.stdout.write(
      `Generated VM initial state: raw=${raw.size} bytes, compressed=${compressed.size} bytes, output=${outputPath}\n`,
    );
  } finally {
    if (browser) {
      await browser.close();
    }
    if (serverExitCode === null) {
      await stopDevServer(server);
    }
  }
}

main().catch((error) => {
  process.stderr.write(`Failed to generate VM initial state: ${String(error)}\n`);
  process.exitCode = 1;
});
