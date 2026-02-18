import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const outDir = path.join(srcDir, 'i18n', 'locales');
const fileAllow = /\.(ts|tsx)$/;
const skip = /(\.test\.|\.spec\.|\.d\.ts$)/;

async function walk(dir, acc = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, acc);
    else if (fileAllow.test(e.name) && !skip.test(e.name)) acc.push(full);
  }
  return acc;
}

function extract(str) {
  const out = new Set();
  const regex = /(['"`])((?:(?!\1)[\s\S])*?[가-힣][\s\S]*?)\1/g;
  let m;
  while ((m = regex.exec(str))) {
    const v = m[2].trim();
    if (!v) continue;
    if (v.length < 2) continue;
    out.add(v);
  }
  return [...out];
}

const files = await walk(srcDir);
const all = new Set();
for (const f of files) {
  const s = await fs.readFile(f, 'utf8');
  extract(s).forEach((v) => all.add(v));
}

const sorted = [...all].sort((a, b) => a.localeCompare(b, 'ko'));
const ko = Object.fromEntries(sorted.map((t) => [t, t]));
const en = Object.fromEntries(sorted.map((t) => [t, t]));
const ja = Object.fromEntries(sorted.map((t) => [t, t]));
const zh = Object.fromEntries(sorted.map((t) => [t, t]));

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, 'ko.json'), JSON.stringify(ko, null, 2));
await fs.writeFile(path.join(outDir, 'en.json'), JSON.stringify(en, null, 2));
await fs.writeFile(path.join(outDir, 'ja.json'), JSON.stringify(ja, null, 2));
await fs.writeFile(path.join(outDir, 'zh.json'), JSON.stringify(zh, null, 2));

console.log(`[extract-ui-locale-dicts] extracted ${sorted.length} strings`);
