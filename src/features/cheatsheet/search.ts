import type { CheatsheetItem } from './items';

export type IndexedCheatsheetItem = CheatsheetItem & {
  normalizedText: string;
};

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function scoreItem(item: IndexedCheatsheetItem, query: string) {
  let score = 0;

  if (!query) {
    return score;
  }

  if (item.shortcut && normalize(item.shortcut) === query) {
    score += 120;
  }

  if (normalize(item.title).includes(query)) {
    score += 80;
  }

  if (item.intentTags.some((tag) => normalize(tag).includes(query))) {
    score += 70;
  }

  if (item.normalizedText.includes(query)) {
    score += 40;
  }

  if (item.contentType === 'playbook') {
    score += 5;
  }

  return score;
}

export function buildCheatsheetIndex(items: CheatsheetItem[]): IndexedCheatsheetItem[] {
  return items.map((item) => {
    const normalizedText = normalize(
      [item.title, item.description, item.shortcut ?? '', item.command ?? '', ...item.intentTags, ...item.examples]
        .join(' ')
        .replace(/\s+/g, ' '),
    );

    return {
      ...item,
      normalizedText,
    };
  });
}

export function searchCheatsheet(index: IndexedCheatsheetItem[], queryText: string, limit = 20) {
  const query = normalize(queryText);
  if (!query) {
    return index.slice(0, limit);
  }

  return index
    .map((item) => ({ item, score: scoreItem(item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
