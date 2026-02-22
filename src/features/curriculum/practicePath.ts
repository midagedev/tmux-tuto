type PracticeQueryValue = string | number | boolean | null | undefined;

type PracticePathOptions = {
  lessonSlug?: string | null;
  missionSlug?: string | null;
  query?: Record<string, PracticeQueryValue>;
};

function appendQueryValue(params: URLSearchParams, key: string, value: PracticeQueryValue) {
  if (value === undefined || value === null) {
    return;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return;
  }

  params.set(key, normalized);
}

export function buildPracticePath({ lessonSlug, missionSlug, query }: PracticePathOptions = {}) {
  const normalizedLessonSlug = lessonSlug?.trim() ?? '';
  const pathname = normalizedLessonSlug
    ? `/practice/${encodeURIComponent(normalizedLessonSlug)}`
    : '/practice';

  const params = new URLSearchParams();
  appendQueryValue(params, 'mission', missionSlug);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (key === 'lesson') {
        return;
      }
      appendQueryValue(params, key, value);
    });
  }

  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function buildPracticeLessonPath(
  lessonSlug: string,
  options: Omit<PracticePathOptions, 'lessonSlug'> = {},
) {
  return buildPracticePath({
    lessonSlug,
    missionSlug: options.missionSlug,
    query: options.query,
  });
}
