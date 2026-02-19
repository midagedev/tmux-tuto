import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LOCALES_DIR = path.join(ROOT, 'src', 'i18n', 'locales');
const BASE = 'ko';
const TARGETS = ['en', 'ja', 'zh'];

async function readLocale(lang) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function isBlank(value) {
  return typeof value !== 'string' || value.trim().length === 0;
}

async function run() {
  const base = await readLocale(BASE);
  const baseKeys = Object.keys(base);
  const issues = [];

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
