import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dist404Path = path.join(rootDir, 'dist', '404.html');
const distSwPath = path.join(rootDir, 'dist', 'sw.js');

function normalizeBasePath(rawPath) {
  const value = (rawPath || '/').trim();
  if (value === '') {
    return '/';
  }

  let normalized = value.startsWith('/') ? value : `/${value}`;
  if (!normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }
  return normalized.replace(/\/{2,}/g, '/');
}

async function patch404Base() {
  const basePath = normalizeBasePath(process.env.VITE_BASE_PATH ?? '/');
  const cacheVersion =
    (process.env.TMUX_TUTO_BUILD_ID || process.env.GITHUB_SHA || Date.now().toString(36)).slice(0, 12);

  const html = await fs.readFile(dist404Path, 'utf-8');
  const patched = html.replaceAll('__TMUX_TUTO_BASE_PATH__', basePath);
  await fs.writeFile(dist404Path, patched, 'utf-8');
  console.log(`[patch-404-base] patched dist/404.html with base=${basePath}`);

  const sw = await fs.readFile(distSwPath, 'utf-8');
  const patchedSw = sw.replaceAll('__TMUX_TUTO_SW_CACHE_VERSION__', cacheVersion);
  await fs.writeFile(distSwPath, patchedSw, 'utf-8');
  console.log(`[patch-404-base] patched dist/sw.js with cacheVersion=${cacheVersion}`);
}

patch404Base().catch((error) => {
  console.error('[patch-404-base] failed:', error);
  process.exitCode = 1;
});
