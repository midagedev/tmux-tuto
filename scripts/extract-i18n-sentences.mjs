import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const OUT_DIR = path.join(SRC_DIR, 'i18n', 'locales');
const OUT_FILES = {
  ko: path.join(OUT_DIR, 'ko.json'),
  en: path.join(OUT_DIR, 'en.json'),
  ja: path.join(OUT_DIR, 'ja.json'),
  zh: path.join(OUT_DIR, 'zh.json'),
};

const TARGET_EXTENSIONS = new Set(['.ts', '.tsx']);

function hasKorean(input) {
  return /[가-힣]/.test(input);
}

function normalizeSentence(input) {
  return input.replace(/\s+/g, ' ').trim();
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

function extractQuotedLiterals(source) {
  const hits = new Set();
  const regex = /(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g;

  for (const match of source.matchAll(regex)) {
    const value = normalizeSentence(match[2] ?? '');
    if (!value || value.length < 2 || value.length > 180) {
      continue;
    }
    if (!hasKorean(value)) {
      continue;
    }
    if (value.includes('\n') || value.includes('\r')) {
      continue;
    }
    if (
      value.includes('{') ||
      value.includes('}') ||
      value.includes('<') ||
      value.includes('>') ||
      value.includes('=>') ||
      value.includes('function ') ||
      value.includes('return ')
    ) {
      continue;
    }
    if (/^\W+$/.test(value)) {
      continue;
    }
    if (value.startsWith('http://') || value.startsWith('https://')) {
      continue;
    }
    hits.add(value);
  }

  return hits;
}

async function run() {
  const files = await walk(SRC_DIR);
  const sentences = new Set();

  await Promise.all(
    files.map(async (filePath) => {
      const source = await fs.readFile(filePath, 'utf8');
      const found = extractQuotedLiterals(source);
      found.forEach((sentence) => sentences.add(sentence));
    }),
  );

  const sorted = Array.from(sentences).sort((a, b) => a.localeCompare(b, 'ko'));
  const ko = Object.fromEntries(sorted.map((sentence) => [sentence, sentence]));
  const existingLocales = await Promise.all(
    ['en', 'ja', 'zh'].map(async (lang) => {
      try {
        const parsed = JSON.parse(await fs.readFile(OUT_FILES[lang], 'utf8'));
        return [lang, parsed];
      } catch {
        return [lang, {}];
      }
    }),
  );

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILES.ko, `${JSON.stringify(ko, null, 2)}\n`, 'utf8');
  for (const [lang, source] of existingLocales) {
    const merged = Object.fromEntries(sorted.map((sentence) => [sentence, source[sentence] ?? '']));
    await fs.writeFile(OUT_FILES[lang], `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  }

  console.log(`Extracted ${sorted.length} Korean sentence keys.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
