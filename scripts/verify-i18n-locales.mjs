import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LOCALES_DIR = path.join(ROOT, 'src', 'i18n', 'locales');
const SRC_DIR = path.join(ROOT, 'src');
const CONTENT_FILE = path.join(SRC_DIR, 'content', 'v1', 'content.json');
const BASE = 'ko';
const TARGETS = ['en', 'ja', 'zh'];
const TARGET_EXTENSIONS = new Set(['.ts', '.tsx']);

async function readLocale(lang) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function isBlank(value) {
  return typeof value !== 'string' || value.trim().length === 0;
}

function normalizeSentence(input) {
  return input.replace(/\s+/g, ' ').trim();
}

function hasKorean(input) {
  return /[가-힣]/.test(input);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const nextPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'i18n') {
          return [];
        }
        return walk(nextPath);
      }
      return TARGET_EXTENSIONS.has(path.extname(entry.name)) ? [nextPath] : [];
    }),
  );

  return files.flat();
}

function extractTFunctionKeys(source) {
  const hits = new Set();
  const regex = /\bt\(\s*'([^']*[가-힣][^']*)'\s*(?:,|\))/g;
  for (const match of source.matchAll(regex)) {
    const key = normalizeSentence(match[1] ?? '');
    if (!key) {
      continue;
    }
    hits.add(key);
  }
  return hits;
}

function collectKoreanStrings(value, out) {
  if (typeof value === 'string') {
    const normalized = normalizeSentence(value);
    if (normalized && hasKorean(normalized)) {
      out.add(normalized);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectKoreanStrings(item, out));
    return;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectKoreanStrings(item, out));
  }
}

async function collectRequiredKoKeys() {
  const required = new Set();
  const files = await walk(SRC_DIR);
  for (const filePath of files) {
    const source = await fs.readFile(filePath, 'utf8');
    extractTFunctionKeys(source).forEach((key) => required.add(key));
  }

  try {
    const content = JSON.parse(await fs.readFile(CONTENT_FILE, 'utf8'));
    collectKoreanStrings(content, required);
  } catch {
    // Ignore content read/parse failures here; locale parity checks still run.
  }

  return required;
}

async function run() {
  const base = await readLocale(BASE);
  const baseKeys = Object.keys(base);
  const requiredKoKeys = await collectRequiredKoKeys();
  const issues = [];

  const koMissing = Array.from(requiredKoKeys).filter((key) => !(key in base));
  if (koMissing.length > 0) {
    issues.push(`[ko] missing required keys (${koMissing.length}): ${koMissing.join(', ')}`);
  }

  for (const lang of TARGETS) {
    const locale = await readLocale(lang);
    const keys = Object.keys(locale);

    const missing = baseKeys.filter((key) => !(key in locale));
    const extra = keys.filter((key) => !(key in base));
    const empty = baseKeys.filter((key) => isBlank(locale[key]));

    if (missing.length > 0) {
      issues.push(`[${lang}] missing keys (${missing.length}): ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
      issues.push(`[${lang}] extra keys (${extra.length}): ${extra.join(', ')}`);
    }
    if (empty.length > 0) {
      issues.push(`[${lang}] empty values (${empty.length}): ${empty.join(', ')}`);
    }
  }

  if (issues.length > 0) {
    console.error('i18n locale verification failed.');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(`i18n locale verification passed (${baseKeys.length} keys).`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
