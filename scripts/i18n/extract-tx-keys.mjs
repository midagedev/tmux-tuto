import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const srcRoot = path.join(root, 'src');

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full.includes('/src/i18n/locales')) continue;
      await walk(full, out);
      continue;
    }
    if (!full.endsWith('.ts') && !full.endsWith('.tsx')) continue;
    out.push(full);
  }
  return out;
}

function extractKeys(sourceFile, keys) {
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === '__tx' &&
      node.arguments.length === 1
    ) {
      const arg = node.arguments[0];
      if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
        keys.add(arg.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const files = await walk(srcRoot);
const keys = new Set();

for (const file of files) {
  const source = await fs.readFile(file, 'utf8');
  const scriptKind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
  extractKeys(sf, keys);
}

const sorted = [...keys].sort((a, b) => a.localeCompare(b, 'ko'));
const ko = Object.fromEntries(sorted.map((k) => [k, k]));

const localeDir = path.join(srcRoot, 'i18n', 'locales');
await fs.mkdir(localeDir, { recursive: true });
await fs.writeFile(path.join(localeDir, 'ko.json'), JSON.stringify(ko, null, 2) + '\n', 'utf8');

for (const lang of ['en', 'ja', 'zh']) {
  const targetPath = path.join(localeDir, `${lang}.json`);
  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(targetPath, 'utf8'));
  } catch {
    existing = {};
  }
  const next = {};
  for (const key of sorted) {
    next[key] = existing[key] ?? key;
  }
  await fs.writeFile(targetPath, JSON.stringify(next, null, 2) + '\n', 'utf8');
}

console.log(`[extract-tx-keys] keys: ${sorted.length}`);
