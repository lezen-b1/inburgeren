import type { Example } from './schema';

export type SearchScope = 'all' | 'question' | 'evidence' | 'meaning';
export type SortMode = 'year-asc' | 'year-desc' | 'question' | 'title';

export interface ExampleFilters {
  query: string;
  scope: SearchScope;
  year: string;
  level: string;
  skill: string;
  type: string;
  mode: string;
  status: 'all' | 'favorite' | 'review' | 'mastered';
  sort: SortMode;
}

export interface ProgressLike {
  favorite?: boolean;
  review?: boolean;
  mastered?: boolean;
}

export function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('nl-NL')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/ـ/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchableText(example: Example, scope: SearchScope): string {
  if (scope === 'question') return normalizeText(`${example.title} ${example.question}`);
  if (scope === 'evidence') return normalizeText(`${example.evidence} ${example.pair}`);
  if (scope === 'meaning') return normalizeText(`${example.meaning} ${example.explanation}`);
  return normalizeText(
    [
      example.year,
      example.questionNo,
      example.title,
      example.question,
      example.answer,
      example.evidence,
      example.pair,
      example.meaning,
      example.explanation,
      example.transformationType,
    ].join(' '),
  );
}

export function filterExamples(
  source: Example[],
  filters: ExampleFilters,
  progress: Record<string, ProgressLike>,
): Example[] {
  const tokens = normalizeText(filters.query).split(' ').filter(Boolean);
  const filtered = source.filter((example) => {
    const itemProgress = progress[example.id] ?? {};
    if (filters.year && String(example.year) !== filters.year) return false;
    if (filters.level && example.level !== filters.level) return false;
    if (filters.skill && example.skill !== filters.skill) return false;
    if (filters.type && example.transformationType !== filters.type) return false;
    if (filters.mode && example.mode !== filters.mode) return false;
    if (filters.status !== 'all' && !itemProgress[filters.status]) return false;
    if (tokens.length) {
      const haystack = searchableText(example, filters.scope);
      if (!tokens.every((token) => haystack.includes(token))) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === 'year-desc') return b.year - a.year || a.questionNo - b.questionNo;
    if (filters.sort === 'question') return a.questionNo - b.questionNo || a.year - b.year;
    if (filters.sort === 'title') return a.title.localeCompare(b.title, 'nl') || a.questionNo - b.questionNo;
    return a.year - b.year || a.questionNo - b.questionNo;
  });
}

export function createSessionQueue(
  source: Example[],
  count: number,
  seed = Date.now(),
): Example[] {
  const items = [...source];
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, Math.min(count, items.length));
}
