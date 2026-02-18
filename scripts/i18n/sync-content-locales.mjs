import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const sourceDir = path.join(rootDir, 'src', 'content', 'v1', 'i18n', 'ko');
const targetLangs = ['en', 'ja', 'zh'];
const files = ['content.json', 'share-meta.json', 'share-achievement-meta.json'];

for (const lang of targetLangs) {
  const targetDir = path.join(rootDir, 'src', 'content', 'v1', 'i18n', lang);
  await fs.mkdir(targetDir, { recursive: true });
  for (const file of files) {
    const source = path.join(sourceDir, file);
    const target = path.join(targetDir, file);
    try {
      await fs.access(target);
    } catch {
      await fs.copyFile(source, target);
      // eslint-disable-next-line no-console
      console.log(`[sync-content-locales] created ${lang}/${file}`);
    }
  }
}
